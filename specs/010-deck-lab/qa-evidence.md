# QA evidence

## Automated results (2026-09-24)

- `npm run format:check`, `npm run lint`, `npm run typecheck`, and `git diff --check` — passed after the final code change.
- `npm run cards:facts:verify`, `npm run synergy:profiles:verify`, `npm run coach:data:verify`, and `npm run reports:verify` — passed in the full quality command.
- `npm run test` — 109 files passed, 699 tests passed, 1 skipped, with Supabase environment values set to blank for offline execution.
- `npm run test:coverage` — 109 files passed; 84.31% statements and 72.06% branches across the repository. Coverage is diagnostic, not an acceptance substitute.
- `npx playwright test` — 42 Chromium journeys passed. Four Deck Lab journeys cover desktop navigation, mobile drawer at 360 px, rating, proposal, French basic land display, cube coverage warnings and photo correction. The existing tournament photo journey also passed.
- `npm run check` passed through report verification. Its final browser stage could not launch Chromium in the local sandbox, so the approved `npx playwright test` command was run separately and passed. An earlier run also exposed two existing auth-test timeouts caused by `.env` Supabase credentials; rerunning the suite with blank process values passed.

## Review and release limits

- The full Spec Kit artifacts and issue were completed after initial implementation; [plan.md](plan.md) discloses this ordering gap for reviewer judgment.
- Human review of photo recognition on representative images, recommendation quality on real 45-card pools, and a smoke test of a deployed instance remain.
- Required remote CI, Standards + Spec review, and human PR approval are separate delivery gates until recorded as passed.
