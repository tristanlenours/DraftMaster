import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

import { loadSnapshot } from "../cubes/load-snapshot.ts";
import { normalizeSnapshot } from "../cubes/normalize-snapshot.ts";

const TITOU_CUBE_ID = "5e1c13b67c22a016c25ff019";
const USER_AGENT = "DraftMaster/0.1 (+https://github.com/tristanlenours/DraftMaster)";
const IMPORTER_VERSION = "bootstrap-titou-snapshot@1.0.0";

export interface CubeFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type CubeFetch = (
  url: string,
  init: { readonly headers: Readonly<Record<string, string>> },
) => Promise<CubeFetchResponse>;

export interface ImportCubeDependencies {
  readonly fetch: CubeFetch;
  readonly now: () => Date;
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

interface FetchArchive {
  readonly schemaVersion: 1;
  readonly source: {
    readonly url: string;
    readonly retrievedAt: string;
    readonly rawSha256: string;
  };
  readonly rawJson: string;
}

interface CliFailure {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseOptions(args: readonly string[]): Readonly<Record<string, string>> | undefined {
  const options: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (
      key === undefined ||
      value === undefined ||
      !key.startsWith("--") ||
      value.startsWith("--")
    ) {
      return undefined;
    }
    const name = key.slice(2);
    if (name === "" || options[name] !== undefined) {
      return undefined;
    }
    options[name] = value;
  }
  return options;
}

function hasExactly(options: Readonly<Record<string, string>>, names: readonly string[]): boolean {
  const actual = Object.keys(options).sort();
  return actual.length === names.length && names.every((name) => actual.includes(name));
}

function reportFailure(dependencies: ImportCubeDependencies, failure: CliFailure): void {
  dependencies.stderr(
    JSON.stringify({
      code: failure.code,
      message: failure.message,
      details: failure.details ?? {},
    }),
  );
}

function invalidArguments(dependencies: ImportCubeDependencies, message: string): 2 {
  reportFailure(dependencies, { code: "INVALID_ARGUMENTS", message });
  return 2;
}

function readArchive(value: unknown): FetchArchive | undefined {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.source)) {
    return undefined;
  }
  const { source } = value;
  if (
    typeof source.url !== "string" ||
    typeof source.retrievedAt !== "string" ||
    typeof source.rawSha256 !== "string" ||
    typeof value.rawJson !== "string" ||
    !/^[a-f0-9]{64}$/u.test(source.rawSha256) ||
    sha256(value.rawJson) !== source.rawSha256
  ) {
    return undefined;
  }
  try {
    new URL(source.url);
    if (Number.isNaN(Date.parse(source.retrievedAt))) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return {
    schemaVersion: 1,
    source: {
      url: source.url,
      retrievedAt: source.retrievedAt,
      rawSha256: source.rawSha256,
    },
    rawJson: value.rawJson,
  };
}

