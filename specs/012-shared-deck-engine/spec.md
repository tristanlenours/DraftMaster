# Feature Specification: Shared draft and Deck Lab engine

**Branch**: `codex/012-shared-deck-engine` | **Created**: 2026-09-30
**Tracking**: follow-up to [#86](https://github.com/tristanlenours/DraftMaster/issues/86).
New issue creation was attempted before implementation but denied by connector permissions (403). No claim that closed #86 was reopened.
**Input**: Reuse the draft evaluation and build engines for Rate my Deck and Pimp my Deck without duplicating rules.

## User Scenarios & Testing

### US1 — Consistent evaluation (P1)
A player receives the same evaluation for the same deck and cube context in the draft and Rate my Deck.
Acceptance: identical card facts, snapshot, formula and options produce identical score, five axes and scoring evidence, ignoring journey-specific instance identifiers. Recommendation and finalization in multiplayer retain the same context; a different snapshot is rejected without mutation.

### US2 — Consistent construction (P1)
A player gives Pimp a pool and receives the draft's deterministic adaptive build, with its existing keep/add/remove presentation.
Acceptance: the same pool and context produce the same best local candidate; 40-card input is retained if it scores at least as well. No fixed 23/17 constraint is imposed. Builds use submitted nonbasics and freely allocated basics; imports, 45-card limit and unknown-card rejection remain.

## Clarifications — 2026-09-30

- User explicitly selected adaptive construction identical to the draft, replacing the Deck Lab-only 23/17 requirement in feature 010.
- Public test interfaces are Deck Lab analysis, Solo evaluation/recommendation and multiplayer finalization, as agreed in the preceding parity proposal and authorized with “ok, go”.
- Existing draft engines remain authoritative. No new scoring formula, opaque build model or generic application framework.
- Cube coverage fallback remains disclosed; parity requires identical available context and cannot be promised between full and degraded contexts.

## Requirements

- FR-001: Shared catalog facts include mana cost, color identity fallback, roles, producing colors, oracle text and archetype-relevant identity.
- FR-002: All three journeys consume the verified cube evaluation options; snapshot mismatches reject before persisting a result.
- FR-003: Pimp uses draft adaptive constraints and accepts pools with the existing engine's minimum of 22 true nonlands. It retains a better complete input without forcing 23/17.
- FR-004: Unknown analyzed names reject; reduced coverage, virtual Rate basics, provenance and movement/export semantics remain disclosed.
- FR-005: No submitted Deck Lab state is persisted. Existing offline reference/replay and deterministic calculation behavior remain protected.

## Edge Cases

22 nonlands; modal spell/land cards; colorless cards with colored identity; unknown cards; 46 nonbasics; full/basic/catalog-only coverage; wrong snapshot at multiplayer finalization; recommendation already optimal.

## Success Criteria

SC-001: Public journey parity tests reproduce evaluation/context divergences before correction and pass afterward.
SC-002: Pimp matches the local draft build for an adaptive fixture and returns 40 cards with complete movements and export.
SC-003: Affected tests, reference/replay, quality and browser gates pass, with unexecuted or failing gates explicitly recorded.
SC-004: Mobile/keyboard presentation is unchanged; existing 360 px browser journeys remain valid. No new external per-card requests or runtime dependencies.

Gate qualification acceptance: unchanged multiplayer polling responses retain the focused deck-card control so Enter still edits the selection. Browser scenarios with mocked multiplayer APIs isolate optional external assets/services while exercising the local UI, polling, clipboard and exports. Dependency vulnerability checks remain enabled.

## Key Entities

Catalog card facts; cube evaluation context; pool; proposed build; deck evaluation. Existing types remain the domain model.
