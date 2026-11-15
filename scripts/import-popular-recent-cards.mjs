// Imports popular cards of recent sets into data/cards/items/ so the cube upgrade advisor can
// propose them before any peer cube adopts them.
//
// Discovery: Scryfall lists the first prints released since --since, most played in Commander
// first (EDHREC rank). Strength: the CubeCobra card page gives each card's cube Elo, read through
// the frozen Elo -> power isotonic calibration (data/power-rankings/cubecobra-calibration-v1.json),
// the same method as scripts/import-peer-cube-candidates.mjs. Commander popularity only decides
// which cards are looked at; it never sets a score.
//
// Usage: node scripts/import-popular-recent-cards.mjs [--since 2026-05-01] [--top 150]
//          [--card "Salt Vampire"]... [--apply]
// Then run `npm run data:sync`.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  MIN_RELIABLE_PICK_COUNT,
  buildCandidateItem,
  extractCubeCobraCard,
  scoreFromElo,
} from "./candidate-card-item.mjs";

const rootDir = process.cwd();
const USER_AGENT = "DraftMaster/0.1 (+https://github.com/tristanlenours/DraftMaster)";
/** The advisor ignores candidates below this power score, so they are not imported. */
const MIN_IMPORTED_SCORE = 25;
const REQUEST_DELAY_MS = 150;

function readArgs(argv) {
  const options = { apply: false, top: 150, since: undefined, cards: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--top") options.top = Number(argv[(index += 1)]);
    else if (arg === "--since") options.since = argv[(index += 1)];
    else if (arg === "--card") options.cards.push(argv[(index += 1)]);
    else throw new Error(`Unknown argument ${arg}`);
  }
  if (!Number.isInteger(options.top) || options.top < 0) throw new Error("--top expects a count");
  if (options.since === undefined) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
    options.since = sixMonthsAgo.toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.since)) throw new Error("--since expects YYYY-MM-DD");
  if (options.cards.some((name) => !name)) throw new Error("--card expects a card name");
  return options;
}

const options = readArgs(process.argv.slice(2));
const readJson = (path) => JSON.parse(readFileSync(resolve(rootDir, path), "utf8"));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const calibration = readJson("data/power-rankings/cubecobra-calibration-v1.json");
const itemsDir = resolve(rootDir, "data/cards/items");
const existingItems = readdirSync(itemsDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(join(itemsDir, file), "utf8")));
const knownOracleIds = new Set(existingItems.map((card) => card.oracleId));
const knownNames = new Set(existingItems.map((card) => card.name.toLowerCase()));
const isKnown = (card) =>
  knownOracleIds.has(card.oracle_id) || knownNames.has(card.name.toLowerCase());

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`HTTP ${String(response.status)} for ${url}`);
  return response.json();
}

/** First prints released since the date, most played in Commander first, missing from the catalog. */
async function discoverPopularRecentCards(since, top) {
  const found = [];
  const query = `date>=${since} is:firstprint game:paper legal:commander -t:basic`;
  let url =
    top > 0
      ? `https://api.scryfall.com/cards/search?order=edhrec&dir=asc&q=${encodeURIComponent(query)}`
      : undefined;
  while (url && found.length < top) {
    const page = await fetchJson(url);
    for (const card of page?.data ?? []) {
      // Unranked cards are sorted last: the ranked part of the list is exhausted.
      if (!Number.isInteger(card.edhrec_rank)) return found;
      if (!isKnown(card)) found.push(card);
      if (found.length >= top) break;
    }
    url = page?.has_more ? page.next_page : undefined;
    await sleep(REQUEST_DELAY_MS);
  }
  return found;
}

async function fetchNamedCards(names) {
  const cards = [];
  for (const name of names) {
    const card = await fetchJson(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
    );
    if (!card) throw new Error(`Scryfall does not know a card named "${name}"`);
    cards.push(card);
    await sleep(REQUEST_DELAY_MS);
  }
  return cards;
}

