import { describe, expect, it } from "vitest";
import { validateSnapshot } from "../../../src/cubes/validate-snapshot.ts";
import { loadInitialSnapshotFixture } from "../../fixtures/cube-fixtures.ts";
import { simulateDraft } from "../../../src/simulation/simulate-draft.ts";
import { buildDraftReport, functionalProjection } from "../../../src/draft/index.ts";
import { createFriendTablePolicies } from "../../../src/bots/friends/index.ts";
import { createCoachedBotPolicy } from "../../../src/bots/coached-bot-policy.ts";
import type { PickPolicy } from "../../../src/bots/pick-policy.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";

describe("Friend Bots Draft Simulation Determinism (US3, SC-003)", () => {
  it("produces identical picks, card pools, and functional events across 2 full simulations with 7 friend bots and same seed", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const snapshot = validated.value;
    const seed = 20260905;

    // Create cards resolver from snapshot cards
    const cardsMap = new Map<string, CardEvaluationInput>(
      snapshot.cards.map((c) => [
        c.instanceId,
        {
          id: c.instanceId,
          name: c.name,
          colors: [],
          staticScore: 30,
        },
      ]),
    );
    const resolveCard = (id: string) => cardsMap.get(id);

    // Build 8 policies: Seat 0 is Coached Bot, Seats 1-7 are Friend Bots
    const friendTable = createFriendTablePolicies({ resolveCard });
    const friendPolicies = friendTable.filter((p): p is PickPolicy => p !== null);
    const fullTablePolicies: readonly PickPolicy[] = [
      createCoachedBotPolicy({ resolveCard }),
      ...friendPolicies,
    ];

    // Simulation A
    const resultA = simulateDraft({
      snapshot,
      sessionId: "000000000001",
      seed,
      startedAt: "2026-09-05T00:00:00.000Z",
      policies: fullTablePolicies,
      timestampGenerator: (round) =>
        new Date(Date.parse("2026-09-05T00:00:00.000Z") + round * 2000).toISOString(),
    });
    expect(resultA.ok).toBe(true);
    if (!resultA.ok) return;

    const reportA = buildDraftReport(resultA.value.draft);
    expect(reportA.ok).toBe(true);
    if (!reportA.ok) return;

    // Simulation B (different session ID, different timestamps, same seed and policies)
    const resultB = simulateDraft({
      snapshot,
      sessionId: "000000000002",
      seed,
      startedAt: "2026-10-15T12:00:00.000Z",
      policies: fullTablePolicies,
      timestampGenerator: (round) =>
        new Date(Date.parse("2026-10-15T12:00:00.000Z") + round * 5000).toISOString(),
    });
    expect(resultB.ok).toBe(true);
    if (!resultB.ok) return;

    const reportB = buildDraftReport(resultB.value.draft);
    expect(reportB.ok).toBe(true);
    if (!reportB.ok) return;

    // 1. Session IDs differ
    expect(reportA.value.sessionId).not.toBe(reportB.value.sessionId);
    expect(reportA.value.startedAt).not.toBe(reportB.value.startedAt);

    // 2. All 8 seats have strictly identical 45 picked cards in identical order
    expect(reportA.value.finalPools).toHaveLength(8);
    expect(reportB.value.finalPools).toHaveLength(8);

    for (let seat = 0; seat < 8; seat++) {
      const poolA = reportA.value.finalPools[seat]?.cardInstanceIds;
      const poolB = reportB.value.finalPools[seat]?.cardInstanceIds;
      expect(poolA).toBeDefined();
      expect(poolB).toBeDefined();
      expect(poolA).toHaveLength(45);
      expect(poolB).toHaveLength(45);
      expect(poolA).toEqual(poolB);
    }

    // 3. Functional projection of draft reports is 100% identical (SC-003)
    const projectionA = functionalProjection(reportA.value);
    const projectionB = functionalProjection(reportB.value);
    expect(projectionA).toEqual(projectionB);

    // 4. Canonical RFC 8785 functional digest matches bit-for-bit (INV-005)
    expect(reportA.value.functionalDigest).toBe(reportB.value.functionalDigest);
  });
});
