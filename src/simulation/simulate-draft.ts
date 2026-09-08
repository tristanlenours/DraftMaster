import type { PickContext, PickPolicy } from "../bots/pick-policy.ts";
import { createSeededRandomPolicy } from "../bots/seeded-random-policy.ts";
import type { CubeSnapshot } from "../cubes/validate-snapshot.ts";
import {
  getDraftView,
  startDraft,
  submitPickRound,
  type Draft,
  type DraftConfiguration,
  type DraftError,
  type DraftEvent,
  type Result,
  type SeatDecision,
  type SeatId,
  type SeatPolicyDescriptor,
  type StartDraftInput,
  type SubmitPickRound,
} from "../draft/index.ts";
import { failure, success } from "../draft/internal/errors.ts";
import {
  deriveStreamSeed,
  getPolicyStreamName,
  RANDOM_SYSTEM_METADATA,
  type RandomSystemMetadata,
} from "../random/seeded-random.ts";

export interface SimulateDraftInput {
  readonly snapshot: Readonly<CubeSnapshot>;
  readonly sessionId: string;
  readonly seed: number;
  readonly startedAt: string;
  readonly engineVersion?: string;
  readonly randomSystem?: Readonly<RandomSystemMetadata>;
  readonly configuration?: Readonly<DraftConfiguration>;
  readonly policies?: readonly PickPolicy[];
  readonly explicitChoicesSeat0?: readonly string[];
  readonly timestampGenerator?: (roundIndex: number) => string;
}

export interface SimulateDraftResult {
  readonly draft: Draft;
  readonly events: readonly Readonly<DraftEvent>[];
}

export function simulateDraft(
  input: Readonly<SimulateDraftInput>,
): Result<Readonly<SimulateDraftResult>, DraftError> {
  const policies: readonly PickPolicy[] =
    input.policies ??
    Array.from({ length: 8 }, (_, seatId) =>
      createSeededRandomPolicy(input.seed, seatId as SeatId),
    );

  const seatPolicies: readonly SeatPolicyDescriptor[] = policies.map((policy, index) => ({
    seatId: index as SeatId,
    policyId: policy.id,
    policyVersion: policy.version,
  }));

  const startInput: StartDraftInput = {
    snapshot: input.snapshot,
    sessionId: input.sessionId,
    seed: input.seed,
    startedAt: input.startedAt,
    engineVersion: input.engineVersion ?? "draft-engine@1.0.0",
    randomSystem: input.randomSystem ?? RANDOM_SYSTEM_METADATA,
    seatPolicies,
    configuration: input.configuration ?? {
      seatCount: 8,
      packCount: 3,
      cardsPerBooster: 15,
      directions: ["left", "right", "left"],
      controlledSeatId: 0,
    },
  };

  const startResult = startDraft(startInput);
  if (!startResult.ok) {
    return startResult;
  }

  let currentDraft = startResult.value.draft;
  const allEvents: Readonly<DraftEvent>[] = [...startResult.value.appendedEvents];

  for (let round = 0; round < 45; round++) {
    const view = getDraftView(currentDraft);
    if (view.status === "completed") {
      break;
    }

    const occurredAt = input.timestampGenerator
      ? input.timestampGenerator(round)
      : new Date(Date.parse(input.startedAt) + (round + 1) * 1000).toISOString();

    const decisions: SeatDecision[] = [];

    for (let seatId = 0; seatId < 8; seatId++) {
      const sId = seatId as SeatId;
      const explicitChoice =
        sId === 0 && input.explicitChoicesSeat0 ? input.explicitChoicesSeat0[round] : undefined;

      if (explicitChoice !== undefined) {
        decisions.push({
          seatId: 0,
          cardInstanceId: explicitChoice,
          source: { kind: "caller" },
        });
      } else {
        const policy = policies[sId];
        if (!policy) {
          return failure("UNKNOWN_SEAT", `Missing policy for seat ${String(sId)}`);
        }

        const seatView = view.seats[sId];
        const currentBooster = seatView?.currentBooster?.remainingCardInstanceIds ?? [];
        const priorPool = seatView?.priorPool ?? [];
        const streamName = getPolicyStreamName(sId);
        const derivedSeed = deriveStreamSeed(input.seed, streamName);

        const context: PickContext = {
          derivedSeed,
          streamName,
          seatId: sId,
          packNumber: view.packNumber,
          pickNumber: view.pickNumber,
          currentBooster,
          priorPool,
        };

        const choiceResult = policy.choose(context);
        if (!choiceResult.ok) {
          return failure("POLICY_FAILED", choiceResult.error.message, {
            seatId: sId,
            round,
            ...choiceResult.error.details,
          });
        }

        decisions.push({
          seatId: sId,
          cardInstanceId: choiceResult.value.cardInstanceId,
          source: {
            kind: "policy",
            policyId: policy.id,
            policyVersion: policy.version,
          },
        });
      }
    }

    const roundCommand: SubmitPickRound = {
      sessionId: input.sessionId,
      expectedRevision: view.revision,
      packNumber: view.packNumber,
      pickNumber: view.pickNumber,
      occurredAt,
      decisions,
    };

    const roundResult = submitPickRound(currentDraft, roundCommand);
    if (!roundResult.ok) {
      return roundResult;
    }

    currentDraft = roundResult.value.draft;
    allEvents.push(...roundResult.value.appendedEvents);
  }

  return success(Object.freeze({ draft: currentDraft, events: Object.freeze(allEvents) }));
}
