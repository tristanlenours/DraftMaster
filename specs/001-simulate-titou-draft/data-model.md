# Data Model: Simuler un draft Titou reproductible

## Identity conventions

- `CubeKey`: stable product key; initial value `titou_tribal`.
- `CubeVersion`: source-date version `AAAA-MM-JJ.N`; initial value `2026-02-24.1`.
- `SnapshotId`: `<cubeKey>@<cubeVersion>`.
- `CardInstanceId`: `<snapshotId>/mainboard/<sourceIndex padded to 3 digits>`.
- `SessionId`: 12 lowercase hexadecimal characters, generated independently from the seed.
- `SeatId`: integer from 0 through 7. Seats are clockwise; left is `+1 modulo 8`, right is `-1 modulo 8`.
- `BoosterId`: immutable identity based on pack number and original seat, independent of its current holder.
- `DraftSeed`: signed 32-bit integer retained exactly in the report.

## CubeSnapshot

An immutable local representation of one source revision.

| Field | Rule |
|---|---|
| `schemaVersion` | `1` |
| `snapshotId` | Unique combination of cube key and version |
| `cubeKey` | `titou_tribal` for this feature |
| `version` | `2026-02-24.1` initially |
| `source` | Provider, immutable cube ID, alias, owner, board, historical URL, source timestamps/revision, retrieval time, importer version and raw digest |
| `cards` | Ordered list of exactly 545 `CardInstance` values initially |
| `integrity` | Instance, printing and Oracle counts plus canonical functional digest |

Semantic validation requires 545 unique instance IDs, source indexes 0–544 exactly once, 543 distinct printing IDs, 542 distinct Oracle IDs, and matching integrity values for the initial fixture. Future valid versions of the same Titou cube may change those exact counts but must contain at least 360 instances. For each such version, N is `cards.length`; require N unique instance IDs, contiguous source indexes 0–(N − 1), and integrity counters matching the actual data. Do not apply the initial fixture's exact counts to another version.

## CardInstance

A physical slot in the snapshot, not a unique Magic card concept.

| Field | Rule |
|---|---|
| `instanceId` | Unique within and scoped to the snapshot |
| `sourceIndex` | Immutable source order, integer at least zero |
| `printingId` | Lowercase Scryfall printing UUID; duplicates allowed |
| `oracleId` | Lowercase Oracle UUID; duplicates allowed |
| `name` | Non-empty display name; not an identity |
| `setCode` | Lowercase set code |
| `collectorNumber` | Non-empty string, never coerced to a number |
| `finish` | Source finish when present; optional and informational |

Steam Vents and Arid Mesa each occupy two instances with the same printing ID. Validation MUST NOT deduplicate on `printingId`, `oracleId`, or `name`.

## DraftConfiguration

Immutable rules for a session.

| Field | Initial value |
|---|---|
| `seatCount` | `8` |
| `packCount` | `3` |
| `cardsPerBooster` | `15` |
| `directions` | `left`, `right`, `left` |
| `controlledSeatId` | `0` |

The configuration yields 24 boosters, 45 Tours de draft and 360 choices. A valid snapshot of N instances leaves N − 360 unused instances: 185 initially (N = 545), 180 when N = 540, and zero when N = 360. The unused count comes from snapshot size, not a fixed configuration constant.

## DraftSession

Opaque current state returned by the draft module.

| Field | Rule |
|---|---|
| Identity | Session ID, seed, engine version and snapshot reference are immutable |
| Random metadata | Algorithm, algorithm version, implementation/version and seed-derivation version are immutable |
| `seatPolicies` | Immutable list of eight `{ seatId, policyId, policyVersion }` descriptors, stored in seat order 0–7 at creation |
| `status` | `active` or `completed` |
| `revision` | Starts at 0 and increases once per accepted Tour de draft |
| Cursor | Pack number 1–3 and pick number 1–15 while active |
| Boosters | Unopened boosters plus the booster currently assigned to each seat |
| Seat pools | Eight ordered lists of chosen instance IDs |
| Unused instances | Ordered list of N − 360 instance IDs, fixed at distribution; empty when N = 360 |
| Journal | Append-only ordered `DraftEvent` values |

