# QA evidence — Shared deck engine

Date: 2026-09-30. Baseline: 828bcf9b7479c88cedd95620e211ee3338bc48de.

## Red / green evidence

- Multiplayer public recommendation/finalization comparison failed: recommendation score 59, final score 57, with bomb threshold and synergy profile lost. Propagating the snapshot-checked CoachContext made the evaluation objects equal.
- Pimp adaptive 22-nonland fixture failed with the old 23-nonland rejection. Removing its fixed constraint produces a 40-card 22/18 build with the unchanged draft engine.
- Rate color-identity fixture failed (`usedColors: []` instead of `[R]`). Reusing the Solo catalog conversion preserves the draft's fallback.
- Public Solo journey: 45 picks, local recommendation, finalization, Rate and Pimp. Axes, score, full audit, selected nonbasics and basic allocation agree. Scratch outputs are isolated and removed with a checked parent path.
- Wrong multiplayer context snapshot rejects without state mutation; recommendation can then be finalized with matching context.
- Focused suites: 4 files, 33 tests passed (Solo session, multiplayer deckbuilding, Deck Lab, public parity).

## Quality runs

- Format, ESLint, TypeScript and the three data integrity commands passed after correcting lint findings. No data repair was needed.
- `npm run check` stopped in the default-parallel Vitest suite: 710 passed, 1 skipped, 1 failed. The failure was the existing HTTP latency assertion: 201 ms against 150 ms. The assertion was not changed.
- An attempted npm coverage rerun did not forward the worker option through this PowerShell/npm launcher. It was stopped; use direct Vitest commands for controlled worker counts.
- Direct full coverage with two workers: 710 passed, 1 skipped, 1 failed. Existing Swiss property test exceeded Vitest's default 5-second completion timeout (5.5 seconds); no behavioral assertion failed.
- Controlled coverage rerun uses two workers and a 15-second runner completion timeout. Explicit HTTP SLA assertions and fast-check's 10-second interruption/failure policy remain unchanged. Result pending below.

## Independent review

Code-review skill, baseline 828bcf9, working-tree/new files:
- Standards: no actionable findings; converter/locality, public tests and checked cross-platform cleanup are appropriate.
- Spec: no actionable findings; FR-001–FR-005 covered; final gate/QA evidence remained pending at review time.

## Runtime and delivery limits

Node 24.19.0 from the bundled runtime; npm 10.9.2. Repository pins Node 24.20.0/npm 11.19.0; exact runtime reproduction is not claimed. No new runtime was installed.
New GitHub issue creation failed 403; originating closed #86 is linked and feature 012 records the user-approved adaptive change. No reopening is claimed. Remote CI, actual Supabase, Lighthouse and human approval are not validated by these local runs. Human checklist remains unchecked. Browser, reference/replay, reports, final coverage and PR outcomes will be recorded before delivery.
