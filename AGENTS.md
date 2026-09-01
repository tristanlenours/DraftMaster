# Repository Guidelines

## Project Structure & Module Organization

DraftMaster is a dependency-free browser application with a small Python server. `index.html` contains the page shell and loads `js/` scripts in dependency order. Feature modules such as `draft_engine.js`, `deckbuilder.js`, and `tournament_swiss.js` own workflows; `app.js` coordinates routing and UI events. Styling lives in `css/style.css`. Generated catalogs and caches live in `js/cubes_static_db.js` and `data/`. Root Python files provide the server, card evaluation, and draft simulation; supporting utilities are in `scripts/`. `agent/` and `.agents/` are agent tooling, not runtime code.

## Build, Test, and Development Commands

- `python server.py` — serve the SPA at `http://localhost:8080` with history routing and the optional Slack relay.
- `python test_draft_simulation.py` — run the draft/deck simulation smoke test.
- `python evaluate_card_tier.py "Novice Inspector"` — exercise card lookup and tier evaluation.
- `python -m compileall server.py evaluate_card_tier.py test_draft_simulation.py scripts` — catch Python syntax errors.

There is no package manager or build step. Directly opening `index.html` supports most UI checks; use the server for routed URLs and Slack behavior. Data scripts may call external APIs and rewrite catalogs, so read their docstrings first.

## Coding Style & Naming Conventions

Use four spaces in Python and two in JavaScript/CSS. Follow existing names: `snake_case` for Python functions and utility filenames, `camelCase` for JavaScript methods/variables, `PascalCase` for classes, and kebab-case for CSS classes and HTML IDs. Keep browser code framework-free and compatible with global-script loading. No formatter or linter is configured; match surrounding punctuation and brace style. Preserve UTF-8 because user-facing text is primarily French.

## Testing Guidelines

No test framework or coverage threshold is configured. Treat `test_draft_simulation.py` as a smoke test, then manually verify affected routes and local-storage flows in a modern browser. Check UI changes at desktop and mobile widths. Add focused assertions when changing draft scoring, deck construction, or tournament calculations.

## Commit & Pull Request Guidelines

This checkout has no Git history from which to infer conventions. Use concise, imperative Conventional Commit subjects, for example `fix: preserve pack rotation in round two`. Keep commits focused. Pull requests should explain behavior changes, list verification commands and routes, link the relevant issue/specification, and include before/after screenshots for visible UI work. Call out regenerated files and external-data sources explicitly.

## Security & Configuration

Copy `.env.example` to `.env` for local settings. Never commit real Slack webhook URLs or other secrets. Keep `.env`, caches, and generated data changes out of unrelated patches.
