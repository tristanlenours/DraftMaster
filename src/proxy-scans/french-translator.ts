import type {
  ProxyCardFallbackInput,
  ProxyCardFrenchData,
  ScryfallCardFace,
  ScryfallPrint,
} from "./types.ts";

const SUPERTYPE_FR: Readonly<Record<string, string>> = {
  Basic: "de base",
  Legendary: "légendaire",
  Snow: "neigeux",
  World: "du monde",
  Ongoing: "permanent",
};

const MAIN_TYPE_FR: Readonly<Record<string, string>> = {
  Artifact: "Artefact",
  Battle: "Bataille",
  Creature: "Créature",
  Enchantment: "Enchantement",
  Instant: "Éphémère",
  Kindred: "Tribal",
  Land: "Terrain",
  Planeswalker: "Planeswalker",
  Sorcery: "Rituel",
  Tribal: "Tribal",
};

const FEMININE_MAIN_TYPES = new Set(["Creature", "Battle"]);

const SUBTYPE_FR: Readonly<Record<string, string>> = {
  // Lands
  Plains: "plaine",
  Island: "île",
  Swamp: "marais",
  Mountain: "montagne",
  Forest: "forêt",
  Desert: "désert",
  Gate: "porte",
  Locus: "locus",
  Cave: "caverne",
  Town: "ville",
  Sphere: "sphère",
  Urza: "Urza",
  "Urza's": "d'Urza",
  // Artifacts & Enchantments & Spells
  Aura: "aura",
  Background: "passé",
  Cartouche: "cartouche",
  Case: "affaire",
  Class: "classe",
  Clue: "indice",
  Curse: "malédiction",
  Equipment: "équipement",
  Food: "nourriture",
  Fortification: "fortification",
  Lesson: "leçon",
  Map: "carte",
  Role: "rôle",
  Room: "salle",
  Rune: "rune",
  Saga: "saga",
  Shrine: "sanctuaire",
  Siege: "siège",
  Treasure: "trésor",
  Vehicle: "véhicule",
  Arcane: "arcane",
  Trap: "piège",
  Adventure: "aventure",
  // Common Creature Types in Cubes
  Advisor: "conseiller",
  Ally: "allié",
  Angel: "ange",
  Ape: "singe",
  Archer: "archer",
  Artificer: "artificier",
  Assassin: "assassin",
  Avatar: "avatar",
  Barbarian: "barbare",
  Bard: "barde",
  Bat: "chauve-souris",
  Bear: "ours",
  Beast: "bête",
  Berserker: "berserker",
  Bird: "oiseau",
  Boar: "sanglier",
  Cat: "chat",
  Centaur: "centaure",
  Citizen: "citoyen",
  Cleric: "clerc",
  Construct: "construction",
  Crab: "crabe",
  Crocodile: "crocodile",
  Cyclops: "cyclope",
  Demon: "démon",
  Detective: "détective",
  Devil: "diable",
  Dinosaur: "dinosaure",
  Djinn: "djinn",
  Dog: "chien",
  Dragon: "dragon",
  Drake: "drake",
  Druid: "druide",
  Dryad: "dryade",
  Dwarf: "nain",
  Efreet: "éfrit",
  Elder: "doyen",
  Eldrazi: "eldrazi",
  Elemental: "élémental",
  Elephant: "éléphant",
  Elf: "elfe",
  Elk: "élan",
  Faerie: "fée",
  Fish: "poisson",
  Fox: "renard",
  Frog: "grenouille",
  Fungus: "fongus",
  Gargoyle: "gargouille",
  Giant: "géant",
  Gnome: "gnome",
  Goat: "chèvre",
  Goblin: "gobelin",
  God: "dieu",
  Golem: "golem",
  Gorgon: "gorgone",
  Griffin: "griffon",
  Halfling: "halfelin",
  Harpy: "harpie",
  Hippo: "hippopotame",
  Horror: "horreur",
  Horse: "cheval",
  Hound: "chien",
  Human: "humain",
  Hydra: "hydre",
  Illusion: "illusion",
  Imp: "diablotin",
  Incarnation: "incarnation",
  Insect: "insecte",
  Jackal: "chacal",
  Jellyfish: "méduse",
  Kavu: "kavu",
  Kithkin: "sangami",
  Knight: "chevalier",
  Kobold: "kobold",
  Kor: "kor",
  Kraken: "kraken",
  Leviathan: "léviathan",
  Lizard: "lézard",
  Manticore: "manticore",
  Mercenary: "mercenaire",
  Merfolk: "ondin",
  Minion: "serviteur",
  Minotaur: "minotaure",
  Monk: "moine",
  Monkey: "singe",
  Moonfolk: "sélénite",
  Mount: "monture",
  Mouse: "souris",
  Mutant: "mutant",
  Myr: "myr",
  Naga: "naga",
  Nightmare: "cauchemar",
  Ninja: "ninja",
  Noble: "noble",
  Octopus: "pieuvre",
  Ogre: "ogre",
  Ooze: "limon",
  Orc: "orque",
  Otter: "loutre",
  Ox: "bœuf",
  Pegasus: "pégase",
  Pest: "nuisible",
  Phoenix: "phénix",
  Phyrexian: "phyrexian",
  Pilot: "pilote",
  Pirate: "pirate",
  Plant: "plante",
  Praetor: "praetor",
  Rabbit: "lapin",
  Raccoon: "raton laveur",
  Ranger: "rôdeur",
  Rat: "rat",
  Rebel: "rebelle",
  Rhino: "rhinocéros",
  Robot: "robot",
  Rogue: "gredin",
  Salamander: "salamandre",
  Samurai: "samouraï",
  Saproling: "saprobionte",
  Satyr: "satyre",
  Scarecrow: "épouvantail",
  Scout: "éclaireur",
  Serpent: "serpent",
  Shade: "ombre",
  Shaman: "chamane",
  Shapeshifter: "changeforme",
  Shark: "requin",
  Sheep: "mouton",
  Skeleton: "squelette",
  Sliver: "slivoïde",
  Snake: "serpent",
  Soldier: "soldat",
  Spawn: "engeance",
  Specter: "spectre",
  Sphinx: "sphinx",
  Spider: "araignée",
  Spirit: "esprit",
  Squirrel: "écureuil",
  Thopter: "mécanoptère",
  Thrull: "thrull",
  Tiefling: "tieffelin",
  Treefolk: "sylvin",
  Troll: "troll",
  Turtle: "tortue",
  Unicorn: "licorne",
  Vampire: "vampire",
  Vedalken: "vedalken",
  Viashino: "viashino",
  Wall: "mur",
  Warlock: "démoniste",
  Warrior: "guerrier",
  Weird: "anomalie",
  Werewolf: "loup-garou",
  Whale: "baleine",
  Wizard: "sorcier",
  Wolf: "loup",
  Wolverine: "carcajou",
  Wurm: "guivre",
  Yeti: "yéti",
  Zombie: "zombie",
};

