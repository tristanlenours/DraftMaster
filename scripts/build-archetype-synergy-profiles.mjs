import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import cedricCuration from "./archetype-curation/cedric-cube.mjs";
import huguesCuration from "./archetype-curation/hugues-pauper.mjs";
import nicoCuration from "./archetype-curation/nico-candyshop.mjs";
import titouPeasantCuration from "./archetype-curation/titou-arena-peasant-plus.mjs";

const rootDir = resolve(import.meta.dirname, "..");

async function readJson(path) {
  return JSON.parse(await readFile(resolve(rootDir, path), "utf8"));
}

async function readJsonSource(path) {
  const rawText = await readFile(resolve(rootDir, path), "utf8");
  return {
    value: JSON.parse(rawText),
    sha256: createHash("sha256").update(rawText, "utf8").digest("hex"),
  };
}

function normalizeRawEntry(entry) {
  return {
    ...entry,
    typeLine: String(entry.type_line ?? entry.details?.type ?? ""),
    oracleText: String(entry.details?.oracle_text ?? ""),
    tags: Array.isArray(entry.tags) ? entry.tags.map((tag) => String(tag).toLowerCase()) : [],
  };
}

function createCardResolver(rawCube, cubeKey, masterCardsByOracleId = {}) {
  const cards = rawCube.cards.mainboard.map(normalizeRawEntry);
  const byName = new Map();
  const byOracleId = new Map();
  for (const entry of cards) {
    byName.set(entry.details.name, entry);
    byOracleId.set(entry.details.oracle_id, entry);
    const canonicalName = masterCardsByOracleId[entry.details.oracle_id]?.name;
    if (canonicalName && !byName.has(canonicalName)) {
      byName.set(canonicalName, entry);
    }
  }

  return {
    all: cards,
    byOracleId,
    require(name) {
      const entry = byName.get(name);
      if (!entry) throw new Error(`${cubeKey}: missing curated card ${name}`);
      return entry;
    },
  };
}

function mergeCard(target, entry, definition) {
  const oracleId = entry.details.oracle_id;
  const existing = target.get(oracleId);
  if (!existing) {
    target.set(oracleId, {
      oracleId,
      name: entry.details.name,
      strength: definition.strength,
      roles: [...definition.roles],
      families: [...definition.families],
      evidence: [definition.evidence],
      confidence: definition.confidence,
    });
    return;
  }

  existing.strength = existing.strength === "key" ? "key" : definition.strength;
  const confidenceRank = { A: 4, B: 3, C: 2, D: 1 };
  if (confidenceRank[definition.confidence] > confidenceRank[existing.confidence]) {
    existing.confidence = definition.confidence;
  }
  existing.roles = [...new Set([...existing.roles, ...definition.roles])];
  existing.families = [...new Set([...existing.families, ...definition.families])];
  if (!existing.evidence.some((evidence) => evidence.detail === definition.evidence.detail)) {
    existing.evidence.push(definition.evidence);
  }
}

function addNamedCards(target, resolver, names, definition) {
  for (const name of names) mergeCard(target, resolver.require(name), definition);
}

function makeDocument(cubeKey, cubeSnapshotId, sourceRawSha256, archetypes) {
  return {
    schemaVersion: 1,
    modelVersion: "archetype-synergy@2",
    cubeKey,
    cubeSnapshotId,
    provenance: {
      sourceRawSha256,
      generatorVersion: "build-archetype-synergy-profiles@2",
    },
    archetypes,
  };
}