The module does not expose writable collections. A rejected command returns an error and the supplied session remains byte-for-byte equivalent in its functional projection.

## Booster

| Field | Rule |
|---|---|
| `boosterId` | Stable for the life of the booster |
| `packNumber` | 1, 2, or 3 |
| `originSeatId` | Seat that opens it |
| `currentSeatId` | Derived assignment for the current round |
| `remainingCardInstanceIds` | Ordered, decreases from 15 to 0 |

After picks 1–14 the booster passes. After pick 15 it completes and does not pass. Pack 2 activates only after all pack 1 boosters complete; pack 3 follows pack 2.

## PickRound and SeatDecision

A `PickRound` is the atomic command for one Tour de draft.

| Field | Rule |
|---|---|
| `sessionId` | Must match the target session |
| `expectedRevision` | Must equal the current session revision |
| `packNumber` / `pickNumber` | Must equal the current cursor |
| `occurredAt` | Caller-supplied ISO-8601 timestamp |
| `decisions` | Exactly one decision for each seat 0–7 |

Each `SeatDecision` contains `seatId`, `cardInstanceId`, and a source: either `{ kind: "caller" }` or `{ kind: "policy", policyId, policyVersion }`. Only seat 0 may use `caller`. A policy source must exactly match the descriptor registered for that seat in `seatPolicies`; otherwise return `POLICY_MISMATCH` without changing any state or events. An explicit caller choice does not replace or update seat 0's registered automated policy. All eight decisions are validated before any state or event changes.

## PickPolicy

A policy chooses one instance from a read-only `PickContext` containing the derived policy seed, seat, pack, pick, current booster and prior pool. It returns either one instance ID or a structured policy error.

Each adapter exposes immutable non-empty strings `id` and `version`, mapped to the descriptor's `policyId` and `policyVersion`. At creation, descriptors must contain exactly one entry per seat 0–7, with no missing/duplicate/unknown seat and no empty ID/version; invalid registration returns `INVALID_CONFIG` with field details. Canonicalize valid descriptors into seat order. Multiple seats may use the same ID/version, but their random state remains independent. The CLI registers the same seeded-random ID/version for all eight seats, including seat 0; scripted reference simulations register their actual policy descriptors before starting.

The simulation orchestrator fixes the engine implementation/version and the actual policy adapters at creation and verifies their descriptors before submitting rounds. It must not load replacements or relabel a changed adapter as an old version. The draft module only receives descriptors and choices, not executable policies; replay checks metadata consistency but cannot prove that an adapter honestly implements its advertised version. No operation updates these registrations during a session.

Initial adapters:

- `SeededRandomPolicy`: production CLI adapter, versioned and random without scoring.
- `ScriptedPolicy`: reference-test adapter that consumes explicit expected choices.

The policy never receives session ID or wall-clock timestamps because they are not functional inputs.

## DraftEvent

Every event has `schemaVersion`, `sequence`, `type`, `sessionId`, and `occurredAt`. Type-specific content is immutable.

| Type | Required content |
|---|---|
| `DraftStarted` | Seed, engine/random/schema versions, complete `seatPolicies` registration, configuration, snapshot reference/digest and complete normalized `snapshot: CubeSnapshot`, including cards, provenance and integrity |
| `BoostersDealt` | Ordered content of all 24 boosters and the N − 360 unused instance IDs; an empty list is valid when N = 360 |
| `CardPicked` | Pack, pick, seat, booster, chosen instance and decision source |
| `BoostersPassed` | Pack, completed pick and eight from/to booster movements |
| `PackCompleted` | Pack number and cumulative pick count |
| `DraftCompleted` | Completion time and invariant summary |

Within a round, `CardPicked` events are emitted in ascending seat order. `BoostersPassed` follows picks 1–14 of each pack. `PackCompleted` follows pick 15. The final `DraftCompleted` follows the third `PackCompleted`.

