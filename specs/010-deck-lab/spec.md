# Rate my deck / Pimp my deck

**Issue:** [#86](https://github.com/tristanlenours/DraftMaster/issues/86)
**Status:** Implemented on feature branch, pending review

## User journeys

1. A player selects a cube, pastes a 40-card MTGA maindeck or imports a deck photo, corrects the text, and receives a 100-point heuristic score with Power, Synergy, Curve, Mana and Interaction, strengths and weaknesses.
2. A player supplies up to 45 cards across `Deck` and optional `Sideboard`. Pimp my deck proposes a 40-card build using cards from that input and freely allocates basic lands. The result names cards retained, added from the reserve, removed from the maindeck, and left aside. The player can copy the proposed deck as MTGA text.

## Rules

- The MTGA parser accepts quantities, edition suffixes, French basic land names and a sideboard. Rate ignores the sideboard and requires exactly 40 maindeck cards. Pimp counts the sideboard toward the 45-card limit.
- A sparse pool is accepted and marked as preliminary when it has fewer than 20 nonbasic cards.
- An input card must resolve to exact catalog facts. Unknown names block analysis; no generic score is invented.
- Both actions use the chosen active cube's verified CoachContext and existing deck evaluation engine. If a cube's synergy profile is blocked, they use its validated snapshot plus catalog facts and explicitly flag the narrower coverage. If no valid snapshot exists, they use only catalog facts and disclose this limit. Cards outside an available snapshot are flagged.
- Pimp uses the existing deterministic deck recommender. If the input maindeck has 40 cards and its score is at least as high as the best candidate, it is retained rather than claiming an improvement.
- The score and letter are heuristic diagnostics, not a win probability or calibrated league tier. Results are not persisted. Photo recognition requires manual text verification.
- The copied list uses MTGA text syntax. Arena availability of individual cards is not verified.

## Acceptance checks

- At 40 cards, Rate shows five axes and a score; at 39 it blocks.
- At 45 cards, Pimp returns a 40-card deck; at 46 it blocks.
- Unknown cards block rather than receiving placeholder power.
- A mobile player can use the full journey at 375 px without horizontal overflow.
- The desktop navigation and mobile menu both open `/deck-lab` and identify both actions. Keyboard users can reach the controls and their outcomes.

## Traceable requirements

- **FR-001 / US1:** A player can open Rate and Pimp from the desktop navigation, mobile menu, or direct URL.
- **FR-002 / US1:** A 40-card maindeck can be rated using the existing five Axes de deck and receives card-level evidence plus the evaluation formula version. A different maindeck size is rejected.
- **FR-003 / US1:** The player can paste MTGA text or import a photo, inspect and correct the recognized text before analysis.
- **FR-004 / US2:** A pool of at most 45 cards across maindeck and sideboard yields a 40-card proposal using only submitted nonbasic cards and freely allocated basic lands. More than 45 cards is rejected.
- **FR-005 / US2:** Pimp names kept, added, removed and unused cards, reports before/after scores when the input was 40 cards, and allows MTGA text copy.
- **FR-006 / US1+US2:** Unknown card names stop analysis. Cube provenance and reduced context coverage are shown; neither flow persists the submitted list.
- **SC-001:** Desktop and 360–375 px mobile navigation reach the feature without horizontal overflow; critical controls retain accessible names and keyboard access.
- **SC-002:** Automated tests cover 39/40 Rate and 45/46 Pimp boundaries, unknown cards, deterministic proposal, HTTP behavior, photo correction and browser navigation.
