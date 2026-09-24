# HTTP contract

## `POST /api/tournaments/parse-deck`

Request: `{ "text": "Deck\n1 Karakas\n..." }` with a bounded JSON body. It is a read-only parse/preview request and needs no tournament id or idempotency key.

Success `200`: `{ "ok": true, "deckName": "...", "cards": [{"name":"Karakas","count":1,...}], "basicLands": {...}, "totalCount": 40, "sideboardCount": 5, "unverifiedNames": [], "warnings": [...] }`.

Invalid text `400`: `{ "ok": false, "error": { "code": "INVALID_INPUT", "message": "...", "details": { "line": 3 } } }`. No tournament state changes on either response.

`Sideboard` lines are counted and omitted. A DraftMaster partial MTGA marker is rejected. Unknown but syntactically valid card names are preserved and listed in `unverifiedNames`.