The embedded snapshot is an immutable copy of the validated snapshot used at session creation. It appears once in `DraftStarted`, not in every event. Replay validates its schema, semantic integrity, reference/digest consistency and membership of all dealt/unused instances. Missing, invalid or inconsistent embedded data rejects the event stream as `INVALID_EVENT_STREAM`; replay never substitutes external data. Card lookup and report provenance are reconstructed from this snapshot, while recorded events reconstruct choices without invoking policies or randomness.

## DraftReport

The terminal audit document contains:

- schema, engine and random-system versions, plus the complete initial `seatPolicies` list (IDs/versions by seat, not a single global policy version);
- session metadata, seed, snapshot provenance and digest;
- immutable configuration and complete journal;
- the complete normalized snapshot carried by the journal's initial `DraftStarted` event, sufficient for standalone replay and card lookup without a second top-level copy;
- ordered final pools and unused instances;
- invariant results and `functionalDigest` (64 lowercase hexadecimal characters, SHA-256 of the canonical functional projection);
- creation and completion timestamps.

`functionalProjection(report)` is the non-mutating input to both functional comparison and digest calculation. It removes only the report's own top-level `functionalDigest`, the session ID wherever represented in session metadata/events, and the schema-declared timestamps in metadata/events and snapshot provenance. Everything else remains, including snapshot data and integrity digests, card/booster/seat identities, seed, configuration, all versions, ordered journal, pools, unused instances and invariant results. A date-based cube version or historical source URL is an identity/provenance value, not a timestamp field to strip.

Timestamp exclusions cover creation/completion times, every event's `occurredAt` and its declared completion-time field, and source `cubeUpdatedAt`/`retrievedAt` in both report provenance and the embedded snapshot. Apply exclusions by schema-defined field location, not by matching date-like strings or removing arbitrary keys named `id`, `version` or `digest`. The snapshot's existing canonical digest and raw-source digest are retained and validated independently; this rule does not change snapshot hashing or permit changing a source revision under the same snapshot identity.

Calculate `functionalDigest = lowercaseHex(SHA-256(UTF-8(RFC8785(functionalProjection(report)))))`. Preserve all array orders; canonicalization normalizes object-key order, not event or card order. Build the projection before attaching the computed digest, and use the same projection when checking a serialized report. Projection rules belong to the report schema version; any change requires an explicit schema-version change and reviewed reference fixtures.

Reports with equal functional inputs MUST have equal functional projections and computed digests. Comparing projections alone does not validate a supplied digest: audit must separately require the digest, check its format and compare it to the recomputed value. The report digest is never repeated in its own journal or invariant summary, avoiding indirect self-reference. It is a reproducibility/integrity check, not a signature or proof of authorship; the complete report still retains session IDs and timestamps for audit.

## State transitions

```text
valid snapshot + start input
          |
          v
       active (pack 1, pick 1, revision 0)
          |
          | submit valid atomic round (repeat 45 times)
          v
       active (next pick/pack, revision + 1)
          |
          | third pack, pick 15 accepted
          v
       completed (revision 45, 360 cards picked)
```

There is no paused or resumed state. Invalid input produces a typed error, not a state transition.

## Error model

All domain failures contain a stable `code`, human-readable `message`, and structured `details`.

- Snapshot: `INVALID_SNAPSHOT`, `INVALID_CUBE_VERSION`, `DUPLICATE_INSTANCE_ID`, `INSUFFICIENT_CARDS`, `INTEGRITY_MISMATCH`.
- Session start: `INVALID_SESSION_ID`, `INVALID_CONFIG`, `INVALID_SEED`.
- Round: `SESSION_COMPLETED`, `WRONG_SESSION`, `STALE_ROUND`, `UNKNOWN_SEAT`, `MISSING_DECISION`, `DUPLICATE_SEAT_DECISION`, `CALLER_NOT_ALLOWED`, `CARD_NOT_IN_CURRENT_BOOSTER`, `POLICY_MISMATCH`.
- Policy: `POLICY_FAILED`, `POLICY_RETURNED_ILLEGAL_CARD`.
- Report/replay: `DRAFT_NOT_COMPLETED`, `INVALID_EVENT_STREAM`, `INVARIANT_VIOLATION`.

File access, JSON parsing, command-line usage and output failures are adapter errors and never domain errors.
