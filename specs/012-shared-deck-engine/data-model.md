# Data model

Reuse MasterCatalogCard, CardEvaluationInput, CoachContext, DeckEvaluationOptions and DeckBuildOption. Journey instance ids differ and remain caller-owned. Oracle identity, mana/color facts and roles are catalog-owned. Context owns snapshot and evaluation parameters. No new persisted entities or migrations.
