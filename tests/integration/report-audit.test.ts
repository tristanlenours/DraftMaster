import { describe, expect, it } from "vitest";

import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import {
  buildDraftReport,
  calculateReportDigest,
  DRAFT_CONFIGURATION,
  functionalProjection,
  getDraftView,
  startDraft,
  submitPickRound,
  type CardPickedEvent,
  type DraftReport,
  type SeatId,
} from "../../src/draft/index.ts";
import { createSeededRandomPolicy } from "../../src/bots/seeded-random-policy.ts";
import { getPolicyStreamName, RANDOM_SYSTEM_METADATA } from "../../src/random/seeded-random.ts";
import { simulateDraft } from "../../src/simulation/simulate-draft.ts";
import { buildSyntheticSnapshot, loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

interface TrackedBooster {
  boosterId: string;
  packNumber: number;
  originSeatId: number;
  currentSeatId: number;
  remainingCardInstanceIds: string[];
}

/**
 * Independent audit of a serialized report string.
 * This function NEVER imports check-invariants.ts and NEVER reads external snapshot files.
 * All verification is performed strictly against the parsed report and its embedded snapshot.
 */
function auditSerializedDraftReport(serializedJson: string, expectedN: number): void {
  const report = JSON.parse(serializedJson) as DraftReport;

  // 1. Metadata and schema verification
  expect(report.schemaVersion).toBe(1);
  expect(typeof report.sessionId).toBe("string");
  expect(report.sessionId).toMatch(/^[0-9a-f]{12}$/);
  expect(typeof report.seed).toBe("number");
  expect(typeof report.startedAt).toBe("string");
  expect(typeof report.completedAt).toBe("string");
  expect(typeof report.engineVersion).toBe("string");
  expect(report.engineVersion.length).toBeGreaterThan(0);

  expect(report.randomSystem).toEqual(RANDOM_SYSTEM_METADATA);
  expect(report.configuration).toEqual(DRAFT_CONFIGURATION);

  expect(report.seatPolicies).toHaveLength(8);
  for (let s = 0; s < 8; s++) {
    const sp = report.seatPolicies[s];
    expect(sp).toBeDefined();
    if (!sp) {
      throw new Error(`Missing seat policy for seat ${String(s)}`);
    }
    expect(sp.seatId).toBe(s);
    expect(typeof sp.policyId).toBe("string");
    expect(sp.policyId.length).toBeGreaterThan(0);
    expect(typeof sp.policyVersion).toBe("string");
    expect(sp.policyVersion.length).toBeGreaterThan(0);
  }

  // 2. Embedded Snapshot Integrity & Traceability
  const firstEvent = report.events[0];
  expect(firstEvent?.type).toBe("DraftStarted");
  if (firstEvent?.type !== "DraftStarted") {
    throw new Error("Missing initial DraftStarted event");
  }

  const embeddedSnapshot = firstEvent.snapshot;
  expect(report.snapshotId).toBe(embeddedSnapshot.snapshotId);
  expect(report.snapshotCanonicalSha256).toBe(embeddedSnapshot.integrity.canonicalSha256);
  expect(report.snapshotProvenance).toEqual(embeddedSnapshot.source);

  expect(embeddedSnapshot.cards).toHaveLength(expectedN);

  // Check complete printing information for every single instance
  const snapshotCardsById = new Map<string, (typeof embeddedSnapshot.cards)[number]>();
  for (let i = 0; i < embeddedSnapshot.cards.length; i++) {
    const card = embeddedSnapshot.cards[i];
    if (!card) {
      throw new Error(`Missing card at index ${String(i)}`);
    }
    expect(typeof card.instanceId).toBe("string");
    expect(card.instanceId.length).toBeGreaterThan(0);
    expect(typeof card.name).toBe("string");
    expect(card.name.length).toBeGreaterThan(0);
    expect(typeof card.printingId).toBe("string");
    expect(card.printingId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(typeof card.collectorNumber).toBe("string");
    expect(card.collectorNumber.length).toBeGreaterThan(0);
    expect(typeof card.setCode).toBe("string");
    expect(card.setCode.length).toBeGreaterThan(0);
    expect(typeof card.oracleId).toBe("string");
    expect(card.oracleId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(typeof card.sourceIndex).toBe("number");
    expect(card.sourceIndex).toBe(i);

    expect(snapshotCardsById.has(card.instanceId)).toBe(false);
    snapshotCardsById.set(card.instanceId, card);
  }
  expect(snapshotCardsById.size).toBe(expectedN);

  // 3. Partition and Conservation: 360 / (N - 360)
  expect(report.finalPools).toHaveLength(8);
  const assignedInstanceIds = new Set<string>();
  for (let s = 0; s < 8; s++) {
    const pool = report.finalPools[s];
    if (!pool) {
      throw new Error(`Missing pool for seat ${String(s)}`);
    }
    expect(pool.seatId).toBe(s);
    expect(pool.cardInstanceIds).toHaveLength(45);
    for (const id of pool.cardInstanceIds) {
      expect(snapshotCardsById.has(id)).toBe(true);
      expect(assignedInstanceIds.has(id)).toBe(false); // No duplicate across any pool
      assignedInstanceIds.add(id);
    }
  }
  expect(assignedInstanceIds.size).toBe(360);

  // Unused cards: exactly N - 360
  expect(report.unusedCardInstanceIds).toHaveLength(expectedN - 360);
  if (expectedN === 360) {
    expect(report.unusedCardInstanceIds).toEqual([]);
  }

  const unusedInstanceIds = new Set<string>();
  for (const id of report.unusedCardInstanceIds) {
    expect(snapshotCardsById.has(id)).toBe(true);
    expect(assignedInstanceIds.has(id)).toBe(false); // Never in a pool
    expect(unusedInstanceIds.has(id)).toBe(false); // Never duplicated in unused
    unusedInstanceIds.add(id);
  }

  // Exact partition of all N instances
  expect(assignedInstanceIds.size + unusedInstanceIds.size).toBe(expectedN);
  for (const id of snapshotCardsById.keys()) {
    expect(assignedInstanceIds.has(id) || unusedInstanceIds.has(id)).toBe(true);
  }

  // 4. Detail of all 360 picks and Booster Rotations
  const pickEvents = report.events.filter((e): e is CardPickedEvent => e.type === "CardPicked");
  expect(pickEvents).toHaveLength(360);

  // Track boosters by ID
  const boostersById = new Map<string, TrackedBooster>();
  let pickEventIndex = 0;
  let packCompletedCount = 0;

  for (const event of report.events) {
    if (event.type === "BoostersDealt") {
      expect(event.boosters).toHaveLength(24);
      for (const dealt of event.boosters) {
        expect(dealt.remainingCardInstanceIds).toHaveLength(15);
        boostersById.set(dealt.boosterId, {
          boosterId: dealt.boosterId,
          packNumber: dealt.packNumber,
          originSeatId: dealt.originSeatId,
          currentSeatId: dealt.currentSeatId,
          remainingCardInstanceIds: [...dealt.remainingCardInstanceIds],
        });
      }
    } else if (event.type === "CardPicked") {
      const booster = boostersById.get(event.boosterId);
      expect(booster).toBeDefined();
      if (!booster) {
        throw new Error(`Missing booster ${event.boosterId}`);
      }
      expect(booster.currentSeatId).toBe(event.seatId);
      expect(booster.packNumber).toBe(event.packNumber);
      expect(booster.remainingCardInstanceIds.includes(event.cardInstanceId)).toBe(true);

      // Verify that printing info can be resolved directly from embedded snapshot
      const cardInfo = snapshotCardsById.get(event.cardInstanceId);
      expect(cardInfo).toBeDefined();
      if (!cardInfo) {
        throw new Error(`Missing card info for instance ${event.cardInstanceId}`);
      }
      expect(cardInfo.name.length).toBeGreaterThan(0);

      // Verify decision source
      expect(["caller", "policy"].includes(event.source.kind)).toBe(true);
      if (event.source.kind === "policy") {
        expect(event.source.policyId).toBe(report.seatPolicies[event.seatId]?.policyId);
        expect(event.source.policyVersion).toBe(report.seatPolicies[event.seatId]?.policyVersion);
      }

      // Remove card from booster
      const cardIdx = booster.remainingCardInstanceIds.indexOf(event.cardInstanceId);
      booster.remainingCardInstanceIds.splice(cardIdx, 1);

      pickEventIndex++;
    } else if (event.type === "BoostersPassed") {
      const expectedDelta = event.packNumber === 2 ? 7 : 1; // Pack 2 right (+7 mod 8), Packs 1 & 3 left (+1 mod 8)
      expect(event.movements).toHaveLength(8);

      for (const mov of event.movements) {
        expect((mov.fromSeatId + expectedDelta) % 8).toBe(mov.toSeatId);
        const booster = boostersById.get(mov.boosterId);
        expect(booster).toBeDefined();
        if (!booster) {
          throw new Error(`Missing booster ${mov.boosterId}`);
        }
        expect(booster.currentSeatId).toBe(mov.fromSeatId);
        booster.currentSeatId = mov.toSeatId;
      }
    } else if (event.type === "PackCompleted") {
      packCompletedCount++;
      expect(event.packNumber).toBe(packCompletedCount);
      expect(event.cumulativePickCount).toBe(packCompletedCount * 15);

      // All 8 boosters of this pack should now be empty
      const packBoosters = [...boostersById.values()].filter(
        (b) => b.packNumber === event.packNumber,
      );
      expect(packBoosters).toHaveLength(8);
      for (const pb of packBoosters) {
        expect(pb.remainingCardInstanceIds).toHaveLength(0);
      }
    }
  }

  expect(pickEventIndex).toBe(360);
  expect(packCompletedCount).toBe(3);

  // Confirm that the 45 cards in each seat's final pool match the 45 cards picked by that seat
  for (let s = 0; s < 8; s++) {
    const seatPicks = pickEvents.filter((p) => p.seatId === s).map((p) => p.cardInstanceId);
    expect(seatPicks).toHaveLength(45);
    const pool = report.finalPools[s];
    if (!pool) {
      throw new Error(`Missing final pool for seat ${String(s)}`);
    }
    expect(pool.cardInstanceIds).toHaveLength(45);
    expect(new Set(pool.cardInstanceIds)).toEqual(new Set(seatPicks));
  }

  // 5. Sequence continuity
  for (let i = 0; i < report.events.length; i++) {
    expect(report.events[i]?.sequence).toBe(i);
  }
  const lastEvent = report.events[report.events.length - 1];
  expect(lastEvent?.type).toBe("DraftCompleted");

  // 6. Recalculate and verify functionalDigest
  expect(report.functionalDigest).toMatch(/^[0-9a-f]{64}$/);
  const projection = functionalProjection(report);
  const computedDigest = calculateReportDigest(projection);
  expect(report.functionalDigest).toBe(computedDigest);
}

describe("Draft Report Audit (Independent Verification without check-invariants)", () => {
  it("audits serialized report for N = 545 (historical snapshot)", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) {
      throw new Error(validated.error.message);
    }

    const sim = simulateDraft({
      snapshot: validated.value,
      sessionId: "0c0e1a78c4cf",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    if (!sim.ok) {
      throw new Error(sim.error.message);
    }

    const reportRes = buildDraftReport(sim.value.draft);
    if (!reportRes.ok) {
      throw new Error(reportRes.error.message);
    }

    const serialized = JSON.stringify(reportRes.value);
    auditSerializedDraftReport(serialized, 545);
  });

  it("audits serialized report for N = 540", () => {
    const validated = validateSnapshot(buildSyntheticSnapshot(540, "2026-02-24.540"));
    if (!validated.ok) {
      throw new Error(validated.error.message);
    }

    const sim = simulateDraft({
      snapshot: validated.value,
      sessionId: "0c0e1a78c4cf",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    if (!sim.ok) {
      throw new Error(sim.error.message);
    }

    const reportRes = buildDraftReport(sim.value.draft);
    if (!reportRes.ok) {
      throw new Error(reportRes.error.message);
    }

    const serialized = JSON.stringify(reportRes.value);
    auditSerializedDraftReport(serialized, 540);
  });

  it("audits serialized report for N = 360 (zero unused cards)", () => {
    const validated = validateSnapshot(buildSyntheticSnapshot(360, "2026-02-24.360"));
    if (!validated.ok) {
      throw new Error(validated.error.message);
    }

    const sim = simulateDraft({
      snapshot: validated.value,
      sessionId: "0c0e1a78c4cf",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    if (!sim.ok) {
      throw new Error(sim.error.message);
    }

    const reportRes = buildDraftReport(sim.value.draft);
    if (!reportRes.ok) {
      throw new Error(reportRes.error.message);
    }

    const serialized = JSON.stringify(reportRes.value);
    auditSerializedDraftReport(serialized, 360);
  });

  it("audits report with seat 0 explicit caller picks", () => {
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) {
      throw new Error(validated.error.message);
    }

    const startRes = startDraft({
      snapshot: validated.value,
      sessionId: "0c0e1a78c4cf",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
      engineVersion: "draft-engine@1.0.0",
      randomSystem: RANDOM_SYSTEM_METADATA,
      seatPolicies: Array.from({ length: 8 }, (_, i) => ({
        seatId: i as SeatId,
        policyId: "seeded-random",
        policyVersion: "1",
      })),
      configuration: DRAFT_CONFIGURATION,
    });
    if (!startRes.ok) {
      throw new Error(startRes.error.message);
    }

    let draft = startRes.value.draft;
    const bots = Array.from({ length: 7 }, (_, i) =>
      createSeededRandomPolicy(42, (i + 1) as SeatId),
    );

    for (let round = 1; round <= 45; round++) {
      const packNumber = (Math.floor((round - 1) / 15) + 1) as 1 | 2 | 3;
      const pickNumber = ((round - 1) % 15) + 1;

      const view = getDraftView(draft);
      const seat0Booster = view.seats[0]?.currentBooster;
      if (!seat0Booster || seat0Booster.remainingCardInstanceIds.length === 0) {
        throw new Error("Missing seat 0 booster");
      }
      const seat0Card = seat0Booster.remainingCardInstanceIds[0];
      if (!seat0Card) {
        throw new Error("Missing seat 0 card");
      }

      const botDecisions = bots.map((bot, botIdx) => {
        const seatId = (botIdx + 1) as SeatId;
        const booster = view.seats[seatId]?.currentBooster;
        if (!booster) throw new Error("Missing booster");
        const choiceRes = bot.choose({
          derivedSeed: 42,
          streamName: getPolicyStreamName(seatId),
          seatId,
          packNumber,
          pickNumber,
          currentBooster: booster.remainingCardInstanceIds,
          priorPool: view.seats[seatId]?.priorPool ?? [],
        });
        if (!choiceRes.ok) throw new Error("Bot choice failed");
        return {
          seatId,
          cardInstanceId: choiceRes.value,
          source: {
            kind: "policy" as const,
            policyId: bot.id,
            policyVersion: bot.version,
          },
        };
      });

      const roundRes = submitPickRound(draft, {
        sessionId: "0c0e1a78c4cf",
        expectedRevision: round - 1,
        packNumber,
        pickNumber,
        occurredAt: `2026-09-04T12:0${String(Math.floor(round / 10))}:${String(round % 10)}.000Z`,
        decisions: [
          {
            seatId: 0,
            cardInstanceId: seat0Card,
            source: { kind: "caller" as const },
          },
          ...botDecisions,
        ],
      });
      if (!roundRes.ok) throw new Error(roundRes.error.message);
      draft = roundRes.value.draft;
    }

    const reportRes = buildDraftReport(draft);
    if (!reportRes.ok) throw new Error(reportRes.error.message);

    const serialized = JSON.stringify(reportRes.value);
    auditSerializedDraftReport(serialized, 545);

    // Specifically verify that all 45 picks for seat 0 had caller source
    const parsed = JSON.parse(serialized) as DraftReport;
    const seat0Picks = parsed.events.filter(
      (e): e is CardPickedEvent => e.type === "CardPicked" && e.seatId === 0,
    );
    expect(seat0Picks).toHaveLength(45);
    for (const p of seat0Picks) {
      expect(p.source.kind).toBe("caller");
    }
  });
});