async function fetchCubeCobraEvidence(scryfallId) {
  const response = await fetch(`https://cubecobra.com/tool/card/${scryfallId}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) return undefined;
  return extractCubeCobraCard(await response.text());
}

const requested = await fetchNamedCards(options.cards);
const requestedIds = new Set(requested.map((card) => card.oracle_id));
const discovered = await discoverPopularRecentCards(options.since, options.top);
const candidates = [
  ...requested.filter((card) => !isKnown(card)),
  ...discovered.filter((card) => !requestedIds.has(card.oracle_id)),
];
for (const card of requested.filter(isKnown)) {
  console.log(`  ⏭️ ${card.name} is already in the catalog.`);
}
console.log(
  `🔎 ${String(candidates.length)} cards to grade: ${String(requested.length)} requested by name, ` +
    `${String(discovered.length)} most played in Commander among first prints since ${options.since}.`,
);

const capturedAt = new Date().toISOString();
const imported = [];
const skipped = [];
for (const scryfall of candidates) {
  const cubeCobra = await fetchCubeCobraEvidence(scryfall.id);
  await sleep(REQUEST_DELAY_MS);
  if (!Number.isFinite(cubeCobra?.elo)) {
    skipped.push(`${scryfall.name} (no CubeCobra Elo yet)`);
    continue;
  }
  const score = scoreFromElo(calibration.blocks, cubeCobra.elo);
  if (score < MIN_IMPORTED_SCORE && !requestedIds.has(scryfall.oracle_id)) {
    skipped.push(`${scryfall.name} (score ${score.toFixed(1)} < ${String(MIN_IMPORTED_SCORE)})`);
    continue;
  }
  const evidence = {
    name: scryfall.name,
    oracle_id: scryfall.oracle_id,
    scryfall_id: scryfall.id,
    elo: cubeCobra.elo,
    popularity: cubeCobra.popularity,
    cubeCount: cubeCobra.cubeCount,
    pickCount: cubeCobra.pickCount ?? 0,
    oracle_tags: cubeCobra.oracle_tags ?? [],
    cmc: scryfall.cmc,
    ...(Number.isInteger(scryfall.edhrec_rank) && { edhrecRank: scryfall.edhrec_rank }),
    set: scryfall.set.toUpperCase(),
    set_name: scryfall.set_name,
    released_at: scryfall.released_at,
    rarity: scryfall.rarity,
    requestedByName: requestedIds.has(scryfall.oracle_id),
  };
  const origin = evidence.requestedByName
    ? "ajoutée à la demande"
    : `populaire en Commander (rang EDHREC ${String(evidence.edhrecRank)})`;
  const item = buildCandidateItem(evidence, scryfall, {
    score,
    summary:
      `Nouveauté ${scryfall.set_name} (${scryfall.released_at.slice(0, 4)}) ${origin} ; ` +
      `score calibré sur l'Elo CubeCobra (${String(Math.round(evidence.elo))}, ${String(evidence.pickCount)} picks).`,
    updatedAt: capturedAt,
  });
  if (existsSync(join(itemsDir, `${item.slug}.json`))) {
    skipped.push(`${scryfall.name} (slug ${item.slug} already used)`);
    continue;
  }
  imported.push({ item, evidence });
}

const reliableCount = imported.filter(
  ({ evidence }) => evidence.pickCount >= MIN_RELIABLE_PICK_COUNT,
).length;
console.log(
  `📦 ${String(imported.length)} items ready (${String(reliableCount)} with ≥ ${String(MIN_RELIABLE_PICK_COUNT)} picks), ${String(skipped.length)} skipped.`,
);
for (const { item, evidence } of [...imported].sort(
  (a, b) => b.item.powerScore.score - a.item.powerScore.score,
)) {
  console.log(
    `  ${item.powerScore.score.toFixed(1).padStart(5)}  ${item.name} [${item.colors.join("") || "C"} ${String(item.cmc)}] ` +
      `${evidence.set} · Elo ${String(Math.round(evidence.elo))} · ${String(evidence.pickCount)} picks · ` +
      `EDHREC ${evidence.edhrecRank === undefined ? "n/a" : String(evidence.edhrecRank)}`,
  );
}
console.log(`⏭️ Skipped: ${skipped.join("; ") || "none"}`);

if (!options.apply) {
  console.log("ℹ️ Dry run: pass --apply to write the card documents.");
} else {
  for (const { item } of imported) {
    writeFileSync(
      join(itemsDir, `${item.slug}.json`),
      `${JSON.stringify(item, null, 2)}\n`,
      "utf8",
    );
  }

  // Versioned strength evidence: oracle tags for the advisor, provenance for the power ranking.
  const detailsPath = resolve(rootDir, "data/benchmarks/popular-recent-card-details.json");
  const details = existsSync(detailsPath)
    ? JSON.parse(readFileSync(detailsPath, "utf8"))
    : {
        schemaVersion: 1,
        source:
          "https://api.scryfall.com/cards/search (order=edhrec) + https://cubecobra.com/tool/card/<scryfall id>",
        cards: {},
      };
  // Release metadata: recency and rarity for the advisor's policies.
  const releasePath = resolve(rootDir, "data/benchmarks/card-release-metadata.json");
  const releaseMetadata = JSON.parse(readFileSync(releasePath, "utf8"));
  for (const { evidence } of imported) {
    details.cards[evidence.oracle_id] = { ...evidence, capturedAt };
    releaseMetadata[evidence.name.toLowerCase()] = {
      name: evidence.name,
      firstPrintYear: Number(evidence.released_at.slice(0, 4)),
      released_at: evidence.released_at,
      set: evidence.set,
      setName: evidence.set_name,
      rarity: evidence.rarity,
      elo: evidence.elo,
      popularity: evidence.popularity,
      cubeCount: evidence.cubeCount,
    };
  }
  details.cardCount = Object.keys(details.cards).length;
  writeFileSync(detailsPath, `${JSON.stringify(details, null, 2)}\n`, "utf8");
  writeFileSync(releasePath, `${JSON.stringify(releaseMetadata, null, 2)}\n`, "utf8");
  console.log(
    `✅ Wrote ${String(imported.length)} card documents, their CubeCobra evidence and release metadata.`,
  );
}
