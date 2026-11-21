// Reconciles data/cards/items/ with a cube's CubeCobra mainboard after the owner updates the list.
// - cards that left the cube lose the cube from `presentInCubes` and their `cubeAnalyses` entry;
// - catalog cards that joined the cube gain membership and a baseline cube analysis;
// - cards missing from the catalog are created from Scryfall facts, with a power score calibrated
//   on the card's CubeCobra Elo (same frozen isotonic calibration as the peer-cube importer).
// Archetype memberships, tiers and meta roles are then re-derived by `npm run data:sync` from the
// Tier 1 curation, so this script never guesses archetypes.
//
// Usage: node --experimental-strip-types scripts/reconcile-cube-membership.mjs --cube <cubeKey> [--apply]
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { buildCatalogItem, cardNameToSlug, fetchScryfallByOracleId } from "./lib/catalog-item.mjs";

const rootDir = process.cwd();
const apply = process.argv.includes("--apply");
const cubeIndex = process.argv.indexOf("--cube");
const cubeKey = cubeIndex >= 0 ? process.argv[cubeIndex + 1] : undefined;
if (!cubeKey || !/^[a-z0-9_]+$/u.test(cubeKey)) throw new Error("--cube <cubeKey> is required");

const readJson = (path) => JSON.parse(readFileSync(resolve(rootDir, path), "utf8"));
const raw = readJson(`data/cubes/${cubeKey}/cubecobra-raw.json`);
const calibration = readJson("data/power-rankings/cubecobra-calibration-v1.json");
const updatedAt = new Date(raw.dateLastUpdated).toISOString();
const updatedDay = updatedAt.slice(0, 10);

const rawByOracleId = new Map();
for (const entry of raw.cards?.mainboard ?? []) {
  const details = entry.details;
  if (!details?.oracle_id) throw new Error(`Mainboard entry without oracle id: ${entry.cardID}`);
  if (!rawByOracleId.has(details.oracle_id)) rawByOracleId.set(details.oracle_id, details);
}

const itemsDir = resolve(rootDir, "data/cards/items");
const items = readdirSync(itemsDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({ path: join(itemsDir, file), card: readJson(`data/cards/items/${file}`) }));
const itemByOracleId = new Map(items.map((item) => [item.card.oracleId, item]));
const usedSlugs = new Set(items.map((item) => item.card.slug));

function sanitizeTag(tag) {
  return String(tag)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
}

function baselineAnalysis(details) {
  const tags = (details.oracle_tags ?? []).map(sanitizeTag).filter(Boolean).slice(0, 3);
  return {
    cubeKey,
    fit: "support",
    archetypes: [],
    synergyTags: tags.length > 0 ? tags : ["vintage_power"],
    scoreModifier: 0,
    analysis: `Entrée dans le cube lors de la mise à jour CubeCobra du ${updatedDay}.`,
  };
}

const removed = [];
const joined = [];
for (const item of items) {
  const inCube = item.card.presentInCubes?.includes(cubeKey);
  if (inCube && !rawByOracleId.has(item.card.oracleId)) {
    item.card.presentInCubes = item.card.presentInCubes.filter((key) => key !== cubeKey);
    delete item.card.cubeAnalyses?.[cubeKey];
    removed.push(item);
  } else if (!inCube && rawByOracleId.has(item.card.oracleId)) {
    item.card.presentInCubes = [...(item.card.presentInCubes ?? []), cubeKey];
    item.card.cubeAnalyses = {
      ...item.card.cubeAnalyses,
      [cubeKey]: baselineAnalysis(rawByOracleId.get(item.card.oracleId)),
    };
    joined.push(item);
  } else if (inCube && !item.card.cubeAnalyses?.[cubeKey]) {
    item.card.cubeAnalyses = {
      ...item.card.cubeAnalyses,
      [cubeKey]: baselineAnalysis(rawByOracleId.get(item.card.oracleId)),
    };
    joined.push(item);
  }
}

function canonicalName(scryfall) {
  const splitLayouts = new Set(["split", "aftermath"]);
  return splitLayouts.has(scryfall.layout)
    ? scryfall.name
    : (scryfall.card_faces?.[0]?.name ?? scryfall.name);
}

const missingOracleIds = [...rawByOracleId.keys()].filter((id) => !itemByOracleId.has(id));
const scryfallByOracleId =
  missingOracleIds.length > 0 ? await fetchScryfallByOracleId(missingOracleIds) : new Map();
const created = [];
const problems = [];
for (const oracleId of missingOracleIds) {
  const details = rawByOracleId.get(oracleId);
  const scryfall = scryfallByOracleId.get(oracleId);
  if (!scryfall) {
    problems.push(`${details.name}: absent from Scryfall`);
    continue;
  }
  if (!Number.isFinite(details.elo)) {
    problems.push(`${details.name}: no CubeCobra Elo`);
    continue;
  }
  const name = canonicalName(scryfall);
  if (usedSlugs.has(cardNameToSlug(name))) {
    problems.push(`${name}: slug ${cardNameToSlug(name)} already used by another oracle id`);
    continue;
  }
  const item = buildCatalogItem(
    {
      name,
      oracleId,
      elo: details.elo,
      pickCount: details.pickCount,
      oracleTags: details.oracle_tags,
      cmc: details.cmc,
      imageNormal: details.image_normal,
      artCrop: details.art_crop,
      capturedAt: updatedAt,
      summary:
        `Carte de ${raw.name} (${String(details.firstPrintYear ?? scryfall.released_at?.slice(0, 4))}) ; ` +
        `score calibré sur l'Elo CubeCobra (${Math.round(details.elo)}, ${String(details.pickCount ?? 0)} picks).`,
    },
    scryfall,
    calibration.blocks,
  );
  item.presentInCubes = [cubeKey];
  item.cubeAnalyses = { [cubeKey]: baselineAnalysis(details) };
  usedSlugs.add(item.slug);
  created.push(item);
}

console.log(
  `🧮 ${cubeKey}: ${String(rawByOracleId.size)} distinct cards on CubeCobra (updated ${updatedAt}).`,
);
console.log(`➖ ${String(removed.length)} cards left the cube.`);
for (const { card } of removed) console.log(`   - ${card.name}`);
console.log(`➕ ${String(joined.length)} catalog cards joined the cube.`);
for (const { card } of joined) console.log(`   + ${card.name}`);
console.log(`🆕 ${String(created.length)} cards created from Scryfall.`);
for (const card of created) {
  console.log(
    `   * ${card.name} [${card.colors.join("") || "C"} ${String(card.cmc)}] score ${card.powerScore.score.toFixed(1)} (${card.powerScore.harmonizationDegree})`,
  );
}
for (const problem of problems) console.log(`⚠️ ${problem}`);

if (problems.length > 0) {
  process.exitCode = 1;
} else if (apply) {
  for (const { path, card } of [...removed, ...joined]) {
    writeFileSync(path, `${JSON.stringify(card, null, 2)}\n`, "utf8");
  }
  for (const card of created) {
    const path = join(itemsDir, `${card.slug}.json`);
    if (existsSync(path)) throw new Error(`Refusing to overwrite ${path}`);
    writeFileSync(path, `${JSON.stringify(card, null, 2)}\n`, "utf8");
  }
  console.log("✅ Card documents written.");
} else {
  console.log("ℹ️ Dry run: pass --apply to write the card documents.");
}
