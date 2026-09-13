import type {
  CardEvaluationInput,
  DeckBuildOption,
  DeckEvaluationOptions,
  MtGColor,
} from "./types.ts";
import { ALL_COLORS, getEffectiveProducingColors } from "./dynamic-score.ts";
import { evaluateDeck } from "./deck-evaluation.ts";

export interface BasicLandDefinitions {
  readonly W: CardEvaluationInput;
  readonly U: CardEvaluationInput;
  readonly B: CardEvaluationInput;
  readonly R: CardEvaluationInput;
  readonly G: CardEvaluationInput;
}

export const DEFAULT_BASIC_LANDS: BasicLandDefinitions = {
  W: {
    id: "basic-plains",
    name: "Plains",
    colors: [],
    typeLine: "Basic Land — Plains",
    isLand: true,
    manaCost: "",
    cmc: 0,
    staticScore: 5,
    producesColors: ["W"],
    oracleText: "{T}: Add {W}.",
  },
  U: {
    id: "basic-island",
    name: "Island",
    colors: [],
    typeLine: "Basic Land — Island",
    isLand: true,
    manaCost: "",
    cmc: 0,
    staticScore: 5,
    producesColors: ["U"],
    oracleText: "{T}: Add {U}.",
  },
  B: {
    id: "basic-swamp",
    name: "Swamp",
    colors: [],
    typeLine: "Basic Land — Swamp",
    isLand: true,
    manaCost: "",
    cmc: 0,
    staticScore: 5,
    producesColors: ["B"],
    oracleText: "{T}: Add {B}.",
  },
  R: {
    id: "basic-mountain",
    name: "Mountain",
    colors: [],
    typeLine: "Basic Land — Mountain",
    isLand: true,
    manaCost: "",
    cmc: 0,
    staticScore: 5,
    producesColors: ["R"],
    oracleText: "{T}: Add {R}.",
  },
  G: {
    id: "basic-forest",
    name: "Forest",
    colors: [],
    typeLine: "Basic Land — Forest",
    isLand: true,
    manaCost: "",
    cmc: 0,
    staticScore: 5,
    producesColors: ["G"],
    oracleText: "{T}: Add {G}.",
  },
};

const COLOR_PAIRS: readonly [MtGColor, MtGColor][] = [
  ["W", "U"],
  ["W", "B"],
  ["W", "R"],
  ["W", "G"],
  ["U", "B"],
  ["U", "R"],
  ["U", "G"],
  ["B", "R"],
  ["B", "G"],
  ["R", "G"],
];

const COLOR_TRIOS: readonly [MtGColor, MtGColor, MtGColor][] = [
  ["W", "U", "B"], // Esper
  ["W", "U", "R"], // Jeskai
  ["W", "U", "G"], // Bant
  ["W", "B", "R"], // Mardu
  ["W", "B", "G"], // Abzan
  ["W", "R", "G"], // Naya
  ["U", "B", "R"], // Grixis
  ["U", "B", "G"], // Sultai
  ["U", "R", "G"], // Temur
  ["B", "R", "G"], // Jund
];

function canCastWithColors(
  card: CardEvaluationInput,
  allowedColors: ReadonlySet<MtGColor>,
): boolean {
  if (card.colors.length === 0) return true; // Colorless spells can always be cast
  return card.colors.every((c) => allowedColors.has(c));
}

function countColoredPips(manaCost: string | undefined): Record<MtGColor, number> {
  const pips: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  if (!manaCost) return pips;
  for (const color of ALL_COLORS) {
    const regex = new RegExp(`o?${color}`, "gi");
    const matches = manaCost.match(regex);
    if (matches) {
      pips[color] += matches.length;
    }
  }
  return pips;
}

interface ColorPathCandidate {
  readonly colors: readonly MtGColor[];
  readonly spells: readonly CardEvaluationInput[];
  readonly lands: readonly CardEvaluationInput[];
  readonly score: number;
}

/**
 * Builds a 40-card deck option from a given color path and drafted pool.
 */