async function buildTitouProfile(masterCards) {
  const cubeKey = "titou_tribal";
  const rawSource = await readJsonSource(`data/cubes/${cubeKey}/cubecobra-raw.json`);
  const raw = rawSource.value;
  const meta = await readJson(`data/cubes/${cubeKey}/cube-meta.json`);
  const resolver = createCardResolver(raw, cubeKey, masterCards);
  const glue = meta.archetypes.find((archetype) => archetype.id === "titou:tribal_glue");
  const bridgeEntries = [...glue.keyCards, ...glue.supportCards]
    .map((oracleId) => resolver.byOracleId.get(oracleId))
    .filter(Boolean);
  const tribeDefinitions = {
    "titou:tribal_goblins": { types: ["Goblin"], densityMinimum: 7 },
    "titou:tribal_vampires": { types: ["Vampire"], densityMinimum: 7 },
    "titou:tribal_elves": { types: ["Elf"], densityMinimum: 7 },
    "titou:tribal_werewolves": { types: ["Werewolf", "Wolf"], densityMinimum: 6 },
    "titou:tribal_angels": { types: ["Angel", "Cleric"], densityMinimum: 6 },
    "titou:tribal_dragons": { types: ["Dragon"], densityMinimum: 6 },
    "titou:tribal_humans": {
      types: ["Human"],
      densityMinimum: 8,
      excludedNames: new Set([
        "Tovolar, Dire Overlord",
        "Tovolar's Huntmaster",
        "Huntmaster of the Fells",
        "Mayor of Avabruck",
        "Avabruck Caretaker",
        "Kessig Naturalist",
        "Reckless Stormseeker",
        "Duskwatch Recruiter",
        "Werewolf Pack Leader",
        "Master of the Wild Hunt",
        "Kessig Cagebreakers",
        "Nekrataal",
        "Ophiomancer",
        "Jadar, Ghoulcaller of Nephalia",
        "Hostage Taker",
        "Cabal Slaver",
        "Chevill, Bane of Monsters",
        "Kaalia of the Vast",
        "Dragonmaster Outcast",
        "Goro-Goro and Satoru",
        "Grim Lavamancer",
        "Mai, Scornful Striker",
      ]),
    },
    "titou:tribal_wizards": {
      types: ["Wizard"],
      densityMinimum: 6,
      excludedNames: new Set([
        "Voldaren Bloodcaster",
        "Jadar, Ghoulcaller of Nephalia",
        "Jodah, the Unifier",
      ]),
    },
  };

  const tribalArchetypes = meta.archetypes
    .filter(
      (archetype) =>
        archetype.id !== "titou:tribal_glue" && archetype.id !== "titou:chromatic_legends",
    )
    .map((archetype) => {
      const definition = tribeDefinitions[archetype.id];
      if (!definition) throw new Error(`Missing Titou tribe definition for ${archetype.id}`);
      const cards = new Map();
      const typePattern = new RegExp(`\\b(?:${definition.types.join("|")})s?\\b`, "i");
      const excluded = definition.excludedNames ?? new Set();

      for (const oracleId of archetype.keyCards) {
        const entry = resolver.byOracleId.get(oracleId);
        if (!entry) throw new Error(`${cubeKey}: unresolved key card ${oracleId}`);
        const isTribalBody = typePattern.test(entry.typeLine);
        mergeCard(cards, entry, {
          strength: "key",
          roles: isTribalBody ? ["payoff", "body"] : ["payoff"],
          families: isTribalBody ? ["payoff", "density"] : ["payoff"],
          evidence: {
            source: "owner_description",
            detail: `Carte clé déclarée par le profil du cube pour ${archetype.name}.`,
          },
          confidence: "A",
        });
      }

      for (const oracleId of archetype.supportCards) {
        const entry = resolver.byOracleId.get(oracleId);
        if (!entry) throw new Error(`${cubeKey}: unresolved support card ${oracleId}`);
        const isTribalBody = typePattern.test(entry.typeLine);
        mergeCard(cards, entry, {
          strength: "support",
          roles: isTribalBody ? ["enabler", "body"] : ["enabler"],
          families: isTribalBody ? ["support", "density"] : ["support"],
          evidence: {
            source: "owner_description",
            detail: `Carte support déclarée par le profil du cube pour ${archetype.name}.`,
          },
          confidence: "A",
        });
      }

      for (const entry of resolver.all.filter(
        (candidate) =>
          typePattern.test(candidate.typeLine) && !excluded.has(candidate.details.name),
      )) {
        mergeCard(cards, entry, {
          strength: "support",
          roles: ["body"],
          families: ["density"],
          evidence: {
            source: "oracle_rule",
            detail: `${entry.typeLine} contribue à la masse critique ${definition.types.join("/")}.`,
          },
          confidence: "B",
        });
      }

      for (const entry of resolver.all.filter(
        (candidate) =>
          !typePattern.test(candidate.typeLine) &&
          !excluded.has(candidate.details.name) &&
          candidate.tags.some((tag) => definition.types.some((type) => tag === type.toLowerCase())),
      )) {
        mergeCard(cards, entry, {
          strength: "support",
          roles: ["enabler"],
          families: ["support"],
          evidence: {
            source: "owner_tag",
            detail: `Tag propriétaire reliant la carte au plan ${definition.types.join("/")}.`,
          },
          confidence: "C",
        });
      }

      for (const entry of bridgeEntries) {
        const isUniversalBody =
          /\bchangeling\b/iu.test(entry.oracleText) ||
          /\bcreature\b/iu.test(entry.typeLine) ||
          /\bbecomes? a .*creature\b/iu.test(entry.oracleText);
        mergeCard(cards, entry, {
          strength: "support",
          roles: ["bridge"],
          families: isUniversalBody ? ["support", "density"] : ["support"],
          evidence: {
            source: "owner_description",
            detail: "Carte de liant universel déclarée par le propriétaire du cube.",
          },
          confidence: "A",
        });
      }

      return {
        id: archetype.id,
        name: archetype.name,
        targetPoints: 18,
        requiredFamilies: [
          { id: "payoff", name: "Payoff ou moteur tribal", minimum: 1 },
          { id: "support", name: "Support ou liant du plan", minimum: 1 },
          { id: "density", name: "Masse critique de la tribu", minimum: definition.densityMinimum },
        ],
        cards: [...cards.values()].sort((a, b) => a.name.localeCompare(b.name)),
      };
    });

  const chromaticMeta = meta.archetypes.find(
    (archetype) => archetype.id === "titou:chromatic_legends",
  );
  const archetypes = [...tribalArchetypes];
  if (chromaticMeta) {
    const chromaticCards = new Map();
    for (const oracleId of chromaticMeta.keyCards) {
      const entry = resolver.byOracleId.get(oracleId);
      if (!entry) throw new Error(`${cubeKey}: unresolved chromatic key card ${oracleId}`);
      mergeCard(chromaticCards, entry, {
        strength: "key",
        roles: ["payoff"],
        families: ["payoff"],
        evidence: {
          source: "owner_description",
          detail: `Payoff chromatique ou légende pentacolore pour ${chromaticMeta.name}.`,
        },
        confidence: "A",
      });
    }
    for (const oracleId of chromaticMeta.supportCards) {
      const entry = resolver.byOracleId.get(oracleId);
      if (!entry) throw new Error(`${cubeKey}: unresolved chromatic support card ${oracleId}`);
      mergeCard(chromaticCards, entry, {
        strength: "support",
        roles: ["fixer", "mana"],
        families: ["fixing"],
        evidence: {
          source: "owner_description",
          detail: `Fixeur ou support multicolore pour ${chromaticMeta.name}.`,
        },
        confidence: "A",
      });
    }
    for (const entry of resolver.all.filter((candidate) =>
      candidate.tags.includes("colourenabler"),
    )) {
      mergeCard(chromaticCards, entry, {
        strength: "support",
        roles: ["fixer"],
        families: ["fixing"],
        evidence: {
          source: "owner_tag",
          detail: "Tag propriétaire colourEnabler facilitant le plan 5-Couleurs.",
        },
        confidence: "B",
      });
    }
    archetypes.push({
      id: chromaticMeta.id,
      name: chromaticMeta.name,
      targetPoints: 15,
      requiredFamilies: [
        { id: "payoff", name: "Légende multicolore ou payoff chromatique", minimum: 2 },
        { id: "fixing", name: "Fixeur chromatique ou accélérateur multicolore", minimum: 3 },
      ],
      cards: [...chromaticCards.values()].sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return makeDocument(cubeKey, meta.activeSnapshotId, rawSource.sha256, archetypes);
}

function createCuratedArchetype(resolver, definition) {
  const cards = new Map();
  for (const group of definition.groups) {
    addNamedCards(cards, resolver, group.names, {
      strength: group.strength,
      roles: group.roles,
      families: group.families,
      evidence: {
        source: "curated_inference",
        detail: group.evidence,
      },
      confidence: group.confidence ?? "B",
    });
  }
  return {
    id: definition.id,
    name: definition.name,
    targetPoints: definition.targetPoints,
    requiredFamilies: definition.requiredFamilies,
    cards: [...cards.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

const KEY_CARD_RANGE = [4, 10];
const MAX_SUPPORT_CARDS = 28;

// cube-meta.json keeps a projection of the curated archetypes: the curation module is the
// single source of truth for their colours, plan and key/support cards.
function projectMetaArchetype(curated, profileArchetype, resolver) {
  const cardsByOracleId = new Map(profileArchetype.cards.map((card) => [card.oracleId, card]));
  const orderedCards = [
    ...new Set(
      curated.groups
        .flatMap((group) => group.names)
        .map((name) => resolver.require(name).details.oracle_id),
    ),
  ].map((oracleId) => cardsByOracleId.get(oracleId));
  const keyCards = orderedCards.filter((card) => card.strength === "key");
  const supportCards = orderedCards.filter((card) => card.strength === "support");
  if (keyCards.length < KEY_CARD_RANGE[0] || keyCards.length > KEY_CARD_RANGE[1]) {
    throw new Error(
      `${curated.id}: ${String(keyCards.length)} key cards outside ${KEY_CARD_RANGE}`,
    );
  }
  if (supportCards.length > MAX_SUPPORT_CARDS) {
    throw new Error(`${curated.id}: ${String(supportCards.length)} support cards`);
  }
  return {
    id: curated.id,
    name: curated.name,
    primaryColors: curated.primaryColors,
    ...(curated.splashColors ? { splashColors: curated.splashColors } : {}),
    category: curated.category,
    description: curated.description,
    gameplan: curated.gameplan,
    keyCards: keyCards.map((card) => card.oracleId),
    supportCards: supportCards.map((card) => card.oracleId),
    recommendedCreatureCount: curated.recommendedCreatureCount,
    recommendedRemovalCount: curated.recommendedRemovalCount,
  };
}

async function buildCuratedCube(curation, masterCards) {
  const { cubeKey } = curation;
  const rawSource = await readJsonSource(`data/cubes/${cubeKey}/cubecobra-raw.json`);
  const meta = await readJson(`data/cubes/${cubeKey}/cube-meta.json`);
  const resolver = createCardResolver(rawSource.value, cubeKey, masterCards);
  const profileArchetypes = curation.archetypes.map((definition) =>
    createCuratedArchetype(resolver, definition),
  );

  const curatedMeta = curation.archetypes.map((definition, index) =>
    projectMetaArchetype(definition, profileArchetypes[index], resolver),
  );
  const passthrough = meta.archetypes.filter((archetype) =>
    curation.passthroughArchetypeIds.includes(archetype.id),
  );
  const metaDocument = {
    ...meta,
    ...curation.metaOverrides,
    archetypes: [...curatedMeta, ...passthrough],
  };

  return {
    profile: makeDocument(cubeKey, meta.activeSnapshotId, rawSource.sha256, profileArchetypes),
    meta: metaDocument,
  };
}

async function emit(outputPath, document, label) {
  const serialized = `${JSON.stringify(document, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const current = await readFile(outputPath, "utf8").catch(() => "");
    if (current !== serialized) {
      console.error(`Outdated ${label}: ${outputPath}`);
      return true;
    }
    return false;
  }
  await writeFile(outputPath, serialized, "utf8");
  console.log(`Wrote ${outputPath}`);
  return false;
}

const masterData = await readJson("data/cards/master-cards.json");
const masterCards = masterData.cards || {};

const curatedCubes = await Promise.all(
  [cedricCuration, huguesCuration, titouPeasantCuration, nicoCuration].map(async (curation) => ({
    cubeKey: curation.cubeKey,
    ...(await buildCuratedCube(curation, masterCards)),
  })),
);

let hasDrift = false;
for (const [cubeKey, document] of [
  ["titou_tribal", await buildTitouProfile(masterCards)],
  ...curatedCubes.map(({ cubeKey, profile }) => [cubeKey, profile]),
]) {
  const outputPath = resolve(rootDir, `data/cubes/${cubeKey}/archetype-synergy-v1.json`);
  hasDrift = (await emit(outputPath, document, "archetype synergy profile")) || hasDrift;
}
for (const { cubeKey, meta } of curatedCubes) {
  const outputPath = resolve(rootDir, `data/cubes/${cubeKey}/cube-meta.json`);
  hasDrift = (await emit(outputPath, meta, "cube meta archetypes")) || hasDrift;
}

if (hasDrift) process.exitCode = 1;
