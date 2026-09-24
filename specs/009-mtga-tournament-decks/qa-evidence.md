# QA evidence: Listes MTGA des Decks déclarés

Date: 2026-09-24. Issue: #82. Branch: `codex/009-mtga-tournament-decks`.

## Reproduction and regression

- Original UI error from the screenshot: `La reconnaissance visuelle du deck a échoué : Reconnaissance impossible.` The photo provider previously lost the useful HTTP failure reason and tried a failing model first. The focused fallback test verifies model order, temporary provider failure, cooldown and a precise 503 error.
- The active tournament built Deck/Photo buttons without inserting their `deckBar` into the page. Its photo handler immediately saved recognition output. A browser regression demonstrated the missing controls and now proves the scan opens a review modal without persisting until confirmation.
- The physical image `data/deck/1000018826.jpg` was submitted to the configured local Gemini service on 2026-09-24. The call succeeded and returned 26 cards (25 distinct lines, zero basic lands). Its editable raw result is `data/deck/1000018826.mtga.txt`; the local MTGA parser reads it as 26 cards. This is a recognition result requiring human review, not a verified full deck or proof that every card is available in Arena.

## Automated verification

- `npx vitest run tests/unit/tournaments/mtga-deck-text.test.ts tests/unit/tournaments/deck-photo-service-fallback.test.ts tests/unit/multiplayer-draft/mtga-export.test.ts tests/integration/tournament-management-http.test.ts tests/integration/multiplayer-draft-http.test.ts`: 5 files, 33 tests passed.
- `npm run test`: 108 files, 692 passed, 1 skipped.
- `npm run test:mobile`: 25 passed.
- `npm run test:browser`: 37 passed, including preparation and active tournament import, photo review, private multiplayer export, keyboard and 360 px viewport.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `git diff --check`: passed.
- `npm run check`: passed after correcting a test assertion that expected the ignored sideboard in a second import. This includes format, lint, typecheck, data checks, 692 tests, coverage, reports and 37 browser tests.

## Requirement review

- FR-001/002/008/009: photo and pasted text share the same editor and require Apply then Save. Active and preparation flows use existing tournament persistence contracts. Photo/text themselves are transient.
- FR-003/004/005: parser covers Deck/Sideboard, About/Name, edition suffixes and French basic lands; rejects malformed, partial and empty input. Sideboard count is visible and ignored.
- FR-006: preview enriches exact catalog matches and preserves unknown names with a warning; no fuzzy substitution.
- FR-007: copy/download and import round trip are covered by unit and browser tests.
- FR-010: a private complete export for tournament retains cards unavailable in Arena; original Arena export behavior is preserved. Authentication is tested at the HTTP boundary.

## Limits

- The sample photo has overlapping cards, so count and names need a player to correct them. No claim of a complete 40-card deck is made.
- Sideboard is not part of the tournament's persisted Deck déclaré model and is intentionally ignored.