function assembleDeckOption(
  candidate: ColorPathCandidate,
  allPool: readonly CardEvaluationInput[],
  basics: BasicLandDefinitions,
): { maindeck: CardEvaluationInput[]; sideboard: CardEvaluationInput[] } {
  // Sort spells by static score descending, favoring higher quality
  const sortedSpells = [...candidate.spells].sort((a, b) => b.staticScore - a.staticScore);

  const curveSample = sortedSpells.slice(0, 24);
  const averageManaValue =
    curveSample.length === 0
      ? 3
      : curveSample.reduce((sum, card) => sum + (card.cmc ?? 3), 0) / curveSample.length;
  const targetLands = averageManaValue <= 2.25 ? 16 : averageManaValue >= 3.75 ? 18 : 17;
  const nonBasicLands = [...candidate.lands]
    .sort((a, b) => b.staticScore - a.staticScore)
    .slice(0, targetLands);
  const neededBasicLands = Math.max(0, targetLands - nonBasicLands.length);
  const targetSpells = 40 - nonBasicLands.length - neededBasicLands;

  const chosenSpells = sortedSpells.slice(0, targetSpells);

  // Calculate pip distribution for basic land allocation
  const pipTotals: Record<MtGColor, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const spell of chosenSpells) {
    const pips = countColoredPips(spell.manaCost);
    for (const c of ALL_COLORS) {
      pipTotals[c] += pips[c];
    }
  }

  const activeColors = candidate.colors;
  const totalActivePips = activeColors.reduce((sum, c) => sum + pipTotals[c], 0);

  const basicLandsAdded: CardEvaluationInput[] = [];
  if (neededBasicLands > 0) {
    let remainingToDistribute = neededBasicLands;
    for (let i = 0; i < activeColors.length; i++) {
      const color = activeColors[i];
      if (!color) continue;
      const isLast = i === activeColors.length - 1;
      let count = 0;
      if (isLast) {
        count = remainingToDistribute;
      } else {
        const ratio =
          totalActivePips > 0 ? pipTotals[color] / totalActivePips : 1 / activeColors.length;
        const ideal = Math.round(ratio * neededBasicLands);
        const maxAllowed = Math.max(0, remainingToDistribute - (activeColors.length - i - 1));
        count = Math.min(ideal, maxAllowed);
        if (remainingToDistribute > 0 && count === 0 && maxAllowed > 0 && pipTotals[color] > 0) {
          count = 1;
        }
      }
      count = Math.max(0, Math.min(remainingToDistribute, count));
      remainingToDistribute -= count;
      const basicDef = basics[color];
      for (let k = 0; k < count; k++) {
        basicLandsAdded.push(basicDef);
      }
    }
  }

  const maindeck = [...chosenSpells, ...nonBasicLands, ...basicLandsAdded];
  const maindeckDraftedIds = new Set(
    maindeck
      .filter(
        (c) =>
          !c.id.startsWith("basic-") &&
          !["90790", "90792", "90794", "90796", "90798"].includes(c.id),
      )
      .map((c) => c.id),
  );

  const sideboard = allPool.filter((c) => !maindeckDraftedIds.has(c.id));

  return { maindeck, sideboard };
}

/**
 * Automatically recommends 2 to 3 viable deck build options from a drafted pool of cards.
 * Evaluates each option with Kiviat radar and overall score, sorted descending.
 */
export function recommendDeckBuilds(
  pool: readonly CardEvaluationInput[],
  customBasics: BasicLandDefinitions = DEFAULT_BASIC_LANDS,
  evaluationOptions: DeckEvaluationOptions = {},
): readonly DeckBuildOption[] {
  const spells = pool.filter((c) => !c.isLand);
  const lands = pool.filter((c) => c.isLand);

  // Evaluate candidate color paths (all pairs + trios)
  const candidatePaths: ColorPathCandidate[] = [];

  const evaluatePath = (colors: readonly MtGColor[]) => {
    const colorSet = new Set(colors);
    const compatibleSpells = spells.filter((c) => canCastWithColors(c, colorSet));
    if (compatibleSpells.length < 23) return; // Not enough playables for a 23/17 deck

    const compatibleLands = lands.filter((land) => {
      const produced = getEffectiveProducingColors(land);
      return produced.length === 0 || produced.some((c) => colorSet.has(c));
    });

    // Score based on sum of top 23 spell static scores + fixers bonus
    const topSpells = [...compatibleSpells]
      .sort((a, b) => b.staticScore - a.staticScore)
      .slice(0, 23);
    const spellScore = topSpells.reduce((acc, c) => acc + c.staticScore, 0);
    const fixersBonus = compatibleLands.length * 5;
    const score = spellScore + fixersBonus;

    candidatePaths.push({
      colors,
      spells: compatibleSpells,
      lands: compatibleLands,
      score,
    });
  };

  // Check 2-color pairs
  for (const pair of COLOR_PAIRS) {
    evaluatePath(pair);
  }

  // Check 3-color trios
  for (const trio of COLOR_TRIOS) {
    evaluatePath(trio);
  }

  // Sort candidate paths by score
  candidatePaths.sort((a, b) => b.score - a.score);

  // Select up to 3 diverse top paths
  const selectedPaths: ColorPathCandidate[] = [];
  for (const cand of candidatePaths) {
    if (selectedPaths.length >= 3) break;
    // Check diversity: avoid picking 3 almost identical paths
    const isDuplicate = selectedPaths.some(
      (p) =>
        p.colors.length === cand.colors.length && p.colors.every((c) => cand.colors.includes(c)),
    );
    if (!isDuplicate) {
      selectedPaths.push(cand);
    }
  }

  // If no path had 23 playables, keep the full pool available for a legal 23/17 build.
  if (selectedPaths.length === 0) {
    const allColors: readonly MtGColor[] = ["W", "U", "B", "R", "G"];
    selectedPaths.push({
      colors: allColors,
      spells,
      lands,
      score: 100,
    });
  }

  // Assemble and evaluate options
  const options: DeckBuildOption[] = selectedPaths.map((cand, idx) => {
    const { maindeck, sideboard } = assembleDeckOption(cand, pool, customBasics);
    const evaluation = evaluateDeck(maindeck, evaluationOptions);
    const position = idx + 1;
    const title = `Option ${String(position)} : ${evaluation.archetype.label}`;

    return {
      position,
      title,
      maindeck: maindeck.map((c) => c.id),
      sideboard: sideboard.map((c) => c.id),
      evaluation,
    };
  });

  // Re-sort options by overallScore descending and renumber positions
  options.sort((a, b) => b.evaluation.overallScore - a.evaluation.overallScore);
  return options.map((opt, i) => ({
    ...opt,
    position: i + 1,
    title: `Option ${String(i + 1)} : ${opt.evaluation.archetype.label}`,
  }));
}