async function runFetch(
  options: Readonly<Record<string, string>>,
  dependencies: ImportCubeDependencies,
): Promise<number> {
  if (!hasExactly(options, ["cube-id", "date", "out"])) {
    return invalidArguments(dependencies, "fetch requires --cube-id, --date and --out.");
  }
  const cubeId = options["cube-id"];
  const date = options.date;
  const output = options.out;
  if (
    cubeId !== TITOU_CUBE_ID ||
    date === undefined ||
    !/^[1-9][0-9]*$/u.test(date) ||
    output === undefined ||
    output === ""
  ) {
    return invalidArguments(
      dependencies,
      "fetch options do not satisfy the Titou source contract.",
    );
  }

  const url = `https://cubecobra.com/cube/api/cubeJSON/${cubeId}?date=${date}`;
  try {
    const response = await dependencies.fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (!response.ok) {
      reportFailure(dependencies, {
        code: "FETCH_FAILED",
        message: "CubeCobra request failed.",
        details: { status: response.status },
      });
      return 1;
    }
    const rawJson = Buffer.from(await response.arrayBuffer()).toString("utf8");
    JSON.parse(rawJson);
    const archive: FetchArchive = {
      schemaVersion: 1,
      source: {
        url,
        retrievedAt: dependencies.now().toISOString(),
        rawSha256: sha256(rawJson),
      },
      rawJson,
    };
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(archive, null, 2)}\n`, "utf8");
    dependencies.stdout(
      JSON.stringify({
        url,
        retrievedAt: archive.source.retrievedAt,
        rawSha256: archive.source.rawSha256,
      }),
    );
    return 0;
  } catch (error: unknown) {
    reportFailure(dependencies, {
      code: "FETCH_FAILED",
      message: "CubeCobra response could not be collected.",
      details: { reason: error instanceof Error ? error.message : "Unknown adapter error" },
    });
    return 1;
  }
}

async function runNormalize(
  options: Readonly<Record<string, string>>,
  dependencies: ImportCubeDependencies,
): Promise<number> {
  if (!hasExactly(options, ["input", "version", "out"])) {
    return invalidArguments(dependencies, "normalize requires --input, --version and --out.");
  }
  const input = options.input;
  const version = options.version;
  const output = options.out;
  if (input === undefined || version === undefined || output === undefined) {
    return invalidArguments(dependencies, "normalize options must not be empty.");
  }

  try {
    const archive = readArchive(JSON.parse(await readFile(input, "utf8")));
    if (archive === undefined) {
      reportFailure(dependencies, {
        code: "INVALID_SNAPSHOT",
        message: "Fetched cube archive is invalid or its raw digest does not match.",
      });
      return 3;
    }
    let existingSnapshot: unknown;
    try {
      existingSnapshot = JSON.parse(await readFile(output, "utf8"));
    } catch (error: unknown) {
      if (!isRecord(error) || error.code !== "ENOENT") {
        throw error;
      }
    }
    const result = normalizeSnapshot({
      cube: JSON.parse(archive.rawJson),
      version,
      sourceUrl: archive.source.url,
      retrievedAt: archive.source.retrievedAt,
      importerVersion: IMPORTER_VERSION,
      rawSha256: archive.source.rawSha256,
      ...(existingSnapshot === undefined ? {} : { existingSnapshot }),
    });
    if (!result.ok) {
      reportFailure(dependencies, result.error);
      return 3;
    }
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(result.value, null, 2)}\n`, "utf8");
    dependencies.stdout(
      JSON.stringify({
        snapshotId: result.value.snapshotId,
        canonicalSha256: result.value.integrity.canonicalSha256,
      }),
    );
    return 0;
  } catch (error: unknown) {
    reportFailure(dependencies, {
      code: "INVALID_SNAPSHOT",
      message: "Fetched cube archive could not be normalized.",
      details: { reason: error instanceof Error ? error.message : "Unknown file or JSON error" },
    });
    return 3;
  }
}

async function runValidate(
  options: Readonly<Record<string, string>>,
  dependencies: ImportCubeDependencies,
): Promise<number> {
  if (!hasExactly(options, ["file"]) || options.file === undefined) {
    return invalidArguments(dependencies, "validate requires --file.");
  }
  const result = await loadSnapshot(options.file);
  if (!result.ok) {
    reportFailure(dependencies, result.error);
    return 3;
  }
  dependencies.stdout(
    [
      `snapshot: ${result.value.snapshotId}`,
      `instances: ${String(result.value.integrity.cardCount)}`,
      `unique printings: ${String(result.value.integrity.uniquePrintingCount)}`,
      `unique oracle cards: ${String(result.value.integrity.uniqueOracleCount)}`,
      "valid: true",
    ].join("\n"),
  );
  return 0;
}

export async function runImportCubeCli(
  args: readonly string[],
  dependencies: ImportCubeDependencies,
): Promise<number> {
  const [command, ...optionArgs] = args;
  const options = parseOptions(optionArgs);
  if (options === undefined) {
    return invalidArguments(dependencies, "Options must be unique --name value pairs.");
  }
  if (command === "fetch") {
    return runFetch(options, dependencies);
  }
  if (command === "normalize") {
    return runNormalize(options, dependencies);
  }
  if (command === "validate") {
    return runValidate(options, dependencies);
  }
  return invalidArguments(dependencies, "Expected fetch, normalize or validate command.");
}

const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  process.exitCode = await runImportCubeCli(process.argv.slice(2), {
    fetch: globalThis.fetch,
    now: () => new Date(),
    stdout: (message) => {
      console.log(message);
    },
    stderr: (message) => {
      console.error(message);
    },
  });
}
