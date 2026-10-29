import type {
  CardEvaluationInput,
  DeckEvaluation,
  DeckEvaluationOptions,
  KiviatRadarScores,
  MtGColor,
} from "./types.ts";
import { evaluateDeck } from "./deck-evaluation.ts";
import { getEffectiveProducingColors } from "./dynamic-score.ts";

export interface DeckSwap {
  readonly removed: CardEvaluationInput;
  readonly added: CardEvaluationInput;
  readonly scoreBefore: number;
  readonly scoreAfter: number;
  /** Radar axes that moved, after minus before. */
  readonly axisDeltas: Partial<Record<keyof KiviatRadarScores, number>>;
}

export interface DeckOptimization {
  readonly maindeck: readonly CardEvaluationInput[];
  readonly evaluation: DeckEvaluation;
  readonly swaps: readonly DeckSwap[];
}

export interface DeckOptimizationSettings {
  /** Upper bound on accepted swaps. */
  readonly maxSwaps?: number;
  /** Basic lands available in any number for land swaps, one per color. */
  readonly basics?: Readonly<Record<MtGColor, CardEvaluationInput>>;
  /** Strongest castable reserve spells tried at each step. */
  readonly spellCandidates?: number;
}

const DEFAULT_MAX_SWAPS = 3;
const DEFAULT_SPELL_CANDIDATES = 12;
const RADAR_AXES = ["power", "synergy", "curve", "mana", "interaction"] as const;

/** Unrounded overall score, so the search can rank moves the rounded score would tie. */
function weightedScore(evaluation: DeckEvaluation): number {
  return evaluation.audit.contributions.reduce(
    (sum, contribution) => sum + contribution.score * contribution.weight,
    0,
  );
}

function byStrength(left: CardEvaluationInput, right: CardEvaluationInput): number {
  return right.staticScore - left.staticScore || left.id.localeCompare(right.id);
}

function distinctCards(cards: readonly CardEvaluationInput[]): CardEvaluationInput[] {
  return [...new Set(cards)];
}

/**
 * Bounded, deterministic hill climbing over one-for-one swaps between the maindeck and the
 * reserve: spells for castable reserve spells, lands for basics or reserve lands of the deck's
 * colors. Each step keeps the move that raises the Rate score most and stops once no move gains
 * at least one displayed point, so every reported swap is worth showing. Land count and colors
 * stay as submitted.
 */
export function optimizeDeck(
  maindeck: readonly CardEvaluationInput[],
  reserve: readonly CardEvaluationInput[],
  options: DeckEvaluationOptions = {},
  settings: DeckOptimizationSettings = {},
): DeckOptimization {
  const maxSwaps = settings.maxSwaps ?? DEFAULT_MAX_SWAPS;
  const spellCandidates = settings.spellCandidates ?? DEFAULT_SPELL_CANDIDATES;
  const basics: readonly CardEvaluationInput[] = settings.basics
    ? Object.values(settings.basics)
    : [];
  const basicSet = new Set<CardEvaluationInput>(basics);

  let current = [...maindeck];
  let evaluation = evaluateDeck(current, options);
  let available = [...reserve];
  const swaps: DeckSwap[] = [];

  while (swaps.length < maxSwaps) {
    const usedColors = new Set<MtGColor>(evaluation.audit.mana.usedColors);
    const inDeck = new Set(current);
    const spellIns = available
      .filter(
        (card) =>
          !card.isLand && !inDeck.has(card) && card.colors.every((color) => usedColors.has(color)),
      )
      .sort(byStrength)
      .slice(0, spellCandidates);
    const landIns = [
      ...basics.filter((basic) =>
        getEffectiveProducingColors(basic).some((color) => usedColors.has(color)),
      ),
      ...available
        .filter((card) => card.isLand && !inDeck.has(card))
        .filter((land) => {
          const produced = getEffectiveProducingColors(land);
          return produced.length === 0 || produced.some((color) => usedColors.has(color));
        })
        .sort(byStrength),
    ];
    const outs = distinctCards(current);

    let best: { deck: CardEvaluationInput[]; evaluation: DeckEvaluation; swap: DeckSwap } | null =
      null;
    let bestScore = weightedScore(evaluation);
    for (const removed of outs) {
      const index = current.indexOf(removed);
      for (const added of removed.isLand ? landIns : spellIns) {
        if (added === removed) continue;
        const candidate = [...current];
        candidate[index] = added;
        const candidateEvaluation = evaluateDeck(candidate, options);
        const score = weightedScore(candidateEvaluation);
        if (score <= bestScore || candidateEvaluation.overallScore < evaluation.overallScore + 1) {
          continue;
        }
        bestScore = score;
        const axisDeltas: Partial<Record<keyof KiviatRadarScores, number>> = {};
        for (const axis of RADAR_AXES) {
          const delta = candidateEvaluation.radar[axis] - evaluation.radar[axis];
          if (delta !== 0) axisDeltas[axis] = delta;
        }
        best = {
          deck: candidate,
          evaluation: candidateEvaluation,
          swap: {
            removed,
            added,
            scoreBefore: evaluation.overallScore,
            scoreAfter: candidateEvaluation.overallScore,
            axisDeltas,
          },
        };
      }
    }
    if (!best) break;

    const { swap } = best;
    current = best.deck;
    evaluation = best.evaluation;
    swaps.push(swap);
    available = available.filter((card) => card !== swap.added);
    if (!basicSet.has(swap.removed)) available.push(swap.removed);
  }

  return { maindeck: current, evaluation, swaps };
}
