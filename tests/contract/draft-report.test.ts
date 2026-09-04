import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

import { canonicalizeJson } from "../../src/cubes/canonical-snapshot.ts";
import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import {
  buildDraftReport,
  DRAFT_CONFIGURATION,
  functionalProjection,
  startDraft,
  type Draft,
  type DraftReport,
  type StartDraftInput,
} from "../../src/draft/index.ts";
import { RANDOM_SYSTEM_METADATA } from "../../src/random/seeded-random.ts";
import { simulateDraft, type SimulateDraftInput } from "../../src/simulation/simulate-draft.ts";
import { loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

function createValidStartInput(overrides: Partial<StartDraftInput> = {}): StartDraftInput {
  const validated = validateSnapshot(loadInitialSnapshotFixture());
  if (!validated.ok) {
    throw new Error(validated.error.message);
  }
  return {
    snapshot: validated.value,
    sessionId: "0c0e1a78c4cf",
    seed: 42,
    startedAt: "2026-09-04T12:00:00.000Z",
    engineVersion: "0.1.0",
    randomSystem: RANDOM_SYSTEM_METADATA,
    seatPolicies: Array.from({ length: 8 }, (_, i) => ({
      seatId: i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
      policyId: "seeded-random",
      policyVersion: "1",
    })),
    configuration: DRAFT_CONFIGURATION,
    ...overrides,
  };
}

function createSimulationInput(overrides: Partial<SimulateDraftInput> = {}): SimulateDraftInput {
  const validated = validateSnapshot(loadInitialSnapshotFixture());
  if (!validated.ok) {
    throw new Error(validated.error.message);
  }
  return {
    snapshot: validated.value,
    sessionId: "0c0e1a78c4cf",
    seed: 42,
    startedAt: "2026-09-04T12:00:00.000Z",
    ...overrides,
  };
}

describe("DraftReport contract", () => {
  it("rejects report generation before draft is completed with DRAFT_NOT_COMPLETED", () => {
    const input = createValidStartInput();
    const startResult = startDraft(input);
    expect(startResult.ok).toBe(true);
    if (!startResult.ok) {
      return;
    }

    const reportResult = buildDraftReport(startResult.value.draft);
    expect(reportResult.ok).toBe(false);
    if (!reportResult.ok) {
      expect(reportResult.error.code).toBe("DRAFT_NOT_COMPLETED");
    }
  });

  it("produces a complete, frozen report after 45 rounds with exact metadata and invariants", () => {
    const simInput = createSimulationInput();
    const simResult = simulateDraft(simInput);
    expect(simResult.ok).toBe(true);
    if (!simResult.ok) {
      return;
    }

    const reportResult = buildDraftReport(simResult.value.draft);
    expect(reportResult.ok).toBe(true);
    if (!reportResult.ok) {
      return;
    }

    const report = reportResult.value;

    expect(report.schemaVersion).toBe(1);
    expect(report.sessionId).toBe("0c0e1a78c4cf");
    expect(report.seed).toBe(42);
    expect(report.startedAt).toBe("2026-09-04T12:00:00.000Z");
    expect(report.completedAt).toBeDefined();
    expect(report.engineVersion).toBe("draft-engine@1.0.0");
    expect(report.randomSystem).toEqual(RANDOM_SYSTEM_METADATA);
    expect(report.configuration).toEqual(DRAFT_CONFIGURATION);
    expect(report.snapshotId).toBe(simInput.snapshot.snapshotId);
    expect(report.snapshotCanonicalSha256).toBe(simInput.snapshot.integrity.canonicalSha256);
    expect(report.snapshotProvenance).toEqual(simInput.snapshot.source);

    // 8 seat policy descriptors matching DraftStarted exactly
    expect(report.seatPolicies).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(report.seatPolicies[i]).toEqual({
        seatId: i,
        policyId: "seeded-random",
        policyVersion: "1",
      });
    }

    // Journal contains DraftStarted with embedded snapshot
    expect(report.events.length).toBeGreaterThanOrEqual(394);
    const firstEvent = report.events[0];
    expect(firstEvent?.type).toBe("DraftStarted");
    if (firstEvent?.type === "DraftStarted") {
      expect(firstEvent.snapshot).toEqual(simInput.snapshot);
      expect(firstEvent.seatPolicies).toEqual(report.seatPolicies);
    }
    const lastEvent = report.events[report.events.length - 1];
    expect(lastEvent?.type).toBe("DraftCompleted");

    // Final pools and unused cards
    expect(report.finalPools).toHaveLength(8);
    for (const pool of report.finalPools) {
      expect(pool.cardInstanceIds).toHaveLength(45);
    }
    expect(report.unusedCardInstanceIds).toHaveLength(185);

    // Invariants
    expect(report.invariants).toHaveLength(4);
    for (const inv of report.invariants) {
      expect(inv.passed).toBe(true);
    }

    // Digest format: 64 lowercase hex
    expect(report.functionalDigest).toMatch(/^[0-9a-f]{64}$/);

    // Deeply frozen
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.finalPools)).toBe(true);
    expect(Object.isFrozen(report.events)).toBe(true);
  });

  it("produces identical functional projection and digest for identical inputs despite different sessionId and timestamps", () => {
    const input1 = createSimulationInput({
      sessionId: "0c0e1a78c4d1",
      startedAt: "2026-09-04T10:00:00.000Z",
    });
    const input2 = createSimulationInput({
      sessionId: "0c0e1a78c4d2",
      startedAt: "2026-09-04T18:00:00.000Z",
    });

    const res1 = simulateDraft(input1);
    const res2 = simulateDraft(input2);
    if (!res1.ok || !res2.ok) {
      throw new Error("Simulations failed");
    }

    const rep1 = buildDraftReport(res1.value.draft);
    const rep2 = buildDraftReport(res2.value.draft);
    if (!rep1.ok || !rep2.ok) {
      throw new Error("Report creation failed");
    }

    expect(rep1.value.sessionId).not.toBe(rep2.value.sessionId);
    expect(rep1.value.startedAt).not.toBe(rep2.value.startedAt);

    // Projections must be identical
    const proj1 = functionalProjection(rep1.value);
    const proj2 = functionalProjection(rep2.value);
    expect(proj1).toEqual(proj2);

    // Computed digests must match exactly
    expect(rep1.value.functionalDigest).toBe(rep2.value.functionalDigest);

    // Digest must equal SHA-256 of canonical RFC 8785 JSON of projection
    const canonical = canonicalizeJson(proj1);
    const expectedHash = createHash("sha256").update(canonical, "utf8").digest("hex");
    expect(rep1.value.functionalDigest).toBe(expectedHash);
  });

  it("produces a different functional digest when functional input (seed) differs", () => {
    const res1 = simulateDraft(createSimulationInput({ seed: 42 }));
    const res2 = simulateDraft(createSimulationInput({ seed: 43 }));
    if (!res1.ok || !res2.ok) {
      throw new Error("Simulations failed");
    }

    const rep1 = buildDraftReport(res1.value.draft);
    const rep2 = buildDraftReport(res2.value.draft);
    if (!rep1.ok || !rep2.ok) {
      throw new Error("Report creation failed");
    }

    expect(rep1.value.functionalDigest).not.toBe(rep2.value.functionalDigest);
  });

  it("verifies functionalDigest on a deterministic synthetic vector and confirms exclusion of own digest field", () => {
    const syntheticReport: DraftReport = {
      schemaVersion: 1,
      sessionId: "0c0e1a78c4cf",
      seed: 12345,
      startedAt: "2026-09-04T12:00:00.000Z",
      completedAt: "2026-09-04T12:05:00.000Z",
      engineVersion: "0.1.0",
      randomSystem: RANDOM_SYSTEM_METADATA,
      seatPolicies: [
        { seatId: 0, policyId: "seeded-random", policyVersion: "1" },
        { seatId: 1, policyId: "seeded-random", policyVersion: "1" },
        { seatId: 2, policyId: "seeded-random", policyVersion: "1" },
        { seatId: 3, policyId: "seeded-random", policyVersion: "1" },
        { seatId: 4, policyId: "seeded-random", policyVersion: "1" },
        { seatId: 5, policyId: "seeded-random", policyVersion: "1" },
        { seatId: 6, policyId: "seeded-random", policyVersion: "1" },
        { seatId: 7, policyId: "seeded-random", policyVersion: "1" },
      ],
      configuration: DRAFT_CONFIGURATION,
      snapshotId: "titou_tribal@2026-02-24.1",
      snapshotCanonicalSha256: "abc123",
      snapshotProvenance: {
        provider: "CubeCobra",
        cubeId: "5e1c13b67c22a016c25ff019",
        shortId: "6ht",
        cubeName: "Titou Tribal",
        owner: "eltitou007",
        board: "mainboard",
        url: "https://example.com/cube",
        cubeRevision: 1,
        cubeUpdatedAt: "2026-02-24T00:00:00.000Z",
        retrievedAt: "2026-09-04T12:00:00.000Z",
        importerVersion: "0.1.0",
        rawSha256: "def456",
        attribution: "Titou",
      },
      events: [
        {
          schemaVersion: 1,
          sequence: 0,
          sessionId: "0c0e1a78c4cf",
          occurredAt: "2026-09-04T12:00:00.000Z",
          type: "DraftCompleted",
          completedAt: "2026-09-04T12:05:00.000Z",
          invariants: [],
        },
      ],
      finalPools: [],
      unusedCardInstanceIds: [],
      invariants: [],
      functionalDigest: "0000000000000000000000000000000000000000000000000000000000000000",
    };

    const proj = functionalProjection(syntheticReport);
    // functionalDigest, sessionId, timestamps must be stripped
    expect((proj as Record<string, unknown>).functionalDigest).toBeUndefined();
    expect((proj as Record<string, unknown>).sessionId).toBeUndefined();
    expect((proj as Record<string, unknown>).startedAt).toBeUndefined();
    expect((proj as Record<string, unknown>).completedAt).toBeUndefined();

    // Canonical digest calculation
    const canonical = canonicalizeJson(proj);
    const hash = createHash("sha256").update(canonical, "utf8").digest("hex");

    // If we mutate functionalDigest in syntheticReport, projection and hash do not change!
    const mutatedReport = {
      ...syntheticReport,
      functionalDigest: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    };
    const mutatedProj = functionalProjection(mutatedReport);
    expect(mutatedProj).toEqual(proj);
    expect(createHash("sha256").update(canonicalizeJson(mutatedProj), "utf8").digest("hex")).toBe(
      hash,
    );
  });

  it("rejects report generation if an invariant is violated with INVARIANT_VIOLATION", () => {
    const simInput = createSimulationInput();
    const simResult = simulateDraft(simInput);
    if (!simResult.ok) {
      throw new Error("Simulation failed");
    }

    // Create a corrupted draft state where seat 0 only has 44 cards
    const draftState = simResult.value.draft as unknown as Record<string, unknown>;
    const corruptedDraft = {
      ...draftState,
      seatPools: (draftState.seatPools as { seatId: number; cardInstanceIds: string[] }[]).map(
        (p) => (p.seatId === 0 ? { ...p, cardInstanceIds: p.cardInstanceIds.slice(0, 44) } : p),
      ),
    };

    const reportResult = buildDraftReport(corruptedDraft as unknown as Draft);
    expect(reportResult.ok).toBe(false);
    if (!reportResult.ok) {
      expect(reportResult.error.code).toBe("INVARIANT_VIOLATION");
    }
  });
});
