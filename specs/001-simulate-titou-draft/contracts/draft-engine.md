# Contract: Draft Engine

## Purpose

The draft module owns legality, distribution, rotation, lifecycle, journal ordering, replay and final invariants. Callers do not know or modify its internal collections.

## Public interface

```ts
type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

type Draft = unknown; // opaque outside src/draft

type DraftTransition = Readonly<{
  draft: Draft;
  appendedEvents: readonly DraftEvent[];
}>;

function startDraft(
  input: Readonly<StartDraftInput>,
): Result<DraftTransition, DraftError>;

function getDraftView(draft: Draft): Readonly<DraftView>;

function submitPickRound(
  draft: Draft,
  command: Readonly<SubmitPickRound>,
): Result<DraftTransition, DraftError>;

function replayDraft(
  events: readonly DraftEvent[],
): Result<Draft, DraftError>;

function buildDraftReport(
  draft: Draft,
): Result<Readonly<DraftReport>, DraftError>;
```

The actual TypeScript MUST use erasable types and readonly data. No public class, `enum`, mutable singleton, file access, console output or implicit clock/random call is allowed.

## StartDraftInput

The caller supplies:

- validated `CubeSnapshot`;
- `sessionId`, signed 32-bit `seed`, and `startedAt`;
- `engineVersion` and random-system metadata;
- `seatPolicies`: one `{ seatId, policyId, policyVersion }` descriptor for every seat 0–7, including the automated policy available for seat 0;
- the fixed `DraftConfiguration`.

`startDraft` validates policy registration as defined in the data model (`INVALID_CONFIG` for invalid descriptors), copies it into immutable state and `DraftStarted`, and orders it by seat. The engine version and these registrations are fixed for the session; neither round submission nor another public operation can update them. Adapter implementations remain outside the draft module.

`startDraft` validates cross-field invariants, creates the 24 boosters from the distribution stream using 360 distinct instances, fixes the remaining N − 360 unused instances from a valid N-instance Titou snapshot, and returns `DraftStarted` followed by `BoostersDealt`. N = 360 is valid and yields an empty unused list; N < 360 is rejected. The initial snapshot still has N = 545 and 185 unused instances. `DraftStarted.snapshot` is an immutable copy of the complete validated normalized `CubeSnapshot`, including card identities/printing metadata, provenance and integrity; it contains no images or raw external catalog. Rejection returns no draft and no events.

## DraftView

The minimum orchestration view contains:

- identity, status and revision;
- current pack and pick numbers;
- each seat's current booster and prior pool as readonly instance IDs;
- snapshot card lookup needed to display or choose a card.

The view is a copy or immutable projection. Mutating caller-owned input after a call MUST NOT mutate engine state.

## SubmitPickRound

```ts
type SubmitPickRound = Readonly<{
  sessionId: string;
  expectedRevision: number;
  packNumber: 1 | 2 | 3;
  pickNumber: number;
  occurredAt: string;
  decisions: readonly SeatDecision[];
}>;
```

The command MUST contain exactly one decision for every seat. The engine validates the complete command before changing state. On success it:

1. appends eight `CardPicked` events in ascending seat order;
2. appends `BoostersPassed` after picks 1–14;
3. appends `PackCompleted` after pick 15;
4. appends `DraftCompleted` after pack 3, pick 15;
5. returns a new opaque draft and only the newly appended events.

On failure it returns one typed error; the input draft and journal remain unchanged.

For a `policy` decision source, both `policyId` and `policyVersion` must match that seat's initial registration; a mismatch returns `POLICY_MISMATCH` atomically. A `caller` decision is still permitted only for seat 0 and does not change its registered automated policy.

## Rotation

- Pack 1, left: booster at seat `i` moves to `(i + 1) mod 8`.
- Pack 2, right: booster at seat `i` moves to `(i + 7) mod 8`.
- Pack 3, left: booster at seat `i` moves to `(i + 1) mod 8`.
- Empty boosters never pass.

