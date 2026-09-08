import type { Result } from "../draft/internal/errors.ts";
import type { CardEvaluationInput, PackEvaluationContext } from "../domain/coaching/types.ts";
import { evaluatePack } from "../domain/coaching/dynamic-score.ts";
import type {
  PickCandidateTrace,
  PickContext,
  PickPolicy,
  PickPolicyDecision,
  PickPolicyError,
} from "./pick-policy.ts";

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
}

/**
 * An intelligent bot policy that uses the Coaching Dynamic Score engine
 * to select the highest-scoring contextual card in each booster.
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
      };

      // 2. Evaluate pack with dynamic score engine
      const evaluated = evaluatePack(evalContext);
      if (evaluated.length === 0) {
        return policyFailure("Evaluation returned no scored cards", { context });
      }

      // Top-scored card is at index 0
      const bestCard = evaluated[0];
      if (!bestCard) {
        return policyFailure("No best card found in booster", { context });
      }
      const candidateTraces: readonly Readonly<PickCandidateTrace>[] = evaluated.map(
        (candidate, index) => ({
          cardInstanceId: candidate.id,
          staticScore: candidate.staticScore,
          dynamicScore: candidate.dynamicScore,
          coachingBreakdown: candidate.breakdown,
          biasContributions: [],
          personalityBonus: 0,
          policyScore: candidate.dynamicScore,
          selectionProbability: index === 0 ? 1 : 0,
          policyRank: index + 1,
        }),
      );
      return policySuccess({
        cardInstanceId: bestCard.id,
        trace: {
          schemaVersion: 1,
          method: "highest-score",
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
