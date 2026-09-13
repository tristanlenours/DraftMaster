import type { Result } from "../draft/internal/errors.ts";
import type { CardEvaluationInput, PackEvaluationContext } from "../domain/coaching/types.ts";
import { evaluatePack } from "../domain/coaching/dynamic-score.ts";
import type {
  PickBiasContribution,
  PickCandidateTrace,
  PickContext,
  PickPolicy,
  PickPolicyDecision,
  PickPolicyError,
} from "./pick-policy.ts";
import {
  computeFriendCardBiasContributions,
  isReanimatorSupportedInCube,
} from "./friends/friend-bot-policy.ts";
import type { FriendProfile, FriendStyleBiases } from "./friends/profiles.ts";

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

export type CardMetadataResolver = (instanceId: string) => CardEvaluationInput | undefined;

export interface CoachedBotPolicyOptions {
  readonly id?: string;
  readonly version?: string;
  readonly resolveCard?: CardMetadataResolver;
  readonly profile?: FriendProfile | undefined;
  readonly biases?: Readonly<FriendStyleBiases> | undefined;
  readonly evaluationContext?: Pick<PackEvaluationContext, "cubeKey" | "catalog" | "cubeMeta">;
}

/**
 * An intelligent bot policy that uses the Coaching Dynamic Score engine
 * to identify 3 valid options, selecting the best option unless an option
 * corresponds to an individual personality bias.
 */
export function createCoachedBotPolicy(options: CoachedBotPolicyOptions = {}): PickPolicy {
  const id = options.id ?? "coached-bot";
  const version = options.version ?? "1";
  const resolveCard = options.resolveCard ?? defaultCardResolver;

  return {
    id,
    version,
    choose(context: Readonly<PickContext>): Result<Readonly<PickPolicyDecision>, PickPolicyError> {
      if (context.currentBooster.length === 0) {
        return policyFailure("Cannot choose from an empty booster", { context });
      }

      // 1. Resolve card inputs for offered booster cards and prior pool
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
        packNumber: context.packNumber,
        pickNumber: context.pickNumber,
        offeredCards,
        priorPool,
        ...options.evaluationContext,
      };

      // 2. Evaluate pack with dynamic score engine
      const evaluated = evaluatePack(evalContext);
      if (evaluated.length === 0) {
        return policyFailure("Evaluation returned no scored cards", { context });
      }

      // 3. Identify 3 valid options (top 3 from coach evaluation)
      const validOptions = evaluated.slice(0, 3);
      if (validOptions.length === 0) {
        return policyFailure("No valid options found in booster", { context });
      }

      const botProfile: FriendProfile | undefined =
        options.profile ??
        (options.biases
          ? {
              id: options.id ?? "coached-bot",
              name: options.id ?? "Coached Bot",
              title: "Bot",
              quote: "",
              level: "medium",
              temperature: 1.0,
              biases: options.biases,
            }
          : undefined);

      const firstCandidate = validOptions[0];
      if (!firstCandidate) {
        throw new Error("Cannot select candidate: validOptions is empty");
      }
      let selectedCandidate = firstCandidate;
      const selectedMethod: "highest-score" | "softmax" = "highest-score";
      let chosenBiasContributions: readonly Readonly<PickBiasContribution>[] = [];
      let chosenPersonalityBonus = 0;

      // 4. Take the best option (validOptions[0]) UNLESS an option matches a bias
      if (botProfile && Object.keys(botProfile.biases).length > 0) {
        const isReanimatorSupported = isReanimatorSupportedInCube(options.evaluationContext);

        const evaluatedWithBiases = validOptions.map((opt) => {
          const originalInput = offeredCards.find((c) => c.id === opt.id);
          const biasContributions = originalInput
            ? computeFriendCardBiasContributions(
                originalInput,
                botProfile,
                priorPool,
                opt.breakdown.colorPenalty,
                { isReanimatorSupported },
              )
            : [];
          const personalityBonus = biasContributions.reduce(
            (sum, contribution) => sum + contribution.points,
            0,
          );
          return {
            candidate: opt,
            biasContributions,
            personalityBonus,
            hasMatchingBias: personalityBonus > 0,
            biasedScore: opt.dynamicScore + personalityBonus,
          };
        });

        const candidatesWithBias = evaluatedWithBiases.filter((item) => item.hasMatchingBias);

        if (candidatesWithBias.length > 0) {
          // If options correspond to a bias, pick the best among those matching the bias
          candidatesWithBias.sort((a, b) => b.biasedScore - a.biasedScore);
          const topBiased = candidatesWithBias[0];
          if (topBiased) {
            selectedCandidate = topBiased.candidate;
            chosenBiasContributions = topBiased.biasContributions;
            chosenPersonalityBonus = topBiased.personalityBonus;
          }
        }
      }

      const candidateTraces: readonly Readonly<PickCandidateTrace>[] = evaluated.map(
        (candidate, index) => {
          const isSelected = candidate.id === selectedCandidate.id;
          return {
            cardInstanceId: candidate.id,
            staticScore: candidate.staticScore,
            dynamicScore: candidate.dynamicScore,
            coachingBreakdown: candidate.breakdown,
            biasContributions: isSelected ? chosenBiasContributions : [],
            personalityBonus: isSelected ? chosenPersonalityBonus : 0,
            policyScore: isSelected
              ? candidate.dynamicScore + chosenPersonalityBonus
              : candidate.dynamicScore,
            selectionProbability: isSelected ? 1 : 0,
            policyRank: index + 1,
          };
        },
      );

      return policySuccess({
        cardInstanceId: selectedCandidate.id,
        trace: {
          schemaVersion: 1,
          method: selectedMethod,
          temperature: null,
          randomRoll: null,
          selectedProbability: 1,
          candidates: candidateTraces,
        },
      });
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
