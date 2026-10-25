# Tasks: Multilingual deck photos

## Phase 1: Setup

- [x] T001 Create dedicated branch and spec/clarifications/plan/checklists with issue link in specs/013-multilingual-deck-photos/.

## Phase 2: Reproduce

- [x] T002 [US1] Add red regression through Gemini response boundary in tests/unit/tournaments/deck-photo-service-fallback.test.ts using source-visible titles.
- [x] T003 [US2] Preserve photos and hash/expectation manifest in tests/fixtures/deck-photos/nico-candyshop/.

## Phase 3: US1 — Multilingual resolution

- [x] T004 [US1] Test and implement bounded paginated source import in src/cards/import-printed-names.ts and scripts/import-printed-card-names.mjs; generate data/cards/printed-names.json.
- [x] T005 [US1] Test Unicode/collision/face/provenance resolution and update src/tournaments/deck-photo-recognition.ts and tests/unit/tournaments/deck-photo-recognition.test.ts.
- [x] T006 [US1] Preserve region counts and translated basics and limit the language prompt to English and French in src/tournaments/deck-photo-recognition.ts.

## Phase 4: US2 — Photo regression corpus

- [x] T007 [US2] Replay visible titles with actual fixture bytes and verify hashes in tests/unit/tournaments/deck-photo-service-fallback.test.ts.
- [x] T008 [US2] Exercise each actual photo through browser cropping and keyboard review in tests/browser/deck-lab.spec.ts, documenting mobile/desktop evidence.

## Phase 5: Verification and delivery

- [x] T011 [US1] Reproduce the split title ribbon from photo 1000019032.jpg in tests/browser/deck-lab.spec.ts, then adjust overlap in src/web/deck-photo-upload.js and rerun live anchor checks in tests/integration/nico-photo-live-ocr.test.ts. FR-007 follow-up precedes final verification.
- [x] T009 Run quality, HTTP, reference/replay and browser checks and record results in specs/013-multilingual-deck-photos/qa-evidence.md.
- [x] T010 Run Standards + Spec review and convergence; record delivery status in specs/013-multilingual-deck-photos/qa-evidence.md and pull-request.md.

## Dependencies and execution

T001 -> T002/T003 -> T004 -> T005/T006 -> T007/T008 -> T009/T010. Independent fixture inspection and source research can proceed together; edits to the recognizer stay sequential. US1 MVP is exact alias resolution; US2 adds persistent images and browser evidence. Custom checklist remains reviewer-owned; the user's request authorizes implementation, not self-approval or merge.

## Phase 6: Gate follow-up

- [x] T012 Update only the vulnerable transitive source-map-js lock entry to 1.2.2 within its existing range and verify npm audit (Constitution IV, required Security gate).

## Phase 7: English/French scope correction

- [x] T013 Restrict source requests, cache, loader and prompts to English/French per user clarification; preserve photo corpus, verify scoped regressions and record updated reviews/convergence/quality evidence. [FR-001, FR-005, FR-006]

## Phase 8: User-requested whole-deck verification

- [x] T014 Run actual vision on both retained photos; record returned identities/counts, exclude confirmed companion Lutri, retain tentative 5 Island/4 Swamp report and strengthen the live test beyond four anchors. Record the failed 40-card audit in qa-evidence.md with sanitized observations. Verification is complete; complete 40-card recognition remains an unresolved acceptance gap.
