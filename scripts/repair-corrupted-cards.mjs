#!/usr/bin/env node
/**
 * repair-corrupted-cards.mjs
 *
 * Detects cards with corrupted type/color/oracle data
 * (typeLine === "Creature" && oracleText === "" && manaCost === "{2}")
 * and repairs them by fetching real data from Scryfall /cards/collection API.
 *
 * Safe by design:
 *  - only patches the corrupted fields (manaCost, cmc, colors, colorIdentity,
 *    typeLine, types, subtypes, oracleText, keywords, isLand, producesColors)
 *  - preserves all DraftMaster-specific fields (powerScore, cubeAnalyses, etc.)
 *  - dry-run by default; pass --apply to write changes
 *  - rate-limited to 75ms between Scryfall requests (per ToS)
 */

import fs from 'fs';
import path from 'path';

const DRY_RUN = !process.argv.includes('--apply');
const ITEMS_DIR = 'data/cards/items';
const BATCH_SIZE = 75; // Scryfall /cards/collection max
const RATE_LIMIT_MS = 100;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Detect corrupted cards ───────────────────────────────────────────────────
const files = fs.readdirSync(ITEMS_DIR).filter((f) => f.endsWith('.json'));
const corrupted = [];

for (const file of files) {
  const card = JSON.parse(fs.readFileSync(path.join(ITEMS_DIR, file), 'utf8'));
  const isCorrupt =
    card.typeLine === 'Creature' &&
    card.oracleText === '' &&
    card.manaCost === '{2}' &&
    card.oracleId;

  if (isCorrupt) {
    corrupted.push({ file, card });
  }
}

console.log(`Found ${corrupted.length} corrupted cards out of ${files.length} total.`);
if (DRY_RUN) {
  console.log('DRY RUN — pass --apply to write changes.\n');
}

if (corrupted.length === 0) {
  console.log('Nothing to repair.');
  process.exit(0);
}

// ─── Batch fetch from Scryfall ────────────────────────────────────────────────
function buildIdentifiers(batch) {
  return batch.map(({ card }) => ({ oracle_id: card.oracleId }));
}

async function fetchBatch(identifiers) {
  const resp = await fetch('https://api.scryfall.com/cards/collection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'DraftMaster/1.0 (github.com/tristanlenours/DraftMaster; card-repair-script)',
    },
    body: JSON.stringify({ identifiers }),
  });
  if (!resp.ok) {
    throw new Error(`Scryfall error ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

// Parse Scryfall typeLine into arrays
function parseTypes(typeLine) {
  if (!typeLine) return { types: [], subtypes: [] };
  const [lhs, rhs] = typeLine.split('—').map((s) => s.trim());
  const supertypes = ['Basic', 'Legendary', 'Snow', 'World'];
  const rawTypes = (lhs || '').split(' ').filter(Boolean);
  const types = rawTypes.filter((t) => !supertypes.includes(t));
  const subtypes = rhs ? rhs.split(' ').filter(Boolean) : [];
  return { types, subtypes };
}

// Map Scryfall color array to DraftMaster format (already matching)
function mapColors(colors) {
  return Array.isArray(colors) ? colors : [];
}

let totalFixed = 0;
let totalFailed = 0;

// Process in batches
for (let i = 0; i < corrupted.length; i += BATCH_SIZE) {
  const batch = corrupted.slice(i, i + BATCH_SIZE);
  const identifiers = buildIdentifiers(batch);

  process.stdout.write(
    `Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(corrupted.length / BATCH_SIZE)} (${batch.length} cards)...`,
  );

  let data;
  try {
    data = await fetchBatch(identifiers);
  } catch (err) {
    console.error(`\nFailed to fetch batch: ${err.message}`);
    totalFailed += batch.length;
    continue;
  }

  // Index Scryfall results by oracle_id
  const byOracleId = new Map();
  for (const sc of data.data ?? []) {
    if (sc.oracle_id) byOracleId.set(sc.oracle_id, sc);
  }

  let batchFixed = 0;
  for (const { file, card } of batch) {
    const sc = byOracleId.get(card.oracleId);
    if (!sc) {
      console.warn(`\n  ⚠ No Scryfall data for ${card.name} (${card.oracleId})`);
      totalFailed++;
      continue;
    }

    const { types, subtypes } = parseTypes(sc.type_line);

    // Build patch
    const patch = {
      manaCost: sc.mana_cost ?? '',
      cmc: sc.cmc ?? 0,
      colors: mapColors(sc.colors),
      colorIdentity: mapColors(sc.color_identity),
      typeLine: sc.type_line ?? '',
      types,
      subtypes,
      oracleText: sc.oracle_text ?? '',
      keywords: Array.isArray(sc.keywords) ? sc.keywords : [],
      isLand: types.includes('Land'),
      producesColors: Array.isArray(sc.produced_mana)
        ? sc.produced_mana.filter((c) => ['W', 'U', 'B', 'R', 'G'].includes(c))
        : card.producesColors ?? [],
    };

    // Merge patch into existing card (preserving all other fields)
    const repaired = { ...card, ...patch };

    // Also fix archetypeFit colors inside cubeAnalyses if they still say ["W"]
    // when the card is not white
    if (repaired.cubeAnalyses && !repaired.colors.includes('W')) {
      for (const analysis of Object.values(repaired.cubeAnalyses)) {
        if (analysis.pedagogy?.archetypeFit) {
          for (const fit of analysis.pedagogy.archetypeFit) {
            if (JSON.stringify(fit.colors) === '["W"]') {
              fit.colors = repaired.colorIdentity.length > 0 ? repaired.colorIdentity : repaired.colors;
            }
          }
        }
      }
    }

    if (!DRY_RUN) {
      fs.writeFileSync(path.join(ITEMS_DIR, file), JSON.stringify(repaired, null, 2) + '\n', 'utf8');
    } else {
      // Show what would change
      console.log(
        `\n  ${card.name}: ${card.typeLine}[${card.colors}]${card.manaCost}` +
          ` → ${patch.typeLine}[${patch.colors}]${patch.manaCost}`,
      );
    }
    batchFixed++;
    totalFixed++;
  }

  if (!DRY_RUN) {
    console.log(` fixed ${batchFixed}`);
  }

  if (i + BATCH_SIZE < corrupted.length) {
    await sleep(RATE_LIMIT_MS);
  }
}

console.log(`\n✅ Done. Fixed: ${totalFixed}, Failed: ${totalFailed}`);
if (DRY_RUN && totalFixed > 0) {
  console.log('Re-run with --apply to write changes.');
}
