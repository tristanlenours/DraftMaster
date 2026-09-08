import type { CardEvaluation, CoachingScoreBreakdown, PackEvaluationContext } from "./types.ts";
import { computeColorFrequencies, getDominantColors } from "./dynamic-score.ts";

/**
 * Generates a concise, pedagogical coaching explanation in French
 * to help players understand WHY a card is ranked at this score.
 */
export function generateCoachingExplanation(
  evalCard: CardEvaluation,
  breakdown: CoachingScoreBreakdown,
  rankInPack: number,
  _totalInPack: number,
  context: PackEvaluationContext,
): string {
  const { staticScore, dynamicScore, delta } = evalCard;
  const isTopPick = rankInPack === 1;
  const isP1P1 = context.packNumber === 1 && context.pickNumber === 1;

  if (isP1P1) {
    if (isTopPick) {
      return `Meilleure carte du booster en valeur intrinsèque (${String(staticScore)}). Un excellent point de départ pour orienter votre draft.`;
    }
    if (staticScore >= 40) {
      return `Très forte puissance brute (${String(staticScore)}). Excellente option si vous préférez cette couleur ou cet archétype.`;
    }
    return `Carte décente (${String(staticScore)}), mais surclassée par les meilleures options du premier paquet.`;
  }

  const dominant = getDominantColors(computeColorFrequencies(context.priorPool));
  const dominantStr = dominant.filter(Boolean).join("/");

  // Top Pick
  if (isTopPick) {
    if (breakdown.manaFixingBonus > 0) {
      return `Choix prioritaire recommandé : terrain clé (+${String(breakdown.manaFixingBonus)} pts) qui stabilise parfaitement votre base de mana ${dominantStr}.`;
    }
    if (delta >= 0) {
      return `Choix prioritaire recommandé : carte maîtresse dans vos couleurs (${dominantStr}), qui renforce directement votre plan de jeu.`;
    }
    return `Choix prioritaire recommandé : reste la meilleure carte du paquet pour votre deck (${String(dynamicScore)} pts) malgré la baisse naturelle.`;
  }

  // Heavy off-color penalty on a strong card
  if (breakdown.colorPenalty >= 10 && staticScore >= 35) {
    return `Attention piège : carte individuellement très forte (${String(staticScore)} pts), mais pénalisée de -${String(breakdown.colorPenalty)} pts car vous n'avez pas ces couleurs (${dominantStr}).`;
  }

  // Dual Land of correct colors
  if (breakdown.manaFixingBonus > 0) {
    return `Excellente fixation de mana (+${String(breakdown.manaFixingBonus)} pts) pour consolider vos couleurs ${dominantStr}.`;
  }

  // Solid in-color card (rank 2 or 3)
  if (rankInPack <= 3 && breakdown.colorAffinityFactor >= 0.8) {
    return `Très bonne alternative dans vos couleurs (${dominantStr}). Renforce la consistance de votre deck.`;
  }

  // Moderate penalty
  if (breakdown.colorPenalty > 5) {
    return `Pénalité hors-couleur (-${String(breakdown.colorPenalty)} pts) : difficilement intégrable dans votre base ${dominantStr}.`;
  }

  // Low score filler
  if (dynamicScore < 15) {
    return `Faible impact dans votre stratégie actuelle. Priorité basse pour ce tour.`;
  }

  return `Option secondaire convenable (${String(dynamicScore)} pts) si vous souhaitez élargir votre réserve.`;
}
