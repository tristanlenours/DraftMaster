# QA evidence

## Red → green

- HTTP region-array test first failed 400 instead of 200, then passed after route support.
- Browser large-photo test first received zero regions, then passed with six distinct JPEG regions, unresolved-title display, manual edit, and confirmation gate.
- Provider mock verifies exact matching, one copy per nonbasic title, visible-only basics, no candidate list in the tiled prompt, and no self-reported confidence. The no-readable-title case returns an error.
- Legacy tournament single-image HTTP and browser tests pass.
- Review regressions first failed for a contradictory JPEG MIME, abandoning the photo list, and editing during an in-flight analysis. The route and UI now pass those cases. A JPEG region missing its end marker is rejected.

## Local photo comparison

Used the untracked `data/deck/1000018836.jpg` in the actual browser crop path and sent the resulting six JPEG regions to the recognizer once. The response contained 32 distinct catalog/basic titles and five unresolved readings. Readable positives include Mana Vault, Flooded Strand, Tundra, Swords to Plowshares, and Cyclonic Rift. Giant Killer, Charming Prince, and Mazemind Tome from the old screenshot were absent. Mana Drain and Teferi appeared only within unresolved composite or misspelled readings, so manual correction remains necessary. The photo shows more than one Plains while the earlier conservative draft recorded one. The updated recognizer can keep distinct visible basics repeated within one region; the supplied photo has not been reprocessed against Gemini after this change. Counts remain subject to player review. There is no exact deck export to calculate precision or recall.

The player's visual review identified `Ruisseau éclatant` and the Jwari land face as cut off: the first title bar is hidden, and `Jwari Ruins` appears in rules text rather than as a complete printed title. A focused provider regression emits the partial readings `Ruisseau éclat…` and `Jwari Ruin…`; both stay in `unverifiedTitles`, and neither Vivid Creek nor Jwari Disruption enters the automatic MTGA list. This proves handling of partial model output, not that a model can never guess a plausible complete catalog title.

## Cube quantity and build correction

- Red regressions first rejected a 39-card Rate input, accepted duplicate Lightning Bolt entries, treated 30 submitted basics as part of Pimp's 45-card cap, and collapsed two visible Plains readings to one.
- Rate now evaluates 40 cards after adding disclosed virtual basics. Tests cover 23 unique red nonlands with 16, 17, or zero submitted Mountains, and rejection at 41 cards.
- Deck Lab rejects duplicate nonbasic Oracle identities across maindeck and sideboard. Pimp accepts 45 unique nonbasics plus submitted basics, rejects 46, and requires 23 true nonlands. Emeria's Call occupies one of the 17 land slots; a 40-card input with 24 nonlands is rebuilt rather than retained.
- The photo/browser journey now uses a singleton recognized Lightning Bolt and 16 Mountains, confirms the list, and displays the virtual-basic warning after Rate. The submitted photo remains untracked.
- The photo review was inspected from browser screenshots at 360 × 812 and 1280 × 800. The review checkbox, uncertain title, editable list, and disabled actions remain visible. A 1280 px regression exposed header overflow; compact desktop navigation now retains visually hidden accessible tab labels and no horizontal overflow.
- `npm run check`: passed with 708 Vitest tests, 1 skipped, and 45 Playwright tests; format, lint, types, catalog/profile/coach-data checks, coverage, and report verification passed.
- After review changes, the full local check passed through report verification. Its parallel browser phase had one unrelated intermittent image-load failure in Solo (14/15 images after 10 seconds); a rerun had an unrelated 39/40 keyboard-update failure in multiplayer. Each failing test passed alone, and the complete browser suite passed 45/45 with one worker. CI for commit `30d12f7e` passed all required jobs on Linux, macOS, and Windows, including browser, security, dependency, and performance checks.

## Gates

- `npm run check`: passed on the quantity commit (708 Vitest passed, 1 skipped; 45 Playwright passed). On the later review commit, format, lint, types, data checks, Vitest, coverage, and reports passed; the parallel browser phase showed the intermittent failures described above. `npx playwright test --workers=1`: 45 passed.
- Focused HTTP and browser review regressions passed, including MIME handling, truncated JPEG rejection, manual reset, and submission locking.
- `git diff --check`: passed.

## Convergence

FR-001 through FR-008 and the plan decisions were checked against the present code at the agreed seams. No buildable gap remains; the latest Standards + Spec review's visual evidence and truncated-title findings were resolved above. The remaining risk is inherent in model transcription: a plausible wrong full title may still match the catalog, so user confirmation is mandatory. The custom requirements checklist remains for human review.

The Standards review identified MIME override, in-flight button unlocking, and acceptance of JPEG data missing its end marker; the Spec review identified MIME override and return to manual entry. Regression tests were added and all findings were fixed before the final gate.

The quantity follow-up review identified missing desktop photo-review evidence, duplicated test fixtures, an unchecked gate task, and no targeted evidence for the two truncated titles named by the player. The desktop and partial-title regressions, shared fixture, artifact alignment, and CI evidence above close these findings.

The JPEG check is structural, not a full image decode. Corrupt pixel data can still reach Gemini; a provider error leaves the editable list unchanged.
