# QA evidence

## Red → green

- HTTP region-array test first failed 400 instead of 200, then passed after route support.
- Browser large-photo test first received zero regions, then passed with six distinct JPEG regions, unresolved-title display, manual edit, and confirmation gate.
- Provider mock verifies exact matching, one copy per title, no estimated basics, no candidate list in the tiled prompt, and no self-reported confidence. The no-readable-title case returns an error.
- Legacy tournament single-image HTTP and browser tests pass.
- Review regressions first failed for a contradictory JPEG MIME, abandoning the photo list, and editing during an in-flight analysis. The route and UI now pass those cases. A JPEG region missing its end marker is rejected.

## Local photo comparison

Used the untracked `data/deck/1000018836.jpg` in the actual browser crop path and sent the resulting six JPEG regions to the recognizer once. The response contained 32 distinct catalog/basic titles and five unresolved readings. Readable positives include Mana Vault, Flooded Strand, Tundra, Swords to Plowshares, and Cyclonic Rift. Giant Killer, Charming Prince, and Mazemind Tome from the old screenshot were absent. Mana Drain and Teferi appeared only within unresolved composite or misspelled readings, so manual correction remains necessary. The photo shows more than one Plains while the earlier conservative draft recorded one. The updated recognizer can keep distinct visible basics repeated within one region; the supplied photo has not been reprocessed against Gemini after this change. Counts remain subject to player review. There is no exact deck export to calculate precision or recall.

## Cube quantity and build correction

- Red regressions first rejected a 39-card Rate input, accepted duplicate Lightning Bolt entries, treated 30 submitted basics as part of Pimp's 45-card cap, and collapsed two visible Plains readings to one.
- Rate now evaluates 40 cards after adding disclosed virtual basics. Tests cover 23 unique red nonlands with 16, 17, or zero submitted Mountains, and rejection at 41 cards.
- Deck Lab rejects duplicate nonbasic Oracle identities across maindeck and sideboard. Pimp accepts 45 unique nonbasics plus submitted basics, rejects 46, and requires 23 true nonlands. Emeria's Call occupies one of the 17 land slots; a 40-card input with 24 nonlands is rebuilt rather than retained.
- The photo/browser journey now uses a singleton recognized Lightning Bolt and 16 Mountains, confirms the list, and displays the virtual-basic warning after Rate. The submitted photo remains untracked.
- `npm run check`: passed with 708 Vitest tests, 1 skipped, and 45 Playwright tests; format, lint, types, catalog/profile/coach-data checks, coverage, and report verification passed.

## Gates

- `npm run check`: passed after the quantity correction. Vitest: 708 passed, 1 skipped; Playwright: 45 passed; format, lint, types, data checks, coverage, and reports passed.
- Focused HTTP and browser review regressions passed, including MIME handling, truncated JPEG rejection, manual reset, and submission locking.
- `git diff --check`: passed.

## Convergence

FR-001 through FR-007 and the plan decisions are implemented at the agreed seams. The remaining risk is inherent in model transcription: a plausible wrong full title may still match the catalog, so user confirmation is mandatory. The custom requirements checklist remains for human review.

The Standards review identified MIME override, in-flight button unlocking, and acceptance of JPEG data missing its end marker; the Spec review identified MIME override and return to manual entry. Regression tests were added and all findings were fixed before the final gate.

The JPEG check is structural, not a full image decode. Corrupt pixel data can still reach Gemini; a provider error leaves the editable list unchanged.
