# Reset Readiness

## Status

**Complete.** PR #67 was human-merged on 2026-09-04 and the feature branch was reconciled by fast-forward. T002 may start.

- Reset PR: [#67 — chore: reset legacy application](https://github.com/tristanlenours/DraftMaster/pull/67)
- Reset branch: `codex/reset-greenfield`
- Base commit: `1f50361`
- Data-preservation commit in the reset PR: `7adfa0d`
- Legacy-removal commit: `3b60302`
- Merge commit: `8abe088cadc4929c5c3c61a032408ca2e3d1ef6c`
- Manifest: [`docs/reset/greenfield-reset.md`](https://github.com/tristanlenours/DraftMaster/blob/main/docs/reset/greenfield-reset.md)

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
- PR #67 human-merged into `main`: passed;
- feature branch HEAD equals `origin/main` at merge commit `8abe088`: passed;
- post-merge snapshot counts, contiguous indexes, importer syntax and legacy-entry-point absence: passed;
- no CI checks were configured on the reset baseline; this limitation is addressed by T005.

## Completion gate

The gate is satisfied. Any later divergence from the reset manifest or snapshot integrity must fail the relevant setup/data task before domain implementation continues.
