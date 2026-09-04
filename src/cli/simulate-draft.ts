import { pathToFileURL } from "node:url";

import { loadSnapshot } from "../cubes/load-snapshot.ts";
import { buildDraftReport } from "../draft/index.ts";
import { simulateDraft } from "../simulation/simulate-draft.ts";
import { CLI_EXIT_CODES, reportCliFailure, type CliExitCode } from "./errors.ts";
import { createSessionIdentityGenerator } from "./session-identity.ts";

const DEFAULT_CUBE_PATH = "data/cubes/titou_tribal/2026-02-24.1.json";

export interface SimulateDraftDependencies {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
  readonly now: () => Date;
}

function parseSimulateOptions(
  args: readonly string[],
):
  | { readonly cube: string; readonly seed?: number }
  | { readonly error: string; readonly code?: string } {
  let cube = DEFAULT_CUBE_PATH;
  let seed: number | undefined;

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    if (
      flag === undefined ||
      !flag.startsWith("--") ||
      value === undefined ||
      value.startsWith("--")
    ) {
      return { error: "Options must be key-value pairs (e.g. --cube <path> --seed <int32>)." };
    }

    if (flag === "--cube") {
      if (value.trim() === "") {
        return { error: "--cube cannot be empty." };
      }
      cube = value;
    } else if (flag === "--seed") {
      if (!/^-?\d+$/.test(value)) {
        return { error: "Seed must be a 32-bit signed integer.", code: "INVALID_SEED" };
      }
      const parsedSeed = Number(value);
      if (
        !Number.isInteger(parsedSeed) ||
        parsedSeed < -2_147_483_648 ||
        parsedSeed > 2_147_483_647
      ) {
        return { error: "Seed must be a 32-bit signed integer.", code: "INVALID_SEED" };
      }
      seed = parsedSeed;
    } else {
      return { error: `Unknown option: ${flag}` };
    }
  }

  return seed === undefined ? { cube } : { cube, seed };
}

export async function runSimulateDraftCli(
  args: readonly string[],
  dependencies: SimulateDraftDependencies,
): Promise<CliExitCode> {
  const parsed = parseSimulateOptions(args);
  if ("error" in parsed) {
    reportCliFailure(dependencies.stderr, {
      code: parsed.code ?? "INVALID_ARGUMENTS",
      message: parsed.error,
    });
    return CLI_EXIT_CODES.INVALID_ARGUMENTS;
  }

  const snapshotResult = await loadSnapshot(parsed.cube);
  if (!snapshotResult.ok) {
    reportCliFailure(dependencies.stderr, snapshotResult.error);
    return CLI_EXIT_CODES.SNAPSHOT_FAILURE;
  }

  const identityGenerator = createSessionIdentityGenerator();
  const identity = identityGenerator.create(parsed.seed);
  const sessionId = identity.sessionId;
  const seed = identity.seed;
  const startedAt = dependencies.now().toISOString();

  const simResult = simulateDraft({
    snapshot: snapshotResult.value,
    sessionId,
    seed,
    startedAt,
  });

  if (!simResult.ok) {
    reportCliFailure(dependencies.stderr, simResult.error);
    return CLI_EXIT_CODES.DRAFT_REJECTED;
  }

  const reportResult = buildDraftReport(simResult.value.draft);
  if (!reportResult.ok) {
    reportCliFailure(dependencies.stderr, reportResult.error);
    return CLI_EXIT_CODES.REPORT_OR_INVARIANT_FAILURE;
  }

  dependencies.stdout(`${JSON.stringify(reportResult.value, null, 2)}\n`);
  return CLI_EXIT_CODES.SUCCESS;
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  process.exitCode = await runSimulateDraftCli(process.argv.slice(2), {
    stdout: (message) => {
      process.stdout.write(message);
    },
    stderr: (message) => {
      console.error(message);
    },
    now: () => new Date(),
  });
}
