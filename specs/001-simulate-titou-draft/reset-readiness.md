# Reset Readiness

## Status

**Pending human review and merge.** T001 remains incomplete and T002 must not start.

- Reset PR: [#67 — chore: reset legacy application](https://github.com/tristanlenours/DraftMaster/pull/67)
- Reset branch: `codex/reset-greenfield`
- Base commit: `1f50361`
- Data-preservation commit in the reset PR: `7adfa0d`
- Legacy-removal commit: `3b60302`
- Manifest: [`docs/reset/greenfield-reset.md`](https://github.com/tristanlenours/DraftMaster/blob/codex/reset-greenfield/docs/reset/greenfield-reset.md)

## Preserved before deletion

The normalized snapshot was first published on the feature branch in commit `28a35d9`, then carried into the reset PR as `7adfa0d`:

- 545 unique instances;
- 543 unique Scryfall printing IDs;
- 542 unique Oracle IDs;
- raw historical-response SHA-256 `7810d999d8c349a7fba56ea61dc0e479950d952bd3134337ffb07b983b616ee6`;
- canonical snapshot SHA-256 `289f6c4a27b39bc4f6f1816827ab2cca1198bbb88e495063dedcb176c18aba39`.

The snapshot excludes the empty maybeboard, the five separately configured basic lands, images, prices, ratings and card text. Its importer refuses a different raw response, revision, owner, board count or identity count.

## Reset manifest summary

The PR removes the legacy browser/Python entry points, generated Scryfall caches and obsolete generation scripts. It preserves Git history, `.specify/`, `.agents/`, `agent/`, `AGENTS.md`, `CONTEXT.md`, `docs/`, `skills-lock.json`, the normalized snapshot and its bootstrap importer. All removals remain recoverable from Git history.

## Evidence already collected

- `node --check scripts/import-historical-titou-snapshot.mjs`: passed;
- snapshot JSON parsing and independent count checks: passed;
- source indexes contiguous from 0 through 544: passed;
- legacy entry points absent from the reset branch tree: passed;
- `git diff --check`: passed;
- GitHub reports PR #67 as mergeable; no CI checks are currently configured on the reset baseline.

## Completion gate

After a human reviews and merges PR #67, reconcile `001-simulate-titou-draft` with updated `main`, rerun the checks above, record the merge commit here, then mark T001 complete. A merely open or approved PR is not proof of reconciliation.
