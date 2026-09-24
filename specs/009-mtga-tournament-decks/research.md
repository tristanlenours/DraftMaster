# Research & resolved decisions

- Arena accepts simplified lines such as `1 Liliana, Death Mage`; `About` followed by `Name` before `Deck` is optional for naming. Sources: [Wizards import guide](https://mtgarena-support.wizards.com/hc/en-us/articles/360049857771-Importing-a-Deck), [Wizards deck name announcement](https://magic.wizards.com/en/news/mtg-arena/mtg-arena-announcements-february-19-2024).
- DraftMaster's multijoueur Arena export already emits `Deck`, a blank line, then `Sideboard`, with a leading non-importable marker when card names are incompatible. The new private « pour tournoi » export retains every printed name while preserving the same sections; the tournament importer accepts that complete text and rejects the Arena partial marker.
- The tournament persists only the confirmed structured Deck déclaré. Parsing and previewing text must not write events, and photo bytes remain in the existing OCR request only.
- Clarification resolved from existing domain: the tournament's Deck déclaré has a maindeck and basic lands but no sideboard, so sideboard entries are counted and omitted with feedback.
- Unknown exact names stay unchanged and are shown as unverified. This preserves online-draft lists when the local catalog lacks a card and avoids a wrong fuzzy substitution.
