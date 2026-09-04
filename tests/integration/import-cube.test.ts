import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  type CubeFetch,
  type ImportCubeDependencies,
  runImportCubeCli,
} from "../../src/cli/import-cube.ts";
import { loadSnapshot } from "../../src/cubes/load-snapshot.ts";
import { normalizeSnapshot } from "../../src/cubes/normalize-snapshot.ts";
import { buildRawCubeFixture, loadInitialSnapshotFixture } from "../fixtures/cube-fixtures.ts";

const temporaryDirectories: string[] = [];
const retrievedAt = "2026-03-01T12:05:00.000Z";
const sourceDate = "1772366400000";
const sourceUrl =
  "https://cubecobra.com/cube/api/cubeJSON/5e1c13b67c22a016c25ff019?date=1772366400000";

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "draftmaster-import-"));
  temporaryDirectories.push(directory);
  return directory;
}

function dependencies(fetchImpl: CubeFetch): {
  dependencies: ImportCubeDependencies;
  stdout: string[];
  stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    dependencies: {
      fetch: fetchImpl,
      now: () => new Date(retrievedAt),
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message),
    },
    stdout,
    stderr,
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => rm(directory, { recursive: true })),
  );
});

describe("cube import CLI", () => {
  it("fetches exactly once with an identifying user agent and preserves provenance", async () => {
    const directory = await temporaryDirectory();
    const output = join(directory, "titou.raw.json");
    const rawJson = JSON.stringify(buildRawCubeFixture());
    const requests: { url: string; userAgent: string | undefined }[] = [];
    const fetch: CubeFetch = (url, init) => {
      requests.push({ url, userAgent: init.headers["user-agent"] });
      return Promise.resolve(new Response(rawJson, { status: 200 }));
    };
    const io = dependencies(fetch);

    const exitCode = await runImportCubeCli(
      ["fetch", "--cube-id", "5e1c13b67c22a016c25ff019", "--date", sourceDate, "--out", output],
      io.dependencies,
    );

    expect(exitCode).toBe(0);
    expect(requests).toEqual([
      {
        url: sourceUrl,
        userAgent: "DraftMaster/0.1 (+https://github.com/tristanlenours/DraftMaster)",
      },
    ]);
    const archive = JSON.parse(await readFile(output, "utf8")) as {
      source: { url: string; retrievedAt: string; rawSha256: string };
      rawJson: string;
    };
    expect(archive).toEqual({
      schemaVersion: 1,
      source: {
        url: sourceUrl,
        retrievedAt,
        rawSha256: createHash("sha256").update(rawJson).digest("hex"),
      },
      rawJson,
    });
    expect(io.stderr).toEqual([]);
  });

  it("normalizes a fetched archive without accessing the network", async () => {
    const directory = await temporaryDirectory();
    const input = join(directory, "titou.raw.json");
    const output = join(directory, "snapshot.json");
    const rawJson = JSON.stringify(buildRawCubeFixture());
    await writeFile(
      input,
      JSON.stringify({
        schemaVersion: 1,
        source: {
          url: sourceUrl,
          retrievedAt,
          rawSha256: createHash("sha256").update(rawJson).digest("hex"),
        },
        rawJson,
      }),
    );
    let networkCalls = 0;
    const io = dependencies(() => {
      networkCalls += 1;
      return Promise.reject(new Error("network must not be used"));
    });

    const exitCode = await runImportCubeCli(
      ["normalize", "--input", input, "--version", "2026-03-01.1", "--out", output],
      io.dependencies,
    );
    const loaded = await loadSnapshot(output);

    expect(exitCode).toBe(0);
    expect(networkCalls).toBe(0);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.source.url).toBe(sourceUrl);
      expect(loaded.value.source.retrievedAt).toBe(retrievedAt);
      expect(loaded.value.source.rawSha256).toBe(
        createHash("sha256").update(rawJson).digest("hex"),
      );
      expect(loaded.value.cards).toHaveLength(360);
      expect(loaded.value.cards.some(({ name }) => name === "Excluded Forest")).toBe(false);
      expect(loaded.value.cards.some(({ name }) => name === "Excluded Candidate")).toBe(false);
    }
  });

  it("reproduces the bootstrap snapshot from its recorded functional source data", () => {
    const expected = loadInitialSnapshotFixture();
    const rawCube = {
      id: expected.source.cubeId,
      shortId: expected.source.shortId,
      name: expected.source.cubeName,
      version: expected.source.cubeRevision,
      dateLastUpdated: Date.parse(expected.source.cubeUpdatedAt),
      owner: { username: expected.source.owner },
      cards: {
        mainboard: expected.cards.map((card) => ({
          finish: card.finish,
          details: {
            scryfall_id: card.printingId,
            oracle_id: card.oracleId,
            name: card.name,
            set: card.setCode,
            collector_number: card.collectorNumber,
          },
        })),
      },
    };

    const result = normalizeSnapshot({
      cube: rawCube,
      version: expected.version,
      sourceUrl: expected.source.url,
      retrievedAt: expected.source.retrievedAt,
      importerVersion: expected.source.importerVersion,
      rawSha256: expected.source.rawSha256,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(expected);
      expect(result.value.integrity.canonicalSha256).toBe(
        "289f6c4a27b39bc4f6f1816827ab2cca1198bbb88e495063dedcb176c18aba39",
      );
    }
  });

  it("validates a local snapshot and reports its identity without accessing the network", async () => {
    const directory = await temporaryDirectory();
    const input = join(directory, "snapshot.json");
    const snapshot = loadInitialSnapshotFixture();
    await writeFile(input, JSON.stringify(snapshot));
    let networkCalls = 0;
    const io = dependencies(() => {
      networkCalls += 1;
      return Promise.reject(new Error("network must not be used"));
    });

    const exitCode = await runImportCubeCli(["validate", "--file", input], io.dependencies);

    expect(exitCode).toBe(0);
    expect(networkCalls).toBe(0);
    expect(io.stdout.join("\n")).toContain("snapshot: titou_tribal@2026-02-24.1");
    expect(io.stdout.join("\n")).toContain("instances: 545");
    expect(io.stdout.join("\n")).toContain("valid: true");
  });

  it("returns the documented input-error code without making a request", async () => {
    let networkCalls = 0;
    const io = dependencies(() => {
      networkCalls += 1;
      return Promise.reject(new Error("network must not be used"));
    });

    const exitCode = await runImportCubeCli(
      ["fetch", "--cube-id", "5e1c13b67c22a016c25ff019"],
      io.dependencies,
    );

    expect(exitCode).toBe(2);
    expect(networkCalls).toBe(0);
    expect(io.stdout).toEqual([]);
    expect(io.stderr.join("\n")).toContain("INVALID_ARGUMENTS");
  });

  it("returns the documented validation-error code for invalid local JSON", async () => {
    const directory = await temporaryDirectory();
    const input = join(directory, "invalid.json");
    await writeFile(input, "not-json");
    const io = dependencies(() => Promise.reject(new Error("network must not be used")));

    const exitCode = await runImportCubeCli(["validate", "--file", input], io.dependencies);

    expect(exitCode).toBe(3);
    expect(io.stderr.join("\n")).toContain("INVALID_SNAPSHOT");
  });
});
