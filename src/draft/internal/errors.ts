export const DRAFT_ERROR_CODES = Object.freeze([
  "INVALID_SNAPSHOT",
  "INVALID_CUBE_VERSION",
  "DUPLICATE_INSTANCE_ID",
  "INSUFFICIENT_CARDS",
  "INTEGRITY_MISMATCH",
  "INVALID_SESSION_ID",
  "INVALID_CONFIG",
  "INVALID_SEED",
  "SESSION_COMPLETED",
  "WRONG_SESSION",
  "STALE_ROUND",
  "UNKNOWN_SEAT",
  "MISSING_DECISION",
  "DUPLICATE_SEAT_DECISION",
  "CALLER_NOT_ALLOWED",
  "CARD_NOT_IN_CURRENT_BOOSTER",
  "POLICY_MISMATCH",
  "POLICY_FAILED",
  "POLICY_RETURNED_ILLEGAL_CARD",
  "DRAFT_NOT_COMPLETED",
  "INVALID_EVENT_STREAM",
  "INVARIANT_VIOLATION",
] as const);

export type DraftErrorCode = (typeof DRAFT_ERROR_CODES)[number];

export interface DraftError {
  readonly code: DraftErrorCode;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export type Result<T, E> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function success<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function failure(
  code: DraftErrorCode,
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): Result<never, DraftError> {
  return { ok: false, error: { code, message, details } };
}
