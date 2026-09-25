# Rate my deck / Pimp my deck

**Issue:** [#86](https://github.com/tristanlenours/DraftMaster/issues/86)
**Status:** Implemented on feature branch, pending review

## User journeys

1. A player selects a cube, pastes a MTGA maindeck or imports a deck photo, corrects the text, and receives a 100-point heuristic score with Power, Synergy, Curve, Mana and Interaction, strengths and weaknesses. Missing basic lands are added virtually up to 40 cards and disclosed.
2. A player supplies up to 45 nonbasic cards across `Deck` and optional `Sideboard`. Pimp my deck proposes a 40-card build with exactly 23 nonland cards and 17 land cards, using submitted nonbasic cards and freely allocated basic lands. Modal spell/land cards such as Emeria's Call occupy land slots. The result names cards retained, added from the reserve, removed from the maindeck, and left aside. The player can copy the proposed deck as MTGA text.

## Rules

- The MTGA parser accepts quantities, edition suffixes, French basic land names and a sideboard. Deck Lab enforces one copy per nonbasic card across main and sideboard; only basic lands may have multiple copies.
- Rate ignores the sideboard, rejects more than 40 maindeck cards, and adds missing basic lands virtually. The allocation follows mana requirements deterministically and is displayed as provisional. Basic lands already supplied are retained.
- Pimp counts nonbasic cards in main and sideboard toward the 45-card limit; basic lands do not use pool slots. At least 23 distinct nonland cards are required for the fixed 23/17 build.
- Every card used by an analysis must resolve to exact catalog facts. Unknown maindeck names block Rate; unknown names in the entire pool block Pimp. Rate ignores sideboard names; no generic score is invented.
- Both actions use the chosen active cube's verified CoachContext and existing deck evaluation engine. If a cube's synergy profile is blocked, they use its validated snapshot plus catalog facts and explicitly flag the narrower coverage. If no valid snapshot exists, they use only catalog facts and disclose this limit. Cards outside an available snapshot are flagged.
- Pimp uses the existing deterministic deck recommender with a Deck Lab-only 23/17 constraint. A 40-card input is retained only if it already has 23 nonlands and 17 lands and its score is at least as high as the best candidate.
- The score and letter are heuristic diagnostics, not a win probability or calibrated league tier. Results are not persisted. Photo recognition requires manual text verification.
- The copied list uses MTGA text syntax. Arena availability of individual cards is not verified.

## Acceptance checks

- At 40 cards, Rate shows five axes and a score; at 39 it adds one virtual basic land, and at 41 it blocks.
- At 45 nonbasic cards, Pimp returns a 40-card deck containing 23 nonlands and 17 lands; at 46 nonbasic cards it blocks.
- Unknown cards block rather than receiving placeholder power.
- A mobile player can use the full journey at 375 px without horizontal overflow.
- The desktop navigation and mobile menu both open `/deck-lab` and identify both actions. Keyboard users can reach the controls and their outcomes.

## Traceable requirements

- **FR-001 / US1:** A player can open Rate and Pimp from the desktop navigation, mobile menu, or direct URL.
- **FR-002 / US1:** A maindeck with at most 40 cards can be rated using the existing five Axes de deck and receives card-level evidence plus the evaluation formula version. Missing basic lands are added virtually to reach 40, with quantities and colors disclosed. More than 40 cards are rejected.
- **FR-003 / US1:** The player can paste MTGA text or import a photo, inspect and correct the recognized text before analysis.
- **FR-004 / US2:** A pool of at most 45 distinct nonbasic cards across maindeck and sideboard yields a 40-card proposal with exactly 23 nonland and 17 land cards, using only submitted nonbasic cards and freely allocated basic lands. Modal spell/land cards count as lands. More than 45 nonbasic cards or fewer than 23 nonland cards are rejected.
- **FR-005 / US2:** Pimp names cards kept from the maindeck, added from the reserve or basic lands, removed including basic lands, and left unused including submitted basic lands. It reports before/after scores when the input was 40 cards, and copies the complete proposed deck as MTGA text.
- **FR-006 / US1+US2:** Unknown analyzed card names stop analysis. Cube provenance and reduced context coverage are shown; neither flow persists the submitted list. Each rating exposes the five weighted score contributions and material scoring factors.
- **SC-001:** Desktop and 360–375 px mobile navigation reach the feature without horizontal overflow; critical controls retain accessible names and keyboard access.
- **SC-002:** Automated tests cover 39/40 Rate and 45/46 Pimp boundaries, unknown cards, deterministic proposal, HTTP behavior, photo correction and browser navigation.
