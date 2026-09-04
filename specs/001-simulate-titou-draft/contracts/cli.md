# Contract: Command-line adapters

## Simulate a draft

```text
npm --silent run simulate -- [--cube <snapshot-path>] [--seed <int32>]
```

- `--cube` defaults to `data/cubes/titou_tribal/2026-02-24.1.json`.
- `--seed` accepts a signed 32-bit decimal integer. If omitted, the adapter generates one securely and records it in the report.
- Standard output contains exactly one UTF-8 JSON `DraftReport` and a trailing newline.
- Diagnostics and structured errors go to standard error; progress text MUST NOT corrupt standard output.
- `--silent` suppresses npm's script banner, not diagnostics explicitly written by the application to standard error. E2E tests MUST exercise this exact npm invocation and verify the application exit code and both output streams.
- The command performs no network request.

Example:

```powershell
npm --silent run simulate -- --seed 42 > draft-report.json
```

## Import a cube revision

Import is explicit and separated into fetch and normalization:

```text
npm run cube:fetch -- --cube-id <id> --date <unix-ms> --out <raw-json-path>
npm run cube:normalize -- --input <raw-json-path> --version <AAAA-MM-JJ.N> --out <snapshot-path>
npm run cube:validate -- --file <snapshot-path>
```

- `cube:fetch` is the only command allowed to access CubeCobra. It sends an identifying user agent, performs one request, and records URL, retrieval time and raw SHA-256.
- `cube:normalize` never accesses the network. It selects mainboard entries, excludes separate basics/maybeboard collections, creates instance IDs, canonicalizes functional content and writes a candidate snapshot.
- `cube:validate` never accesses the network and MUST run before a snapshot is committed or used.
- Importing an unchanged source revision does not create a new version. A changed revision creates the source-date version; `.N` distinguishes multiple revisions on the same date.

Initial source:

```text
https://cubecobra.com/cube/api/cubeJSON/5e1c13b67c22a016c25ff019?date=1771955128860
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Command completed and its output passed invariants |
| `1` | Unexpected adapter or operating-system failure |
| `2` | Invalid command syntax or option |
| `3` | File, JSON, schema, provenance or snapshot validation failure |
| `4` | Draft or policy rejected an operation |
| `5` | Replay, report or final invariant failure |

Errors on standard error contain a stable code, message and optional details. They MUST NOT include the full cube payload, environment variables, or unrelated filesystem paths.
