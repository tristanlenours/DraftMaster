import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { calculateSnapshotDigest } from "./canonical-snapshot.ts";
import { loadSnapshot } from "./load-snapshot.ts";
import {
  validateSnapshot,
  type CardInstance,
  type CubeSnapshot,
  type SnapshotResult,
} from "./validate-snapshot.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const ATTRIBUTION =
  "Cube list from CubeCobra; card identifiers and metadata from Scryfall; Magic: The Gathering is © Wizards of the Coast. Unofficial fan content.";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function failure(
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): SnapshotResult<never> {
  return {
    ok: false,
    error: { code: "INVALID_SNAPSHOT" as const, message, details },
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRawCard(
  value: unknown,
  sourceIndex: number,
  snapshotId: string,
): CardInstance | undefined {
  if (!isRecord(value) || !isRecord(value.details)) return undefined;
  const details = value.details;
  const printingId = readString(details.scryfall_id ?? value.cardID).toLowerCase();
  const oracleId = readString(details.oracle_id).toLowerCase();
  const name = readString(details.name);
  const setCode = readString(details.set).toLowerCase();
  const collectorNumber = readString(details.collector_number);
  if (
    !UUID_PATTERN.test(printingId) ||
    !UUID_PATTERN.test(oracleId) ||
    name === "" ||
    !/^[a-z0-9]+$/u.test(setCode) ||
    collectorNumber === ""
  ) {
    return undefined;
  }
  return {
    instanceId: `${snapshotId}/mainboard/${String(sourceIndex).padStart(3, "0")}`,
    sourceIndex,
    printingId,
    oracleId,
    name,
    setCode,
    collectorNumber,
    finish: readString(value.finish) || "unspecified",
  };
}

function normalizeRawSnapshot(
  cubeKey: string,
  version: string,
  rawText: string,
): SnapshotResult<CubeSnapshot> {
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return failure("Le fichier CubeCobra brut n'est pas un JSON valide.");
  }
  if (!isRecord(raw) || !isRecord(raw.cards) || !Array.isArray(raw.cards.mainboard)) {
    return failure("Le fichier CubeCobra brut ne contient pas de mainboard.");
  }
  const snapshotId = `${cubeKey}@${version}`;
  const cards: CardInstance[] = [];
  for (const [index, value] of raw.cards.mainboard.entries()) {
    const card = normalizeRawCard(value, index, snapshotId);
    if (!card) {
      return failure("Une carte du mainboard a une identite incomplete.", { sourceIndex: index });
    }
    cards.push(card);
  }
  const owner = isRecord(raw.owner) ? readString(raw.owner.username) : readString(raw.owner);
  const shortId = readString(raw.shortId) || cubeKey;
  const updatedTimestamp =
    typeof raw.dateLastUpdated === "number" && Number.isFinite(raw.dateLastUpdated)
      ? raw.dateLastUpdated
      : Date.UTC(2026, 0, 1);
  const updatedAt = new Date(updatedTimestamp).toISOString();
  const withoutDigest: CubeSnapshot = {
    schemaVersion: 1,
    snapshotId,
    cubeKey,
    version,
    source: {
      provider: "CubeCobra",
      cubeId: readString(raw.id) || cubeKey,
      shortId,
      cubeName: readString(raw.name) || cubeKey,
      owner: owner || "unknown",
      board: "mainboard",
      url: `https://cubecobra.com/cube/list/${encodeURIComponent(shortId)}`,
      cubeRevision:
        typeof raw.version === "number" && Number.isInteger(raw.version) && raw.version > 0
          ? raw.version
          : 1,
      cubeUpdatedAt: updatedAt,
      retrievedAt: updatedAt,
      importerVersion: "runtime-cubecobra-normalizer@1",
      rawSha256: createHash("sha256").update(rawText, "utf8").digest("hex"),
      attribution: ATTRIBUTION,
    },
    cards,
    integrity: {
      cardCount: cards.length,
      uniqueInstanceCount: new Set(cards.map(({ instanceId }) => instanceId)).size,
      uniquePrintingCount: new Set(cards.map(({ printingId }) => printingId)).size,
      uniqueOracleCount: new Set(cards.map(({ oracleId }) => oracleId)).size,
      canonicalSha256: "",
    },
  };
  return validateSnapshot({
    ...withoutDigest,
    integrity: {
      ...withoutDigest.integrity,
      canonicalSha256: calculateSnapshotDigest(withoutDigest),
    },
  });
}

export async function loadActiveCubeSnapshot(
  projectRoot: string,
  cubeKey: string,
): Promise<SnapshotResult<CubeSnapshot>> {
  try {
    const cubeDirectory = resolve(projectRoot, "data", "cubes", cubeKey);
    const manifest = JSON.parse(await readFile(resolve(cubeDirectory, "cube.json"), "utf8")) as {
      readonly activeSnapshotId?: unknown;
    };
    const activeSnapshotId = readString(manifest.activeSnapshotId);
    const version = activeSnapshotId.split("@").at(-1) ?? "";
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[1-9][0-9]*$/u.test(version)) {
      return failure("Le manifeste du cube ne declare pas de Snapshot actif valide.", { cubeKey });
    }
    const snapshotPath = resolve(cubeDirectory, `${version}.json`);
    try {
      await readFile(snapshotPath, "utf8");
      return await loadSnapshot(snapshotPath);
    } catch {
      const rawText = await readFile(resolve(cubeDirectory, "cubecobra-raw.json"), "utf8");
      return normalizeRawSnapshot(cubeKey, version, rawText);
    }
  } catch (error) {
    return failure("Le Snapshot actif du cube ne peut pas etre charge.", {
      cubeKey,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
