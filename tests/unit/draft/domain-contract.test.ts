import { describe, expect, it } from "vitest";

import { DRAFT_ERROR_CODES, failure, success } from "../../../src/draft/internal/errors.ts";
import { DRAFT_CONFIGURATION } from "../../../src/draft/internal/types.ts";

describe("draft domain contract", () => {
  it("locks the fixed eight-seat, three-pack configuration", () => {
    expect(DRAFT_CONFIGURATION).toEqual({
      seatCount: 8,
      packCount: 3,
      cardsPerBooster: 15,
      directions: ["left", "right", "left"],
      controlledSeatId: 0,
    });
    expect(Object.isFrozen(DRAFT_CONFIGURATION)).toBe(true);
    expect(Object.isFrozen(DRAFT_CONFIGURATION.directions)).toBe(true);
    expect(Reflect.set(DRAFT_CONFIGURATION, "seatCount", 7)).toBe(false);
  });

  it("locks every stable domain error code, including POLICY_MISMATCH", () => {
    expect(DRAFT_ERROR_CODES).toEqual([
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
    ]);
    expect(Object.isFrozen(DRAFT_ERROR_CODES)).toBe(true);
  });

  it("builds discriminated success and failure results", () => {
    expect(success("chosen-card")).toEqual({ ok: true, value: "chosen-card" });
    expect(failure("POLICY_MISMATCH", "Policy changed.", { seatId: 3 })).toEqual({
      ok: false,
      error: {
        code: "POLICY_MISMATCH",
        message: "Policy changed.",
        details: { seatId: 3 },
      },
    });
  });
});
