# Implementation Plan: Rate my deck / Pimp my deck

**Branch:** `codex/010-deck-lab`
**Issue:** [#86](https://github.com/tristanlenours/DraftMaster/issues/86)
**Spec:** [spec.md](spec.md)

## Summary

Expose the existing deck evaluator and deterministic deck recommender through a standalone upload and paste flow. The feature treats the submitted list as a temporary analysis, with no draft result or tournament state mutation.

## Technical context

- **Runtime:** Node.js 24, TypeScript strict ESM for server/domain, existing vanilla JavaScript web app.
- **Dependencies:** Existing MTGA parser, master card catalog, CoachContext, `evaluateDeck`, `recommendDeckBuilds`, photo recognition endpoint; no new runtime dependency.
- **Storage:** None for submitted lists or results.
- **Testing:** Vitest for parser/domain/HTTP contracts, Playwright for desktop and mobile journeys.
- **Performance acceptance:** At most 45 submitted cards enter one recommender call per Pimp request; after context loading, text analysis makes zero external per-card requests.
- **Accessibility acceptance:** At 360 px there is no horizontal overflow; all navigation and action buttons have accessible names and remain keyboard-operable.

## Constitution check

- Use the existing versioned and explainable five-axis engine; return its formula version and card-level evidence.
- Reject unknown names instead of inventing card power. Signal when the chosen cube has only basic or catalog context.
- Keep Pimp deterministic for the same input and cube context; no opaque model chooses cuts.
- Work on this feature branch and deliver via a PR linked to issue #86; human approval and required checks govern merge.
- The implementation began before issue #86 and the complete Spec Kit artifact set existed. This ordering gap cannot be retroactively cured; it is disclosed in the PR for reviewer judgment.

## Design

1. Extend `src/web/mtga-deck-text.js` to retain sideboard cards and French basic land aliases for this flow without changing tournament interpretation.
2. `src/deck-lab/analyze-deck.ts` validates the 40/45 boundaries, resolves exact catalog facts, calls the shared evaluator/recommender, and returns a compact explanation plus the full scoring audit. It separates cards kept from the maindeck, added, removed (including basics), and present in the final export.
3. `src/deck-lab/http-handler.ts` selects the cube context, exposes available snapshot/catalog/profile provenance, and translates typed input errors into HTTP responses. `scripts/serve-web.mjs` mounts the endpoint.
4. `src/web/deck-lab.js` owns the form and result presentation. `src/web/deck-photo-upload.js` shares photo input handling with the tournament flow. `src/web/index.html`, `src/web/app.js`, and `src/web/styles.css` expose `/deck-lab` in desktop and mobile navigation.
5. Keep photo text editable and never submit it for rating without the player's explicit action.

## Structure

- `src/deck-lab/`: pure analysis and HTTP adapter.
- `src/web/`: page, parser, shared photo upload, navigation and styles.
- `tests/unit/deck-lab/`, `tests/unit/tournaments/`, `tests/integration/`, `tests/browser/`: focused behavior and journeys.
- `specs/010-deck-lab/`: contract, tasks, requirements checklist, QA evidence.

## Risks and limits

- An incomplete local catalog blocks unknown cards; Arena card availability is not checked.
- A blocked cube profile reduces archetype coverage and is disclosed in the response.
- OCR can misread cards; the player must inspect and correct text before analysis.
- The score is a heuristic diagnostic, not a calibrated league tier or match win probability.
