import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const rootDir = process.cwd();
const benchmarksDir = resolve(rootDir, 'data', 'benchmarks');
const cubecobraDir = resolve(benchmarksDir, 'cubecobra');

mkdirSync(cubecobraDir, { recursive: true });

const BENCHMARK_CUBES = [
  { id: 'thepaupercube', name: 'The Pauper Cube', targetCubes: ['hugues_pauper'] },
  { id: 'modovintage', name: 'MTGO Vintage Cube', targetCubes: ['nico_candyshop', 'cedric_cube'] },
  { id: 'jdgp', name: 'JDGP Peasant Cube', targetCubes: ['titou_arena_peasant_plus'] },
  { id: 'tribal', name: 'Tribal Synergy Cube', targetCubes: ['titou_tribal'] },
  { id: 'vintage', name: 'Vintage Cube Archive', targetCubes: ['cedric_cube', 'nico_candyshop'] },
];

console.log('📡 Fetching CubeCobra benchmark cube card lists...');

const benchmarkIndex = {};

for (const cube of BENCHMARK_CUBES) {
  const url = `https://cubecobra.com/cube/download/plaintext/${cube.id}`;
  const filePath = join(cubecobraDir, `${cube.id}.txt`);
  let text = '';

  try {
    console.log(`  -> Downloading ${cube.name} (${url})...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
    writeFileSync(filePath, text, 'utf8');
  } catch (err) {
    console.warn(`  ⚠️ Failed to download ${cube.name} (${err.message}). Checking local cache...`);
    if (existsSync(filePath)) {
      text = readFileSync(filePath, 'utf8');
    } else {
      console.error(`  ❌ No local cache for ${cube.id}`);
      text = '';
    }
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  // Normalize card names
  const uniqueCards = Array.from(new Set(lines));
  benchmarkIndex[cube.id] = {
    id: cube.id,
    name: cube.name,
    targetCubes: cube.targetCubes,
    cardCount: uniqueCards.length,
    cards: uniqueCards,
  };
  console.log(`  ✓ ${cube.name}: ${uniqueCards.length} cards indexed.`);
}

const benchmarkIndexPath = join(benchmarksDir, 'cubecobra-benchmarks.json');
writeFileSync(benchmarkIndexPath, JSON.stringify(benchmarkIndex, null, 2), 'utf8');
console.log(`💾 Saved benchmark index to ${benchmarkIndexPath}`);

// 1b. Compact card details of the peer cubes (CubeCobra cubeJSON). Full exports weigh ~2 MB each,
// so only the fields used by the power calibration, the release metadata and the card importer
// (scripts/import-peer-cube-candidates.mjs) are versioned.
const PEER_DETAIL_FIELDS = [
  'name',
  'oracle_id',
  'scryfall_id',
  'layout',
  'elo',
  'popularity',
  'cubeCount',
  'pickCount',
  'cmc',
  'parsed_cost',
  'colors',
  'color_identity',
  'type',
  'oracle_text',
  'keywords',
  'power',
  'toughness',
  'loyalty',
  'produced_mana',
  'oracle_tags',
  'rarity',
  'firstPrintYear',
  'released_at',
  'set',
  'set_name',
  'image_normal',
  'art_crop',
  'isToken',
];
const peerDetailsPath = join(benchmarksDir, 'cubecobra-peer-card-details.json');
const previousPeerDetails = existsSync(peerDetailsPath)
  ? JSON.parse(readFileSync(peerDetailsPath, 'utf8'))
  : { cards: {} };
const peerCards = {};
const peerCapturedAt = {};
for (const cube of BENCHMARK_CUBES) {
  try {
    const res = await fetch(`https://cubecobra.com/cube/api/cubeJSON/${cube.id}`, {
      headers: { 'user-agent': 'DraftMaster/0.1 (+https://github.com/tristanlenours/DraftMaster)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    peerCapturedAt[cube.id] = new Date().toISOString();
    for (const entry of json.cards?.mainboard ?? []) {
      const d = entry.details;
      if (!d?.oracle_id || !d.name) continue;
      const existing = peerCards[d.oracle_id];
      if (existing) {
        if (!existing.peerCubes.includes(cube.id)) existing.peerCubes.push(cube.id);
        continue;
      }
      const compact = { peerCubes: [cube.id] };
      for (const field of PEER_DETAIL_FIELDS) {
        if (d[field] !== undefined && d[field] !== null) compact[field] = d[field];
      }
      // A Pauper-legal card has a common printing even when the peer cube uses another one.
      compact.pauperLegal = d.legalities?.Pauper === 'legal';
      peerCards[d.oracle_id] = compact;
    }
    console.log(`  ✓ ${cube.name}: card details captured.`);
  } catch (err) {
    console.warn(`  ⚠️ Failed to fetch details for ${cube.name} (${err.message}). Keeping cached entries.`);
    peerCapturedAt[cube.id] = previousPeerDetails.capturedAt?.[cube.id];
    for (const [oracleId, card] of Object.entries(previousPeerDetails.cards ?? {})) {
      if (card.peerCubes?.includes(cube.id) && !peerCards[oracleId]) peerCards[oracleId] = card;
    }
  }
}
const sortedPeerCards = Object.fromEntries(
  Object.entries(peerCards).sort(([, a], [, b]) => a.name.localeCompare(b.name)),
);
writeFileSync(
  peerDetailsPath,
  JSON.stringify(
    {
      schemaVersion: 1,
      source: 'https://cubecobra.com/cube/api/cubeJSON/<id> (mainboard details)',
      capturedAt: peerCapturedAt,
      cardCount: Object.keys(sortedPeerCards).length,
      cards: sortedPeerCards,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);
console.log(`💾 Saved ${Object.keys(sortedPeerCards).length} peer card details to ${peerDetailsPath}`);

// 2. Extract card release metadata from existing raw archives
console.log('📦 Extracting card release years and set metadata...');
const cubeKeys = [
  'titou_tribal',
  'nico_candyshop',
  'cedric_cube',
  'hugues_pauper',
  'titou_arena_peasant_plus',
];

const cardMetadata = {};

for (const cKey of cubeKeys) {
  const rawPath = resolve(rootDir, 'data', 'cubes', cKey, 'cubecobra-raw.json');
  if (!existsSync(rawPath)) continue;

  try {
    const rawData = JSON.parse(readFileSync(rawPath, 'utf8'));
    const allCards = [
      ...(rawData.cards?.mainboard || []),
      ...(rawData.cards?.maybeboard || []),
    ];

    for (const card of allCards) {
      const details = card.details;
      if (!details || !details.name) continue;

      const normName = details.name.toLowerCase().trim();
      if (!cardMetadata[normName]) {
        cardMetadata[normName] = {
          name: details.name,
          firstPrintYear: details.firstPrintYear || (details.released_at ? parseInt(details.released_at.slice(0, 4), 10) : 2020),
          released_at: details.released_at || undefined,
          set: details.set?.toUpperCase() || undefined,
          setName: details.set_name || undefined,
          rarity: details.rarity || undefined,
          elo: details.elo || undefined,
          popularity: details.popularity || undefined,
          cubeCount: details.cubeCount || undefined,
        };
      }
    }
  } catch (err) {
    console.warn(`  ⚠️ Error parsing raw archive for ${cKey}: ${err.message}`);
  }
}

// Peer-cube cards complete the metadata for catalog candidates that are in none of our cubes.
for (const card of Object.values(sortedPeerCards)) {
  const normName = card.name.toLowerCase().trim();
  if (cardMetadata[normName]) continue;
  cardMetadata[normName] = {
    name: card.name,
    firstPrintYear:
      card.firstPrintYear || (card.released_at ? parseInt(card.released_at.slice(0, 4), 10) : 2020),
    released_at: card.released_at || undefined,
    set: card.set?.toUpperCase() || undefined,
    setName: card.set_name || undefined,
    // Lowest known rarity: the Pauper-legality flag proves a common printing exists.
    rarity: card.pauperLegal ? 'common' : card.rarity || undefined,
    elo: card.elo || undefined,
    popularity: card.popularity || undefined,
    cubeCount: card.cubeCount || undefined,
  };
}

// Fallback for missing 2 cards
if (!cardMetadata['gurmag angler']) {
  cardMetadata['gurmag angler'] = {
    name: 'Gurmag Angler',
    firstPrintYear: 2015,
    released_at: '2015-01-23',
    set: 'FRF',
    setName: 'Fate Reforged',
    rarity: 'common',
  };
}
if (!cardMetadata['elspeth, storm slayer']) {
  cardMetadata['elspeth, storm slayer'] = {
    name: 'Elspeth, Storm Slayer',
    firstPrintYear: 2025,
    released_at: '2025-04-11',
    set: 'TDM',
    setName: 'Tarkir: Dragonstorm',
    rarity: 'mythic',
  };
}

const metadataPath = join(benchmarksDir, 'card-release-metadata.json');
writeFileSync(metadataPath, JSON.stringify(cardMetadata, null, 2), 'utf8');
console.log(`💾 Saved metadata for ${Object.keys(cardMetadata).length} cards to ${metadataPath}`);
console.log('✅ Benchmarks and metadata extraction complete.');
