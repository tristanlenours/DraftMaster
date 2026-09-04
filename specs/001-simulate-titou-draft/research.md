# Research: Simuler un draft Titou reproductible

**Date**: 2026-09-02

## TypeScript runtime and tooling

**Decision**: Use Node.js 24 LTS, npm, ESM, and TypeScript 6.0 with `strict`, `module: "nodenext"`, `erasableSyntaxOnly`, and `verbatimModuleSyntax`. Execute `.ts` files directly with Node and run `tsc --noEmit` separately in CI.

**Rationale**: Node 24 supports stable type stripping for erasable TypeScript syntax, while TypeScript 6 is the stable bridge release supported by the linting ecosystem. This keeps the CLI build-free without sacrificing static checks. See [Node TypeScript support](https://nodejs.org/download/release/latest-v24.x/docs/api/typescript.html), [Node ESM](https://nodejs.org/download/release/latest-v24.x/docs/api/esm.html), and [TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/).

**Alternatives considered**: Compile to `dist/` with `tsc` (unnecessary for the internal CLI); adopt TypeScript 7 immediately (tooling transition risk); retain Python or browser globals (duplicates the future TypeScript domain model).

## Deep module and atomic rounds

**Decision**: Expose immutable `startDraft`, `getDraftView`, `submitPickRound`, `replayDraft`, and `buildDraftReport` operations. `submitPickRound` validates all eight decisions before appending events or returning a new state.

**Rationale**: An atomic Tour de draft makes illegal operations leave state unchanged and hides rotation, pack lifecycle, and event ordering behind a small interface. The CLI and future multiplayer coordinator collect decisions; neither reimplements rules.

**Alternatives considered**: A public reducer split between `decide` and `evolve` leaks orchestration to every caller; a mutable session object weakens atomicity and replay tests; accepting individual seat mutations exposes partially completed rounds.

## Seeded randomness and replay

**Decision**: Lock an exact `pure-rand` version and use `xoroshiro128plus` with unbiased `uniformInt`. Derive independent 32-bit streams named `distribution` and `policy:seat:0` through `policy:seat:7` from the public seed using SHA-256 and the fixed convention `draftmaster-seed-v1`.

**Seed derivation convention**: Encode the UTF-8 string `draftmaster-seed-v1\0<signed-int32-in-canonical-decimal>\0<stream-name>`, calculate SHA-256, then read the first four digest bytes as a signed big-endian 32-bit integer. Any change to this byte representation, digest extraction, stream names, generator, integer sampling or Fisher–Yates consumption order requires an explicit version change and new reviewed golden vectors.

**Version clarification approved on 2026-09-03**: Register the engine version and each seat's automated policy ID/version at creation, before emitting `DraftStarted`. Copy the eight ordered registrations into the final report, reject automated decisions with mismatching identity/version, and verify that relationship during replay. The orchestrator keeps the actual engine and adapters fixed; explicit seat-0 choices do not alter its automated registration. A new release applies to a new session, never to an in-progress draft. This resolves policy-version availability at start without coupling the engine to executable bots.

**Rationale**: Independent streams prevent a policy implementation change from silently changing booster distribution or other seats. Reports record the public seed, derivation version, algorithm, implementation version, engine version, and policy version. Golden fixtures lock the sequence. See [pure-rand](https://github.com/dubzzz/pure-rand) and [Node crypto](https://nodejs.org/download/release/latest-v24.x/docs/api/crypto.html).

**Alternatives considered**: `Math.random()` is neither seedable nor replayable; cryptographic randomness is appropriate for `sessionId` but not deterministic simulation; a local PRNG removes a dependency but increases algorithm and bias risk; one shared stream couples unrelated behavior.

## Cube snapshot and provenance

**Decision**: Normalize only the 545 mainboard entries from CubeCobra revision 64, dated 2026-02-24T17:45:28.860Z, into `titou_tribal@2026-02-24.1`. Exclude the separate five-card basics collection and maybeboard. Use a version-scoped `instanceId`; do not use printing, Oracle, or card name as instance identity.

**Clarification approved on 2026-09-03**: Keep those exact counts for the initial snapshot, while accepting future valid versions of the same Titou cube with N ≥ 360 instances. Always deal 360 and retain N − 360 unused; N = 360 is valid. Test other sizes with explicitly synthetic versioned fixtures, never by rewriting the historical snapshot. This does not introduce support for another cube or a configurable draft format.

**Rationale**: The list contains 545 physical instances, 543 unique Scryfall printings, and 542 unique Oracle identities. Steam Vents and Arid Mesa each intentionally repeat the same printing, while Verdant Catacombs appears in two printings. The historical CubeCobra URL captures composition provenance, while the committed normalized file is the only runtime source of truth. See [CubeCobra API documentation](https://cubecobra.com/help/apidocs), the [historical cube response](https://cubecobra.com/cube/api/cubeJSON/5e1c13b67c22a016c25ff019?date=1771955128860), and [Scryfall card objects](https://scryfall.com/docs/api/cards).

**Alternatives considered**: Keep the 1.5 MB raw response (more volatile data and unclear redistribution value); use the live endpoint at runtime (breaks offline use and reproducibility); deduplicate by printing or Oracle ID (changes the physical cube).

## Validation and integrity

**Decision**: Publish a JSON Schema 2020-12 contract and validate it with Ajv 8 in strict mode, followed by semantic checks for unique instances, contiguous source indexes, exact initial counts, valid provenance, and matching integrity digest. Calculate SHA-256 over an RFC 8785 canonical projection that excludes retrieval time and the digest field itself.

**Rationale**: Schema validation catches shape errors at the file seam; semantic validation enforces rules JSON Schema cannot express cleanly. Canonicalization makes the digest independent of harmless key ordering while preserving card order. See [JSON Schema 2020-12](https://json-schema.org/draft/2020-12/json-schema-core), [Ajv schema support](https://ajv.js.org/json-schema.html), and [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html).

**Alternatives considered**: Type assertions provide no runtime safety; hashing raw bytes treats formatting as content; accepting the CubeCobra response directly couples runtime behavior to an external schema.

## Report and journal

**Decision**: Emit one UTF-8 JSON report at completion. Re-simulation uses snapshot, seed, versions, policies, and explicit decisions; journal replay folds events without invoking randomness. Following human approval on 2026-09-03, `DraftStarted.snapshot` embeds the complete normalized snapshot (cards, provenance, versions and integrity) once so replay also rebuilds card lookup and report provenance without external files. The approved functional projection excludes session identity, declared timestamps and the report's own `functionalDigest`, retaining all other data and array order. Calculate that digest as lowercase SHA-256 of RFC 8785 canonical UTF-8 JSON; verify a supplied digest separately from projection equality. Snapshot hashes remain independently validated inputs, not the report's self-referential output. The precise exclusions are defined in `data-model.md`.

**Rationale**: The feature explicitly excludes interruption and resume, so streaming persistence is unnecessary. Separating replay from re-simulation proves that the journal is an audit source rather than a decorative log.

**Alternatives considered**: A reference-only journal would be smaller but could not independently rebuild card lookup or survive loss of the original snapshot file; the per-report duplication of normalized cube data is accepted, without images or raw catalog data. NDJSON and intermediate snapshots add persistence complexity; comparing whole reports makes legitimate identifiers and timestamps break deterministic tests; a hash chain is unnecessary without hostile storage.

## Testing strategy

**Decision**: Use Vitest 4 with V8 coverage and fast-check 4. Combine example-based tests, golden PRNG/reference-draft fixtures, schema contracts, property tests, replay tests, full integration, and CLI end-to-end validation. Coverage includes every new source file but percentages remain diagnostic; every critical invariant and branch needs an intentional test.

**Performance clarification approved on 2026-09-03**: Use the user's documented workstation as the SC-006 reference, with the initial snapshot preloaded and validated. Run three warm-ups followed by five fresh measured simulations, each strictly below two seconds through report generation, fingerprinting and serialized JSON ready for output. Exclude runtime startup and disk output, retaining their functional E2E coverage. Follow `performance-protocol.md`; no benchmark has been run at planning time.

**Rationale**: Property generation explores seeds and illegal actions, while fixed reference drafts provide durable regression evidence. Vitest supports TypeScript and V8 coverage; fast-check records seeds and shrink paths for replay. See [Vitest features](https://vitest.dev/guide/features), [Vitest coverage](https://vitest.dev/guide/coverage.html), and [fast-check parameters](https://fast-check.dev/docs/api/interfaces/Parameters/).

**Alternatives considered**: Coverage percentage alone can be gamed; only example tests miss combinatorial rotation and conservation cases; randomized CI without recorded seeds produces irreproducible failures.

## Attribution and data minimization

**Decision**: Store only identifiers and metadata needed by this feature, plus attribution to CubeCobra, Scryfall, and Wizards' unofficial fan-content status. Runtime and tests never download card data or images.

**Rationale**: The minimal snapshot avoids republishing CubeCobra's full response or Scryfall's catalog and keeps volatile prices, rankings, legality, images, and popularity out of the deterministic engine. See [Scryfall API usage](https://scryfall.com/docs/api), [Scryfall terms](https://scryfall.com/docs/terms), and the [Wizards Fan Content Policy](https://company.wizards.com/fancontentpolicy).

**Alternatives considered**: Mirroring complete external records adds no value to random drafting and increases maintenance and licensing risk.

## Greenfield sequencing

**Decision**: Do not reuse the legacy JavaScript/Python runtime. Before deletion, bootstrap and publish the minimal normalized Titou snapshot with a locked historical-response digest and a reproducible explicit script. Then remove the legacy runtime in the separately tracked reset change and rebase or reconcile this feature before implementation. Preserve Git, Spec Kit, constitution, domain documentation, agent guidance, research, the bootstrap script and the normalized Titou snapshot. The later test-first TypeScript importer must reproduce and validate this snapshot; it is not a prerequisite for preserving the data.

**Rationale**: Separating destructive cleanup from domain implementation keeps review scope recoverable and makes the exact deletion manifest auditable.

**Alternatives considered**: Refactor legacy code in place (contradicts the accepted greenfield strategy); delete documentation and governance with runtime code (destroys decisions needed by the replacement).
