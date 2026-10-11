# Multilingual deck photos

**Feature Branch**: `codex/013-multilingual-deck-photos`
**Created**: 2026-10-11
**Status**: Implemented on dedicated branch; local gate outcomes recorded, remote CI and human release review pending
**Origin**: [Photo import #88](https://github.com/tristanlenours/DraftMaster/issues/88), [Deck Lab #86](https://github.com/tristanlenours/DraftMaster/issues/86). Creating a dedicated issue through the GitHub connector returned 403; no new issue is claimed.
**Input**: Preserve the two root photos for tests and recognize cards regardless of printed language, specifically Nico's Candyshop.

## User Scenarios & Testing

### US1 — Import a multilingual deck (P1)

A player imports either supplied photo into Rate my deck with Nico's Candyshop selected and receives an editable list of canonical card names.

**Independent test**: Replay independently transcribed visible titles through the actual Gemini response boundary and local resolver.

1. Given complete French titles visible in the photos, recognition resolves them to canonical English names, even when the old catalog has no French translation.
2. Given English and another supported printed language for the same card in overlapping regions, the list contains one canonical nonbasic.
3. Given partial, unknown or ambiguous titles, recognition keeps them in the review list without suggesting a card.

### US2 — Retain reproducible photos (P2)

The maintainer can rerun tests with the two original images and inspect their origin and expected visible titles.

**Independent test**: Verify the original JPEG hashes and drive each actual fixture through browser upload and cropping.

1. Both images are preserved byte for byte, identified as two views of the same deck, with cube, authorization and SHA-256 provenance.
2. Automated offline replay is clearly distinguished from live vision accuracy; hidden cards and uncertain quantities are not asserted as ground truth.

### Edge Cases

Non-Latin scripts, accents and typographic punctuation; printed card faces; aliases shared by different identities; a title consisting only of punctuation; absent or malformed alias data; translations absent from the source; overlapping regions; translated basic lands; legacy single-image tournament imports.

## Requirements

- **FR-001**: Resolve complete names from all archived printed languages covered by the local alias dataset to canonical catalog identities. Initially cover all available non-English printings for the catalog's Nico's Candyshop entries and the five ordinary basics.
- **FR-002**: Exact index resolution and tiled photo reads preserve Unicode identity, never resolve unrelated non-Latin titles through an empty normalized key, and reject ambiguous or truncated titles. Existing legacy single-image fallback enrichment remains compatible.
- **FR-003**: Preserve conservative region counting and unresolved-title review. Basic names in any indexed language retain their basic-land identity.
- **FR-004**: Version both supplied JPEGs with source names, cube, SHA-256, permission and independently inspected visible-title expectations. Ordinary uploaded photos remain transient.
- **FR-005**: Refresh multilingual source data explicitly and reproducibly, recording source, method, rights attribution and generation version. Photo recognition adds zero per-card network requests.
- **FR-006**: Preserve the editable list, keyboard confirmation before Rate/Pimp, 360 px layout and existing single-image behavior. The prompt must allow all printed languages without translating or guessing tiled titles.
- **FR-007**: A readable title crossing a crop boundary in the second supplied photo (Serum Visions) must be contained completely in at least one uploaded region, while retaining the six-region and image-size limits.

## Key Entities

Existing canonical catalog card and printed name alias; photo fixture; visible title expectation. These are import facts, not scoring rules or a new domain model.

## Success Criteria

- **SC-001**: All independently listed readable titles in the supplied corpus resolve to their documented identity, except entries explicitly marked unresolved.
- **SC-002**: Regression tests cover French, at least two non-Latin scripts, card faces, alias collisions, translated basics and overlap counts, and reproduce the original French-title rejection before correction.
- **SC-003**: Both original photo hashes pass, and browser uploads produce six distinct bounded JPEG regions plus an editable canonical list and mandatory keyboard review at 360 px and desktop.
- **SC-004**: Quality gate, affected HTTP/browser journeys and reference/replay checks pass or have their actual failures recorded. Human checklist and remote CI remain release gates.

## Clarifications — 2026-10-11

No blocking product ambiguity: the user identifies Nico's cube, explicitly authorizes retaining the photos, and requests language-independent recognition. Existing exact title and human review constraints from feature 011 remain binding. This feature extends the offline name coverage, not the vision model's ability to read hidden or glare-obscured text. Other cubes can use the same importer; untranslated or unreadable names remain reviewable.

## Assumptions

The two photos show one physical deck from different angles. Expected titles form a readable subset, not a complete deck export or an assertion of all basic quantities. No scoring or draft engine change is needed.
