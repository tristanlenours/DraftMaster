import { describe, expect, it } from "vitest";

import { validateSnapshot, type CardInstance } from "../../../src/cubes/validate-snapshot.ts";
import {
  buildDraftReport,
  calculateReportDigest,
  functionalProjection,
  replayDraft,
  type Draft,
  type DraftEvent,
  type DraftReport,
  type DraftStartedEvent,
  type SeatPool,
} from "../../../src/draft/index.ts";
import {
  allInvariantsPassed,
  checkDraftInvariants,
} from "../../../src/draft/internal/check-invariants.ts";
import type { DraftState } from "../../../src/draft/internal/types.ts";
import { simulateDraft } from "../../../src/simulation/simulate-draft.ts";
import { loadInitialSnapshotFixture } from "../../fixtures/cube-fixtures.ts";

function createValidSnapshotCards(count = 545): CardInstance[] {
  return Array.from({ length: count }, (_, i) => ({
    instanceId: `card-${String(i)}`,
    sourceIndex: i,
    printingId: `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`,
    oracleId: `10000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`,
    name: `Card ${String(i)}`,
    setCode: "TST",
    collectorNumber: String(i + 1),
  }));
}

function createValidPoolsAndUnused(cards: CardInstance[]): {
  seatPools: SeatPool[];
  unused: string[];
} {
  const seatPools: SeatPool[] = [];
  for (let s = 0; s < 8; s++) {
    const cardInstanceIds = cards.slice(s * 45, (s + 1) * 45).map((c) => c.instanceId);
    seatPools.push({ seatId: s as SeatPool["seatId"], cardInstanceIds });
  }
  const unused = cards.slice(360).map((c) => c.instanceId);
  return { seatPools, unused };
}

