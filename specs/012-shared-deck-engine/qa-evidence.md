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
- Controlled full coverage rerun: **110 files passed, 711 tests passed, 1 skipped**. Two workers and a 15-second runner completion timeout. Explicit HTTP SLA assertions and fast-check's 10-second interruption/failure policy remain unchanged. Coverage: statements 84.71%, branches 72.97%, functions 91.50%, lines 86.07%; all configured thresholds passed.
- Locked HTML reports: schema v2, seed 42, 24 boosters, 21 bombs and 360 traced decisions verified.
- Dedicated reference/replay run: 5 files, 30 tests passed with two workers.
- Isolated performance configuration: 2 files, 4 tests passed; no browser or coverage test ran concurrently.

## Browser evidence

The first attempt could not launch browsers: Playwright required headless Chromium revision 1243, absent from the cache. Installed that test binary with `install chromium --only-shell` and `PLAYWRIGHT_SKIP_BROWSER_GC=1`; no project dependency or browser-test configuration was changed.

Full browser run, one worker: **43 passed, 2 failed**. All seven Deck Lab scenarios passed, including mobile 360 px, desktop navigation, photo review, request state, degraded context, named movements and MTGA copying.

Remaining failures:
- `tests/browser/multiplayer-draft.spec.ts:21`: test exceeded its 30-second completion budget.
- `tests/browser/multiplayer-draft.spec.ts:255`: after keyboard removal of Carte 1, the count remained `40 / 40` instead of `39 / 40`.

Both scenarios simulate multiplayer HTTP responses; their controller `src/web/multiplayer-draft.js` and test inputs are unchanged. This is evidence that the modified backend calculation path is not exercised by these failing interactions, not a claim that a baseline checkout was rerun. Failure traces remain under ignored `test-results/`. Browser gate remains red; no threshold or assertion was waived and no merge is authorized by this evidence.

## Independent review

Code-review skill, baseline 828bcf9, working-tree/new files:
- Standards: no actionable findings; converter/locality, public tests and checked cross-platform cleanup are appropriate.
- Spec: no actionable findings; FR-001–FR-005 covered; final gate/QA evidence remained pending at review time.

## Runtime and delivery limits

Node 24.19.0 from the bundled runtime; npm 10.9.2. Repository pins Node 24.20.0/npm 11.19.0; exact runtime reproduction is not claimed. No Node/npm runtime was installed.
New GitHub issue creation and draft PR creation through the connector both failed 403 (`Resource not accessible by integration`); originating closed #86 is linked and feature 012 records the user-approved adaptive change. No reopening or PR creation is claimed. Branch `codex/012-shared-deck-engine` is pushed to origin. Intended PR base is `codex/011-photo-ocr-grounding` so the base branch's existing six commits do not enter this change's diff. Remote CI, actual Supabase, Lighthouse and human approval are not validated. Human checklist remains unchecked. Required browser and default-runner gate failures block merge even though the scoped parity and controlled full coverage pass.
