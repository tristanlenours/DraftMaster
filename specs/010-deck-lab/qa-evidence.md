# QA evidence

## Automated results (2026-09-24)

- `npm run check` — passed end to end with Chromium launch authorized and Supabase environment values set to blank for offline execution. This includes format, lint, types, card facts, synergy profiles, coach data, tests, coverage, report verification, and browser journeys.
- Vitest: 109 files passed, 700 tests passed, 1 skipped. V8 coverage: 84.33% statements and 72.08% branches across the repository. Coverage is diagnostic, not an acceptance substitute.
- Playwright: 43 Chromium journeys passed. Five Deck Lab journeys cover desktop navigation, mobile drawer at 360 px, rating, distinct Pimp changes and copied final deck, French basic land display, provenance, cube coverage warnings and photo correction. The existing tournament photo journey also passed.
- `git diff --check` — passed after the final code change.

## Review and release limits

- The full Spec Kit artifacts and issue were completed after initial implementation; [plan.md](plan.md) discloses this ordering gap for reviewer judgment.
- Human review of photo recognition on representative images, recommendation quality on real 45-card pools, and a smoke test of a deployed instance remain.
- The initial Standards + Spec review found missing score audit/provenance and ambiguous Pimp card movements; these were corrected and verified with focused unit and browser regressions. Remote CI, follow-up review, and human PR approval remain separate gates until recorded as passed.
