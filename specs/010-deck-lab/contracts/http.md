# HTTP and navigation contract

## Navigation

- `GET /deck-lab` serves the web app with the Rate / Pimp view active.
- Desktop navigation and mobile drawer entries both target this view.

## Analysis

`POST /api/deck-lab/analyze` accepts JSON:

```json
{ "cubeKey": "titou_tribal", "mode": "rate", "text": "Deck\n23 Lightning Bolt\n17 Mountain" }
```

- `mode` is `rate` or `pimp`; `cubeKey` selects the context; `text` is the editable MTGA list.
- A successful response contains `mode`, input counts, `rating` (including `audit.contributions` and detailed factors), `warnings`, and `context` (coverage and data provenance). Pimp also returns `before` and `build` with `final`, `keep`, `add`, `remove`, `reserve`, `basicLands`, and `improved`. `keep` contains cards retained from the maindeck, including basics, and excludes additions; add/remove include changed basic lands; `reserve` includes submitted basic lands unused by the proposal; `final` is the exportable nonbasic list. Pimp also returns `retouch`, `null` unless the maindeck has exactly 40 cards: `scoreBefore`, `scoreAfter` and up to three ordered `swaps` (`remove`, `add`, `scoreBefore`, `scoreAfter`, and `axes`, the radar deltas). `build` keeps the retouched deck when it scores at least as high as the rebuild.
- Invalid counts, syntax, unknown cards, cube-key syntax or mode return a structured `400 INVALID_INPUT` response. Unavailable cube context returns `503 CONTEXT_UNAVAILABLE`. No submitted list is stored.
- Photo recognition continues through the existing `/api/tournaments/recognize-deck` route, then fills editable text in the browser. It does not itself call the analysis endpoint.
