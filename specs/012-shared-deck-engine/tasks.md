# Tasks: Shared deck engine

- [x] T001 [US1] Add failing public multiplayer recommendation/finalization parity and snapshot rejection coverage in tests/unit/multiplayer-draft/coordinator-deck.test.ts; fix context propagation in coordinator.ts.
- [x] T002 [US2] Add failing adaptive Pimp fixture in tests/unit/deck-lab/analyze-deck.test.ts; remove fixed constraint/validation and update copy and fixed-ratio expectations.
- [x] T003 [US1] Add public Solo/Rate parity integration; extract shared catalog facts into src/cards/evaluation-input.ts and use complete context options in Solo and multiplayer composition.
- [ ] T004 Verify affected suites, complete quality gate, reference/replay; record qa-evidence.md and Standards + Spec review.
- [ ] T005 Converge spec/plan/tasks with final implementation and prepare reviewable delivery; remote PR and human approval only when available.

Dependencies: T001 → T002 → T003 → T004 → T005. One vertical slice at a time. No parallel edits required.
