import type {
  CardEvaluationInput,
  DeckBuildOption,
  DeckEvaluationOptions,
  MtGColor,
} from "./types.ts";
import { ALL_COLORS, getEffectiveProducingColors } from "./dynamic-score.ts";
import { evaluateDeck } from "./deck-evaluation.ts";
import {
  COMPATIBLE_TRIBE_MAP,
  KNOWN_TRIBAL_SUBTYPES,
  getCardRelevantTribes,
  isChangeling,
} from "./tribal-compatibility.ts";

export interface BasicLandDefinitions {
  readonly W: CardEvaluationInput;
  readonly U: CardEvaluationInput;
  readonly B: CardEvaluationInput;
  readonly R: CardEvaluationInput;
  readonly G: CardEvaluationInput;
}

export interface DeckBuildConstraints {
  readonly targetNonlandCards?: number;
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
  readonly focusTribe?: string;
  readonly compatibleTribes?: readonly string[];
}

const TRIBE_PLURAL_LABELS: Record<string, string> = {
  Elf: "Elfes",
  Wolf: "Loups",
  Werewolf: "Garous",
  Goblin: "Gobelins",
  Dragon: "Dragons",
  Human: "Humains",
  Angel: "Anges",
  Wizard: "Sorciers",
  Zombie: "Zombies",
  Vampire: "Vampires",
  Merfolk: "Ondins",
  Spirit: "Esprits",
  Faerie: "Fées",
  Knight: "Chevaliers",
  Sliver: "Slivoïdes",
  Eldrazi: "Eldrazi",
};

interface TribeCluster {
  readonly primaryTribe: string;
  readonly compatibleTribes: readonly string[];
  readonly count: number;
}

function detectViableTribeClusters(
  spells: readonly CardEvaluationInput[],
  threshold = 6,
): readonly TribeCluster[] {
  const clusters = new Map<string, TribeCluster>();

  for (const tribe of KNOWN_TRIBAL_SUBTYPES) {
    const compatible = COMPATIBLE_TRIBE_MAP[tribe] ?? [tribe];
    const key = [...compatible].sort().join("+");

    let count = 0;
    for (const spell of spells) {
      if (isChangeling(spell)) {
        count++;
        continue;
      }
      const cardTribes = getCardRelevantTribes(spell);
      if (cardTribes.some((t) => compatible.includes(t))) {
        count++;
      }
    }

    if (count >= threshold) {
      const existing = clusters.get(key);
      if (!existing || count > existing.count) {
        clusters.set(key, {
          primaryTribe: tribe,
          compatibleTribes: compatible,
          count,
        });
      }
    }
  }

  return [...clusters.values()].sort((a, b) => b.count - a.count);
}

function computeAdjustedSpellScore(
  spell: CardEvaluationInput,
  focusTribe: string | undefined,
  compatibleTribes: readonly string[] | undefined,
  bombThreshold = 45,
): number {
  if (!focusTribe || !compatibleTribes || compatibleTribes.length === 0) {
    return spell.staticScore;
  }

  const isOnTribe =
    isChangeling(spell) || getCardRelevantTribes(spell).some((t) => compatibleTribes.includes(t));

  const isCreature =
    (spell.types?.includes("Creature") ?? false) ||
    (spell.typeLine ?? "").includes("Creature") ||
    getCardRelevantTribes(spell).length > 0;

  if (isOnTribe) {
    return spell.staticScore + 8;
  }

  if (isCreature) {
    const isBomb = spell.staticScore >= bombThreshold;
    if (isBomb) {
      return spell.staticScore;
    }
    return spell.staticScore - 30;
  }

  const text = (spell.oracleText ?? "").toLowerCase();
  const isOffTribePayoff = KNOWN_TRIBAL_SUBTYPES.some(
    (tribe) =>
      !compatibleTribes.includes(tribe) &&
      new RegExp(`\\b${tribe.toLowerCase()}s?\\b`, "i").test(text) &&
      !new RegExp(`\\b${tribe.toLowerCase()}s?\\b`, "i").test(spell.name.toLowerCase()),
  );

  if (isOffTribePayoff) {
    return spell.staticScore - 30;
  }

  return spell.staticScore;
}

