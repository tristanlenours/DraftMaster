import { describe, expect, it } from "vitest";

import { validateSnapshot } from "../../../src/cubes/validate-snapshot.ts";
import {
  buildDraftReport,
  calculateReportDigest,
  functionalProjection,
  type DraftReport,
} from "../../../src/draft/index.ts";
import { simulateDraft } from "../../../src/simulation/simulate-draft.ts";
import { loadInitialSnapshotFixture } from "../../fixtures/cube-fixtures.ts";

function createFinishedReport(): DraftReport {
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

  const reportResult = buildDraftReport(result.value.draft);
  if (!reportResult.ok) {
    throw new Error(reportResult.error.message);
  }

  return reportResult.value;
}

type ProjectedRecord = Record<string, unknown>;

describe("functionalProjection unit tests", () => {
  it("excludes IDs and timestamps by location while preserving original report without mutation", () => {
    const report = createFinishedReport();
    const originalJsonBefore = JSON.stringify(report);

    const projection = functionalProjection(report) as ProjectedRecord;

    // 1. Original report is not mutated
    expect(JSON.stringify(report)).toBe(originalJsonBefore);

    // 2. Top-level exclusions
    expect(projection).not.toHaveProperty("functionalDigest");
    expect(projection).not.toHaveProperty("sessionId");
    expect(projection).not.toHaveProperty("startedAt");
    expect(projection).not.toHaveProperty("completedAt");

    // Top-level retained fields
    expect(projection).toHaveProperty("schemaVersion", 1);
    expect(projection).toHaveProperty("seed", 42);
    expect(projection).toHaveProperty("engineVersion", report.engineVersion);
    expect(projection).toHaveProperty("randomSystem", report.randomSystem);
    expect(projection).toHaveProperty("seatPolicies", report.seatPolicies);
    expect(projection).toHaveProperty("configuration", report.configuration);
    expect(projection).toHaveProperty("snapshotId", report.snapshotId);
    expect(projection).toHaveProperty("snapshotCanonicalSha256", report.snapshotCanonicalSha256);
    expect(projection).toHaveProperty("finalPools", report.finalPools);
    expect(projection).toHaveProperty("unusedCardInstanceIds", report.unusedCardInstanceIds);
    expect(projection).toHaveProperty("invariants", report.invariants);

    // 3. Top-level snapshotProvenance exclusions
    const prov = projection.snapshotProvenance as ProjectedRecord | undefined;
    expect(prov).toBeDefined();
    if (prov) {
      expect(prov).not.toHaveProperty("cubeUpdatedAt");
      expect(prov).not.toHaveProperty("retrievedAt");
      expect(prov).toHaveProperty("provider", "CubeCobra");
      expect(prov).toHaveProperty("url");
    }

    // 4. Events exclusions
    const events = projection.events as ProjectedRecord[];
    expect(events).toHaveLength(report.events.length);

    for (const evt of events) {
      expect(evt).not.toHaveProperty("sessionId");
      expect(evt).not.toHaveProperty("occurredAt");
      expect(evt).toHaveProperty("type");
      expect(evt).toHaveProperty("sequence");

      if (evt.type === "DraftStarted") {
        const snap = evt.snapshot as ProjectedRecord | undefined;
        expect(snap).toBeDefined();
        if (snap) {
          const snapSource = snap.source as ProjectedRecord | undefined;
          expect(snapSource).toBeDefined();
          if (snapSource) {
            expect(snapSource).not.toHaveProperty("cubeUpdatedAt");
            expect(snapSource).not.toHaveProperty("retrievedAt");
            expect(snapSource).toHaveProperty("provider", "CubeCobra");
          }
        }
      }

      if (evt.type === "DraftCompleted") {
        expect(evt).not.toHaveProperty("completedAt");
      }
    }
  });

  it("treats key ordering as indifferent for canonical RFC 8785 digest", () => {
    const report = createFinishedReport();
    const projection = functionalProjection(report) as ProjectedRecord;

    // Construct projection with reversed key order
    const reversedKeys = Object.keys(projection).reverse();
    const reorderedProjection: Record<string, unknown> = {};
    for (const key of reversedKeys) {
      reorderedProjection[key] = projection[key];
    }

    const digestOriginal = calculateReportDigest(projection);
    const digestReordered = calculateReportDigest(reorderedProjection);

    expect(digestOriginal).toBe(digestReordered);
  });

  it("preserves list ordering: mutating order of arrays changes the digest", () => {
    const report = createFinishedReport();
    const projection = functionalProjection(report) as ProjectedRecord;
    const digestOriginal = calculateReportDigest(projection);

    // Swap two events
    const events = [...(projection.events as ProjectedRecord[])];
    const firstEvent = events[1];
    const secondEvent = events[2];
    if (!firstEvent || !secondEvent) {
      throw new Error("Missing events to swap");
    }
    events[1] = secondEvent;
    events[2] = firstEvent;

    const mutatedProjection = { ...projection, events };
    const digestMutated = calculateReportDigest(mutatedProjection);

    expect(digestMutated).not.toBe(digestOriginal);
  });

  it("includes snapshot version, integrity digest and card list in the projection", () => {
    const report = createFinishedReport();
    const projection = functionalProjection(report) as ProjectedRecord;

    // Verify snapshot properties inside DraftStarted
    const events = projection.events as ProjectedRecord[];
    const startedEvent = events.find((e) => e.type === "DraftStarted");
    if (!startedEvent) {
      throw new Error("Missing DraftStarted event");
    }
    const snapshot = startedEvent.snapshot as ProjectedRecord;

    expect(snapshot).toHaveProperty("version", "2026-02-24.1");
    expect(snapshot).toHaveProperty("integrity");
    const integrity = snapshot.integrity as ProjectedRecord;
    expect(integrity).toHaveProperty("canonicalSha256");
    expect(integrity).toHaveProperty("cardCount", 545);
    expect(snapshot).toHaveProperty("cards");
    expect(Array.isArray(snapshot.cards)).toBe(true);
  });

  it("detects functional mutations: changing seed, card, config, versions, or picks modifies the digest", () => {
    const report = createFinishedReport();
    const projection = functionalProjection(report) as ProjectedRecord;
    const baseDigest = calculateReportDigest(projection);

    // 1. Mutate seed
    const seedMutated = { ...projection, seed: 999 };
    expect(calculateReportDigest(seedMutated)).not.toBe(baseDigest);

    // 2. Mutate engineVersion
    const versionMutated = { ...projection, engineVersion: "draft-engine@2.0.0" };
    expect(calculateReportDigest(versionMutated)).not.toBe(baseDigest);

    // 3. Mutate configuration
    const currentConfig = projection.configuration;
    if (typeof currentConfig !== "object" || currentConfig === null) {
      throw new Error("Missing configuration object");
    }
    const configMutated = {
      ...projection,
      configuration: { ...currentConfig, cardsPerBooster: 16 },
    };
    expect(calculateReportDigest(configMutated)).not.toBe(baseDigest);

    // 4. Mutate seat policy version
    const seatPolicies = JSON.parse(JSON.stringify(projection.seatPolicies)) as {
      policyVersion: string;
    }[];
    const firstPolicy = seatPolicies[0];
    if (!firstPolicy) {
      throw new Error("Missing seat policy");
    }
    firstPolicy.policyVersion = "2";
    const policiesMutated = { ...projection, seatPolicies };
    expect(calculateReportDigest(policiesMutated)).not.toBe(baseDigest);

    // 5. Mutate a card in finalPools
    const finalPools = JSON.parse(JSON.stringify(projection.finalPools)) as {
      cardInstanceIds: string[];
    }[];
    const firstPool = finalPools[0];
    if (!firstPool) {
      throw new Error("Missing final pool");
    }
    firstPool.cardInstanceIds[0] = "mutated-card-id";
    const poolsMutated = { ...projection, finalPools };
    expect(calculateReportDigest(poolsMutated)).not.toBe(baseDigest);

    // 6. Mutate a picked card in events
    const events = JSON.parse(JSON.stringify(projection.events)) as ProjectedRecord[];
    const pickEvent = events.find((e) => e.type === "CardPicked");
    if (!pickEvent) {
      throw new Error("Missing CardPicked event");
    }
    const mutatedPickEvent: ProjectedRecord = {
      ...pickEvent,
      cardInstanceId: "different-instance-id",
    };
    const mutatedEvents = events.map((e) => (e === pickEvent ? mutatedPickEvent : e));
    const eventsMutated = { ...projection, events: mutatedEvents };
    expect(calculateReportDigest(eventsMutated)).not.toBe(baseDigest);
  });
});
