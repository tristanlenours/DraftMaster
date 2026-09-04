import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { validateSnapshot } from "../../../src/cubes/validate-snapshot.ts";
import {
  DRAFT_CONFIGURATION,
  getDraftView,
  startDraft,
  submitPickRound,
  type SeatDecision,
  type SeatId,
  type StartDraftInput,
  type SubmitPickRound,
} from "../../../src/draft/index.ts";
import { RANDOM_SYSTEM_METADATA } from "../../../src/random/seeded-random.ts";
import {
  buildSyntheticSnapshot,
  loadInitialSnapshotFixture,
} from "../../fixtures/cube-fixtures.ts";

function createValidInput(seed: number, cardsCount = 545): StartDraftInput {
  const validated =
    cardsCount === 545
      ? validateSnapshot(loadInitialSnapshotFixture())
      : validateSnapshot(buildSyntheticSnapshot(cardsCount, `2026-02-24.${String(cardsCount)}`));
  if (!validated.ok) {
    throw new Error(validated.error.message);
  }
  const snapshot = validated.value;

  return {
    snapshot,
    sessionId: "0c0e1a78c4cf",
    seed,
    startedAt: "2026-09-04T12:00:00.000Z",
    engineVersion: "draft-engine@1.0.0",
    randomSystem: RANDOM_SYSTEM_METADATA,
    seatPolicies: Array.from({ length: 8 }, (_, i) => ({
      seatId: i as SeatId,
      policyId: "seeded-random",
      policyVersion: "1",
    })),
    configuration: DRAFT_CONFIGURATION,
  };
}

describe("Draft invariant conservation properties (fast-check)", () => {
  it("preserves card conservation, pairwise disjointness, and expected pool sizes across random legal pick sequences", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -2_147_483_648, max: 2_147_483_647 }),
        fc.integer({ min: 1, max: 15 }), // test across various rounds
        (seed, roundsToPlay) => {
          const input = createValidInput(seed);
          const startRes = startDraft(input);
          expect(startRes.ok).toBe(true);
          if (!startRes.ok) return;

          let currentDraft = startRes.value.draft;
          const allSnapshotIds = new Set(input.snapshot.cards.map((c) => c.instanceId));

          for (let round = 0; round < roundsToPlay; round++) {
            const view = getDraftView(currentDraft);
            const packNumber = view.packNumber;
            const pickNumber = view.pickNumber;

            // Collect decisions: pick index 0 from each seat booster
            const decisions: SeatDecision[] = [];
            for (let s = 0; s < 8; s++) {
              const seatView = view.seats[s];
              const cardId = seatView?.currentBooster?.remainingCardInstanceIds[0];
              if (cardId === undefined) {
                throw new Error("Missing booster card");
              }
              decisions.push({
                seatId: s as SeatId,
                cardInstanceId: cardId,
                source: {
                  kind: "policy",
                  policyId: "seeded-random",
                  policyVersion: "1",
                },
              });
            }

            const command: SubmitPickRound = {
              sessionId: input.sessionId,
              expectedRevision: round,
              packNumber,
              pickNumber,
              occurredAt: `2026-09-04T12:${String(round).padStart(2, "0")}:00.000Z`,
              decisions,
            };

            const stepRes = submitPickRound(currentDraft, command);
            expect(stepRes.ok).toBe(true);
            if (!stepRes.ok) return;

            currentDraft = stepRes.value.draft;
            const updatedView = getDraftView(currentDraft);

            // Invariant 1: Expected sizes
            for (const seat of updatedView.seats) {
              expect(seat.priorPool).toHaveLength((packNumber - 1) * 15 + pickNumber);
            }

            // Invariant 2: Card conservation and pairwise disjointness
            const assignedCards = updatedView.seats.flatMap((s) => s.priorPool);
            const boosterCards = updatedView.seats.flatMap(
              (s) => s.currentBooster?.remainingCardInstanceIds ?? [],
            );
            // All cards in play
            const allActiveCards = [...assignedCards, ...boosterCards];
            const allActiveSet = new Set(allActiveCards);
            expect(allActiveSet.size).toBe(allActiveCards.length); // no duplicates

            for (const card of allActiveCards) {
              expect(allSnapshotIds.has(card)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it("guarantees refusal without mutation under arbitrary invalid commands", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -2_147_483_648, max: 2_147_483_647 }),
        fc.constantFrom(
          "WRONG_SESSION",
          "STALE_REVISION",
          "WRONG_PACK",
          "ILLEGAL_CARD",
          "DUP_SEAT",
        ),
        (seed, mutationType) => {
          const input = createValidInput(seed);
          const startRes = startDraft(input);
          if (!startRes.ok) return;

          const currentDraft = startRes.value.draft;
          const viewBefore = getDraftView(currentDraft);

          // Build legal decisions
          const decisions: SeatDecision[] = [];
          for (let s = 0; s < 8; s++) {
            const seatView = viewBefore.seats[s];
            const cardId = seatView?.currentBooster?.remainingCardInstanceIds[0];
            if (cardId === undefined) {
              throw new Error("Missing booster card");
            }
            decisions.push({
              seatId: s as SeatId,
              cardInstanceId: cardId,
              source: {
                kind: "policy",
                policyId: "seeded-random",
                policyVersion: "1",
              },
            });
          }

          let badCommand: SubmitPickRound = {
            sessionId: input.sessionId,
            expectedRevision: viewBefore.revision,
            packNumber: viewBefore.packNumber,
            pickNumber: viewBefore.pickNumber,
            occurredAt: "2026-09-04T12:01:00.000Z",
            decisions,
          };

          if (mutationType === "WRONG_SESSION") {
            badCommand = { ...badCommand, sessionId: "ffffffffffff" };
          } else if (mutationType === "STALE_REVISION") {
            badCommand = { ...badCommand, expectedRevision: 99 };
          } else if (mutationType === "WRONG_PACK") {
            badCommand = { ...badCommand, packNumber: 2 };
          } else if (mutationType === "ILLEGAL_CARD") {
            badCommand = {
              ...badCommand,
              decisions: decisions.map((d) =>
                d.seatId === 0 ? { ...d, cardInstanceId: "nonexistent-card" } : d,
              ),
            };
          } else {
            badCommand = {
              ...badCommand,
              decisions: decisions.map((d) => (d.seatId === 1 ? { ...d, seatId: 0 } : d)),
            };
          }

          const result = submitPickRound(currentDraft, badCommand);
          expect(result.ok).toBe(false);

          // State and view after refusal must be identical to before
          const viewAfter = getDraftView(currentDraft);
          expect(viewAfter.revision).toBe(viewBefore.revision);
          expect(viewAfter.packNumber).toBe(viewBefore.packNumber);
          expect(viewAfter.pickNumber).toBe(viewBefore.pickNumber);
          expect(viewAfter.status).toBe(viewBefore.status);
          for (let s = 0; s < 8; s++) {
            expect(viewAfter.seats[s]?.priorPool).toEqual(viewBefore.seats[s]?.priorPool);
            expect(viewAfter.seats[s]?.currentBooster?.remainingCardInstanceIds).toEqual(
              viewBefore.seats[s]?.currentBooster?.remainingCardInstanceIds,
            );
          }
        },
      ),
      { numRuns: 25 },
    );
  });
});
