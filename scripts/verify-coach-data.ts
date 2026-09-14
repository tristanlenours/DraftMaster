import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { loadCoachContext } from "../src/cubes/coach-context.ts";
import { CubeMetaRegistry } from "../src/cubes/cube-meta.ts";

interface CardDocument {
  readonly oracleId: string;
  readonly name: string;
  readonly slug: string;
  readonly presentInCubes?: readonly string[];
  readonly powerScore: { readonly score: number };
}

interface MasterDocument {
  readonly cardCount: number;
  readonly cards: Readonly<Record<string, CardDocument>>;
}

interface RankingDocument {
  readonly rankingId: string;
  readonly ranking: readonly {
    readonly oracleId: string;
    readonly name: string;
    readonly score: number;
  }[];
}

interface RawCubeDocument {
  readonly cards?: { readonly mainboard?: readonly unknown[] };
}

interface CubeDocument {
  readonly cubeKey: string;
  readonly cardCount: number;
  readonly coachReadiness?: { readonly status?: string; readonly reason?: string };
  readonly cardIndex?: readonly { readonly oracleId: string }[];
}

export interface CoachDataVerificationReport {
  readonly catalog: { readonly itemCount: number; readonly masterCount: number };
  readonly ranking: { readonly rankingId: string; readonly cardCount: number };
  readonly cubes: readonly {
    readonly cubeKey: string;
    readonly status: "ready" | "partial" | "blocked";
    readonly rawCardCount: number;
    readonly indexedCardCount: number;
    readonly contextVersion?: string | undefined;
    readonly archetypeModelVersion?: string | undefined;
  }[];
  readonly errors: readonly string[];
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function sameMembers(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

export async function verifyCoachData(projectRoot: string): Promise<CoachDataVerificationReport> {
  const errors: string[] = [];
  const itemsDirectory = resolve(projectRoot, "data", "cards", "items");
  const itemFiles = (await readdir(itemsDirectory)).filter((file) => file.endsWith(".json")).sort();
  const items = await Promise.all(
    itemFiles.map((file) => readJson<CardDocument>(resolve(itemsDirectory, file))),
  );
  const master = await readJson<MasterDocument>(
    resolve(projectRoot, "data", "cards", "master-cards.json"),
  );
  const itemsByOracleId = new Map<string, CardDocument>();

  for (const [index, item] of items.entries()) {
    const prior = itemsByOracleId.get(item.oracleId);
    if (prior) {
      errors.push(`duplicate Oracle ID ${item.oracleId}: ${prior.slug}, ${itemFiles[index]}`);
      continue;
    }
    itemsByOracleId.set(item.oracleId, item);
    if (JSON.stringify(master.cards[item.oracleId]) !== JSON.stringify(item)) {
      errors.push(`master catalog drift for ${item.name} (${item.oracleId})`);
    }
  }
  if (master.cardCount !== items.length || Object.keys(master.cards).length !== items.length) {
    errors.push(
      `catalog count drift: items=${String(items.length)}, declared=${String(master.cardCount)}, bundled=${String(Object.keys(master.cards).length)}`,
    );
  }

  const ranking = await readJson<RankingDocument>(
    resolve(projectRoot, "data", "power-rankings", "power-ranking-v1.json"),
  );
  const rankedIds = new Set<string>();
  for (const entry of ranking.ranking) {
    if (rankedIds.has(entry.oracleId)) errors.push(`duplicate ranking ID ${entry.oracleId}`);
    rankedIds.add(entry.oracleId);
    const card = itemsByOracleId.get(entry.oracleId);
    if (!card) errors.push(`ranking references unknown card ${entry.name} (${entry.oracleId})`);
    else if (card.powerScore.score !== entry.score) {
      errors.push(
        `power drift for ${entry.name}: item=${String(card.powerScore.score)}, ranking=${String(entry.score)}`,
      );
    }
  }
  if (ranking.ranking.length !== items.length) {
    errors.push(
      `ranking count drift: ranking=${String(ranking.ranking.length)}, items=${String(items.length)}`,
    );
  }

  const cubesDirectory = resolve(projectRoot, "data", "cubes");
  const cubeKeys = (await readdir(cubesDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const cubes: CoachDataVerificationReport["cubes"][number][] = [];

  for (const cubeKey of cubeKeys) {
    const cubeDirectory = resolve(cubesDirectory, cubeKey);
    const [metaResult, raw, cube] = await Promise.all([
      CubeMetaRegistry.fromFile(resolve(cubeDirectory, "cube-meta.json")),
      readJson<RawCubeDocument>(resolve(cubeDirectory, "cubecobra-raw.json")),
      readJson<CubeDocument>(resolve(cubeDirectory, "cube.json")),
    ]);
    if (!metaResult.ok) {
      errors.push(`${cubeKey}: invalid cube meta: ${metaResult.error.message}`);
      continue;
    }
    const meta = metaResult.value.meta;
    const rawCardCount = raw.cards?.mainboard?.length ?? 0;
    const indexedIds = new Set((cube.cardIndex ?? []).map(({ oracleId }) => oracleId));
    const expectedIndexedIds = new Set(
      items
        .filter((item) => item.presentInCubes?.includes(cubeKey))
        .map(({ oracleId }) => oracleId),
    );
    if (meta.cardCount !== rawCardCount) {
      errors.push(
        `${cubeKey}: raw/meta count drift ${String(rawCardCount)}/${String(meta.cardCount)}`,
      );
    }
    if (
      cube.cubeKey !== meta.cubeKey ||
      cube.cardCount !== meta.cardCount ||
      cube.coachReadiness?.status !== meta.coachReadiness.status ||
      cube.coachReadiness.reason !== meta.coachReadiness.reason
    ) {
      errors.push(`${cubeKey}: cube.json is not synchronized with cube-meta.json`);
    }
    if (!sameMembers(indexedIds, expectedIndexedIds)) {
      errors.push(`${cubeKey}: cube cardIndex differs from card membership declarations`);
    }

    const contextResult = await loadCoachContext(projectRoot, cubeKey);
    if (meta.coachReadiness.status === "blocked") {
      if (contextResult.ok || contextResult.error.code !== "CONTEXT_NOT_READY") {
        errors.push(`${cubeKey}: blocked cube did not fail closed`);
      }
      cubes.push({
        cubeKey,
        status: "blocked",
        rawCardCount,
        indexedCardCount: indexedIds.size,
      });
      continue;
    }
    if (!contextResult.ok) {
      errors.push(`${cubeKey}: ${contextResult.error.code}: ${contextResult.error.message}`);
      cubes.push({
        cubeKey,
        status: meta.coachReadiness.status,
        rawCardCount,
        indexedCardCount: indexedIds.size,
      });
      continue;
    }
    if (meta.coachReadiness.status === "ready" && !contextResult.value.synergyProfile) {
      errors.push(`${cubeKey}: ready cube has no archetype profile`);
    }
    cubes.push({
      cubeKey,
      status: meta.coachReadiness.status,
      rawCardCount,
      indexedCardCount: indexedIds.size,
      contextVersion: contextResult.value.contextVersion,
      archetypeModelVersion: contextResult.value.provenance.archetypeModelVersion,
    });
  }

  return {
    catalog: { itemCount: items.length, masterCount: master.cardCount },
    ranking: { rankingId: ranking.rankingId, cardCount: ranking.ranking.length },
    cubes,
    errors,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await verifyCoachData(process.cwd());
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.errors.length > 0) process.exitCode = 1;
}
