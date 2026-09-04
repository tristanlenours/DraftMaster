import { exec } from "node:child_process";
import { describe, expect, it } from "vitest";

import { CLI_EXIT_CODES } from "../../src/cli/errors.ts";
import {
  runSimulateDraftCli,
  type SimulateDraftDependencies,
} from "../../src/cli/simulate-draft.ts";
import type { DraftReport } from "../../src/draft/index.ts";

function runCliProcess(args: string[] = []): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  const cmd = `npm --silent run simulate -- ${args.join(" ")}`;
  return new Promise((resolve) => {
    exec(
      cmd,
      {
        cwd: process.cwd(),
        env: process.env,
      },
      (error, stdout, stderr) => {
        const exitCode =
          error && typeof (error as { code?: number | string }).code === "number"
            ? (error as { code: number }).code
            : error
              ? 1
              : 0;
        resolve({
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

describe("simulate-cli E2E", () => {
  it("runs simulation with default cube and generated seed via npm --silent run simulate --", async () => {
    const result = await runCliProcess();

    expect(result.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
    expect(result.stderr).toBe("");
    expect(result.stdout.endsWith("\n")).toBe(true);

    // stdout must be pure JSON with no npm banner
    expect(result.stdout).not.toContain("> draftmaster@");
    const report = JSON.parse(result.stdout) as DraftReport;

    expect(report.schemaVersion).toBe(1);
    expect(report.sessionId).toMatch(/^[0-9a-f]{12}$/);
    expect(Number.isInteger(report.seed)).toBe(true);
    expect(report.finalPools).toHaveLength(8);
    for (const pool of report.finalPools) {
      expect(pool.cardInstanceIds).toHaveLength(45);
    }
    expect(report.unusedCardInstanceIds).toHaveLength(185);
    expect(report.invariants.every((i) => i.passed)).toBe(true);
    expect(report.functionalDigest).toMatch(/^[0-9a-f]{64}$/);
  }, 15000);

  it("runs reproducible simulation with explicit cube and explicit seed", async () => {
    const args = ["--cube", "data/cubes/titou_tribal/2026-02-24.1.json", "--seed", "42"];
    const run1 = await runCliProcess(args);
    const run2 = await runCliProcess(args);

    expect(run1.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);
    expect(run2.exitCode).toBe(CLI_EXIT_CODES.SUCCESS);

    const report1 = JSON.parse(run1.stdout) as DraftReport;
    const report2 = JSON.parse(run2.stdout) as DraftReport;

    expect(report1.seed).toBe(42);
    expect(report2.seed).toBe(42);
    expect(report1.snapshotId).toBe("titou_tribal@2026-02-24.1");
    expect(report1.functionalDigest).toBe(report2.functionalDigest);
  }, 20000);

  it("propagates exit code 2 and structured error on invalid command syntax", async () => {
    const result = await runCliProcess(["--invalid-flag", "val"]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.INVALID_ARGUMENTS);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("INVALID_ARGUMENTS");

    const err = JSON.parse(result.stderr) as { code: string; message: string };
    expect(err.code).toBe("INVALID_ARGUMENTS");
  }, 15000);

  it("propagates exit code 2 and structured error on invalid seed format", async () => {
    const result = await runCliProcess(["--seed", "invalid-seed"]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.INVALID_ARGUMENTS);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("INVALID_SEED");

    const err = JSON.parse(result.stderr) as { code: string; message: string };
    expect(err.code).toBe("INVALID_SEED");
  }, 15000);

  it("propagates exit code 3 on missing snapshot file", async () => {
    const result = await runCliProcess(["--cube", "data/cubes/nonexistent.json"]);

    expect(result.exitCode).toBe(CLI_EXIT_CODES.SNAPSHOT_FAILURE);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("INVALID_SNAPSHOT");
  }, 15000);

  it("handles programmatic execution through runSimulateDraftCli", async () => {
    const { dependencies, stdoutChunks, stderrChunks } = createMockDependencies();
    const code = await runSimulateDraftCli(["--seed", "42"], dependencies);

    expect(code).toBe(CLI_EXIT_CODES.SUCCESS);
    expect(stderrChunks).toHaveLength(0);
    expect(stdoutChunks).toHaveLength(1);
    const firstChunk = stdoutChunks[0];
    expect(firstChunk?.endsWith("\n")).toBe(true);
    if (firstChunk === undefined) {
      throw new Error("Missing stdout chunk");
    }

    const report = JSON.parse(firstChunk) as DraftReport;
    expect(report.seed).toBe(42);
    expect(report.startedAt).toBe("2026-09-04T12:00:00.000Z");
  });
});
