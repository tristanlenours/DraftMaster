# Tasks: Shared deck engine

- [x] T001 [US1] Add failing public multiplayer recommendation/finalization parity and snapshot rejection coverage in tests/unit/multiplayer-draft/coordinator-deck.test.ts; fix context propagation in coordinator.ts.
- [x] T002 [US2] Add failing adaptive Pimp fixture in tests/unit/deck-lab/analyze-deck.test.ts; remove fixed constraint/validation and update copy and fixed-ratio expectations.
- [x] T003 [US1] Add public Solo/Rate parity integration; extract shared catalog facts into src/cards/evaluation-input.ts and use complete context options in Solo and multiplayer composition.
- [x] T004 Execute affected suites and complete quality-gate components, reference/replay; record passing and failing outcomes in qa-evidence.md and Standards + Spec review. Default-runner and browser gate failures remain blocking; this checkmark records verification performed, not all gates passing.
- [x] T005 Converge spec/plan/tasks with final implementation and prepare reviewable delivery; branch pushed, draft PR attempt denied by connector (403). No remote PR or human approval claimed.

Dependencies: T001 → T002 → T003 → T004 → T005. One vertical slice at a time. No parallel edits required.

## Phase 2: Convergence

FR-001–FR-005 are implemented and public parity is verified. SC-001/SC-002 are met. SC-004 has passing Deck Lab mobile/desktop evidence. SC-003 is partial: controlled coverage, formatting/lint/types/data, reference/replay/reports/performance pass; default quality and global browser runs are not green. No remaining engine implementation was found. Remaining delivery/qualification tasks are explicit:

- [ ] T006 Qualify default-runner timing on the pinned runtime and resolve the two multiplayer browser failures before approving the required quality gates; see qa-evidence.md. Do not hide failures by changing business SLA assertions.
- [ ] T007 Create a draft PR against the base feature branch (connector currently denies creation), run required remote CI and obtain human review/checklist approval before merge. Never merge from local controlled-run evidence alone.
