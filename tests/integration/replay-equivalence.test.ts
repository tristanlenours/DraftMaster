import { describe, expect, it } from "vitest";

import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import {
  buildDraftReport,
  getDraftView,
  replayDraft,
  type BoostersDealtEvent,
  type DraftEvent,
} from "../../src/draft/index.ts";
import { simulateDraft } from "../../src/simulation/simulate-draft.ts";
import { buildSyntheticSnapshot, loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

describe("replayDraft equivalence across sizes and seeds (T040)", () => {
  it.each([
    { cardCount: 545, seed: 42 },
    { cardCount: 540, seed: 123 },
    { cardCount: 360, seed: 9999 },
  ])(
    "reconstructs terminal report, card printings, and provenance from serialized journal for N = $cardCount",
    ({ cardCount, seed }) => {
      const validated =
        cardCount === 545
          ? validateSnapshot(loadInitialSnapshotFixture())
          : validateSnapshot(buildSyntheticSnapshot(cardCount, `2026-02-24.${String(cardCount)}`));
      if (!validated.ok) throw new Error(validated.error.message);
      const snapshot = validated.value;

      const simResult = simulateDraft({
        snapshot,
        sessionId: "0c0e1a78c4d6",
        seed,
        startedAt: "2026-09-04T12:00:00.000Z",
      });
      expect(simResult.ok).toBe(true);
      if (!simResult.ok) return;

      const origReportRes = buildDraftReport(simResult.value.draft);
      expect(origReportRes.ok).toBe(true);
      if (!origReportRes.ok) return;
      const originalReport = origReportRes.value;

      // Serialize and deserialize events: simulating reading from disk or wire
      const serializedEvents = JSON.stringify(originalReport.events);
      const rehydratedEvents = JSON.parse(serializedEvents) as DraftEvent[];

      // Replay purely from rehydrated events (no external snapshot file or policies)
      const replayRes = replayDraft(rehydratedEvents);
      expect(replayRes.ok).toBe(true);
      if (!replayRes.ok) return;

      const replayedDraft = replayRes.value;
      const replayedView = getDraftView(replayedDraft);
      const originalView = getDraftView(simResult.value.draft);

      // Verify card printing information is accurately reconstructed
      for (const card of snapshot.cards) {
        const replayedCard = replayedView.cardsByInstanceId[card.instanceId];
        const originalCard = originalView.cardsByInstanceId[card.instanceId];
        expect(replayedCard).toBeDefined();
        expect(replayedCard).toEqual(originalCard);
        expect(replayedCard?.printingId).toBe(card.printingId);
        expect(replayedCard?.oracleId).toBe(card.oracleId);
        expect(replayedCard?.collectorNumber).toBe(card.collectorNumber);
      }

      // Verify terminal report match
      const repReportRes = buildDraftReport(replayedDraft);
      expect(repReportRes.ok).toBe(true);
      if (!repReportRes.ok) return;

      const replayedReport = repReportRes.value;
      expect(replayedReport.functionalDigest).toBe(originalReport.functionalDigest);
      expect(replayedReport.finalPools).toEqual(originalReport.finalPools);
      expect(replayedReport.unusedCardInstanceIds).toEqual(originalReport.unusedCardInstanceIds);
      expect(replayedReport.invariants).toEqual(originalReport.invariants);

      if (cardCount === 360) {
        expect(replayedReport.unusedCardInstanceIds).toEqual([]);
      }
    },
  );

  it("reconstructs terminal report when seat 0 has explicit choices", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const snapshot = validated.value;

    const base = simulateDraft({
      snapshot,
      sessionId: "000000000001",
      seed: 77,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    if (!base.ok) throw new Error(base.error.message);
    const dealt = base.value.events.find(
      (e): e is BoostersDealtEvent => e.type === "BoostersDealt",
    );
    if (!dealt) throw new Error("Missing BoostersDealt event");
    const seat0P1 = dealt.boosters.find((b) => b.originSeatId === 0 && b.packNumber === 1);
    const explicitCard = seat0P1?.remainingCardInstanceIds[1];
    if (!explicitCard) throw new Error("Missing card in booster");

    const simResult = simulateDraft({
      snapshot,
      sessionId: "000000000001",
      seed: 77,
      startedAt: "2026-09-04T12:00:00.000Z",
      explicitChoicesSeat0: [explicitCard],
    });
    expect(simResult.ok).toBe(true);
    if (!simResult.ok) return;

    const origReportRes = buildDraftReport(simResult.value.draft);
    if (!origReportRes.ok) throw new Error(origReportRes.error.message);

    const rehydrated = JSON.parse(JSON.stringify(origReportRes.value.events)) as DraftEvent[];
    const replayRes = replayDraft(rehydrated);
    expect(replayRes.ok).toBe(true);
    if (!replayRes.ok) return;

    const repReportRes = buildDraftReport(replayRes.value);
    expect(repReportRes.ok).toBe(true);
    if (!repReportRes.ok) return;

    expect(repReportRes.value.functionalDigest).toBe(origReportRes.value.functionalDigest);
  });

  it("validates replay at every public transition boundary and rejects internal transition cuts", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const snapshot = validated.value;

    const simResult = simulateDraft({
      snapshot,
      sessionId: "0c0e1a78c4d6",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    if (!simResult.ok) throw new Error(simResult.error.message);
    const events = simResult.value.events;

    // Identify public transition boundary indices
    // Event 0: DraftStarted
    // Event 1: BoostersDealt -> boundary 0 (length 2)
    // Then 45 rounds:
    // For each round:
    // picks 1..14: 8 picks + 1 BoostersPassed -> length += 9
    // pick 15 packs 1..2: 8 picks + 1 PackCompleted -> length += 9
    // pick 15 pack 3: 8 picks + 1 PackCompleted + 1 DraftCompleted -> length += 10
    const boundaryLengths: number[] = [2];
    let runningLen = 2;
    for (let pack = 1; pack <= 3; pack++) {
      for (let pick = 1; pick <= 15; pick++) {
        if (pack === 3 && pick === 15) {
          runningLen += 10; // 8 picks + PackCompleted + DraftCompleted
        } else {
          runningLen += 9; // 8 picks + (BoostersPassed or PackCompleted)
        }
        boundaryLengths.push(runningLen);
      }
    }

    expect(runningLen).toBe(events.length);

    // Test each public boundary
    for (let b = 0; b < boundaryLengths.length; b++) {
      const len = boundaryLengths[b];
      if (len === undefined) continue;

      const prefix = events.slice(0, len);
      const res = replayDraft(prefix);
      expect(res.ok).toBe(true);
      if (!res.ok) continue;

      const reportRes = buildDraftReport(res.value);
      if (len === events.length) {
        // Terminal boundary: report must succeed
        expect(reportRes.ok).toBe(true);
      } else {
        // Non-terminal boundary: report must fail with DRAFT_NOT_COMPLETED
        expect(reportRes.ok).toBe(false);
        if (!reportRes.ok) {
          expect(reportRes.error.code).toBe("DRAFT_NOT_COMPLETED");
        }
      }

      // Test an illegal cut inside this round (e.g. cut after 4 picks)
      if (b > 0) {
        const prevLen = boundaryLengths[b - 1];
        if (prevLen !== undefined) {
          const cutMidPicks = events.slice(0, prevLen + 4);
          const cutRes = replayDraft(cutMidPicks);
          expect(cutRes.ok).toBe(false);
          if (!cutRes.ok) {
            expect(cutRes.error.code).toBe("INVALID_EVENT_STREAM");
          }
        }
      }
    }

    // Specifically test cut between final PackCompleted and DraftCompleted
    const cutBeforeDraftComplete = events.slice(0, events.length - 1);
    const cutLastRes = replayDraft(cutBeforeDraftComplete);
    expect(cutLastRes.ok).toBe(false);
    if (!cutLastRes.ok) {
      expect(cutLastRes.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });
});
