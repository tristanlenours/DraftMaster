import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export interface SnapshotCardFixture {
  instanceId: string;
  sourceIndex: number;
  printingId: string;
  oracleId: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  finish?: string;
}

export interface SnapshotFixture {
  schemaVersion: number;
  snapshotId: string;
  cubeKey: string;
  version: string;
  source: {
    provider: string;
    cubeId: string;
    shortId: string;
    cubeName: string;
    owner: string;
    board: string;
    url: string;
    cubeRevision: number;
    cubeUpdatedAt: string;
    retrievedAt: string;
    importerVersion: string;
    rawSha256: string;
    attribution: string;
  };
  cards: SnapshotCardFixture[];
  integrity: {
    cardCount: number;
    uniqueInstanceCount: number;
    uniquePrintingCount: number;
    uniqueOracleCount: number;
    canonicalSha256: string;
  };
}

export interface RawCardFixture {
  finish?: string;
  details: {
    scryfall_id: string;
    oracle_id: string;
    name: string;
    set: string;
    collector_number: string;
  };
}

export interface RawCubeFixture {
  id: string;
  shortId: string;
  name: string;
  version: number;
  dateLastUpdated: number;
  owner: { username: string };
  cards: {
    mainboard: RawCardFixture[];
    basics: RawCardFixture[];
    maybeboard: RawCardFixture[];
  };
}

const initialSnapshotUrl = new URL(
  "../../data/cubes/titou_tribal/2026-02-24.1.json",
  import.meta.url,
);

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const entries = Object.entries(value as Readonly<Record<string, unknown>>).sort(
    ([left], [right]) => left.localeCompare(right),
  );
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
    .join(",")}}`;
}

function referenceDigest(snapshot: SnapshotFixture): string {
  const source = Object.fromEntries(
    Object.entries(snapshot.source).filter(([key]) => key !== "retrievedAt"),
  );
  const integrity = Object.fromEntries(
    Object.entries(snapshot.integrity).filter(([key]) => key !== "canonicalSha256"),
  );

  const projection = { ...snapshot, source, integrity };
  return createHash("sha256").update(canonicalize(projection), "utf8").digest("hex");
}

export function loadInitialSnapshotFixture(): SnapshotFixture {
  return JSON.parse(readFileSync(initialSnapshotUrl, "utf8")) as SnapshotFixture;
}

export function refreshFixtureIntegrity(snapshot: SnapshotFixture): SnapshotFixture {
  snapshot.integrity = {
    cardCount: snapshot.cards.length,
    uniqueInstanceCount: new Set(snapshot.cards.map(({ instanceId }) => instanceId)).size,
    uniquePrintingCount: new Set(snapshot.cards.map(({ printingId }) => printingId)).size,
    uniqueOracleCount: new Set(snapshot.cards.map(({ oracleId }) => oracleId)).size,
    canonicalSha256: "",
  };
  snapshot.integrity.canonicalSha256 = referenceDigest(snapshot);
  return snapshot;
}

export function buildSyntheticSnapshot(count: number, version: string): SnapshotFixture {
  const snapshot = structuredClone(loadInitialSnapshotFixture());
  snapshot.version = version;
  snapshot.snapshotId = `titou_tribal@${version}`;
  snapshot.source.cubeRevision = 65;
  snapshot.source.cubeUpdatedAt = "2026-03-01T12:00:00.000Z";
  snapshot.source.retrievedAt = "2026-03-01T12:05:00.000Z";
  snapshot.source.rawSha256 = "a".repeat(64);
  snapshot.cards = snapshot.cards.slice(0, count).map((card, sourceIndex) => ({
    ...card,
    instanceId: `${snapshot.snapshotId}/mainboard/${String(sourceIndex).padStart(3, "0")}`,
    sourceIndex,
  }));
  return refreshFixtureIntegrity(snapshot);
}

function fixtureUuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function rawCard(index: number): RawCardFixture {
  return {
    finish: index % 2 === 0 ? "Non-foil" : "Foil",
    details: {
      scryfall_id: fixtureUuid(index + 1),
      oracle_id: fixtureUuid(index + 10_001),
      name: `Mainboard Card ${String(index)}`,
      set: "TST",
      collector_number: String(index + 1),
    },
  };
}

export function buildRawCubeFixture(): RawCubeFixture {
  const mainboard = Array.from({ length: 360 }, (_, index) => rawCard(index));
  const firstCard = mainboard[0];
  const secondCard = mainboard[1];
  const thirdCard = mainboard[2];
  if (firstCard === undefined || secondCard === undefined || thirdCard === undefined) {
    throw new Error("Raw cube fixture is incomplete.");
  }

  firstCard.details.name = "Plains";
  secondCard.details.name = "Shared Oracle Card";
  thirdCard.details.name = "Shared Oracle Card";
  thirdCard.details.oracle_id = secondCard.details.oracle_id;

  return {
    id: "5e1c13b67c22a016c25ff019",
    shortId: "6ht",
    name: "Titou fixture",
    version: 65,
    dateLastUpdated: Date.parse("2026-03-01T12:00:00.000Z"),
    owner: { username: "eltitou007" },
    cards: {
      mainboard,
      basics: [{ ...rawCard(500), details: { ...rawCard(500).details, name: "Excluded Forest" } }],
      maybeboard: [
        { ...rawCard(501), details: { ...rawCard(501).details, name: "Excluded Candidate" } },
      ],
    },
  };
}

export const normalizationMetadata = {
  importerVersion: "test-importer@1.0.0",
  rawSha256: "b".repeat(64),
  retrievedAt: "2026-03-01T12:05:00.000Z",
  sourceUrl: "https://cubecobra.com/cube/api/cubeJSON/5e1c13b67c22a016c25ff019?date=1772366400000",
} as const;
