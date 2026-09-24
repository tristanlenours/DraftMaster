# Design decisions

## Reuse the existing evaluator and recommender

**Decision:** Call `evaluateDeck` and `recommendDeckBuilds` with resolved catalog facts and the selected cube context.
**Rationale:** The five axes and build ranking stay consistent with existing DraftMaster flows and remain deterministic.
**Alternative considered:** A separate deck-scoring formula would duplicate rules and obscure score comparisons.

## Restrict Pimp to the uploaded pool

**Decision:** Choose nonbasic cards only from the 45 submitted cards; basic lands are freely allocated.
**Rationale:** Every recommended change can be made from the player's available cards and the input bound stays meaningful.
**Alternative considered:** Searching the cube or catalog for purchases/additions requires a separate collection and availability contract.

## Keep photo recognition as editable input

**Decision:** Reuse the existing recognition endpoint, populate the MTGA text editor, and require a separate Rate or Pimp action.
**Rationale:** OCR is uncertain and the final analyzed text must be visible to the player.
**Alternative considered:** Automatically rating the OCR response risks analyzing misidentified cards.

## Degrade context explicitly

**Decision:** Prefer validated CoachContext, then valid cube snapshot plus catalog facts, then catalog-only facts with warnings.
**Rationale:** A player can still get a bounded diagnostic when a profile is blocked, while understanding what is missing.
**Alternative considered:** Refusing all analysis for a blocked cube would lose the usable power/curve/mana/interaction axes.
