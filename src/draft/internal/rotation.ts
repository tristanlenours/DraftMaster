import type {
  BoosterId,
  BoosterMovement,
  DraftConfiguration,
  DraftInvariantResult,
  PackNumber,
  SeatId,
  SeatPool,
} from "./types.ts";

export function getNextSeatId(
  seatId: SeatId,
  packNumber: PackNumber,
  configuration: Readonly<DraftConfiguration>,
): SeatId {
  const direction = configuration.directions[packNumber - 1];
  if (direction === "left") {
    return ((seatId + 1) % 8) as SeatId;
  }
  return ((seatId + 7) % 8) as SeatId;
}

export function computeBoosterMovements(
  packNumber: PackNumber,
  configuration: Readonly<DraftConfiguration>,
  activeBoosters: readonly { readonly boosterId: BoosterId; readonly currentSeatId: SeatId }[],
): readonly BoosterMovement[] {
  const sorted = [...activeBoosters].sort((a, b) => a.currentSeatId - b.currentSeatId);
  return sorted.map((booster) => ({
    boosterId: booster.boosterId,
    fromSeatId: booster.currentSeatId,
    toSeatId: getNextSeatId(booster.currentSeatId, packNumber, configuration),
  }));
}

export function computeDraftInvariants(
  seatPools: readonly Readonly<SeatPool>[],
  unusedCardInstanceIds: readonly string[],
  totalSnapshotCards: number,
): readonly Readonly<DraftInvariantResult>[] {
  const allAssigned = seatPools.flatMap((p) => p.cardInstanceIds);
  const totalPicks = allAssigned.length;
  const allCards = [...allAssigned, ...unusedCardInstanceIds];
  const allCardsUnique = new Set(allCards);
  const totalDuplicates = allCards.length - allCardsUnique.size;

  const minPoolSize = Math.min(...seatPools.map((p) => p.cardInstanceIds.length));
  const maxPoolSize = Math.max(...seatPools.map((p) => p.cardInstanceIds.length));
  const poolSizeConsistent = minPoolSize === 45 && maxPoolSize === 45;

  return [
    {
      code: "PICK_COUNT",
      passed: totalPicks === 360,
      expected: 360,
      actual: totalPicks,
    },
    {
      code: "SEAT_POOL_SIZE",
      passed: poolSizeConsistent,
      expected: 45,
      actual: minPoolSize,
    },
    {
      code: "CARD_CONSERVATION",
      passed: allCards.length === totalSnapshotCards && totalDuplicates === 0,
      expected: totalSnapshotCards,
      actual: allCards.length,
    },
    {
      code: "NO_DUPLICATE_ASSIGNMENT",
      passed: totalDuplicates === 0,
      expected: 0,
      actual: totalDuplicates,
    },
  ];
}
