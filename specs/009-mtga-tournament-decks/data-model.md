# Data model

- `ParsedMtgaDeck`: optional name, ordered aggregated maindeck entries `{name,count}`, basic-land counts, sideboard count. Provisional, never persisted.
- `PreviewedTournamentDeck`: `DeclaredDeckCard[]`, basic-land counts, total count, optional deck name, warnings and unverified names. Returned by the preview endpoint, never persisted until human confirmation.
- `DeclaredDeck`: existing persisted tournament value. No schema change; cards and basic lands are already supported.

The photo result and pasted text both become a provisional preview before `DeclaredDeck` persistence. No sideboard entity is introduced.
