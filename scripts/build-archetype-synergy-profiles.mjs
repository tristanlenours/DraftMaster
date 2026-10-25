import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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

function createNicoArchetype(resolver, definition) {
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

async function buildNicoProfile(masterCards) {
  const cubeKey = "nico_candyshop";
  const rawSource = await readJsonSource(`data/cubes/${cubeKey}/cubecobra-raw.json`);
  const raw = rawSource.value;
  const meta = await readJson(`data/cubes/${cubeKey}/cube-meta.json`);
  const resolver = createCardResolver(raw, cubeKey, masterCards);
  const definitions = [
    {
      id: "nico:storm_combo",
      name: "Izzet / Grixis Storm",
      targetPoints: 15,
      requiredFamilies: [
        { id: "mana", name: "Mana explosif", minimum: 2 },
        { id: "velocity", name: "Pioche et recyclage", minimum: 2 },
        { id: "payoff", name: "Condition de victoire Storm", minimum: 1 },
      ],
      groups: [
        {
          names: [
            "Dark Ritual",
            "Cabal Ritual",
            "High Tide",
            "Desperate Ritual",
            "Pyretic Ritual",
            "Seething Song",
            "Manamorphose",
            "Lion's Eye Diamond",
            "Lotus Bloom",
          ],
          strength: "support",
          roles: ["mana"],
          families: ["mana"],
          evidence: "Produit un surplus de mana pendant le tour de combo.",
        },
        {
          names: [
            "Wheel of Fortune",
            "Timetwister",
            "Yawgmoth's Will",
            "Frantic Search",
            "Turnabout",
            "Time Spiral",
            "Underworld Breach",
            "Brainstorm",
            "Ponder",
            "Preordain",
            "Gitaxian Probe",
            "Demonic Tutor",
            "Vampiric Tutor",
            "Mystical Tutor",
            "Imperial Seal",
          ],
          strength: "support",
          roles: ["velocity"],
          families: ["velocity"],
          evidence: "Prolonge la chaîne de sorts, sélectionne les pièces ou rejoue le cimetière.",
        },
        {
          names: ["Brain Freeze", "Tendrils of Agony", "Underworld Breach", "Mind's Desire"],
          strength: "key",
          roles: ["payoff", "combo_piece"],
          families: ["payoff"],
          evidence: "Convertit la chaîne de sorts en condition de victoire.",
          confidence: "A",
        },
      ],
    },
    {
      id: "nico:artifact_ramp",
      name: "Mono-Blue / Colorless Artifacts",
      targetPoints: 16,
      requiredFamilies: [
        { id: "fodder", name: "Artefacts et accélérateurs", minimum: 3 },
        { id: "enabler", name: "Moteur de conversion", minimum: 1 },
        { id: "payoff", name: "Menace ou moteur artefact", minimum: 1 },
      ],
      groups: [
        {
          names: [
            "Sol Ring",
            "Mana Vault",
            "Mana Crypt",
            "Grim Monolith",
            "Black Lotus",
            "Mox Pearl",
            "Mox Sapphire",
            "Mox Jet",
            "Mox Ruby",
            "Mox Emerald",
            "Mishra's Workshop",
            "Ancient Tomb",
            "Metalworker",
          ],
          strength: "support",
          roles: ["mana", "fodder"],
          families: ["fodder"],
          evidence: "Accélère le plan artefact ou fournit une ressource à convertir.",
        },
        {
          names: [
            "Tinker",
            "Goblin Welder",
            "Goblin Engineer",
            "Kuldotha Forgemaster",
            "Emry, Lurker of the Loch",
            "Tezzeret the Seeker",
          ],
          strength: "key",
          roles: ["enabler"],
          families: ["enabler"],
          evidence: "Transforme les petits artefacts en ressource ou menace décisive.",
          confidence: "A",
        },
        {
          names: [
            "Urza, Lord High Artificer",
            "Tolarian Academy",
            "Urza's Saga",
            "Blightsteel Colossus",
            "Bolas's Citadel",
            "Kappa Cannoneer",
            "Simulacrum Synthesizer",
          ],
          strength: "key",
          roles: ["payoff"],
          families: ["payoff"],
          evidence: "Récompense directement une forte densité d'artefacts.",
          confidence: "A",
        },
        {
          names: [
            "Karn, Scion of Urza",
            "Wurmcoil Engine",
            "Myr Battlesphere",
            "Sundering Titan",
            "Cityscape Leveler",
            "Thought Monitor",
          ],
          strength: "support",
          roles: ["payoff", "target"],
          families: ["payoff"],
          evidence: "Menace ou moteur artefact stabilisant le plan ramp/Tinker.",
        },
      ],
    },
    {
      id: "nico:reanimator",
      name: "Reanimator",
      targetPoints: 13,
      requiredFamilies: [
        { id: "outlet", name: "Mise au cimetière", minimum: 1 },
        { id: "reanimation", name: "Effet de réanimation", minimum: 1 },
        { id: "target", name: "Cible à réanimer", minimum: 1 },
      ],
      groups: [
        {
          names: [
            "Entomb",
            "Faithless Looting",
            "Collective Brutality",
            "Frantic Search",
            "Bone Shards",
            "Bitter Triumph",
            "Chart a Course",
            "Jace, Vryn's Prodigy",
            "Ledger Shredder",
            "Liliana of the Veil",
            "Malcolm, Alluring Scoundrel",
            "Psychic Frog",
            "Smuggler's Copter",
          ],
          strength: "support",
          roles: ["outlet"],
          families: ["outlet"],
          evidence: "Place volontairement une cible au cimetière.",
        },
        {
          names: [
            "Reanimate",
            "Animate Dead",
            "Exhume",
            "Necromancy",
            "Persist",
            "Recurring Nightmare",
            "Corpse Dance",
            "Life // Death",
          ],
          strength: "key",
          roles: ["enabler", "recursion"],
          families: ["reanimation"],
          evidence: "Remet une créature du cimetière sur le champ de bataille.",
          confidence: "A",
        },
        {
          names: [
            "Griselbrand",
            "Archon of Cruelty",
            "Atraxa, Grand Unifier",
            "Ashen Rider",
            "Serra's Emissary",
            "Sundering Titan",
            "Woodfall Primus",
            "Terastodon",
            "Vaultborn Tyrant",
            "Titan of Industry",
            "Etali, Primal Conqueror",
            "Torsten, Founder of Benalia",
            "Craterhoof Behemoth",
          ],
          strength: "key",
          roles: ["target", "payoff"],
          families: ["target"],
          evidence: "Cible à très fort impact pour contourner son coût de mana.",
          confidence: "A",
        },
        {
          names: [
            "Crabomination",
            "Noxious Gearhulk",
            "Grave Titan",
            "Myr Battlesphere",
            "Cityscape Leveler",
            "Wurmcoil Engine",
            "Inferno Titan",
            "Sun Titan",
            "Torrential Gearhulk",
            "Trumpeting Carnosaur",
            "Troll of Khazad-dûm",
          ],
          strength: "support",
          roles: ["target", "payoff"],
          families: ["target"],
          evidence: "Menace de haut de courbe valorisée par une réanimation précoce.",
        },
      ],
    },
    {
      id: "nico:sneak_show",
      name: "Sneak Attack / Show and Tell",
      targetPoints: 12,
      requiredFamilies: [
        { id: "enabler", name: "Mise en jeu contournant le coût", minimum: 1 },
        { id: "target", name: "Menace à tricher en jeu", minimum: 2 },
      ],
      groups: [
        {
          names: [
            "Show and Tell",
            "Sneak Attack",
            "Through the Breach",
            "Monster Manual",
            "Oath of Druids",
            "Channel",
          ],
          strength: "key",
          roles: ["enabler"],
          families: ["enabler"],
          evidence: "Met en jeu une menace en contournant son coût normal.",
          confidence: "A",
        },
        {
          names: [
            "Emrakul, the Aeons Torn",
            "Atraxa, Grand Unifier",
            "Griselbrand",
            "Archon of Cruelty",
            "Blightsteel Colossus",
            "Etali, Primal Conqueror",
            "Sundering Titan",
            "Woodfall Primus",
            "Terastodon",
            "Vaultborn Tyrant",
            "Serra's Emissary",
            "Ashen Rider",
            "Torsten, Founder of Benalia",
            "Kozilek, Butcher of Truth",
          ],
          strength: "support",
          roles: ["target", "payoff"],
          families: ["target"],
          evidence: "Menace dont le coût élevé est contourné par le moteur.",
        },
      ],
    },
    {
      id: "nico:twin_kiki",
      name: "Twin / Kiki Combo",
      targetPoints: 8,
      requiredFamilies: [
        { id: "copier", name: "Copieur répétable", minimum: 1 },
        { id: "untapper", name: "Créature qui dégage le copieur", minimum: 1 },
      ],
      groups: [
        {
          names: ["Splinter Twin", "Kiki-Jiki, Mirror Breaker"],
          strength: "key",
          roles: ["combo_piece"],
          families: ["copier"],
          evidence: "Crée une copie avec la célérité de manière répétable.",
          confidence: "A",
        },
        {
          names: ["Pestermite", "Deceiver Exarch", "Restoration Angel", "Zealous Conscripts"],
          strength: "key",
          roles: ["combo_piece"],
          families: ["untapper"],
          evidence: "Dégage ou réinitialise le copieur pour former une boucle.",
          confidence: "A",
        },
        {
          names: [
            "Imperial Recruiter",
            "Recruiter of the Guard",
            "Fable of the Mirror-Breaker",
            "Teferi, Time Raveler",
            "Remand",
            "Memory Lapse",
            "Counterspell",
            "Snapcaster Mage",
          ],
          strength: "support",
          roles: ["velocity", "interaction"],
          families: [],
          evidence: "Trouve ou protège les pièces de combo sans remplacer une brique obligatoire.",
        },
      ],
    },
    {
      id: "nico:blink",
      name: "Azorius Blink / Value",
      targetPoints: 13,
      requiredFamilies: [
        { id: "enabler", name: "Effet de blink", minimum: 2 },
        { id: "target", name: "Permanent à effet d'arrivée", minimum: 2 },
      ],
      groups: [
        {
          names: [
            "Ephemerate",
            "Soulherder",
            "Flickerwisp",
            "Restoration Angel",
            "Phelia, Exuberant Shepherd",
            "Charming Prince",
            "Displacer Kitten",
          ],
          strength: "key",
          roles: ["enabler"],
          families: ["enabler"],
          evidence: "Exile puis renvoie un permanent pour répéter ses effets.",
          confidence: "A",
        },
        {
          names: [
            "Solitude",
            "Palace Jailer",
            "Recruiter of the Guard",
            "Flickerwisp",
            "Restoration Angel",
            "Charming Prince",
            "White Plume Adventurer",
            "Seasoned Dungeoneer",
            "Skyclave Apparition",
            "Elite Spellbinder",
            "Phlage, Titan of Fire's Fury",
            "Snapcaster Mage",
            "Baleful Strix",
            "Thraben Inspector",
            "Blade Splicer",
            "Teferi, Time Raveler",
          ],
          strength: "support",
          roles: ["target"],
          families: ["target"],
          evidence: "Produit une nouvelle valeur lorsqu'il revient sur le champ de bataille.",
        },
      ],
    },
    {
      id: "nico:lands",
      name: "Lands / Graveyard Lands",
      targetPoints: 12,
      requiredFamilies: [
        { id: "enabler", name: "Accélération ou sacrifice de terrains", minimum: 1 },
        { id: "recursion", name: "Récursion de terrains", minimum: 1 },
        { id: "payoff", name: "Payoff de terrains", minimum: 1 },
      ],
      groups: [
        {
          names: [
            "Fastbond",
            "Zuran Orb",
            "Strip Mine",
            "Wasteland",
            "Boseiju, Who Endures",
            "Urza's Saga",
            "Wrenn and Six",
            "Knight of the Reliquary",
            "Elvish Reclaimer",
            "Oracle of Mul Daya",
            "Courser of Kruphix",
            "Dryad of the Ilysian Grove",
            "Expedition Map",
            "Explore",
          ],
          strength: "support",
          roles: ["enabler"],
          families: ["enabler"],
          evidence: "Accélère, tutorise, sacrifie ou exploite les terrains comme ressource.",
        },
        {
          names: ["Crucible of Worlds", "Ramunap Excavator", "Wrenn and Six", "Six"],
          strength: "key",
          roles: ["recursion"],
          families: ["recursion"],
          evidence: "Permet de rejouer les terrains depuis le cimetière.",
          confidence: "A",
        },
        {
          names: [
            "Dark Depths",
            "Thespian's Stage",
            "Titania, Protector of Argoth",
            "Springheart Nantuko",
            "Omnath, Locus of Creation",
            "Tatyova, Benthic Druid",
            "Lotus Cobra",
          ],
          strength: "key",
          roles: ["payoff", "combo_piece"],
          families: ["payoff"],
          evidence: "Convertit les synergies de terrains en avantage décisif.",
          confidence: "A",
        },
      ],
    },
    {
      id: "nico:green_ramp",
      name: "Green Ramp / Natural Order",
      targetPoints: 14,
      requiredFamilies: [
        { id: "mana", name: "Accélération verte", minimum: 2 },
        { id: "enabler", name: "Moteur de conversion", minimum: 1 },
        { id: "target", name: "Menace de haut de courbe", minimum: 1 },
      ],
      groups: [
        {
          names: [
            "Gaea's Cradle",
            "Llanowar Elves",
            "Elvish Mystic",
            "Fyndhorn Elves",
            "Birds of Paradise",
            "Rofellos, Llanowar Emissary",
            "Noble Hierarch",
            "Ignoble Hierarch",
            "Delighted Halfling",
            "Arbor Elf",
            "Joraga Treespeaker",
            "Fanatic of Rhonas",
            "Nissa, Who Shakes the World",
            "Sylvan Library",
            "The Great Henge",
          ],
          strength: "support",
          roles: ["mana"],
          families: ["mana"],
          evidence: "Accélère la production de mana et la vélocité du plan vert.",
        },
        {
          names: ["Natural Order", "Channel", "Green Sun's Zenith"],
          strength: "key",
          roles: ["enabler"],
          families: ["enabler"],
          evidence: "Convertit une ressource précoce en menace de haut de courbe.",
          confidence: "A",
        },
        {
          names: [
            "Craterhoof Behemoth",
            "Primeval Titan",
            "Woodfall Primus",
            "Terastodon",
            "Vaultborn Tyrant",
            "Titan of Industry",
            "Ugin, the Spirit Dragon",
          ],
          strength: "key",
          roles: ["target", "payoff"],
          families: ["target"],
          evidence: "Menace qui récompense l'accélération ou la mise en jeu contournée.",
          confidence: "A",
        },
      ],
    },
    {
      id: "nico:boros_aggro",
      name: "Boros / Red Aggro & Initiative",
      targetPoints: 14,
      requiredFamilies: [
        { id: "threat", name: "Menace agressive précoce", minimum: 3 },
        { id: "payoff", name: "Payoff Initiative ou finisher explosif", minimum: 1 },
        { id: "interaction", name: "Interaction ou disruption de tempo", minimum: 1 },
      ],
      groups: [
        {
          names: [
            "Ragavan, Nimble Pilferer",
            "Ocelot Pride",
            "Ajani, Nacatl Pariah",
            "Broadside Bombardiers",
            "White Plume Adventurer",
            "Caves of Chaos Adventurer",
            "Seasoned Dungeoneer",
            "Forth Eorlingas!",
            "Phlage, Titan of Fire's Fury",
          ],
          strength: "key",
          roles: ["payoff", "body"],
          families: ["payoff", "threat"],
          evidence: "Menace ou moteur d'Initiative définissant l'horloge Boros/Red Aggro.",
          confidence: "A",
        },
        {
          names: [
            "Mother of Runes",
            "Esper Sentinel",
            "Phelia, Exuberant Shepherd",
            "Adeline, Resplendent Cathar",
            "Thalia, Guardian of Thraben",
            "Goblin Rabblemaster",
            "Laelia, the Blade Reforged",
            "Inti, Seneschal of the Sun",
            "Fable of the Mirror-Breaker",
            "Skullclamp",
            "Smuggler's Copter",
            "Umezawa's Jitte",
          ],
          strength: "support",
          roles: ["body", "enabler"],
          families: ["threat"],
          evidence: "Maintient la pression sur le champ de bataille et amplifie les attaques.",
        },
        {
          names: [
            "Fury",
            "Solitude",
            "Lightning Bolt",
            "Swords to Plowshares",
            "Chain Lightning",
            "Karakas",
            "Strip Mine",
            "Wasteland",
          ],
          strength: "support",
          roles: ["interaction"],
          families: ["interaction"],
          evidence: "Élimine les bloqueurs ou étrangle le mana adverse.",
        },
      ],
    },
    {
      id: "nico:dimir_tempo",
      name: "Dimir / Grixis Tempo & Disruption",
      targetPoints: 14,
      requiredFamilies: [
        { id: "threat", name: "Menace tempo ou générateur d'avantage", minimum: 2 },
        { id: "disruption", name: "Défausse, contre ou removal économique", minimum: 3 },
      ],
      groups: [
        {
          names: [
            "Psychic Frog",
            "Orcish Bowmasters",
            "Sheoldred, the Apocalypse",
            "Dauthi Voidwalker",
            "Thoughtseize",
            "Grief",
            "Force of Will",
            "Mana Drain",
          ],
          strength: "key",
          roles: ["payoff", "interaction"],
          families: ["threat", "disruption"],
          evidence: "Pilier du plan Dimir/Grixis Tempo combinant pression et perturbation.",
          confidence: "A",
        },
        {
          names: [
            "Baleful Strix",
            "Snapcaster Mage",
            "Subtlety",
            "Brazen Borrower",
            "Ledger Shredder",
            "Malcolm, Alluring Scoundrel",
            "Fallen Shinobi",
            "Jace, the Mind Sculptor",
            "Liliana of the Veil",
          ],
          strength: "support",
          roles: ["body", "velocity"],
          families: ["threat"],
          evidence: "Menace évasive ou moteur de valeur soutenant le jeu de tempo.",
        },
        {
          names: [
            "Force of Negation",
            "Daze",
            "Counterspell",
            "Spell Pierce",
            "Memory Lapse",
            "Remand",
            "Inquisition of Kozilek",
            "Duress",
            "Hymn to Tourach",
            "Bitter Triumph",
            "Snuff Out",
          ],
          strength: "support",
          roles: ["interaction"],
          families: ["disruption"],
          evidence: "Interaction à bas coût protégeant l'avance de tempo.",
        },
      ],
    },
  ];

  return makeDocument(
    cubeKey,
    meta.activeSnapshotId,
    rawSource.sha256,
    definitions.map((definition) => createNicoArchetype(resolver, definition)),
  );
}

async function buildMetaDrivenProfile(cubeKey, masterCards) {
  const rawSource = await readJsonSource(`data/cubes/${cubeKey}/cubecobra-raw.json`);
  const raw = rawSource.value;
  const meta = await readJson(`data/cubes/${cubeKey}/cube-meta.json`);
  const resolver = createCardResolver(raw, cubeKey, masterCards);

  const archetypes = meta.archetypes
    .filter((archetype) => !archetype.id.includes("staple") && !archetype.id.includes("glue"))
    .map((archetype) => {
      const cards = new Map();
      for (const oracleId of archetype.keyCards) {
        const entry = resolver.byOracleId.get(oracleId);
        if (!entry)
          throw new Error(`${cubeKey}: unresolved key card ${oracleId} in ${archetype.id}`);
        mergeCard(cards, entry, {
          strength: "key",
          roles: ["payoff"],
          families: ["payoff"],
          evidence: {
            source: "owner_description",
            detail: `Carte clé déclarée pour ${archetype.name}.`,
          },
          confidence: "A",
        });
      }
      for (const oracleId of archetype.supportCards) {
        const entry = resolver.byOracleId.get(oracleId);
        if (!entry)
          throw new Error(`${cubeKey}: unresolved support card ${oracleId} in ${archetype.id}`);
        mergeCard(cards, entry, {
          strength: "support",
          roles: ["enabler"],
          families: ["support"],
          evidence: {
            source: "owner_description",
            detail: `Carte support déclarée pour ${archetype.name}.`,
          },
          confidence: "B",
        });
      }

      return {
        id: archetype.id,
        name: archetype.name,
        targetPoints: 14,
        requiredFamilies: [
          { id: "payoff", name: "Carte clé ou moteur du plan", minimum: 1 },
          { id: "support", name: "Support ou synergie du plan", minimum: 2 },
        ],
        cards: [...cards.values()].sort((a, b) => a.name.localeCompare(b.name)),
      };
    });

  return makeDocument(cubeKey, meta.activeSnapshotId, rawSource.sha256, archetypes);
}

const masterData = await readJson("data/cards/master-cards.json");
const masterCards = masterData.cards || {};

let hasDrift = false;
for (const [cubeKey, document] of [
  ["titou_tribal", await buildTitouProfile(masterCards)],
  ["nico_candyshop", await buildNicoProfile(masterCards)],
  ["cedric_cube", await buildMetaDrivenProfile("cedric_cube", masterCards)],
  ["hugues_pauper", await buildMetaDrivenProfile("hugues_pauper", masterCards)],
  [
    "titou_arena_peasant_plus",
    await buildMetaDrivenProfile("titou_arena_peasant_plus", masterCards),
  ],
]) {
  const outputPath = resolve(rootDir, `data/cubes/${cubeKey}/archetype-synergy-v1.json`);
  const serialized = `${JSON.stringify(document, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const current = await readFile(outputPath, "utf8").catch(() => "");
    if (current !== serialized) {
      hasDrift = true;
      console.error(`Outdated archetype synergy profile: ${outputPath}`);
    }
  } else {
    await writeFile(outputPath, serialized, "utf8");
    console.log(`Wrote ${outputPath}`);
  }
}

if (hasDrift) process.exitCode = 1;
