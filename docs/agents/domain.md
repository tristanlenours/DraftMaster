# Domain Documentation

DraftMaster uses a single domain context.

Before changing domain behavior, read the root `CONTEXT.md` when present and any relevant decision record under `docs/adr/`. Proceed silently when these files do not yet exist: `$domain-modeling` creates them lazily when terminology or a durable decision is actually resolved.

Use canonical glossary terms in specifications, issue titles, tests, and code. If a needed term is absent or conflicts with existing language, resolve it through domain modeling before introducing a synonym.

Surface any conflict with an ADR explicitly. Create a new ADR only for a decision that is costly to reverse, surprising without context, and chosen through a real trade-off.
