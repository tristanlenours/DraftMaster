# Implementation Plan: Shared deck engine

**Branch**: `codex/012-shared-deck-engine` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

## Summary
Keep evaluateDeck and recommendDeckBuilds as the only deterministic algorithms. Extract catalog-to-evaluation mapping into src/cards/evaluation-input.ts; use it from Solo, Deck Lab and multiplayer composition. Consume CoachContext.deckEvaluationOptions in Solo and multiplayer finalization. Remove Pimp-only fixed build constraints and update obsolete fixed-ratio tests/copy.

## Technical Context
TypeScript strict ESM, Node 24, Vitest and Playwright; existing dependencies only. No storage schema change. Scope: card preparation, cube options, adaptive Deck Lab build and public journey tests. Performance: at most 45 imported nonbasics and one recommender invocation; zero added network or catalog loading inside calculations. Same routes and keyboard/mobile structure.

## Constitution Check
Specification/clarification/design/checklist/tasks/analysis precede source changes. Follow-up linked to existing #86 with new-issue 403 disclosed. Red-green tests before correction. No new algorithm/formula or opaque model. Dedicated branch; PR/CI/human approval remain delivery gates. No human checklist auto-approval. Existing browser tests cover affected journeys; no claim to satisfy missing repository-wide Lighthouse evidence. Post-design: no new dependencies or constitution amendment.

## Structure and Design
- src/cards/evaluation-input.ts: pure exact MasterCatalogCard conversion with caller-owned instance id and color-identity fallback; no I/O or wrapper around evaluator.
- src/deck-lab/analyze-deck.ts: local parsing/validation/movements; existing default adaptive constraints with minimum 22; retain equally good complete input.
- src/solo-draft/solo-draft-session.ts: reuse conversion and all context options for human/bot evaluation and recommendation.
- scripts/serve-web.mjs: reuse conversion for multiplayer pool.
- src/multiplayer-draft/coordinator.ts: finalization validates the same context snapshot as recommendation before calculating/committing.
- Engines, external coach, journal and persistence implementation stay outside scope.

## Verification
Vertical slices: multiplayer parity and snapshot rejection; adaptive Pimp fixture; Solo/Rate public parity. Then complete quality gate and reference/replay. Disclose intentional score changes from corrected inputs. No new visual design.
