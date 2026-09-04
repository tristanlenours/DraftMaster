import { buildDraftReportState } from "./internal/build-draft-report.ts";
import { buildDraftView } from "./internal/draft-view.ts";
import type { DraftError, Result } from "./internal/errors.ts";
import { calculateReportDigest, functionalProjection } from "./internal/functional-projection.ts";
import { replayDraftState } from "./internal/replay-draft.ts";
import { startDraftState } from "./internal/start-draft.ts";
import { submitPickRoundState } from "./internal/submit-pick-round.ts";
import type {
  DraftEvent,
  DraftReport,
  DraftState,
  DraftView,
  StartDraftInput,
  SubmitPickRound,
} from "./internal/types.ts";

declare const draftIdentity: unique symbol;
export type Draft = Readonly<{ readonly [draftIdentity]: "Draft" }>;

export interface DraftTransition {
  readonly draft: Draft;
  readonly appendedEvents: readonly Readonly<DraftEvent>[];
}

export function startDraft(
  input: Readonly<StartDraftInput>,
): Result<Readonly<DraftTransition>, DraftError> {
  const result = startDraftState(input);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: {
      draft: result.value.draft as unknown as Draft,
      appendedEvents: result.value.appendedEvents,
    },
  };
}

export function getDraftView(draft: Draft): Readonly<DraftView> {
  return buildDraftView(draft as unknown as Readonly<DraftState>);
}

export function submitPickRound(
  draft: Draft,
  command: Readonly<SubmitPickRound>,
): Result<Readonly<DraftTransition>, DraftError> {
  const result = submitPickRoundState(draft as unknown as Readonly<DraftState>, command);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: {
      draft: result.value.draft as unknown as Draft,
      appendedEvents: result.value.appendedEvents,
    },
  };
}

export function buildDraftReport(draft: Draft): Result<Readonly<DraftReport>, DraftError> {
  return buildDraftReportState(draft as unknown as Readonly<DraftState>);
}

export function replayDraft(events: readonly Readonly<DraftEvent>[]): Result<Draft, DraftError> {
  const result = replayDraftState(events);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    value: result.value as unknown as Draft,
  };
}

export { calculateReportDigest, functionalProjection };
export { DRAFT_CONFIGURATION } from "./internal/types.ts";

export type {
  Booster,
  BoosterMovement,
  BoostersDealtEvent,
  BoostersPassedEvent,
  CardPickedEvent,
  DraftCompletedEvent,
  DraftConfiguration,
  DraftEvent,
  DraftInvariantCode,
  DraftInvariantResult,
  DraftReport,
  DraftStartedEvent,
  DraftView,
  PackCompletedEvent,
  SeatDecision,
  SeatId,
  SeatPolicyDescriptor,
  SeatPool,
  StartDraftInput,
  SubmitPickRound,
} from "./internal/types.ts";
export type { DraftError, DraftErrorCode, Result } from "./internal/errors.ts";
