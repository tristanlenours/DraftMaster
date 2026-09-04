import { validateSnapshot } from "../../cubes/validate-snapshot.ts";
import { failure, success, type DraftError, type Result } from "./errors.ts";
import { deepFreeze } from "./immutable.ts";
import { getNextSeatId } from "./rotation.ts";
import type {
  Booster,
  BoostersPassedEvent,
  CardPickedEvent,
  DraftEvent,
  DraftState,
  DraftStatus,
  PackCompletedEvent,
  PackNumber,
  SeatId,
} from "./types.ts";

export function replayDraftState(
  events: readonly Readonly<DraftEvent>[],
): Result<Readonly<DraftState>, DraftError> {
  if (events.length === 0) {
    return failure("INVALID_EVENT_STREAM", "Event stream cannot be empty.");
  }

  const expectedSessionId = events[0]?.sessionId;
  if (!expectedSessionId) {
    return failure("INVALID_EVENT_STREAM", "Event stream has invalid sessionId.");
  }

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev) {
      return failure("INVALID_EVENT_STREAM", `Missing event at index ${String(i)}.`);
    }
    if (ev.sequence !== i) {
      return failure(
        "INVALID_EVENT_STREAM",
        `Invalid sequence: expected ${String(i)}, got ${String(ev.sequence)}.`,
      );
    }
    const untypedEvent = ev as { readonly schemaVersion?: unknown };
    if (untypedEvent.schemaVersion !== 1) {
      return failure("INVALID_EVENT_STREAM", `Invalid schemaVersion at index ${String(i)}.`);
    }
    if (ev.sessionId !== expectedSessionId) {
      return failure("INVALID_EVENT_STREAM", `Mismatched sessionId at index ${String(i)}.`);
    }
  }

  const firstEvent = events[0];
  if (firstEvent?.type !== "DraftStarted") {
    return failure("INVALID_EVENT_STREAM", "First event must be DraftStarted.");
  }
  const startEvent = firstEvent;

  const untypedStart = startEvent as { readonly snapshot?: unknown };
  if (!untypedStart.snapshot) {
    return failure("INVALID_EVENT_STREAM", "DraftStarted is missing embedded snapshot.");
  }
  const snapshotValidation = validateSnapshot(startEvent.snapshot);
  if (!snapshotValidation.ok) {
    return failure("INVALID_EVENT_STREAM", "Embedded snapshot failed validation.", {
      reason: snapshotValidation.error.message,
    });
  }
  const snapshot = snapshotValidation.value;
  if (startEvent.snapshotId !== snapshot.snapshotId) {
    return failure("INVALID_EVENT_STREAM", "Snapshot ID mismatch with embedded snapshot.");
  }
  if (startEvent.snapshotCanonicalSha256 !== snapshot.integrity.canonicalSha256) {
    return failure(
      "INVALID_EVENT_STREAM",
      "Snapshot integrity digest mismatch with embedded snapshot.",
    );
  }

  if (startEvent.seatPolicies.length !== 8) {
    return failure("INVALID_EVENT_STREAM", "Invalid seat policies: expected 8 descriptors.");
  }
  for (let s = 0; s < 8; s++) {
    const sp = startEvent.seatPolicies[s];
    if (sp?.seatId !== s || !sp.policyId || !sp.policyVersion) {
      return failure(
        "INVALID_EVENT_STREAM",
        `Invalid seat policy descriptor for seat ${String(s)}.`,
      );
    }
  }

  if (events.length === 1) {
    return failure("INVALID_EVENT_STREAM", "Stream cannot terminate after DraftStarted.");
  }

  const secondEvent = events[1];
  if (secondEvent?.type !== "BoostersDealt") {
    return failure("INVALID_EVENT_STREAM", "Second event must be BoostersDealt.");
  }
  const dealtEvent = secondEvent;

  if (dealtEvent.boosters.length !== 24) {
    return failure("INVALID_EVENT_STREAM", "BoostersDealt must contain exactly 24 boosters.");
  }
  const snapshotCardIds = new Set(snapshot.cards.map((c) => c.instanceId));
  const seenCardIds = new Set<string>();

  for (const b of dealtEvent.boosters) {
    if (b.packNumber < 1 || b.packNumber > 3) {
      return failure(
        "INVALID_EVENT_STREAM",
        `Invalid packNumber in booster: ${String(b.packNumber)}.`,
      );
    }
    if (b.originSeatId < 0 || b.originSeatId > 7) {
      return failure("INVALID_EVENT_STREAM", `Invalid originSeatId: ${String(b.originSeatId)}.`);
    }
    if (b.currentSeatId !== b.originSeatId) {
      return failure(
        "INVALID_EVENT_STREAM",
        "Initial booster currentSeatId must equal originSeatId.",
      );
    }
    if (b.remainingCardInstanceIds.length !== 15) {
      return failure("INVALID_EVENT_STREAM", "Booster must have exactly 15 cards.");
    }
    for (const cid of b.remainingCardInstanceIds) {
      if (!snapshotCardIds.has(cid)) {
        return failure("INVALID_EVENT_STREAM", `Foreign card instance in booster: ${cid}.`);
      }
      if (seenCardIds.has(cid)) {
        return failure("INVALID_EVENT_STREAM", `Duplicate card instance in booster: ${cid}.`);
      }
      seenCardIds.add(cid);
    }
  }

  const expectedUnusedCount = snapshot.cards.length - 360;
  if (dealtEvent.unusedCardInstanceIds.length !== expectedUnusedCount) {
    return failure(
      "INVALID_EVENT_STREAM",
      `Expected ${String(expectedUnusedCount)} unused instances.`,
    );
  }
  for (const uid of dealtEvent.unusedCardInstanceIds) {
    if (!snapshotCardIds.has(uid)) {
      return failure("INVALID_EVENT_STREAM", `Foreign card in unused instances: ${uid}.`);
    }
    if (seenCardIds.has(uid)) {
      return failure("INVALID_EVENT_STREAM", `Duplicate card instance in unused list: ${uid}.`);
    }
    seenCardIds.add(uid);
  }
  if (seenCardIds.size !== snapshot.cards.length) {
    return failure("INVALID_EVENT_STREAM", "Card partition mismatch in BoostersDealt.");
  }

  let currentBoosters: Booster[] = dealtEvent.boosters.map((b) => ({
    boosterId: b.boosterId,
    packNumber: b.packNumber,
    originSeatId: b.originSeatId,
    currentSeatId: b.currentSeatId,
    remainingCardInstanceIds: [...b.remainingCardInstanceIds],
  }));

  const currentSeatPools: { seatId: SeatId; cardInstanceIds: string[] }[] = Array.from(
    { length: 8 },
    (_, s) => ({ seatId: s as SeatId, cardInstanceIds: [] }),
  );

  let revision = 0;
  let packNumber: PackNumber = 1;
  let pickNumber = 1;
  let status: DraftStatus = "active";
  let idx = 2;

  while (idx < events.length) {
    if (status === "completed") {
      return failure("INVALID_EVENT_STREAM", "No events may follow DraftCompleted.");
    }

    if (idx + 8 > events.length) {
      return failure("INVALID_EVENT_STREAM", "Incomplete pick round: stream cut during picks.");
    }

    for (let s = 0; s < 8; s++) {
      const ev = events[idx + s];
      if (ev?.type !== "CardPicked") {
        return failure("INVALID_EVENT_STREAM", `Expected CardPicked event for seat ${String(s)}.`);
      }
      const pickEvent: CardPickedEvent = ev;

      if (pickEvent.packNumber !== packNumber || pickEvent.pickNumber !== pickNumber) {
        return failure("INVALID_EVENT_STREAM", "CardPicked pack/pick mismatch.");
      }
      if (pickEvent.seatId !== s) {
        return failure("INVALID_EVENT_STREAM", "CardPicked events must be ordered by seat 0..7.");
      }

      if (pickEvent.source.kind === "caller") {
        if (s !== 0) {
          return failure("INVALID_EVENT_STREAM", "Caller source is only allowed for seat 0.");
        }
      } else {
        const reg = startEvent.seatPolicies[s];
        if (
          pickEvent.source.policyId !== reg?.policyId ||
          pickEvent.source.policyVersion !== reg.policyVersion
        ) {
          return failure("INVALID_EVENT_STREAM", `Policy mismatch for seat ${String(s)}.`);
        }
      }

      const boosterIndex = currentBoosters.findIndex(
        (b) => b.packNumber === packNumber && b.currentSeatId === s,
      );
      if (boosterIndex === -1) {
        return failure("INVALID_EVENT_STREAM", `No active booster found at seat ${String(s)}.`);
      }
      const currentBooster = currentBoosters[boosterIndex];
      if (!currentBooster) {
        return failure("INVALID_EVENT_STREAM", `Missing booster at seat ${String(s)}.`);
      }

      if (pickEvent.boosterId !== currentBooster.boosterId) {
        return failure("INVALID_EVENT_STREAM", "Mismatched boosterId in CardPicked.");
      }

      if (!currentBooster.remainingCardInstanceIds.includes(pickEvent.cardInstanceId)) {
        return failure(
          "INVALID_EVENT_STREAM",
          `Card ${pickEvent.cardInstanceId} is not in current booster.`,
        );
      }

      currentBoosters[boosterIndex] = {
        ...currentBooster,
        remainingCardInstanceIds: currentBooster.remainingCardInstanceIds.filter(
          (id) => id !== pickEvent.cardInstanceId,
        ),
      };
      currentSeatPools[s]?.cardInstanceIds.push(pickEvent.cardInstanceId);
    }

    idx += 8;

    if (pickNumber < 15) {
      if (idx >= events.length) {
        return failure("INVALID_EVENT_STREAM", "Incomplete transition: missing BoostersPassed.");
      }
      const ev = events[idx];
      if (ev?.type !== "BoostersPassed") {
        return failure("INVALID_EVENT_STREAM", "Expected BoostersPassed event after pick round.");
      }
      const passEvent: BoostersPassedEvent = ev;
      if (passEvent.packNumber !== packNumber || passEvent.pickNumber !== pickNumber) {
        return failure("INVALID_EVENT_STREAM", "BoostersPassed pack/pick mismatch.");
      }

      if (passEvent.movements.length !== 8) {
        return failure("INVALID_EVENT_STREAM", "BoostersPassed must have exactly 8 movements.");
      }

      const nextSeatByFrom = new Map<SeatId, SeatId>();
      for (const m of passEvent.movements) {
        const expectedTo = getNextSeatId(m.fromSeatId, packNumber, startEvent.configuration);
        if (m.toSeatId !== expectedTo) {
          return failure(
            "INVALID_EVENT_STREAM",
            `Invalid movement in BoostersPassed: from ${String(m.fromSeatId)} to ${String(m.toSeatId)}.`,
          );
        }
        nextSeatByFrom.set(m.fromSeatId, m.toSeatId);
      }

      currentBoosters = currentBoosters.map((b) => {
        if (b.packNumber !== packNumber) return b;
        const nextSeat = nextSeatByFrom.get(b.currentSeatId);
        if (nextSeat === undefined) return b;
        return { ...b, currentSeatId: nextSeat };
      });

      revision++;
      pickNumber++;
      idx++;
    } else {
      if (idx >= events.length) {
        return failure("INVALID_EVENT_STREAM", "Incomplete transition: missing PackCompleted.");
      }
      const ev = events[idx];
      if (ev?.type !== "PackCompleted") {
        return failure("INVALID_EVENT_STREAM", "Expected PackCompleted event after pick 15.");
      }
      const packEvent: PackCompletedEvent = ev;
      if (packEvent.packNumber !== packNumber) {
        return failure("INVALID_EVENT_STREAM", "PackCompleted packNumber mismatch.");
      }
      if (packEvent.cumulativePickCount !== packNumber * 15) {
        return failure("INVALID_EVENT_STREAM", "PackCompleted cumulativePickCount mismatch.");
      }
      idx++;

      if (packNumber < 3) {
        revision++;
        packNumber = (packNumber + 1) as PackNumber;
        pickNumber = 1;
      } else {
        if (idx >= events.length) {
          return failure(
            "INVALID_EVENT_STREAM",
            "Incomplete transition: PackCompleted of pack 3 must be followed by DraftCompleted.",
          );
        }
        const draftCompEv = events[idx];
        if (draftCompEv?.type !== "DraftCompleted") {
          return failure(
            "INVALID_EVENT_STREAM",
            "Expected DraftCompleted event after final PackCompleted.",
          );
        }
        revision++;
        status = "completed";
        idx++;
      }
    }
  }

  const reconstructedState: DraftState = deepFreeze({
    sessionId: startEvent.sessionId,
    seed: startEvent.seed,
    engineVersion: startEvent.engineVersion,
    randomSystem: startEvent.randomSystem,
    snapshot,
    configuration: startEvent.configuration,
    seatPolicies: startEvent.seatPolicies,
    status,
    revision,
    packNumber,
    pickNumber,
    boosters: currentBoosters,
    seatPools: currentSeatPools,
    unusedCardInstanceIds: dealtEvent.unusedCardInstanceIds,
    journal: events,
  });

  return success(reconstructedState);
}
