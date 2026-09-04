import { describe, expect, it } from "vitest";

import {
  getDraftView,
  startDraft,
  submitPickRound,
  type Draft,
  type SeatDecision,
  type SeatPolicyDescriptor,
  type StartDraftInput,
  type SubmitPickRound,
} from "../../../src/draft/index.ts";
import { RANDOM_SYSTEM_METADATA } from "../../../src/random/seeded-random.ts";
import { validateSnapshot } from "../../../src/cubes/validate-snapshot.ts";
import { loadInitialSnapshotFixture } from "../../fixtures/cube-fixtures.ts";

const seatPolicies: readonly SeatPolicyDescriptor[] = [
  { seatId: 0, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 1, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 2, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 3, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 4, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 5, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 6, policyId: "seeded-random", policyVersion: "1" },
  { seatId: 7, policyId: "seeded-random", policyVersion: "1" },
];

function createTestDraft(): Draft {
  const validated = validateSnapshot(loadInitialSnapshotFixture());
  if (!validated.ok) {
    throw new Error(validated.error.message);
  }
  const input: StartDraftInput = {
    snapshot: validated.value,
    sessionId: "0c0e1a78c4cf",
    seed: 42,
    startedAt: "2026-09-04T12:00:00.000Z",
    engineVersion: "draft-engine@1.0.0",
    randomSystem: RANDOM_SYSTEM_METADATA,
    seatPolicies,
    configuration: {
      seatCount: 8,
      packCount: 3,
      cardsPerBooster: 15,
      directions: ["left", "right", "left"],
      controlledSeatId: 0,
    },
  };
  const result = startDraft(input);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value.draft;
}

function buildLegalDecisions(draft: Draft): readonly SeatDecision[] {
  const view = getDraftView(draft);
  return view.seats.map((seat) => {
    const cardInstanceId = seat.currentBooster?.remainingCardInstanceIds[0];
    if (!cardInstanceId) {
      throw new Error(`Seat ${String(seat.seatId)} has no card in booster`);
    }
    return {
      seatId: seat.seatId,
      cardInstanceId,
      source: {
        kind: "policy",
        policyId: "seeded-random",
        policyVersion: "1",
      },
    };
  });
}

