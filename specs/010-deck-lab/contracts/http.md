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
- A successful response contains `mode`, input counts, `rating`, `warnings`, and `context`. Pimp also returns `before` and `build` with `keep`, `add`, `remove`, `reserve`, `basicLands`, and `improved`.
- Invalid counts, syntax, unknown cards, cube-key syntax or mode return a structured `400 INVALID_INPUT` response. Unavailable cube context returns `503 CONTEXT_UNAVAILABLE`. No submitted list is stored.
- Photo recognition continues through the existing `/api/tournaments/recognize-deck` route, then fills editable text in the browser. It does not itself call the analysis endpoint.
