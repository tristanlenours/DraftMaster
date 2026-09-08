import type { Result } from "../draft/internal/errors.ts";
import {
  createSeededRandom,
  getPolicyStreamName,
  type SeatNumber,
  type SeededRandom,
} from "../random/seeded-random.ts";
import type {
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

export interface SeededRandomPolicyOptions {
  readonly id?: string;
  readonly version?: string;
  readonly seed?: number;
  readonly seatId?: number;
  readonly random?: SeededRandom;
}

export function createSeededRandomPolicy(
  optionsOrSeed: number | SeededRandomPolicyOptions,
  seatId?: number,
): PickPolicy {
  let id = "seeded-random";
  let version = "1";
  let random: SeededRandom;

  if (typeof optionsOrSeed === "number") {
    const sId = (seatId ?? 0) as SeatNumber;
    random = createSeededRandom(optionsOrSeed, getPolicyStreamName(sId));
  } else if (optionsOrSeed.random) {
    id = optionsOrSeed.id ?? id;
    version = optionsOrSeed.version ?? version;
    random = optionsOrSeed.random;
  } else if (optionsOrSeed.seed !== undefined) {
    id = optionsOrSeed.id ?? id;
    version = optionsOrSeed.version ?? version;
    const sId = (optionsOrSeed.seatId ?? 0) as SeatNumber;
    random = createSeededRandom(optionsOrSeed.seed, getPolicyStreamName(sId));
  } else {
    throw new Error("SeededRandomPolicy requires either a seed or SeededRandom instance.");
  }

  const policy: PickPolicy = {
    id,
    version,
    choose(context: Readonly<PickContext>): Result<Readonly<PickPolicyDecision>, PickPolicyError> {
      if (context.currentBooster.length === 0) {
        return policyFailure("Cannot pick from an empty booster.", {
          seatId: context.seatId,
        });
      }
      const index = random.nextInt(0, context.currentBooster.length - 1);
      const chosen = context.currentBooster[index];
      if (chosen === undefined) {
        return policyFailure("Failed to sample card index from booster.", {
          seatId: context.seatId,
          index,
        });
      }
      return policySuccess({ cardInstanceId: chosen });
    },
  };

  return Object.freeze(policy);
}
