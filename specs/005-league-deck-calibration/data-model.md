# Data Model: League-Relative Deck Calibration

## LeagueCalibration

- `leagueId`: stable lowercase identifier such as `powered_vintage`
- `calibrationVersion`: immutable version identifier
- `status`: `provisional` or `ready`
- `memberCubes`: cube keys permitted to claim this calibration
- `tierThresholds`: ordered inclusive lower bounds for S, A, B, and C; lower values are D
- `readinessPolicy`: minimum witness coverage per tier and member cube
- `evidenceCounts`: observed coverage used to derive current status

### Validation

- Thresholds are finite, within 0-100, and strictly descending S > A > B > C.
- `ready` is invalid unless every readiness-policy minimum is met.
- A cube context is invalid when its cube is not a member of the selected league.

## CubeEvaluationContext

- `cubeKey`: stable cube identity
- `cubeSnapshotId`: immutable snapshot identity
- `leagueId`: league assigned to that snapshot
- `bombThreshold`: cube-snapshot power cutoff
- `synergyProfile`: cube-snapshot archetype evidence

### Relationships

- Exactly one LeagueCalibration is selected for an evaluation.
- The context's `leagueId` matches the calibration's `leagueId`.
- The context's `cubeKey` belongs to `memberCubes`.
- Snapshot-specific evidence never migrates implicitly when a newer snapshot is published.

## LeagueWitnessCorpus

- `schemaVersion`: document schema version
- `corpusId`: immutable corpus identity
- `corpusVersion`: immutable content version
- `leagueCalibration`: embedded calibration identity and readiness state
- `cubes`: member-cube snapshot declarations
- `draftWitnesses`: complete draft evidence or references to immutable witness documents
- `deckWitnesses`: expert deck annotations
- `provenance`: creation timestamp, method, and source hashes
- `usagePolicy`: `evaluation_only`, `calibration_eligible`, or `training_allowed`

### Validation

- All referenced witness identifiers are unique.
- Every witness league, cube, and snapshot resolves inside the corpus.
- Every deck card resolves from embedded evaluation data.
- Evaluation-only witnesses cannot declare `training_allowed`.
- No account identifier or opponent display-name field is accepted.

## DraftWitness

- `draftId`: source draft identity
- `source`: provider and event identifier
- `startedAt`: normalized timestamp
- `leagueId`, `cubeKey`, `cubeSnapshotId`
- `picks`: 45 chronological pack/pick records with offered card IDs, selected card, and source scores when observed
- `poolCardIds`: 45 drafted identities
- `finalDeckCardIds`: exact multiset of 40 cards
- `sideboardCardIds`: remaining drafted cards not represented as basic-land additions
- `cardIdentities`: stable names for all offered and drafted Arena IDs
- `deckEvaluationCards`: self-contained normalized evaluation inputs for all 40 final-deck cards
- `observedResults`: aggregate wins/losses and count, without player identities
- `provenance`: hashes of the source snapshots used for extraction

### Validation

- Picks are ordered P1P1 through P3P15 with decreasing pack sizes per pack.
- Each selected card belongs to its offered pack.
- The 45 selected cards equal the final pool before basic-land additions.
- The final deck has exactly 40 entries after quantities are expanded.
- Opponent and account identity fields are forbidden.

## DeckWitness

- `deckWitnessId`: immutable witness identity
- `draftId`: optional source draft relationship
- `expectedTier`: S, A, B, C, or D
- `tierPlacement`: `lower`, `middle`, or `upper`
- `annotation`: author role, date, rationale, strengths, weaknesses, and confidence
- `hasPowerNine`: audited boolean
- `observedResult`: optional contextual record
- `usagePolicy`: permitted purpose

### State transitions

- `candidate` → `reviewed`: expert tier and rationale supplied.
- `reviewed` → `locked`: provenance and structural validation pass.
- A locked witness is never overwritten; a changed annotation creates a new corpus version.
- LeagueCalibration moves `provisional` → `ready` only when its readiness policy passes.
