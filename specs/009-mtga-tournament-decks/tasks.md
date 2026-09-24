# Tasks: Listes MTGA des Decks déclarés

## Phase 1: Foundation

- [x] T001 Add red parser/formatter tests in `tests/unit/tournaments/mtga-deck-text.test.ts` for FR/EN names, sections, counts, partial exports and round trip.
- [x] T002 Implement pure MTGA parser/formatter in `src/web/mtga-deck-text.js` and declarations in `src/web/mtga-deck-text.d.ts`.
- [x] T003 Add red HTTP preview tests in `tests/integration/tournament-management-http.test.ts` for known/unknown cards and rejection without mutation.
- [x] T004 Implement exact catalog resolution and preview endpoint in `src/tournaments/deck-photo-recognition.ts`, `src/tournaments/mtga-deck-import.ts` and `src/tournaments/http-handler.ts`.

## Phase 2: User Story 1 — Photo correction

- [x] T005 [US1] Add a red browser test in `tests/browser/tournament-management.spec.ts` for photo text correction and confirmed persistence.
- [x] T006 [US1] Add MTGA text editor and apply feedback in `src/web/index.html`, `src/web/styles.css` and `src/web/tournaments.js`.

## Phase 3: User Story 2 — Arena and multiplayer import

- [x] T007 [US2] Extend browser test in `tests/browser/tournament-management.spec.ts` for pasted DraftMaster `Deck`/`Sideboard` export and ignored sideboard count.
- [x] T008 [US2] Wire pasted MTGA text into both preparation and active tournament Deck déclaré flows in `src/web/tournaments.js`.

## Phase 4: User Story 3 — Export

- [x] T009 [US3] Add browser assertion for copy/download round trip in `tests/browser/tournament-management.spec.ts`.
- [x] T010 [US3] Add copy/download controls in `src/web/index.html` and `src/web/tournaments.js`.
- [x] T011 [US3] Add a complete private multiplayer tournament export in `src/multiplayer-draft/mtga-export.ts`, `src/multiplayer-draft/http-handler.ts`, `src/web/multiplayer-draft.js`, `src/web/index.html` and focused tests.
- [x] T012 [US1] Expose the active-tournament deck/photo controls and require review before a photo updates a participant.

## Phase 5: Validation

- [x] T013 Run targeted and full affected tests, lint, typecheck, mobile viewport and whitespace checks; record evidence in `specs/009-mtga-tournament-decks/qa-evidence.md`.
- [x] T014 Review requirements against the implemented code and record remaining gaps in `specs/009-mtga-tournament-decks/qa-evidence.md`.

## Dependencies

T001–T004 precede UI work. T005–T006, T007–T008 and T009–T012 cover the user journeys after the parser contract exists. T013–T014 follow all implementation.
