# Research: League-Relative Deck Calibration

## Decision 1: Calibrate tiers by league

**Decision**: A Deck Tier is relative to a `leagueId`. Arena Powered Cube and Nico's Vintage Candyshop use `powered_vintage`.

**Rationale**: These cubes support comparable high-powered deck expectations even though their card lists and archetypes differ. This makes cross-cube tier comparisons meaningful without erasing cube context.

**Alternatives considered**:

- Per-snapshot tiers: reproducible but too narrow for useful comparison.
- Universal tiers: simple but misrepresents decks from Pauper, Peasant, unpowered, and powered environments.
- Win-record tiers: rejected because match outcomes are noisy and the new A witness finished 0-3.

## Decision 2: Keep cube analysis below league calibration

**Decision**: League calibration maps internal deck evidence to the overall tier. Bomb thresholds, archetype affinities, synergy families, pacing, and card availability remain cube- and snapshot-specific.

**Rationale**: Two cubes can demand the same overall deck strength while rewarding different ways of achieving it.

**Alternatives considered**:

- Shared archetype profile across the league: rejected because it would invent unsupported synergies.
- Cube-specific overall tier thresholds: rejected because decks in the same league would no longer be comparable.

## Decision 3: Preserve continuous scores internally

**Decision**: Keep continuous axis and overall scores as deterministic internal evidence while exposing S/A/B/C/D as the product rating.

**Rationale**: Continuous values are needed for build ordering, threshold calibration, regression diagnosis, and model benchmarks. They do not need to be displayed to users.

**Alternatives considered**:

- Remove scores entirely: rejected because ordinal-only evaluation loses sensitivity and auditability.
- Add A+ as a tier: rejected because the user confirmed the existing tiers are sufficient; "A+" becomes an upper-A annotation.

## Decision 4: Use self-contained evaluation-only witnesses

**Decision**: Each real draft witness contains normalized card identity sufficient for offline inspection and complete evaluation inputs for its final deck. It records source hashes, extraction method, expert annotation, usage policy, and observed results without account or opponent identities.

**Rationale**: Tests must not depend on mutable Arena logs, the current local database, the network, or a regenerated evaluator output.

**Alternatives considered**:

- Store raw Arena logs: rejected for privacy, size, noise, and replay ambiguity.
- Resolve cards from the live master catalog during tests: rejected because catalog drift could rewrite the witness indirectly.
- Store only a decklist: rejected because it cannot benchmark draft advice or reconstruct pick context.

## Decision 5: Separate readiness from validity

**Decision**: A corpus with one valid witness may be used for regression, but league calibration remains `provisional` until every tier has three expert decks and each member cube has ten full draft witnesses and fifteen deck witnesses.

**Rationale**: The first witness is useful immediately, while the readiness label prevents overclaiming statistical coverage.

**Alternatives considered**:

- Reject incomplete corpora: rejected because it prevents incremental curation.
- Declare readiness after a fixed total regardless of distribution: rejected because it can leave entire tiers or cubes uncovered.

## Decision 6: Validate with the existing schema stack

**Decision**: Use strict versioned JSON Schema validation and immutable loaded values through a small coaching-domain loader.

**Rationale**: DraftMaster already uses this pattern for cards, cubes, and synergy profiles, so it adds no dependency and centralizes errors.

**Alternatives considered**:

- Test-only type assertions: rejected because they do not validate runtime data.
- A new validation library: rejected as unnecessary.
