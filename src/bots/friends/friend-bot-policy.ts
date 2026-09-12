import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";

import type { Result } from "../../draft/internal/errors.ts";
import type { CardEvaluationInput, PackEvaluationContext } from "../../domain/coaching/types.ts";
import { evaluatePack, getEffectiveProducingColors } from "../../domain/coaching/dynamic-score.ts";
import type {
  PickBiasContribution,
  PickCandidateTrace,
  PickContext,
  PickPolicy,
  PickPolicyDecision,
  PickPolicyError,
} from "../pick-policy.ts";
import type { CardMetadataResolver } from "../coached-bot-policy.ts";
import type { FriendProfile } from "./profiles.ts";

function policyFailure(
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): Result<never, PickPolicyError> {
  return {
    ok: false,
    error: {
      code: "POLICY_FAILED",
      message,
      details,
    },
  };
}

function policySuccess(
  value: Readonly<PickPolicyDecision>,
): Result<Readonly<PickPolicyDecision>, never> {
  return {
    ok: true,
    value,
  };
}

export interface FriendBotPolicyOptions {
  readonly profile: FriendProfile;
  readonly resolveCard?: CardMetadataResolver;
  readonly evaluationContext?: Pick<PackEvaluationContext, "cubeKey" | "catalog" | "cubeMeta">;
}

/**
 * Checks whether reanimator strategies exist in the cube context.
 * In cubes like Titou Tribal, reanimation spells do not exist.
 */
export function isReanimatorSupportedInCube(
  evaluationContext?: Pick<PackEvaluationContext, "cubeKey" | "catalog" | "cubeMeta">,
): boolean {
  if (!evaluationContext) return true;
  const { cubeKey, catalog } = evaluationContext;
  if (cubeKey === "titou_tribal") return false;
  if (catalog && cubeKey) {
    const cat = catalog as {
      getCardsInCube?: (
        key: string,
      ) => readonly { oracleText?: string; oracleId?: string; slug?: string; name?: string }[];
    };
    const cards = cat.getCardsInCube?.(cubeKey) ?? [];
    if (cards.length > 0) {
      return cards.some((c) => {
        const text = (c.oracleText ?? "").toLowerCase();
        return (
          /return .* from (your |a )?graveyard to the battlefield|put .* from a graveyard onto the battlefield/i.test(
            text,
          ) ||
          (c.oracleId?.includes("reanimate") ?? false) ||
          (c.slug?.includes("reanimate") ?? false) ||
          (c.name?.toLowerCase().includes("reanimate") ?? false)
        );
      });
    }
  }
  return true;
}

/**
 * Lists every personality rule that affected a candidate. Keeping the
 * contributions structured makes the bot decision auditable by callers.
 */
