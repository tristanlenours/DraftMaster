# Source verification

Decision: import printed names by canonical oracle ID, rather than model translation or fuzzy matching.

Primary Scryfall API observed 2026-10-11: named?exact=Remue-méninges and the Japanese Brainstorm title return 404. Card search with !"Remue-méninges" lang:any returns Brainstorm and matching printed_name. An oracle-ID search with lang:any -lang:en unique:prints returns 111 Brainstorm printings in ten non-English languages. Fifty-ID batches exceed the accepted query size; use ten IDs and follow every page. Documentation pages returned 403 to browsing; findings come from inspected primary API payloads.

Local catalog: 730 Nico entries, 172 distinct French translations. Brainstorm, Vampiric Tutor, Ancestral Vision, Serum Visions, Baleful Strix and Hullbreacher have no French names. ASCII-only normalization would collapse CJK names to empty keys.

Current decision after user clarification: English canonical names plus French-only offline aliases are sufficient. Runtime lookup adds latency/network failure; model translations lack independent grounding. Offline French aliases preserve exact identity and old translation variants. The earlier multilingual source exploration above is historical evidence, not the current supported scope.

Source: [Scryfall card search API](https://scryfall.com/docs/api/cards/search), [card objects](https://scryfall.com/docs/api/cards). Card names/art and translations are Wizards of the Coast material; retain this attribution and Scryfall provenance.
