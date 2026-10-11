# Existing interfaces

POST /api/tournaments/recognize-deck remains unchanged: one legacy image or one to six JPEG regions; canonical cards, conservative basicLands and unverifiedTitles. Unknown/ambiguous/truncated tiled reads remain outside canonical cards. Legacy single-image fallback enrichment remains compatible, with exact English/French aliases applied first.

MasterCardsIndex.findExactCard(title): unique literal alias, then unique nonempty Unicode normalized alias; normalized collisions return undefined. Canonical metadata is retained.

node scripts/import-printed-card-names.mjs --cube nico_candyshop: explicit source refresh, atomic write after successful bounded requests. --all targets the whole catalog. Non-404 source errors abort and preserve the previous dataset.