describe("checkDraftInvariants - non-constant outcomes", () => {
  it("passes all 4 invariants for a valid 545 partition", () => {
    const cards = createValidSnapshotCards(545);
    const { seatPools, unused } = createValidPoolsAndUnused(cards);

    const invariants = checkDraftInvariants(seatPools, unused, cards);
    expect(invariants).toHaveLength(4);
    expect(allInvariantsPassed(invariants)).toBe(true);

    for (const inv of invariants) {
      expect(inv.passed).toBe(true);
    }
  });

  it("passes all 4 invariants for a valid 360 partition with empty unused", () => {
    const cards = createValidSnapshotCards(360);
    const { seatPools, unused } = createValidPoolsAndUnused(cards);

    const invariants = checkDraftInvariants(seatPools, unused, cards);
    expect(allInvariantsPassed(invariants)).toBe(true);
    const conservation = invariants.find((inv) => inv.code === "CARD_CONSERVATION");
    expect(conservation?.passed).toBe(true);
    expect(conservation?.actual).toBe(360);
  });

  it("fails PICK_COUNT when total picks is not 360", () => {
    const cards = createValidSnapshotCards(545);
    const { seatPools, unused } = createValidPoolsAndUnused(cards);

    // Remove one card from seat 0 -> 359 picks
    const firstPool = seatPools[0];
    if (!firstPool) throw new Error("Missing pool 0");
    const mutatedPools = [
      { ...firstPool, cardInstanceIds: firstPool.cardInstanceIds.slice(0, 44) },
      ...seatPools.slice(1),
    ];

    const invariants = checkDraftInvariants(mutatedPools, unused, cards);
    const pickInv = invariants.find((inv) => inv.code === "PICK_COUNT");
    expect(pickInv?.passed).toBe(false);
    expect(pickInv?.actual).toBe(359);
    expect(pickInv?.expected).toBe(360);
    expect(allInvariantsPassed(invariants)).toBe(false);
  });

  it("fails SEAT_POOL_SIZE when pools are unbalanced even if total picks is 360", () => {
    const cards = createValidSnapshotCards(545);
    const { seatPools, unused } = createValidPoolsAndUnused(cards);

    const pool0 = seatPools[0];
    const pool1 = seatPools[1];
    if (!pool0 || !pool1) throw new Error("Missing pools");

    // Move one card from seat 0 to seat 1: seat 0 has 44, seat 1 has 46, total is 360
    const cardToMove = pool0.cardInstanceIds[44];
    if (!cardToMove) throw new Error("Missing card to move");

    const mutatedPools = [
      { ...pool0, cardInstanceIds: pool0.cardInstanceIds.slice(0, 44) },
      { ...pool1, cardInstanceIds: [...pool1.cardInstanceIds, cardToMove] },
      ...seatPools.slice(2),
    ];

    const invariants = checkDraftInvariants(mutatedPools, unused, cards);

    // PICK_COUNT still passes (360 total)
    const pickInv = invariants.find((inv) => inv.code === "PICK_COUNT");
    expect(pickInv?.passed).toBe(true);

    // But SEAT_POOL_SIZE fails
    const poolSizeInv = invariants.find((inv) => inv.code === "SEAT_POOL_SIZE");
    expect(poolSizeInv?.passed).toBe(false);
    expect(allInvariantsPassed(invariants)).toBe(false);
  });

  it("fails SEAT_POOL_SIZE when seat count is not 8", () => {
    const cards = createValidSnapshotCards(545);
    const { seatPools, unused } = createValidPoolsAndUnused(cards);

    // Only 7 seats
    const mutatedPools = seatPools.slice(0, 7);
    const invariants = checkDraftInvariants(mutatedPools, unused, cards);

    const poolSizeInv = invariants.find((inv) => inv.code === "SEAT_POOL_SIZE");
    expect(poolSizeInv?.passed).toBe(false);
  });

  it("fails CARD_CONSERVATION when an instance is lost", () => {
    const cards = createValidSnapshotCards(545);
    const { seatPools, unused } = createValidPoolsAndUnused(cards);

    // Remove one unused card without adding it anywhere
    const mutatedUnused = unused.slice(0, unused.length - 1);

    const invariants = checkDraftInvariants(seatPools, mutatedUnused, cards);
    const conservationInv = invariants.find((inv) => inv.code === "CARD_CONSERVATION");
    expect(conservationInv?.passed).toBe(false);
    expect(conservationInv?.actual).toBe(544);
    expect(conservationInv?.expected).toBe(545);
  });

  it("fails CARD_CONSERVATION when a foreign card instance is present", () => {
    const cards = createValidSnapshotCards(545);
    const { seatPools, unused } = createValidPoolsAndUnused(cards);

    // Replace one unused card with an unknown instance ID
    const mutatedUnused = [...unused.slice(0, unused.length - 1), "foreign-instance-xyz"];

    const invariants = checkDraftInvariants(seatPools, mutatedUnused, cards);
    const conservationInv = invariants.find((inv) => inv.code === "CARD_CONSERVATION");
    expect(conservationInv?.passed).toBe(false);
  });

  it("fails NO_DUPLICATE_ASSIGNMENT and CARD_CONSERVATION when an instance is duplicated", () => {
    const cards = createValidSnapshotCards(545);
    const { seatPools, unused } = createValidPoolsAndUnused(cards);

    const pool0 = seatPools[0];
    if (!pool0) throw new Error("Missing pool 0");
    const duplicatedId = pool0.cardInstanceIds[0];
    if (!duplicatedId) throw new Error("Missing duplicated id");

    // Add duplicate card into unused (so count is 546)
    const mutatedUnused = [...unused, duplicatedId];

    const invariants = checkDraftInvariants(seatPools, mutatedUnused, cards);

    const dupInv = invariants.find((inv) => inv.code === "NO_DUPLICATE_ASSIGNMENT");
    expect(dupInv?.passed).toBe(false);
    expect(dupInv?.actual).toBe(1);

    const conservationInv = invariants.find((inv) => inv.code === "CARD_CONSERVATION");
    expect(conservationInv?.passed).toBe(false);
  });
});

