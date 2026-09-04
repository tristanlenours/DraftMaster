import { buildDraftView } from "./internal/draft-view.ts";
import type { DraftError, Result } from "./internal/errors.ts";
import { startDraftState } from "./internal/start-draft.ts";
import { submitPickRoundState } from "./internal/submit-pick-round.ts";
import type {
  DraftEvent,
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

export type {
  DraftConfiguration,
  DraftEvent,
  DraftView,
  SeatDecision,
  SeatId,
  SeatPolicyDescriptor,
  StartDraftInput,
  SubmitPickRound,
} from "./internal/types.ts";
export type { DraftError, DraftErrorCode, Result } from "./internal/errors.ts";
