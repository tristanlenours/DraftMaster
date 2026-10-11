# Implementation plan

## Technical Context

Node 24, strict TypeScript ESM, existing Vitest and Playwright. No new dependencies, scoring changes or runtime network requests. Runtime additions belong in src/cards/ and src/tournaments/deck-photo-recognition.ts; tests follow tests/unit/, tests/integration/ and tests/browser/.

## Constitution Check

Dedicated branch; originating issues #88/#86 and spec linked. New issue creation failed with connector 403 and is recorded for delivery. Regression test precedes fix. Engine/reference/replay behavior stays protected. User expressly authorized these two test photos; no general upload retention. Reviewer checklist remains unchecked and human merge approval is required.

## Design

1. Preserve both original files under tests/fixtures/deck-photos/nico-candyshop/ with hashes and visually inspected title/identity pairs. Original root files remain for local convenience.
2. Explicit offline importer scripts/import-printed-card-names.mjs, backed by testable src/cards/import-printed-names.ts: query bounded batches of catalog oracle IDs using lang:any -lang:en unique:prints, follow pagination, keep top-level and face names with source printing IDs, rate-limit requests, and write only after complete success. Include five ordinary basics. --cube nico_candyshop supplies initial data; --all supports the entire catalog.
3. Load data/cards/printed-names.json in the master name index. Attach aliases only to known matching canonical name/oracle ID (plus validated ordinary basics). Preserve Unicode letters/numbers during normalization. Store candidate sets and decline collisions between distinct identities. Exact literal aliases precede normalization; empty and visibly truncated titles fail closed.
4. Tiled recognition resolves only exact aliases. Classify translated basic identities before conservative max-per-region counts. Single-image enrichment uses the same aliases. Broaden its language prompt; tiled transcription stays in the printed language without cube suggestions.
5. Replay source-visible titles through mocked Gemini HTTP responses with actual images. Add corruption/collision/script tests and importer pagination/failure tests. Browser scenarios load both original JPEGs, use actual cropping and canonical response enrichment, exercise keyboard review and capture mobile/desktop evidence. Live provider accuracy is separately measured if available.
6. Live follow-up: preserve the complete Serum Visions title ribbon (original photo 1000019032.jpg coordinates recorded in the manifest) within at least one region. The old 12% overlap cuts this ribbon in both adjacent regions. Increase overlap without changing six-region/1600 px/body limits; test observed canvas crop bounds before correction.
7. Delivery gate follow-up: npm audit identifies the existing transitive source-map-js 1.2.1 advisory. Update only that locked patch within its existing range to 1.2.2 and verify the dependency audit; no dependency is added.

## Trade-offs

Aliases omit images and oracle text duplication. One local JSON read supplies the index. Missing translations and incorrect vision reads remain manual; ambiguous names are rejected. Source refresh is explicit and uses network; runtime enrichment stays offline.

## Performance and UX

Zero additional recognition requests or per-card network latency, no new UI controls/dependencies. Dataset below 10 MB. Existing six-region/25 MB upload bounds remain. Verify review at 360 px and desktop via keyboard without horizontal overflow; existing Lighthouse release budgets apply.