## Pick-policy seam

Policies are outside the draft module.

```ts
type PickPolicy = Readonly<{
  id: string;
  version: string;
  choose(context: Readonly<PickContext>): Result<string, PickPolicyError>;
}>;
```

`PickContext` contains the named derived seed, seat, pack, pick, current booster and prior pool. It excludes `sessionId` and timestamps. The simulation module supplies one policy per seat, registers each adapter's ID/version before `startDraft`, keeps the engine and adapters fixed for that session, gathers eight decisions, and calls `submitPickRound` once. Every automated decision records its adapter's actual ID/version; a mismatch with registration stops the round without mutation. A new policy release requires a new session, not an in-place replacement.

Required adapters:

- `SeededRandomPolicy`: CLI behavior for all eight seats;
- `ScriptedPolicy`: explicit decisions and stable reference tests.

## Event and replay contract

The union of event types and their fields is defined in [data-model.md](../data-model.md). Events are ordered by a gapless sequence starting at 0. Replay MUST:

- reject an unknown type, schema version, gap, illegal transition or inconsistent identity;
- validate the initial policy registration and match every automated `CardPicked` source against it; missing or changed policy identity/version makes the journal invalid (`INVALID_EVENT_STREAM`), without calling a policy;
- require and validate the complete `DraftStarted.snapshot`, its reference/digest and the membership of all dealt and unused instances; missing or inconsistent embedded data yields `INVALID_EVENT_STREAM` rather than an external lookup;
- use no random source, external data, clock or policy;
- reconstruct the same functional state, snapshot card lookup, report provenance and final pools as live transitions using only the journal.

Replay accepts a complete journal or a non-empty prefix ending at a complete public transition boundary: after `BoostersDealt` from `startDraft`, or after all events appended by one successful `submitPickRound`. A round ends with `BoostersPassed` for picks 1–14, `PackCompleted` for pick 15 of packs 1–2, and `DraftCompleted` for pack 3, pick 15. The final round's `PackCompleted` alone is not a valid boundary.

An empty journal or a prefix cut inside a transition (including after `DraftStarted`, between `CardPicked` events, or before the required round-ending events) yields `INVALID_EVENT_STREAM`; replay never returns a partially applied transition. A valid non-terminal prefix reconstructs the corresponding live state, but `buildDraftReport` still returns `DRAFT_NOT_COMPLETED`. Partial replay is for state comparison and audit, not session persistence or resume support.

Relecture de draft consumes recorded choices; Re-simulation de draft reruns distribution and policy decisions from the same functional inputs and versions. Replay alone does not demonstrate that a bot would make the same decision again. The normalized snapshot is embedded once per journal; the resulting report-size overhead is accepted for this feature.

## Report contract

`buildDraftReport` succeeds only for `completed` state. It returns the metadata, complete journal, final pools, unused instances, invariant results and functional digest described in [data-model.md](../data-model.md).

The deterministic comparison and hash input is `functionalProjection(report)`, defined in [data-model.md](../data-model.md). It excludes only session identity, schema-declared timestamps and the report's own top-level `functionalDigest`; all other data, array order and cube/engine/policy/random-system versions remain. These exclusions affect a copy, never the stored report or journal.

`functionalDigest` is lowercase SHA-256 over UTF-8 RFC 8785 canonical JSON of that projection. The report's own digest is neither an input to its calculation nor copied into events/invariant results. Existing snapshot and raw-source digests are distinct and remain included. A changed supplied digest must fail a separate recomputation check even when functional projections match; projection equality alone is not an integrity verdict. This requires no additional public engine operation.

## Error contract

```ts
type DraftError = Readonly<{
  code: DraftErrorCode;
  message: string;
  details: Readonly<Record<string, unknown>>;
}>;
```

Codes are stable and exhaustive as listed in [data-model.md](../data-model.md). Messages may improve without a schema-version change; callers branch only on `code`.
