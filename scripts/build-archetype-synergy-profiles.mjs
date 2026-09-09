import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");

async function readJson(path) {
  return JSON.parse(await readFile(resolve(rootDir, path), "utf8"));
}

function createCardResolver(rawCube, cubeKey) {
  const cards = rawCube.cards.mainboard;
  const byName = new Map(cards.map((entry) => [entry.details.name, entry]));
  const byOracleId = new Map(cards.map((entry) => [entry.details.oracle_id, entry]));

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

function makeDocument(cubeKey, cubeSnapshotId, archetypes) {
  return {
    schemaVersion: 1,
    modelVersion: "archetype-synergy@1",
    cubeKey,
    cubeSnapshotId,
    archetypes,
  };
}

async function buildTitouProfile() {
  const cubeKey = "titou_tribal";
  const raw = await readJson(`data/cubes/${cubeKey}/cubecobra-raw.json`);
  const meta = await readJson(`data/cubes/${cubeKey}/cube-meta.json`);
  const resolver = createCardResolver(raw, cubeKey);
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
    "titou:tribal_humans": { types: ["Human"], densityMinimum: 8 },
  };

  const archetypes = meta.archetypes
    .filter((archetype) => archetype.id !== "titou:tribal_glue")
    .map((archetype) => {
      const definition = tribeDefinitions[archetype.id];
      if (!definition) throw new Error(`Missing Titou tribe definition for ${archetype.id}`);
      const cards = new Map();
      const typePattern = new RegExp(`\\b(?:${definition.types.join("|")})s?\\b`, "i");

      for (const oracleId of archetype.keyCards) {
        const entry = resolver.byOracleId.get(oracleId);
        if (!entry) throw new Error(`${cubeKey}: unresolved key card ${oracleId}`);
        const isTribalBody = typePattern.test(entry.type_line);
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

      for (const entry of resolver.all.filter(
        (candidate) =>
          typePattern.test(candidate.type_line) ||
          (candidate.tags ?? []).some((tag) =>
            definition.types.some((type) => tag === type.toLowerCase()),
          ),
      )) {
        mergeCard(cards, entry, {
          strength: "support",
          roles: ["body"],
          families: ["density"],
          evidence: {
            source: entry.tags.length > 0 ? "owner_tag" : "oracle_rule",
            detail: `${entry.type_line} contribue à la masse critique ${definition.types.join("/")}.`,
          },
          confidence: "A",
        });
      }

      for (const entry of bridgeEntries) {
        mergeCard(cards, entry, {
          strength: "support",
          roles: ["bridge"],
          families: ["density"],
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
          { id: "density", name: "Masse critique de la tribu", minimum: definition.densityMinimum },
        ],
        cards: [...cards.values()].sort((a, b) => a.name.localeCompare(b.name)),
      };
    });

  return makeDocument(cubeKey, meta.activeSnapshotId, archetypes);
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

async function buildNicoProfile() {
  const cubeKey = "nico_candyshop";
  const raw = await readJson(`data/cubes/${cubeKey}/cubecobra-raw.json`);
  const meta = await readJson(`data/cubes/${cubeKey}/cube-meta.json`);
  const resolver = createCardResolver(raw, cubeKey);
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
          ],
          strength: "support",
          roles: ["velocity"],
          families: ["velocity"],
          evidence: "Prolonge la chaîne de sorts ou rejoue le cimetière.",
        },
        {
          names: ["Brain Freeze", "Tendrils of Agony", "Underworld Breach"],
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
            "Black Lotus",
            "Mox Pearl",
            "Mox Sapphire",
            "Mox Jet",
            "Mox Ruby",
            "Mox Emerald",
            "Mishra's Workshop",
            "Metalworker",
          ],
          strength: "support",
          roles: ["mana", "fodder"],
          families: ["fodder"],
          evidence: "Accélère le plan artefact ou fournit une ressource à convertir.",
        },
        {
          names: ["Tinker", "Goblin Welder", "Goblin Engineer", "Kuldotha Forgemaster"],
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
            "Blightsteel Colossus",
            "Bolas's Citadel",
            "Kappa Cannoneer",
          ],
          strength: "key",
          roles: ["payoff"],
          families: ["payoff"],
          evidence: "Récompense directement une forte densité d'artefacts.",
          confidence: "A",
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
          names: ["Entomb", "Faithless Looting", "Collective Brutality", "Frantic Search"],
          strength: "support",
          roles: ["outlet"],
          families: ["outlet"],
          evidence: "Place volontairement une cible au cimetière.",
        },
        {
          names: ["Reanimate", "Animate Dead", "Exhume", "Necromancy"],
          strength: "key",
          roles: ["enabler", "recursion"],
          families: ["reanimation"],
          evidence: "Remet une créature du cimetière sur le champ de bataille.",
          confidence: "A",
        },
        {
          names: ["Griselbrand", "Archon of Cruelty", "Atraxa, Grand Unifier"],
          strength: "key",
          roles: ["target", "payoff"],
          families: ["target"],
          evidence: "Cible à très fort impact pour contourner son coût de mana.",
          confidence: "A",
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
          names: ["Imperial Recruiter"],
          strength: "support",
          roles: ["velocity"],
          families: [],
          evidence: "Trouve l'une des créatures nécessaires sans remplacer une pièce de combo.",
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
          names: ["Fastbond", "Zuran Orb", "Strip Mine", "Wrenn and Six"],
          strength: "support",
          roles: ["enabler"],
          families: ["enabler"],
          evidence: "Accélère, sacrifie ou exploite les terrains comme ressource.",
        },
        {
          names: ["Crucible of Worlds", "Ramunap Excavator", "Wrenn and Six"],
          strength: "key",
          roles: ["recursion"],
          families: ["recursion"],
          evidence: "Permet de rejouer les terrains depuis le cimetière.",
          confidence: "A",
        },
        {
          names: ["Dark Depths", "Thespian's Stage", "Titania, Protector of Argoth"],
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
            "Birds of Paradise",
            "Rofellos, Llanowar Emissary",
            "Noble Hierarch",
            "Arbor Elf",
          ],
          strength: "support",
          roles: ["mana"],
          families: ["mana"],
          evidence: "Accélère la production de mana du plan vert.",
        },
        {
          names: ["Natural Order", "Channel"],
          strength: "key",
          roles: ["enabler"],
          families: ["enabler"],
          evidence: "Convertit une ressource précoce en menace de haut de courbe.",
          confidence: "A",
        },
        {
          names: ["Craterhoof Behemoth", "Primeval Titan", "Woodfall Primus", "Terastodon"],
          strength: "key",
          roles: ["target", "payoff"],
          families: ["target"],
          evidence: "Menace qui récompense l'accélération ou la mise en jeu contournée.",
          confidence: "A",
        },
      ],
    },
  ];

  return makeDocument(
    cubeKey,
    meta.activeSnapshotId,
    definitions.map((definition) => createNicoArchetype(resolver, definition)),
  );
}

let hasDrift = false;
for (const [cubeKey, document] of [
  ["titou_tribal", await buildTitouProfile()],
  ["nico_candyshop", await buildNicoProfile()],
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
