# QA evidence — Shared deck engine

Date: 2026-09-30. Baseline: 828bcf9b7479c88cedd95620e211ee3338bc48de.

## Red / green evidence

- Multiplayer public recommendation/finalization comparison failed: recommendation score 59, final score 57, with bomb threshold and synergy profile lost. Propagating the snapshot-checked CoachContext made the evaluation objects equal.
- Pimp adaptive 22-nonland fixture failed with the old 23-nonland rejection. Removing its fixed constraint produces a 40-card 22/18 build with the unchanged draft engine.
- Rate color-identity fixture failed (`usedColors: []` instead of `[R]`). Reusing the Solo catalog conversion preserves the draft's fallback.
- Public Solo journey: 45 picks, local recommendation, finalization, Rate and Pimp. Axes, score, full audit, selected nonbasics and basic allocation agree. Scratch outputs are isolated and removed with a checked parent path.
- Wrong multiplayer context snapshot rejects without state mutation; recommendation can then be finalized with matching context.
- Focused suites: 4 files, 33 tests passed (Solo session, multiplayer deckbuilding, Deck Lab, public parity).

## Initial quality runs

- Format, ESLint, TypeScript and the three data integrity commands passed after correcting lint findings. No data repair was needed.
- `npm run check` stopped in the default-parallel Vitest suite: 710 passed, 1 skipped, 1 failed. The failure was the existing HTTP latency assertion: 201 ms against 150 ms. The assertion was not changed.
- An attempted npm coverage rerun did not forward the worker option through this PowerShell/npm launcher. It was stopped; use direct Vitest commands for controlled worker counts.
- Direct full coverage with two workers: 710 passed, 1 skipped, 1 failed. Existing Swiss property test exceeded Vitest's default 5-second completion timeout (5.5 seconds); no behavioral assertion failed.
- Controlled full coverage rerun: **110 files passed, 711 tests passed, 1 skipped**. Two workers and a 15-second runner completion timeout. Explicit HTTP SLA assertions and fast-check's 10-second interruption/failure policy remain unchanged. Coverage: statements 84.71%, branches 72.97%, functions 91.50%, lines 86.07%; all configured thresholds passed.
- Locked HTML reports: schema v2, seed 42, 24 boosters, 21 bombs and 360 traced decisions verified.
- Dedicated reference/replay run: 5 files, 30 tests passed with two workers.
- Isolated performance configuration: 2 files, 4 tests passed; no browser or coverage test ran concurrently.

## Initial browser evidence

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

## PR #90 conflict resolution (2026-09-30)

