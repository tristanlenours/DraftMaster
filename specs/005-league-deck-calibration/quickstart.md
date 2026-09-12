# Quickstart: Validate League-Relative Deck Calibration

## Prerequisites

- Node.js 24 and npm 11
- Repository dependencies installed
- No Arena process, local Arena database, network access, or LLM key is required for validation

## Focused witness validation

```powershell
npm run test -- tests/unit/coaching/witness-corpus.test.ts
```

Expected: the powered-vintage corpus is accepted, counts and privacy guarantees pass, and malformed variants are rejected without mutation.

## Focused league evaluation

```powershell
npm run test -- tests/integration/coaching/league-deck-calibration.test.ts
```

Expected: the Arena Powered deck is evaluated through the public coaching interface with `powered_vintage` provenance and matches expert tier A under the provisional calibration.

## Existing seed-42 non-regression

```powershell
npm run test:reference
```

Expected: the seed-42 functional digest, 45 rounds, 360 picks, final pools, and replay remain unchanged. The fixture is not interpreted as an expert Deck témoin.

## Full gate

```powershell
npm run check
git diff --check
```

Expected: all formatting, linting, type, data-profile, unit, integration, coverage, report, and browser gates pass.

## Deterministic extraction recipe (Curator only)

This recipe is used to re-extract or import the Arena Powered witness directly from local Arena and Untapped sources. **Normal test execution and CI do NOT run this extraction and remain 100% offline.**

### Source file prerequisites

1. **Untapped Drafts Journal**:
   - Location: `%APPDATA%\untapped-companion\drafts.json`
   - Contains: Event `bc4cdb9d-6412-43a1-84a2-d66b5dbed559` with 45 pick records.
2. **MTGA Player Log**:
   - Location: `%USERPROFILE%\AppData\LocalLow\Wizards Of The Coast\MTGA\Player-prev.log` (or `Player.log`)
   - Contains: Course summary with courseId `bc4cdb9d-...`, 0-3 match record, and 40-card main deck.
3. **MTGA Raw Card Database**:
   - Location: `C:\Program Files\Wizards of the Coast\MTGA\MTGA_Data\Downloads\Raw\Raw_CardDatabase_*.mtga`
   - Contains: SQLite table `Cards` mapping MTGA GRP IDs to English card names.
4. **DraftMaster Master Card Items**:
   - Location: `data/cards/items/*.json`
   - Contains: Canonical static scores, colors, CMCs, and oracle texts for offline self-contained resolution.

### Secret and privacy exclusions (FR-009, SC-004)

- The extraction script strictly filters out personal account IDs (`Player.PlayerId`, `userId`, `screenName`), opponent display names, match session tokens, and telemetry endpoints.
- SHA-256 cryptographic digests of source files are recorded in `provenance.sourceHashes` to guarantee one-way traceability without leaking mutable source logs.

### Execution command

```powershell
npm run witness:import:arena
```

Output:
- Manifest: `tests/fixtures/golden-datasets/powered-vintage/arena-powered/2026-09-08/corpus.json`
- Draft witness: `tests/fixtures/golden-datasets/powered-vintage/arena-powered/2026-09-08/drafts/bc4cdb9d-6412-43a1-84a2-d66b5dbed559.json`

### Validation command

```powershell
npm run witness:validate
```

Expected: Ajv JSON Schema (Draft 2020-12) validation against `data/schemas/league-witness-corpus.schema.json` succeeds and outputs confirmation.

## Curator review

Verify that the witness rationale describes the Azorius control/tempo plan, absence of Power Nine, observed 0-3 result, and upper-A expert placement. Confirm no player or opponent identifiers are present.