export function computeFriendCardBiasContributions(
  card: CardEvaluationInput,
  profile: FriendProfile,
  priorPool: readonly CardEvaluationInput[] = [],
  colorPenalty = 0,
  context: { isReanimatorSupported?: boolean } = {},
): readonly Readonly<PickBiasContribution>[] {
  const contributions: PickBiasContribution[] = [];
  const { biases } = profile;

  const add = (key: string, label: string, points: number): void => {
    if (points !== 0) {
      contributions.push({ key, label, points: Math.round(points * 10) / 10 });
    }
  };

  // 1. Ivan: High CMC & Big Mana
  if (biases.highCmcBonus && card.cmc !== undefined && card.cmc >= 5) {
    add("high-cmc", "Menace à coût élevé", biases.highCmcBonus);
    if (card.cmc >= 7) {
      add("colossal-threat", "Menace colossale", 3.5);
    }
  }
  if (
    biases.greenRampBonus &&
    card.colors.includes("G") &&
    card.cmc !== undefined &&
    card.cmc <= 3
  ) {
    add("green-ramp", "Accélération verte", biases.greenRampBonus);
  }

  // Ivan: Multi-color Fixing & Ramp (Chromatic Lantern, Coalition Relic, Birds of Paradise, etc.)
  if (biases.multiColorFixingBonus) {
    const text = (card.oracleText ?? "").toLowerCase();
    const effectiveProduces = getEffectiveProducingColors(card);
    const isAnyColorFixer =
      effectiveProduces.length >= 3 ||
      /add (one mana of )?any color|lands you control have|search your library for (a|two)? .*land/i.test(
        text,
      );
    if (isAnyColorFixer) {
      add("multi-color-fixing", "Fixation multicolore", biases.multiColorFixingBonus);
    }
  }

  // Ivan: Board Wipes / Wraths ("j'accélère, et wrath et je pose des grosses menaces")
  if (biases.boardWipeBonus) {
    const text = (card.oracleText ?? "").toLowerCase();
    const isBoardWipe =
      /destroy all|exile all|each creature|all creatures|all nonland permanents/i.test(text);
    if (isBoardWipe) {
      add("board-wipe", "Nettoyage de table", biases.boardWipeBonus);
    }
  }

  // Preferred colors affinity
  if (profile.preferredColors?.some((c) => card.colors.includes(c))) {
    add("preferred-color", "Couleur préférée", 2.0);
  }

  // Ivan: Anti-Red aversion (plays 4-color non-red)
  if (profile.id === "ivan" && card.colors.includes("R")) {
    add("red-aversion", "Aversion au rouge", -8.0);
  }

  // 2. Nico: Cheap interaction & early curve
  if (
    biases.cheapInteractionBonus &&
    card.cmc !== undefined &&
    card.cmc <= 2 &&
    (card.types?.includes("Instant") || card.types?.includes("Sorcery"))
  ) {
    add("cheap-interaction", "Interaction peu coûteuse", biases.cheapInteractionBonus);
  }
  if (biases.lowCurveBonus && card.cmc !== undefined && card.cmc <= 2) {
    add("low-curve", "Courbe basse", biases.lowCurveBonus);
  }

  // 3. Cédric: Value engines & strict low curve
  if (
    biases.valueEngineBonus &&
    (card.types?.includes("Creature") || card.types?.includes("Planeswalker")) &&
    card.staticScore >= 35
  ) {
    add("value-engine", "Moteur de value", biases.valueEngineBonus);
  }

  // 4. Hugues: Strange artifacts, sagas, weird combo engines
  if (
    biases.weirdEngineBonus &&
    (card.types?.includes("Artifact") ||
      card.types?.includes("Enchantment") ||
      card.types?.includes("Saga"))
  ) {
    add("weird-engine", "Moteur atypique", biases.weirdEngineBonus);
  }

  // 5. Papayou: Legendary bombs & explosive cards
  if (biases.legendaryBombBonus && card.types?.includes("Legendary") && card.staticScore >= 35) {
    add("legendary-bomb", "Bombe légendaire", biases.legendaryBombBonus);
  }

  // 6. Théo: Reanimation spells, big reanimation targets & discard enablers
  if (biases.reanimationBonus && context.isReanimatorSupported !== false) {
    const text = (card.oracleText ?? "").toLowerCase();
    const isReanimatorSpell =
      /return .* from (your |a )?graveyard to the battlefield|put .* from a graveyard onto the battlefield/i.test(
        text,
      ) ||
      card.id.includes("reanimate") ||
      card.id === "animate-dead" ||
      card.id === "necromancy";
    const isBigPayoff =
      card.types?.includes("Creature") && (card.cmc ?? 0) >= 6 && card.staticScore >= 38;
    const isDiscardEnabler =
      /search your library for a card and put that card into your graveyard|discard (a|two|x) card|draw .* then discard/i.test(
        text,
      );

    if (isReanimatorSpell) {
      add("reanimation-spell", "Sort de réanimation", biases.reanimationBonus + 2.0);
    } else if (isBigPayoff) {
      add("reanimation-payoff", "Cible de réanimation", biases.reanimationBonus);
    } else if (isDiscardEnabler) {
      add("discard-enabler", "Mise au cimetière", biases.reanimationBonus * 0.6);
    }
  }

  if (biases.tribalSynergyBonus && (card.subtypes?.length ?? 0) > 0) {
    const candidateSubtypes = new Set(card.subtypes);
    const matchingSubtype = priorPool
      .flatMap((priorCard) => priorCard.subtypes ?? [])
      .find((subtype) => candidateSubtypes.has(subtype));
    if (matchingSubtype) {
      add("tribal-synergy", `Synergie tribale : ${matchingSubtype}`, biases.tribalSynergyBonus);
    }
  }

  if (biases.colorDiscipline !== undefined && colorPenalty > 0) {
    add(
      "color-discipline",
      biases.colorDiscipline > 1 ? "Discipline de couleurs" : "Ouverture aux couleurs",
      (1 - biases.colorDiscipline) * colorPenalty,
    );
  }

  return contributions;
}

/** Calculates a friend's total personality bias for compatibility callers. */
export function computeFriendCardBonus(
  card: CardEvaluationInput,
  profile: FriendProfile,
  priorPool: readonly CardEvaluationInput[] = [],
  colorPenalty = 0,
  context: { isReanimatorSupported?: boolean } = {},
): number {
  return computeFriendCardBiasContributions(card, profile, priorPool, colorPenalty, context).reduce(
    (sum, contribution) => sum + contribution.points,
    0,
  );
}

