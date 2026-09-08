import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return defaultValue;
}

const hasCubeArg = args.includes('--cube');
const targetCube = getArg('--cube', 'titou_tribal');
const isAll = args.includes('--all') || !hasCubeArg;
const limitArg = getArg('--limit', null);
const limit = limitArg ? parseInt(limitArg, 10) : null;
const concurrency = parseInt(getArg('--concurrency', '6'), 10);
const isForce = args.includes('--force');

console.log('🎨 Starting Card Image Downloader...');
console.log(`   Scope: ${isAll ? 'ALL CUBES / ALL CARDS' : `Cube: ${targetCube}`}`);
console.log(`   Concurrency: ${concurrency} workers`);
console.log(`   Limit: ${limit !== null ? limit : 'No limit'}`);
console.log(`   Force overwrite: ${isForce ? 'YES' : 'NO'}`);

// Ensure image directories exist
const imagesDir = resolve(rootDir, 'data/cards/images');
const cardsDir = join(imagesDir, 'cards');
const artDir = join(imagesDir, 'art');
mkdirSync(cardsDir, { recursive: true });
mkdirSync(artDir, { recursive: true });

// Load cards from items directory
const itemsDir = resolve(rootDir, 'data/cards/items');
const itemFiles = readdirSync(itemsDir).filter((f) => f.endsWith('.json'));

const allCards = [];
for (const f of itemFiles) {
  try {
    const raw = readFileSync(join(itemsDir, f), 'utf8');
    allCards.push(JSON.parse(raw));
  } catch (err) {
    console.warn(`   ⚠️ Could not read ${f}:`, err.message);
  }
}

// Filter cards for target
const candidateCards = allCards.filter((card) => {
  if (isAll) return true;
  return card.presentInCubes && card.presentInCubes.includes(targetCube);
});

// Identify which cards actually need download
const cardsNeedingDownload = candidateCards.filter((card) => {
  if (isForce) return true;
  const slug = card.slug;
  const hasCard = existsSync(join(cardsDir, `${slug}.jpg`));
  const hasArt = existsSync(join(artDir, `${slug}.jpg`));
  return !hasCard || !hasArt;
});

console.log(`📋 Total candidates: ${candidateCards.length}`);
console.log(`⏭️  Already cached: ${candidateCards.length - cardsNeedingDownload.length}`);
console.log(`📥 To download: ${cardsNeedingDownload.length}`);

const cardsToProcess = limit ? cardsNeedingDownload.slice(0, limit) : cardsNeedingDownload;

if (cardsToProcess.length === 0) {
  console.log('\n✨ All requested card images are already downloaded and cached.');
  process.exit(0);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const imgHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  Accept: 'image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5',
};

async function fetchWithRetry(url, options = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, redirect: 'follow' });
      if (res.ok) return res;
      if (attempt < retries && (res.status === 429 || res.status >= 500)) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

