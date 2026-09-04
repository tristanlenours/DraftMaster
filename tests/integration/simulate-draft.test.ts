import { describe, expect, it } from "vitest";

import { createScriptedPolicy } from "../../src/bots/scripted-policy.ts";
import { createSeededRandomPolicy } from "../../src/bots/seeded-random-policy.ts";
import type { PickPolicy } from "../../src/bots/pick-policy.ts";
import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import {
  buildDraftReport,
  getDraftView,
  type CardPickedEvent,
  type SeatId,
} from "../../src/draft/index.ts";
import { simulateDraft, type SimulateDraftInput } from "../../src/simulation/simulate-draft.ts";
import { buildSyntheticSnapshot, loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

function createValidInput(overrides: Partial<SimulateDraftInput> = {}): SimulateDraftInput {
  const validated = validateSnapshot(loadInitialSnapshotFixture());
  if (!validated.ok) {
    throw new Error(validated.error.message);
  }
  return {
    snapshot: validated.value,
    sessionId: "0c0e1a78c4cf",
    seed: 42,
    startedAt: "2026-09-04T12:00:00.000Z",
    ...overrides,
  };
}

describe("simulateDraft integration", () => {
  it("runs a full automated 45-round simulation with default seeded-random policies", () => {
    const input = createValidInput();
    const result = simulateDraft(input);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const view = getDraftView(result.value.draft);
    expect(view.status).toBe("completed");
    expect(view.revision).toBe(45);
    expect(view.seats).toHaveLength(8);
    for (const seat of view.seats) {
      expect(seat.priorPool).toHaveLength(45);
    }

    // 2 initial events + 45 * 8 CardPicked + 14 * 2 BoostersPassed + 3 PackCompleted + 1 DraftCompleted = 394
    expect(result.value.events.length).toBeGreaterThanOrEqual(394);
    const completedEvent = result.value.events.find((e) => e.type === "DraftCompleted");
    expect(completedEvent).toBeDefined();
  });

  it("runs a simulation with explicit caller choices for seat 0 and verifies policy registration is untouched", () => {
    // Generate valid explicit choices for seat 0 using a dry run
    const input = createValidInput({ sessionId: "0c0e1a78c4d0" });
    const dryRun = simulateDraft(input);
    if (!dryRun.ok) {
      throw new Error("Dry run failed");
    }
    const dryRunEvents = dryRun.value.events.filter(
      (e): e is CardPickedEvent => e.type === "CardPicked" && e.seatId === 0,
    );
    const explicitChoices = dryRunEvents.map((e) => e.cardInstanceId);

    const result = simulateDraft({
      ...input,
      sessionId: "0c0e1a78c4d1",
      explicitChoicesSeat0: explicitChoices,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const view = getDraftView(result.value.draft);
    expect(view.status).toBe("completed");
    expect(view.seats[0]?.priorPool).toEqual(explicitChoices);

    const initialStarted = result.value.events[0];
    if (initialStarted?.type === "DraftStarted") {
      expect(initialStarted.seatPolicies[0]).toEqual({
        seatId: 0,
        policyId: "seeded-random",
        policyVersion: "1",
      });
    }

    const seat0Picks = result.value.events.filter(
      (e): e is CardPickedEvent => e.type === "CardPicked" && e.seatId === 0,
    );
    expect(seat0Picks.every((p) => p.source.kind === "caller")).toBe(true);
  });

  it("fails cleanly on policy failure without returning partial success", () => {
    // Scripted policy with 0 choices, fails immediately
    const brokenPolicy = createScriptedPolicy([]);
    const policies: PickPolicy[] = [
      brokenPolicy,
      ...Array.from({ length: 7 }, (_, i) => createSeededRandomPolicy(42, (i + 1) as SeatId)),
    ];

    const input = createValidInput({
      sessionId: "0c0e1a78c4d2",
      policies,
    });

    const result = simulateDraft(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("POLICY_FAILED");
    }
  });

  it("rejects when policy adapter is replaced or announces changed version mid-session", () => {
    // A mutable adapter wrapper that changes its reported version on pick 5
    let currentVersion = "1";
    const baseRandom = createSeededRandomPolicy(42, 2);
    const mutatingPolicy: PickPolicy = {
      get id() {
        return "seeded-random";
      },
      get version() {
        return currentVersion;
      },
      choose(ctx) {
        if (ctx.pickNumber >= 5) {
          currentVersion = "2"; // version mismatch with initial registration!
        }
        return baseRandom.choose(ctx);
      },
    };

    const policies: PickPolicy[] = [
      createSeededRandomPolicy(42, 0),
      createSeededRandomPolicy(42, 1),
      mutatingPolicy,
      createSeededRandomPolicy(42, 3),
      createSeededRandomPolicy(42, 4),
      createSeededRandomPolicy(42, 5),
      createSeededRandomPolicy(42, 6),
      createSeededRandomPolicy(42, 7),
    ];

    const input = createValidInput({
      sessionId: "0c0e1a78c4d3",
      policies,
    });

    const result = simulateDraft(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("POLICY_MISMATCH");
    }
  });

  it("maintains state isolation across multiple sequential sessions", () => {
    const inputA = createValidInput({ sessionId: "0c0e1a78c4d4", seed: 100 });
    const resultA = simulateDraft(inputA);
    expect(resultA.ok).toBe(true);
    if (!resultA.ok) return;

    const viewA = getDraftView(resultA.value.draft);
    const poolA0 = [...(viewA.seats[0]?.priorPool ?? [])];

    const inputB = createValidInput({ sessionId: "0c0e1a78c4d5", seed: 200 });
    const resultB = simulateDraft(inputB);
    expect(resultB.ok).toBe(true);

    const viewAAfter = getDraftView(resultA.value.draft);
    expect(viewAAfter.seats[0]?.priorPool).toEqual(poolA0);
  });

  it.each([545, 540, 360])(
    "verifies distribution, directions, 360 picks, and final partition for N = %i",
    (cardCount) => {
      const validated =
        cardCount === 545
          ? validateSnapshot(loadInitialSnapshotFixture())
          : validateSnapshot(buildSyntheticSnapshot(cardCount, `2026-02-24.${String(cardCount)}`));
      if (!validated.ok) {
        throw new Error(validated.error.message);
      }
      const snapshot = validated.value;

      const input = createValidInput({
        snapshot,
        sessionId: "0c0e1a78c4d6",
        seed: 42,
      });

      const result = simulateDraft(input);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const reportResult = buildDraftReport(result.value.draft);
      expect(reportResult.ok).toBe(true);
      if (!reportResult.ok) return;

      const report = reportResult.value;

      // 360 picks
      expect(report.finalPools).toHaveLength(8);
      let totalAssigned = 0;
      for (const pool of report.finalPools) {
        expect(pool.cardInstanceIds).toHaveLength(45);
        totalAssigned += pool.cardInstanceIds.length;
      }
      expect(totalAssigned).toBe(360);

      // Unused instances: N - 360
      expect(report.unusedCardInstanceIds).toHaveLength(cardCount - 360);
      if (cardCount === 360) {
        expect(report.unusedCardInstanceIds).toEqual([]);
      }

      // Exact partition of all N cards: no extra instances, no lost instances
      const allReportCards = [
        ...report.finalPools.flatMap((p) => p.cardInstanceIds),
        ...report.unusedCardInstanceIds,
      ];
      expect(allReportCards).toHaveLength(cardCount);
      expect(new Set(allReportCards).size).toBe(cardCount);

      const snapshotCardIds = new Set(snapshot.cards.map((c) => c.instanceId));
      for (const id of allReportCards) {
        expect(snapshotCardIds.has(id)).toBe(true);
      }

      // Verify booster passing directions in events
      const passedEvents = report.events.filter((e) => e.type === "BoostersPassed");
      expect(passedEvents).toHaveLength(42); // 14 passes per pack * 3 packs
      for (const passEvent of passedEvents) {
        const expectedDelta = passEvent.packNumber === 2 ? 7 : 1; // +7 mod 8 is -1 (right), +1 is left
        for (const mov of passEvent.movements) {
          expect((mov.fromSeatId + expectedDelta) % 8).toBe(mov.toSeatId);
        }
      }
    },
  );
});
