# fix(deck-lab): recognize multilingual printed card names

French titles from Nico's Candyshop deck photos were omitted because the local catalog lacked their translations. Import exact printed-name and face aliases from Scryfall into an offline index, preserve Unicode identity and decline ambiguous/truncated tiled reads. Translated basics retain conservative region counts.

Preserve the two user-authorized original photos and their hashes as regression fixtures. Increase region overlap so the Serum Visions title ribbon in the second photo fits completely in one crop. Import/photo/browser regressions and opt-in live vision checks cover the affected journey.

Refs #88, #86. Specification: specs/013-multilingual-deck-photos/spec.md. Evidence: specs/013-multilingual-deck-photos/qa-evidence.md. Source-covered names cannot repair illegible text; list and quantities still require user review. The initial dataset covers Nico and ordinary basics; the importer can refresh all catalog cubes. Human checklist, remote issue/PR/CI and merge approval remain pending.
