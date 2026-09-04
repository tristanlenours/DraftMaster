import { failure, success, type DraftError, type Result } from "./errors.ts";
import { deepFreeze } from "./immutable.ts";
import { checkDraftInvariants, allInvariantsPassed } from "./check-invariants.ts";
import { calculateReportDigest, functionalProjection } from "./functional-projection.ts";
import { replayDraftState } from "./replay-draft.ts";
import type { DraftReport, DraftState } from "./types.ts";

export function buildDraftReportState(
  draft: Readonly<DraftState>,
): Result<Readonly<DraftReport>, DraftError> {
  if (draft.status !== "completed") {
    return failure("DRAFT_NOT_COMPLETED", "Draft is not yet completed.");
  }

  const initialEvent = draft.journal[0];
  if (initialEvent?.type !== "DraftStarted") {
    return failure("INVALID_EVENT_STREAM", "Journal missing initial DraftStarted event.");
  }

  const lastEvent = draft.journal[draft.journal.length - 1];
  if (lastEvent?.type !== "DraftCompleted") {
    return failure("INVALID_EVENT_STREAM", "Journal missing final DraftCompleted event.");
  }

  const invariants = checkDraftInvariants(
    draft.seatPools,
    draft.unusedCardInstanceIds,
    draft.snapshot.cards,
  );

  if (!allInvariantsPassed(invariants)) {
    return failure("INVARIANT_VIOLATION", "One or more draft invariants failed.", {
      invariants,
    });
  }

  // Replay journal to verify legality and event stream consistency
  const replayResult = replayDraftState(draft.journal);
  if (!replayResult.ok) {
    return replayResult;
  }
  const replayed = replayResult.value;

  const poolsMatch =
    draft.seatPools.length === replayed.seatPools.length &&
    draft.seatPools.every((p, i) => {
      const rp = replayed.seatPools[i];
      if (!rp) {
        return false;
      }
      return (
        p.seatId === rp.seatId &&
        p.cardInstanceIds.length === rp.cardInstanceIds.length &&
        p.cardInstanceIds.every((id, j) => id === rp.cardInstanceIds[j])
      );
    });
  const unusedMatch =
    draft.unusedCardInstanceIds.length === replayed.unusedCardInstanceIds.length &&
    draft.unusedCardInstanceIds.every((id, i) => id === replayed.unusedCardInstanceIds[i]);

  if (!poolsMatch || !unusedMatch) {
    return failure("INVARIANT_VIOLATION", "Draft state pools do not match journal replay.");
  }

  const reportDraft: Omit<DraftReport, "functionalDigest"> = {
    schemaVersion: 1,
    sessionId: draft.sessionId,
    seed: draft.seed,
    startedAt: initialEvent.occurredAt,
    completedAt: lastEvent.completedAt,
    engineVersion: draft.engineVersion,
    randomSystem: draft.randomSystem,
    seatPolicies: draft.seatPolicies,
    configuration: draft.configuration,
    snapshotId: draft.snapshot.snapshotId,
    snapshotCanonicalSha256: draft.snapshot.integrity.canonicalSha256,
    snapshotProvenance: draft.snapshot.source,
    events: draft.journal,
    finalPools: draft.seatPools,
    unusedCardInstanceIds: draft.unusedCardInstanceIds,
    invariants,
  };

  const projection = functionalProjection(reportDraft);
  const functionalDigest = calculateReportDigest(projection);

  const report: DraftReport = deepFreeze({
    ...reportDraft,
    functionalDigest,
  });

  return success(report);
}
