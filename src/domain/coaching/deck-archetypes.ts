import type { ArchetypeCategory, CardEvaluationInput, DeckArchetype, MtGColor } from "./types.ts";
import { ALL_COLORS, getEffectiveProducingColors } from "./dynamic-score.ts";

const COLOR_PAIR_NAMES: Record<string, string> = {
  WU: "Azorius",
  UW: "Azorius",
  UB: "Dimir",
  BU: "Dimir",
  BR: "Rakdos",
  RB: "Rakdos",
  RG: "Gruul",
  GR: "Gruul",
  GW: "Selesnya",
  WG: "Selesnya",
  WB: "Orzhov",
  BW: "Orzhov",
  BG: "Golgari",
  GB: "Golgari",
  GU: "Simic",
  UG: "Simic",
  UR: "Izzet",
  RU: "Izzet",
  RW: "Boros",
  WR: "Boros",
};

const COLOR_TRIO_NAMES: Record<string, string> = {
  WUG: "Bant",
  GWU: "Bant",
  WUB: "Esper",
  UBR: "Grixis",
  BRG: "Jund",
  WRG: "Naya",
  RGW: "Naya",
  WBG: "Abzan",
  WUR: "Jeskai",
  URW: "Jeskai",
  UBG: "Sultai",
  BGU: "Sultai",
  WBR: "Mardu",
  RWB: "Mardu",
  URG: "Temur",
  GUR: "Temur",
};

const MONO_COLOR_NAMES: Record<MtGColor, string> = {
  W: "Mono-White",
  U: "Mono-Blue",
  B: "Mono-Black",
  R: "Mono-Red",
  G: "Mono-Green",
};

function sortColors(colors: readonly MtGColor[]): string {
  const order: Record<MtGColor, number> = { W: 0, U: 1, B: 2, R: 3, G: 4 };
  return [...colors].sort((a, b) => order[a] - order[b]).join("");
}

function getArchetypeLabel(
  primaryColors: readonly MtGColor[],
  splashColors: readonly MtGColor[],
  category: ArchetypeCategory,
): string {
  const capCategory = category.charAt(0).toUpperCase() + category.slice(1);

  if (primaryColors.length === 1) {
    const mono = MONO_COLOR_NAMES[primaryColors[0] ?? "W"];
    if (splashColors.length > 0) {
      return `${mono} Splash ${splashColors.join("/")} ${capCategory}`;
    }
    return `${mono} ${capCategory}`;
  }

  if (primaryColors.length === 2) {
    const pairKey = sortColors(primaryColors);
    const pairName = COLOR_PAIR_NAMES[pairKey] ?? primaryColors.join("/");
    if (splashColors.length > 0) {
      return `${pairName} Splash ${splashColors.join("/")} ${capCategory}`;
    }
    return `${pairName} ${capCategory}`;
  }

  if (primaryColors.length === 3) {
    const trioKey = sortColors(primaryColors);
    const trioName = COLOR_TRIO_NAMES[trioKey] ?? primaryColors.join("/");
    return `${trioName} ${capCategory}`;
  }

  return `${primaryColors.join("/")} ${capCategory}`;
}

function isManaDorkOrRamp(card: CardEvaluationInput): boolean {
  if (card.isLand) return false;
  const produces = getEffectiveProducingColors(card);
  const text = (card.oracleText ?? "").toLowerCase();
  if (/(?:\{o?t\}|ot|sacrifice [^:]+): add/i.test(text)) return (card.cmc ?? 0) <= 3;
  if (/search your library for (?:(?:a|two) )?basic land/i.test(text)) return true;
  return (
    text.length === 0 &&
    produces.length > 0 &&
    (card.cmc ?? 0) <= 3 &&
    [card.types?.includes("Creature"), card.typeLine?.includes("Artifact")].some(Boolean)
  );
}

