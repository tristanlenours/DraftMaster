# Quickstart: Validate the Titou draft engine

This guide describes the end-to-end checks that implementation MUST make runnable. It is a validation guide, not an implementation script.

## Prerequisites

- Node.js 24 LTS (`node --version` MUST start with `v24.`)
- npm supplied with Node.js
- A clean checkout of branch `001-simulate-titou-draft`

The current development host reports Node.js 22, so it must be upgraded before implementation verification.

## Install locked dependencies

```powershell
npm ci
```

Expected: installation uses `package-lock.json` without changing it and reports no high-or-higher production vulnerability.

## Run the complete quality gate

```powershell
npm run check
```

Expected: formatting, linting, strict type checking, unit tests, contract tests, property tests and integration tests all pass. Coverage includes every non-generated file under `src/`; the report is diagnostic, while the invariant-to-test matrix is blocking.

## Validate the committed snapshot

```powershell
npm run cube:validate -- --file data/cubes/titou_tribal/2026-02-24.1.json
```

Expected summary:

```text
snapshot: titou_tribal@2026-02-24.1
instances: 545
unique printings: 543
unique oracle cards: 542
valid: true
```

Validation is offline. It MUST preserve the two repeated Steam Vents and two repeated Arid Mesa instances.

## Simulate a complete draft

```powershell
npm --silent run simulate -- --seed 42 > draft-report.json
```

The npm `--silent` option prevents its script banner from entering the report. Application errors must still appear on standard error with the documented exit code. Parse the report without relying on console decoration:

```powershell
$report = Get-Content -Raw -LiteralPath 'draft-report.json' | ConvertFrom-Json
$report.sessionId
$report.invariants
$report.finalPools | ForEach-Object { $_.cardInstanceIds.Count }
$report.unusedCardInstanceIds.Count
```

Expected:

- `sessionId` matches `^[0-9a-f]{12}$`;
- all declared invariants pass;
- eight pool counts are `45`;
- unused count is `185` for the default 545-instance snapshot; for another valid Titou version it is N − 360, including zero when N = 360;
- the journal contains exactly `360` `CardPicked` events;
- engine, policy, RNG, seed-derivation, snapshot and report schema versions are present.

The policy metadata is an eight-entry `seatPolicies` list ordered by seat, identical in `DraftStarted` and the report. Each entry contains `seatId`, `policyId` and `policyVersion`; the CLI uses the same seeded-random ID/version on all seats. Tests must reject invalid initial registrations and any subsequent automated ID/version mismatch without applying a partial round, while accepting explicit caller choices on seat 0 without changing its registration. Replay must reject journals containing these mismatches without executing adapters. The engine and actual policy adapters remain fixed for the session.

## Verify deterministic behavior and replay

```powershell
npm run test:reference
npm run test:replay
```

Expected: the seed-42 golden draft matches its committed functional digest, a second simulation has the same functional projection, and folding its journal reconstructs the same terminal state. Session IDs and timestamps may differ.

The report fingerprint excludes session identity, schema-declared timestamps and its own top-level `functionalDigest`; the full report keeps these metadata. Verify the lowercase SHA-256 of the RFC 8785 canonical UTF-8 projection, with all array order preserved. Tests must show unchanged fingerprints for different session IDs/execution times and object-key order, but changed fingerprints for the tested changes to cards, choices, order, configuration, seed or versions. A corrupt supplied digest must fail recomputation even when the projections compare equal; snapshot integrity checks remain separate. This fingerprint is not a signature.

The integration/replay suites also use explicitly synthetic Titou-version fixtures with 540 and 360 instances. They must retain 360 legal picks and eight pools of 45, leave respectively 180 and zero unused instances, and account for all N instances exactly once. The below-minimum case (359 instances) must be rejected before session creation. These fixtures do not alter the historical 545-instance snapshot or its reference draft.

The initial `DraftStarted` event contains the complete normalized snapshot. Replay tests must deserialize the journal and reconstruct card/printing lookup, provenance and states with the original snapshot file inaccessible and all external reads, network, RNG and policies disabled. Missing or inconsistent embedded snapshots must fail rather than fall back to an external source. Re-simulation tests separately rerun bot decisions; replay uses recorded choices only. The larger self-contained report carries no images or raw external catalog.

## Verify errors are atomic

```powershell
npm run test:domain-errors
```

Expected: every documented illegal start or round returns its stable error code; state, revision and journal remain unchanged after rejected round commands.

## Verify the performance budget

```powershell
npm run test:performance
```

Follow [performance-protocol.md](./performance-protocol.md) on the reference workstation under Node 24. With the initial snapshot already loaded and validated, run three warm-ups then five sequential fresh simulations using seed 42. Each measured run must finish the complete draft, report, fingerprint and JSON ready for output in strictly less than 2,000 ms. Retain all five durations and the maximum; neither an average nor a median can hide a failing run.

Runtime startup, initial snapshot loading/validation and disk output are outside this timing; functional E2E tests still cover them. Record the actual code/data/runtime versions, machine environment and results in `qa-evidence.md`. No performance result is claimed yet. CI follows the same protocol on its separately identified runner without replacing the reference-workstation evidence.

## CLI end-to-end check

```powershell
npm run test:e2e
```

Expected: standard output is valid report JSON, standard error remains empty on success, invalid arguments use the documented exit codes, and no network call is attempted during snapshot validation or simulation.

## Review references

- [Feature specification](./spec.md)
- [Implementation plan](./plan.md)
- [Data model](./data-model.md)
- [Draft engine contract](./contracts/draft-engine.md)
- [CLI contract](./contracts/cli.md)
- [Cube snapshot schema](./contracts/cube-snapshot.schema.json)
