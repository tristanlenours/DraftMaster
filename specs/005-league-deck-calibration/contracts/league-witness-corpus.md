# League Witness Corpus Contract

The canonical machine-readable contract is the versioned JSON Schema at `data/schemas/league-witness-corpus.schema.json`.

## Compatibility

- Schema version 1 is accepted.
- Unknown fields are rejected so provenance and privacy rules cannot be bypassed silently.
- A future incompatible shape requires a new schema and explicit migration.

## Privacy

The contract accepts aggregate match outcomes but has no fields for Arena account IDs, user IDs, session IDs, opponent names, or raw log lines.

## Independence

Expected tiers, rationales, and allowed uses are authored evidence. They are never populated from the current evaluator output. Tests compare implementation output to the witness rather than rewriting the witness.
