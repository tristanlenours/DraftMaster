# Tasks: League-Relative Deck Calibration

**Input**: Design documents from `/specs/005-league-deck-calibration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Domain and regression behavior follows red-green-refactor. Each story starts with focused tests that must fail for the intended reason before implementation.

**Organization**: Tasks are grouped by user story so league classification, witness preservation, and audit safeguards remain independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on incomplete tasks.
- **[Story]**: Maps the task to a user story in `spec.md`.
- Every task names an exact repository path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the versioned corpus surface without changing scoring behavior.

- [X] T001 Create the golden-dataset directory contract and curator guidance in `tests/fixtures/golden-datasets/README.md` (FR-006–FR-013)
- [X] T002 [P] Add focused witness validation and extraction commands to `package.json` (SC-001, SC-008)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared typed identities and errors used by all three stories.

- [X] T003 Add league calibration, cube context, corpus, witness, provenance, usage-policy, and typed-validation-result contracts in `src/domain/coaching/types.ts` (FR-001–FR-004, FR-006–FR-017)
- [X] T004 Export the planned league and witness public seams from `src/domain/coaching/index.ts` (FR-001, FR-016)

**Checkpoint**: Shared contracts compile; no scoring behavior has been implemented.

---

## Phase 3: User Story 1 - Compare decks within a cube league (Priority: P1) 🎯 MVP

**Goal**: Classify an overall deck tier with one explicit league calibration while retaining cube-specific evidence and legacy behavior for callers without league context.

**Independent Test**: Evaluate fixed decks from Arena Powered and Nico under the same `powered_vintage` calibration, assert deterministic league audit metadata, and reject mismatched contexts without fallback.

### Tests for User Story 1

- [X] T005 [P] [US1] Write failing unit tests for ordered thresholds, all S/A/B/C/D boundaries, provisional readiness, and mismatched league or member cube failures in `tests/unit/coaching/league-calibration.test.ts` (FR-001–FR-005, FR-014, FR-017)
- [X] T006 [P] [US1] Write failing evaluator tests for legacy compatibility, league-relative `overallTier`, unchanged radar tiers, and versioned audit metadata in `tests/unit/coaching/deck-evaluation.test.ts` (FR-003, FR-005, FR-016; SC-005)
- [X] T007 [US1] Implement deterministic threshold validation, readiness calculation, membership checks, and league tier classification in `src/domain/coaching/league-calibration.ts` (FR-001–FR-004, FR-014, FR-017)
- [X] T008 [US1] Extend `evaluateDeck` options and audit output, bump the evaluation formula version, and preserve cube-specific bomb and synergy analysis in `src/domain/coaching/deck-evaluation.ts` and `src/domain/coaching/types.ts` (FR-005, FR-016; SC-005)
- [X] T009 [US1] Add the versioned provisional `powered_vintage` membership and thresholds for Arena Powered and Nico in `tests/fixtures/golden-datasets/powered-vintage/league.json` (FR-002–FR-004, FR-014)
- [X] T010 [US1] Add an integration regression proving both member cubes share a calibration but not a synergy profile in `tests/integration/coaching/league-deck-calibration.test.ts` (FR-002, FR-005; SC-006)

**Checkpoint**: User Story 1 is independently usable through `evaluateDeck` and fully deterministic.

---

## Phase 4: User Story 2 - Preserve an expert witness from a real draft (Priority: P2)

**Goal**: Preserve the 11 September Arena Powered draft as an anonymized, self-contained, immutable A-tier witness with upper-A annotation and separate 0-3 result.

**Independent Test**: Load only committed fixture files, resolve all offered and deck cards offline, and assert 45 ordered picks, 45 distinct drafted cards, a 40-card build, no Power Nine, expected A/upper, and observed 0-3.

### Tests for User Story 2

- [X] T011 [P] [US2] Write failing corpus-schema and semantic-validation tests for pick order, offered selections, pool/deck counts, offline card resolution, and invalid expected tiers in `tests/unit/coaching/witness-corpus.test.ts` (FR-006–FR-008, FR-017; SC-001)
- [X] T012 [P] [US2] Write the failing real-witness integration expectations in `tests/integration/coaching/league-deck-calibration.test.ts` before importing fixture data (FR-010–FR-011; SC-001–SC-002)
- [X] T013 [US2] Define the closed schema-v1 corpus contract with forbidden unknown identity-bearing fields in `data/schemas/league-witness-corpus.schema.json` (FR-006–FR-009, FR-012–FR-013, FR-017)
- [X] T014 [US2] Implement JSON Schema plus semantic validation and deep immutability in `src/domain/coaching/witness-corpus.ts` (FR-006–FR-009, FR-012–FR-013, FR-017)
- [X] T015 [US2] Implement the one-way Untapped, Arena-log, and Arena-card-database extraction adapter with hashing and anonymization in `scripts/import-arena-witness.mjs` (FR-007–FR-009, FR-013)
- [X] T016 [US2] Generate the self-contained Arena Powered corpus manifest in `tests/fixtures/golden-datasets/powered-vintage/arena-powered/2026-09-08/corpus.json` and immutable draft witness in `tests/fixtures/golden-datasets/powered-vintage/arena-powered/2026-09-08/drafts/bc4cdb9d-6412-43a1-84a2-d66b5dbed559.json` (FR-006–FR-013; SC-001–SC-004)
- [X] T017 [US2] Complete the A/upper expert rationale, strengths, weaknesses, confidence, no-Power-Nine evidence, and contextual 0-3 result in the generated witness files under `tests/fixtures/golden-datasets/powered-vintage/arena-powered/2026-09-08/` (FR-004, FR-010–FR-011; SC-002)

**Checkpoint**: User Story 2 loads and validates with networking and mutable local Arena sources unavailable.

---

## Phase 5: User Story 3 - Keep witnesses independent and auditable (Priority: P3)

**Goal**: Prevent corpus leakage, overclaiming, silent mutation, identity retention, and reinterpretation of the Titou seed-42 reference.

**Independent Test**: Reject prohibited identity and usage fields, derive provisional readiness from counts, prove deterministic immutable loads, and run the unchanged seed-42 reference gate.

### Tests for User Story 3

- [X] T018 [P] [US3] Write failing privacy, usage-policy leakage, annotation-provenance, versioning, and locked-witness immutability tests in `tests/unit/coaching/witness-corpus.test.ts` (FR-009, FR-012–FR-013, FR-017; SC-003–SC-005)
- [X] T019 [P] [US3] Write failing readiness tests covering every tier minimum and every member-cube draft/deck minimum in `tests/unit/coaching/league-calibration.test.ts` (FR-014; SC-008)
- [X] T020 [US3] Complete readiness evidence counting and typed corpus failure reporting in `src/domain/coaching/league-calibration.ts` and `src/domain/coaching/witness-corpus.ts` (FR-014, FR-017; SC-008)
- [X] T021 [US3] Add a regression asserting the seed-42 fixture remains outside the golden-dataset manifest and run unchanged replay/reference checks in `tests/integration/reference-draft.test.ts` (FR-015; SC-007)
- [X] T022 [US3] Document witness promotion, corpus versioning, evaluation-only isolation, and historical 17Lands candidate status in `tests/fixtures/golden-datasets/README.md` (FR-012–FR-015)

**Checkpoint**: User Story 3 provides independent, versioned benchmark evidence without changing the seed-42 contract.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete reproducibility, performance, security, and project evidence gates.

- [X] T023 [P] Add a deterministic extraction recipe with source-file prerequisites and secret exclusions to `specs/005-league-deck-calibration/quickstart.md` (FR-009, FR-013)
- [X] T024 [P] Add focused validation timing coverage for the under-500-ms corpus budget in `tests/unit/coaching/witness-corpus.test.ts` (Plan §Performance Goals)
- [X] T025 Run focused unit, integration, reference, replay, secret scan, formatter, lint, typecheck, and full `npm run check` gates; record commands and results in `specs/005-league-deck-calibration/qa-evidence.md` (Constitution §Delivery Workflow and Gates)
- [X] T026 Run Spec Kit converge and record any remaining implementation gaps in `specs/005-league-deck-calibration/tasks.md` before opening a PR linked to issue #70 (Constitution §I, §IV, §Delivery Workflow)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **User Story 1 (Phase 3)**: Depends on Foundational and supplies league classification used by later integration checks.
- **User Story 2 (Phase 4)**: Depends on Foundational; its final evaluator assertion also consumes User Story 1.
- **User Story 3 (Phase 5)**: Depends on the corpus loader from User Story 2 and readiness classifier from User Story 1.
- **Polish (Phase 6)**: Depends on all selected user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Independently delivers explicit league-relative overall tiers.
- **User Story 2 (P2)**: Independently delivers an offline-valid witness; its optional evaluation comparison uses User Story 1.
- **User Story 3 (P3)**: Builds audit safeguards around the calibration and corpus contracts from User Stories 1 and 2.

### Within Each User Story

- Add tests first and observe the intended failure before implementation.
- Add the smallest implementation that makes the focused tests pass.
- Refactor only after green and rerun the affected integration scenario.
- Never regenerate or rewrite a witness to satisfy evaluator output.

### Parallel Opportunities

- T001 and T002 touch independent setup files.
- T005 and T006 can define separate classification and evaluator contracts in parallel.
- T011 and T012 can define schema/semantic and real-witness expectations in parallel.
- T018 and T019 cover independent audit and readiness risks.
- T023 and T024 can proceed in parallel after corpus behavior is green.

---

## Parallel Example: User Story 1

```text
Task: T005 - define league-calibration unit boundaries
Task: T006 - define evaluateDeck compatibility and audit behavior
```

## Parallel Example: User Story 2

```text
Task: T011 - define corpus structure and semantic rejections
Task: T012 - define the real-witness acceptance contract
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001–T004.
2. Write and observe failures for T005–T006.
3. Complete T007–T010.
4. Run the User Story 1 unit and integration tests before importing real data.

### Incremental Delivery

1. Add league-relative classification without breaking legacy callers.
2. Add the offline real-draft witness and validate it independently.
3. Add privacy, leakage, readiness, and seed-42 protections.
4. Finish all quality gates and evidence; leave merge to human approval.

## Notes

- Every task uses the required checkbox, sequential ID, optional `[P]`, story label where applicable, and exact path.
- `[P]` means file-level independence, not permission to bypass test-first ordering.
- The custom checklist remains reviewer-owned and is not self-approved by implementation work.
