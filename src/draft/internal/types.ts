import type { CubeSnapshot, CardInstance } from "../../cubes/validate-snapshot.ts";
import type { RandomSystemMetadata } from "../../random/seeded-random.ts";

export type SeatId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type PackNumber = 1 | 2 | 3;
export type PassDirection = "left" | "right";
export type DraftStatus = "active" | "completed";
export type BoosterId = `pack:${PackNumber}:seat:${SeatId}`;

export interface DraftConfiguration {
  readonly seatCount: 8;
  readonly packCount: 3;
  readonly cardsPerBooster: 15;
  readonly directions: readonly ["left", "right", "left"];
  readonly controlledSeatId: 0;
}

export const DRAFT_CONFIGURATION: Readonly<DraftConfiguration> = Object.freeze({
  seatCount: 8,
  packCount: 3,
  cardsPerBooster: 15,
  directions: Object.freeze(["left", "right", "left"] as const),
  controlledSeatId: 0,
});

export interface SeatPolicyDescriptor {
  readonly seatId: SeatId;
  readonly policyId: string;
  readonly policyVersion: string;
}

export interface CallerDecisionSource {
  readonly kind: "caller";
}

export interface PolicyDecisionSource {
  readonly kind: "policy";
  readonly policyId: string;
  readonly policyVersion: string;
}

export type DecisionSource = CallerDecisionSource | PolicyDecisionSource;

export interface SeatDecision {
  readonly seatId: SeatId;
  readonly cardInstanceId: string;
  readonly source: Readonly<DecisionSource>;
}

export interface SubmitPickRound {
  readonly sessionId: string;
  readonly expectedRevision: number;
  readonly packNumber: PackNumber;
  readonly pickNumber: number;
  readonly occurredAt: string;
  readonly decisions: readonly Readonly<SeatDecision>[];
}

export interface Booster {
  readonly boosterId: BoosterId;
  readonly packNumber: PackNumber;
  readonly originSeatId: SeatId;
  readonly currentSeatId: SeatId;
  readonly remainingCardInstanceIds: readonly string[];
}

export interface SeatPool {
  readonly seatId: SeatId;
  readonly cardInstanceIds: readonly string[];
}

export interface StartDraftInput {
  readonly snapshot: Readonly<CubeSnapshot>;
  readonly sessionId: string;
  readonly seed: number;
  readonly startedAt: string;
  readonly engineVersion: string;
  readonly randomSystem: Readonly<RandomSystemMetadata>;
  readonly seatPolicies: readonly Readonly<SeatPolicyDescriptor>[];
  readonly configuration: Readonly<DraftConfiguration>;
}

export interface DraftEventBase {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly sessionId: string;
  readonly occurredAt: string;
}

export interface DraftStartedEvent extends DraftEventBase {
  readonly type: "DraftStarted";
  readonly seed: number;
  readonly engineVersion: string;
  readonly randomSystem: Readonly<RandomSystemMetadata>;
  readonly seatPolicies: readonly Readonly<SeatPolicyDescriptor>[];
  readonly configuration: Readonly<DraftConfiguration>;
  readonly snapshotId: string;
  readonly snapshotCanonicalSha256: string;
  readonly snapshot: Readonly<CubeSnapshot>;
}

export interface BoostersDealtEvent extends DraftEventBase {
  readonly type: "BoostersDealt";
  readonly boosters: readonly Readonly<Booster>[];
  readonly unusedCardInstanceIds: readonly string[];
}

export interface CardPickedEvent extends DraftEventBase {
  readonly type: "CardPicked";
  readonly packNumber: PackNumber;
  readonly pickNumber: number;
  readonly seatId: SeatId;
  readonly boosterId: BoosterId;
  readonly cardInstanceId: string;
  readonly source: Readonly<DecisionSource>;
}

export interface BoosterMovement {
  readonly boosterId: BoosterId;
  readonly fromSeatId: SeatId;
  readonly toSeatId: SeatId;
}

export interface BoostersPassedEvent extends DraftEventBase {
  readonly type: "BoostersPassed";
  readonly packNumber: PackNumber;
  readonly pickNumber: number;
  readonly movements: readonly Readonly<BoosterMovement>[];
}

export interface PackCompletedEvent extends DraftEventBase {
  readonly type: "PackCompleted";
  readonly packNumber: PackNumber;
  readonly cumulativePickCount: number;
}

export type DraftInvariantCode =
  "PICK_COUNT" | "SEAT_POOL_SIZE" | "CARD_CONSERVATION" | "NO_DUPLICATE_ASSIGNMENT";

export interface DraftInvariantResult {
  readonly code: DraftInvariantCode;
  readonly passed: boolean;
  readonly expected: number;
  readonly actual: number;
}

export interface DraftCompletedEvent extends DraftEventBase {
  readonly type: "DraftCompleted";
  readonly completedAt: string;
  readonly invariants: readonly Readonly<DraftInvariantResult>[];
}

export type DraftEvent =
  | DraftStartedEvent
  | BoostersDealtEvent
  | CardPickedEvent
  | BoostersPassedEvent
  | PackCompletedEvent
  | DraftCompletedEvent;

export interface DraftState {
  readonly sessionId: string;
  readonly seed: number;
  readonly engineVersion: string;
  readonly randomSystem: Readonly<RandomSystemMetadata>;
  readonly snapshot: Readonly<CubeSnapshot>;
  readonly configuration: Readonly<DraftConfiguration>;
  readonly seatPolicies: readonly Readonly<SeatPolicyDescriptor>[];
  readonly status: DraftStatus;
  readonly revision: number;
  readonly packNumber: PackNumber;
  readonly pickNumber: number;
  readonly boosters: readonly Readonly<Booster>[];
  readonly seatPools: readonly Readonly<SeatPool>[];
  readonly unusedCardInstanceIds: readonly string[];
  readonly journal: readonly Readonly<DraftEvent>[];
}

export interface DraftSeatView {
  readonly seatId: SeatId;
  readonly currentBooster: Readonly<Booster> | undefined;
  readonly priorPool: readonly string[];
}

export interface DraftView {
  readonly sessionId: string;
  readonly status: DraftStatus;
  readonly revision: number;
  readonly packNumber: PackNumber;
  readonly pickNumber: number;
  readonly seats: readonly Readonly<DraftSeatView>[];
  readonly cardsByInstanceId: Readonly<Record<string, Readonly<CardInstance>>>;
}

export interface DraftTransition {
  readonly draft: Readonly<DraftState>;
  readonly appendedEvents: readonly Readonly<DraftEvent>[];
}
