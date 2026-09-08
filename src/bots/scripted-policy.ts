import type { Result } from "../draft/internal/errors.ts";
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

export interface ScriptedPolicyOptions {
  readonly id?: string;
  readonly version?: string;
  readonly choices: readonly string[];
}

export function createScriptedPolicy(
  choicesOrOptions: readonly string[] | ScriptedPolicyOptions,
): PickPolicy {
  let id = "scripted";
  let version = "1";
  let initialChoices: readonly string[];

  if ("choices" in choicesOrOptions) {
    id = choicesOrOptions.id ?? id;
    version = choicesOrOptions.version ?? version;
    initialChoices = choicesOrOptions.choices;
  } else {
    initialChoices = choicesOrOptions;
  }
  const queue = [...initialChoices];

  const policy: PickPolicy = {
    id,
    version,
    choose(context: Readonly<PickContext>): Result<Readonly<PickPolicyDecision>, PickPolicyError> {
      if (queue.length === 0) {
        return policyFailure("Scripted choices exhausted.", {
          seatId: context.seatId,
          pickNumber: context.pickNumber,
        });
      }
      const choice = queue.shift();
      if (choice === undefined) {
        return policyFailure("Scripted choice is undefined.", {
          seatId: context.seatId,
          pickNumber: context.pickNumber,
        });
      }
      return policySuccess({ cardInstanceId: choice });
    },
  };

  return Object.freeze(policy);
}
