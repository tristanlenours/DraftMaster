# Greenfield Reset Manifest

## Purpose

This reset removes the browser/Python prototype after preserving its only required runtime datum: the normalized Titou cube snapshot. It leaves a documentation-and-data baseline for the TypeScript draft engine. Every removed file remains recoverable from commit `1f50361` and earlier Git history.

## Preserved

- Git history and repository configuration: `.gitignore`;
- agent and Spec Kit tooling: `.agents/`, `agent/`, `.specify/`, `skills-lock.json`;
- governance and domain sources: `AGENTS.md`, `CONTEXT.md`, `docs/`;
- normalized cube data: `data/cubes/titou_tribal/2026-02-24.1.json` and its README;
- reproducibility helper: `scripts/import-historical-titou-snapshot.mjs`.

## Removed

- browser application: `index.html`, `manifest.json`, `css/`, `js/`;
- Python server, evaluator and smoke simulation: `server.py`, `evaluate_card_tier.py`, `test_draft_simulation.py`;
- generated Scryfall caches: `data/scryfall_cards_cache.json`, `data/scryfall_direct_images.json`;
- legacy data-generation and inspection scripts, except the preserved historical importer;
- obsolete root specification: `SPECIFICATIONS_SOLO_CHALLENGE.md` (its Spec Kit archive remains under `docs/legacy/`);
- Slack-oriented `.env.example` and the legacy application README.

## Verification

The reset is acceptable when:

1. no legacy runtime entry point remains in the resulting tree;
2. the snapshot parses and contains 545 unique instances, 543 printing IDs and 542 Oracle IDs;
3. the bootstrap importer passes `node --check`;
4. constitution, context, agent guidance, research and archived specifications remain tracked;
5. the PR diff matches this manifest and receives human approval before merge.

The reset introduces no replacement runtime and does not claim that draft-engine tests pass. Implementation begins only after the feature branch is reconciled with the merged reset.