function isModalLand(card: CardEvaluationInput): boolean {
  if (card.isLand) return false;
  return (
    /\/\/\s*(?:basic\s+)?land\b/i.test(card.typeLine ?? "") ||
    /\b(?:as|when) (?:this|that) land enters\b/i.test(card.oracleText ?? "")
  );
}

function estimateTargetLandCount(spells: readonly CardEvaluationInput[]): 16 | 17 | 18 {
  const curveSample = [...spells].sort((a, b) => b.staticScore - a.staticScore).slice(0, 24);
  const averageManaValue =
    curveSample.length === 0
      ? 3
      : curveSample.reduce((sum, card) => sum + (card.cmc ?? 3), 0) / curveSample.length;
  if (averageManaValue <= 2.25) return 16;
  if (averageManaValue >= 3.75) return 18;
  return 17;
}

/**
 * Builds a 40-card deck option from a given color path and drafted pool.
 */
function assembleDeckOption(
  candidate: ColorPathCandidate,
  allPool: readonly CardEvaluationInput[],
  basics: BasicLandDefinitions,
  evaluationOptions: DeckEvaluationOptions = {},
  constraints: DeckBuildConstraints = {},
): { maindeck: CardEvaluationInput[]; sideboard: CardEvaluationInput[] } {
  const bombThreshold = evaluationOptions.bombThreshold ?? 45;

  const scoredSpells = candidate.spells.map((c) => ({
    card: c,
    adjustedScore: computeAdjustedSpellScore(
      c,
      candidate.focusTribe,
      candidate.compatibleTribes,
      bombThreshold,
    ),
  }));

  scoredSpells.sort((a, b) => {
    if (b.adjustedScore !== a.adjustedScore) {
      return b.adjustedScore - a.adjustedScore;
    }
    return b.card.staticScore - a.card.staticScore;
  });

  const sortedSpells = scoredSpells.map((s) => s.card);

  const targetLands = estimateTargetLandCount(sortedSpells);
  let targetSpellCards = constraints.targetNonlandCards ?? 40 - targetLands;
  if (constraints.targetNonlandCards === undefined) {
    for (let pass = 0; pass < 4; pass++) {
      const modalLandCount = Math.min(
        4,
        sortedSpells.slice(0, targetSpellCards).filter(isModalLand).length,
      );
      const nextTargetSpellCards = 40 - Math.max(0, targetLands - modalLandCount);
      if (nextTargetSpellCards === targetSpellCards) break;
      targetSpellCards = nextTargetSpellCards;
    }
  }
  const actualLandSlots = 40 - targetSpellCards;
  const nonBasicLands = [...candidate.lands]
    .sort((a, b) => b.staticScore - a.staticScore)
    .slice(0, actualLandSlots);
  let neededBasicLands = Math.max(0, actualLandSlots - nonBasicLands.length);
  const targetSpells = 40 - nonBasicLands.length - neededBasicLands;

  let chosenSpells: CardEvaluationInput[] = [];
  if (candidate.focusTribe && candidate.compatibleTribes) {
    const primarySelected: CardEvaluationInput[] = [];
    const overflow: CardEvaluationInput[] = [];
    let offTribeCreatureCount = 0;
    const compTribes = candidate.compatibleTribes;

    for (const spell of sortedSpells) {
      const isOffTribeCreature =
        !isChangeling(spell) &&
        !getCardRelevantTribes(spell).some((t) => compTribes.includes(t)) &&
        ((spell.types?.includes("Creature") ?? false) ||
          (spell.typeLine ?? "").includes("Creature") ||
          getCardRelevantTribes(spell).length > 0);

      if (isOffTribeCreature) {
        if (offTribeCreatureCount < 1) {
          offTribeCreatureCount++;
          primarySelected.push(spell);
        } else {
          overflow.push(spell);
        }
      } else {
        primarySelected.push(spell);
      }
    }

    const candidateOrder = [...primarySelected, ...overflow];
    chosenSpells = candidateOrder.slice(0, targetSpells);
  } else {
    chosenSpells = sortedSpells.slice(0, targetSpells);
  }

  // If pool has fewer compatible spells than targetSpells, compensate with basic lands to guarantee 40 cards
  if (chosenSpells.length < targetSpells) {
    neededBasicLands += targetSpells - chosenSpells.length;
  }

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
  constraints: DeckBuildConstraints = {},
): readonly DeckBuildOption[] {
  const spells = pool.filter((c) => !c.isLand);
  const lands = pool.filter((c) => c.isLand);
  const bombThreshold = evaluationOptions.bombThreshold ?? 45;

  // Evaluate candidate color paths (all pairs + trios)
  const candidatePaths: ColorPathCandidate[] = [];

  const evaluatePath = (colors: readonly MtGColor[]) => {
    const colorSet = new Set(colors);
    const compatibleSpells = spells.filter((c) => canCastWithColors(c, colorSet));
    if (compatibleSpells.length < (constraints.targetNonlandCards ?? 22)) return;

    const compatibleLands = lands.filter((land) => {
      const produced = getEffectiveProducingColors(land);
      return produced.length === 0 || produced.some((c) => colorSet.has(c));
    });

    const targetSpellCount =
      constraints.targetNonlandCards ?? 40 - estimateTargetLandCount(compatibleSpells);
    const viableTribes = detectViableTribeClusters(compatibleSpells);

    if (viableTribes.length > 0) {
      for (const vt of viableTribes) {
        const scored = compatibleSpells.map((c) => ({
          card: c,
          adjusted: computeAdjustedSpellScore(
            c,
            vt.primaryTribe,
            vt.compatibleTribes,
            bombThreshold,
          ),
        }));
        scored.sort((a, b) => b.adjusted - a.adjusted);
        const topSpells = scored.slice(0, targetSpellCount);
        const spellScore = topSpells.reduce((acc, s) => acc + s.adjusted, 0);
        const fixersBonus = compatibleLands.length * 5;
        const score = spellScore + fixersBonus;

        candidatePaths.push({
          colors,
          spells: compatibleSpells,
          lands: compatibleLands,
          score,
          focusTribe: vt.primaryTribe,
          compatibleTribes: vt.compatibleTribes,
        });
      }
    } else {
      const topSpells = [...compatibleSpells]
        .sort((a, b) => b.staticScore - a.staticScore)
        .slice(0, targetSpellCount);
      const spellScore = topSpells.reduce((acc, c) => acc + c.staticScore, 0);
      const fixersBonus = compatibleLands.length * 5;
      const score = spellScore + fixersBonus;

      candidatePaths.push({
        colors,
        spells: compatibleSpells,
        lands: compatibleLands,
        score,
      });
    }
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
    // Check diversity: avoid picking identical color + focusTribe paths
    const isDuplicate = selectedPaths.some(
      (p) =>
        p.colors.length === cand.colors.length &&
        p.colors.every((c) => cand.colors.includes(c)) &&
        p.focusTribe === cand.focusTribe,
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
    const { maindeck, sideboard } = assembleDeckOption(
      cand,
      pool,
      customBasics,
      evaluationOptions,
      constraints,
    );
    const evaluation = evaluateDeck(maindeck, evaluationOptions);
    const position = idx + 1;
    let label = evaluation.archetype.label;
    if (cand.focusTribe) {
      const tribeLabel = TRIBE_PLURAL_LABELS[cand.focusTribe] ?? `${cand.focusTribe}s`;
      if (
        !label.toLowerCase().includes(cand.focusTribe.toLowerCase()) &&
        !label.toLowerCase().includes(tribeLabel.toLowerCase())
      ) {
        label = `${label} (${tribeLabel})`;
      }
    }
    const title = `Option ${String(position)} : ${label}`;

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
  return options.map((opt, i) => {
    const titleParts = opt.title.split(" : ");
    const suffix = titleParts.slice(1).join(" : ") || opt.evaluation.archetype.label;
    return {
      ...opt,
      position: i + 1,
      title: `Option ${String(i + 1)} : ${suffix}`,
    };
  });
}
