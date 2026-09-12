import type { CardEvaluationInput } from "./types.ts";
import type { CompanionCard } from "../../companion/card-resolver.ts";

export interface TribalDraftContext {
  readonly isTribalCube: boolean;
  readonly isTribalEngaged: boolean;
  readonly dominantTribes: readonly string[];
  readonly compatibleTribes: readonly string[];
  readonly incompatibleTribes: readonly string[];
  readonly tribalCardsCount: number;
  readonly promptGuideline: string;
}

export const KNOWN_TRIBAL_SUBTYPES: readonly string[] = [
  "Goblin",
  "Dragon",
  "Human",
  "Angel",
  "Wizard",
  "Elf",
  "Zombie",
  "Vampire",
  "Merfolk",
  "Wolf",
  "Werewolf",
  "Spirit",
  "Faerie",
  "Knight",
  "Sliver",
  "Eldrazi",
] as const;

/**
 * Compatible tribes according to Titou Tribal rules:
 * - Gobelins & Dragons (Gobelins aggro/sacrifice et Dragons en bombes/finisseurs)
 * - Humains & Anges (Humains base blanche/multicolore et Anges en haut de curve)
 * - Humains & Sorciers / Wizards (souvent les deux types cumulés, forte synergie sorts/tempo)
 *
 * Pour les autres tribus (Elfes, Zombies, Vampires, etc.), la tribu ne se mélange pas
 * avec d'autres tribus incompatibles.
 */
export const COMPATIBLE_TRIBE_MAP: Record<string, readonly string[]> = {
  Goblin: ["Goblin", "Dragon"],
  Dragon: ["Dragon", "Goblin"],
  Human: ["Human", "Angel", "Wizard"],
  Angel: ["Angel", "Human"],
  Wizard: ["Wizard", "Human"],
  Elf: ["Elf"],
  Zombie: ["Zombie"],
  Vampire: ["Vampire"],
  Merfolk: ["Merfolk"],
  Wolf: ["Wolf", "Werewolf"],
  Werewolf: ["Werewolf", "Wolf"],
  Spirit: ["Spirit"],
  Faerie: ["Faerie"],
  Knight: ["Knight", "Human"],
  Sliver: ["Sliver"],
  Eldrazi: ["Eldrazi"],
};

/**
 * Checks if a cube is specifically tribal (Titou's Tribal Cube or marked with Tribal mechanic).
 * For other cubes (Cedric, Candyshop, Hugues Pauper, Arena Peasant), tribal restrictions
 * do NOT apply unless explicitly indicated.
 */