function isInteractionSpell(card: CardEvaluationInput): boolean {
  const text = (card.oracleText ?? "").toLowerCase();
  return /counter target|destroy target|exile target|damage to (any|target)|target .* gets? (?:<[^>]+>)*-\d|return target .* to (its|their) owner's hand|put target (?:nonland )?permanent|gain control of target (?:artifact|enchantment|planeswalker)|destroy all|players[^.]*sacrifice creatures|target player[^.]*discard|opponent[^.]*discard|players discard|reveals? (their|his|her) hand|look at target opponent's hand/i.test(
    text,
  );
}

function isCreatureCheatEnabler(card: CardEvaluationInput): boolean {
  const text = (card.oracleText ?? "").toLowerCase();
  return (
    /put (?:an? )?(?:artifact, )?creature(?:, enchantment, or land)? card from (?:your|their) hand onto the battlefield/.test(
      text,
    ) ||
    (text.includes("each player may put") && text.includes("from their hand onto the battlefield"))
  );
}

/**
 * Classifies a 40-card deck into an archetype category and color identity.
 */
export function detectArchetype(deck: readonly CardEvaluationInput[]): DeckArchetype {
  const colorWeights: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const spells = deck.filter((c) => !c.isLand);

  let rampCount = 0;
  let interactionCount = 0;
  let aggressiveCount = 0;
  let highCmcCount = 0;
  let creatureCheatEnablerCount = 0;
  let totalCmc = 0;

  for (const card of spells) {
    const cmc = card.cmc ?? 0;
    totalCmc += cmc;

    if (cmc <= 2 && (card.types?.includes("Creature") ?? true)) {
      aggressiveCount++;
    }
    if (cmc >= 5) {
      highCmcCount++;
    }
    if (isManaDorkOrRamp(card)) {
      rampCount++;
    }
    if (isInteractionSpell(card)) {
      interactionCount++;
    }
    if (isCreatureCheatEnabler(card)) {
      creatureCheatEnablerCount++;
    }

    const cardColors = card.colors;
    if (cardColors.length > 0) {
      const weight = Math.max(5, card.staticScore) / cardColors.length;
      for (const color of cardColors) {
        colorWeights[color] += weight;
      }
    }
  }

  const avgCmc = spells.length > 0 ? totalCmc / spells.length : 3.0;
  const totalWeight = Object.values(colorWeights).reduce((a, b) => a + b, 0);

  const rankedColors = (Object.keys(colorWeights) as MtGColor[]).sort(
    (a, b) => colorWeights[b] - colorWeights[a],
  );

  const shares = Object.fromEntries(
    ALL_COLORS.map((c) => [c, totalWeight === 0 ? 0.2 : colorWeights[c] / totalWeight]),
  ) as Record<MtGColor, number>;

  // Detect primary and splash colors
  const primaryColors: MtGColor[] = [];
  const splashColors: MtGColor[] = [];

  for (const color of rankedColors) {
    const share = shares[color];
    if (share >= 0.2 && primaryColors.length < 3) {
      primaryColors.push(color);
    } else if (share >= 0.08 && splashColors.length < 2) {
      splashColors.push(color);
    }
  }

  if (primaryColors.length === 0 && rankedColors[0]) {
    primaryColors.push(rankedColors[0]);
  }

  // Determine Archetype Category
  let category: ArchetypeCategory = "midrange";

  if (creatureCheatEnablerCount >= 2 && highCmcCount >= 2) {
    category = "combo";
  } else if (rampCount >= 4 && (highCmcCount >= 3 || primaryColors.includes("G"))) {
    category = "ramp";
  } else if (aggressiveCount >= 6 && avgCmc <= 2.6) {
    category = "aggro";
  } else if (interactionCount >= 5 && avgCmc >= 2.3) {
    category = "control";
  }

  const label = getArchetypeLabel(primaryColors, splashColors, category);

  return {
    category,
    primaryColors,
    splashColors,
    label,
    description: `Deck ${label} avec ${String(spells.length)} sorts (CMC moyen ${avgCmc.toFixed(1)}) et ${String(deck.length - spells.length)} terrains.`,
  };
}
