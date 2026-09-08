import type {
  CardEvaluation,
  CardEvaluationInput,
  CoachingScoreBreakdown,
  MtGColor,
  PackEvaluationContext,
} from "./types.ts";
import type { CardCatalog } from "../../cards/card-catalog.ts";
import type { CubeMetaRegistry } from "../../cubes/cube-meta.ts";
import { generateCoachingExplanation } from "./coaching-explainer.ts";

export const ALL_COLORS: readonly MtGColor[] = ["W", "U", "B", "R", "G"] as const;

const BASIC_LAND_COLORS: Record<string, MtGColor> = {
  Plains: "W",
  Island: "U",
  Swamp: "B",
  Mountain: "R",
  Forest: "G",
};

/**
 * Parses fetchland oracle text to deduce fetched basic land colors.
 */
export function extractFetchedColors(oracleText: string | undefined): readonly MtGColor[] {
  if (!oracleText) return [];
  if (/search your library for a basic land card/i.test(oracleText)) {
    return ALL_COLORS;
  }
  const match =
    /search your library for an? (Plains|Island|Swamp|Mountain|Forest) or (?:an? )?(Plains|Island|Swamp|Mountain|Forest)/i.exec(
      oracleText,
    );
  if (match?.[1] && match[2]) {
    const c1 = BASIC_LAND_COLORS[match[1]];
    const c2 = BASIC_LAND_COLORS[match[2]];
    return [c1, c2].filter((c): c is MtGColor => Boolean(c));
  }
  return [];
}

/**
 * Returns the effective colors produced or fetched by a land or mana rock.
 */
export function getEffectiveProducingColors(card: CardEvaluationInput): readonly MtGColor[] {
  const fetched = extractFetchedColors(card.oracleText);
  if (fetched.length > 0) return fetched;
  const explicitlyProduced = (card.producesColors ?? []).filter((color): color is MtGColor =>
    ALL_COLORS.includes(color),
  );
  if (explicitlyProduced.length > 0) return explicitlyProduced;
  if (card.isLand) {
    const identity = `${card.name} ${card.typeLine ?? ""}`;
    const basicLandColors = Object.entries(BASIC_LAND_COLORS)
      .filter(([basicLandType]) => new RegExp(`\\b${basicLandType}\\b`, "i").test(identity))
      .map(([, color]) => color);
    if (basicLandColors.length > 0) return [...new Set(basicLandColors)];
  }
  if (card.isLand && card.colors.length > 0) return card.colors;
  return [];
}

/**
 * Computes the commitment factor (between 0.0 and 0.95) based on current pick progression.
 * At P1P1 (t=1), commitment is 0.0 (no prejudice).
 * Advances smoothly through Pack 1 (~0.35 at P1P5) to Pack 3 (~0.85+ to 0.95).
 */
export function computeCommitment(packNumber: number, pickNumber: number): number {
  const t = (packNumber - 1) * 15 + pickNumber;
  if (t <= 1) {
    return 0;
  }
  const progress = Math.min(1, Math.max(0, (t - 1) / 44));
  return Math.min(0.95, 0.15 + 0.8 * Math.pow(progress, 0.65));
}

/**
 * Counts the color occurrences in the prior pool to determine dominant color identity.
 */
export function computeColorFrequencies(
  priorPool: readonly CardEvaluationInput[],
): Record<MtGColor, number> {
  const counts: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const card of priorPool) {
    if (card.isLand) continue;
    for (const color of card.colors) {
      counts[color]++;
    }
  }
  return counts;
}

/**
 * Detailed 5D color profile of the player's drafted pool.
 */
export interface ColorProfileResult {
  readonly counts: Record<MtGColor, number>;
  readonly weights: Record<MtGColor, number>;
  readonly shares: Record<MtGColor, number>;
  readonly ranked: readonly MtGColor[];
  readonly dominant: readonly MtGColor[];
  readonly splashColor?: MtGColor | undefined;
  readonly confidence: number;
  readonly totalColorCards: number;
}

/**
 * Analyzes the pool to build a continuous color profile (dominant colors + splash).
 */
