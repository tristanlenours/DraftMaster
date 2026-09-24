# Data model

- **Submitted list:** MTGA text with `Deck` and optional `Sideboard`, quantities, nonbasic names and basic land counts. Rate reads only the 40-card maindeck; Pimp counts both sections toward 45.
- **Resolved pool:** One `CardEvaluationInput` per submitted nonbasic copy, derived from an exact `MasterCatalogCard`; unknown names stop the request. Basic lands use existing canonical inputs.
- **Evaluation context:** Chosen cube key, validated snapshot and optional CoachContext. The result states coverage (`full`, `basic`, or `catalog_only`) and relevant warnings.
- **Rating:** Heuristic 100-point score, letter, five Axes de deck, strengths, weaknesses, examples, formula version and score meaning.
- **Build proposal:** Kept, added, removed and unused nonbasic card counts, basic land allocation, previous rating when available, proposed rating and improvement indicator. Every nonbasic card in the proposal comes from the resolved pool.

The request and result are transient. No persisted entity or migration is added.
