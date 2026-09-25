# Photo deck recognition with reviewable titles

Issue: [#88](https://github.com/tristanlenours/DraftMaster/issues/88)

## Problem

Deck Lab currently shrinks a large deck photo to 1400 px and asks a vision model to infer a complete list, including estimated basic lands. The resulting list can contain plausible cards that have no readable title in the photo. Rate and Pimp then treat that list as player input.

## User stories

1. As a player, I can import a large photo and inspect the titles the service actually recognized before using Rate or Pimp.
2. As a player, I see uncertain or uncatalogued readings separately so I can correct the MTGA text manually.
3. As a player, I explicitly confirm the photo-derived list before requesting an analysis.

## Requirements

- FR-001: Deck Lab prepares at most six overlapping, readable image regions from a large photo. Existing tournament photo uploads keep their current single-image contract.
- FR-002: The Deck Lab photo API accepts one to six JPEG regions within the existing request-size limit, and rejects malformed, empty, or excessive region arrays.
- FR-003: Vision output transcribes printed titles without a cube candidate list or inferred deck completion. Basic lands must come from transcribed visible titles, never an estimated aggregate.
- FR-004: Only exact catalog or basic-land title matches enter the editable MTGA list. Unresolved titles remain visible as text to review; fuzzy matches do not silently substitute cards.
- FR-005: Duplicate readings from overlapping regions do not multiply a card's count. One copy per title enters the draft list; the player corrects actual quantities.
- FR-006: After photo import, Rate and Pimp require explicit player confirmation of the editable list. Manual paste remains directly analyzable.
- FR-007: Provider failure and no readable titles preserve the player's existing text. Raw photos and credentials are not persisted or logged.

## Acceptance evidence

- HTTP integration: region count and validation, exact resolution, uncertain-title response, no inferred basics, and provider failure.
- Browser: six-region request from a large image, uncertain-title display, manual correction and confirmation before analysis, plus existing manual-text journey.
- Local photo `data/deck/1000018836.jpg`: compare visible-title positives and unsupported names before/after without committing the photo.

## Quality targets and limits

- A 360 px viewport has no horizontal overflow, and the review checkbox is reachable and operable by keyboard.
- A large photo produces no more than six regions and one Gemini request. The request stays within the existing 25 MB limit.
- Exact catalog matching cannot prove a model read the title correctly. The list is a draft and must be reviewed, especially counts, covered cards, and titles outside the catalog.

## Clarifications

- The player has no exact MTGA export; visible printed titles in the supplied photo are the local comparison source.
- The player approved the HTTP photo-to-recognized-list and browser photo-to-editable-list test boundaries.