describe("Digest integrity and corruption detection", () => {
  function getSimulatedReport(): DraftReport {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const simRes = simulateDraft({
      snapshot: validated.value,
      sessionId: "0c0e1a78c4cf",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    if (!simRes.ok) throw new Error(simRes.error.message);
    const repRes = buildDraftReport(simRes.value.draft);
    if (!repRes.ok) throw new Error(repRes.error.message);
    return repRes.value;
  }

  it("confirms that recalculating digest matches valid report", () => {
    const report = getSimulatedReport();
    const projection = functionalProjection(report);
    const computedDigest = calculateReportDigest(projection);
    expect(report.functionalDigest).toBe(computedDigest);
  });

  it("detects altered digest even though functional projections are equal", () => {
    const report = getSimulatedReport();

    // Flip the last character of the digest
    const lastChar = report.functionalDigest.slice(-1);
    const newLastChar = lastChar === "0" ? "1" : "0";
    const corruptedDigest = report.functionalDigest.slice(0, -1) + newLastChar;

    const corruptedReport: DraftReport = {
      ...report,
      functionalDigest: corruptedDigest,
    };

    // Projection excludes functionalDigest, so projections are equal!
    const proj1 = functionalProjection(report);
    const proj2 = functionalProjection(corruptedReport);
    expect(proj1).toEqual(proj2);

    // BUT recalculating digest reveals the corruption!
    const recalculated = calculateReportDigest(proj2);
    expect(corruptedReport.functionalDigest).not.toBe(recalculated);
    expect(report.functionalDigest).toBe(recalculated);
  });

  it("detects malformed digest formats", () => {
    const report = getSimulatedReport();

    const isDigestValid = (d: string): boolean => /^[0-9a-f]{64}$/.test(d);

    expect(isDigestValid(report.functionalDigest)).toBe(true);
    expect(isDigestValid("")).toBe(false);
    expect(isDigestValid(report.functionalDigest.toUpperCase())).toBe(false); // No uppercase
    expect(isDigestValid(report.functionalDigest.slice(0, 63))).toBe(false); // 63 chars
    expect(isDigestValid(report.functionalDigest + "0")).toBe(false); // 65 chars
    expect(isDigestValid(report.functionalDigest.replace(/[0-9]/, "z"))).toBe(false); // Non-hex
  });

  it("detects mutations in functional data (seed, cards, events, configuration, versions)", () => {
    const report = getSimulatedReport();
    const originalDigest = report.functionalDigest;

    // Mutate seed
    const mutatedSeed: DraftReport = { ...report, seed: report.seed + 1 };
    expect(calculateReportDigest(functionalProjection(mutatedSeed))).not.toBe(originalDigest);

    // Mutate engineVersion
    const mutatedEngine: DraftReport = { ...report, engineVersion: "draft-engine@2.0.0" };
    expect(calculateReportDigest(functionalProjection(mutatedEngine))).not.toBe(originalDigest);

    // Mutate configuration
    const mutatedConfig: DraftReport = {
      ...report,
      configuration: { ...report.configuration, cardsPerBooster: 16 as unknown as 15 },
    };
    expect(calculateReportDigest(functionalProjection(mutatedConfig))).not.toBe(originalDigest);

    // Mutate a final pool card
    const firstPool = report.finalPools[0];
    if (!firstPool) throw new Error("Missing pool 0");
    const mutatedPools: DraftReport = {
      ...report,
      finalPools: [
        { ...firstPool, cardInstanceIds: ["mutated-card", ...firstPool.cardInstanceIds.slice(1)] },
        ...report.finalPools.slice(1),
      ],
    };
    expect(calculateReportDigest(functionalProjection(mutatedPools))).not.toBe(originalDigest);

    // Mutate an event in the journal
    const mutatedEvents: DraftReport = {
      ...report,
      events: report.events.map((ev, idx) =>
        idx === 2 && ev.type === "CardPicked" ? { ...ev, cardInstanceId: "mutated-pick" } : ev,
      ),
    };
    expect(calculateReportDigest(functionalProjection(mutatedEvents))).not.toBe(originalDigest);
  });
});

describe("Targeted mutations of journal and draft state", () => {
  function getSimulatedEvents(): readonly Readonly<DraftEvent>[] {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const simRes = simulateDraft({
      snapshot: validated.value,
      sessionId: "0c0e1a78c4cf",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    if (!simRes.ok) throw new Error(simRes.error.message);
    return simRes.value.events;
  }

  it("rejects journal with missing policy version in DraftStarted", () => {
    const events = getSimulatedEvents();
    const first = events[0] as DraftStartedEvent;

    const mutatedFirst: DraftStartedEvent = {
      ...first,
      seatPolicies: first.seatPolicies.map((sp, idx) =>
        idx === 0 ? { ...sp, policyVersion: "" } : sp,
      ),
    };

    const mutatedEvents = [mutatedFirst, ...events.slice(1)];
    const replayRes = replayDraft(mutatedEvents);
    expect(replayRes.ok).toBe(false);
    if (!replayRes.ok) {
      expect(replayRes.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects journal with foreign card instance in booster", () => {
    const events = getSimulatedEvents();
    const second = events[1];
    if (second?.type !== "BoostersDealt") throw new Error("Missing BoostersDealt");
    const first = events[0];
    if (!first) throw new Error("Missing first event");

    const mutatedBoosters = second.boosters.map((b, idx) =>
      idx === 0
        ? {
            ...b,
            remainingCardInstanceIds: [
              "foreign-instance-xyz",
              ...b.remainingCardInstanceIds.slice(1),
            ],
          }
        : b,
    );

    const mutatedEvents = [first, { ...second, boosters: mutatedBoosters }, ...events.slice(2)];
    const replayRes = replayDraft(mutatedEvents);
    expect(replayRes.ok).toBe(false);
    if (!replayRes.ok) {
      expect(replayRes.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects journal with duplicate card instance in boosters", () => {
    const events = getSimulatedEvents();
    const second = events[1];
    if (second?.type !== "BoostersDealt") throw new Error("Missing BoostersDealt");
    const first = events[0];
    if (!first) throw new Error("Missing first event");

    const booster0 = second.boosters[0];
    const booster1 = second.boosters[1];
    if (!booster0 || !booster1) throw new Error("Missing boosters");

    const dupCard = booster0.remainingCardInstanceIds[0];
    if (!dupCard) throw new Error("Missing card");

    const mutatedBoosters = [
      booster0,
      {
        ...booster1,
        remainingCardInstanceIds: [dupCard, ...booster1.remainingCardInstanceIds.slice(1)],
      },
      ...second.boosters.slice(2),
    ];

    const mutatedEvents = [first, { ...second, boosters: mutatedBoosters }, ...events.slice(2)];
    const replayRes = replayDraft(mutatedEvents);
    expect(replayRes.ok).toBe(false);
    if (!replayRes.ok) {
      expect(replayRes.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects journal with illegal pick (card not in booster)", () => {
    const events = getSimulatedEvents();
    // Mutate pick event at index 2
    const pickEvent = events[2];
    if (pickEvent?.type !== "CardPicked") throw new Error("Missing pick event");

    const mutatedPick = { ...pickEvent, cardInstanceId: "card-not-in-booster" };
    const mutatedEvents = [...events.slice(0, 2), mutatedPick, ...events.slice(3)];

    const replayRes = replayDraft(mutatedEvents);
    expect(replayRes.ok).toBe(false);
    if (!replayRes.ok) {
      expect(replayRes.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects journal with incoherent event sequence (sequence numbers scrambled)", () => {
    const events = getSimulatedEvents();
    const ev0 = events[0];
    const ev1 = events[1];
    const ev2 = events[2];
    const ev3 = events[3];
    if (!ev0 || !ev1 || !ev2 || !ev3) throw new Error("Missing events");

    // Swap sequence numbers
    const mutatedEvents = [
      ev0,
      ev1,
      { ...ev2, sequence: 3 },
      { ...ev3, sequence: 2 },
      ...events.slice(4),
    ];

    const replayRes = replayDraft(mutatedEvents);
    expect(replayRes.ok).toBe(false);
    if (!replayRes.ok) {
      expect(replayRes.error.code).toBe("INVALID_EVENT_STREAM");
    }
  });

  it("rejects report generation when draft state pools do not match journal replay (wrong destination)", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const simRes = simulateDraft({
      snapshot: validated.value,
      sessionId: "0c0e1a78c4cf",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    if (!simRes.ok) throw new Error(simRes.error.message);

    const draftState = simRes.value.draft as unknown as DraftState;
    const pool0 = draftState.seatPools[0];
    const pool1 = draftState.seatPools[1];
    if (!pool0 || !pool1) throw new Error("Missing pools");

    // Swap one card between seat 0 and seat 1 pools in draft state
    // Total cards per pool remains 45, no duplicates, all from snapshot, total picks is 360
    // BUT the cards do NOT match what was picked in the journal!
    const card0 = pool0.cardInstanceIds[0];
    const card1 = pool1.cardInstanceIds[0];
    if (!card0 || !card1) throw new Error("Missing cards");

    const mutatedPools = [
      { ...pool0, cardInstanceIds: [card1, ...pool0.cardInstanceIds.slice(1)] },
      { ...pool1, cardInstanceIds: [card0, ...pool1.cardInstanceIds.slice(1)] },
      ...draftState.seatPools.slice(2),
    ];

    const corruptedDraftState: DraftState = {
      ...draftState,
      seatPools: mutatedPools,
    };

    const reportRes = buildDraftReport(corruptedDraftState as unknown as Draft);
    expect(reportRes.ok).toBe(false);
    if (!reportRes.ok) {
      expect(reportRes.error.code).toBe("INVARIANT_VIOLATION");
    }
  });
});
