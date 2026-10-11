# QA evidence — 2026-10-11

## Diagnosis and regression

Initial `npx vitest run tests/unit/tournaments/deck-photo-service-fallback.test.ts`: 5 existing tests pass and both actual-photo title replays fail on absent French aliases. The manifest was independently corrected after rendering both original photos upright: Convulsion cérébrale is Mind Twist, Preneuse d'otage is Hostage Taker, the rear black creature is Crabomination, and Brainstorm is not visible. Synthetic Brainstorm titles remain appropriate independent multilingual index regressions.

Explicit Scryfall import completed for 730 Nico catalog entries plus five ordinary basics: 6,592 aliases in 12 archived languages, 720 translated identities, approximately 1.5 MB. Every alias retains oracle and printing identity, language and source provenance. Some cards have no foreign printing; existing canonical and French entries still resolve. No runtime per-card request was added.

Targeted recognition/index/import/HTTP/integration suite: 38 passed, one existing opt-in live sample skipped. Subsequent corpus/index replay: 13 passed after correcting and expanding the independently inspected visible subset.

## Actual image preparation and live vision

The second image places the Serum Visions title ribbon at original JPEG coordinates x=770, y=1210, width=60, height=310. The actual canvas crop regression fails before the overlap correction: the complete ribbon does not fit in any uploaded region. Overlap changes from 12% to 35%, retaining six regions, maximum dimension 1600 px and existing body limits.

Before this correction, live Gemini missed the central French column in photo 2 while correctly resolving titles it did read. After correction, `TEST_LIVE_NICO_OCR=true npx vitest run tests/integration/nico-photo-live-ocr.test.ts` passes both photos (73.93 s total), requiring Serum Visions, Mind Twist, Vampiric Tutor and Hullbreacher from actual six-crop requests. This demonstrates four explicit French anchors on each photo, not a guarantee of complete deck counts or perfect future vision runs. Provider checks remain opt-in; offline replay is the deterministic regression gate.

`npx playwright test tests/browser/deck-lab.spec.ts`: 9/9 passed, including both original JPEG uploads, six distinct bounded regions, canonical editable titles, review-gated Rate/Pimp, Space-key confirmation, editing requiring reconfirmation, 360 px/desktop layouts and no horizontal overflow. See [photo 1 mobile](evidence/photo-1-mobile.png), [photo 1 desktop](evidence/photo-1-desktop.png), [photo 2 mobile](evidence/photo-2-mobile.png), [photo 2 desktop](evidence/photo-2-desktop.png). Mobile evidence visually inspected; existing UI is unchanged.

## Quality and delivery

Initial unconstrained `npm run check` passed formatting/lint/type/catalog checks but two existing computational tests timed out under full local worker contention. Both pass unchanged when run with VITEST_MAX_WORKERS=2 (3/3 tests, 2.99 s). Full quality rerun uses that documented environment limit; no test timeout, assertion or threshold was relaxed. Final outcome and reviews pending below.

GitHub connector issue creation returned 403, “Resource not accessible by integration”. Originating #88/#86 are linked. A dedicated remote issue, PR, CI and human review are delivery gates; no remote success or human approval is claimed.

## Standards review

One P2: generated source metadata needed explicit license/use-condition status. Importer and dataset now consistently record source terms and rights conditions, explicitly assuming no open-content license grant. Focused independent recheck: resolved; no remaining Standards findings.

## Spec review

One P2: the truncation guard rejected the official complete French title “Il était une fois...”. A red regression reproduced this failure; literal aliases now precede the truncation guard, while unmatched truncated readings stay unresolved. Targeted suite: 22/22 passed. Independent exhaustive recheck: 6,586/6,592 aliases resolve correctly; the remaining six are intentional identity collisions (Isla, Llanura, Liquidar). No remaining actionable Spec findings.

Final corpus replay uses 27 readable nonbasic titles in photo 1 and 28 in photo 2: the clipped Archon title in photo 1 is excluded explicitly. No whole-deck quantity claim is made.

The full gate's browser stage and a repeat at four workers each report 46 passes and the same existing multiplayer journey timeout at 30 seconds (tests/browser/multiplayer-draft.spec.ts:31). npm forwarded no worker argument in the attempted script invocation; the subsequent direct Playwright CLI invocation explicitly uses one worker. This is an unresolved gate until its result is recorded; no timeout is increased.

Initial `npm audit --audit-level=high` reported one existing high-severity dependency advisory in source-map-js (GHSA-68fv-2mgg-jv7q). At that stage no dependency or lockfile change had been made. This red delivery gate required remediation before merge.

Gate follow-up: update only source-map-js 1.2.1 -> 1.2.2 within its existing range (three lockfile values). Node 24.20.0 / npm 11.19.0 dependency audit now reports zero vulnerabilities. The earlier global Node 22 / npm 10 invocation rejected maintenance on engine-strict; it made no lockfile change. No dependency was added.

Supplementary verification accidentally used the global Node 22 runtime: 30 reference/replay tests pass and all 47 browser tests pass with one worker (4.1 min); a simultaneous coverage run hit the same two computational 5 s limits. These are supplementary diagnostics, not the required Node 24 qualification. Final isolated Node 24 quality rerun follows, with one Vitest worker and unchanged thresholds.

Node 24.20.0 / npm 11.19.0, VITEST_MAX_WORKERS=1: full unit/integration/contract suite passes 725 tests, with three existing/opt-in skips (111 files pass, one skip). The coverage rerun also passes 725 tests: statements 84.77%, branches 73.23%, functions 91.28%, lines 86.15%, existing thresholds met. Formatting, lint, types, catalog facts, synergy/coach data and reference report verification pass. Seed 42 reports retain 24 boosters, 21 bombs and 360 traced decisions.

Final Node 24 browser stage: 46/47 pass, including all nine Deck Lab scenarios. The same existing multiplayer join/resume journey exceeds 30 s at four workers. Consequently the combined npm run check command exits 1: no green combined-gate claim and no merge waiver. A focused direct Node 24, one-worker rerun of that journey follows; assertions and timeouts stay unchanged. Durable screenshots are refreshed from this final Node 24 execution.

Branch codex/013-multilingual-deck-photos is pushed; source commit 62c2ddbe. Draft PR creation via the connector also returned 403, “Resource not accessible by integration”. Proposed description is preserved in pull-request.md. Remote CI and human approval are unverified; no merge performed.

Focused Node 24 browser rerun, one worker, same multiplayer journey: passes in 21.8 s (24.3 s including startup), with the original 30 s timeout. Thus all 47 journeys have passing Node 24 evidence: 46 in the combined run, one isolated. The combined command remains recorded as red under four-worker concurrency; remote required CI must still qualify before merge.

## Convergence and final delivery status

Present implementation compared with seven functional requirements, four success criteria, seven plan decisions and five constitution principles. No remaining buildable feature gap, partial language-resolution implementation or unrequested scoring/domain change. SC-004 explicitly records actual gate failures; this is not a release waiver. No empty convergence phase was added. Standards: zero remaining findings; Spec: zero remaining actionable findings after independent rechecks, including the focused lockfile maintenance.

T009/T010 mean checks, reviews, convergence and delivery status have been executed and recorded. They do not approve the human checklist or claim remote delivery success. Branch is reviewable; PR creation, remote CI and human release approval remain pending. Original root photos and all unrelated local files remain untouched.