const KEYWORD_LINE_FR: readonly (readonly [RegExp, string])[] = [
  [/\bFirst strike\b/gi, "Initiative"],
  [/\bDouble strike\b/gi, "Double initiative"],
  [/\bDeathtouch\b/gi, "Contact mortel"],
  [/\bDefender\b/gi, "Défenseur"],
  [/\bFlying\b/gi, "Vol"],
  [/\bHaste\b/gi, "Célérité"],
  [/\bHexproof\b/gi, "Défense talismanique"],
  [/\bIndestructible\b/gi, "Indestructible"],
  [/\bLifelink\b/gi, "Lien de vie"],
  [/\bMenace\b/gi, "Menace"],
  [/\bProwess\b/gi, "Prouesse"],
  [/\bReach\b/gi, "Portée"],
  [/\bShroud\b/gi, "Linceul"],
  [/\bTrample\b/gi, "Piétinement"],
  [/\bVigilance\b/gi, "Vigilance"],
  [/\bFlash\b/gi, "Flash"],
  [/\bWard\b/gi, "Parade"],
  [/\bProtection from\b/gi, "Protection contre"],
  [/\bFlashback\b/gi, "Flashback"],
  [/\bCycling\b/gi, "Recyclage"],
  [/\bEquip\b/gi, "Équipement"],
  [/\bKicker\b/gi, "Kick"],
  [/\bScry (\d+)\b/gi, "Regard $1"],
  [/\bSurveil (\d+)\b/gi, "Surveillance $1"],
];

