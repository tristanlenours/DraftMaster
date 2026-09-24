# QA evidence: Listes MTGA des Decks déclarés

Date: 2026-09-24. Issue: #82. Branch: `codex/009-mtga-tournament-decks`.

## Reproduction and regression

- Original UI error from the screenshot: `La reconnaissance visuelle du deck a échoué : Reconnaissance impossible.` The photo provider previously lost the useful HTTP failure reason and tried a failing model first. The focused fallback test verifies model order, temporary provider failure, cooldown and a precise 503 error.
- The active tournament built Deck/Photo buttons without inserting their `deckBar` into the page. Its photo handler immediately saved recognition output. A browser regression demonstrated the missing controls and now proves the scan opens a review modal without persisting until confirmation.
- The pre-merge Spec review found that a late preview response could overwrite text typed during the request. The editor now compares the current text with the submitted snapshot and asks for a new Apply if they differ; a browser test holds the response while a new card is typed and verifies the correction remains unsaved and visible.
- The physical image `data/deck/1000018826.jpg` was submitted to the configured local Gemini service on 2026-09-24. The call succeeded and returned 26 cards (25 distinct lines, zero basic lands). Its editable raw result is `data/deck/1000018826.mtga.txt`; the local MTGA parser reads it as 26 cards. This is a recognition result requiring human review, not a verified full deck or proof that every card is available in Arena.
- Sample provenance: source is the photo supplied by the user in this repository; no redistribution license was specified, so rights remain with the user. Generation used `GeminiDeckPhotoRecognizer` at commit `f5676aed`; the chosen fallback Gemini model was not logged, and the output is a QA draft rather than licensed catalog data.

## Automated verification

- `npx vitest run tests/unit/tournaments/mtga-deck-text.test.ts tests/unit/tournaments/deck-photo-service-fallback.test.ts tests/unit/multiplayer-draft/mtga-export.test.ts tests/integration/tournament-management-http.test.ts tests/integration/multiplayer-draft-http.test.ts`: 5 files, 33 tests passed.
- `npm run test`: 108 files, 692 passed, 1 skipped.
- `npm run test:mobile`: 25 passed.
- `npm run test:browser`: 37 passed, including preparation and active tournament import, photo review, private multiplayer export, keyboard and 360 px viewport.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `git diff --check`: passed.
- Parseur 40 cartes, 1 000 itérations Node 24 le 2026-09-24 : p95 0,06 ms (budget du plan : 100 ms).
- `npm run check`: passed after correcting a test assertion that expected the ignored sideboard in a second import. This includes format, lint, typecheck, data checks, 692 tests, coverage, reports and 37 browser tests.
- Pre-merge correction: focused concurrent-edit browser regression, lint, typecheck and the full 37-test browser suite pass. One unrelated historical browser test failed once in a combined rerun, then passed alone and in the full browser rerun.

## Spec Kit analysis and convergence

- Clarification pass found no unresolved question that would change the implementation or acceptance tests; defaults for sideboard and out-of-Snapshot cards are explicit in the specification.
- Retrospective cross-artifact analysis mapped all 10 functional requirements and 4 buildable success criteria to T001–T014. The sole planning gap was the missing measurable performance target; the plan now states a 40-card parser p95 budget, and the measurement above is below it.
- Post-implementation convergence found no remaining code work in the feature scope. The custom requirements checklist remains for its human owner under Constitution Delivery Workflow §2.

## Requirement review

- FR-001/002/008/009: photo and pasted text share the same editor and require Apply then Save. Active and preparation flows use existing tournament persistence contracts. Photo/text themselves are transient.
- FR-003/004/005: parser covers Deck/Sideboard, About/Name, edition suffixes and French basic lands; rejects malformed, partial and empty input. Sideboard count is visible and ignored.
- FR-006: preview enriches exact catalog matches and preserves unknown names with a warning; no fuzzy substitution.
- FR-007: copy/download and import round trip are covered by unit and browser tests.
- FR-010: a private complete export for tournament retains cards unavailable in Arena; original Arena export behavior is preserved. Authentication is tested at the HTTP boundary.

## Limits

- The sample photo has overlapping cards, so count and names need a player to correct them. No claim of a complete 40-card deck is made.
- Sideboard is not part of the tournament's persisted Deck déclaré model and is intentionally ignored.
