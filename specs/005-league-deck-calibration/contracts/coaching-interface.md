# Coaching Interface Contract

## Public seam

```ts
evaluateDeck(
  deck: readonly CardEvaluationInput[],
  options: {
    leagueCalibration?: LeagueCalibration;
    cubeContext?: CubeEvaluationContext;
    bombThreshold?: number;
    synergyProfile?: DeckSynergyProfile;
  },
): DeckEvaluation
```

## Required behavior

- Existing callers without league context retain deterministic legacy tier behavior.
- When league context is supplied, `overallTier` uses that exact calibration.
- Cube-specific bomb and synergy evidence is evaluated before league classification.
- `DeckEvaluation.audit` identifies `formulaVersion`, `leagueId`, `calibrationVersion`, `calibrationStatus`, `cubeKey`, and `cubeSnapshotId` when supplied.
- Mismatched league, cube membership, or calibration thresholds fail explicitly; they never fall back silently.
- `overallScore` and five axis scores remain available internally for sorting and audit.
- `radarTiers` retain their existing semantics in this feature; only the overall Deck Tier becomes league-relative.

## Witness corpus seam

```ts
validateLeagueWitnessCorpusJson(rawJson: string): WitnessCorpusResult<LeagueWitnessCorpus>
```

- Invalid JSON, unsupported schema versions, incomplete card resolution, privacy-forbidden fields, and inconsistent counts return typed failures.
- Successful documents are deeply immutable.
- Validation never writes or regenerates a witness.