const EXACT_PHRASE_FR: readonly (readonly [RegExp, string])[] = [
  [/^Draw a card\.$/i, "Piochez une carte."],
  [/^Draw two cards\.$/i, "Piochez deux cartes."],
  [/^Draw three cards\.$/i, "Piochez trois cartes."],
  [/^Target player draws three cards\.$/i, "Le joueur ciblé pioche trois cartes."],
  [/^Counter target spell\.$/i, "Contrecarrez le sort ciblé."],
  [/^Destroy target creature\.$/i, "Détruisez la créature ciblée."],
  [/^Exile target creature\.$/i, "Exilez la créature ciblée."],
  [/^\{T\}: Add \{([WUBRGC])\}\.$/i, "{T} : Ajoutez {$1}."],
  [/^\{T\}: Add \{([WUBRGC])\} or \{([WUBRGC])\}\.$/i, "{T} : Ajoutez {$1} ou {$2}."],
  [
    /^\{T\}, Sacrifice [^:]+: Add three mana of any one color\.$/i,
    "{T}, sacrifiez cette carte : Ajoutez trois manas de la couleur de votre choix.",
  ],
];

function translateSingleTypeSide(rawSide: string): string {
  const trimmed = rawSide.trim();
  if (!trimmed) return "";

  const [leftRaw = "", rightRaw = ""] = trimmed.split(/\s+[—–-]\s+/u, 2);
  const tokens = leftRaw.split(/\s+/u).filter(Boolean);
  const supertypes: string[] = [];
  const mainTypes: string[] = [];

  for (const token of tokens) {
    if (token in SUPERTYPE_FR) {
      supertypes.push(token);
    } else if (token in MAIN_TYPE_FR) {
      mainTypes.push(token);
    } else {
      mainTypes.push(token);
    }
  }

  let mainPart: string;
  if (mainTypes.length === 2 && mainTypes[0] === "Artifact" && mainTypes[1] === "Creature") {
    mainPart = "Créature-artefact";
  } else if (
    mainTypes.length === 2 &&
    mainTypes[0] === "Enchantment" &&
    mainTypes[1] === "Creature"
  ) {
    mainPart = "Créature-enchantement";
  } else if (mainTypes.length === 2 && mainTypes[0] === "Artifact" && mainTypes[1] === "Land") {
    mainPart = "Terrain-artefact";
  } else if (
    mainTypes.length === 2 &&
    mainTypes[0] === "Enchantment" &&
    mainTypes[1] === "Artifact"
  ) {
    mainPart = "Artefact et enchantement";
  } else {
    mainPart = mainTypes.map((t) => MAIN_TYPE_FR[t] ?? t).join(" ");
  }

  const isFeminine = mainTypes.some((t) => FEMININE_MAIN_TYPES.has(t));
  const frenchSupertypes = supertypes.map((s) => {
    if (s === "Snow" && isFeminine) return "neigeuse";
    return SUPERTYPE_FR[s] ?? s.toLowerCase();
  });

  const leftFr = [mainPart, ...frenchSupertypes].filter(Boolean).join(" ");

  if (!rightRaw.trim()) {
    return leftFr;
  }

  const subtypeTokens = rightRaw.trim().split(/\s+/u).filter(Boolean);
  const translatedSubtypes = subtypeTokens.map((sub) => SUBTYPE_FR[sub] ?? sub);

  let subtypePart: string;
  if (mainTypes.includes("Planeswalker")) {
    subtypePart = subtypeTokens.join(" ");
  } else if (translatedSubtypes.length === 2) {
    subtypePart = `${translatedSubtypes[0] ?? ""} et ${translatedSubtypes[1] ?? ""}`;
  } else {
    subtypePart = translatedSubtypes.join(" et ");
  }

  return `${leftFr} : ${subtypePart}`;
}

