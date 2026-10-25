# feat(deck-lab): recognise English and French deck photos

Deck Lab and tournament photo import now recognise printed card titles in English and French. Recognition uses the English catalog names plus 771 French printed names from Scryfall (`data/cards/printed-names.json`, refreshable with `scripts/import-printed-card-names.mjs`), keeping Unicode and oracle identity. Near-miss readings are matched by Dice bigram similarity; ambiguous or truncated titles stay unresolved for manual correction. The six photo regions overlap enough to keep a title crossing a boundary readable.

Product decisions recorded in the spec (Clarifications 2026-10-25): the confirmation step before Rate/Pimp is removed (the list stays editable), and the 40-card whole-deck criterion is not met (32/40 and 31/40 in the live audit) but accepted for this feature.

Follows [#88](https://github.com/tristanlenours/DraftMaster/issues/88) and [#86](https://github.com/tristanlenours/DraftMaster/issues/86). See [spec](specs/013-multilingual-deck-photos/spec.md) and [QA evidence](specs/013-multilingual-deck-photos/qa-evidence.md).
