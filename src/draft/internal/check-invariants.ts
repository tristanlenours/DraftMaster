import type { CardInstance } from "../../cubes/validate-snapshot.ts";
import type { DraftInvariantResult, SeatPool } from "./types.ts";

export function checkDraftInvariants(
  seatPools: readonly Readonly<SeatPool>[],
  unusedCardInstanceIds: readonly string[],
  snapshotCards: readonly Readonly<CardInstance>[],
): readonly Readonly<DraftInvariantResult>[] {
  const allAssigned = seatPools.flatMap((p) => p.cardInstanceIds);
  const totalPicks = allAssigned.length;
  const allCards = [...allAssigned, ...unusedCardInstanceIds];
  const allCardsUnique = new Set(allCards);
  const totalDuplicates = allCards.length - allCardsUnique.size;

  const validSnapshotCardIds = new Set(snapshotCards.map((c) => c.instanceId));
  const totalSnapshotCards = snapshotCards.length;
  const allCardsBelongToSnapshot = allCards.every((id) => validSnapshotCardIds.has(id));

  const minPoolSize =
    seatPools.length === 0 ? 0 : Math.min(...seatPools.map((p) => p.cardInstanceIds.length));
  const maxPoolSize =
    seatPools.length === 0 ? 0 : Math.max(...seatPools.map((p) => p.cardInstanceIds.length));
  const poolSizeConsistent = seatPools.length === 8 && minPoolSize === 45 && maxPoolSize === 45;

  const conservationPassed =
    allCards.length === totalSnapshotCards && totalDuplicates === 0 && allCardsBelongToSnapshot;

  return Object.freeze([
    Object.freeze({
      code: "PICK_COUNT",
      passed: totalPicks === 360,
      expected: 360,
      actual: totalPicks,
    }),
    Object.freeze({
      code: "SEAT_POOL_SIZE",
      passed: poolSizeConsistent,
      expected: 45,
      actual: minPoolSize,
    }),
    Object.freeze({
      code: "CARD_CONSERVATION",
      passed: conservationPassed,
      expected: totalSnapshotCards,
      actual: allCards.length,
    }),
    Object.freeze({
      code: "NO_DUPLICATE_ASSIGNMENT",
      passed: totalDuplicates === 0,
      expected: 0,
      actual: totalDuplicates,
    }),
  ]);
}

export function allInvariantsPassed(
  invariants: readonly Readonly<DraftInvariantResult>[],
): boolean {
  return invariants.length > 0 && invariants.every((inv) => inv.passed);
}
