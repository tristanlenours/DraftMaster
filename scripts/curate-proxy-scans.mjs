import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { selectBestProxyVariants } from "../src/proxy-scans/print-selector.ts";
import { cardNameToSlug } from "../src/cards/types.ts";

const rootDir = process.cwd();
const itemsDir = resolve(rootDir, "data", "cards", "items");
const outputPath = resolve(rootDir, "data", "cards", "proxy-scans.json");

const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return defaultValue;
}

const targetCube = getArg("--cube", null);
const isAll = args.includes("--all") || !targetCube;
const isForce = args.includes("--force");
const limitArg = getArg("--limit", null);
const limit = limitArg ? Number.parseInt(limitArg, 10) : null;
const batchSize = Math.max(1, Math.min(8, Number.parseInt(getArg("--batch-size", "6"), 10)));
const delayMs = Math.max(75, Number.parseInt(getArg("--delay", "110"), 10));

const SCRYFALL_HEADERS = {
  "User-Agent": "DraftMaster/1.0 (proxy-scans-curator; github.com/tristanlenours/DraftMaster)",
  Accept: "application/json",
};

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function loadExistingCatalog() {
  if (!existsSync(outputPath)) {
    return { schemaVersion: 1, generatedAt: new Date().toISOString(), cardCount: 0, entries: {} };
  }
  try {
    return JSON.parse(readFileSync(outputPath, "utf8"));
  } catch {
    return { schemaVersion: 1, generatedAt: new Date().toISOString(), cardCount: 0, entries: {} };
  }
}

function saveCatalogAtomic(entriesMap) {
  const sortedEntries = {};
  for (const key of Object.keys(entriesMap).sort()) {
    sortedEntries[key] = entriesMap[key];
  }
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    cardCount: Object.keys(sortedEntries).length,
    entries: sortedEntries,
  };
  mkdirSync(resolve(rootDir, "data", "cards"), { recursive: true });
  const tmpPath = `${outputPath}.${process.pid}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(tmpPath, outputPath);
}

async function fetchScryfallSearch(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: SCRYFALL_HEADERS });
    if (res.status === 429) {
      const wait = 2000 * (attempt + 1);
      console.warn(`⏳ Rate limit Scryfall (429), pause ${wait}ms...`);
      await sleep(wait);
      continue;
    }
    if (res.status === 404) {
      return { data: [], has_more: false };
    }
    if (!res.ok) {
      if (attempt < 3 && res.status >= 500) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw new Error(`HTTP ${res.status} on ${url}`);
    }
    return await res.json();
  }
  return { data: [], has_more: false };
}

async function fetchPrintsForBatch(cardsBatch) {
  const oracleClause = cardsBatch.map((c) => `oracleid:${c.oracleId}`).join(" OR ");
  const query = `(${oracleClause}) (lang:en OR lang:fr)`;
  let nextUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&include_multilingual=true&include_extras=true`;
  const allPrints = [];

  while (nextUrl) {
    const page = await fetchScryfallSearch(nextUrl);
    if (Array.isArray(page.data)) {
      allPrints.push(...page.data);
    }
    nextUrl = page.has_more && page.next_page ? page.next_page : null;
    if (nextUrl) await sleep(delayMs);
  }
  return allPrints;
}

