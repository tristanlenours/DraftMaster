import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { generateCubeSuggestionsReport } from "../src/cards/cube-upgrade-advisor.ts";
import { assignRelativeTiers } from "../src/cards/relative-tier-engine.ts";
import { writeMasterCatalog } from "../src/cards/master-catalog-build.ts";
import {
  UNTAPPED_ELO_CONTRADICTION_RULE,
  detectUntappedEloContradiction,
} from "../src/cards/power-calibration.ts";

const rootDir = process.cwd();

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

// Helper to convert card name to kebab-case slug
export function cardNameToSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

console.log("🔄 Starting Data Model Synchronization...");

// 1. Ensure target directories exist
const itemsDir = resolve(rootDir, "data/cards/items");
mkdirSync(itemsDir, { recursive: true });

// 2. Load master catalog base
// master-cards.json is a build artifact of data/cards/items (npm run cards:build); it
// may be absent on a fresh clone. Its generatedAt is versioned in catalog-meta.json.
const masterPath = resolve(rootDir, "data/cards/master-cards.json");
const catalogMetaPath = resolve(rootDir, "data/cards/catalog-meta.json");
const catalogMeta = JSON.parse(readFileSync(catalogMetaPath, "utf8"));
const masterData = existsSync(masterPath)
  ? JSON.parse(readFileSync(masterPath, "utf8"))
  : { schemaVersion: catalogMeta.schemaVersion, generatedAt: catalogMeta.generatedAt, cardCount: 0, cards: {} };
masterData.generatedAt = catalogMeta.generatedAt;
const previousCatalogFingerprint = sha256(
  JSON.stringify({ cardCount: masterData.cardCount, cards: masterData.cards }),
);

// 2b. Load Untapped reference v2 (integer scores 0-55, latest observed)
const refV2Path = resolve(rootDir, "data/power-rankings/untapped-reference-v2.json");
const refV2 = existsSync(refV2Path) ? JSON.parse(readFileSync(refV2Path, "utf8")) : null;
const refV2ScoresNormalized = new Map();
const refV2CardsNormalized = new Map();
if (refV2) {
  for (const [name, score] of Object.entries(refV2.scores || {})) {
    refV2ScoresNormalized.set(name.toLowerCase().trim(), score);
  }
  for (const c of refV2.cards || []) {
    refV2CardsNormalized.set(c.name.toLowerCase().trim(), c);
  }
}

// 2b'. Load CubeCobra Elo evidence, the versioned Elo -> Untapped isotonic calibration and the
// 17lands Arena grades, used to distrust native Untapped scores that Elo contradicts unless
// 17lands corroborates them as draft traps.
const calibrationPath = resolve(rootDir, "data/power-rankings/cubecobra-calibration-v1.json");
const calibrationBlocks = JSON.parse(readFileSync(calibrationPath, "utf8")).blocks;
const cubeCobraEvidenceByOracleId = new Map();
const cubeCobraEvidenceByName = new Map();
const cubesDir = resolve(rootDir, "data/cubes");
for (const cubeDirName of readdirSync(cubesDir).sort()) {
  const rawPath = join(cubesDir, cubeDirName, "cubecobra-raw.json");
  if (!existsSync(rawPath)) continue;
  for (const item of JSON.parse(readFileSync(rawPath, "utf8")).cards?.mainboard ?? []) {
    const d = item.details;
    if (!d?.name || !Number.isFinite(d.elo)) continue;
    const evidence = { elo: d.elo, pickCount: d.pickCount };
    if (d.oracle_id && !cubeCobraEvidenceByOracleId.has(d.oracle_id)) {
      cubeCobraEvidenceByOracleId.set(d.oracle_id, evidence);
    }
    const nameKey = d.name.toLowerCase().trim();
    if (!cubeCobraEvidenceByName.has(nameKey)) cubeCobraEvidenceByName.set(nameKey, evidence);
  }
}
const arenaGradesPath = resolve(rootDir, "data/power-rankings/limitedgrades-powered-cache.json");
// Versioned local snapshot (never fetched here): without it every corroborated trap would be lifted.
const arenaGrades = JSON.parse(readFileSync(arenaGradesPath, "utf8"));
const arenaGradesByName = new Map();
for (const c of arenaGrades.cards) {
  arenaGradesByName.set(c.name.toLowerCase().trim(), { grade: c.grade, gameCount: c.gameCount });
}
console.log(
  `📊 Loaded ${arenaGradesByName.size} 17lands Arena grades (${arenaGrades.sourceUrl}, captured ${arenaGrades.capturedAt}).`,
);
const eloOverriddenCards = [];
const rejectedUntappedScores = new Map();

