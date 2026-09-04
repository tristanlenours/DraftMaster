import { failure, success, type DraftError, type Result } from "./errors.ts";
import { deepFreeze } from "./immutable.ts";
import { computeBoosterMovements, computeDraftInvariants } from "./rotation.ts";
import type {
  Booster,
  BoostersPassedEvent,
  CardPickedEvent,
  DraftCompletedEvent,
  DraftEvent,
  DraftState,
  DraftStatus,
  DraftTransition,
  PackCompletedEvent,
  PackNumber,
  SeatDecision,
  SeatId,
  SubmitPickRound,
} from "./types.ts";

export function submitPickRoundState(
  draft: Readonly<DraftState>,
  command: Readonly<SubmitPickRound>,
): Result<Readonly<DraftTransition>, DraftError> {
  if (draft.status === "completed") {
    return failure("SESSION_COMPLETED", "Draft is already completed.");
  }

  if (command.sessionId !== draft.sessionId) {
    return failure("WRONG_SESSION", "Session ID does not match active draft.");
  }

  if (command.expectedRevision !== draft.revision) {
    return failure("STALE_ROUND", "Draft revision mismatch.");
  }

  if (command.packNumber !== draft.packNumber || command.pickNumber !== draft.pickNumber) {
    return failure("STALE_ROUND", "Pack or pick number mismatch.");
  }

  const decisions = command.decisions;
  const seenSeats = new Set<number>();
  for (const decision of decisions) {
    if (!Number.isInteger(decision.seatId) || decision.seatId < 0 || decision.seatId > 7) {
      return failure("UNKNOWN_SEAT", "Unknown seat ID in decisions.", { seatId: decision.seatId });
    }
    if (seenSeats.has(decision.seatId)) {
      return failure("DUPLICATE_SEAT_DECISION", "Duplicate decision for seat.", {
        seatId: decision.seatId,
      });
    }
    seenSeats.add(decision.seatId);
  }

  if (decisions.length !== 8 || seenSeats.size !== 8) {
    return failure("MISSING_DECISION", "Every seat 0-7 must have exactly one decision.");
  }

  const sortedDecisions = [...decisions].sort((a, b) => a.seatId - b.seatId);

  // Validate every decision before mutating anything
  for (const decision of sortedDecisions) {
    if (decision.source.kind === "caller") {
      if (decision.seatId !== 0) {
        return failure(
          "CALLER_NOT_ALLOWED",
          "Caller decision source is only permitted for seat 0.",
          {
            seatId: decision.seatId,
          },
        );
      }
    } else {
      const registered = draft.seatPolicies.find((p) => p.seatId === decision.seatId);
      if (
        registered?.policyId !== decision.source.policyId ||
        registered.policyVersion !== decision.source.policyVersion
      ) {
        return failure(
          "POLICY_MISMATCH",
          "Decision source does not match registered seat policy.",
          {
            seatId: decision.seatId,
          },
        );
      }
    }

    const currentBooster = draft.boosters.find(
      (b) => b.packNumber === draft.packNumber && b.currentSeatId === decision.seatId,
    );
    if (!currentBooster) {
      return failure("CARD_NOT_IN_CURRENT_BOOSTER", "No active booster found at seat.", {
        seatId: decision.seatId,
      });
    }
    if (!currentBooster.remainingCardInstanceIds.includes(decision.cardInstanceId)) {
      return failure("CARD_NOT_IN_CURRENT_BOOSTER", "Card is not present in current booster.", {
        seatId: decision.seatId,
        cardInstanceId: decision.cardInstanceId,
      });
    }
  }

  // All 8 decisions are valid: generate events
  let currentSeq = draft.journal.length;
  const appendedEvents: DraftEvent[] = [];
  const decisionsBySeat = new Map<SeatId, SeatDecision>();

  for (const decision of sortedDecisions) {
    decisionsBySeat.set(decision.seatId, decision);
    const booster = draft.boosters.find(
      (b) => b.packNumber === draft.packNumber && b.currentSeatId === decision.seatId,
    );
    if (!booster) {
      throw new Error(`Invariant violation: booster missing for seat ${String(decision.seatId)}`);
    }

    const pickedEvent: CardPickedEvent = {
      schemaVersion: 1,
      sequence: currentSeq++,
      sessionId: draft.sessionId,
      occurredAt: command.occurredAt,
      type: "CardPicked",
      packNumber: draft.packNumber,
      pickNumber: draft.pickNumber,
      seatId: decision.seatId,
      boosterId: booster.boosterId,
      cardInstanceId: decision.cardInstanceId,
      source: decision.source,
    };
    appendedEvents.push(pickedEvent);
  }

  const nextSeatPools = draft.seatPools.map((pool) => {
    const decision = decisionsBySeat.get(pool.seatId);
    if (!decision) {
      throw new Error(`Invariant violation: missing decision for seat ${String(pool.seatId)}`);
    }
    return {
      seatId: pool.seatId,
      cardInstanceIds: [...pool.cardInstanceIds, decision.cardInstanceId],
    };
  });

  let nextBoosters: readonly Booster[] = draft.boosters.map((booster) => {
    if (booster.packNumber !== draft.packNumber) {
      return booster;
    }
    const decision = decisionsBySeat.get(booster.currentSeatId);
    if (!decision) {
      return booster;
    }
    return {
      ...booster,
      remainingCardInstanceIds: booster.remainingCardInstanceIds.filter(
        (id) => id !== decision.cardInstanceId,
      ),
    };
  });

  let nextPackNumber: PackNumber = draft.packNumber;
  let nextPickNumber: number = draft.pickNumber + 1;
  let nextStatus: DraftStatus = "active";

  if (draft.pickNumber < 15) {
    const activeBoosters = nextBoosters.filter((b) => b.packNumber === draft.packNumber);
    const movements = computeBoosterMovements(
      draft.packNumber,
      draft.configuration,
      activeBoosters,
    );

    const passedEvent: BoostersPassedEvent = {
      schemaVersion: 1,
      sequence: currentSeq++,
      sessionId: draft.sessionId,
      occurredAt: command.occurredAt,
      type: "BoostersPassed",
      packNumber: draft.packNumber,
      pickNumber: draft.pickNumber,
      movements,
    };
    appendedEvents.push(passedEvent);

    const movementByBoosterId = new Map(movements.map((m) => [m.boosterId, m.toSeatId]));
    nextBoosters = nextBoosters.map((b) => {
      const toSeatId = movementByBoosterId.get(b.boosterId);
      if (toSeatId === undefined) {
        return b;
      }
      return { ...b, currentSeatId: toSeatId };
    });
  } else {
    const packCompletedEvent: PackCompletedEvent = {
      schemaVersion: 1,
      sequence: currentSeq++,
      sessionId: draft.sessionId,
      occurredAt: command.occurredAt,
      type: "PackCompleted",
      packNumber: draft.packNumber,
      cumulativePickCount: draft.packNumber * 15,
    };
    appendedEvents.push(packCompletedEvent);

    if (draft.packNumber < 3) {
      nextPackNumber = (draft.packNumber + 1) as PackNumber;
      nextPickNumber = 1;
    } else {
      nextPackNumber = 3;
      nextPickNumber = 15;
      nextStatus = "completed";

      const invariants = computeDraftInvariants(
        nextSeatPools,
        draft.unusedCardInstanceIds,
        draft.snapshot.cards.length,
      );

      const draftCompletedEvent: DraftCompletedEvent = {
        schemaVersion: 1,
        sequence: currentSeq++,
        sessionId: draft.sessionId,
        occurredAt: command.occurredAt,
        type: "DraftCompleted",
        completedAt: command.occurredAt,
        invariants,
      };
      appendedEvents.push(draftCompletedEvent);
    }
  }

  const nextDraft: Readonly<DraftState> = deepFreeze({
    sessionId: draft.sessionId,
    seed: draft.seed,
    engineVersion: draft.engineVersion,
    randomSystem: draft.randomSystem,
    snapshot: draft.snapshot,
    configuration: draft.configuration,
    seatPolicies: draft.seatPolicies,
    status: nextStatus,
    revision: draft.revision + 1,
    packNumber: nextPackNumber,
    pickNumber: nextPickNumber,
    boosters: nextBoosters,
    seatPools: nextSeatPools,
    unusedCardInstanceIds: draft.unusedCardInstanceIds,
    journal: [...draft.journal, ...appendedEvents],
  });

  return success(deepFreeze({ draft: nextDraft, appendedEvents }));
}
