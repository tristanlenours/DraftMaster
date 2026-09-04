import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import { buildDraftReport, replayDraft, type DraftReport } from "../../src/draft/index.ts";
import { simulateDraft } from "../../src/simulation/simulate-draft.ts";
import { loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

function loadReferenceFixture(): DraftReport {
  const filePath = resolve(
    import.meta.dirname,
    "../fixtures/reference-drafts/titou-2026-02-24.1-seed-42.json",
  );
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as DraftReport;
}

describe("Reference Draft Non-Regression (T042)", () => {
  it("matches golden reference draft digest, pools, and invariants for seed 42", () => {
    const reference = loadReferenceFixture();

    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) throw new Error(validated.error.message);
    const snapshot = validated.value;

    // Run a fresh simulation with seed 42
    const simResult = simulateDraft({
      snapshot,
      sessionId: "0c0e1a78c4d6",
      seed: 42,
      startedAt: "2026-09-04T12:00:00.000Z",
    });
    expect(simResult.ok).toBe(true);
    if (!simResult.ok) return;

    const reportRes = buildDraftReport(simResult.value.draft);
    expect(reportRes.ok).toBe(true);
    if (!reportRes.ok) return;

    const currentReport = reportRes.value;

    // 1. Functional digest non-regression
    expect(currentReport.functionalDigest).toBe(reference.functionalDigest);
    expect(currentReport.functionalDigest).toBe(
      "67a8f0521c3ec5684f8ee55cdf271a801649322621057dbae61ca95a6da845d5",
    );

    // 2. Final pools match golden reference exactly
    expect(currentReport.finalPools).toEqual(reference.finalPools);

    // 3. Unused card instance IDs match golden reference exactly
    expect(currentReport.unusedCardInstanceIds).toEqual(reference.unusedCardInstanceIds);

    // 4. Invariants match golden reference
    expect(currentReport.invariants).toEqual(reference.invariants);

    // 5. Pick count and pool sizes
    expect(currentReport.finalPools).toHaveLength(8);
    for (const pool of currentReport.finalPools) {
      expect(pool.cardInstanceIds).toHaveLength(45);
    }
    expect(currentReport.unusedCardInstanceIds).toHaveLength(185);
  });

  it("replays the golden reference event log cleanly without simulation or RNG", () => {
    const reference = loadReferenceFixture();

    const replayRes = replayDraft(reference.events);
    expect(replayRes.ok).toBe(true);
    if (!replayRes.ok) return;

    const reportRes = buildDraftReport(replayRes.value);
    expect(reportRes.ok).toBe(true);
    if (!reportRes.ok) return;

    const replayedReport = reportRes.value;
    expect(replayedReport.functionalDigest).toBe(reference.functionalDigest);
    expect(replayedReport.finalPools).toEqual(reference.finalPools);
    expect(replayedReport.unusedCardInstanceIds).toEqual(reference.unusedCardInstanceIds);
    expect(replayedReport.invariants).toEqual(reference.invariants);
  });
});
