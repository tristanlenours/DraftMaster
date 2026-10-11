# Import facts

PrintedNamesDataset: schemaVersion 1, generator version, generation timestamp, source/attribution/method, explicit licensing status and terms, catalog SHA-256, cube scope and aliases.

PrintedNameAlias: canonical name, oracleId, lang, printedName, scryfallId. Deduplicate identity/language/title deterministically. Aliases attach only when name and oracle identity agree. Face aliases refer to their whole card.

PhotoManifest: cubeKey, source/retention authorization, two filenames with SHA-256, and shared readable-title expectations. Expectations form a subset; no hidden-card or basic-count assertions.
