// Imports recent cards adopted by peer CubeCobra cubes into data/cards/items/ so the cube
// upgrade advisor can propose them. Card facts come from Scryfall; strength evidence comes from
// the versioned peer extract (data/benchmarks/cubecobra-peer-card-details.json) refreshed by
// scripts/fetch-cubecobra-benchmarks.mjs. Scores use the frozen Elo -> power isotonic calibration
// (data/power-rankings/cubecobra-calibration-v1.json) so existing cards never drift.
//
// Usage: node scripts/import-peer-cube-candidates.mjs [--since 2024] [--apply]
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  MIN_RELIABLE_PICK_COUNT,
  buildCandidateItem,
  scoreFromElo,
} from "./candidate-card-item.mjs";

const rootDir = process.cwd();
const apply = process.argv.includes("--apply");
const sinceIndex = process.argv.indexOf("--since");
const sinceYear = sinceIndex >= 0 ? Number(process.argv[sinceIndex + 1]) : 2024;
if (!Number.isInteger(sinceYear)) throw new Error("--since expects a year");

const readJson = (path) => JSON.parse(readFileSync(resolve(rootDir, path), "utf8"));

const peerExtract = readJson("data/benchmarks/cubecobra-peer-card-details.json");
const calibration = readJson("data/power-rankings/cubecobra-calibration-v1.json");
const benchmarkIndex = readJson("data/benchmarks/cubecobra-benchmarks.json");
const peerNames = new Map(Object.values(benchmarkIndex).map((cube) => [cube.id, cube.name]));

const itemsDir = resolve(rootDir, "data/cards/items");
const existingItems = readdirSync(itemsDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(itemsDir, file), "utf8")));
const knownOracleIds = new Set(existingItems.map((card) => card.oracleId));
const knownNames = new Set(existingItems.map((card) => card.name.toLowerCase()));
const knownSlugs = new Set(existingItems.map((card) => card.slug));

const selected = Object.values(peerExtract.cards)
  .filter(
    (card) =>
      !card.isToken &&
      (card.firstPrintYear ?? 0) >= sinceYear &&
      Number.isFinite(card.elo) &&
      !knownOracleIds.has(card.oracle_id) &&
      !knownNames.has(card.name.toLowerCase()),
  )
  .sort((a, b) => a.name.localeCompare(b.name));

console.log(
  `🔎 ${selected.length} peer-cube cards first printed since ${sinceYear} are missing from the catalog.`,
);

async function fetchScryfallByOracleId(oracleIds) {
  const byOracleId = new Map();
  for (let index = 0; index < oracleIds.length; index += 75) {
    const response = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "DraftMaster/0.1 (+https://github.com/tristanlenours/DraftMaster)",
      },
      body: JSON.stringify({
        identifiers: oracleIds.slice(index, index + 75).map((oracle_id) => ({ oracle_id })),
      }),
    });
    if (!response.ok) throw new Error(`Scryfall collection HTTP ${response.status}`);
    const json = await response.json();
    for (const card of json.data ?? []) byOracleId.set(card.oracle_id, card);
    await new Promise((done) => setTimeout(done, 120));
  }
  return byOracleId;
}

function buildItem(peer, scryfall) {
  const peerLabels = peer.peerCubes.map((id) => peerNames.get(id) ?? id);
  return buildCandidateItem(peer, scryfall, {
    score: scoreFromElo(calibration.blocks, peer.elo),
    summary:
      `Nouveauté ${peer.set_name ?? ""} (${String(peer.firstPrintYear)}) adoptée par ${peerLabels.join(" & ")} ; ` +
      `score calibré sur l'Elo CubeCobra (${Math.round(peer.elo)}, ${String(peer.pickCount ?? 0)} picks).`,
    updatedAt: peerExtract.capturedAt[peer.peerCubes[0]] ?? new Date().toISOString(),
  });
}

const scryfallByOracleId = await fetchScryfallByOracleId(selected.map((card) => card.oracle_id));
const created = [];
const skipped = [];
for (const peer of selected) {
  const scryfall = scryfallByOracleId.get(peer.oracle_id);
  if (!scryfall) {
    skipped.push(`${peer.name} (absent from Scryfall)`);
    continue;
  }
  const item = buildItem(peer, scryfall);
  if (knownSlugs.has(item.slug) || existsSync(join(itemsDir, `${item.slug}.json`))) {
    skipped.push(`${peer.name} (slug ${item.slug} already used)`);
    continue;
  }
  knownSlugs.add(item.slug);
  created.push(item);
}

const reliableCount = created.filter((c) => c.powerScore.harmonizationDegree !== "fallback").length;
console.log(
  `📦 ${created.length} items ready (${reliableCount} with ≥ ${MIN_RELIABLE_PICK_COUNT} picks), ${skipped.length} skipped.`,
);
for (const reason of skipped) console.log(`  ⏭️ ${reason}`);
for (const card of [...created]
  .sort((a, b) => b.powerScore.score - a.powerScore.score)
  .slice(0, 15)) {
  console.log(
    `  ${card.powerScore.score.toFixed(1).padStart(5)}  ${card.name} [${card.colors.join("") || "C"} ${card.cmc}]`,
  );
}

if (apply) {
  for (const item of created) {
    writeFileSync(
      join(itemsDir, `${item.slug}.json`),
      `${JSON.stringify(item, null, 2)}\n`,
      "utf8",
    );
  }
  console.log(`✅ Wrote ${created.length} new card documents to data/cards/items/.`);
} else {
  console.log("ℹ️ Dry run: pass --apply to write the card documents.");
}
