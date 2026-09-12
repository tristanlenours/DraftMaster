import type {
  CardEvaluation,
  CardEvaluationInput,
  MidDraftReview,
  MtGColor,
  PackEvaluationContext,
} from "./types.ts";
import { evaluatePack, getEffectiveProducingColors } from "./dynamic-score.ts";
import { detectArchetype } from "./deck-archetypes.ts";
import { LlmRouter } from "../../companion/llm-router.ts";
import { buildDraftAdvicePrompt } from "../../companion/coach-prompts.ts";
import type { CompanionCard } from "../../companion/card-resolver.ts";
import { detectDraftedTribalContext, isCardTriballyIncompatible } from "./tribal-compatibility.ts";

export interface DraftCoachAlternative {
  readonly id: string;
  readonly name: string;
  readonly reason: string;
}

export interface DraftCoachAdvice {
  readonly topPickId: string;
  readonly topPickName: string;
  readonly reason: string;
  readonly alternatives: readonly DraftCoachAlternative[];
  readonly provider: string;
  readonly packReview?: MidDraftReview | undefined;
}

export interface DraftCoachOptions {
  readonly packCards: readonly (CardEvaluationInput | CompanionCard)[];
  readonly priorPool: readonly (CardEvaluationInput | CompanionCard)[];
  readonly packNumber: number;
  readonly pickNumber: number;
  readonly evaluationContext?: Pick<PackEvaluationContext, "cubeKey" | "catalog" | "cubeMeta">;
  readonly llmRouter?: LlmRouter | undefined;
  readonly skipLlm?: boolean | undefined;
}

function toCardEvaluationInput(c: CardEvaluationInput | CompanionCard): CardEvaluationInput {
  if ("grpId" in c) {
    return {
      id: String(c.grpId),
      name: c.name,
      staticScore: c.powerScore ?? (c.rarity === 4 ? 35 : 25),
      colors: c.colors as MtGColor[],
      cmc: c.cmc,
      manaCost: c.manaCost,
      typeLine: c.typeLine,
      oracleText: c.oracleText,
      producesColors: c.producesColors as MtGColor[] | undefined,
      isLand: c.isLand,
      powerScore: c.powerScore,
      tier: c.tier,
      roles: c.roles,
    };
  }
  return c;
}

function toCompanionCard(
  c: CardEvaluationInput | CompanionCard,
  dynamicScore?: number,
): CompanionCard {
  if ("grpId" in c) {
    return {
      ...c,
      powerScore: dynamicScore ?? c.powerScore,
    };
  }
  return {
    grpId: parseInt(c.id, 10) || 0,
    name: c.name,
    manaCost: c.manaCost ?? "",
    cmc: c.cmc ?? 0,
    rarity: 2,
    colors: c.colors,
    isLand: Boolean(c.isLand),
    imageUrl: "",
    oracleText: c.oracleText,
    typeLine: c.typeLine,
    producesColors: c.producesColors,
    powerScore: dynamicScore ?? c.powerScore ?? c.staticScore,
    tier: c.tier,
    roles: c.roles,
  };
}

let sharedLlmRouter: LlmRouter | null = null;
function getSharedLlmRouter(): LlmRouter {
  sharedLlmRouter ??= new LlmRouter();
  return sharedLlmRouter;
}

/**
 * Deterministic mid-draft review generated at Pack 2 Pick 1 and Pack 3 Pick 1.
 * Analyzes drafted pool, curve, mana fixing proportion, archetype priorities, and reading signals.
 */