// 2c. Load CubeCobra Benchmarks and Card Release Metadata
const benchmarksPath = resolve(rootDir, "data/benchmarks/cubecobra-benchmarks.json");
const releaseMetaPath = resolve(rootDir, "data/benchmarks/card-release-metadata.json");

const benchmarksRaw = existsSync(benchmarksPath) ? readFileSync(benchmarksPath, "utf8") : "{}";
const releaseMetadataSourceRaw = existsSync(releaseMetaPath)
  ? readFileSync(releaseMetaPath, "utf8")
  : "{}";
const benchmarksData = JSON.parse(benchmarksRaw);
const releaseMetadataRaw = JSON.parse(releaseMetadataSourceRaw);

const releaseMetadataMap = new Map();
for (const [key, val] of Object.entries(releaseMetadataRaw)) {
  releaseMetadataMap.set(key.toLowerCase().trim(), {
    firstPrintYear: val.firstPrintYear,
    released_at: val.released_at,
    set: val.set,
    setName: val.setName,
    rarity: val.rarity,
  });
}
console.log(
  `📡 Loaded ${Object.keys(benchmarksData).length} benchmark cubes & release metadata for ${releaseMetadataMap.size} cards.`,
);

// 3. Load all individual JSON files in itemsDir
const itemFiles = readdirSync(itemsDir).filter((f) => f.endsWith(".json"));
console.log(`📦 Found ${itemFiles.length} card documents in data/cards/items/`);

let cardCount = 0;
const cardsByOracleId = {};

for (const file of itemFiles) {
  const singleCardPath = join(itemsDir, file);
  const cardDoc = JSON.parse(readFileSync(singleCardPath, "utf8"));

  // Apply latest Untapped static score if available
  const normName = cardDoc.name.toLowerCase().trim();
  if (refV2ScoresNormalized.has(normName)) {
    const v2Score = refV2ScoresNormalized.get(normName);
    const cardHistory = refV2CardsNormalized.get(normName);
    const updatedAt =
      cardHistory?.latestObservedAt || cardDoc.powerScore?.updatedAt || new Date().toISOString();
    const evidence =
      cubeCobraEvidenceByOracleId.get(cardDoc.oracleId) ?? cubeCobraEvidenceByName.get(normName);
    const eloEstimate = detectUntappedEloContradiction(
      v2Score,
      evidence,
      calibrationBlocks,
      arenaGradesByName.get(normName),
    );
    if (eloEstimate !== undefined) {
      eloOverriddenCards.push(cardDoc.oracleId);
      rejectedUntappedScores.set(cardDoc.oracleId, v2Score);
      // Same provenance as the other CubeCobra feature-calibrated scores: the catalog never
      // carries raw Elo (tier-score-consistency invariant), only the calibrated estimate.
      cardDoc.powerScore = {
        score: eloEstimate,
        source: "expert_heuristic",
        rawSourceScore: eloEstimate,
        harmonizationDegree: "calibrated_medium",
        confidence: 0.6,
        updatedAt,
      };
    } else {
      cardDoc.powerScore = {
        ...cardDoc.powerScore,
        score: v2Score,
        rawSourceScore: v2Score,
        source: "untapped",
        harmonizationDegree: "native",
        confidence: 1.0,
        updatedAt,
      };
    }
  }

  if (cardsByOracleId[cardDoc.oracleId]) {
    throw new Error(
      `Duplicate Oracle ID ${cardDoc.oracleId} in ${file} and ${cardsByOracleId[cardDoc.oracleId].slug}.json`,
    );
  }
  cardsByOracleId[cardDoc.oracleId] = cardDoc;
  cardCount += 1;
}

