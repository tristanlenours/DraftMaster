# Tasks: Rate my deck / Pimp my deck

**Source:** [spec.md](spec.md), [plan.md](plan.md), [contracts/http.md](contracts/http.md).
**Status note:** This list records work already implemented locally before the full Spec Kit path was assembled. Checkmarks describe current code and tests, not a claim that the prescribed pre-implementation order occurred.

## Phase 1: Foundation

- [x] T001 Extend MTGA parsing and formatting for sideboard counts and French basic lands in `src/web/mtga-deck-text.js` and `tests/unit/tournaments/mtga-deck-text.test.ts`.
- [x] T002 Share editable photo upload handling in `src/web/deck-photo-upload.js` and `src/web/tournaments.js`.

## Phase 2: User Story 1 — Rate a deck

**Independent criterion:** A 40-card pasted or corrected photo list produces the five-axis rating; 39 cards or an unknown name is rejected.

- [x] T003 [US1] Validate input, resolve exact card facts, evaluate the 40-card deck and explain coverage in `src/deck-lab/analyze-deck.ts` and `tests/unit/deck-lab/analyze-deck.test.ts`.
- [x] T004 [US1] Expose the transient analysis endpoint in `src/deck-lab/http-handler.ts` and `scripts/serve-web.mjs`.
- [x] T005 [US1] Render the Rate form, axes and evidence in `src/web/deck-lab.js` and `src/web/index.html`.
- [x] T006 [US1] Add accessible desktop and mobile navigation to `/deck-lab` in `src/web/index.html`, `src/web/app.js`, `src/web/styles.css`, and `tests/browser/deck-lab.spec.ts`.

## Phase 3: User Story 2 — Pimp a pool

**Independent criterion:** At most 45 submitted cards produce a 40-card build from that pool with named movements and copyable MTGA text; 46 cards is rejected.

- [x] T007 [US2] Reuse deterministic build recommendations and preserve a better existing deck in `src/deck-lab/analyze-deck.ts` and `tests/unit/deck-lab/analyze-deck.test.ts`.
- [x] T008 [US2] Display kept, added, removed and unused cards with basic lands and MTGA copy in `src/web/deck-lab.js` and `src/web/styles.css`.
- [x] T009 [US2] Cover the 45/46 boundary, proposal and 360 px journey in `tests/unit/deck-lab/analyze-deck.test.ts` and `tests/browser/deck-lab.spec.ts`.

## Phase 4: Integration and QA

- [x] T010 Verify existing navigation, tournament photo handling and the full test gates in `tests/integration/web-navigation-mobile-qa.test.ts`, `tests/browser/deck-lab.spec.ts`, and `specs/010-deck-lab/qa-evidence.md`.

## Dependencies

T001–T002 support both stories. US1 establishes the request and page; US2 adds build recommendations to the same analysis endpoint. T010 follows both stories.
