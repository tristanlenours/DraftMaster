# Validation guide

1. Run `npm run check`, then `npx playwright test tests/browser/deck-lab.spec.ts` if the browser stage could not launch inside the sandbox.
2. Start the web app with `npm run web`, open `/`, and use the desktop Rate / Pimp entry. At 360–375 px, open the mobile drawer and select the same entry.
3. Select Titou Tribal. Paste `Deck`, `23 Lightning Bolt`, `17 Mountain`; Rate should show a score and five axes. A 39-card maindeck should be rejected.
4. Paste a pool of at most 45 cards across `Deck` and `Sideboard`; Pimp should show a 40-card proposal with cards kept/added/removed and copyable MTGA text. A 46-card pool should be rejected.
5. Import a deck photo, review and correct its text, then explicitly trigger Rate or Pimp. Check that unknown names block analysis and that a cube with reduced context reports its coverage.

Use [http.md](contracts/http.md) for request/response fields and [qa-evidence.md](qa-evidence.md) for recorded automated results.