async function fetchPrintsSingleCardByName(card) {
  const frontName = card.name.split(" // ")[0].trim();
  const query = `!"${frontName}" (lang:en OR lang:fr)`;
  let nextUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints&include_multilingual=true&include_extras=true`;
  const allPrints = [];

  while (nextUrl) {
    const page = await fetchScryfallSearch(nextUrl);
    if (Array.isArray(page.data)) {
      allPrints.push(...page.data);
    }
    nextUrl = page.has_more && page.next_page ? page.next_page : null;
    if (nextUrl) await sleep(delayMs);
  }
  return allPrints;
}

console.log("🖨️  DraftMaster — Curation des scans HD & illustrations originales populaires...");
console.log(`   Périmètre : ${isAll ? "TOUT LE CATALOGUE" : `Cube ${targetCube}`}`);
console.log(`   Batch Scryfall : ${batchSize} cartes / requête | Délai : ${delayMs} ms`);
console.log(`   Force réécriture : ${isForce ? "OUI" : "NON"}`);

const itemFiles = readdirSync(itemsDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

const allCards = itemFiles.map((file) => JSON.parse(readFileSync(join(itemsDir, file), "utf8")));
const filteredCards = allCards.filter((card) => {
  if (isAll) return true;
  return Array.isArray(card.presentInCubes) && card.presentInCubes.includes(targetCube);
});

const existingCatalog = loadExistingCatalog();
const entries = { ...(existingCatalog.entries || {}) };

const todoCards = filteredCards.filter((card) => {
  if (isForce) return true;
  const existing = entries[card.oracleId];
  return !existing || !existing.classic?.pngUrl;
});

const toProcess = limit !== null ? todoCards.slice(0, limit) : todoCards;

console.log(`📋 Cartes éligibles : ${filteredCards.length}`);
console.log(`⏭️  Déjà curatées : ${filteredCards.length - todoCards.length}`);
console.log(`📥 À traiter : ${toProcess.length}`);

if (toProcess.length === 0) {
  console.log("✨ Toutes les cartes demandées sont déjà curatées dans data/cards/proxy-scans.json.");
  process.exit(0);
}

let curatedCount = 0;
let withOriginalCount = 0;
let officialFrClassicCount = 0;
let missingCount = 0;

for (let i = 0; i < toProcess.length; i += batchSize) {
  const batch = toProcess.slice(i, i + batchSize);
  let prints = [];
  try {
    prints = await fetchPrintsForBatch(batch);
  } catch (err) {
    console.warn(`⚠️ Batch ${i} échoué (${err.message}), bascule carte par carte...`);
  }

  const byOracleId = new Map();
  for (const print of prints) {
    const oid = print.oracle_id;
    if (!oid) continue;
    if (!byOracleId.has(oid)) byOracleId.set(oid, []);
    byOracleId.get(oid).push(print);
  }

  for (const card of batch) {
    let cardPrints = byOracleId.get(card.oracleId) || [];
    if (cardPrints.length === 0) {
      // Fallback search by exact name (handles occasional oracleId mismatches)
      try {
        await sleep(delayMs);
        cardPrints = await fetchPrintsSingleCardByName(card);
      } catch {
        cardPrints = [];
      }
    }

    const fallback = {
      oracleId: card.oracleId,
      slug: card.slug || cardNameToSlug(card.name),
      name: card.name,
      typeLine: card.typeLine || "",
      oracleText: card.oracleText || "",
      ...(card.frenchName ? { frenchName: card.frenchName } : {}),
      ...(card.frenchText ? { frenchText: card.frenchText } : {}),
    };

    const selection = selectBestProxyVariants(cardPrints, fallback);
    if (selection.classic) {
      entries[card.oracleId] = {
        oracleId: card.oracleId,
        slug: fallback.slug,
        name: card.name,
        french: selection.french,
        classic: selection.classic,
        original: selection.original,
        curatedAt: new Date().toISOString(),
      };
      curatedCount += 1;
      if (selection.original) withOriginalCount += 1;
      if (selection.classic.isOfficialFrenchScan) officialFrClassicCount += 1;
    } else {
      missingCount += 1;
      console.warn(`   ⚠️ Aucun scan papier éligible trouvé pour ${card.name}`);
    }
  }

  const processed = Math.min(i + batch.length, toProcess.length);
  const pct = Math.round((processed / toProcess.length) * 100);
  if (processed % (batchSize * 10) === 0 || processed === toProcess.length) {
    saveCatalogAtomic(entries);
    console.log(
      `   [${processed}/${toProcess.length}] (${pct}%) 💾 Sauvegardé — Curatées: ${curatedCount}, Alt-Arts: ${withOriginalCount}, Classique FR: ${officialFrClassicCount}`,
    );
  }

  await sleep(delayMs);
}

saveCatalogAtomic(entries);
console.log("\n======================================================");
console.log("🎉 Curation Proxy Scans terminée !");
console.log(`   Total dans data/cards/proxy-scans.json : ${Object.keys(entries).length}`);
console.log(`   Nouvellement curatées : ${curatedCount}`);
console.log(`   Avec illustration originale populaire : ${withOriginalCount}`);
console.log(`   Scans classiques officiels FR : ${officialFrClassicCount}`);
console.log(`   Sans scan Scryfall trouvé : ${missingCount}`);
console.log("======================================================\n");