async function resolveCardImageUrls(card) {
  let normalUrl = card.image?.url || card.imageUrl || null;
  let artCropUrl = card.image?.artCropUrl || null;

  // If we don't have direct URLs or if normalUrl is placeholder
  if (!normalUrl || !normalUrl.startsWith('http')) {
    const scryfallUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`;
    const metaRes = await fetchWithRetry(scryfallUrl, {
      headers: {
        'User-Agent': 'DraftMaster/1.0 (local-card-cache; github.com/tristanlenours/DraftMaster)',
        Accept: 'application/json',
      },
    });

    if (metaRes.ok) {
      const data = await metaRes.json();
      const uris = data.image_uris || data.card_faces?.[0]?.image_uris;
      if (uris) {
        normalUrl = uris.normal || uris.border_crop || uris.large;
        artCropUrl = uris.art_crop || normalUrl;
      }
    }
  }

  // Handle Scryfall redirect URLs
  if (normalUrl && normalUrl.includes('api.scryfall.com/cards/named') && !artCropUrl) {
    artCropUrl = normalUrl + '&version=art_crop';
  }

  if (!artCropUrl) {
    artCropUrl = normalUrl;
  }

  return { normalUrl, artCropUrl };
}

async function processCard(card, index, total) {
  const slug = card.slug;
  const cardPath = join(cardsDir, `${slug}.jpg`);
  const artPath = join(artDir, `${slug}.jpg`);
  const rootPath = join(imagesDir, `${slug}.jpg`);

  const hasCard = existsSync(cardPath);
  const hasArt = existsSync(artPath);

  if (!isForce && hasCard && hasArt) {
    return { status: 'skipped', name: card.name };
  }

  let { normalUrl, artCropUrl } = await resolveCardImageUrls(card);

  if (!normalUrl) {
    // Ultimate fallback to direct Scryfall redirect
    normalUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`;
    artCropUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=art_crop`;
  }

  let downloadedCard = false;
  let downloadedArt = false;

  // Download full card image
  if (isForce || !hasCard) {
    let cardRes = await fetchWithRetry(normalUrl, { headers: imgHeaders });
    // If failed and not from scryfall named fallback, try scryfall named fallback
    if (!cardRes.ok && !normalUrl.includes('api.scryfall.com')) {
      const fallbackUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`;
      cardRes = await fetchWithRetry(fallbackUrl, { headers: imgHeaders });
      if (cardRes.ok) {
        normalUrl = cardRes.url || fallbackUrl;
      }
    }

    if (cardRes.ok) {
      const buffer = Buffer.from(await cardRes.arrayBuffer());
      writeFileSync(cardPath, buffer);
      writeFileSync(rootPath, buffer);
      downloadedCard = true;
    } else {
      throw new Error(`Failed to download card image (${cardRes.status}) from ${normalUrl}`);
    }
  }

  // Download art crop image
  if (isForce || !hasArt) {
    let artRes = await fetchWithRetry(artCropUrl, { headers: imgHeaders });
    if (!artRes.ok && !artCropUrl.includes('api.scryfall.com')) {
      const fallbackArt = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=art_crop`;
      artRes = await fetchWithRetry(fallbackArt, { headers: imgHeaders });
      if (artRes.ok) {
        artCropUrl = artRes.url || fallbackArt;
      }
    }

    if (artRes.ok) {
      const buffer = Buffer.from(await artRes.arrayBuffer());
      writeFileSync(artPath, buffer);
      downloadedArt = true;
    } else if (downloadedCard || hasCard) {
      // If art crop specifically fails, copy card image as fallback so UI never breaks
      const srcBuf = existsSync(cardPath) ? readFileSync(cardPath) : null;
      if (srcBuf) {
        writeFileSync(artPath, srcBuf);
        downloadedArt = true;
      }
    }
  }

  // Update card item JSON with valid localPath
  const itemJsonPath = join(itemsDir, `${slug}.json`);
  if (existsSync(itemJsonPath)) {
    const itemData = JSON.parse(readFileSync(itemJsonPath, 'utf8'));
    itemData.image = {
      url: normalUrl,
      localPath: `data/cards/images/cards/${slug}.jpg`,
      artCropUrl: artCropUrl,
      localArtPath: `data/cards/images/art/${slug}.jpg`,
    };
    itemData.imageUrl = normalUrl;
    writeFileSync(itemJsonPath, JSON.stringify(itemData, null, 2) + '\n', 'utf8');
  }

  return { status: 'downloaded', name: card.name, index, total };
}

let downloadedCount = 0;
let errorCount = 0;
let completedCount = 0;

// Worker pool for concurrent downloading
async function runWorkerPool() {
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < cardsToProcess.length) {
      const index = currentIndex++;
      const card = cardsToProcess[index];
      try {
        const res = await processCard(card, index + 1, cardsToProcess.length);
        if (res.status === 'downloaded') {
          downloadedCount++;
        }
        completedCount++;
        const pct = Math.round((completedCount / cardsToProcess.length) * 100);
        console.log(`   [${completedCount}/${cardsToProcess.length}] (${pct}%) ✅ ${card.name}`);
      } catch (err) {
        errorCount++;
        completedCount++;
        console.error(`   [${completedCount}/${cardsToProcess.length}] ❌ ${card.name}: ${err.message}`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

await runWorkerPool();

console.log('\n=============================================');
console.log('🎉 Card Images Download Summary:');
console.log(`   Downloaded: ${downloadedCount}`);
console.log(`   Previously cached: ${candidateCards.length - cardsNeedingDownload.length}`);
console.log(`   Errors: ${errorCount}`);
console.log('=============================================\n');

if (downloadedCount > 0) {
  console.log('🔄 Synchronizing data models with updated local image paths...');
  spawnSync('node', ['scripts/sync-data-models.mjs'], { stdio: 'inherit' });
}
