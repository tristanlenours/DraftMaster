# Implementation Plan: Simuler un draft Titou reproductible

**Branch**: `001-simulate-titou-draft` | **Date**: 2026-09-02 | **Spec**: [spec.md](./spec.md) | **Tracking**: [GitHub #9](https://github.com/tristanlenours/DraftMaster/issues/9)

**Input**: Feature specification from `/specs/001-simulate-titou-draft/spec.md`

## Summary

Build a headless, offline draft engine that creates an auditable eight-seat, three-pack Titou cube draft from a checked-in snapshot. The engine exposes immutable round transitions; a separate simulation module supplies seeded random decisions for all seats and a CLI prints a versioned JSON report. Distribution and each seat policy use independent deterministic random streams so a policy change cannot silently change the packs.

## Technical Context

**Language/Version**: TypeScript 6.0 in erasable-syntax mode on Node.js 24 LTS

**Primary Dependencies**: Node.js standard library; exact-pinned `pure-rand` for seeded random generation; Ajv 8 for strict JSON Schema validation. Development dependencies include Vitest 4, `@vitest/coverage-v8`, fast-check 4, ESLint, typescript-eslint, and Prettier.

**Storage**: Immutable JSON snapshot under `data/cubes/titou_tribal/`; final report written as JSON to standard output. No session persistence.

**Standalone replay**: `DraftStarted` embeds one complete normalized copy of the validated snapshot, including card metadata, provenance and integrity. Reports carry it through their journal, without images or a second top-level copy. Replay validates and consumes only this journal, even when the original snapshot file is unavailable; re-simulation separately reruns policy decisions. The larger per-report payload is an accepted auditability trade-off (human clarification, 2026-09-03).

**Version locking**: At session creation, the orchestrator fixes the engine version and registers all eight adapters as ordered `seatPolicies` descriptors (`seatId`, `policyId`, `policyVersion`). The engine records these immutable values in `DraftStarted` and the report and rejects mismatching automated decisions; replay enforces the same consistency without executing adapters. Explicit seat-0 choices remain allowed. Updates apply to new sessions only, with no hot-swapping or dynamic policy loading in this feature.

**Testing**: Vitest unit, contract, golden, property-based, integration, CLI end-to-end, replay, and isolated performance tests

**Target Platform**: Node.js 24 LTS on Windows, macOS, and Linux; network required only for the explicit cube import operation

**Project Type**: Single-package library and CLI

**Performance Goals**: On the documented reference workstation, preload and validate the initial snapshot, run three warm-up simulations, then five sequential fresh simulations, each strictly below 2,000 ms from draft creation through full report/digest generation and JSON ready for output. Runtime startup, initial snapshot loading/validation and disk writes are excluded from timing but covered by functional E2E tests. Follow [performance-protocol.md](./performance-protocol.md), record all five durations and fail on any threshold breach.

**Constraints**: ESM only; TypeScript `strict`; no implicit network access at runtime; deterministic functional projection; append-only event journal; no UI, deckbuilding, scoring, intelligent bots, multiplayer, or resume support

**Report fingerprint**: Use one non-mutating functional projection for comparison and hashing, excluding session identity, declared timestamps and the report's own `functionalDigest`, while retaining snapshot integrity, seed, versions, configuration, cards and event/list order. Store lowercase SHA-256 of its RFC 8785 canonical UTF-8 representation. Independently check a supplied digest against recomputation; never include the report digest in its own events or invariant summary. Tests lock these rules to the report schema version.

**Scale/Scope**: One cube (Titou), initially a 545-instance snapshot; future valid versions of this same cube may contain N ≥ 360 instances. Every session has 8 seats, 24 boosters, 45 rounds and 360 picks, with N − 360 unused instances (185 for the initial snapshot). Validation, distribution, replay and report audits cover N = 545, 540 and 360, plus rejection below 360; synthetic versioned fixtures do not replace or alter the historical snapshot.

## Constitution Check

*GATE: Passed before research and re-checked after design.*

| Principle or Gate | Design Evidence | Status |
|---|---|---|
| Specification Before Implementation | GitHub #9, `spec.md`, completed clarification, and this plan precede implementation. | PASS |
| Risk-Based Test-First | Pack rotation, legality, conservation, replay, PRNG fixtures, and regressions are implemented in red-green-refactor order through the module interface. | PASS |
| Auditable and Versioned Domain Engine | Reports carry engine, policy, RNG, seed, cube provenance, snapshot digest, ordered events, and invariant results. | PASS |
| Human-Governed AI Delivery | Work remains on a feature branch and will enter `main` only through a linked PR, passing Standards + Spec review and human approval. | PASS |
| User Quality | Runtime is offline from the checked-in snapshot; CLI errors are actionable; SC-006 supplies the proportional performance gate. | PASS |
| Required CI Gates | Format, lint, types, unit, contract, property, integration, CLI end-to-end, dependency/secret checks, and Spec Kit analysis are planned. | PASS |
| UI-specific gates | No route or visual surface is introduced, so accessibility, mobile visual QA, and Lighthouse are not affected by this feature. | N/A |

### Post-Design Re-check

The contracts keep rules inside one deep module, errors leave input state unchanged, adapters own I/O and time, and all non-deterministic inputs are explicit. No constitution exception or complexity waiver is required.

## Project Structure

### Documentation (this feature)

```text
specs/001-simulate-titou-draft/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── performance-protocol.md
├── contracts/
│   ├── cube-snapshot.schema.json
│   ├── draft-engine.md
│   └── cli.md
├── checklists/
│   └── requirements.md
└── tasks.md             # generated later by speckit-tasks
```

### Source Code (repository root)

```text
src/
├── draft/
│   ├── index.ts             # public module interface
│   └── internal/            # rules, transitions, replay, reports
├── bots/
│   ├── pick-policy.ts
│   ├── seeded-random-policy.ts
│   └── scripted-policy.ts
├── cubes/
│   ├── load-snapshot.ts
│   ├── validate-snapshot.ts
│   └── cube-snapshot.schema.json
├── random/
│   └── seeded-random.ts
├── simulation/
│   └── simulate-draft.ts
└── cli/
    ├── import-cube.ts
    └── simulate-draft.ts

data/cubes/titou_tribal/
├── 2026-02-24.1.json
└── README.md

scripts/
└── import-historical-titou-snapshot.mjs # bootstrap auditable avant reset

tests/
├── unit/
│   ├── draft/
│   ├── bots/
│   ├── cubes/
│   └── random/
├── contract/
├── integration/
├── e2e/
└── fixtures/reference-drafts/
```

**Structure Decision**: Use one package with four deliberate seams: the draft module interface, pick-policy interface, local cube snapshot loader, and CLI adapters. The engine accepts values and returns transitions; it does not read files, generate wall-clock values, print output, or call external services. The existing browser and Python runtime are not reused. Their removal remains a separate reset change and must be merged or reconciled before feature implementation.

## Delivery and Test Sequence

1. Bootstrap, verify and publish the minimal historical Titou snapshot before any legacy deletion.
2. Merge or explicitly reconcile the separate, human-reviewed reset PR; record its manifest and evidence before implementation.
3. Establish Node 24, npm lockfile, strict ESM TypeScript, formatting, linting, type checking, Vitest, coverage, and CI.
4. Write failing contract tests for the cube snapshot, then implement explicit fetch, normalization, digest, validation and reproduction of the bootstrap snapshot.
5. Write golden tests for seed derivation, integer generation, and Fisher–Yates output.
6. Implement the draft interface test-first: start, atomic round, rejection without mutation, rotation, pack completion, and session completion.
7. Complete US1 test-first: random and scripted pick-policy adapters, simulation orchestration, report/invariants/functional projection, and the CLI end-to-end flow. Validate conservation and legal-transition properties before the MVP checkpoint.
8. Complete US2: test determinism and projection rules, implement standalone replay, compare states at complete transition boundaries, and add the versioned reference draft and replay regression/property tests.
9. Complete US3: independently audit reports, detect corruption, verify offline operation, and run SC-006 separately from functional tests; record evidence for human review.
10. Finish cross-cutting CI, dependency and secret checks, clean-checkout verification, Spec Kit convergence and analysis, then Standards + Spec review and human PR approval. Follow the detailed dependencies and checkpoints in [tasks.md](./tasks.md).

## Complexity Tracking

No constitution violations require justification.
