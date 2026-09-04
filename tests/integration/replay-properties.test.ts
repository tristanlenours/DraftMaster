import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import {
  buildDraftReport,
  getDraftView,
  replayDraft,
  type DraftEvent,
} from "../../src/draft/index.ts";
import { simulateDraft } from "../../src/simulation/simulate-draft.ts";
import { loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

describe("Replay and Conservation Properties (fast-check)", () => {
  it("preserves exact functional equivalence, pools, and digest across arbitrary seeds", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const snapshot = validated.value;

    fc.assert(
      fc.property(fc.integer({ min: -2_147_483_648, max: 2_147_483_647 }), (seed) => {
        const simRes = simulateDraft({
          snapshot,
          sessionId: "0c0e1a78c4d6",
          seed,
          startedAt: "2026-09-04T12:00:00.000Z",
        });
        expect(simRes.ok).toBe(true);
        if (!simRes.ok) return;

        const origReportRes = buildDraftReport(simRes.value.draft);
        expect(origReportRes.ok).toBe(true);
        if (!origReportRes.ok) return;
        const origReport = origReportRes.value;

        // Replay the full event stream
        const replayRes = replayDraft(simRes.value.events);
        expect(replayRes.ok).toBe(true);
        if (!replayRes.ok) return;

        const repReportRes = buildDraftReport(replayRes.value);
        expect(repReportRes.ok).toBe(true);
        if (!repReportRes.ok) return;
        const repReport = repReportRes.value;

        // Property 1: Digest equivalence
        expect(repReport.functionalDigest).toBe(origReport.functionalDigest);

        // Property 2: Pools equivalence
        expect(repReport.finalPools).toEqual(origReport.finalPools);

        // Property 3: Unused card instances equivalence
        expect(repReport.unusedCardInstanceIds).toEqual(origReport.unusedCardInstanceIds);

        // Property 4: All 4 invariants pass
        expect(repReport.invariants.every((inv) => inv.passed)).toBe(true);
      }),
      { numRuns: 10 },
    );
  });

  it("reconstructs exact partial state across arbitrary seeds and random transition boundaries", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const snapshot = validated.value;

    fc.assert(
      fc.property(
        fc.integer({ min: -2_147_483_648, max: 2_147_483_647 }),
        fc.integer({ min: 0, max: 44 }), // random round boundary
        (seed, roundBoundary) => {
          const simRes = simulateDraft({
            snapshot,
            sessionId: "0c0e1a78c4d6",
            seed,
            startedAt: "2026-09-04T12:00:00.000Z",
          });
          if (!simRes.ok) return;

          const events = simRes.value.events;

          // Calculate boundary event count:
          // roundBoundary 0: after BoostersDealt (length 2)
          // roundBoundary r: 2 + rounds 0..r
          let boundaryLength = 2;
          for (let r = 0; r <= roundBoundary; r++) {
            const pack = Math.floor(r / 15) + 1;
            const pick = (r % 15) + 1;
            if (pack === 3 && pick === 15) {
              boundaryLength += 10;
            } else {
              boundaryLength += 9;
            }
          }

          const prefix = events.slice(0, boundaryLength) as DraftEvent[];
          const replayRes = replayDraft(prefix);
          expect(replayRes.ok).toBe(true);
          if (!replayRes.ok) return;

          const view = getDraftView(replayRes.value);
          const packExpected = Math.floor((roundBoundary + 1) / 15) + 1;
          const pickExpected = ((roundBoundary + 1) % 15) + 1;

          if (roundBoundary === 44) {
            expect(view.status).toBe("completed");
          } else {
            expect(view.status).toBe("active");
            expect(view.revision).toBe(roundBoundary + 1);
            expect(view.packNumber).toBe(packExpected);
            expect(view.pickNumber).toBe(pickExpected);

            // Each seat must have (roundBoundary + 1) picks in priorPool
            for (const seat of view.seats) {
              expect(seat.priorPool).toHaveLength(roundBoundary + 1);
            }

            const repReportRes = buildDraftReport(replayRes.value);
            expect(repReportRes.ok).toBe(false);
            if (!repReportRes.ok) {
              expect(repReportRes.error.code).toBe("DRAFT_NOT_COMPLETED");
            }
          }
        },
      ),
      { numRuns: 10 },
    );
  });
});
