import { exec } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { CLI_EXIT_CODES, type CliFailure } from "../../src/cli/errors.ts";
import {
  runSimulateDraftCli,
  type SimulateDraftDependencies,
} from "../../src/cli/simulate-draft.ts";
import type { DraftReport } from "../../src/draft/index.ts";
import * as draftModule from "../../src/draft/index.ts";
import * as simulationModule from "../../src/simulation/simulate-draft.ts";

function runCliProcess(args: string[] = []): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  const cmd = `npm --silent run simulate -- ${args.join(" ")}`;
  return new Promise((resolveResult) => {
    exec(
      cmd,
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          // Simulate offline environment by pointing common proxy/network vars to invalid address
          HTTP_PROXY: "http://127.0.0.1:0",
          HTTPS_PROXY: "http://127.0.0.1:0",
          ALL_PROXY: "http://127.0.0.1:0",
        },
      },
      (error, stdout, stderr) => {
        const exitCode =
          error && typeof (error as { code?: number | string }).code === "number"
            ? (error as { code: number }).code
            : error
              ? 1
              : 0;
        resolveResult({
          exitCode,
          stdout,
          stderr,
        });
      },
    );
  });
}

function createMockDependencies(): {
  readonly dependencies: SimulateDraftDependencies;
  readonly stdoutChunks: string[];
  readonly stderrChunks: string[];
} {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  return {
    dependencies: {
      stdout: (msg) => stdoutChunks.push(msg),
      stderr: (msg) => stderrChunks.push(msg),
      now: () => new Date("2026-09-04T12:00:00.000Z"),
    },
    stdoutChunks,
    stderrChunks,
  };
}

describe("CLI offline and error paths E2E", () => {
  const tempFilesToClean: string[] = [];

  afterAll(() => {
    for (const f of tempFilesToClean) {
      try {
        rmSync(f, { force: true });
      } catch {
        // ignore
      }
    }
  });

  it("runs strictly offline without external network access and outputs valid JSON report", async () => {
    const result = await runCliProcess(["--seed", "42"]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
    expect(result.stderr).toBe("");

    const parsed = JSON.parse(result.stdout) as DraftReport;
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.seed).toBe(42);
    expect(parsed.snapshotId).toBe("titou_tribal@2026-02-24.1");
    expect(parsed.finalPools).toHaveLength(8);
  }, 15000);

  it("returns exit code 3 with structured error when snapshot file is missing", async () => {
    const result = await runCliProcess([
      "--cube",
      "data/cubes/titou_tribal/non-existent-cube.json",
    ]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.SNAPSHOT_FAILURE);
    expect(result.stdout).toBe("");
    expect(result.stderr.length).toBeGreaterThan(0);

    const errorJson = JSON.parse(result.stderr.trim()) as CliFailure;
    expect(errorJson.code).toBe("INVALID_SNAPSHOT");
    expect(errorJson.message).toBe("Snapshot file could not be read.");

    // Ensure no leaks of environment variables or call stacks
    expect(result.stderr).not.toContain("PATH=");
    expect(result.stderr).not.toContain("USER=");
    expect(result.stderr).not.toContain("node:internal");
  }, 15000);

  it("returns exit code 3 with structured error when snapshot file contains invalid JSON syntax", async () => {
    const tempFile = resolve(process.cwd(), "tmp-invalid-syntax.json");
    writeFileSync(tempFile, "{ broken json syntax !!!", "utf8");
    tempFilesToClean.push(tempFile);

    const result = await runCliProcess(["--cube", "tmp-invalid-syntax.json"]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.SNAPSHOT_FAILURE);
    expect(result.stdout).toBe("");

    const errorJson = JSON.parse(result.stderr.trim()) as CliFailure;
    expect(errorJson.code).toBe("INVALID_SNAPSHOT");
    expect(errorJson.message).toBe("Snapshot file is not valid JSON.");
  }, 15000);

  it("returns exit code 3 when snapshot schema validation fails (< 360 cards)", async () => {
    const tempFile = resolve(process.cwd(), "tmp-too-small.json");
    const smallSnapshot = {
      schemaVersion: 1,
      snapshotId: "titou_tribal@2026-02-24.99",
      cubeKey: "titou_tribal",
      version: "2026-02-24.99",
      source: {
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
        rawSha256: "a".repeat(64),
        attribution: "Titou",
      },
      cards: [],
      integrity: {
        cardCount: 0,
        uniqueInstanceCount: 0,
        uniquePrintingCount: 0,
        uniqueOracleCount: 0,
        canonicalSha256: "b".repeat(64),
      },
    };
    writeFileSync(tempFile, JSON.stringify(smallSnapshot), "utf8");
    tempFilesToClean.push(tempFile);

    const result = await runCliProcess(["--cube", "tmp-too-small.json"]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.SNAPSHOT_FAILURE);
    expect(result.stdout).toBe("");

    const errorJson = JSON.parse(result.stderr.trim()) as CliFailure;
    expect(errorJson.code).toBe("INSUFFICIENT_CARDS");
  }, 15000);

  it("handles policy failure with exit code 4 and structured error", async () => {
    const { dependencies, stdoutChunks, stderrChunks } = createMockDependencies();

    const spy = vi.spyOn(simulationModule, "simulateDraft").mockReturnValue({
      ok: false,
      error: {
        code: "POLICY_FAILED",
        message: "Bot policy failed during round 10.",
        details: { seatId: 2, round: 10 },
      },
    });

    try {
      const exitCode = await runSimulateDraftCli([], dependencies);
      expect(exitCode).toBe(CLI_EXIT_CODES.DRAFT_REJECTED);
      expect(stdoutChunks).toHaveLength(0);
      expect(stderrChunks).toHaveLength(1);

      const parsedErr = JSON.parse(stderrChunks[0] ?? "") as CliFailure;
      expect(parsedErr.code).toBe("POLICY_FAILED");
      expect(parsedErr.message).toBe("Bot policy failed during round 10.");
      expect(parsedErr.details).toEqual({ seatId: 2, round: 10 });
    } finally {
      spy.mockRestore();
    }
  });

  it("handles invariant or report failure with exit code 5 and structured error", async () => {
    const { dependencies, stdoutChunks, stderrChunks } = createMockDependencies();

    const spy = vi.spyOn(draftModule, "buildDraftReport").mockReturnValue({
      ok: false,
      error: {
        code: "INVARIANT_VIOLATION",
        message: "One or more draft invariants failed.",
        details: {
          invariants: [
            {
              code: "CARD_CONSERVATION",
              passed: false,
              expected: 545,
              actual: 544,
            },
          ],
        },
      },
    });

    try {
      const exitCode = await runSimulateDraftCli([], dependencies);
      expect(exitCode).toBe(CLI_EXIT_CODES.REPORT_OR_INVARIANT_FAILURE);
      expect(stdoutChunks).toHaveLength(0);
      expect(stderrChunks).toHaveLength(1);

      const parsedErr = JSON.parse(stderrChunks[0] ?? "") as CliFailure;
      expect(parsedErr.code).toBe("INVARIANT_VIOLATION");
      expect(parsedErr.message).toBe("One or more draft invariants failed.");
    } finally {
      spy.mockRestore();
    }
  });
});
