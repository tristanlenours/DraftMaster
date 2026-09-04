import type { Result } from "../draft/internal/errors.ts";
import type { PackNumber, SeatId } from "../draft/internal/types.ts";
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

export interface PickPolicy {
  readonly id: string;
  readonly version: string;
  choose(context: Readonly<PickContext>): Result<string, PickPolicyError>;
}