/**
 * Translates an English Magic type line (including split / DFC ` // ` cards)
 * into official Wizards of the Coast French typography.
 */
export function translateTypeLineToFrench(typeLine: string): string {
  const cleaned = typeLine.trim();
  if (!cleaned) return "";
  if (cleaned.includes(" // ")) {
    return cleaned
      .split(" // ")
      .map((side) => translateSingleTypeSide(side))
      .join(" // ");
  }
  return translateSingleTypeSide(cleaned);
}

/**
 * Provides clean French rules text fallback when no official French print exists.
 * Translates pure keyword lines and well-known canonical single-line effects
 * without mangling complex English rules prose.
 */
export function translateFallbackRulesText(oracleText: string): string {
  const trimmed = oracleText.trim();
  if (!trimmed) return "";

  return trimmed
    .split("\n")
    .map((line) => {
      const lineTrim = line.trim();
      for (const [pattern, replacement] of EXACT_PHRASE_FR) {
        if (pattern.test(lineTrim)) {
          return lineTrim.replace(pattern, replacement);
        }
      }

      // Translate pure keyword-only lines (e.g. "Flying, vigilance, lifelink")
      const segments = lineTrim.split(/,\s+/u);
      const allKeywords =
        segments.length > 0 &&
        segments.every((seg) =>
          /^(first strike|double strike|deathtouch|defender|flying|haste|hexproof|indestructible|lifelink|menace|prowess|reach|shroud|trample|vigilance|flash|ward\s+.+)$/iu.test(
            seg.trim(),
          ),
        );
      if (allKeywords) {
        let translated = lineTrim;
        for (const [pattern, replacement] of KEYWORD_LINE_FR) {
          translated = translated.replace(pattern, replacement);
        }
        return translated;
      }

      return line;
    })
    .join("\n");
}

function getFaceFrenchName(face: ScryfallCardFace): string {
  return (face.printed_name ?? face.name).trim();
}

function getFaceFrenchText(face: ScryfallCardFace): string {
  return (face.printed_text ?? face.oracle_text ?? "").trim();
}

function getFaceFrenchTypeLine(face: ScryfallCardFace): string {
  if (face.printed_type_line?.trim()) {
    return face.printed_type_line.trim();
  }
  return translateTypeLineToFrench(face.type_line ?? "");
}

function scoreFrenchPrintCompleteness(print: ScryfallPrint): number {
  let score = 0;
  if (print.printed_name?.trim()) score += 20;
  if (print.printed_type_line?.trim()) score += 25;
  if (print.printed_text?.trim()) score += 30;
  if (print.card_faces && print.card_faces.length > 0) {
    for (const face of print.card_faces) {
      if (face.printed_name?.trim()) score += 10;
      if (face.printed_type_line?.trim()) score += 12;
      if (face.printed_text?.trim()) score += 15;
    }
  }
  if (print.highres_image) score += 10;
  const year = Number.parseInt((print.released_at ?? "1993").slice(0, 4), 10);
  if (Number.isFinite(year) && year >= 2015) score += 8;
  return score;
}

/**
 * Extracts the richest available official French card metadata across all French prints,
 * falling back cleanly to existing catalog French text or deterministic translation.
 */
