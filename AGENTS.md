# Repository Guidelines

## Project Structure & Module Organization

DraftMaster is restarting from a greenfield baseline. Product vocabulary lives in `CONTEXT.md`; binding quality and delivery rules live in `.specify/memory/constitution.md`. Keep feature artifacts under `specs/<feature>/` and durable research or decisions under `docs/`. The preserved Titou snapshot is in `data/cubes/titou_tribal/`; its explicit bootstrap importer is `scripts/import-historical-titou-snapshot.mjs`. Future TypeScript source and tests must follow the structure approved by the active feature plan, normally `src/` and `tests/`.

## Build, Test, and Development Commands

The TypeScript runtime on Node.js 24 LTS and npm is active. Available scripts:

- `npm run check` — execute the complete quality gate: Prettier format check, ESLint, `tsc --noEmit`, Vitest test suite, and V8 coverage.
- `npm run test` — run Vitest test suite.
- `npm run test:coverage` — run Vitest test suite with V8 code coverage.
- `npm run test:reference` — verify non-regression against the locked reference draft fixture (seed 42).
- `npm run test:replay` — verify determinism, replay contract, and state reconstruction from journals.
- `npm run test:audit` — independent draft report audit verifying full card and pick traceability without internal engine helpers.
- `npm run test:domain-errors` — verify domain error contracts, atomicity, and rejection without mutation.
- `npm run test:e2e` — end-to-end CLI execution, pure stdout JSON, structured stderr, and offline exit codes (0, 2, 3, 4, 5).
- `npm run test:performance` — isolated SC-006 performance benchmark running 3 warmups + 5 fresh sessions under 2 000 ms.
- `npm run cube:validate -- --file <path>` — validate cube snapshot schema (Draft 2020-12) and canonical RFC 8785 SHA-256 integrity.
- `npm --silent run simulate -- --seed 42` — run the headless draft simulator CLI.
- `npm run format` / `npm run format:check` — format / verify formatting across source, tests, config, and `.github/workflows/`.
- `npm run lint` — lint source and tests with ESLint.
- `npm run typecheck` — TypeScript typecheck with `tsc --noEmit`.
- `node --check scripts/import-historical-titou-snapshot.mjs` — syntax-check the preserved importer.
- `node scripts/import-historical-titou-snapshot.mjs` — explicitly reproduce the locked historical snapshot; this requires network access and rejects source drift.
- `git diff --check` — detect whitespace errors before committing.

## Coding Style & Naming Conventions

Follow the active feature plan and nearby code. TypeScript uses strict ESM, two-space indentation, `camelCase` values/functions, `PascalCase` types, and kebab-case filenames. Prefer immutable values, explicit inputs, typed errors, and small I/O adapters around a deterministic domain engine. Preserve UTF-8.

## Testing Guidelines

Domain behavior follows red-green-refactor. Cover every invariant, boundary, rejection-without-mutation path, and regression with focused tests. Add integration or end-to-end coverage for critical journeys. Coverage is diagnostic; passing percentages never replace behavioral evidence. Record required proof in the feature’s `qa-evidence.md` and leave human approval steps to the reviewer.

## Commit & Pull Request Guidelines

Use concise Conventional Commit subjects, such as `test(draft): reject duplicate seat decisions`. Keep commits focused. Pull requests must link their issue and specification, explain trade-offs and remaining risks, and list verification evidence. Required CI, Standards + Spec review, and human approval must pass before merge.

## Domain and Issue Tracking

Read `docs/agents/domain.md` before changing domain behavior. Use GitHub Issues according to `docs/agents/issue-tracker.md` and the labels in `docs/agents/triage-labels.md`.
