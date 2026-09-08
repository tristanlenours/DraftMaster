import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
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
const concurrency = parseInt(getArg('--concurrency', '1'), 10);
const delayMs = parseInt(getArg('--delay', '120'), 10);
const isForce = args.includes('--force');

console.log('🇫🇷 Starting French Card Image Downloader...');
console.log(`   Scope: ${isAll ? 'ALL CUBES / ALL CARDS' : `Cube: ${targetCube}`}`);
console.log(`   Concurrency: ${concurrency} worker(s)`);
console.log(`   Delay between requests: ${delayMs}ms`);
console.log(`   Limit: ${limit !== null ? limit : 'No limit'}`);
console.log(`   Force overwrite: ${isForce ? 'YES' : 'NO'}`);

// Ensure French image directories exist
const imagesDir = resolve(rootDir, 'data/cards/images');
const enCardsDir = join(imagesDir, 'cards');
const enArtDir = join(imagesDir, 'art');
const frDir = join(imagesDir, 'fr');
const frCardsDir = join(frDir, 'cards');
const frArtDir = join(frDir, 'art');

mkdirSync(frCardsDir, { recursive: true });
mkdirSync(frArtDir, { recursive: true });

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

// Filter candidate cards
const candidateCards = allCards.filter((card) => {
  if (isAll) return true;
  return card.presentInCubes && card.presentInCubes.includes(targetCube);
});

// Identify which cards actually need processing
const cardsNeedingDownload = candidateCards.filter((card) => {
  if (isForce) return true;
  const slug = card.slug;
  const hasCard = existsSync(join(frCardsDir, `${slug}.jpg`));
  const hasArt = existsSync(join(frArtDir, `${slug}.jpg`));
  const hasMeta = card.image?.localFrenchPath;
  return !hasCard || !hasArt || !hasMeta;
});

console.log(`📋 Total candidates: ${candidateCards.length}`);
console.log(`⏭️  Already cached: ${candidateCards.length - cardsNeedingDownload.length}`);
console.log(`📥 To download / process: ${cardsNeedingDownload.length}`);

const cardsToProcess = limit ? cardsNeedingDownload.slice(0, limit) : cardsNeedingDownload;

if (cardsToProcess.length === 0) {
  console.log('\n✨ All requested French card images are already downloaded and cached.');
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

const scryfallHeaders = {
  'User-Agent': 'DraftMaster/1.0 (local-french-cache; github.com/tristanlenours/DraftMaster)',
  Accept: 'application/json;q=0.9,*/*;q=0.8',
};

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, redirect: 'follow' });
      if (res.ok) return res;
      if (res.status === 429) {
        console.warn(`   ⏳ Rate limited (429) by Scryfall, pausing 30s before retry...`);
        await sleep(30000);
        continue;
      }
      if (attempt < retries && res.status >= 500) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
}

async function resolveFrenchCardData(card) {
  let frenchName = card.frenchName || null;
  let frenchText = card.frenchText || null;
  let frenchImageUrl = card.frenchImageUrl || null;
  let frenchArtCropUrl = null;

  const cleanName = card.name.split(' // ')[0].trim();
  const searchUrl = `https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cleanName)}%22+lang%3Afr`;

  try {
    const res = await fetchWithRetry(searchUrl, { headers: scryfallHeaders });
    await sleep(delayMs);
    if (res && res.ok) {
      const data = await res.json();
      const prints = data.data || [];
      const match =
        prints.find((p) => p.name === card.name && (p.image_uris || p.card_faces?.[0]?.image_uris)) ||
        prints.find((p) => p.image_uris || p.card_faces?.[0]?.image_uris) ||
        prints[0];

      if (match) {
        if (match.card_faces && match.card_faces.length > 0) {
          frenchName = match.printed_name || match.card_faces.map((f) => f.printed_name || f.name).join(' // ');
          frenchText = match.card_faces
            .map((f) => {
              const fName = f.printed_name || f.name;
              const fText = f.printed_text || f.oracle_text || '';
              return `${fName}\n${fText}`.trim();
            })
            .join('\n\n---\n\n');
          const face0 = match.card_faces[0];
          frenchImageUrl = face0.image_uris?.normal || face0.image_uris?.large || match.image_uris?.normal || null;
          frenchArtCropUrl = face0.image_uris?.art_crop || match.image_uris?.art_crop || null;
        } else {
          frenchName = match.printed_name || card.name;
          frenchText = match.printed_text || match.oracle_text || card.oracleText;
          frenchImageUrl = match.image_uris?.normal || match.image_uris?.large || null;
          frenchArtCropUrl = match.image_uris?.art_crop || null;
        }
      }
    }
  } catch (err) {
    console.warn(`   ⚠️ Could not search Scryfall for ${card.name}:`, err.message);
  }

  return {
    frenchName: frenchName || card.name,
    frenchText: frenchText || card.oracleText,
    frenchImageUrl,
    frenchArtCropUrl,
    hasFrenchPrint: !!frenchImageUrl,
  };
}