export function extractBestFrenchData(
  prints: readonly ScryfallPrint[],
  fallbackCard: ProxyCardFallbackInput,
): ProxyCardFrenchData {
  const frPrints = prints
    .filter((print) => print.lang === "fr")
    .sort((a, b) => scoreFrenchPrintCompleteness(b) - scoreFrenchPrintCompleteness(a));

  const bestFr = frPrints[0];
  if (bestFr) {
    const isMultiFace = Boolean(bestFr.card_faces && bestFr.card_faces.length >= 2);
    if (isMultiFace && bestFr.card_faces) {
      const front = bestFr.card_faces[0];
      const back = bestFr.card_faces[1];
      const frontName =
        frPrints
          .map((p) => p.card_faces?.[0]?.printed_name?.trim())
          .find((v): v is string => Boolean(v)) ??
        (front ? getFaceFrenchName(front) : (fallbackCard.frenchName ?? fallbackCard.name));
      const frontType =
        frPrints
          .map((p) => p.card_faces?.[0]?.printed_type_line?.trim())
          .find((v): v is string => Boolean(v)) ??
        (front ? getFaceFrenchTypeLine(front) : translateTypeLineToFrench(fallbackCard.typeLine));
      const frontText =
        frPrints
          .map((p) => p.card_faces?.[0]?.printed_text?.trim())
          .find((v): v is string => Boolean(v)) ??
        (front ? getFaceFrenchText(front) : (fallbackCard.frenchText ?? fallbackCard.oracleText));

      const backName =
        frPrints
          .map((p) => p.card_faces?.[1]?.printed_name?.trim())
          .find((v): v is string => Boolean(v)) ?? (back ? getFaceFrenchName(back) : undefined);
      const backType =
        frPrints
          .map((p) => p.card_faces?.[1]?.printed_type_line?.trim())
          .find((v): v is string => Boolean(v)) ?? (back ? getFaceFrenchTypeLine(back) : undefined);
      const backText =
        frPrints
          .map((p) => p.card_faces?.[1]?.printed_text?.trim())
          .find((v): v is string => Boolean(v)) ?? (back ? getFaceFrenchText(back) : undefined);
      const flavor = frPrints
        .map((p) => p.card_faces?.[0]?.flavor_text?.trim() ?? p.flavor_text?.trim())
        .find((v): v is string => Boolean(v));

      return {
        name: frontName,
        typeLine: frontType,
        rulesText: frontText,
        ...(flavor ? { flavorText: flavor } : {}),
        ...(backName ? { backFaceName: backName } : {}),
        ...(backType ? { backFaceTypeLine: backType } : {}),
        ...(backText ? { backFaceRulesText: backText } : {}),
        source: "official_scryfall_fr",
        officialFrenchPrintExists: true,
      };
    }

    const printedName =
      frPrints.map((p) => p.printed_name?.trim()).find((v): v is string => Boolean(v)) ??
      fallbackCard.frenchName?.trim() ??
      fallbackCard.name;
    const printedType =
      frPrints.map((p) => p.printed_type_line?.trim()).find((v): v is string => Boolean(v)) ??
      translateTypeLineToFrench(bestFr.type_line ?? fallbackCard.typeLine);
    const printedText =
      frPrints.map((p) => p.printed_text?.trim()).find((v): v is string => Boolean(v)) ??
      fallbackCard.frenchText?.trim() ??
      translateFallbackRulesText(bestFr.oracle_text ?? fallbackCard.oracleText);
    const flavor = frPrints.map((p) => p.flavor_text?.trim()).find((v): v is string => Boolean(v));

    return {
      name: printedName,
      typeLine: printedType,
      rulesText: printedText,
      ...(flavor ? { flavorText: flavor } : {}),
      source: "official_scryfall_fr",
      officialFrenchPrintExists: true,
    };
  }

  const hasCatalogFrench =
    Boolean(fallbackCard.frenchText?.trim()) &&
    fallbackCard.frenchText?.trim() !== fallbackCard.oracleText.trim();

  const fallbackFrenchName = fallbackCard.frenchName?.trim();
  return {
    name:
      fallbackFrenchName && fallbackFrenchName.length > 0 ? fallbackFrenchName : fallbackCard.name,
    typeLine: translateTypeLineToFrench(fallbackCard.typeLine),
    rulesText: hasCatalogFrench
      ? (fallbackCard.frenchText?.trim() ?? fallbackCard.oracleText)
      : translateFallbackRulesText(fallbackCard.oracleText),
    source: hasCatalogFrench ? "catalog_fr" : "translated_fallback",
    officialFrenchPrintExists: false,
  };
}