/**
 * Creates a PickPolicy tailored to an individual friend's personality,
 * integrating dynamic scores, personalized style biases, and Softmax sampling.
 */
export function createFriendBotPolicy(options: FriendBotPolicyOptions): PickPolicy {
  const { profile } = options;
  const resolveCard = options.resolveCard ?? defaultCardResolver;

  return {
    id: `friend:${profile.id}`,
    version: "1",
    choose(context: Readonly<PickContext>): Result<Readonly<PickPolicyDecision>, PickPolicyError> {
      if (context.currentBooster.length === 0) {
        return policyFailure("Cannot choose from an empty booster", { context });
      }

      // 1. Resolve card inputs
      const offeredCards: CardEvaluationInput[] = context.currentBooster.map((id) => {
        const found = resolveCard(id);
        return (
          found ?? {
            id,
            name: id,
            staticScore: 25,
            colors: [],
          }
        );
      });

      const priorPool: CardEvaluationInput[] = context.priorPool.map((id) => {
        const found = resolveCard(id);
        return (
          found ?? {
            id,
            name: id,
            staticScore: 25,
            colors: [],
          }
        );
      });

      const evalContext: PackEvaluationContext = {
        ...options.evaluationContext,
        packNumber: context.packNumber,
        pickNumber: context.pickNumber,
        offeredCards,
        priorPool,
      };

      // 2. Evaluate pack with base dynamic score engine
      const baseEvaluations = evaluatePack(evalContext);
      const isReanimatorSupported = isReanimatorSupportedInCube(options.evaluationContext);

      // 3. Apply friend's individual personality biases
      const candidates = baseEvaluations.map((evaluation) => {
        const originalInput = offeredCards.find((card) => card.id === evaluation.id);
        const biasContributions = originalInput
          ? computeFriendCardBiasContributions(
              originalInput,
              profile,
              priorPool,
              evaluation.breakdown.colorPenalty,
              { isReanimatorSupported },
            )
          : [];
        const personalityBonus = biasContributions.reduce(
          (sum, contribution) => sum + contribution.points,
          0,
        );
        return {
          evaluation,
          biasContributions,
          personalityBonus,
          policyScore: Math.round((evaluation.dynamicScore + personalityBonus) * 10) / 10,
        };
      });

      // 4. Softmax probability sampling using seat seed
      const maxScore = Math.max(...candidates.map((candidate) => candidate.policyScore));
      const temperature = Math.max(0.1, profile.temperature);

      const weights = candidates.map((candidate) =>
        Math.exp((candidate.policyScore - maxScore) / temperature),
      );
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const probabilities = weights.map((weight) => weight / totalWeight);
      const rankedIds = [...candidates]
        .sort(
          (left, right) =>
            right.policyScore - left.policyScore ||
            left.evaluation.id.localeCompare(right.evaluation.id),
        )
        .map((candidate) => candidate.evaluation.id);
      const candidateTraces: readonly Readonly<PickCandidateTrace>[] = candidates.map(
        (candidate, index) => ({
          cardInstanceId: candidate.evaluation.id,
          staticScore: candidate.evaluation.staticScore,
          dynamicScore: candidate.evaluation.dynamicScore,
          coachingBreakdown: candidate.evaluation.breakdown,
          biasContributions: candidate.biasContributions,
          personalityBonus: candidate.personalityBonus,
          policyScore: candidate.policyScore,
          selectionProbability: probabilities[index] ?? 0,
          policyRank: rankedIds.indexOf(candidate.evaluation.id) + 1,
        }),
      );

      // Derive unique deterministic seed for this specific pick
      const pickSeed =
        (context.derivedSeed ^ (context.packNumber * 1000 + context.pickNumber * 17)) | 0;
      const rng = xoroshiro128plus(pickSeed);
      const randomRoll = uniformInt(rng, 0, 10_000_000) / 10_000_000;

      let cumulative = 0;
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const probability = probabilities[i];
        if (!candidate || probability === undefined) continue;

        cumulative += probability;
        if (randomRoll <= cumulative || i === candidates.length - 1) {
          return policySuccess({
            cardInstanceId: candidate.evaluation.id,
            trace: {
              schemaVersion: 1,
              method: "softmax",
              temperature,
              randomRoll,
              selectedProbability: probability,
              candidates: candidateTraces,
            },
          });
        }
      }

      const fallback = candidates[0];
      const fallbackId = fallback?.evaluation.id ?? context.currentBooster[0] ?? "";
      return policySuccess({ cardInstanceId: fallbackId });
    },
  };
}

function defaultCardResolver(id: string): CardEvaluationInput {
  return {
    id,
    name: id,
    staticScore: 25,
    colors: [],
  };
}