console.log(
  `⚖️ ${UNTAPPED_ELO_CONTRADICTION_RULE.id}: ${eloOverriddenCards.length} native Untapped scores contradicted by CubeCobra Elo replaced by the calibrated estimate`,
);
console.log(
  `✅ Successfully indexed ${cardCount} individual card JSON files from data/cards/items/`,
);

// 4. Update master-cards.json bundle for sync
masterData.cardCount = cardCount;
masterData.cards = cardsByOracleId;
const nextCatalogFingerprint = sha256(
  JSON.stringify({ cardCount: masterData.cardCount, cards: masterData.cards }),
);
if (nextCatalogFingerprint !== previousCatalogFingerprint) {
  masterData.generatedAt = new Date().toISOString();
  writeFileSync(
    catalogMetaPath,
    JSON.stringify({ schemaVersion: masterData.schemaVersion, generatedAt: masterData.generatedAt }, null, 2) + "\n",
    "utf8",
  );
}
const masterSerialized = JSON.stringify(masterData, null, 2) + "\n";
console.log(`✅ Indexed the master catalog (generatedAt ${masterData.generatedAt})`);

// 5. Build Unified cube.json for each of the 3 community cubes
const cubeConfigs = [
  {
    key: "nico_candyshop",
    dir: "data/cubes/nico_candyshop",
    description:
      "L'un des environnements les plus rapides et brutaux de Magic papier. Fast mana, combos en un tour et interactions à 0 mana imposent un rythme impitoyable où chaque tour compte double.",
    philosophy:
      "Le Vintage Candyshop est conçu pour offrir l'expérience Vintage Cube la plus explosive et interactive possible. " +
      "Les Moxen, Black Lotus et Time Walk créent des accélérations phénoménales où la partie peut basculer dès le premier ou second tour. " +
      "Chaque deck doit être proactif dès le Tour 1 ou armé d'interactions gratuites (Force of Will, Daze, Mindbreak Trap) sous peine d'écrasement immédiat.",
  },
  {
    key: "hugues_pauper",
    dir: "data/cubes/hugues_pauper",
    description:
      "Un environnement 100% cartes communes célébrant les purs fondamentaux de Magic : combats sur le champ de bataille, avantage de cartes à l'usure et arbitrages tactiques permanents.",
    philosophy:
      "Le Pauper Cube de Hugues valorise la pureté du jeu de plateau sans les accélérations dégénérées des raretés supérieures. " +
      "Ici, la victoire se construit par le double-spelling, l'optimisation minutieuse des échanges 2-pour-1 (Mulldrifter, Ephemerate, Ninjutsu) " +
      "et la rentabilisation des synergies d'artefacts et de cimetière. Le tour pivot (T4/T5) consacre le joueur ayant le mieux géré ses ressources et son tempo.",
  },
  {
    key: "titou_tribal",
    dir: "data/cubes/titou_tribal",
    description:
      "Un format centré sur les synergies de types de créatures, les seigneurs et l'assemblage d'armées tribales dans un environnement de draft convivial et riche en couleurs.",
    philosophy:
      "Le Tribal & Chromatique Cube de Titou explore la richesse des interactions entre créatures de mêmes familles (Humains, Anges, Elfes, Gobelins). " +
      "Le format encourage la construction d'armées cohérentes où chaque pièce amplifie ses voisines. " +
      "Le tour pivot (T4) marque le moment où la masse critique tribale permet de submerger la défense adverse ou de verrouiller le contrôle aérien.",
  },
  {
    key: "cedric_cube",
    dir: "data/cubes/cedric_cube",
    description:
      "Un environnement Vintage Non-Powered de 720 cartes célébrant le jeu interactif de haut niveau : réanimation, monstres sneak/show, planeswalkers et synergies de guilde sans la brutalité non interactive du Power 9.",
    philosophy:
      "Le Cube de Cédric (Strobinellus) privilégie la profondeur stratégique et l'équilibre interactif. " +
      "En écartant le Power 9 au profit d'accélérateurs sélectifs (Mana Vault, Mox Diamond, Grim Monolith) et de bilands parfaits, " +
      "il permet des affrontements spectaculaires où le Tour Pivot (T3.5 - T4) récompense l'anticipation, les échanges 2-pour-1 et les synergies construites.",
  },
  {
    key: "titou_arena_peasant_plus",
    dir: "data/cubes/titou_arena_peasant_plus",
    description:
      "Un cube Peasant Plus de 360 cartes MTG Arena combinant les meilleures communes et uncos du jeu avec les 10 Shocklands et fixers rares pour des affrontements fluides, interactifs et profondément synergiques.",
    philosophy:
      "Le Titou Arena Peasant Plus Cube magnifie le meilleur du jeu Peasant MTG Arena. " +
      "En associant une densité exceptionnelle d'interactions communes/unco aux 10 Shocklands rares et fixers incontournables (Fabled Passage, Mana Confluence), " +
      "il élimine la frustration du mana screw et permet aux joueurs de bâtir des decks bicolores et tricolores aux synergies dignes du format Construit.",
  },
];

