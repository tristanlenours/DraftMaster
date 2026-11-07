// Imports recent cards adopted by peer CubeCobra cubes into data/cards/items/ so the cube
// upgrade advisor can propose them. Card facts come from Scryfall; strength evidence comes from
// the versioned peer extract (data/benchmarks/cubecobra-peer-card-details.json) refreshed by
// scripts/fetch-cubecobra-benchmarks.mjs. Scores use the frozen Elo -> power isotonic calibration
// (data/power-rankings/cubecobra-calibration-v1.json) so existing cards never drift.
//
// Usage: node scripts/import-peer-cube-candidates.mjs [--since 2024] [--apply]
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { predictIsotonicScore, roundPowerScore } from "../src/cards/power-calibration.ts";

const rootDir = process.cwd();
const apply = process.argv.includes("--apply");
const sinceIndex = process.argv.indexOf("--since");
const sinceYear = sinceIndex >= 0 ? Number(process.argv[sinceIndex + 1]) : 2024;
if (!Number.isInteger(sinceYear)) throw new Error("--since expects a year");

/** Below this many CubeCobra picks the Elo is still close to its 1200 start: low confidence. */
const MIN_RELIABLE_PICK_COUNT = 1_000;
const VALID_COLORS = new Set(["W", "U", "B", "R", "G"]);

const readJson = (path) => JSON.parse(readFileSync(resolve(rootDir, path), "utf8"));

export function cardNameToSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function splitTypeLine(typeLine) {
  const [left = "", right = ""] = typeLine.split("—").map((part) => part.trim());
  const types = left
    .split(/\s+/)
    .filter(
      (word) =>
        word && !["Legendary", "Basic", "Snow", "World", "Kindred", "Tribal"].includes(word),
    );
  return { types, subtypes: right ? right.split(/\s+/).filter(Boolean) : [] };
}

function hasAnyTag(tags, prefixes) {
  return tags.some((tag) =>
    prefixes.some((prefix) => tag === prefix || tag.startsWith(`${prefix}-`)),
  );
}

/** Functional roles from Scryfall oracle tags (same vocabulary as the cubes' synergy tags). */
export function classifyRoles({ tags, types, cmc, isLand, producesColors, score }) {
  const roles = [];
  const isSpell = types.includes("Instant") || types.includes("Sorcery");
  if (hasAnyTag(tags, ["removal", "spot-removal", "burn-creature", "sweeper", "board-wipe"])) {
    roles.push(cmc <= 2 || (isSpell && cmc <= 3) ? "premium_removal" : "situational_removal");
  } else if (tags.includes("counterspell")) {
    roles.push(cmc <= 2 ? "premium_removal" : "situational_removal");
  }
  if (hasAnyTag(tags, ["draw-engine", "repeatable-draw", "repeatable-card-advantage"])) {
    roles.push("engine");
  } else if (hasAnyTag(tags, ["card-advantage", "draw", "pure-draw"])) {
    roles.push("card_advantage");
  }
  if (tags.includes("cantrip")) roles.push("cantrip");
  if (!isLand && hasAnyTag(tags, ["ramp", "mana-producer", "mana-rock", "adds-multiple-mana"])) {
    roles.push("mana_ramp");
  }
  if (isLand && producesColors.length > 1) roles.push("mana_fixing");
  if (hasAnyTag(tags, ["tutor", "sacrifice-outlet", "discard-outlet", "reanimate"])) {
    roles.push("synergy_enabler");
  }
  if (types.includes("Creature") || types.includes("Planeswalker")) {
    if (score >= 40) roles.push("bomb");
    else if (cmc >= 6) roles.push("finisher");
    else if (roles.length === 0) roles.push("beater");
  }
  if (roles.length === 0) roles.push(score >= 40 ? "bomb" : "synergy_payoff");
  return [...new Set(roles)];
}

