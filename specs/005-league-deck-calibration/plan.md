# Implementation Plan: League-Relative Deck Calibration

**Branch**: `005-league-deck-calibration` | **Date**: 2026-09-12 | **Spec**: [spec.md](spec.md) | **Issue**: [#70](https://github.com/tristanlenours/DraftMaster/issues/70)

**Input**: Feature specification from `/specs/005-league-deck-calibration/spec.md`

## Summary

Add a versioned `powered_vintage` comparison league, make `evaluateDeck` report the league calibration used for its overall tier, and introduce self-contained, anonymized witness corpora under test fixtures. Preserve cube-specific synergy and bomb evidence, keep continuous scores internal for deterministic ordering and diagnostics, and import the 11 September 2026 Arena Powered draft as the first expert A-tier witness.

## Technical Context

**Language/Version**: TypeScript 6.0 strict ESM on Node.js 24 LTS; a small Node.js extraction script may use ESM JavaScript

**Primary Dependencies**: Existing Ajv 8 JSON Schema validation, project card catalog and coaching domain modules; no new package

**Storage**: Immutable versioned JSON fixtures and JSON Schemas in the repository

**Testing**: Vitest unit and integration tests, existing seed-42 reference gate, full `npm run check`

**Target Platform**: Offline-capable Node.js runtime on Windows and CI-compatible filesystem access

**Project Type**: TypeScript domain library with test fixtures and a local data-extraction adapter

**Performance Goals**: Load and validate an individual league corpus in under 500 ms on the reference workstation; keep the full quality gate within its existing budget

**Constraints**: Deterministic and offline evaluation; no secret or personal identifier in fixtures; no mutation of witness files during tests; no opaque model in homologated scoring

**Scale/Scope**: Initial league with two member cubes and one complete real draft witness; schema designed for at least 10 full drafts and 15 deck witnesses per cube

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Specification Before Implementation**: PASS. Issue #70 and Spec Kit artifacts precede test and source changes.
- **Risk-Based Test-First**: PASS BY PLAN. The confirmed public seam is `evaluateDeck(deck, { leagueCalibration, cubeContext })`; each behavior change starts with a focused failing test.
- **Auditable and Versioned Domain Engine**: PASS BY DESIGN. Every tier reports evaluation and league-calibration versions; fixtures preserve provenance and never regenerate on test failure.
- **Human-Governed AI Delivery**: PASS. Work occurs on `005-league-deck-calibration`; no model determines the expected tier and no merge is planned.
- **User Quality**: PASS. Feature is domain/test infrastructure with no new UI or network dependency.
- **Secrets and generated data**: PASS BY DESIGN. Arena identifiers are removed, source hashes and generation method are retained, and the disclosed key is not stored or used.

**Post-design re-check**: PASS. The data model distinguishes observed results from expert labels, the contract makes incompatibilities explicit, and quickstart validation includes the unchanged seed-42 gate.

## Project Structure

### Documentation (this feature)

```text
specs/005-league-deck-calibration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
data/schemas/
└── league-witness-corpus.schema.json

scripts/
└── import-arena-witness.mjs

src/domain/coaching/
├── deck-evaluation.ts
├── league-calibration.ts
├── witness-corpus.ts
├── types.ts
└── index.ts

tests/
├── fixtures/golden-datasets/
│   ├── README.md
│   └── powered-vintage/
│       ├── league.json
│       └── arena-powered/2026-09-08/
│           ├── corpus.json
│           └── drafts/bc4cdb9d-6412-43a1-84a2-d66b5dbed559.json
├── integration/coaching/league-deck-calibration.test.ts
└── unit/coaching/
    ├── league-calibration.test.ts
    └── witness-corpus.test.ts
```

**Structure Decision**: Keep scoring and validation behind the existing coaching module interface. Store curated data below `tests/fixtures/golden-datasets` as requested; keep its schema in the canonical schema directory and isolate access to mutable Arena files in a one-way extraction adapter. Do not move or reinterpret the existing `tests/fixtures/reference-drafts` seed-42 fixture.

## Complexity Tracking

No constitution violations require justification.