export function isTribalCube(cubeKey?: string, cubeMeta?: unknown): boolean {
  if (!cubeKey && !cubeMeta) return false;
  if (cubeKey === "titou_tribal" || cubeKey?.toLowerCase().includes("tribal")) {
    return true;
  }
  if (cubeMeta && typeof cubeMeta === "object") {
    const meta = cubeMeta as {
      dominantMechanics?: readonly string[];
      scoringProfile?: { tribalSynergyMultiplier?: number };
    };
    if (Array.isArray(meta.dominantMechanics) && meta.dominantMechanics.includes("Tribal")) {
      return true;
    }
    if (
      meta.scoringProfile?.tribalSynergyMultiplier &&
      meta.scoringProfile.tribalSynergyMultiplier > 1.2
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts creature subtypes from a card.
 */
export function extractCardSubtypes(card: CardEvaluationInput | CompanionCard): readonly string[] {
  if ("subtypes" in card && card.subtypes && card.subtypes.length > 0) {
    return card.subtypes;
  }
  const typeLine = card.typeLine ?? "";
  if (typeLine.includes("—")) {
    const afterDash = typeLine.split("—")[1] ?? "";
    return afterDash
      .trim()
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeLine.includes("-")) {
    const afterDash = typeLine.split("-")[1] ?? "";
    return afterDash
      .trim()
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Checks if a card is a Changeling (has all creature types, fits all tribes).
 */
export function isChangeling(card: CardEvaluationInput | CompanionCard): boolean {
  const text = (card.oracleText ?? "").toLowerCase();
  const typeLine = (card.typeLine ?? "").toLowerCase();
  return (
    typeLine.includes("changeling") ||
    typeLine.includes("changelin") ||
    text.includes("changeling") ||
    text.includes("every creature type") ||
    text.includes("tous les types de créature")
  );
}

/**
 * Returns recognized tribal types matching the card's subtypes.
 */
export function getCardRelevantTribes(card: CardEvaluationInput | CompanionCard): string[] {
  if (isChangeling(card)) return [];
  const subtypes = extractCardSubtypes(card);
  const matched: string[] = [];
  for (const tribe of KNOWN_TRIBAL_SUBTYPES) {
    if (subtypes.some((st) => st.toLowerCase() === tribe.toLowerCase())) {
      matched.push(tribe);
    }
  }
  return matched;
}

/**
 * Detects whether the drafted pool has established an active tribal commitment on a tribal cube.
 */
export function detectDraftedTribalContext(
  priorPool: readonly (CardEvaluationInput | CompanionCard)[],
  cubeKey?: string,
  cubeMeta?: unknown,
): TribalDraftContext {
  const tribalCube = isTribalCube(cubeKey, cubeMeta);
  if (!tribalCube || priorPool.length === 0) {
    return {
      isTribalCube: tribalCube,
      isTribalEngaged: false,
      dominantTribes: [],
      compatibleTribes: [],
      incompatibleTribes: [],
      tribalCardsCount: 0,
      promptGuideline: "",
    };
  }

  const tribeCounts: Record<string, number> = {};
  let changelingCount = 0;

  for (const card of priorPool) {
    if (isChangeling(card)) {
      changelingCount++;
      continue;
    }
    const tribes = getCardRelevantTribes(card);
    for (const t of tribes) {
      tribeCounts[t] = (tribeCounts[t] ?? 0) + 1;
    }
  }

  // Sort tribes by occurrences (>= 2 cards needed to consider the tribe initiated)
  const sortedTribes = Object.entries(tribeCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  const firstEntry = sortedTribes[0];
  if (!firstEntry) {
    return {
      isTribalCube: true,
      isTribalEngaged: false,
      dominantTribes: [],
      compatibleTribes: [],
      incompatibleTribes: [],
      tribalCardsCount: 0,
      promptGuideline:
        "Cube Tribal : Aucune tribu dominante engagée pour l'instant (draft ouvert).",
    };
  }

  const topTribe = firstEntry[0];
  const dominantTribes: string[] = [topTribe];
  const compatibleWithTop = COMPATIBLE_TRIBE_MAP[topTribe] ?? [topTribe];

  for (let i = 1; i < sortedTribes.length; i++) {
    const entry = sortedTribes[i];
    if (entry) {
      const [tribe, count] = entry;
      if (count >= 2 && compatibleWithTop.includes(tribe)) {
        dominantTribes.push(tribe);
      }
    }
  }

  const compatibleSet = new Set<string>();
  for (const dt of dominantTribes) {
    const comps = COMPATIBLE_TRIBE_MAP[dt] ?? [dt];
    for (const c of comps) compatibleSet.add(c);
  }
  const compatibleTribes = Array.from(compatibleSet);
  const incompatibleTribes = KNOWN_TRIBAL_SUBTYPES.filter((t) => !compatibleSet.has(t));

  const totalTribalCards = dominantTribes.reduce(
    (sum, t) => sum + (tribeCounts[t] ?? 0),
    changelingCount,
  );

  const promptGuideline = `CONSIGNES STRICTES DE COMPATIBILITÉ TRIBALE (CUBE TRIBAL "${cubeKey ?? "titou_tribal"}") :
- Le joueur a commencé à drafter une synergie TRIBALE : ${dominantTribes.join(" & ")} (${String(totalTribalCards)} cartes dans le pool).
- TRIBUS COMPATIBLES AUTORISÉES : ${compatibleTribes.join(", ")}.
  * Alliances tribales viables sur ce cube : Gobelins + Dragons, Humains + Anges, Humains + Sorciers (Wizards).
- TRIBUS INTERDITES / INCOMPATIBLES : ${incompatibleTribes.join(", ")}.
- RÈGLE DU COACH : ÉVITE STRICTEMENT de recommander (en Choix Principal ou en Alternatives) des cartes ou créatures d'une tribu rivale incompatible (ex: proscrire totalement Immerwolf/Loups, Elfes, Zombies, Vampires pour un deck Gobelins ou Humains).
- Cartes recommandables : uniquement des cartes de sa tribu (${dominantTribes.join("/")}), des tribus compatibles (${compatibleTribes.join("/")}), ou des sorts génériques (burn, anti-bête, pioche, terrains fixeurs) sans affiliation tribale adverse.`;

  return {
    isTribalCube: true,
    isTribalEngaged: true,
    dominantTribes,
    compatibleTribes,
    incompatibleTribes,
    tribalCardsCount: totalTribalCards,
    promptGuideline,
  };
}

/**
 * Checks if a candidate card is tribally incompatible with the player's tribal commitment.
 * Returns false for neutral spells/lands/artifacts, changelings, or cards of compatible tribes.
 * Returns true for cards with creature subtypes or narrow payoffs of incompatible tribes.
 */
export function isCardTriballyIncompatible(
  card: CardEvaluationInput | CompanionCard,
  context: TribalDraftContext,
): boolean {
  if (!context.isTribalCube || !context.isTribalEngaged) return false;
  if (isChangeling(card)) return false;

  const cardTribes = getCardRelevantTribes(card);
  const text = (card.oracleText ?? "").toLowerCase();

  // If card has no creature subtypes (non-creature spell, land, artifact)
  if (cardTribes.length === 0) {
    // Check if it has a narrow tribal text referencing an incompatible tribe
    for (const incomp of context.incompatibleTribes) {
      const regex = new RegExp(`\\b${incomp.toLowerCase()}s?\\b`, "i");
      if (regex.test(text) && !regex.test(card.name.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  // If card shares at least one compatible tribe
  const hasCompatibleTribe = cardTribes.some((t) => context.compatibleTribes.includes(t));
  if (hasCompatibleTribe) {
    return false;
  }

  // Card only belongs to incompatible tribe(s)
  const hasIncompatibleTribe = cardTribes.some((t) => context.incompatibleTribes.includes(t));
  if (hasIncompatibleTribe) {
    return true;
  }

  return false;
}