const tierOrder = {
  "A+": 0,
  A: 1,
  "A-": 2,
  "B+": 3,
  B: 4,
  "B-": 5,
  "C+": 6,
  C: 7,
  "C-": 8,
  "D+": 9,
  D: 10,
  "D-": 11,
  F: 12,
  S: -1,
  B: 4,
  C: 7,
  D: 10,
};

for (const cfg of cubeConfigs) {
  const metaPath = resolve(rootDir, cfg.dir, "cube-meta.json");
  if (!existsSync(metaPath)) {
    console.warn(`⚠️ Warning: ${metaPath} not found, skipping.`);
    continue;
  }

  const meta = JSON.parse(readFileSync(metaPath, "utf8"));

  // Collect cards for this cube
  const cubeCards = Object.values(cardsByOracleId).filter(
    (c) => c.presentInCubes && c.presentInCubes.includes(cfg.key),
  );

  // Collect archetype memberships from cube-meta.json and archetype-synergy-v1.json
  const archetypesByOracleId = new Map();
  const addCardArchetype = (oracleId, archetypeId) => {
    const set = archetypesByOracleId.get(oracleId) || new Set();
    set.add(archetypeId);
    archetypesByOracleId.set(oracleId, set);
  };
  for (const arch of meta.archetypes || []) {
    for (const id of arch.keyCards || []) addCardArchetype(id, arch.id);
    for (const id of arch.supportCards || []) addCardArchetype(id, arch.id);
  }
  const synergyPath = resolve(rootDir, cfg.dir, "archetype-synergy-v1.json");
  if (existsSync(synergyPath)) {
    const synergyDoc = JSON.parse(readFileSync(synergyPath, "utf8"));
    for (const arch of synergyDoc.archetypes || []) {
      for (const cardEntry of arch.cards || []) {
        addCardArchetype(cardEntry.oracleId, arch.id);
      }
    }
  }

  const cardIndex = [];
  const tierAssignments = assignRelativeTiers(cubeCards, meta);
  tierAssignments.forEach(({ card, tier: relTier, metaRole, metaBonus }) => {
    const ana = card.cubeAnalyses[cfg.key];
    if (ana) {
      ana.relativeTier = relTier;
      ana.tier = relTier;
      ana.metaBonus = metaBonus;
      ana.metaRole = metaRole;
      ana.scoreModifier = metaBonus;
      const syncedArchetypes = archetypesByOracleId.get(card.oracleId);
      if (syncedArchetypes) {
        ana.archetypes = [...new Set([...(ana.archetypes || []), ...syncedArchetypes])];
      }
    }
  });

  // Generate Upgrade Proposals and Maybeboard for this cube
  const cubeCobraStatsMap = new Map();
  const rawPath = resolve(rootDir, cfg.dir, "cubecobra-raw.json");
  const cubeCobraRaw = existsSync(rawPath) ? readFileSync(rawPath, "utf8") : "{}";
  if (existsSync(rawPath)) {
    try {
      const raw = JSON.parse(cubeCobraRaw);
      for (const item of raw.cards?.mainboard || []) {
        const d = item.details;
        if (d?.name) {
          cubeCobraStatsMap.set(d.name.toLowerCase(), {
            elo: d.elo,
            popularity: d.popularity,
            cubeCount: d.cubeCount,
          });
        }
      }
    } catch {
      // Graceful fallback if raw file is missing or invalid
    }
  }

  // Filter benchmarks relevant to this cube
  const peerBenchmarks = Object.values(benchmarksData).filter((b) =>
    b.targetCubes?.includes(cfg.key),
  );
  const benchmarkCardsMap = new Map();
  for (const b of peerBenchmarks) {
    for (const cardName of b.cards || []) {
      const lower = cardName.toLowerCase().trim();
      const existing = benchmarkCardsMap.get(lower) || [];
      benchmarkCardsMap.set(lower, [...existing, b.name]);
    }
  }

  const suggestionsReport = generateCubeSuggestionsReport(
    cfg.key,
    Object.values(cardsByOracleId),
    meta,
    cubeCobraStatsMap,
    releaseMetadataMap,
    benchmarkCardsMap,
    {
      generatedAt: masterData.generatedAt,
      catalog: {
        id: "data/cards/master-cards.json",
        version: `master-catalog@${String(masterData.schemaVersion)}`,
        sha256: sha256(masterSerialized),
        license: "Mixed upstream terms; see docs/research/card-data-audit-2026-09-06.md",
        method: "Deterministic merge of versioned local card items and power scores",
      },
      releaseMetadata: {
        id: "data/benchmarks/card-release-metadata.json",
        version: "card-release-metadata@1",
        sha256: sha256(releaseMetadataSourceRaw),
        license: "Scryfall data usage terms; Magic: The Gathering © Wizards of the Coast",
        method: "Versioned local extraction of first-print and rarity metadata",
      },
      benchmarks: {
        id: "data/benchmarks/cubecobra-benchmarks.json",
        version: "cubecobra-benchmarks@1",
        sha256: sha256(benchmarksRaw),
        license: "CubeCobra source data; upstream terms apply",
        method: "Versioned local benchmark cube lists filtered by target cube",
      },
      cubeCobra: {
        id: `${cfg.dir}/cubecobra-raw.json`,
        version: "cubecobra-raw@1",
        sha256: sha256(cubeCobraRaw),
        license: "CubeCobra source data; upstream terms apply",
        method: "Local archive; card Elo, popularity and cube count indexed by normalized name",
      },
    },
  );
  const suggestionsPath = resolve(rootDir, cfg.dir, "cube-suggestions.json");
  writeFileSync(suggestionsPath, JSON.stringify(suggestionsReport, null, 2) + "\n", "utf8");
  console.log(
    `✅ Generated suggestions ${suggestionsPath} (${suggestionsReport.stats.totalUpgrades} upgrades [${suggestionsReport.stats.recentUpgradesCount} récents <3 ans, ${suggestionsReport.stats.benchmarkMatchesCount} benchmark matches], ${suggestionsReport.stats.totalMaybeboard} maybeboard)`,
  );

  // Populate cardIndex conforming strictly to cube.schema.json
  cubeCards.forEach((card) => {
    const ana = card.cubeAnalyses[cfg.key];
    const relTier = ana?.relativeTier || "C";
    const metaRole = ana?.metaRole || "neutral";
    const metaBonus = ana?.metaBonus || 0;

    if (ana) {
      delete ana.hasUpgrade;
      delete ana.upgradeSuggestion;
    }

    cardIndex.push({
      slug: card.slug,
      name: card.name,
      oracleId: card.oracleId,
      tier: relTier,
      fit: metaRole === "key" ? "staple" : metaRole === "trap" ? "trap" : ana?.fit || "support",
      scoreModifier: metaBonus,
      metaBonus,
      metaRole,
    });
  });

  // Sort card index by Tier, then name
  cardIndex.sort((a, b) => {
    const tA = tierOrder[a.tier] ?? 99;
    const tB = tierOrder[b.tier] ?? 99;
    if (tA !== tB) return tA - tB;
    return a.name.localeCompare(b.name);
  });

  const cubeDoc = {
    schemaVersion: 1,
    cubeKey: meta.cubeKey,
    name: meta.name,
    owner: meta.owner,
    coachReadiness: meta.coachReadiness,
    coverImage: meta.coverImage,
    activeSnapshotId: meta.activeSnapshotId,
    cardCount: meta.cardCount,
    powerTier: meta.powerTier,
    pacing: meta.pacing,
    description: cfg.description,
    fundamentalTurn: meta.fundamentalTurn,
    technicalAxes: meta.technicalAxes,
    philosophy: cfg.philosophy,
    dominantMechanics: meta.dominantMechanics,
    fixingDensityPercentage: meta.fixingDensityPercentage,
    archetypes: meta.archetypes,
    scoringProfile: meta.scoringProfile,
    cardIndex,
  };

  const cubeJsonPath = resolve(rootDir, cfg.dir, "cube.json");
  writeFileSync(cubeJsonPath, JSON.stringify(cubeDoc, null, 2) + "\n", "utf8");
  console.log(`✅ Generated unified ${cubeJsonPath} (${cardIndex.length} cards indexed)`);
}