export function buildMidDraftReview(
  priorPool: readonly CardEvaluationInput[],
  packNumber: number,
  cubeKey?: string,
  cubeMeta?: unknown,
): MidDraftReview {
  const spells = priorPool.filter((c) => !c.isLand);
  const lands = priorPool.filter((c) => Boolean(c.isLand));

  const oneDrops = spells.filter((c) => (c.cmc ?? 0) <= 1).length;
  const twoDrops = spells.filter((c) => (c.cmc ?? 0) === 2).length;
  const threeDrops = spells.filter((c) => (c.cmc ?? 0) === 3).length;
  const fourPlusDrops = spells.filter((c) => (c.cmc ?? 0) >= 4).length;
  const totalCmc = spells.reduce((acc, c) => acc + (c.cmc ?? 0), 0);
  const avgCmc = spells.length > 0 ? totalCmc / spells.length : 0;

  const archetype = detectArchetype(priorPool);
  const primaryColors = archetype.primaryColors;
  const splashColors = archetype.splashColors;
  const allDeckColors = new Set<MtGColor>([...primaryColors, ...splashColors]);

  const tribalCtx = detectDraftedTribalContext(priorPool, cubeKey, cubeMeta);
  const archetypeLabel = tribalCtx.isTribalEngaged
    ? `${archetype.label} (${tribalCtx.dominantTribes.join(" & ")})`
    : archetype.label;

  // Fixers evaluation
  const fixers = priorPool.filter((c) => {
    const produces = getEffectiveProducingColors(c);
    const text = (c.oracleText ?? "").toLowerCase();
    const isMultiColorProducer = produces.length >= 2;
    const isAnyColor = /any color|search your library for (?:a|an) [^.]+ land/i.test(text);
    return isMultiColorProducer || isAnyColor;
  });

  const fixersCount = fixers.length;
  const numColors = allDeckColors.size;

  let isProportionGood = true;
  let targetRecommendation = "";
  let fixingAnalysis = "";

  if (numColors <= 1) {
    targetRecommendation = "0 fixeur (deck mono-couleur)";
    isProportionGood = true;
    fixingAnalysis =
      "Mono-couleur : ta base de terrains basiques suffit amplement. Pas besoin de sacrifier des choix sur des fixeurs, concentre-toi sur les sorts d'impact !";
  } else if (numColors === 2) {
    const minTarget = packNumber === 2 ? 1 : 2;
    const idealTarget = packNumber === 2 ? "1 à 2" : "3 à 4";
    targetRecommendation = `${idealTarget} fixeurs (${archetype.label})`;
    if (fixersCount < minTarget) {
      isProportionGood = false;
      fixingAnalysis = `⚠️ Déficit de fixeurs (${String(fixersCount)} fixeur). En bicolore, il est vivement conseillé de sécuriser 1 à 2 terrains doubles dans tes couleurs pour éviter les blocages de couleur (color screw).`;
    } else {
      isProportionGood = true;
      fixingAnalysis = `👍 Stabilité de mana en bonne voie (${String(fixersCount)} fixeur${fixersCount > 1 ? "s" : ""}). Un terrain double supplémentaire dans tes couleurs reste toujours une excellente valeur sûre.`;
    }
  } else {
    const minTarget = packNumber === 2 ? 2 : 4;
    const idealTarget = packNumber === 2 ? "2 à 3" : "4 à 6";
    targetRecommendation = `${idealTarget} fixeurs (${String(numColors)} couleurs)`;
    if (fixersCount < minTarget) {
      isProportionGood = false;
      fixingAnalysis = `🚨 Manabase fragile (${String(fixersCount)} fixeur${fixersCount > 1 ? "s" : ""} pour ${String(numColors)} couleurs) ! Pour supporter 3 couleurs ou un splash, les bilands, fetchlands et fixeurs doivent être une priorité absolue dans ce pack.`;
    } else {
      isProportionGood = true;
      fixingAnalysis = `✨ Manabase solide (${String(fixersCount)} fixeurs pour ${String(numColors)} couleurs) ! Ta base est suffisante pour alimenter tes couleurs sans encombre.`;
    }
  }

  const curveStats = {
    oneDrops,
    twoDrops,
    threeDrops,
    fourPlusDrops,
    landsCount: lands.length,
    avgCmc: Math.round(avgCmc * 10) / 10,
  };

  const poolSummary = `Pool actuel : ${String(priorPool.length)} cartes (${String(spells.length)} sorts, ${String(lands.length)} terrains). Archétype profilé : ${archetypeLabel}.`;

  const earlyDrops = oneDrops + twoDrops;
  let curveAnalysis = "";
  const priorities: string[] = [];

  // 1. Fixing Priority (if deficit)
  if (!isProportionGood) {
    const colorsLabel = [...allDeckColors].join("/") || archetype.label;
    priorities.push(
      `Sécuriser 1 à 2 fixeurs ou terrains doubles dans tes couleurs (${colorsLabel}) pour stabiliser ta manabase.`,
    );
  }

  // 2. Curve Diagnosis & Priority
  const minEarlyDropsTarget = packNumber === 2 ? 4 : 7;
  if (earlyDrops < minEarlyDropsTarget) {
    curveAnalysis = `⚠️ Courbe trop lourde (${String(earlyDrops)} drop${earlyDrops > 1 ? "s" : ""} 1-2). Tu risques de te faire déborder sans départs rapides ! Il faut impérativement faire baisser la courbe.`;
    priorities.push(
      "Privilégier les drops 1 et 2 pour faire baisser la courbe et garantir des sorties proactives.",
    );
  } else if (fourPlusDrops < (packNumber === 2 ? 2 : 4)) {
    curveAnalysis = `👍 Début de courbe solide (${String(earlyDrops)} drops 1-2). Il te manque toutefois quelques finisseurs ou menaces d'impact (CMC 4+) pour sceller les parties.`;
    priorities.push(
      "Sécuriser 2 à 3 menaces d'impact ou bombes de fin de courbe (CMC 4+) pour convertir tes sorties.",
    );
  } else {
    curveAnalysis = `⚖️ Courbe harmonieuse (${String(earlyDrops)} drops 1-2, ${String(threeDrops)} drops 3, ${String(fourPlusDrops)} CMC 4+). Conserve cette cadence sans encombrer le haut de courbe.`;
    priorities.push(
      "Combler les derniers manques de la courbe tout en maximisant la qualité individuelle des cartes.",
    );
  }

  // 3. Archetype Key Card & Tribal Priority
  if (tribalCtx.isTribalEngaged) {
    priorities.push(
      `⚔️ Synergie tribale (${tribalCtx.dominantTribes.join(" & ")}) : Renforcer la tribu ou ses alliés compatibles (${tribalCtx.compatibleTribes.join(", ")}). Éviter les créatures d'autres tribus non compatibles.`,
    );
  } else {
    priorities.push(
      `Drafter une carte clé dans l'archétype initié (${archetype.label}) : payoff puissant, removal premium ou enabler synergique.`,
    );
  }

  // 4. Bingo Card Priority
  priorities.push(
    "🌟 Et si on choppe une carte recherchée (bombe mythique ou staple majeur de tes couleurs), c'est bingo !",
  );

  const signalTip =
    "🔄 Lecture du draft : À partir du deuxième passage des cartes (picks 9+ / roue), observe bien ce qui revient. Les cartes fortes qui tournent signalent les couleurs et archétypes laissés ouverts par tes voisins !";

  return {
    packNumber,
    poolSummary,
    archetypeLabel,
    curveStats,
    curveAnalysis,
    fixingStats: {
      fixersCount,
      isProportionGood,
      targetRecommendation,
    },
    fixingAnalysis,
    priorities,
    signalTip,
  };
}

