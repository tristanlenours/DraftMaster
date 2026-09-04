import { calculateSnapshotDigest } from "./canonical-snapshot.ts";
import {
  type CardInstance,
  type CubeSnapshot,
  type SnapshotResult,
  validateSnapshot,
} from "./validate-snapshot.ts";

export interface NormalizeSnapshotInput {
  readonly cube: unknown;
  readonly version: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string;
  readonly importerVersion: string;
  readonly rawSha256: string;
  readonly existingSnapshot?: unknown;
}

interface RawCard {
  readonly finish?: unknown;
  readonly details: Readonly<Record<string, unknown>>;
}

interface RawCube {
  readonly id: string;
  readonly shortId: string;
  readonly name: string;
  readonly version: number;
  readonly dateLastUpdated: number;
  readonly owner: { readonly username: string };
  readonly cards: { readonly mainboard: readonly RawCard[] };
}

const attribution =
  "Cube list from CubeCobra; card identifiers and metadata from Scryfall; Magic: The Gathering is © Wizards of the Coast. Unofficial fan content.";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function invalidSnapshot(message: string, details: Readonly<Record<string, unknown>> = {}) {
  return {
    ok: false,
    error: { code: "INVALID_SNAPSHOT", message, details },
  } as const;
}

function invalidVersion(message: string, details: Readonly<Record<string, unknown>> = {}) {
  return {
    ok: false,
    error: { code: "INVALID_CUBE_VERSION", message, details },
  } as const;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRawCube(value: unknown): RawCube | undefined {
  if (!isRecord(value) || !isRecord(value.owner) || !isRecord(value.cards)) {
    return undefined;
  }
  const mainboard = value.cards.mainboard;
  if (
    value.id !== "5e1c13b67c22a016c25ff019" ||
    value.shortId !== "6ht" ||
    typeof value.name !== "string" ||
    value.name.trim() === "" ||
    !Number.isInteger(value.version) ||
    (value.version as number) < 1 ||
    typeof value.dateLastUpdated !== "number" ||
    !Number.isFinite(value.dateLastUpdated) ||
    value.owner.username !== "eltitou007" ||
    !Array.isArray(mainboard)
  ) {
    return undefined;
  }

  const cards: RawCard[] = [];
  for (const entry of mainboard) {
    if (!isRecord(entry) || !isRecord(entry.details)) {
      return undefined;
    }
    cards.push({ finish: entry.finish, details: entry.details });
  }

  return {
    id: value.id,
    shortId: value.shortId,
    name: value.name,
    version: value.version as number,
    dateLastUpdated: value.dateLastUpdated,
    owner: { username: value.owner.username },
    cards: { mainboard: cards },
  };
}

function normalizeCard(
  raw: RawCard,
  sourceIndex: number,
  snapshotId: string,
): CardInstance | undefined {
  const printingId =
    typeof raw.details.scryfall_id === "string" ? raw.details.scryfall_id.trim().toLowerCase() : "";
  const oracleId =
    typeof raw.details.oracle_id === "string" ? raw.details.oracle_id.trim().toLowerCase() : "";
  const name = typeof raw.details.name === "string" ? raw.details.name.trim() : "";
  const setCode = typeof raw.details.set === "string" ? raw.details.set.trim().toLowerCase() : "";
  const rawCollectorNumber = raw.details.collector_number;
  const collectorNumber =
    typeof rawCollectorNumber === "string"
      ? rawCollectorNumber.trim()
      : typeof rawCollectorNumber === "number" && Number.isFinite(rawCollectorNumber)
        ? String(rawCollectorNumber)
        : "";

  if (
    !uuidPattern.test(printingId) ||
    !uuidPattern.test(oracleId) ||
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
    finish: typeof raw.finish === "string" && raw.finish !== "" ? raw.finish : "unspecified",
  };
}

function buildCandidate(
  cube: RawCube,
  input: Readonly<NormalizeSnapshotInput>,
): SnapshotResult<CubeSnapshot> {
  let cubeUpdatedAt: string;
  try {
    cubeUpdatedAt = new Date(cube.dateLastUpdated).toISOString();
  } catch {
    return invalidSnapshot("CubeCobra update time is invalid.");
  }

  const snapshotId = `titou_tribal@${input.version}`;
  const cards: CardInstance[] = [];
  for (const [sourceIndex, rawCard] of cube.cards.mainboard.entries()) {
    const card = normalizeCard(rawCard, sourceIndex, snapshotId);
    if (card === undefined) {
      return invalidSnapshot("A mainboard card has incomplete identity metadata.", { sourceIndex });
    }
    cards.push(card);
  }

  const candidateWithoutDigest: CubeSnapshot = {
    schemaVersion: 1,
    snapshotId,
    cubeKey: "titou_tribal",
    version: input.version,
    source: {
      provider: "CubeCobra",
      cubeId: "5e1c13b67c22a016c25ff019",
      shortId: "6ht",
      cubeName: cube.name.trim(),
      owner: "eltitou007",
      board: "mainboard",
      url: input.sourceUrl,
      cubeRevision: cube.version,
      cubeUpdatedAt,
      retrievedAt: input.retrievedAt,
      importerVersion: input.importerVersion,
      rawSha256: input.rawSha256,
      attribution,
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
  const candidate: CubeSnapshot = {
    ...candidateWithoutDigest,
    integrity: {
      ...candidateWithoutDigest.integrity,
      canonicalSha256: calculateSnapshotDigest(candidateWithoutDigest),
    },
  };
  return validateSnapshot(candidate);
}

export function normalizeSnapshot(
  input: Readonly<NormalizeSnapshotInput>,
): SnapshotResult<CubeSnapshot> {
  const cube = readRawCube(input.cube);
  if (cube === undefined) {
    return invalidSnapshot("CubeCobra response does not match the Titou source contract.");
  }

  const candidate = buildCandidate(cube, input);
  if (!candidate.ok || input.existingSnapshot === undefined) {
    return candidate;
  }

  const existing = validateSnapshot(input.existingSnapshot);
  if (!existing.ok) {
    return existing;
  }

  if (existing.value.snapshotId !== candidate.value.snapshotId) {
    return candidate;
  }

  if (existing.value.integrity.canonicalSha256 === candidate.value.integrity.canonicalSha256) {
    return existing;
  }

  return invalidVersion("Existing cube version has different functional content.", {
    snapshotId: candidate.value.snapshotId,
  });
}
