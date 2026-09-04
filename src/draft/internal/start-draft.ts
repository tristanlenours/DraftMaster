import { validateSnapshot } from "../../cubes/validate-snapshot.ts";
import { RANDOM_SYSTEM_METADATA, createSeededRandom } from "../../random/seeded-random.ts";
import { failure, success, type DraftError, type Result } from "./errors.ts";
import { deepFreeze } from "./immutable.ts";
import {
  DRAFT_CONFIGURATION,
  type Booster,
  type BoosterId,
  type BoostersDealtEvent,
  type DraftStartedEvent,
  type DraftState,
  type DraftTransition,
  type SeatId,
  type SeatPolicyDescriptor,
  type StartDraftInput,
} from "./types.ts";

const seats = [0, 1, 2, 3, 4, 5, 6, 7] as const;
const packs = [1, 2, 3] as const;

function isCanonicalTimestamp(value: string): boolean {
  const time = Date.parse(value);
  return !Number.isNaN(time) && new Date(time).toISOString() === value;
}

function configurationMatches(configuration: unknown): boolean {
  if (typeof configuration !== "object" || configuration === null) {
    return false;
  }
  const config = configuration as Record<string, unknown>;
  const directions = config.directions;
  return (
    config.seatCount === DRAFT_CONFIGURATION.seatCount &&
    config.packCount === DRAFT_CONFIGURATION.packCount &&
    config.cardsPerBooster === DRAFT_CONFIGURATION.cardsPerBooster &&
    config.controlledSeatId === DRAFT_CONFIGURATION.controlledSeatId &&
    Array.isArray(directions) &&
    directions.length === DRAFT_CONFIGURATION.directions.length &&
    directions.every((direction, index) => direction === DRAFT_CONFIGURATION.directions[index])
  );
}

function randomMetadataMatches(input: Readonly<StartDraftInput>["randomSystem"]): boolean {
  const expectedEntries = Object.entries(RANDOM_SYSTEM_METADATA);
  return (
    Object.keys(input).length === expectedEntries.length &&
    expectedEntries.every(([key, value]) => input[key as keyof typeof input] === value)
  );
}

function normalizePolicies(
  policies: readonly Readonly<SeatPolicyDescriptor>[],
): Result<readonly Readonly<SeatPolicyDescriptor>[], DraftError> {
  if (policies.length !== seats.length) {
    return failure("INVALID_CONFIG", "Exactly eight seat policies are required.", {
      actual: policies.length,
      expected: seats.length,
    });
  }

  const bySeat = new Map<number, Readonly<SeatPolicyDescriptor>>();
  for (const policy of policies) {
    if (
      !seats.includes(policy.seatId) ||
      policy.policyId.trim() === "" ||
      policy.policyVersion.trim() === ""
    ) {
      return failure("INVALID_CONFIG", "Seat policy descriptor is invalid.", {
        seatId: policy.seatId,
      });
    }
    if (bySeat.has(policy.seatId)) {
      return failure("INVALID_CONFIG", "Seat policy descriptors contain a duplicate seat.", {
        seatId: policy.seatId,
      });
    }
    bySeat.set(
      policy.seatId,
      deepFreeze({
        seatId: policy.seatId,
        policyId: policy.policyId,
        policyVersion: policy.policyVersion,
      }),
    );
  }

  return success(
    deepFreeze(
      seats.map((seatId) => {
        const descriptor = bySeat.get(seatId);
        if (descriptor === undefined) {
          throw new Error("Validated seat policy registration must be complete.");
        }
        return descriptor;
      }),
    ),
  );
}

function buildBoosters(orderedInstanceIds: readonly string[]): readonly Readonly<Booster>[] {
  const boosters: Booster[] = [];
  let offset = 0;
  for (const packNumber of packs) {
    for (const seatId of seats) {
      boosters.push({
        boosterId: `pack:${String(packNumber)}:seat:${String(seatId)}` as BoosterId,
        packNumber,
        originSeatId: seatId,
        currentSeatId: seatId,
        remainingCardInstanceIds: orderedInstanceIds.slice(offset, offset + 15),
      });
      offset += 15;
    }
  }
  return deepFreeze(boosters);
}

function invalidStartInput(
  input: Readonly<StartDraftInput>,
): Result<never, DraftError> | undefined {
  if (!/^[0-9a-f]{12}$/u.test(input.sessionId)) {
    return failure("INVALID_SESSION_ID", "Session ID must contain 12 lowercase hex characters.");
  }
  if (!Number.isInteger(input.seed) || input.seed < -2_147_483_648 || input.seed > 2_147_483_647) {
    return failure("INVALID_SEED", "Draft seed must be a signed 32-bit integer.");
  }
  if (
    !isCanonicalTimestamp(input.startedAt) ||
    input.engineVersion.trim() === "" ||
    !configurationMatches(input.configuration) ||
    !randomMetadataMatches(input.randomSystem)
  ) {
    return failure("INVALID_CONFIG", "Draft metadata or fixed configuration is invalid.");
  }
}

export function startDraftState(
  input: Readonly<StartDraftInput>,
): Result<Readonly<DraftTransition>, DraftError> {
  const invalidInput = invalidStartInput(input);
  if (invalidInput !== undefined) {
    return invalidInput;
  }
  const policies = normalizePolicies(input.seatPolicies);
  if (!policies.ok) {
    return policies;
  }
  const snapshot = validateSnapshot(input.snapshot);
  if (!snapshot.ok) {
    return failure(snapshot.error.code, snapshot.error.message, snapshot.error.details);
  }

  const shuffledIds = createSeededRandom(input.seed, "distribution").shuffle(
    snapshot.value.cards.map(({ instanceId }) => instanceId),
  );
  const boosters = buildBoosters(shuffledIds.slice(0, 360));
  const unusedCardInstanceIds = deepFreeze(shuffledIds.slice(360));
  const randomSystem = deepFreeze({ ...RANDOM_SYSTEM_METADATA });
  const startedEvent: Readonly<DraftStartedEvent> = deepFreeze({
    schemaVersion: 1,
    sequence: 0,
    type: "DraftStarted",
    sessionId: input.sessionId,
    occurredAt: input.startedAt,
    seed: input.seed,
    engineVersion: input.engineVersion,
    randomSystem,
    seatPolicies: policies.value,
    configuration: DRAFT_CONFIGURATION,
    snapshotId: snapshot.value.snapshotId,
    snapshotCanonicalSha256: snapshot.value.integrity.canonicalSha256,
    snapshot: snapshot.value,
  });
  const dealtEvent: Readonly<BoostersDealtEvent> = deepFreeze({
    schemaVersion: 1,
    sequence: 1,
    type: "BoostersDealt",
    sessionId: input.sessionId,
    occurredAt: input.startedAt,
    boosters,
    unusedCardInstanceIds,
  });
  const journal = deepFreeze([startedEvent, dealtEvent]);
  const draft: Readonly<DraftState> = deepFreeze({
    sessionId: input.sessionId,
    seed: input.seed,
    engineVersion: input.engineVersion,
    randomSystem,
    snapshot: snapshot.value,
    configuration: DRAFT_CONFIGURATION,
    seatPolicies: policies.value,
    status: "active",
    revision: 0,
    packNumber: 1,
    pickNumber: 1,
    boosters,
    seatPools: seats.map((seatId: SeatId) => deepFreeze({ seatId, cardInstanceIds: [] })),
    unusedCardInstanceIds,
    journal,
  });
  return success(deepFreeze({ draft, appendedEvents: journal }));
}
