import { describe, expect, it } from "vitest";

import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import {
  buildDraftReport,
  functionalProjection,
  type Booster,
  type BoostersDealtEvent,
  type CardPickedEvent,
} from "../../src/draft/index.ts";
import { simulateDraft } from "../../src/simulation/simulate-draft.ts";
import { loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

describe("Determinism and replayability (US2)", () => {
  it("produces 100% identical functional content, events, pools, and digest across distinct session IDs and timestamps", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) {
      throw new Error(validated.error.message);
    }
    const snapshot = validated.value;
    const seed = 42;

    // Simulation A: Session 1
    const resultA = simulateDraft({
      snapshot,
      sessionId: "000000000001",
      seed,
      startedAt: "2026-01-01T00:00:00.000Z",
      timestampGenerator: (round) =>
        new Date(Date.parse("2026-01-01T00:00:00.000Z") + (round + 1) * 1000).toISOString(),
    });
    expect(resultA.ok).toBe(true);
    if (!resultA.ok) return;

    const reportResultA = buildDraftReport(resultA.value.draft);
    expect(reportResultA.ok).toBe(true);
    if (!reportResultA.ok) return;
    const reportA = reportResultA.value;

    // Simulation B: Session 2 (distinct session ID and different timestamps)
    const resultB = simulateDraft({
      snapshot,
      sessionId: "ffffffffffff",
      seed,
      startedAt: "2026-12-31T23:59:59.000Z",
      timestampGenerator: (round) =>
        new Date(Date.parse("2026-12-31T23:59:59.000Z") + (round + 1) * 75000).toISOString(),
    });
    expect(resultB.ok).toBe(true);
    if (!resultB.ok) return;

    const reportResultB = buildDraftReport(resultB.value.draft);
    expect(reportResultB.ok).toBe(true);
    if (!reportResultB.ok) return;
    const reportB = reportResultB.value;

    // 1. Session IDs and timestamps differ
    expect(reportA.sessionId).not.toBe(reportB.sessionId);
    expect(reportA.startedAt).not.toBe(reportB.startedAt);
    expect(reportA.completedAt).not.toBe(reportB.completedAt);

    // 2. Functional digests are strictly identical
    expect(reportA.functionalDigest).toBe(reportB.functionalDigest);

    // 3. Functional projections match exactly
    expect(functionalProjection(reportA)).toEqual(functionalProjection(reportB));

    // 4. Final pools and unused cards match exactly
    expect(reportA.finalPools).toEqual(reportB.finalPools);
    expect(reportA.unusedCardInstanceIds).toEqual(reportB.unusedCardInstanceIds);

    // 5. Events sequence matches exactly in type, sequence, and domain content
    expect(reportA.events).toHaveLength(reportB.events.length);
    for (let i = 0; i < reportA.events.length; i++) {
      const evA = reportA.events[i];
      const evB = reportB.events[i];
      if (!evA || !evB) {
        throw new Error("Missing event at index " + String(i));
      }

      expect(evA.sequence).toBe(evB.sequence);
      expect(evA.type).toBe(evB.type);

      // SessionId and timestamp differ between events
      expect(evA.sessionId).toBe("000000000001");
      expect(evB.sessionId).toBe("ffffffffffff");
      expect(evA.occurredAt).not.toBe(evB.occurredAt);

      if (evA.type === "CardPicked" && evB.type === "CardPicked") {
        expect(evA.seatId).toBe(evB.seatId);
        expect(evA.packNumber).toBe(evB.packNumber);
        expect(evA.pickNumber).toBe(evB.pickNumber);
        expect(evA.cardInstanceId).toBe(evB.cardInstanceId);
        expect(evA.source).toEqual(evB.source);
      }

      if (evA.type === "BoostersPassed" && evB.type === "BoostersPassed") {
        expect(evA.packNumber).toBe(evB.packNumber);
        expect(evA.pickNumber).toBe(evB.pickNumber);
        expect(evA.movements).toEqual(evB.movements);
      }
    }
  });

  it("produces reproducible results and identical digest with explicit choices at seat 0", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const snapshot = validated.value;

    // Run first to find the first card in seat 0's booster for round 0
    const baseline = simulateDraft({
      snapshot,
      sessionId: "000000000001",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    if (!baseline.ok) throw new Error(baseline.error.message);

    const firstDealt = baseline.value.events.find(
      (e): e is BoostersDealtEvent => e.type === "BoostersDealt",
    );
    if (!firstDealt) throw new Error("Missing BoostersDealt event");

    const seat0Pack1 = firstDealt.boosters.find(
      (b: Booster) => b.originSeatId === 0 && b.packNumber === 1,
    );
    if (!seat0Pack1) throw new Error("Missing seat 0 booster");

    const explicitCardChoice = seat0Pack1.remainingCardInstanceIds[0];
    if (!explicitCardChoice) throw new Error("Missing card in booster");

    const explicitChoices = [explicitCardChoice]; // round 0 explicit

    const run1 = simulateDraft({
      snapshot,
      sessionId: "111111111111",
      seed: 42,
      startedAt: "2026-01-01T10:00:00.000Z",
      explicitChoicesSeat0: explicitChoices,
    });
    expect(run1.ok).toBe(true);
    if (!run1.ok) return;

    const run2 = simulateDraft({
      snapshot,
      sessionId: "222222222222",
      seed: 42,
      startedAt: "2026-02-02T20:00:00.000Z",
      explicitChoicesSeat0: explicitChoices,
    });
    expect(run2.ok).toBe(true);
    if (!run2.ok) return;

    const rep1 = buildDraftReport(run1.value.draft);
    const rep2 = buildDraftReport(run2.value.draft);
    expect(rep1.ok && rep2.ok).toBe(true);
    if (!rep1.ok || !rep2.ok) return;

    expect(rep1.value.functionalDigest).toBe(rep2.value.functionalDigest);
    expect(rep1.value.finalPools).toEqual(rep2.value.finalPools);
  });

  it("guarantees stream isolation: altering a seat's choices does not alter initial booster distribution", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const snapshot = validated.value;
    const seed = 12345;

    // Run 1: all automated seeded-random policies
    const runAllRandom = simulateDraft({
      snapshot,
      sessionId: "111111111111",
      seed,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    expect(runAllRandom.ok).toBe(true);
    if (!runAllRandom.ok) return;

    const dealt1 = runAllRandom.value.events.find(
      (e): e is BoostersDealtEvent => e.type === "BoostersDealt",
    );
    if (!dealt1) throw new Error("Missing BoostersDealt event in run 1");

    // Run 2: seat 0 makes an explicit choice of a different card in round 0
    const seat0Booster = dealt1.boosters.find(
      (b: Booster) => b.originSeatId === 0 && b.packNumber === 1,
    );
    if (!seat0Booster) throw new Error("Missing seat 0 booster");

    // Pick the LAST card in the booster instead of what the random policy would pick
    const lastCardIndex = seat0Booster.remainingCardInstanceIds.length - 1;
    const differentCardChoice = seat0Booster.remainingCardInstanceIds[lastCardIndex];
    if (!differentCardChoice) throw new Error("Missing card in booster");

    const runWithExplicitChoice = simulateDraft({
      snapshot,
      sessionId: "222222222222",
      seed,
      startedAt: "2026-09-04T13:00:00.000Z",
      explicitChoicesSeat0: [differentCardChoice],
    });
    expect(runWithExplicitChoice.ok).toBe(true);
    if (!runWithExplicitChoice.ok) return;

    const dealt2 = runWithExplicitChoice.value.events.find(
      (e): e is BoostersDealtEvent => e.type === "BoostersDealt",
    );
    if (!dealt2) throw new Error("Missing BoostersDealt event in run 2");

    // The initial distribution (boosters and unused instances) MUST be 100% identical!
    expect(dealt1.boosters).toEqual(dealt2.boosters);
    expect(dealt1.unusedCardInstanceIds).toEqual(dealt2.unusedCardInstanceIds);

    // Verify card choices in seat 0 actually differed
    const pick1Seat0 = runAllRandom.value.events.find(
      (e): e is CardPickedEvent => e.type === "CardPicked" && e.seatId === 0 && e.pickNumber === 1,
    );
    const pick2Seat0 = runWithExplicitChoice.value.events.find(
      (e): e is CardPickedEvent => e.type === "CardPicked" && e.seatId === 0 && e.pickNumber === 1,
    );
    if (!pick1Seat0 || !pick2Seat0) throw new Error("Missing pick events");

    expect(pick2Seat0.cardInstanceId).toBe(differentCardChoice);
    expect(pick2Seat0.source).toEqual({ kind: "caller" });
    expect(pick1Seat0.source).toEqual({
      kind: "policy",
      policyId: "seeded-random",
      policyVersion: "1",
    });
  });

  it.each([0, 42, 1337, -2147483648])(
    "verifies determinism holds across varied seeds: %i",
    (seed) => {
      const validated = validateSnapshot(loadInitialSnapshotFixture());
      if (!validated.ok) throw new Error(validated.error.message);
      const snapshot = validated.value;

      const res1 = simulateDraft({
        snapshot,
        sessionId: "aaaaaaaaaaaa",
        seed,
        startedAt: "2026-01-01T00:00:00.000Z",
      });
      const res2 = simulateDraft({
        snapshot,
        sessionId: "bbbbbbbbbbbb",
        seed,
        startedAt: "2026-06-01T00:00:00.000Z",
      });

      expect(res1.ok && res2.ok).toBe(true);
      if (!res1.ok || !res2.ok) return;

      const rep1 = buildDraftReport(res1.value.draft);
      const rep2 = buildDraftReport(res2.value.draft);
      expect(rep1.ok && rep2.ok).toBe(true);
      if (!rep1.ok || !rep2.ok) return;

      expect(rep1.value.functionalDigest).toBe(rep2.value.functionalDigest);
      expect(rep1.value.finalPools).toEqual(rep2.value.finalPools);
    },
  );
});
