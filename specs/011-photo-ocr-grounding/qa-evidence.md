# QA evidence

## Red → green

- HTTP region-array test first failed 400 instead of 200, then passed after route support.
- Browser large-photo test first received zero regions, then passed with six distinct JPEG regions, unresolved-title display, manual edit, and confirmation gate.
- Provider mock verifies exact matching, one copy per title, no estimated basics, no candidate list in the tiled prompt, and no self-reported confidence. The no-readable-title case returns an error.
- Legacy tournament single-image HTTP and browser tests pass.
- Review regressions first failed for a contradictory JPEG MIME, abandoning the photo list, and editing during an in-flight analysis. The route and UI now pass those cases. A truncated JPEG region is rejected.

## Local photo comparison

Used the untracked `data/deck/1000018836.jpg` in the actual browser crop path and sent the resulting six JPEG regions to the recognizer once. The response contained 32 distinct catalog/basic titles and five unresolved readings. Readable positives include Mana Vault, Flooded Strand, Tundra, Swords to Plowshares, and Cyclonic Rift. Giant Killer, Charming Prince, and Mazemind Tome from the old screenshot were absent. Mana Drain and Teferi appeared only within unresolved composite or misspelled readings, so manual correction remains necessary. The photo shows more than one Plains while the conservative draft records one; counts are intentionally subject to player review. There is no exact deck export to calculate precision or recall.

## Gates

- `npm run check`: passed after review fixes. Vitest: 704 passed, 1 skipped; Playwright: 45 passed; format, lint, types, data checks, coverage, and reports passed.
- Focused HTTP and browser review regressions passed, including MIME handling, truncated JPEG rejection, manual reset, and submission locking.
- `git diff --check`: passed.

## Convergence

FR-001 through FR-007 and the plan decisions are implemented at the agreed seams. The remaining risk is inherent in model transcription: a plausible wrong full title may still match the catalog, so user confirmation is mandatory. The custom requirements checklist remains for human review.

The Standards review identified MIME override, in-flight button unlocking, and truncated JPEG acceptance; the Spec review identified MIME override and return to manual entry. Regression tests were added and all findings were fixed before the final gate.