/**
 * Unified Draft Coach Service
 *
 * Combines:
 * 1. The deterministic MTG mathematical dynamic score engine (`evaluatePack`).
 * 2. The Pro Tour AI persona prompt (Gemini Flash / DeepSeek) via `LlmRouter`.
 * 3. Graceful fallback to `evaluatePack` rankings and tactical explanations when offline or in tests.
 */
export async function getUnifiedDraftAdvice(options: DraftCoachOptions): Promise<DraftCoachAdvice> {
  const { packCards, priorPool, packNumber, pickNumber, evaluationContext, skipLlm } = options;

  if (packCards.length === 0) {
    throw new Error("Cannot get pick advice: booster is empty");
  }

  // 1. Convert to CardEvaluationInput for mathematical evaluation
  const offeredInputs = packCards.map(toCardEvaluationInput);
  const priorInputs = priorPool.map(toCardEvaluationInput);

  const evalContext: PackEvaluationContext = {
    ...evaluationContext,
    packNumber,
    pickNumber,
    offeredCards: offeredInputs,
    priorPool: priorInputs,
  };

  const cubeKey = evaluationContext?.cubeKey;
  const tribalContext = detectDraftedTribalContext(
    priorInputs,
    cubeKey,
    evaluationContext?.cubeMeta,
  );

  const evaluated = evaluatePack(evalContext);

  // Filter evaluated cards on tribal cubes to avoid recommending incompatible tribal cards
  const compatibleEvaluated = tribalContext.isTribalEngaged
    ? evaluated.filter((ev) => {
        const orig = packCards.find((c) => ("grpId" in c ? String(c.grpId) : c.id) === ev.id);
        return !orig || !isCardTriballyIncompatible(orig, tribalContext);
      })
    : evaluated;

  const topEvaluated = compatibleEvaluated[0] ?? evaluated[0];
  if (!topEvaluated) {
    throw new Error("Evaluation returned no scored cards");
  }

  // Deterministic mid-draft review at Pack 2 Pick 1 and Pack 3 Pick 1
  const isMidDraftStart = packNumber >= 2 && pickNumber === 1;
  const deterministicReview = isMidDraftStart
    ? buildMidDraftReview(priorInputs, packNumber, cubeKey, evaluationContext?.cubeMeta)
    : undefined;

  // Default deterministic advice
  const deterministicAlternatives: DraftCoachAlternative[] = (
    compatibleEvaluated.length > 1 ? compatibleEvaluated : evaluated
  )
    .slice(1, 3)
    .map((alt) => {
      const original = packCards.find((c) => ("grpId" in c ? String(c.grpId) : c.id) === alt.id);
      const id = original ? ("grpId" in original ? String(original.grpId) : original.id) : alt.id;
      return {
        id,
        name: alt.name,
        reason:
          alt.explanation.length > 0
            ? alt.explanation
            : `Score dynamique : ${String(alt.dynamicScore)}`,
      };
    });

  const originalTop = packCards.find(
    (c) => ("grpId" in c ? String(c.grpId) : c.id) === topEvaluated.id,
  );
  const topId = originalTop
    ? "grpId" in originalTop
      ? String(originalTop.grpId)
      : originalTop.id
    : topEvaluated.id;

  const deterministicAdvice: DraftCoachAdvice = {
    topPickId: topId,
    topPickName: topEvaluated.name,
    reason:
      topEvaluated.explanation.length > 0
        ? topEvaluated.explanation
        : `Meilleur score dynamique : ${String(topEvaluated.dynamicScore)}`,
    alternatives: deterministicAlternatives,
    provider: "engine",
    packReview: deterministicReview,
  };

  const isTestEnv = Boolean(process.env.VITEST ?? process.env.NODE_ENV === "test");
  if (skipLlm || (isTestEnv && !options.llmRouter)) {
    return deterministicAdvice;
  }

  // 2. Invoke LLM Coach if configured
  try {
    const router = options.llmRouter ?? getSharedLlmRouter();
    if (!router.hasConfiguredKeys()) {
      return deterministicAdvice;
    }

    // Map cards to CompanionCard enriched with the calculated dynamic scores
    const evalMap = new Map<string, CardEvaluation>();
    for (const ev of evaluated) {
      evalMap.set(ev.id, ev);
    }

    const compPackCards = packCards.map((c) => {
      const id = "grpId" in c ? String(c.grpId) : c.id;
      const ev = evalMap.get(id);
      return toCompanionCard(c, ev?.dynamicScore);
    });

    const compPoolCards = priorPool.map((c) => toCompanionCard(c));

    const { system, user } = buildDraftAdvicePrompt(
      compPackCards,
      compPoolCards,
      packNumber,
      pickNumber,
      { cubeKey, tribalContext },
    );

    const res = await router.generateJson<{
      topPick: string;
      reason: string;
      alternatives?: { name: string; reason: string }[];
      packReview?: {
        summary?: string;
        curveAdvice?: string;
        fixingAdvice?: string;
        priorities?: string[];
        signalsTip?: string;
      };
    }>(system, user);

    if (res.success && res.content?.topPick) {
      const topPickName = res.content.topPick.trim();
      let matchedTop = findBestCardMatch(topPickName, packCards);

      // Tribal safety guard: if matchedTop is incompatible with the player's active tribe, reject and fallback
      if (
        matchedTop &&
        tribalContext.isTribalEngaged &&
        isCardTriballyIncompatible(matchedTop, tribalContext)
      ) {
        const safeFallback = packCards.find((c) => !isCardTriballyIncompatible(c, tribalContext));
        if (safeFallback) {
          matchedTop = safeFallback;
        }
      }

      if (matchedTop) {
        const matchedTopId = "grpId" in matchedTop ? String(matchedTop.grpId) : matchedTop.id;

        const alternatives: DraftCoachAlternative[] = [];
        if (Array.isArray(res.content.alternatives)) {
          for (const alt of res.content.alternatives) {
            if (!alt.name) continue;
            const matchedAlt = findBestCardMatch(alt.name.trim(), packCards);
            if (matchedAlt) {
              if (
                tribalContext.isTribalEngaged &&
                isCardTriballyIncompatible(matchedAlt, tribalContext)
              ) {
                continue; // Filter out incompatible tribal card!
              }
              const matchedAltId = "grpId" in matchedAlt ? String(matchedAlt.grpId) : matchedAlt.id;
              if (matchedAltId !== matchedTopId) {
                alternatives.push({
                  id: matchedAltId,
                  name: matchedAlt.name,
                  reason: alt.reason,
                });
              }
            }
          }
        }

        let finalReview = deterministicReview;
        if (deterministicReview && res.content.packReview) {
          finalReview = {
            packNumber,
            poolSummary: res.content.packReview.summary ?? deterministicReview.poolSummary,
            archetypeLabel: deterministicReview.archetypeLabel,
            curveStats: deterministicReview.curveStats,
            curveAnalysis: res.content.packReview.curveAdvice ?? deterministicReview.curveAnalysis,
            fixingStats: deterministicReview.fixingStats,
            fixingAnalysis:
              res.content.packReview.fixingAdvice ?? deterministicReview.fixingAnalysis,
            priorities:
              Array.isArray(res.content.packReview.priorities) &&
              res.content.packReview.priorities.length > 0
                ? res.content.packReview.priorities
                : deterministicReview.priorities,
            signalTip: res.content.packReview.signalsTip ?? deterministicReview.signalTip,
          };
        }

        return {
          topPickId: matchedTopId,
          topPickName: matchedTop.name,
          reason: res.content.reason,
          alternatives: alternatives.length > 0 ? alternatives : deterministicAlternatives,
          provider: res.provider,
          packReview: finalReview,
        };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[DraftCoachService] LLM coach query failed, falling back to engine:", message);
  }

  return deterministicAdvice;
}

function findBestCardMatch(
  targetName: string,
  cards: readonly (CardEvaluationInput | CompanionCard)[],
): (CardEvaluationInput | CompanionCard) | undefined {
  const normTarget = targetName.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Exact match
  const exact = cards.find((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normTarget);
  if (exact) return exact;

  // Substring match
  const sub = cards.find((c) => {
    const normCard = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normCard.includes(normTarget) || normTarget.includes(normCard);
  });
  return sub;
}