export function buildColorProfile(priorPool: readonly CardEvaluationInput[]): ColorProfileResult {
  const counts: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const weights: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  let totalColorCards = 0;

  for (const card of priorPool) {
    const cardColors = card.colors;
    const isProducer =
      (card.isLand ?? card.types?.includes("Artifact") ?? false) &&
      (card.producesColors?.length ?? 0) > 0;
    const effectiveColors = isProducer ? (card.producesColors ?? []) : cardColors;

    if (effectiveColors.length === 0) continue;
    totalColorCards++;

    const weight = Math.max(5, card.staticScore) / effectiveColors.length;
    for (const color of effectiveColors) {
      counts[color] += 1;
      weights[color] += weight;
    }
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const ranked = (Object.keys(weights) as MtGColor[]).sort((a, b) => weights[b] - weights[a]);

  const shares = Object.fromEntries(
    ALL_COLORS.map((c) => [c, totalWeight === 0 ? 0.2 : weights[c] / totalWeight]),
  ) as Record<MtGColor, number>;

  const dominant = ranked.slice(0, Math.min(2, totalColorCards));
  const confidence =
    totalWeight === 0 ? 0 : (weights[ranked[0] ?? "W"] + weights[ranked[1] ?? "U"]) / totalWeight;

  const candidateSplash = ranked[2];
  const splashColor =
    candidateSplash && shares[candidateSplash] >= 0.12 && counts[candidateSplash] >= 1
      ? candidateSplash
      : undefined;

  return {
    counts,
    weights,
    shares,
    ranked,
    dominant,
    splashColor,
    confidence,
    totalColorCards,
  };
}

/**
 * Returns the top 2 dominant colors in the player's drafted pool.
 */
export function getDominantColors(
  counts: Record<MtGColor, number>,
): readonly (MtGColor | undefined)[] {
  const sorted = (Object.entries(counts) as [MtGColor, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return [sorted[0]?.[0], sorted[1]?.[0]];
}

/**
 * Parses mana cost for hybrid and strict colored pips.
 */
function parseManaCostPips(card: CardEvaluationInput): readonly (readonly MtGColor[])[] {
  const cost = card.manaCost ?? "";
  if (!cost) {
    // Fallback on colors array if manaCost string is not supplied
    return card.colors.map((c) => [c]);
  }

  const pips: (readonly MtGColor[])[] = [];
  // Regular colored pips: oW, oU, oB, oR, oG (not followed by /)
  for (const match of cost.matchAll(/o([WUBRG])(?!\/)/g)) {
    if (match[1]) {
      pips.push([match[1] as MtGColor]);
    }
  }
  // Hybrid pips: o(X/Y)
  for (const match of cost.matchAll(/o\(([WUBRG])\/([WUBRG])\)/g)) {
    if (match[1] && match[2]) {
      pips.push([match[1] as MtGColor, match[2] as MtGColor]);
    }
  }
  // If phyrexian only or generic only, pips is empty (colorless requirement)
  return pips;
}

/**
 * Calculates how well a card matches the player's dominant draft colors and splash.
 * Returns a factor between 0.0 (totally off-color) and 1.0 (perfect match / colorless).
 */
export function calculateColorOverlap(
  card: CardEvaluationInput,
  dominantColors: readonly (MtGColor | undefined)[],
  totalColorCardsInPool: number,
  splashColor?: MtGColor,
): number {
  if (totalColorCardsInPool === 0) {
    return 1.0;
  }

  const [c1, c2] = dominantColors;
  const activeSet = new Set<MtGColor>(
    [c1, c2, splashColor].filter((c): c is MtGColor => Boolean(c)),
  );
  const dominantSet = new Set<MtGColor>([c1, c2].filter((c): c is MtGColor => Boolean(c)));

  // Colorless spells fit in any deck
  if (card.colors.length === 0 && !card.isLand) {
    return 1.0;
  }

  // If card is a Land (or mana fixer rock)
  if (card.isLand) {
    const effective = getEffectiveProducingColors(card);
    if (effective.length === 0) {
      return 1.0; // Colorless utility land (e.g. Strip Mine, Wasteland, Mishra's Workshop)
    }
    if (effective.length >= 5) {
      return 1.0; // Rainbow fetch / land (Fabled Passage, Mana Confluence)
    }

    const dominantMatches = effective.filter((col) => dominantSet.has(col));
    const splashMatches = splashColor && effective.includes(splashColor) ? 1 : 0;

    if (dominantMatches.length >= 2) return 1.0; // Perfect on-color dual
    if (dominantMatches.length === 1 && splashMatches > 0) return 0.85; // Fixes main + splash
    if (dominantMatches.length === 1) return 0.75; // Half-color dual
    if (splashMatches > 0) return 0.4; // Only fixes splash
    return 0.0; // Off-color land (e.g. UG fetch in RW pool)
  }

  // For Spells & Creatures: check pips (hybrid aware)
  const pips = parseManaCostPips(card);
  if (pips.length === 0) {
    return 1.0; // Colorless or phyrexian mana cost (e.g. Dismember, Gitaxian Probe)
  }

  let totalScore = 0;
  for (const options of pips) {
    let bestForPip = 0;
    for (const color of options) {
      if (dominantSet.has(color)) {
        bestForPip = Math.max(bestForPip, 1.0);
      } else if (splashColor && color === splashColor) {
        bestForPip = Math.max(bestForPip, 0.65);
      } else {
        bestForPip = Math.max(bestForPip, 0.0);
      }
    }
    totalScore += bestForPip;
  }

  const pipAffinity = totalScore / pips.length;

  // If every pip can be fully cast with dominant colors (e.g. hybrid R/W with R in pool)
  if (pipAffinity === 1.0) {
    return 1.0;
  }

  // Fallback for card colors array check
  if (card.colors.length === 1) {
    const col = card.colors[0];
    if (col && dominantSet.has(col)) return 1.0;
    if (col && col === splashColor) return 0.65;
    return 0.0;
  }

  const matchingColors = card.colors.filter((col) => activeSet.has(col));
  const offColors = card.colors.filter((col) => !activeSet.has(col));

  if (offColors.length === 0) {
    return pipAffinity;
  }

  if (matchingColors.length > 0) {
    return Math.min(pipAffinity, 0.45);
  }

  return 0.0;
}

/**
 * Evaluates a single card in the context of the current draft state.
 */
export function evaluateCard(
  card: CardEvaluationInput,
  context: PackEvaluationContext,
): CardEvaluation {
  const { packNumber, pickNumber, priorPool } = context;
  const isP1P1 = packNumber === 1 && pickNumber === 1;

  // Referentials: Master Card Catalog & Cube Meta
  const catalog = context.catalog as CardCatalog | undefined;
  const cubeMeta = context.cubeMeta as CubeMetaRegistry | undefined;
  const cubeKey = context.cubeKey ?? cubeMeta?.cubeKey;

  let cubeScoreModifier = 0;
  let synergyBonus = 0;
  let powerSource: string | undefined;
  let harmonizationConfidence: number | undefined;

  if (catalog) {
    const cardInCat =
      (card.oracleId ? catalog.getCardByOracleId(card.oracleId) : undefined) ??
      catalog.getCardByName(card.name);
    if (cardInCat) {
      powerSource = cardInCat.powerScore.source;
      harmonizationConfidence = cardInCat.powerScore.confidence;

      if (cubeKey && cardInCat.cubeAnalyses[cubeKey]) {
        const cubeAnalysis = cardInCat.cubeAnalyses[cubeKey];
        cubeScoreModifier = cubeAnalysis.scoreModifier;

        if (!isP1P1 && priorPool.length > 0 && cubeAnalysis.synergyTags.length > 0) {
          const cardTags = new Set(cubeAnalysis.synergyTags);
          let matchCount = 0;
          for (const priorCard of priorPool) {
            const priorInCat =
              (priorCard.oracleId ? catalog.getCardByOracleId(priorCard.oracleId) : undefined) ??
              catalog.getCardByName(priorCard.name);
            if (priorInCat && cubeKey && priorInCat.cubeAnalyses[cubeKey]) {
              const priorTags = priorInCat.cubeAnalyses[cubeKey].synergyTags;
              for (const tag of priorTags) {
                if (cardTags.has(tag)) {
                  matchCount++;
                }
              }
            }
          }
          const tribalMult = cubeMeta?.meta.scoringProfile.tribalSynergyMultiplier ?? 1.5;
          const comboMult = cubeMeta?.meta.scoringProfile.comboSynergyMultiplier ?? 1.0;
          const hasTribal = [...cardTags].some((t) => t.startsWith("tribe:"));
          const mult = hasTribal ? tribalMult : comboMult;
          synergyBonus = Math.min(15.0, Math.round(matchCount * 0.8 * mult * 10) / 10);
        }
      }
    }
  }

  if (isP1P1) {
    const dynamicP1P1 =
      cubeScoreModifier !== 0
        ? Math.max(1, Math.min(55, card.staticScore + cubeScoreModifier))
        : card.staticScore;
    const breakdown: CoachingScoreBreakdown = {
      colorAffinityFactor: 1.0,
      colorPenalty: 0,
      manaFixingBonus: 0,
      curveBonus: 0,
      rawDynamicScore: dynamicP1P1,
      cubeScoreModifier: cubeScoreModifier !== 0 ? cubeScoreModifier : undefined,
      synergyBonus: 0,
      powerSource,
      harmonizationConfidence,
    };
    return {
      id: card.id,
      name: card.name,
      staticScore: card.staticScore,
      dynamicScore: dynamicP1P1,
      delta: Math.round((dynamicP1P1 - card.staticScore) * 10) / 10,
      breakdown,
      explanation: "",
    };
  }

  const commitment = computeCommitment(packNumber, pickNumber);
  const profile = buildColorProfile(priorPool);
  const dominantColors = profile.dominant;
  const totalColorPicks = profile.totalColorCards;

  const overlap = calculateColorOverlap(card, dominantColors, totalColorPicks, profile.splashColor);

  // 1. Color Affinity & Penalty
  let colorAffinityFactor = 1.0;
  if (overlap < 1.0) {
    colorAffinityFactor = Math.max(0.05, 1.0 - commitment * (1.0 - overlap));
  }

  // Natural decay factor for being in early packs vs locked in
  const naturalDecay = packNumber === 1 && pickNumber > 1 ? 0.92 : 0.95;
  const effectiveMultiplier = overlap === 1.0 ? naturalDecay : colorAffinityFactor;

  const colorPenalty = Math.max(0, card.staticScore * (1 - colorAffinityFactor));
  const scoreAfterColor = card.staticScore * effectiveMultiplier;

  // 2. Mana Fixing Bonus
  let manaFixingBonus = 0;
  if (card.isLand && totalColorPicks > 0) {
    const produced = getEffectiveProducingColors(card);
    const [c1, c2] = dominantColors;
    const producesBoth = c1 && c2 && produced.includes(c1) && produced.includes(c2);

    if (producesBoth) {
      manaFixingBonus = 3.5; // Dual land of exact colors (e.g. Floodfarm Verge for WU)
    } else if (produced.length >= 5) {
      manaFixingBonus = 3.0; // Prismatic / Rainbow (Fabled Passage)
    } else if (
      c1 &&
      produced.includes(c1) &&
      profile.splashColor &&
      produced.includes(profile.splashColor)
    ) {
      manaFixingBonus = 2.5; // Main + splash dual
    } else if ((c1 && produced.includes(c1)) || (c2 && produced.includes(c2))) {
      manaFixingBonus = 1.0; // Half-color dual
    }
  }

  // 3. Curve Bonus (placeholder for CMC gap detection)
  const curveBonus = 0;

  // 4. Raw Dynamic Score with Cube and Synergy modifiers
  const rawDynamicScore = Math.max(
    1,
    Math.min(55, scoreAfterColor + manaFixingBonus + curveBonus + cubeScoreModifier + synergyBonus),
  );

  // Round to 1 decimal place
  const dynamicScore = Math.round(rawDynamicScore * 10) / 10;
  const delta = Math.round((dynamicScore - card.staticScore) * 10) / 10;

  const breakdown: CoachingScoreBreakdown = {
    colorAffinityFactor: Math.round(colorAffinityFactor * 100) / 100,
    colorPenalty: Math.round(colorPenalty * 10) / 10,
    manaFixingBonus,
    curveBonus,
    rawDynamicScore,
    cubeScoreModifier: cubeScoreModifier !== 0 ? cubeScoreModifier : undefined,
    synergyBonus: synergyBonus !== 0 ? synergyBonus : undefined,
    powerSource,
    harmonizationConfidence,
  };

  return {
    id: card.id,
    name: card.name,
    staticScore: card.staticScore,
    dynamicScore,
    delta,
    breakdown,
    explanation: "",
  };
}

/**
 * Evaluates all cards in an offered booster, sorts them by dynamic score,
 * and attaches coaching rationales.
 */
export function evaluatePack(context: PackEvaluationContext): readonly CardEvaluation[] {
  const evaluated = context.offeredCards.map((card) => evaluateCard(card, context));

  // Sort descending by dynamic score
  const sorted = [...evaluated].sort((a, b) => b.dynamicScore - a.dynamicScore);

  // Attach explanation based on relative rank in booster
  return sorted.map((evalCard, rank) => {
    const explanation = generateCoachingExplanation(
      evalCard,
      evalCard.breakdown,
      rank + 1,
      sorted.length,
      context,
    );
    return {
      ...evalCard,
      explanation,
    };
  });
}
