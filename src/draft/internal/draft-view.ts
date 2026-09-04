import { deepFreeze } from "./immutable.ts";
import type { DraftState, DraftView, SeatId } from "./types.ts";

const seats = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export function buildDraftView(draft: Readonly<DraftState>): Readonly<DraftView> {
  const cardsByInstanceId = Object.fromEntries(
    draft.snapshot.cards.map((card) => [card.instanceId, card]),
  );
  return deepFreeze({
    sessionId: draft.sessionId,
    status: draft.status,
    revision: draft.revision,
    packNumber: draft.packNumber,
    pickNumber: draft.pickNumber,
    seats: seats.map((seatId: SeatId) => ({
      seatId,
      currentBooster: draft.boosters.find(
        (booster) => booster.packNumber === draft.packNumber && booster.currentSeatId === seatId,
      ),
      priorPool: draft.seatPools.find((pool) => pool.seatId === seatId)?.cardInstanceIds ?? [],
    })),
    cardsByInstanceId,
  });
}
