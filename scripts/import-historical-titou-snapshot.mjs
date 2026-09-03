import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourceUrl =
  "https://cubecobra.com/cube/api/cubeJSON/5e1c13b67c22a016c25ff019?date=1771955128860";
const expectedRawSha256 =
  "7810d999d8c349a7fba56ea61dc0e479950d952bd3134337ffb07b983b616ee6";
const target = resolve("data/cubes/titou_tribal/2026-02-24.1.json");
const snapshotId = "titou_tribal@2026-02-24.1";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
    .join(",")}}`;
}

function canonicalProjection(snapshot) {
  const { retrievedAt: _retrievedAt, ...source } = snapshot.source;
  const { canonicalSha256: _canonicalSha256, ...integrity } =
    snapshot.integrity;
  return { ...snapshot, source, integrity };
}

const response = await fetch(sourceUrl, {
  headers: {
    "user-agent": "DraftMaster/0.1 (+https://github.com/tristanlenours/DraftMaster)",
  },
});
if (!response.ok) {
  throw new Error(`CubeCobra returned HTTP ${response.status}.`);
}

const raw = Buffer.from(await response.arrayBuffer());
const rawSha256 = sha256(raw);
if (rawSha256 !== expectedRawSha256) {
  throw new Error(
    `Historical response changed: expected ${expectedRawSha256}, received ${rawSha256}.`,
  );
}

const cube = JSON.parse(raw.toString("utf8"));
if (
  cube.id !== "5e1c13b67c22a016c25ff019" ||
  cube.shortId !== "6ht" ||
  cube.version !== 64 ||
  cube.dateLastUpdated !== 1771955128860 ||
  cube.owner?.username !== "eltitou007" ||
  cube.cards?.mainboard?.length !== 545 ||
  cube.cards?.maybeboard?.length !== 0 ||
  cube.cards?.basics?.length !== 5
) {
  throw new Error("Historical cube metadata or board counts do not match the contract.");
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const cards = cube.cards.mainboard.map((entry, sourceIndex) => {
  const printingId = entry.details?.scryfall_id?.toLowerCase();
  const oracleId = entry.details?.oracle_id?.toLowerCase();
  const name = entry.details?.name?.trim();
  const setCode = entry.details?.set?.toLowerCase();
  const collectorNumber = String(entry.details?.collector_number ?? "").trim();
  if (
    !uuid.test(printingId ?? "") ||
    !uuid.test(oracleId ?? "") ||
    !name ||
    !/^[a-z0-9]+$/.test(setCode ?? "") ||
    !collectorNumber
  ) {
    throw new Error(`Incomplete card identity at mainboard index ${sourceIndex}.`);
  }
  return {
    instanceId: `${snapshotId}/mainboard/${String(sourceIndex).padStart(3, "0")}`,
    sourceIndex,
    printingId,
    oracleId,
    name,
    setCode,
    collectorNumber,
    finish: String(entry.finish || "unspecified"),
  };
});

const uniquePrintingCount = new Set(cards.map((card) => card.printingId)).size;
const uniqueOracleCount = new Set(cards.map((card) => card.oracleId)).size;
if (uniquePrintingCount !== 543 || uniqueOracleCount !== 542) {
  throw new Error(
    `Unexpected identities: ${uniquePrintingCount} printings, ${uniqueOracleCount} Oracle IDs.`,
  );
}

const snapshot = {
  schemaVersion: 1,
  snapshotId,
  cubeKey: "titou_tribal",
  version: "2026-02-24.1",
  source: {
    provider: "CubeCobra",
    cubeId: cube.id,
    shortId: cube.shortId,
    cubeName: cube.name.trim(),
    owner: cube.owner.username,
    board: "mainboard",
    url: sourceUrl,
    cubeRevision: cube.version,
    cubeUpdatedAt: new Date(cube.dateLastUpdated).toISOString(),
    retrievedAt: new Date().toISOString(),
    importerVersion: "bootstrap-titou-snapshot@1.0.0",
    rawSha256,
    attribution:
      "Cube list from CubeCobra; card identifiers and metadata from Scryfall; Magic: The Gathering is © Wizards of the Coast. Unofficial fan content.",
  },
  cards,
  integrity: {
    cardCount: cards.length,
    uniqueInstanceCount: new Set(cards.map((card) => card.instanceId)).size,
    uniquePrintingCount,
    uniqueOracleCount,
    canonicalSha256: "",
  },
};

snapshot.integrity.canonicalSha256 = sha256(
  Buffer.from(canonicalize(canonicalProjection(snapshot)), "utf8"),
);

await mkdir(dirname(target), { recursive: true });
await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify({
    target,
    rawSha256,
    canonicalSha256: snapshot.integrity.canonicalSha256,
    cardCount: cards.length,
    uniquePrintingCount,
    uniqueOracleCount,
  }),
);
