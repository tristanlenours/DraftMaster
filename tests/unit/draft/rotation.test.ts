import { describe, expect, it } from "vitest";

import {
  getDraftView,
  startDraft,
  submitPickRound,
  type Draft,
  type SeatDecision,
  type SeatPolicyDescriptor,
  type StartDraftInput,
  type SubmitPickRound,
} from "../../../src/draft/index.ts";
import { RANDOM_SYSTEM_METADATA } from "../../../src/random/seeded-random.ts";
import { validateSnapshot } from "../../../src/cubes/validate-snapshot.ts";
import { loadInitialSnapshotFixture } from "../../fixtures/cube-fixtures.ts";

const seatPolicies: readonly SeatPolicyDescriptor[] = [
  { seatId: 0, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 1, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 2, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 3, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 4, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 5, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 6, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 7, policyId: "seeded-random", policyVersion: "1" },
];

function createTestDraft(): Draft {
  const validated = validateSnapshot(loadInitialSnapshotFixture());
  if (!validated.ok) {
    throw new Error(validated.error.message);
  }
  const input: StartDraftInput = {
    snapshot: validated.value,
    sessionId: "0c0e1a78c4cf",
    seed: 42,
    startedAt: "2026-09-04T12:00:00.000Z",
    engineVersion: "draft-engine@1.0.0",
    randomSystem: RANDOM_SYSTEM_METADATA,
    seatPolicies,
    configuration: {
      seatCount: 8,
      packCount: 3,
      cardsPerBooster: 15,
      directions: ["left", "right", "left"],
      controlledSeatId: 0,
    },
  };
  const result = startDraft(input);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value.draft;
}

function buildLegalRound(draft: Draft, roundIndex: number): SubmitPickRound {
  const view = getDraftView(draft);
  const decisions: SeatDecision[] = view.seats.map((seat) => {
    const cardInstanceId = seat.currentBooster?.remainingCardInstanceIds[0];
    if (!cardInstanceId) {
      throw new Error(`Seat ${String(seat.seatId)} has no card in booster`);
    }
    return {
      seatId: seat.seatId,
      cardInstanceId,
      source: {
        kind: "policy",
        policyId: "seeded-random",
        policyVersion: "1",
      },
    };
  });
  return {
    sessionId: view.sessionId,
    expectedRevision: view.revision,
    packNumber: view.packNumber,
    pickNumber: view.pickNumber,
    occurredAt: new Date(
      Date.parse("2026-09-04T12:00:00.000Z") + (roundIndex + 1) * 1000,
    ).toISOString(),
    decisions,
  };
}

describe("draft rotation and lifecycle", () => {
  it("rotates boosters left in pack 1 and preserves booster identities", () => {
    let draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const booster0 = viewBefore.seats[0]?.currentBooster;
    expect(booster0?.boosterId).toBe("pack:1:seat:0");

    const command = buildLegalRound(draft, 0);
    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    draft = result.value.draft;
    const passedEvent = result.value.appendedEvents.find((e) => e.type === "BoostersPassed");
    expect(passedEvent).toBeDefined();
    if (passedEvent?.type === "BoostersPassed") {
      expect(passedEvent.movements).toHaveLength(8);
      expect(passedEvent.movements[0]).toEqual({
        boosterId: "pack:1:seat:0",
        fromSeatId: 0,
        toSeatId: 1,
      });
      expect(passedEvent.movements[7]).toEqual({
        boosterId: "pack:1:seat:7",
        fromSeatId: 7,
        toSeatId: 0,
      });
    }

    const viewAfter = getDraftView(draft);
    expect(viewAfter.seats[1]?.currentBooster?.boosterId).toBe("pack:1:seat:0");
    expect(viewAfter.seats[1]?.currentBooster?.remainingCardInstanceIds).toHaveLength(14);
  });

  it("transitions through all 45 rounds, rotates left/right/left, and completes draft", () => {
    let draft = createTestDraft();

    for (let round = 0; round < 45; round++) {
      const view = getDraftView(draft);
      const expectedPack = (Math.floor(round / 15) + 1) as 1 | 2 | 3;
      const expectedPick = (round % 15) + 1;

      expect(view.packNumber).toBe(expectedPack);
      expect(view.pickNumber).toBe(expectedPick);
      expect(view.status).toBe("active");

      const command = buildLegalRound(draft, round);
      const result = submitPickRound(draft, command);

      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error(`Round ${String(round + 1)} failed: ${result.error.message}`);
      }

      // Check event ordering
      const events = result.value.appendedEvents;
      const cardPicks = events.filter((e) => e.type === "CardPicked");
      expect(cardPicks).toHaveLength(8);
      expect(cardPicks.map((c) => c.seatId)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);

      if (expectedPick < 15) {
        expect(events[8]?.type).toBe("BoostersPassed");
        if (events[8]?.type === "BoostersPassed") {
          const expectedTo = (seatId: number) =>
            expectedPack === 2 ? (seatId + 7) % 8 : (seatId + 1) % 8;
          expect(events[8].movements.map((m) => m.toSeatId)).toEqual(
            [0, 1, 2, 3, 4, 5, 6, 7].map(expectedTo),
          );
        }
      } else {
        expect(events[8]?.type).toBe("PackCompleted");
        if (events[8]?.type === "PackCompleted") {
          expect(events[8].packNumber).toBe(expectedPack);
          expect(events[8].cumulativePickCount).toBe(expectedPack * 15);
        }
        if (expectedPack === 3) {
          expect(events[9]?.type).toBe("DraftCompleted");
          if (events[9]?.type === "DraftCompleted") {
            expect(events[9].invariants.every((inv) => inv.passed)).toBe(true);
          }
        }
      }

      draft = result.value.draft;
    }

    const finalView = getDraftView(draft);
    expect(finalView.status).toBe("completed");
    expect(finalView.revision).toBe(45);
    for (const seat of finalView.seats) {
      expect(seat.priorPool).toHaveLength(45);
    }

    // Refusal after completion
    const postCommand: SubmitPickRound = {
      sessionId: finalView.sessionId,
      expectedRevision: 45,
      packNumber: 3,
      pickNumber: 15,
      occurredAt: "2026-09-04T12:05:00.000Z",
      decisions: [],
    };
    const afterCompletionResult = submitPickRound(draft, postCommand);
    expect(afterCompletionResult.ok).toBe(false);
    if (!afterCompletionResult.ok) {
      expect(afterCompletionResult.error.code).toBe("SESSION_COMPLETED");
    }
  });
});
