import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const rootDir = process.cwd();
const itemsDir = resolve(rootDir, 'data/cards/items');
const rawPath = resolve(rootDir, 'data/cubes/nico_candyshop/cubecobra-raw.json');
const nicoMetaPath = resolve(rootDir, 'data/cubes/nico_candyshop/cube-meta.json');
const nicoCubePath = resolve(rootDir, 'data/cubes/nico_candyshop/cube.json');
const MAX_POWER_SCORE = 55;

export function cardNameToSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

console.log("🍬 Starting Nico's Candyshop (Fedor007) Import...");

// Index existing cards by oracleId, name, and slug so alternate art / flavor skins reuse canonical cards
const existingByOracle = new Map();
const existingByName = new Map();
const existingBySlug = new Map();

for (const file of readdirSync(itemsDir)) {
  if (!file.endsWith('.json')) continue;
  const p = join(itemsDir, file);
  try {
    const doc = JSON.parse(readFileSync(p, 'utf8'));
    const slug = doc.slug || file.replace('.json', '');
    const entry = { path: p, slug, name: doc.name, powerScore: doc.powerScore, doc };
    if (doc.oracleId) {
      existingByOracle.set(doc.oracleId, entry);
    }
    if (doc.name) {
      existingByName.set(doc.name.toLowerCase().trim(), entry);
    }
    existingBySlug.set(slug, entry);
  } catch {}
}

const rawCube = JSON.parse(readFileSync(rawPath, 'utf8'));
const mainboard = rawCube.cards?.mainboard || [];
console.log(`📦 Loaded ${mainboard.length} cards from CubeCobra raw archive.`);

// Power 9 and Vintage Iconic Staples that are always Tier S
const VINTAGE_S_TIER = new Set([
  'Black Lotus',
  'Mox Pearl',
  'Mox Sapphire',
  'Mox Jet',
  'Mox Ruby',
  'Mox Emerald',
  'Ancestral Recall',
  'Time Walk',
  'Timetwister',
  'Sol Ring',
  'Mana Crypt',
  'Mana Vault',
  'Tinker',
  'Channel',
  'Fastbond',
  'Oko, Thief of Crowns',
  'Minsc & Boo, Timeless Heroes',
  'Ragavan, Nimble Pilferer',
  'Strip Mine',
  'Library of Alexandria',
  'Tolarian Academy',
  'Vampiric Tutor',
  'Demonic Tutor',
  'Flash',
  'Sneak Attack',
  'Griselbrand',
  'Archon of Cruelty',
  'Bolas\'s Citadel',
  'Yawgmoth\'s Will',
  'Time Vault',
  'Underworld Breach',
]);

const VALID_ROLES = [
  'bomb',
  'engine',
  'premium_removal',
  'situational_removal',
  'mana_ramp',
  'mana_fixing',
  'beater',
  'finisher',
  'card_advantage',
  'synergy_enabler',
  'synergy_payoff',
  'cantrip',
];

const VALID_MTG_COLORS = new Set(['W', 'U', 'B', 'R', 'G']);

let updatedExisting = 0;
let createdNew = 0;
const nicoCardIndex = [];