The user opened PR [#90](https://github.com/tristanlenours/DraftMaster/pull/90) against `main` after the connector refused creation. Main commit `1f243e16` squash-merges the preceding photo feature (#89). Its complete tracked tree is identical to the feature-012 starting commit `828bcf9b` (`git diff 828bcf9b origin/main` is empty).

Merged `origin/main` into the feature branch without rewriting published history. The six conflicts all concern changes already superseded by feature 012: shared conversion, adaptive minimum/land allocation, UI copy, spec and regression tests. Kept the feature-012 versions. After staging the resolutions, the merge has no tracked implementation difference from the pre-merge feature head; therefore all photo/quantity corrections on main are preserved. This resolves branch integration only; earlier qualification failures and human approval requirements still apply.

Post-resolution TypeScript and `git diff --check` passed. Focused default-timeout run: 32 passed, multiplayer test exceeded 5 seconds. Controlled rerun with two workers and a 15-second completion timeout: all four suites / 33 tests passed. No test/configuration change or assertion waiver. PR #90 now uses `main` as base; the earlier intended stacked base and failed creation attempt below are historical delivery evidence.

## Initial runtime and delivery limits

Node 24.19.0 from the bundled runtime; npm 10.9.2. Repository pins Node 24.20.0/npm 11.19.0; exact runtime reproduction is not claimed. No Node/npm runtime was installed.
New GitHub issue creation and draft PR creation through the connector both failed 403 (`Resource not accessible by integration`); originating closed #86 is linked and feature 012 records the user-approved adaptive change. No reopening or PR creation is claimed. Branch `codex/012-shared-deck-engine` is pushed to origin. Intended PR base is `codex/011-photo-ocr-grounding` so the base branch's existing six commits do not enter this change's diff. Remote CI, actual Supabase, Lighthouse and human approval are not validated. Human checklist remains unchecked. Required browser and default-runner gate failures block merge even though the scoped parity and controlled full coverage pass.

## Gate qualification follow-up (2026-09-30)

The user authorized continued qualification of PR #90. GitHub reports it open, mergeable, with main as base. Initial head d77e4cad: Quality run 36779687881 passed all three matrix OS jobs, browser journeys and isolated performance; Security run 36779687869 passed secret detection but failed dependency audit. These are results for the previous head, not the final follow-up.

Browser loop: `node node_modules/@playwright/test/cli.js test tests/browser/multiplayer-draft.spec.ts --workers=1`. Before correction: two-player scenario exceeded 30 seconds; keyboard scenario passed on that run. The trace shows all two-player assertions completed before cleanup exhausted the total budget. Isolating optional external resources in these mocked API contexts made it pass in 18.5 seconds. Added a regression that focuses Carte 1, waits for a real player-state poll and checks focus before Enter: failed consistently with inactive control before the UI correction. Identical polling responses previously recreated every deck button. The renderer now preserves them when card ids, names and selections match. Both scenarios then passed (21.1 / 5.9 seconds), with all existing assertions and budgets unchanged.

Dependency loop: npm audit reported brace-expansion high and fast-uri moderate. Updated only their transitive lock entries within existing ranges: 5.0.9 → 5.0.12 and 3.1.7 → 3.1.8. [brace-expansion advisory](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [fast-uri advisory](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj). npm audit now reports zero vulnerabilities. No package.json, direct dependency or audit policy change.

Downloaded the official Node 24.20.0 Windows archive into ignored `.scratch/runtime`, verified its SHA-256 against Node's published SHASUMS256 and confirmed bundled npm 11.19.0. No global runtime installation. Follow-up Standards and Spec reviews found no actionable findings; final verification and remote-head evidence follow below. Human approval/checklist and actual Supabase/Lighthouse evidence are still outside these checks.

Full post-fix browser suite, one worker: **45/45 passed** (5.5 minutes), including all seven Deck Lab scenarios and both multiplayer journeys. Follow-up commits cf734e68 (focus/test isolation) and 016721ad (two dependency patches) are pushed. Updating PR title/body through the connector still fails 403 (`Resource not accessible by integration`); no successful metadata update is claimed. A proposed description is retained in pull-request.md for review.

Exact-runtime local `npm run check`: format/lint/types and all three data checks passed. Default Vitest run: 702 passed, 9 failed, 1 skipped; duration 97.1 seconds. Failures were completion timeouts in multiplayer flows/restart/context integrity, interrupted timed fast-check runs and SC-002 pack scoring at 1.25 ms versus 1 ms. The machine has 8 logical CPUs / 8 GB RAM; Vitest's default non-watch worker count is CPU count minus one, confirmed in its installed runner. Comparing against one worker uses the same test cases and original completion/performance budgets. The raw parallel check is not claimed green and its assertions/configuration were not modified.

Exact-runtime comparison: `node node_modules/vitest/vitest.mjs run --coverage --maxWorkers=1`, with no timeout override: **110 suites, 711 passed, 1 skipped**, 183.7 seconds. All original SLA/completion/fast-check limits passed. Coverage statements 84.71%, branches 72.97%, functions 91.50%, lines 86.07% meets all thresholds. This supports runner contention as the explanation for the local parallel failures; no domain/performance threshold or runner configuration was changed.

For final implementation head **016721ad24eaaefdf4feafd188536655e08dd1d7**, [Quality run 36781038250](https://github.com/tristanlenours/DraftMaster/actions/runs/36781038250) and [Security run 36781038253](https://github.com/tristanlenours/DraftMaster/actions/runs/36781038253) are both **completed / success**. Quality includes all three OS matrix jobs with default runner settings, reference/replay/audit/domain/coach/E2E/coverage/report checks, browser journeys and isolated performance. Security includes dependency audit and secret detection. Later evidence-only commits do not change that validated implementation; their checks must also pass before merge.

Convergence: FR-001–FR-005 and SC-001–SC-004 implemented/verified; no outstanding engine or browser defect found. The raw local parallel check remains reproducibly capacity-sensitive and is disclosed above; the same original budgets pass serially and on all three required CI platforms. No gate exception or human approval is asserted. T007 remains open for the final branch checks and reviewer-owned approval/checklist; actual Supabase and Lighthouse have not been independently exercised here.
