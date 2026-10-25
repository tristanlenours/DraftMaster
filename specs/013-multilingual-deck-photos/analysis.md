# Pre-implementation analysis — 2026-10-11

Spec, plan, tasks and constitution inspected after prerequisite validation. No unresolved functional ambiguity, conflicting intent, unmapped task or critical design finding.

| Requirement                       | Tasks               |
| --------------------------------- | ------------------- |
| FR-001 source-covered languages   | T004/T005           |
| FR-002 exact Unicode/ambiguity    | T005                |
| FR-003 counts and review          | T002/T006/T007      |
| FR-004 retained fixtures          | T003/T007/T008      |
| FR-005 explicit provenance import | T004                |
| FR-006 existing journeys          | T006/T008/T009      |
| SC-001/002                        | T002/T004/T005/T007 |
| SC-003                            | T003/T008           |
| SC-004                            | T009/T010           |

Coverage: 10/10 requirements/success criteria; 10 tasks. Zero unresolved ambiguities, duplications or critical spec conflicts. Delivery limitation: remote issue creation returns 403; originating #88/#86 are linked and dedicated issue/PR/CI delivery remains unverified. Custom release checklist stays unchecked for human review; no approval is asserted. Source changes are authorized by the user's feature request.

Red feedback loop: `npx vitest run tests/unit/tournaments/deck-photo-service-fallback.test.ts` — 5 existing tests pass, both retained photo title replays fail with 11 unresolved French titles, including Remue-méninges and Précepteur vampirique. Fixture hashes already pass. Smallest symptom: a single Remue-méninges title is absent from exact catalog resolution.

Ranked hypotheses: (1) missing local translations, predicts intact French titles still rejected; (2) ASCII-only normalization, predicts unrelated CJK aliases collapse to an empty key once introduced; (3) vision crop/read errors, predicts mismatched transcription rather than rejection of correct titles. The red replay demonstrates (1); Unicode/collision regressions address (2). Live vision quality remains separate evidence for (3).

## Crop follow-up analysis

FR-007 -> T011 and recorded plan step 6. No conflict with the conservative grounding or existing bounds. On the second original image the annotated Serum Visions title ribbon crosses both old crop boundaries; the actual browser/canvas regression fails with “The complete Serum Visions title must fit within at least one uploaded region”. This reproduces a second, independent limitation seen in live OCR. Increase overlap before repeating the live check. The manifest was corrected after upright image inspection; Brainstorm is not visible and is exercised only in synthetic language-resolution tests.

## Post-implementation review

The complete official title “Il était une fois...” resolves through its literal alias before the truncation guard. Both reviewers rechecked their fixes: source-use metadata is explicit and exact-name resolution satisfies FR-001/FR-002, including deliberate collisions. Per-photo expectations exclude the clipped Archon title in photo 1. FR-007 is covered by the real canvas bounds assertion and two opt-in live checks. Remaining delivery gates are tracked in qa-evidence.md; reviewer-owned checklist remains unchecked.

## English/French scope correction

User clarification supersedes the earlier all-language requirement. FR-001/005/006, SC-002 and plan now cover English/French only before implementation changes. Three red regressions reproduce the wider importer/cache scope; 23 targeted checks pass after the French-only restriction. 771/771 retained source aliases resolve. Source and face identities, conservative counts, exact matching, photo hashes, crop bounds and human review remain consistent with the unchanged requirements.
