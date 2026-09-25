# Implementation plan

## Seams

The player confirmed two test boundaries: `POST /api/tournaments/recognize-deck` and the Deck Lab photo-to-editable-MTGA browser journey. External Gemini calls are replaceable at the HTTP test boundary.

## Design

1. Keep the tournament single-image request working. Add an optional `images` array for Deck Lab with one to six JPEG data URLs.
2. Build overlapping image regions in the browser. A single Gemini request receives all regions and returns printed titles by region.
3. Resolve each title exactly against the local card index or a basic-land name. Preserve unresolved readings for manual correction. Count each distinct title once: repeated model readings are not reliable evidence of multiple copies.
4. Require a visible photo review acknowledgement before Rate/Pimp. Do not gate manually pasted lists.

## Trade-offs

- A partial, reviewable list is preferable to a complete list padded with guesses. Hidden cards and duplicate copies in separate regions may still be missed.
- Six regions increase upload and vision payload size, but use one provider request and retain the current 25 MB HTTP body limit.
- The local user photo is used for manual quality evidence and is not added to Git.
- The browser review control is visible on narrow screens, keyboard operable, and blocks both actions until confirmation. No new data is persisted.