async function processCard(card, index, total) {
  const slug = card.slug;
  const frCardPath = join(frCardsDir, `${slug}.jpg`);
  const frArtPath = join(frArtDir, `${slug}.jpg`);
  const enCardPath = join(enCardsDir, `${slug}.jpg`);
  const enArtPath = join(enArtDir, `${slug}.jpg`);

  const hasFrCard = existsSync(frCardPath);
  const hasFrArt = existsSync(frArtPath);

  // If both images exist on disk already, just ensure item metadata is synced
  if (!isForce && hasFrCard && hasFrArt) {
    const itemJsonPath = join(itemsDir, `${slug}.json`);
    if (existsSync(itemJsonPath)) {
      try {
        const itemData = JSON.parse(readFileSync(itemJsonPath, 'utf8'));
        if (!itemData.image?.localFrenchPath) {
          if (!itemData.image) itemData.image = { url: itemData.imageUrl || '' };
          itemData.image.localFrenchPath = `data/cards/images/fr/cards/${slug}.jpg`;
          itemData.image.localFrenchArtPath = `data/cards/images/fr/art/${slug}.jpg`;
          itemData.localFrenchPath = `data/cards/images/fr/cards/${slug}.jpg`;
          writeFileSync(itemJsonPath, JSON.stringify(itemData, null, 2) + '\n', 'utf8');
        }
      } catch {}
    }
    return {
      status: 'cached',
      name: card.name,
      frenchName: card.frenchName || card.name,
      hasFrenchPrint: true,
    };
  }

  let frenchData;
  if (card.frenchImageUrl && !isForce) {
    frenchData = {
      frenchName: card.frenchName || card.name,
      frenchText: card.frenchText || card.oracleText,
      frenchImageUrl: card.frenchImageUrl,
      frenchArtCropUrl: card.frenchImageUrl.replace('/normal/', '/art_crop/'),
      hasFrenchPrint: true,
    };
  } else {
    frenchData = await resolveFrenchCardData(card);
  }

  const { frenchName, frenchText, frenchImageUrl, frenchArtCropUrl, hasFrenchPrint } = frenchData;

  // 1. Download or copy Card image
  if (isForce || !hasFrCard) {
    if (hasFrenchPrint && frenchImageUrl) {
      const cardRes = await fetchWithRetry(frenchImageUrl, { headers: imgHeaders });
      await sleep(delayMs);
      if (cardRes && cardRes.ok) {
        const buffer = Buffer.from(await cardRes.arrayBuffer());
        writeFileSync(frCardPath, buffer);
      } else {
        if (existsSync(enCardPath)) {
          copyFileSync(enCardPath, frCardPath);
        }
      }
    } else {
      if (existsSync(enCardPath)) {
        copyFileSync(enCardPath, frCardPath);
      }
    }
  }

  // 2. Download or copy Art Crop image
  if (isForce || !hasFrArt) {
    if (hasFrenchPrint && frenchArtCropUrl) {
      const artRes = await fetchWithRetry(frenchArtCropUrl, { headers: imgHeaders });
      await sleep(delayMs);
      if (artRes && artRes.ok) {
        const buffer = Buffer.from(await artRes.arrayBuffer());
        writeFileSync(frArtPath, buffer);
      } else if (existsSync(frCardPath)) {
        copyFileSync(frCardPath, frArtPath);
      } else if (existsSync(enArtPath)) {
        copyFileSync(enArtPath, frArtPath);
      }
    } else {
      if (existsSync(enArtPath)) {
        copyFileSync(enArtPath, frArtPath);
      } else if (existsSync(frCardPath)) {
        copyFileSync(frCardPath, frArtPath);
      }
    }
  }

  // 3. Update individual card JSON document
  const itemJsonPath = join(itemsDir, `${slug}.json`);
  if (existsSync(itemJsonPath)) {
    try {
      const itemData = JSON.parse(readFileSync(itemJsonPath, 'utf8'));
      itemData.frenchName = frenchName;
      itemData.frenchText = frenchText;
      if (frenchImageUrl) {
        itemData.frenchImageUrl = frenchImageUrl;
      }
      if (!itemData.image) {
        itemData.image = { url: itemData.imageUrl || frenchImageUrl || '' };
      }
      itemData.image.localFrenchPath = `data/cards/images/fr/cards/${slug}.jpg`;
      itemData.image.localFrenchArtPath = `data/cards/images/fr/art/${slug}.jpg`;
      itemData.localFrenchPath = `data/cards/images/fr/cards/${slug}.jpg`;

      writeFileSync(itemJsonPath, JSON.stringify(itemData, null, 2) + '\n', 'utf8');
    } catch (err) {
      console.warn(`   ⚠️ Could not update JSON for ${slug}:`, err.message);
    }
  }

  return {
    status: 'success',
    name: card.name,
    frenchName,
    hasFrenchPrint,
  };
}

let successCount = 0;
let fallbackCount = 0;
let errorCount = 0;
let completedCount = 0;

async function runWorkerPool() {
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < cardsToProcess.length) {
      const index = currentIndex++;
      const card = cardsToProcess[index];
      try {
        const res = await processCard(card, index + 1, cardsToProcess.length);
        completedCount++;
        const pct = Math.round((completedCount / cardsToProcess.length) * 100);
        if (res.hasFrenchPrint) {
          successCount++;
          console.log(`   [${completedCount}/${cardsToProcess.length}] (${pct}%) 🇫🇷 ${card.name} -> "${res.frenchName}"`);
        } else {
          fallbackCount++;
          console.log(`   [${completedCount}/${cardsToProcess.length}] (${pct}%) 🇬🇧 ${card.name} (Fallback EN)`);
        }
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
console.log('🎉 French Card Images Download Summary:');
console.log(`   Downloaded in French: ${successCount}`);
console.log(`   Fallback (English copied): ${fallbackCount}`);
console.log(`   Errors: ${errorCount}`);
console.log('=============================================\n');

console.log('🔄 Synchronizing data models with updated French local image paths...');
spawnSync('node', ['scripts/sync-data-models.mjs'], { stdio: 'inherit' });
