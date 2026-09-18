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
    firstPrintYear: 2024,
    released_at: '2024-06-01',
    set: 'MH3',
    setName: 'Modern Horizons 3',
    rarity: 'mythic',
  };
}

const metadataPath = join(benchmarksDir, 'card-release-metadata.json');
writeFileSync(metadataPath, JSON.stringify(cardMetadata, null, 2), 'utf8');
console.log(`💾 Saved metadata for ${Object.keys(cardMetadata).length} cards to ${metadataPath}`);
console.log('✅ Benchmarks and metadata extraction complete.');
