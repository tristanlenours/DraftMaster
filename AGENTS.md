# Repository Guidelines

## Project Structure & Module Organization

DraftMaster is restarting from a greenfield baseline. Product vocabulary lives in `CONTEXT.md`; binding quality and delivery rules live in `.specify/memory/constitution.md`. Keep feature artifacts under `specs/<feature>/` and durable research or decisions under `docs/`. The preserved Titou snapshot is in `data/cubes/titou_tribal/`; its explicit bootstrap importer is `scripts/import-historical-titou-snapshot.mjs`. Future TypeScript source and tests must follow the structure approved by the active feature plan, normally `src/` and `tests/`.

## Build, Test, and Development Commands

There is currently no application runtime or package manifest on the reset baseline. Do not document commands before they exist.

- `node --check scripts/import-historical-titou-snapshot.mjs` — syntax-check the preserved importer.
- `node scripts/import-historical-titou-snapshot.mjs` — explicitly reproduce the locked historical snapshot; this requires network access and rejects source drift.
- `git diff --check` — detect whitespace errors before committing.

Use the commands defined in the active `package.json` once the TypeScript foundation is merged.

## Coding Style & Naming Conventions

Follow the active feature plan and nearby code. TypeScript uses strict ESM, two-space indentation, `camelCase` values/functions, `PascalCase` types, and kebab-case filenames. Prefer immutable values, explicit inputs, typed errors, and small I/O adapters around a deterministic domain engine. Preserve UTF-8.

## Testing Guidelines

Domain behavior follows red-green-refactor. Cover every invariant, boundary, rejection-without-mutation path, and regression with focused tests. Add integration or end-to-end coverage for critical journeys. Coverage is diagnostic; passing percentages never replace behavioral evidence. Record required proof in the feature’s `qa-evidence.md` and leave human approval steps to the reviewer.

## Commit & Pull Request Guidelines

Use concise Conventional Commit subjects, such as `test(draft): reject duplicate seat decisions`. Keep commits focused. Pull requests must link their issue and specification, explain trade-offs and remaining risks, and list verification evidence. Required CI, Standards + Spec review, and human approval must pass before merge.

## Domain and Issue Tracking

Read `docs/agents/domain.md` before changing domain behavior. Use GitHub Issues according to `docs/agents/issue-tracker.md` and the labels in `docs/agents/triage-labels.md`.