for (const entry of mainboard) {
  const d = entry.details;
  if (!d || !d.name) continue;

  let slug = cardNameToSlug(d.name);
  let cardPath = join(itemsDir, `${slug}.json`);
  let cardName = d.name;

  let existing = null;
  if (d.oracle_id && existingByOracle.has(d.oracle_id)) {
    existing = existingByOracle.get(d.oracle_id);
  } else if (existingByName.has(d.name.toLowerCase().trim())) {
    existing = existingByName.get(d.name.toLowerCase().trim());
  } else if (existingBySlug.has(slug)) {
    existing = existingBySlug.get(slug);
  }

  if (existing) {
    slug = existing.slug;
    cardPath = existing.path;
    cardName = existing.name;
  }

  // Calculate Tier in Candyshop directly from Power Score and signatures
  const cardScore = existing?.powerScore?.score ?? existing?.doc?.powerScore?.score ?? 25;
  let tier = 'B';
  let fit = 'support';
  let scoreModifier = 0;

  if (cardName === 'Orcish Bowmasters') {
    tier = 'A';
    fit = 'support';
    scoreModifier = 8;
  } else if (cardName === 'Counterspell') {
    tier = 'B';
    fit = 'support';
    scoreModifier = 0;
  } else if (cardName === 'Underworld Breach' || cardName === 'Brain Freeze' || cardName === "Lion's Eye Diamond") {
    tier = 'S';
    fit = 'staple';
    scoreModifier = 7;
  } else if (cardName === 'Lightning Bolt') {
    tier = 'B';
    fit = 'support';
    scoreModifier = 0;
  } else if (VINTAGE_S_TIER.has(cardName) || cardScore >= 38) {
    tier = 'S';
    fit = 'staple';
    scoreModifier = 15;
  } else if (cardScore >= 26) {
    tier = 'A';
    fit = 'support';
    scoreModifier = 8;
  } else if (cardScore >= 17) {
    tier = 'B';
    fit = 'support';
    scoreModifier = 0;
  } else if (cardScore >= 10) {
    tier = 'C';
    fit = 'filler';
    scoreModifier = -5;
  } else {
    tier = 'D';
    fit = 'filler';
    scoreModifier = -10;
  }

  // Strict invariant: no card in Tier S with powerScore < 38
  if (tier === 'S' && cardScore < 38) {
    tier = cardScore >= 26 ? 'A' : cardScore >= 17 ? 'B' : cardScore >= 10 ? 'C' : 'D';
    fit = 'support';
    scoreModifier = tier === 'A' ? 8 : tier === 'B' ? 0 : -5;
  }

  // Determine Archetypes
  const archetypes = [];
  const oracleLower = (d.oracle_text || '').toLowerCase();
  const typeLower = (d.type || '').toLowerCase();

  if (oracleLower.includes('storm') || oracleLower.includes('add ') || oracleLower.includes('instant or sorcery')) {
    archetypes.push('nico:storm_combo');
  }
  if (typeLower.includes('artifact') || oracleLower.includes('artifact') || oracleLower.includes('tinker')) {
    archetypes.push('nico:artifact_ramp');
  }
  if (archetypes.length === 0) {
    archetypes.push('nico:vintage_staple');
  }

  let synergyTags = (d.oracle_tags && d.oracle_tags.length > 0)
    ? d.oracle_tags.slice(0, 3).map((t) => t.replace(/[^a-z0-9_-]/g, ''))
    : ['vintage_power'];

  if (cardName === 'Underworld Breach' || cardName === 'Brain Freeze' || cardName === "Lion's Eye Diamond") {
    archetypes.length = 0;
    archetypes.push('nico:storm_combo');
    synergyTags = ['engine:storm', 'combo', 'graveyard'];
  }

  const nicoAnalysis = {
    cubeKey: 'nico_candyshop',
    fit,
    tier,
    archetypes,
    synergyTags,
    scoreModifier,
    analysis: `Sélectionné pour le Vintage Candyshop Cube de Fedor. Carte d'impact majeur sur le Tour Fondamental (T1-T3).`,
    pedagogy: {
      howToPlay: `Prioriser sur courbe pour accélérer ou neutraliser les sorties explosives adverses.`,
      archetypeFit: [
        {
          colors: d.colors && d.colors.length > 0 ? d.colors.filter((c) => VALID_MTG_COLORS.has(c)) : ['W'],
          archetype: archetypes[0].replace('nico:', '').replace('_', ' ').toUpperCase(),
          grade: tier,
          winrateOrScore: `Score ${cardScore.toFixed(1)}`,
          comment: `Alignement Vintage compétitif.`,
        },
      ],
    },
  };

  nicoCardIndex.push({
    slug,
    name: cardName,
    oracleId: d.oracle_id || '00000000-0000-4000-8000-000000000000',
    tier,
    fit,
    scoreModifier,
  });

  if (existsSync(cardPath)) {
    // Update existing card document
    try {
      const cardDoc = JSON.parse(readFileSync(cardPath, 'utf8'));
      if (!cardDoc.presentInCubes.includes('nico_candyshop')) {
        cardDoc.presentInCubes.push('nico_candyshop');
      }
      cardDoc.cubeAnalyses = cardDoc.cubeAnalyses || {};
      cardDoc.cubeAnalyses.nico_candyshop = nicoAnalysis;
      writeFileSync(cardPath, JSON.stringify(cardDoc, null, 2) + '\n', 'utf8');
      updatedExisting++;
    } catch (err) {
      console.error(`Error updating existing ${slug}:`, err.message);
    }
  } else {
    // Create new card document from CubeCobra Scryfall details
    const parts = (d.type || 'Card').split('—').map((s) => s.trim());
    const typeWords = parts[0].split(/\s+/).filter(Boolean);
    const subtypes = parts[1] ? parts[1].split(/\s+/).filter(Boolean) : [];

    const isLand = typeWords.includes('Land');
    const colors = (d.colors || []).filter((c) => VALID_MTG_COLORS.has(c));
    const colorIdentity = (d.color_identity || []).filter((c) => VALID_MTG_COLORS.has(c));
    const producesColors = (d.produced_mana || []).filter((c) => VALID_MTG_COLORS.has(c));

    // Determine roles
    const roles = [];
    if (d.name.includes('Mox') || d.name.includes('Lotus') || oracleLower.includes('add {') || oracleLower.includes('search your library for a land')) {
      roles.push('mana_ramp');
    }
    if (oracleLower.includes('destroy') || oracleLower.includes('exile') || oracleLower.includes('damage') || oracleLower.includes('counter target')) {
      roles.push('premium_removal');
    }
    if (oracleLower.includes('draw') || oracleLower.includes('look at the top')) {
      roles.push('card_advantage');
    }
    if (roles.length === 0) {
      roles.push(tier === 'S' ? 'bomb' : 'engine');
    }

    const imageUrl =
      d.image_normal ||
      `https://api.scryfall.com/cards/${d.scryfall_id}?format=image`;
    const artCropUrl =
      d.art_crop ||
      `https://api.scryfall.com/cards/${d.scryfall_id}?format=image&version=art_crop`;

    const newCardDoc = {
      schemaVersion: 1,
      slug,
      name: d.name,
      oracleId: d.oracle_id || '00000000-0000-4000-8000-000000000000',
      manaCost: d.parsed_cost ? d.parsed_cost.map((c) => `{${c.toUpperCase()}}`).join('') : (isLand ? '' : '{0}'),
      cmc: d.cmc ?? 0,
      colors,
      colorIdentity,
      typeLine: d.type || 'Card',
      types: typeWords,
      subtypes,
      oracleText: d.oracle_text || '',
      keywords: d.keywords || [],
      power: d.power ? String(d.power) : undefined,
      toughness: d.toughness ? String(d.toughness) : undefined,
      isLand,
      producesColors,
      image: {
        url: imageUrl,
        localPath: `data/cards/images/${slug}.jpg`,
        artCropUrl,
      },
      imageUrl,
      powerScore: {
        score: cardScore,
        source: 'expert_heuristic',
        rawSourceScore: cardScore,
        harmonizationDegree: 'native',
        confidence: 0.9,
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
      presentInCubes: ['nico_candyshop'],
      objectiveAnalysis: {
        summary: `Carte Vintage sélectionnée pour le Candyshop de Fedor (Score : ${cardScore.toFixed(1)}).`,
        roles,
        floorRating: Math.min(9.5, Math.max(1, Math.round((cardScore / 5.5) * 0.85 * 10) / 10)),
        ceilingRating: Math.min(10, Math.max(2, Math.round((cardScore / 5.5) * 1.05 * 10) / 10)),
        tempoImpact: tier === 'S' || tier === 'A' ? 'high' : 'medium',
        quadrantStrengths: {
          opening: tier === 'S' ? 4.8 : 4.0,
          developing: tier === 'S' ? 4.9 : 4.2,
          parity: 3.8,
          behind: tier === 'S' ? 4.2 : 3.5,
        },
      },
      cubeAnalyses: {
        nico_candyshop: nicoAnalysis,
      },
    };

    writeFileSync(cardPath, JSON.stringify(newCardDoc, null, 2) + '\n', 'utf8');
    createdNew++;
  }
}

console.log(`✅ Cards processed: ${updatedExisting} updated, ${createdNew} created.`);

// Update nico_candyshop/cube-meta.json
const nicoMeta = JSON.parse(readFileSync(nicoMetaPath, 'utf8'));
nicoMeta.cardCount = mainboard.length;
nicoMeta.coverImage = 'data/cubes/nico_candyshop/candyShop.jpg';
writeFileSync(nicoMetaPath, JSON.stringify(nicoMeta, null, 2) + '\n', 'utf8');
console.log(`✅ Updated nico_candyshop/cube-meta.json (cardCount: ${nicoMeta.cardCount})`);

// Update nico_candyshop/cube.json
const nicoCube = JSON.parse(readFileSync(nicoCubePath, 'utf8'));
nicoCube.cardCount = mainboard.length;
nicoCube.coverImage = 'data/cubes/nico_candyshop/candyShop.jpg';
nicoCube.cardIndex = nicoCardIndex;
writeFileSync(nicoCubePath, JSON.stringify(nicoCube, null, 2) + '\n', 'utf8');
console.log(`✅ Generated nico_candyshop/cube.json with ${nicoCardIndex.length} cards indexed.`);