// 6. Write back updated cards with relative tiers & meta bonuses
for (const card of Object.values(cardsByOracleId)) {
  const singleCardPath = join(itemsDir, `${card.slug}.json`);
  if (existsSync(singleCardPath)) {
    writeFileSync(singleCardPath, JSON.stringify(card, null, 2) + "\n", "utf8");
  }
}
await writeMasterCatalog(rootDir);
console.log(
  `✅ Updated individual items with relative tiers and meta bonuses, then rebuilt master-cards.json.`,
);

// 7. Synchronize power-ranking-v1.json with updated card scores to prevent drift
const powerRankingPath = resolve(rootDir, "data/power-rankings/power-ranking-v1.json");
if (existsSync(powerRankingPath)) {
  const powerRankingData = JSON.parse(readFileSync(powerRankingPath, "utf8"));
  for (const entry of powerRankingData.ranking || []) {
    const card = cardsByOracleId[entry.oracleId];
    if (card && typeof card.powerScore?.score === "number") {
      entry.score = card.powerScore.score;
      entry.rawSourceScore = card.powerScore.score;
      if (card.powerScore.source) {
        entry.source = card.powerScore.source;
      }
      if (rejectedUntappedScores.has(entry.oracleId)) {
        entry.method = UNTAPPED_ELO_CONTRADICTION_RULE.id;
        entry.rejectedUntappedScore = rejectedUntappedScores.get(entry.oracleId);
      } else if (entry.method === UNTAPPED_ELO_CONTRADICTION_RULE.id) {
        entry.method = "historical_mode";
        delete entry.rejectedUntappedScore;
      }
    }
  }
  // Sort descending by score, tie-break by name
  powerRankingData.ranking.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
  powerRankingData.generatedAt = new Date().toISOString();
  writeFileSync(powerRankingPath, JSON.stringify(powerRankingData, null, 2) + "\n", "utf8");
  console.log(
    `✅ Synchronized data/power-rankings/power-ranking-v1.json (${powerRankingData.ranking.length} entries)`,
  );
}

console.log("🎉 Data Model Synchronization complete!");