function buildItem(peer, scryfall) {
  const front = scryfall.card_faces?.[0];
  const isSplit = scryfall.layout === "split";
  const typeLine = scryfall.type_line ?? front?.type_line ?? "Card";
  const frontTypeLine = isSplit ? typeLine.split(" // ")[0] : (front?.type_line ?? typeLine);
  const { types, subtypes } = splitTypeLine(frontTypeLine);
  const isLand = types.includes("Land");
  const colors = (scryfall.colors ?? front?.colors ?? []).filter((c) => VALID_COLORS.has(c));
  const producesColors = (scryfall.produced_mana ?? []).filter((c) => VALID_COLORS.has(c));
  const tags = peer.oracle_tags ?? [];
  const reliable = (peer.pickCount ?? 0) >= MIN_RELIABLE_PICK_COUNT;
  const score = roundPowerScore(predictIsotonicScore(calibration.blocks, peer.elo));
  const imageUris = scryfall.image_uris ?? front?.image_uris ?? {};
  const imageUrl = imageUris.normal ?? peer.image_normal;
  const artCropUrl = imageUris.art_crop ?? peer.art_crop;
  const faces = scryfall.card_faces ?? [];
  const oracleText =
    scryfall.oracle_text ?? faces.map((face) => face.oracle_text ?? "").join("\n//\n");
  const cmc = scryfall.cmc ?? peer.cmc ?? 0;
  const peerLabels = peer.peerCubes.map((id) => peerNames.get(id) ?? id);
  const roles = classifyRoles({ tags, types, cmc, isLand, producesColors, score });
  const rating = score / 5.5;

  return {
    schemaVersion: 1,
    slug: cardNameToSlug(peer.name),
    name: peer.name,
    oracleId: peer.oracle_id,
    scryfallId: scryfall.id,
    manaCost: scryfall.mana_cost ?? front?.mana_cost ?? "",
    cmc,
    colors,
    colorIdentity: (scryfall.color_identity ?? []).filter((c) => VALID_COLORS.has(c)),
    typeLine,
    types,
    subtypes,
    oracleText,
    keywords: scryfall.keywords ?? [],
    ...((scryfall.power ?? front?.power) !== undefined && {
      power: String(scryfall.power ?? front?.power),
    }),
    ...((scryfall.toughness ?? front?.toughness) !== undefined && {
      toughness: String(scryfall.toughness ?? front?.toughness),
    }),
    ...((scryfall.loyalty ?? front?.loyalty) !== undefined && {
      loyalty: String(scryfall.loyalty ?? front?.loyalty),
    }),
    isLand,
    producesColors,
    image: { url: imageUrl, ...(artCropUrl && { artCropUrl }) },
    imageUrl,
    powerScore: {
      score,
      source: "expert_heuristic",
      rawSourceScore: score,
      harmonizationDegree: reliable ? "calibrated_medium" : "fallback",
      confidence: reliable ? 0.6 : 0.4,
      updatedAt: peerExtract.capturedAt[peer.peerCubes[0]] ?? new Date().toISOString(),
    },
    presentInCubes: [],
    objectiveAnalysis: {
      summary:
        `Nouveauté ${peer.set_name ?? ""} (${String(peer.firstPrintYear)}) adoptée par ${peerLabels.join(" & ")} ; ` +
        `score calibré sur l'Elo CubeCobra (${Math.round(peer.elo)}, ${String(peer.pickCount ?? 0)} picks).`,
      roles,
      floorRating: Math.min(9.5, Math.max(1, Math.round(rating * 0.85 * 10) / 10)),
      ceilingRating: Math.min(10, Math.max(2, Math.round(rating * 1.05 * 10) / 10)),
      tempoImpact: score >= 40 ? "high" : score >= 25 ? "medium" : "low",
      quadrantStrengths: {
        opening: Math.min(
          5,
          Math.max(1, Math.round((1.5 + score / 20 + (cmc <= 2 ? 0.5 : 0)) * 10) / 10),
        ),
        developing: Math.min(5, Math.max(1, Math.round((1.5 + score / 18) * 10) / 10)),
        parity: Math.min(5, Math.max(1, Math.round((1.4 + score / 20) * 10) / 10)),
        behind: Math.min(5, Math.max(1, Math.round((1.2 + score / 22) * 10) / 10)),
      },
    },
    cubeAnalyses: {},
  };
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
