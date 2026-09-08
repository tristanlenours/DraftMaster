import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const rootDir = process.cwd();
const masterPath = resolve(rootDir, 'data/cards/master-cards.json');
const itemsDir = resolve(rootDir, 'data/cards/items');

const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}

const targetCube = getArg('--cube', 'titou_tribal');
const limitArg = getArg('--limit', null);
const limit = limitArg ? parseInt(limitArg, 10) : null;
const delayMs = parseInt(getArg('--delay', '150'), 10);
const isAll = args.includes('--all');
const isForce = args.includes('--force');

console.log('🇫🇷 Starting French Card Text Downloader...');
console.log(`   Cube target: ${isAll ? 'ALL CUBES' : targetCube}`);
console.log(`   Limit: ${limit !== null ? limit : 'No limit'}`);
console.log(`   Delay between API calls: ${delayMs}ms`);

const masterRaw = readFileSync(masterPath, 'utf8');
const master = JSON.parse(masterRaw);
const cardsObj = master.cards || {};
const cardList = Object.values(cardsObj);

const candidateCards = cardList.filter((card) => {
  if (isAll) return true;
  return card.presentInCubes && card.presentInCubes.includes(targetCube);
});

console.log(`📋 Found ${candidateCards.length} matching cards for target.`);

const cardsToProcess = limit ? candidateCards.slice(0, limit) : candidateCards;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let fetchedCount = 0;
let skippedCount = 0;
let notFoundCount = 0;

for (let i = 0; i < cardsToProcess.length; i++) {
  const card = cardsToProcess[i];
  if (!isForce && card.frenchImageUrl && card.frenchImageUrl.trim().length > 0) {
    skippedCount++;
    continue;
  }

  const cleanName = card.name.split(' // ')[0].trim();
  const searchUrl = `https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cleanName)}%22+lang%3Afr`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'DraftMaster/1.0 (local-french-cache; github.com/tristanlenours/DraftMaster)',
        Accept: 'application/json;q=0.9,*/*;q=0.8',
      },
    });

    if (res.status === 429) {
      console.warn(`⏳ Rate limited (429) on ${card.name}, pausing 60s before retry...`);
      await sleep(62000);
      i--;
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const prints = data.data || [];
      const match =
        prints.find((p) => p.name === card.name && (p.image_uris || p.card_faces?.[0]?.image_uris)) ||
        prints.find((p) => p.image_uris || p.card_faces?.[0]?.image_uris) ||
        prints[0];

      if (match) {
        if (match.card_faces && match.card_faces.length > 0) {
          card.frenchName = match.printed_name || match.card_faces.map((f) => f.printed_name || f.name).join(' // ');
          card.frenchText = match.card_faces
            .map((f) => {
              const fName = f.printed_name || f.name;
              const fText = f.printed_text || f.oracle_text || '';
              return `${fName}\n${fText}`.trim();
            })
            .join('\n\n---\n\n');
        } else {
          card.frenchName = match.printed_name || card.name;
          card.frenchText = match.printed_text || match.oracle_text || card.oracleText;
        }

        const fImg = match.image_uris?.normal || match.card_faces?.[0]?.image_uris?.normal || null;
        if (fImg) {
          card.frenchImageUrl = fImg;
        }

        fetchedCount++;
        console.log(`[${i + 1}/${cardsToProcess.length}] ✅ ${card.name} -> "${card.frenchName}" (Image: ${fImg ? 'Yes' : 'No'})`);
      } else {
        card.frenchName = card.name;
        card.frenchText = card.oracleText;
        notFoundCount++;
        console.log(`[${i + 1}/${cardsToProcess.length}] ⚠️  ${card.name} (No print with text found)`);
      }
    } else {
      card.frenchName = card.name;
      card.frenchText = card.oracleText;
      notFoundCount++;
      console.log(`[${i + 1}/${cardsToProcess.length}] ℹ️  ${card.name} (Not found in FR, fallback EN)`);
    }

    if (card.slug) {
      const itemPath = join(itemsDir, `${card.slug}.json`);
      if (existsSync(itemPath)) {
        try {
          const itemRaw = readFileSync(itemPath, 'utf8');
          const itemJson = JSON.parse(itemRaw);
          itemJson.frenchName = card.frenchName;
          itemJson.frenchText = card.frenchText;
          if (card.frenchImageUrl) {
            itemJson.frenchImageUrl = card.frenchImageUrl;
          }
          writeFileSync(itemPath, JSON.stringify(itemJson, null, 2) + '\n', 'utf8');
        } catch {}
      }
    }

    if ((i + 1) % 20 === 0) {
      writeFileSync(masterPath, JSON.stringify(master, null, 2) + '\n', 'utf8');
      console.log(`💾 Progress saved (${i + 1}/${cardsToProcess.length})...`);
    }

    await sleep(delayMs);
  } catch (err) {
    console.error(`❌ Error fetching ${card.name}:`, err.message);
    card.frenchName = card.name;
    card.frenchText = card.oracleText;
  }
}

writeFileSync(masterPath, JSON.stringify(master, null, 2) + '\n', 'utf8');
console.log('\n======================================================');
console.log('🎉 French text download finished!');
console.log(`   Fetched: ${fetchedCount}`);
console.log(`   Skipped: ${skippedCount}`);
console.log(`   Fallback/Not found: ${notFoundCount}`);
console.log('======================================================\n');
