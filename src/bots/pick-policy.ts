import type { Result } from "../draft/internal/errors.ts";
import type { PackNumber, SeatId } from "../draft/internal/types.ts";
import type { CoachingScoreBreakdown } from "../domain/coaching/types.ts";
import type { RandomStreamName } from "../random/seeded-random.ts";

export interface PickContext {
  readonly derivedSeed: number;
  readonly streamName: Extract<RandomStreamName, `policy:seat:${SeatId}`>;
  readonly seatId: SeatId;
  readonly packNumber: PackNumber;
  readonly pickNumber: number;
  readonly currentBooster: readonly string[];
  readonly priorPool: readonly string[];
}

export interface PickPolicyError {
  readonly code: "POLICY_FAILED";
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface PickBiasContribution {
  readonly key: string;
  readonly label: string;
  readonly points: number;
}

export interface PickCandidateTrace {
  readonly cardInstanceId: string;
  readonly staticScore: number;
  readonly dynamicScore: number;
  readonly coachingBreakdown: Readonly<CoachingScoreBreakdown>;
  readonly biasContributions: readonly Readonly<PickBiasContribution>[];
  readonly personalityBonus: number;
  readonly policyScore: number;
  readonly selectionProbability: number;
  readonly policyRank: number;
}

export interface PickDecisionTrace {
  readonly schemaVersion: 1;
  readonly method: "highest-score" | "softmax";
  readonly temperature: number | null;
  readonly randomRoll: number | null;
  readonly selectedProbability: number;
  readonly candidates: readonly Readonly<PickCandidateTrace>[];
}

export interface PickPolicyDecision {
  readonly cardInstanceId: string;
  readonly trace?: Readonly<PickDecisionTrace> | undefined;
}

export interface PickPolicy {
  readonly id: string;
  readonly version: string;
  choose(context: Readonly<PickContext>): Result<Readonly<PickPolicyDecision>, PickPolicyError>;
}
