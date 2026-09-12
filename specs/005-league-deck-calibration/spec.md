# Feature Specification: League-Relative Deck Calibration

**Feature Branch**: `005-league-deck-calibration`

**Issue**: [#70](https://github.com/tristanlenours/DraftMaster/issues/70)

**Created**: 2026-09-12

**Status**: Draft

**Input**: User description: "Constituer des corpus témoins de drafts et decks par ligue de cubes, importer le draft Arena Powered du 11 septembre 2026, et évaluer les tiers de deck relativement à leur ligue."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare decks within a cube league (Priority: P1)

As a cube player, I want a deck tier to be calibrated against cubes of comparable power so that an A-tier deck means the same thing in Arena Powered Cube and Nico's Vintage Candyshop even though their card lists and archetypes differ.

**Why this priority**: A tier without a comparison population is misleading and cannot support trustworthy deck reviews or model benchmarks.

**Independent Test**: Review two witness decks from different cubes assigned to the same league and verify that both are evaluated against the same league tier contract while retaining their own cube context.

**Acceptance Scenarios**:

1. **Given** two cube snapshots in the `powered_vintage` league, **When** their decks are evaluated, **Then** the reported overall tiers use the same league calibration.
2. **Given** two cubes in the same league with different archetypes, **When** their decks are evaluated, **Then** synergy evidence remains specific to each source cube and snapshot.
3. **Given** decks from different leagues, **When** their tiers are shown, **Then** the system does not present them as directly comparable without identifying their leagues.

---

### User Story 2 - Preserve an expert witness from a real draft (Priority: P2)

As the curator, I want the Arena Powered draft played on 11 September 2026 preserved as an anonymized witness so that draft advice, final build quality, and deck-tier changes can be checked against real evidence.

**Why this priority**: The draft is a high-quality, coherent deck without Power Nine and is useful precisely because its observed 0-3 result must not determine its expert deck-quality label.

**Independent Test**: Load the preserved witness without network access or local Arena files and verify its 45 ordered picks, complete pool, final 40-card build, sideboard, source provenance, observed result, and expert tier A.

**Acceptance Scenarios**:

1. **Given** the preserved Arena draft, **When** it is loaded, **Then** all 45 picks and their offered cards are available in chronological order.
2. **Given** the final deck, **When** its contents are verified, **Then** it contains exactly 40 cards, contains no Power Nine card, and resolves every card without an external catalog.
3. **Given** the observed 0-3 result, **When** the expected deck tier is read, **Then** it remains A and records that the result is contextual evidence rather than its quality label.
4. **Given** the expert description "A or A+", **When** it is encoded, **Then** the canonical tier is A with an upper-tier placement note rather than a new A+ tier.

---

### User Story 3 - Keep witnesses independent and auditable (Priority: P3)

As a maintainer, I want witness corpora to remain immutable, versioned, and separate from training inputs so that evaluator regressions and model comparisons cannot pass by learning their expected answers.

**Why this priority**: A witness that is regenerated from the evaluator or reused for tuning ceases to be independent evidence.

**Independent Test**: Verify corpus identity, source hashes, annotation provenance, evaluation purpose, and that existing deterministic draft references retain their original role.

**Acceptance Scenarios**:

1. **Given** a witness corpus, **When** its manifest is inspected, **Then** every deck identifies its league, cube, snapshot, source, annotation, and permitted use.
2. **Given** a corpus marked as evaluation-only, **When** benchmark or calibration inputs are selected, **Then** it is excluded from training and tuning inputs.
3. **Given** the Titou Tribal seed-42 reference draft, **When** league corpora are introduced, **Then** its determinism and replay guarantees remain unchanged and it is not treated as an expert deck-quality witness.

### Edge Cases

- A cube changes league between two snapshots; each witness retains the league attached to its source snapshot.
- A deck has a result but no full draft journal; it may be a deck witness but not a draft witness.
- A draft has complete picks but no expert deck annotation; it may test reconstruction but cannot calibrate a tier.
- A card is absent from the current project catalog; the witness still remains self-contained and resolvable.
- A league has too few witnesses or lacks coverage for one or more tiers; its calibration remains provisional.
- Two expert annotations disagree; the disagreement and its provenance are retained instead of silently averaging labels.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST identify the comparison league used for every deck tier.
- **FR-002**: The `powered_vintage` league MUST include Arena Powered Cube and Nico's Vintage Candyshop while allowing each cube to retain independent snapshots and archetype evidence.
- **FR-003**: Overall deck tiers MUST use the values S, A, B, C, and D relative to the source snapshot's league.
- **FR-004**: The system MUST NOT add A+ as a canonical tier; an expert may identify a deck as high within tier A through supporting annotation.
- **FR-005**: Card power evaluations MUST remain independent from league-relative deck tiers.
- **FR-006**: Every Deck témoin MUST identify its league, cube, source snapshot, complete final deck, expected tier, annotation provenance, and evidence.
- **FR-007**: Every full draft witness MUST preserve ordered picks, offered cards, selected cards, final pool, final deck, and available observed results.
- **FR-008**: Witness data MUST be sufficient to load and evaluate the case without network access, mutable local Arena files, or an external card catalog.
- **FR-009**: Personal account identifiers and opponent names MUST be removed from preserved witnesses.
- **FR-010**: Observed match results MUST be recorded separately from expert deck-quality labels and MUST NOT determine the expected tier by themselves.
- **FR-011**: The Arena Powered draft `bc4cdb9d-6412-43a1-84a2-d66b5dbed559` MUST be preserved as a 45-pick draft witness and an A-tier Deck témoin in the `powered_vintage` league.
- **FR-012**: Witnesses MUST identify whether they are reserved for evaluation, eligible for calibration, or permitted for training; evaluation-only witnesses MUST NOT be used for tuning.
- **FR-013**: Every corpus and annotation change MUST be versioned and retain source and generation provenance.
- **FR-014**: A league calibration MUST remain provisional until each tier has at least three expert Decks témoins and each member cube has at least ten full draft witnesses and fifteen deck witnesses.
- **FR-015**: The existing Titou Tribal seed-42 reference MUST remain a deterministic engine and replay witness rather than an expert deck-tier witness.
- **FR-016**: Every derived evaluation MUST identify the evaluation version and the league calibration version used.
- **FR-017**: A witness MUST fail validation when card counts, pick order, league membership, provenance, or expected-tier values are invalid.

### Key Entities

- **Ligue de cubes**: A named comparison population for deck tiers, containing one or more cube snapshots with broadly comparable power expectations.
- **Cube profile**: Cube- and snapshot-specific evidence describing available cards, archetypes, pacing, and synergy expectations.
- **Deck témoin**: An expert-reviewed final deck with a league-relative expected tier and preserved evidence.
- **Draft witness**: An anonymized, chronological record of a real or simulated draft sufficient to reconstruct its choices and final build.
- **Corpus témoin de ligue**: A versioned collection of witnesses grouped by league and retaining cube and snapshot provenance.
- **League calibration**: The versioned mapping that interprets deck-evaluation evidence as league-relative tiers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Arena Powered witness loads with 45 ordered picks, 45 distinct drafted cards, a 40-card final deck, and complete card resolution without network access.
- **SC-002**: The Arena Powered witness reports expected tier A, upper placement within that tier, no Power Nine, and observed result 0-3 as separate facts.
- **SC-003**: 100% of witness records identify league, cube, snapshot, source provenance, annotation provenance, permitted use, and corpus version.
- **SC-004**: No preserved witness contains an Arena account identifier or opponent display name.
- **SC-005**: Evaluating the same deck and versions repeatedly produces the same tier and audit evidence.
- **SC-006**: Decks from Arena Powered Cube and Nico's Vintage Candyshop can be compared under one identified `powered_vintage` calibration without sharing cube-specific synergy assumptions.
- **SC-007**: The existing seed-42 functional digest, 45 rounds, 360 picks, final pools, and replay checks remain unchanged.
- **SC-008**: A calibration cannot be reported as ready unless all five tiers have at least three expert witnesses and every member cube meets its required draft and deck witness counts.

## Assumptions

- The first imported corpus is intentionally incomplete and therefore has provisional calibration status.
- The user's expert assessment is the authoritative initial annotation for the 11 September Arena deck.
- "A+" means high placement inside tier A, not a separate canonical tier.
- Arena Powered Cube and Nico's Vintage Candyshop belong to the `powered_vintage` league.
- Historical 17Lands trophy decks remain candidate witnesses until their exact cube and snapshot provenance is established.
- Witness corpora are held out from training and prompt tuning by default.
