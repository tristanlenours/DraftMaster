import { describe, expect, it } from "vitest";

import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import {
  buildDraftReport,
  getDraftView,
  replayDraft,
  type BoostersDealtEvent,
  type BoostersPassedEvent,
  type CardPickedEvent,
  type DraftEvent,
  type DraftStartedEvent,
} from "../../src/draft/index.ts";
import { simulateDraft } from "../../src/simulation/simulate-draft.ts";
import { loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

function runCompleteSimulation(): {
  readonly draft: Parameters<typeof buildDraftReport>[0];
  readonly events: readonly Readonly<DraftEvent>[];
} {
  const validated = validateSnapshot(loadInitialSnapshotFixture());
  if (!validated.ok) {
    throw new Error(validated.error.message);
  }

  const result = simulateDraft({
    snapshot: validated.value,
    sessionId: "0c0e1a78c4d6",
    seed: 42,
    startedAt: "2026-09-04T12:00:00.000Z",
  });

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return {
    draft: result.value.draft,
    events: result.value.events,
  };
}

describe("replayDraft contract tests", () => {
  it("reconstructs identical draft state, view, pools, invariants, and report from a complete event stream", () => {
    const { draft: originalDraft, events } = runCompleteSimulation();

    const replayResult = replayDraft(events);
    expect(replayResult.ok).toBe(true);
    if (!replayResult.ok) return;

    const replayedDraft = replayResult.value;

    // Compare views
    const originalView = getDraftView(originalDraft);
    const replayedView = getDraftView(replayedDraft);
    expect(replayedView.status).toBe("completed");
    expect(replayedView.status).toBe(originalView.status);
    expect(replayedView.revision).toBe(originalView.revision);
    expect(replayedView.packNumber).toBe(originalView.packNumber);
    expect(replayedView.pickNumber).toBe(originalView.pickNumber);

    for (let s = 0; s < 8; s++) {
      expect(replayedView.seats[s]?.priorPool).toEqual(originalView.seats[s]?.priorPool);
      expect(replayedView.seats[s]?.currentBooster).toEqual(originalView.seats[s]?.currentBooster);
    }

    // Compare reports
    const origReportRes = buildDraftReport(originalDraft);
    const repReportRes = buildDraftReport(replayedDraft);
    expect(origReportRes.ok && repReportRes.ok).toBe(true);
    if (!origReportRes.ok || !repReportRes.ok) return;

    expect(repReportRes.value.functionalDigest).toBe(origReportRes.value.functionalDigest);
    expect(repReportRes.value.finalPools).toEqual(origReportRes.value.finalPools);
    expect(repReportRes.value.unusedCardInstanceIds).toEqual(
      origReportRes.value.unusedCardInstanceIds,
    );
    expect(repReportRes.value.invariants).toEqual(origReportRes.value.invariants);
  });

  it("reconstructs valid non-terminal states from prefixes ending at public transition boundaries", () => {
    const { events } = runCompleteSimulation();

    // Boundary 1: after BoostersDealt (events [0, 1])
    const prefixDealt = events.slice(0, 2);
    const resultDealt = replayDraft(prefixDealt);
    expect(resultDealt.ok).toBe(true);
    if (!resultDealt.ok) return;

    const viewDealt = getDraftView(resultDealt.value);
    expect(viewDealt.status).toBe("active");
    expect(viewDealt.revision).toBe(0);
    expect(viewDealt.packNumber).toBe(1);
    expect(viewDealt.pickNumber).toBe(1);
    for (const seat of viewDealt.seats) {
      expect(seat.priorPool).toHaveLength(0);
      expect(seat.currentBooster?.remainingCardInstanceIds).toHaveLength(15);
    }

    // Attempting buildDraftReport on non-terminal prefix must fail with DRAFT_NOT_COMPLETED
    const reportDealtRes = buildDraftReport(resultDealt.value);
    expect(reportDealtRes.ok).toBe(false);
    if (!reportDealtRes.ok) {
      expect(reportDealtRes.error.code).toBe("DRAFT_NOT_COMPLETED");
    }

    // Boundary 2: after round 1 pick 1 (DraftStarted + BoostersDealt + 8 CardPicked + BoostersPassed = 11 events)
    const prefixRound1 = events.slice(0, 11);
    const resultRound1 = replayDraft(prefixRound1);
    expect(resultRound1.ok).toBe(true);
    if (!resultRound1.ok) return;

    const viewRound1 = getDraftView(resultRound1.value);
    expect(viewRound1.status).toBe("active");
    expect(viewRound1.revision).toBe(1);
    expect(viewRound1.packNumber).toBe(1);
    expect(viewRound1.pickNumber).toBe(2);
    for (const seat of viewRound1.seats) {
      expect(seat.priorPool).toHaveLength(1);
      expect(seat.currentBooster?.remainingCardInstanceIds).toHaveLength(14);
    }

    const reportRound1Res = buildDraftReport(resultRound1.value);
    expect(reportRound1Res.ok).toBe(false);
    if (!reportRound1Res.ok) {
      expect(reportRound1Res.error.code).toBe("DRAFT_NOT_COMPLETED");
    }
  });

  it("rejects empty event stream with INVALID_EVENT_STREAM", () => {
    const result = replayDraft([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects non-zero start sequence, sequence gaps and duplicate sequence numbers", () => {
    const { events } = runCompleteSimulation();

    // 1. Non-zero start
    const nonZeroStart = events.slice(1);
    const res1 = replayDraft(nonZeroStart);
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.error.code).toBe("INVALID_EVENT_STREAM");

    // 2. Sequence gap
    const ev0 = events[0];
    const ev1 = events[1];
    if (!ev0 || !ev1) throw new Error("Missing fixture events");

    const gapped: DraftEvent[] = [ev0, { ...ev1, sequence: 2 }, ...events.slice(2)];
    const res2 = replayDraft(gapped);
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.error.code).toBe("INVALID_EVENT_STREAM");

    // 3. Duplicate sequence number
    const duplicated: DraftEvent[] = [ev0, { ...ev1, sequence: 0 }, ...events.slice(2)];
    const res3 = replayDraft(duplicated);
    expect(res3.ok).toBe(false);
    if (!res3.ok) expect(res3.error.code).toBe("INVALID_EVENT_STREAM");
  });

  it("rejects mismatched session IDs across events with INVALID_EVENT_STREAM", () => {
    const { events } = runCompleteSimulation();
    const mismatched = events.map((e, idx) =>
      idx === 3 ? { ...e, sessionId: "other-session" } : e,
    );
    const result = replayDraft(mismatched);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects streams not starting with DraftStarted or containing unknown event types", () => {
    const { events } = runCompleteSimulation();
    const ev0 = events[0];
    const ev1 = events[1];
    if (!ev0 || !ev1) throw new Error("Missing fixture events");

    // 1. Starts with BoostersDealt (with sequence 0)
    const wrongFirst: DraftEvent[] = [{ ...ev1, sequence: 0 }, ...events.slice(2)];
    const res1 = replayDraft(wrongFirst);
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.error.code).toBe("INVALID_EVENT_STREAM");

    // 2. Unknown event type
    const unknownType: unknown[] = [
      ev0,
      {
        schemaVersion: 1,
        sequence: 1,
        sessionId: ev0.sessionId,
        occurredAt: ev0.occurredAt,
        type: "UnknownEventType",
      },
    ];
    const res2 = replayDraft(unknownType as DraftEvent[]);
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.error.code).toBe("INVALID_EVENT_STREAM");
  });

  it("rejects cuts inside a transition boundary with INVALID_EVENT_STREAM", () => {
    const { events } = runCompleteSimulation();

    // 1. Cut after DraftStarted (before BoostersDealt)
    const cutAfterStart = events.slice(0, 1);
    const res1 = replayDraft(cutAfterStart);
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.error.code).toBe("INVALID_EVENT_STREAM");

    // 2. Cut after 3 CardPicked events (indices 0..4)
    const cutMidPicks = events.slice(0, 5);
    const res2 = replayDraft(cutMidPicks);
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.error.code).toBe("INVALID_EVENT_STREAM");

    // 3. Cut after 8 CardPicked events on pick 1 before BoostersPassed (indices 0..9)
    const cutBeforePass = events.slice(0, 10);
    const res3 = replayDraft(cutBeforePass);
    expect(res3.ok).toBe(false);
    if (!res3.ok) expect(res3.error.code).toBe("INVALID_EVENT_STREAM");

    // 4. Cut after final PackCompleted but before DraftCompleted
    const cutBeforeDraftComplete = events.slice(0, events.length - 1);
    const res4 = replayDraft(cutBeforeDraftComplete);
    expect(res4.ok).toBe(false);
    if (!res4.ok) expect(res4.error.code).toBe("INVALID_EVENT_STREAM");
  });

  it("rejects events appearing after DraftCompleted", () => {
    const { events } = runCompleteSimulation();
    const lastEvent = events[events.length - 1];
    if (!lastEvent) throw new Error("Missing last event");
    const extraEvent: DraftEvent = {
      ...lastEvent,
      sequence: events.length,
    };
    const streamWithExtra: DraftEvent[] = [...events, extraEvent];
    const result = replayDraft(streamWithExtra);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects missing, invalid, or digest-inconsistent embedded snapshots", () => {
    const { events } = runCompleteSimulation();
    const startEvent = events[0] as DraftStartedEvent | undefined;
    if (!startEvent) throw new Error("Missing start event");

    // 1. Inconsistent snapshotId
    const badIdStream: DraftEvent[] = [
      { ...startEvent, snapshotId: "wrong-id" },
      ...events.slice(1),
    ];
    const res1 = replayDraft(badIdStream);
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.error.code).toBe("INVALID_EVENT_STREAM");

    // 2. Inconsistent snapshotCanonicalSha256
    const badHashStream: DraftEvent[] = [
      {
        ...startEvent,
        snapshotCanonicalSha256: "0000000000000000000000000000000000000000000000000000000000000000",
      },
      ...events.slice(1),
    ];
    const res2 = replayDraft(badHashStream);
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.error.code).toBe("INVALID_EVENT_STREAM");

    // 3. Corrupted snapshot content (e.g. invalid card count in integrity)
    const corruptedSnapStream: DraftEvent[] = [
      {
        ...startEvent,
        snapshot: {
          ...startEvent.snapshot,
          integrity: {
            ...startEvent.snapshot.integrity,
            cardCount: 999, // contradicts actual cards length 545
          },
        },
      },
      ...events.slice(1),
    ];
    const res3 = replayDraft(corruptedSnapStream);
    expect(res3.ok).toBe(false);
    if (!res3.ok) expect(res3.error.code).toBe("INVALID_EVENT_STREAM");
  });

  it("rejects foreign or duplicate card instances in BoostersDealt", () => {
    const { events } = runCompleteSimulation();
    const ev0 = events[0];
    const dealtEvent = events[1] as BoostersDealtEvent | undefined;
    if (!ev0 || !dealtEvent) throw new Error("Missing fixture events");

    // Replace first card of first booster with a foreign card ID
    const boostersWithForeign = dealtEvent.boosters.map((b, idx) =>
      idx === 0
        ? {
            ...b,
            remainingCardInstanceIds: ["foreign-card-id", ...b.remainingCardInstanceIds.slice(1)],
          }
        : b,
    );

    const badDealtStream: DraftEvent[] = [
      ev0,
      { ...dealtEvent, boosters: boostersWithForeign },
      ...events.slice(2),
    ];

    const result = replayDraft(badDealtStream);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects CardPicked events choosing cards not present in the current booster", () => {
    const { events } = runCompleteSimulation();
    const ev0 = events[0];
    const ev1 = events[1];
    const firstPick = events[2] as CardPickedEvent | undefined;
    if (!ev0 || !ev1 || !firstPick) throw new Error("Missing fixture events");

    const illegalPickStream: DraftEvent[] = [
      ev0,
      ev1,
      { ...firstPick, cardInstanceId: "nonexistent-in-booster" },
      ...events.slice(3),
    ];

    const result = replayDraft(illegalPickStream);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects policy mismatches and illegal caller decisions during replay", () => {
    const { events } = runCompleteSimulation();

    // 1. Seat 1 has caller source
    const pickSeat1 = events[3] as CardPickedEvent | undefined;
    if (!pickSeat1) throw new Error("Missing pick event");
    const callerSeat1Stream: DraftEvent[] = [
      ...events.slice(0, 3),
      { ...pickSeat1, source: { kind: "caller" as const } },
      ...events.slice(4),
    ];
    const res1 = replayDraft(callerSeat1Stream);
    expect(res1.ok).toBe(false);
    if (!res1.ok) expect(res1.error.code).toBe("INVALID_EVENT_STREAM");

    // 2. Seat 2 has different policyVersion
    const pickSeat2 = events[4] as CardPickedEvent | undefined;
    if (!pickSeat2) throw new Error("Missing pick event");
    const mismatchedPolicyStream: DraftEvent[] = [
      ...events.slice(0, 4),
      {
        ...pickSeat2,
        source: { kind: "policy" as const, policyId: "seeded-random", policyVersion: "99" },
      },
      ...events.slice(5),
    ];
    const res2 = replayDraft(mismatchedPolicyStream);
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.error.code).toBe("INVALID_EVENT_STREAM");
  });

  it("rejects incorrect booster rotation movements in BoostersPassed", () => {
    const { events } = runCompleteSimulation();
    // Event 10 is BoostersPassed for pack 1, pick 1
    const passEvent = events[10] as BoostersPassedEvent | undefined;
    if (!passEvent) throw new Error("Missing BoostersPassed event");

    // Invert the movement
    const corruptedMovements = passEvent.movements.map((m) => ({
      ...m,
      toSeatId: m.fromSeatId, // invalid move to self
    }));

    const corruptedStream: DraftEvent[] = [
      ...events.slice(0, 10),
      { ...passEvent, movements: corruptedMovements },
      ...events.slice(11),
    ];

    const result = replayDraft(corruptedStream);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });
});
