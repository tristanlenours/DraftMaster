# QA evidence

## Red → green

- HTTP region-array test first failed 400 instead of 200, then passed after route support.
- Browser large-photo test first received zero regions, then passed with six distinct JPEG regions, unresolved-title display, manual edit, and confirmation gate.
- Provider mock verifies exact matching, one copy per title, no estimated basics, no candidate list in the tiled prompt, and no self-reported confidence. The no-readable-title case returns an error.
- Legacy tournament single-image HTTP and browser tests pass.

## Local photo comparison

Used the untracked `data/deck/1000018836.jpg` in the actual browser crop path and sent the resulting six JPEG regions to the recognizer once. The response contained 32 distinct catalog/basic titles and five unresolved readings. Readable positives include Mana Vault, Flooded Strand, Tundra, Swords to Plowshares, and Cyclonic Rift. Giant Killer, Charming Prince, and Mazemind Tome from the old screenshot were absent. Mana Drain and Teferi appeared only within unresolved composite or misspelled readings, so manual correction remains necessary. The photo shows more than one Plains while the conservative draft records one; counts are intentionally subject to player review. There is no exact deck export to calculate precision or recall.

## Gates

- `npm run check`: passed on the final source and tests. Vitest: 704 passed, 1 skipped; coverage gate passed; Playwright: 44 passed.
- `npx playwright test tests/browser/deck-lab.spec.ts`: 6 passed, including 360 px overflow, keyboard confirmation, and provider failure preserving text.
- `git diff --check`: passed.

## Convergence

FR-001 through FR-007 and the plan decisions are implemented at the agreed seams. The remaining risk is inherent in model transcription: a plausible wrong full title may still match the catalog, so user confirmation is mandatory. The custom requirements checklist remains for human review.
