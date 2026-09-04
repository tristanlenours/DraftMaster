import { describe, expect, it } from "vitest";

import { validateSnapshot } from "../../src/cubes/validate-snapshot.ts";
import { buildDraftReport, type DraftReport } from "../../src/draft/index.ts";
import { simulateDraft } from "../../src/simulation/simulate-draft.ts";
import { loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

const GOLDEN_REFERENCE_DIGEST = "67a8f0521c3ec5684f8ee55cdf271a801649322621057dbae61ca95a6da845d5";
const PERFORMANCE_LIMIT_MS = 2000;

export function evaluatePerformanceThreshold(
  durationsMs: readonly number[],
  limitMs = PERFORMANCE_LIMIT_MS,
): { passed: boolean; maxDurationMs: number } {
  if (durationsMs.length === 0) {
    return { passed: false, maxDurationMs: 0 };
  }
  const maxDurationMs = Math.max(...durationsMs);
  const passed = durationsMs.every((d) => d < limitMs);
  return { passed, maxDurationMs };
}

describe("Performance Protocol SC-006", () => {
  it("verifies the threshold decision rule for 1999 ms, 2000 ms, and 2001 ms", () => {
    expect(evaluatePerformanceThreshold([100, 200, 500, 1200, 1999]).passed).toBe(true);
    expect(evaluatePerformanceThreshold([100, 200, 500, 1200, 2000]).passed).toBe(false);
    expect(evaluatePerformanceThreshold([100, 200, 500, 1200, 2001]).passed).toBe(false);
    expect(evaluatePerformanceThreshold([]).passed).toBe(false);
  });

  it("executes 3 warmups and 5 measured simulations strictly under 2000 ms each", () => {
    // 1. Preparation outside timing
    const validated = validateSnapshot(loadInitialSnapshotFixture());
    if (!validated.ok) {
      throw new Error(validated.error.message);
    }
    const snapshot = validated.value;
    const startedAt = "2026-09-04T12:00:00.000Z";

    function runSingleSimulation(runIndex: number): {
      readonly durationMs: number;
      readonly report: DraftReport;
    } {
      const sessionId = `0c0e1a${runIndex.toString(16).padStart(6, "0")}`;

      // Start timing right before draft creation
      const start = performance.now();

      const simRes = simulateDraft({
        snapshot,
        sessionId,
        seed: 42,
        startedAt,
      });
      if (!simRes.ok) {
        throw new Error(`Simulation failed: ${simRes.error.message}`);
      }

      const reportRes = buildDraftReport(simRes.value.draft);
      if (!reportRes.ok) {
        throw new Error(`Report build failed: ${reportRes.error.message}`);
      }

      // JSON serialization and UTF-8 output preparation
      const outputJson = `${JSON.stringify(reportRes.value, null, 2)}\n`;
      Buffer.from(outputJson, "utf8");

      const durationMs = performance.now() - start;

      return {
        durationMs,
        report: reportRes.value,
      };
    }

    // 2. 3 warmup runs (unrecorded)
    for (let w = 1; w <= 3; w++) {
      const warmupResult = runSingleSimulation(w);
      // Validate correctness of warmup
      expect(warmupResult.report.functionalDigest).toBe(GOLDEN_REFERENCE_DIGEST);
      expect(warmupResult.report.invariants.every((i) => i.passed)).toBe(true);
    }

    // 3. 5 measured runs
    const measuredDurations: number[] = [];
    const measuredReports: DraftReport[] = [];

    for (let m = 1; m <= 5; m++) {
      const measuredResult = runSingleSimulation(m + 10);
      measuredDurations.push(measuredResult.durationMs);
      measuredReports.push(measuredResult.report);
    }

    // 4. Assertions after measurement
    for (const report of measuredReports) {
      expect(report.finalPools).toHaveLength(8);
      for (const pool of report.finalPools) {
        expect(pool.cardInstanceIds).toHaveLength(45);
      }
      expect(report.unusedCardInstanceIds).toHaveLength(185);
      expect(report.invariants.every((i) => i.passed)).toBe(true);
      expect(report.functionalDigest).toBe(GOLDEN_REFERENCE_DIGEST);
    }

    const verdict = evaluatePerformanceThreshold(measuredDurations);
    console.log(
      `[SC-006 Benchmark Result] Durations (ms): [${measuredDurations.map((d) => d.toFixed(2)).join(", ")}], Max: ${verdict.maxDurationMs.toFixed(2)} ms, Passed: ${String(verdict.passed)}`,
    );

    expect(verdict.passed).toBe(true);
    for (const dur of measuredDurations) {
      expect(dur).toBeLessThan(PERFORMANCE_LIMIT_MS);
    }
  });
});