describe("submitPickRound atomic round", () => {
  it("rejects wrong session ID without mutating draft state", () => {
    const draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const command: SubmitPickRound = {
      sessionId: "wrong-session",
      expectedRevision: 0,
      packNumber: 1,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions: buildLegalDecisions(draft),
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("WRONG_SESSION");
    }
    expect(getDraftView(draft)).toEqual(viewBefore);
  });

  it("rejects stale revision without mutating draft state", () => {
    const draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const command: SubmitPickRound = {
      sessionId: "0c0e1a78c4cf",
      expectedRevision: 99,
      packNumber: 1,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions: buildLegalDecisions(draft),
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("STALE_ROUND");
    }
    expect(getDraftView(draft)).toEqual(viewBefore);
  });

  it("rejects mismatched pack or pick number without mutating draft state", () => {
    const draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const command: SubmitPickRound = {
      sessionId: "0c0e1a78c4cf",
      expectedRevision: 0,
      packNumber: 2,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions: buildLegalDecisions(draft),
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("STALE_ROUND");
    }
    expect(getDraftView(draft)).toEqual(viewBefore);
  });

  it("rejects unknown seat ID without mutating draft state", () => {
    const draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const decisions = [
      ...buildLegalDecisions(draft).slice(0, 7),
      {
        seatId: 8 as unknown as 7,
        cardInstanceId: "dummy",
        source: { kind: "policy" as const, policyId: "seeded-random", policyVersion: "1" },
      },
    ];
    const command: SubmitPickRound = {
      sessionId: "0c0e1a78c4cf",
      expectedRevision: 0,
      packNumber: 1,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions,
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNKNOWN_SEAT");
    }
    expect(getDraftView(draft)).toEqual(viewBefore);
  });

  it("rejects missing seat decision without mutating draft state", () => {
    const draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const decisions = buildLegalDecisions(draft).slice(0, 7);
    const command: SubmitPickRound = {
      sessionId: "0c0e1a78c4cf",
      expectedRevision: 0,
      packNumber: 1,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions,
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("MISSING_DECISION");
    }
    expect(getDraftView(draft)).toEqual(viewBefore);
  });

  it("rejects duplicate seat decision without mutating draft state", () => {
    const draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const legal = buildLegalDecisions(draft);
    const firstDecision = legal[0];
    if (!firstDecision) {
      throw new Error("Missing first decision");
    }
    const decisions = [...legal.slice(0, 7), firstDecision];
    const command: SubmitPickRound = {
      sessionId: "0c0e1a78c4cf",
      expectedRevision: 0,
      packNumber: 1,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions,
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_SEAT_DECISION");
    }
    expect(getDraftView(draft)).toEqual(viewBefore);
  });

  it("rejects caller decision source on seat other than 0", () => {
    const draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const decisions: SeatDecision[] = buildLegalDecisions(draft).map((d) =>
      d.seatId === 1 ? { ...d, source: { kind: "caller" as const } } : d,
    );
    const command: SubmitPickRound = {
      sessionId: "0c0e1a78c4cf",
      expectedRevision: 0,
      packNumber: 1,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions,
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CALLER_NOT_ALLOWED");
    }
    expect(getDraftView(draft)).toEqual(viewBefore);
  });

  it("rejects card not present in seat's current booster", () => {
    const draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const decisions: SeatDecision[] = buildLegalDecisions(draft).map((d) =>
      d.seatId === 3 ? { ...d, cardInstanceId: "foreign-card-id" } : d,
    );
    const command: SubmitPickRound = {
      sessionId: "0c0e1a78c4cf",
      expectedRevision: 0,
      packNumber: 1,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions,
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CARD_NOT_IN_CURRENT_BOOSTER");
    }
    expect(getDraftView(draft)).toEqual(viewBefore);
  });

  it("rejects policy or version mismatch on any seat (even seat 7)", () => {
    const draft = createTestDraft();
    const viewBefore = getDraftView(draft);
    const decisions: SeatDecision[] = buildLegalDecisions(draft).map((d) =>
      d.seatId === 7
        ? {
            ...d,
            source: {
              kind: "policy" as const,
              policyId: "seeded-random",
              policyVersion: "2",
            },
          }
        : d,
    );
    const command: SubmitPickRound = {
      sessionId: "0c0e1a78c4cf",
      expectedRevision: 0,
      packNumber: 1,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions,
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("POLICY_MISMATCH");
    }
    expect(getDraftView(draft)).toEqual(viewBefore);
  });

  it("accepts explicit caller decision at seat 0 and preserves policy registration", () => {
    const draft = createTestDraft();
    const legalDecisions = buildLegalDecisions(draft);
    const decisions: SeatDecision[] = legalDecisions.map((d) =>
      d.seatId === 0 ? { ...d, source: { kind: "caller" as const } } : d,
    );
    const command: SubmitPickRound = {
      sessionId: "0c0e1a78c4cf",
      expectedRevision: 0,
      packNumber: 1,
      pickNumber: 1,
      occurredAt: "2026-09-04T12:01:00.000Z",
      decisions,
    };

    const result = submitPickRound(draft, command);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const cardPickedEvents = result.value.appendedEvents.filter((e) => e.type === "CardPicked");
    expect(cardPickedEvents).toHaveLength(8);
    expect(cardPickedEvents[0]?.source).toEqual({ kind: "caller" });
    expect(cardPickedEvents[1]?.source).toEqual({
      kind: "policy",
      policyId: "seeded-random",
      policyVersion: "1",
    });

    const nextView = getDraftView(result.value.draft);
    expect(nextView.revision).toBe(1);
    expect(nextView.pickNumber).toBe(2);
    const chosenCard = decisions[0]?.cardInstanceId;
    expect(chosenCard).toBeDefined();
    expect(nextView.seats[0]?.priorPool).toContain(chosenCard);
  });
});
