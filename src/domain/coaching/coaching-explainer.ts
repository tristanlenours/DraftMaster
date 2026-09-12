import type {
  CardEvaluation,
  CoachingScoreBreakdown,
  PackEvaluationContext,
  MtGColor,
} from "./types.ts";
import { computeColorFrequencies, getDominantColors, parseManaCostPips } from "./dynamic-score.ts";

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
  const { staticScore, dynamicScore } = evalCard;
  const isTopPick = rankInPack === 1;
  const isP1P1 = context.packNumber === 1 && context.pickNumber === 1;

  if (isP1P1) {
    if (isTopPick) {
      return `Meilleure carte du booster en valeur intrinsèque (${String(Math.round(staticScore))}). Un excellent point de départ pour orienter votre draft.`;
    }
    if (staticScore >= 40) {
      return `Très forte puissance brute (${String(Math.round(staticScore))}). Excellente option si vous préférez cette couleur ou cet archétype.`;
    }
    return `Carte décente (${String(Math.round(staticScore))}), mais surclassée par les meilleures options du premier paquet.`;
  }

  const card = context.offeredCards.find((c) => c.id === evalCard.id);
  const isLand = card?.isLand ?? false;

  // Resolve card colors from explicit colors or mana cost pips
  let cardColors: readonly MtGColor[] = card?.colors ?? [];
  if (cardColors.length === 0 && card && !isLand) {
    const pips = parseManaCostPips(card);
    const pipColors = [...new Set(pips.flat())];
    if (pipColors.length > 0) {
      cardColors = pipColors;
    }
  }

  const isColorless = !isLand && cardColors.length === 0;
  const cardColorsStr = cardColors.join("/");

  const dominant = getDominantColors(computeColorFrequencies(context.priorPool));
  const dominantStr = dominant.filter(Boolean).join("/");
  const hasDominant = dominant.length > 0;

  const sharesColor = hasDominant && cardColors.some((c) => dominant.includes(c));
  const allInDominant =
    hasDominant && cardColors.length > 0 && cardColors.every((c) => dominant.includes(c));

  // Top Pick
  if (isTopPick) {
    if (breakdown.manaFixingBonus > 0) {
      return `Choix prioritaire recommandé : terrain clé (+${String(Math.round(breakdown.manaFixingBonus))} pts) qui stabilise parfaitement votre base de mana ${dominantStr}.`;
    }
    if (isColorless) {
      return `Choix prioritaire recommandé : excellente option incolore (${String(Math.round(dynamicScore))} pts), flexible et jouable dans n'importe quel deck.`;
    }
    if (allInDominant) {
      return `Choix prioritaire recommandé : carte maîtresse dans vos couleurs (${dominantStr}), qui renforce directement votre plan de jeu.`;
    }
    if (sharesColor) {
      return `Choix prioritaire recommandé : excellente carte bicolore (${cardColorsStr}), associant votre base (${dominantStr}) à une extension naturelle.`;
    }
    if (dominant.length <= 1) {
      return `Choix prioritaire recommandé : carte puissante (${cardColorsStr}) — excellente opportunité d'ouvrir votre seconde couleur avec votre base (${dominantStr}).`;
    }
    return `Choix prioritaire recommandé : bombe individuelle hors de vos couleurs (${dominantStr}) — envisageable comme pivot ou splash si vous changez de cap.`;
  }

  // Heavy off-color penalty on a strong card
  if (breakdown.colorPenalty >= 10 && staticScore >= 35) {
    return `Attention piège : carte individuellement très forte (${String(Math.round(staticScore))} pts), mais pénalisée de -${String(Math.round(breakdown.colorPenalty))} pts car vous n'avez pas ces couleurs (${dominantStr}).`;
  }

  // Tribal incompatibility penalty
  if (breakdown.tribalPenalty && breakdown.tribalPenalty > 0) {
    return `Tribu incompatible avec votre axe tribal en cours : carte déconseillée (-${String(Math.round(breakdown.tribalPenalty))} pts).`;
  }

  // Dual Land of correct colors
  if (breakdown.manaFixingBonus > 0) {
    return `Excellente fixation de mana (+${String(Math.round(breakdown.manaFixingBonus))} pts) pour consolider vos couleurs ${dominantStr}.`;
  }

  // Solid in-color card (rank 2 or 3)
  if (rankInPack <= 3) {
    if (isColorless) {
      return `Très bonne alternative incolore. S'intègre sans contrainte dans votre deck.`;
    }
    if (allInDominant) {
      return `Très bonne alternative dans vos couleurs (${dominantStr}). Renforce la consistance de votre deck.`;
    }
    if (sharesColor) {
      return `Alternative bicolore (${cardColorsStr}) compatible avec votre base (${dominantStr}).`;
    }
    return `Alternative hors-couleurs (${cardColorsStr}) puissante si vous souhaitez ouvrir une seconde couleur.`;
  }

  // Moderate penalty
  if (breakdown.colorPenalty > 5) {
    return `Pénalité hors-couleur (-${String(Math.round(breakdown.colorPenalty))} pts) : difficilement intégrable dans votre base ${dominantStr}.`;
  }

  // Low score filler
  if (dynamicScore < 15) {
    return `Faible impact dans votre stratégie actuelle. Priorité basse pour ce tour.`;
  }

  return `Option secondaire convenable (${String(Math.round(dynamicScore))} pts) si vous souhaitez élargir votre réserve.`;
}
