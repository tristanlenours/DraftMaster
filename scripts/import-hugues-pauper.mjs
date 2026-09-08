import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const rootDir = process.cwd();
const itemsDir = resolve(rootDir, 'data/cards/items');
const rawPath = resolve(rootDir, 'data/cubes/hugues_pauper/cubecobra-raw.json');
const huguesMetaPath = resolve(rootDir, 'data/cubes/hugues_pauper/cube-meta.json');
const huguesCubePath = resolve(rootDir, 'data/cubes/hugues_pauper/cube.json');

export function cardNameToSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

console.log("🛡️ Starting Huge's Pauper Cube Import...");

// 1. Index existing cards in data/cards/items
const existingByOracle = new Map();
const existingByName = new Map();
const existingBySlug = new Map();

for (const file of readdirSync(itemsDir)) {
  if (!file.endsWith('.json')) continue;
  const p = join(itemsDir, file);
  try {
    const doc = JSON.parse(readFileSync(p, 'utf8'));
    const slug = doc.slug || file.replace('.json', '');
    if (doc.oracleId) {
      existingByOracle.set(doc.oracleId, { path: p, slug, name: doc.name, doc });
    }
    if (doc.name) {
      existingByName.set(doc.name.toLowerCase().trim(), { path: p, slug, name: doc.name, doc });
    }
    existingBySlug.set(slug, { path: p, slug, name: doc.name, doc });
  } catch {}
}

const rawCube = JSON.parse(readFileSync(rawPath, 'utf8'));
const mainboard = rawCube.cards?.mainboard || [];
console.log(`📦 Loaded ${mainboard.length} cards from CubeCobra raw archive.`);

// Preserved Hugues Seed Cards (do not override)
const PRESERVED_SEED_NAMES = new Set([
  'counterspell',
  'gurmag angler',
  'lightning bolt',
  'mulldrifter',
  'ninja of the deep hours',
  'snuff out',
  'preordain',
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
const processedSlugs = new Set();
const huguesCardIndex = [];

for (const entry of mainboard) {
  const d = entry.details;
  if (!d || !d.name) continue;

  let slug = cardNameToSlug(d.name);
  let cardPath = join(itemsDir, `${slug}.json`);
  let cardName = d.name;
  let existingEntry = null;

  if (d.oracle_id && existingByOracle.has(d.oracle_id)) {
    existingEntry = existingByOracle.get(d.oracle_id);
  } else if (existingByName.has(d.name.toLowerCase().trim())) {
    existingEntry = existingByName.get(d.name.toLowerCase().trim());
  } else if (existingBySlug.has(slug)) {
    existingEntry = existingBySlug.get(slug);
  }

  if (existingEntry) {
    slug = existingEntry.slug;
    cardPath = existingEntry.path;
    cardName = existingEntry.name;
  }

  processedSlugs.add(slug);

  const elo = d.elo || 1200;
  const isPreserved = PRESERVED_SEED_NAMES.has(cardName.toLowerCase().trim());

  let tier = 'B';
  let fit = 'support';
  let scoreModifier = 0;

  if (isPreserved && existingEntry?.doc?.cubeAnalyses?.hugues_pauper) {
    const prev = existingEntry.doc.cubeAnalyses.hugues_pauper;
    tier = prev.tier || 'S';
    fit = prev.fit || 'staple';
    scoreModifier = prev.scoreModifier ?? 10;
  } else {
    // Determine Tier in Pauper Cube
    if (elo >= 1420) {
      tier = 'S';
      fit = 'staple';
      scoreModifier = 12;
    } else if (elo >= 1300) {
      tier = 'A';
      fit = 'support';
      scoreModifier = 7;
    } else if (elo >= 1200) {
      tier = 'B';
      fit = 'support';
      scoreModifier = 0;
    } else if (elo >= 1100) {
      tier = 'C';
      fit = 'filler';
      scoreModifier = -5;
    } else {
      tier = 'D';
      fit = 'filler';
      scoreModifier = -10;
    }
  }

  // Determine Archetype
  const archetypes = [];
  const colors = (d.colors || []).filter((c) => VALID_MTG_COLORS.has(c));
  const oracleLower = (d.oracle_text || '').toLowerCase();
  const typeLower = (d.type || '').toLowerCase();

  const isW = colors.includes('W');
  const isU = colors.includes('U');
  const isB = colors.includes('B');
  const isR = colors.includes('R');
  const isG = colors.includes('G');

  if ((isU && isW) || (isW && oracleLower.includes('return') && oracleLower.includes('hand'))) {
    archetypes.push('hugues:azorius_blink');
  } else if ((isU && isB) || (isU && (oracleLower.includes('ninja') || typeLower.includes('faerie')))) {
    archetypes.push('hugues:faeries_ninjas_tempo');
  } else if ((isB && isR) || (isB && oracleLower.includes('destroy target') && isR)) {
    archetypes.push('hugues:rakdos_attrition');
  } else if ((isR && isG) || (isG && oracleLower.includes('trample'))) {
    archetypes.push('hugues:gruul_stompy');
  } else if ((isG && isW) || (isW && oracleLower.includes('token') && isG)) {
    archetypes.push('hugues:selesnya_tokens');
  } else if ((isW && isB) || (isB && oracleLower.includes('extort'))) {
    archetypes.push('hugues:orzhov_drain_extort');
  } else if ((isU && isR) || (isR && (oracleLower.includes('instant or sorcery') || oracleLower.includes('prowess')))) {
    archetypes.push('hugues:izzet_spellslinger');
  } else if ((isB && isG) || (isB && (oracleLower.includes('delve') || oracleLower.includes('graveyard') || oracleLower.includes('morbid')))) {
    archetypes.push('hugues:golgari_graveyard');
  } else if ((isR && isW) || (isR && oracleLower.includes('damage to any target') && isW)) {
    archetypes.push('hugues:boros_synth_tokens');
  } else if ((isG && isU) || (isG && (oracleLower.includes('additional land') || oracleLower.includes('draw a card')))) {
    archetypes.push('hugues:simic_ramp_value');
  } else {
    archetypes.push('hugues:pauper_staple');
  }

  const synergyTags = (d.oracle_tags && d.oracle_tags.length > 0)
    ? d.oracle_tags.slice(0, 3).map((t) => t.replace(/[^a-z0-9_-]/g, ''))
    : ['pauper_fundamental'];

  let huguesAnalysis;
  if (isPreserved && existingEntry?.doc?.cubeAnalyses?.hugues_pauper) {
    huguesAnalysis = existingEntry.doc.cubeAnalyses.hugues_pauper;
  } else {
    huguesAnalysis = {
      cubeKey: 'hugues_pauper',
      fit,
      tier,
      archetypes,
      synergyTags,
      scoreModifier,
      analysis: `Sélectionné pour le Pauper Cube de Hugues. Pièce fondamentale valorisant le tempo et les échanges 2-pour-1 sur le Tour Pivot (T4-T5).`,
      pedagogy: {
        howToPlay: `Optimiser les échanges de ressources et stabiliser la présence sur table vers le tour 4.`,
        archetypeFit: [
          {
            colors: colors.length > 0 ? colors : ['W'],
            archetype: (archetypes[0] || 'hugues:pauper_staple').replace('hugues:', '').replace(/_/g, ' ').toUpperCase(),
            grade: tier,
            winrateOrScore: `${Math.min(68, Math.max(48, Math.round((50 + (elo - 1200) / 20) * 10) / 10)).toFixed(1)} %`,
            comment: `Pilier du métagame Pauper équilibré.`,
          },
        ],
      },
    };
  }

  huguesCardIndex.push({
    slug,
    name: cardName,
    oracleId: d.oracle_id || existingEntry?.doc?.oracleId || '00000000-0000-4000-8000-000000000000',
    tier,
    fit,
    scoreModifier,
  });

  if (existsSync(cardPath)) {
    try {
      const cardDoc = JSON.parse(readFileSync(cardPath, 'utf8'));
      if (!cardDoc.presentInCubes.includes('hugues_pauper')) {
        cardDoc.presentInCubes.push('hugues_pauper');
      }
      cardDoc.cubeAnalyses = cardDoc.cubeAnalyses || {};
      cardDoc.cubeAnalyses.hugues_pauper = huguesAnalysis;
      writeFileSync(cardPath, JSON.stringify(cardDoc, null, 2) + '\n', 'utf8');
      updatedExisting++;
    } catch (err) {
      console.error(`Error updating existing ${slug}:`, err.message);
    }
  } else {
    const parts = (d.type || 'Card').split('—').map((s) => s.trim());
    const typeWords = parts[0].split(/\s+/).filter(Boolean);
    const subtypes = parts[1] ? parts[1].split(/\s+/).filter(Boolean) : [];

    const isLand = typeWords.includes('Land');
    const colorIdentity = (d.color_identity || []).filter((c) => VALID_MTG_COLORS.has(c));
    const producesColors = (d.produced_mana || []).filter((c) => VALID_MTG_COLORS.has(c));

    const roles = [];
    if (d.name.includes('Mox') || oracleLower.includes('add {') || oracleLower.includes('search your library for a basic land')) {
      roles.push('mana_ramp');
    }
    if (oracleLower.includes('destroy') || oracleLower.includes('exile') || oracleLower.includes('damage to any target') || oracleLower.includes('counter target')) {
      roles.push('premium_removal');
    }
    if (oracleLower.includes('draw a card') || oracleLower.includes('draw two cards')) {
      roles.push('card_advantage');
    }
    if (roles.length === 0) {
      roles.push(tier === 'S' ? 'bomb' : 'beater');
    }

    const calculatedPowerScore = Math.min(
      50,
      Math.max(1, Math.round(((elo - 900) / 15) * 10) / 10)
    );

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
      power: d.power !== undefined && d.power !== null ? String(d.power) : undefined,
      toughness: d.toughness !== undefined && d.toughness !== null ? String(d.toughness) : undefined,
      isLand,
      producesColors,
      image: {
        url: imageUrl,
        localPath: `data/cards/images/cards/${slug}.jpg`,
        artCropUrl,
        localArtPath: `data/cards/images/art/${slug}.jpg`,
      },
      imageUrl,
      powerScore: {
        score: calculatedPowerScore,
        source: 'cubecobra_elo',
        rawSourceScore: Math.round(elo * 10) / 10,
        harmonizationDegree: 'calibrated_medium',
        confidence: 0.6,
        updatedAt: '2026-09-06T00:00:00.000Z',
      },
      presentInCubes: ['hugues_pauper'],
      objectiveAnalysis: {
        summary: `Carte commune sélectionnée pour le Pauper Cube de Hugues (ELO CubeCobra: ${Math.round(elo)}).`,
        roles,
        floorRating: Math.min(10, Math.max(1, Math.round((elo / 200) * 10) / 10)),
        ceilingRating: Math.min(10, Math.max(1, Math.round(((elo + 200) / 200) * 10) / 10)),
        tempoImpact: tier === 'S' || tier === 'A' ? 'high' : 'medium',
        quadrantStrengths: {
          opening: tier === 'S' ? 4.5 : 3.8,
          developing: tier === 'S' ? 4.8 : 4.0,
          parity: 3.5,
          behind: tier === 'S' ? 4.0 : 3.2,
        },
      },
      cubeAnalyses: {
        hugues_pauper: huguesAnalysis,
      },
    };

    writeFileSync(cardPath, JSON.stringify(newCardDoc, null, 2) + '\n', 'utf8');
    createdNew++;
  }
}

// 2. Also ensure pre-seeded cards that are not in mainboard are kept in index
for (const seedName of PRESERVED_SEED_NAMES) {
  const existing = existingByName.get(seedName);
  if (existing && !processedSlugs.has(existing.slug)) {
    const ana = existing.doc.cubeAnalyses?.hugues_pauper;
    huguesCardIndex.push({
      slug: existing.slug,
      name: existing.name,
      oracleId: existing.doc.oracleId,
      tier: ana?.tier || 'S',
      fit: ana?.fit || 'staple',
      scoreModifier: ana?.scoreModifier || 10,
    });
  }
}

// Sort index by Tier, then name
const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
huguesCardIndex.sort((a, b) => {
  const tA = tierOrder[a.tier] ?? 99;
  const tB = tierOrder[b.tier] ?? 99;
  if (tA !== tB) return tA - tB;
  return a.name.localeCompare(b.name);
});

console.log(`✅ Cards processed: ${updatedExisting} updated, ${createdNew} created.`);
console.log(`📊 Total Hugues Card Index: ${huguesCardIndex.length} cards.`);

// 3. Update cube-meta.json
const huguesMeta = JSON.parse(readFileSync(huguesMetaPath, 'utf8'));
huguesMeta.cardCount = huguesCardIndex.length;
huguesMeta.coverImage = 'data/cubes/hugues_pauper/pauperCube.jpg';

// Add all 10 Pauper archetypes to meta if not present
const archetypesDefinitions = [
  {
    id: 'hugues:azorius_blink',
    name: 'Azorius Blink and Attrition',
    primaryColors: ['W', 'U'],
    category: 'control',
    description: "Moteur de value ultime en Pauper : réactivation continue d'effets d'arrivée en jeu de Mulldrifter et d'inspecteurs.",
    gameplan: "Stabiliser les premiers tours avec des cantrips et créatures défensives, évoquer Mulldrifter pour piocher et submerger l'adversaire.",
    keyCards: ['24d0f5e7-0d9e-4b76-900e-a7274e80312d', '054a0193-861e-4644-ab0a-8aa33407abc8', '3cbb5045-8566-4279-b7d3-3e599b11ccc5'],
    supportCards: ['caa02547-66e3-4e27-a2d3-5e94f3e7a069'],
    recommendedCreatureCount: [12, 16],
    recommendedRemovalCount: [5, 8],
  },
  {
    id: 'hugues:faeries_ninjas_tempo',
    name: 'Dimir / Mono-U Faeries and Ninjas',
    primaryColors: ['U'],
    splashColors: ['B'],
    category: 'midrange',
    description: "Menaces évasives à 1 mana réactivées par Ninjutsu pour générer du card advantage continu protégé par Counterspell.",
    gameplan: "Poser une créature évasive T1 (Faerie Seer), attaquer T2 pour Ninjutsu avec Ninja of the Deep Hours, et garder la mana ouverte pour contrer.",
    keyCards: ['1f3c2b00-0000-4ae1-9650-9553accac52e', 'b2e65e8b-5f08-4cc2-ab1d-00f8903dbea2', '11111111-aaaa-4000-8000-000000000002'],
    supportCards: ['11111111-aaaa-4000-8000-000000000005'],
    recommendedCreatureCount: [14, 18],
    recommendedRemovalCount: [4, 7],
  },
  {
    id: 'hugues:rakdos_attrition',
    name: 'Rakdos Attrition and Removal',
    primaryColors: ['B', 'R'],
    category: 'midrange',
    description: "Destruction systématique des menaces adverses couplée à du sacrifice et de la défausse disruptive.",
    gameplan: "Éliminer les créatures clés avec Terminate et Cast Down, vider les ressources adverses avec Blightning et clore aux attaquants récursifs.",
    keyCards: ['6257c2fd-005f-41e3-8a72-af76df1eb134', 'a6496440-dc0c-4d9b-bf37-f537b6f0187b', 'cdaab6b0-1a2d-4809-8e6b-56013acd8f78'],
    supportCards: ['4457ed35-7c10-48c8-9776-456485fdf070'],
    recommendedCreatureCount: [13, 17],
    recommendedRemovalCount: [6, 9],
  },
  {
    id: 'hugues:gruul_stompy',
    name: 'Gruul Stompy and Aggro',
    primaryColors: ['R', 'G'],
    category: 'aggro',
    description: "Déploiement rapide de menaces musclées au-dessus de la courbe de stat standard, amplifiées par le piétinement.",
    gameplan: "Enchaîner les créatures agressives avec Rancor, exploiter Horned Kavu pour rentabiliser les ETB et achever au blast.",
    keyCards: ['14817050-9f2d-453f-b36b-e6429fa29165', '13f63b98-40b0-499b-bb5d-640b95a6ea1c', '9d2d6479-531c-4ce1-b52b-00e36fa63b64'],
    supportCards: ['4457ed35-7c10-48c8-9776-456485fdf070'],
    recommendedCreatureCount: [16, 20],
    recommendedRemovalCount: [4, 6],
  },
  {
    id: 'hugues:selesnya_tokens',
    name: 'Selesnya Tokens and Go-Wide',
    primaryColors: ['G', 'W'],
    category: 'aggro',
    description: "Armée de créatures au sol et d'auras protectrices submergeant la défense adverse par le nombre et le Convoke.",
    gameplan: "Développer de multiples corps sur table, poser Armadillo Cloak ou Qasali Pridemage pour dominer les phases d'attaque.",
    keyCards: ['10821e37-8a83-4d8e-a12f-249a10933a22', '15397a59-70a8-441f-abf7-230405a1602b', '54b3ccdc-e5b0-44d9-bc81-a296fc5dc005'],
    supportCards: ['8b33d890-7d67-44a8-a253-e2b171d7ca9d'],
    recommendedCreatureCount: [16, 20],
    recommendedRemovalCount: [3, 5],
  },
  {
    id: 'hugues:orzhov_drain_extort',
    name: 'Orzhov Drain and Attrition',
    primaryColors: ['W', 'B'],
    category: 'midrange',
    description: "Contrôle à l'usure drainant les points de vie adverses via Extorquer, removals inconditionnels et créatures volantes.",
    gameplan: "Contrôler le tempo avec Pillory of the Sleepless et Unmake tout en drainant à chaque sort avec Kingpin's Pet.",
    keyCards: ['1c4561d1-377c-4a6a-b7a2-8ce81efa39c6', '74776491-29c3-46e6-989b-cf9a00bbfcef', 'c551ba63-2a74-439d-8996-d566e2efbd5f'],
    supportCards: ['caa02547-66e3-4e27-a2d3-5e94f3e7a069'],
    recommendedCreatureCount: [13, 17],
    recommendedRemovalCount: [6, 9],
  },
  {
    id: 'hugues:izzet_spellslinger',
    name: 'Izzet Spellslinger and Tempo',
    primaryColors: ['U', 'R'],
    category: 'midrange',
    description: "Enchaînement de cantrips et de blasts à bas coût activant la prouesse et le double-spelling.",
    gameplan: "Optimiser le tempo avec Fire // Ice et Lightning Bolt pour maintenir la table propre tout en agressant.",
    keyCards: ['ae92942b-919c-4ea9-b693-85fcef765d5a', '4457ed35-7c10-48c8-9776-456485fdf070', '790e3c9e-7d94-43f7-bc14-d83c7d4c889e'],
    supportCards: ['11111111-aaaa-4000-8000-000000000009'],
    recommendedCreatureCount: [10, 14],
    recommendedRemovalCount: [6, 9],
  },
  {
    id: 'hugues:golgari_graveyard',
    name: 'Golgari Delve and Morbid',
    primaryColors: ['B', 'G'],
    category: 'midrange',
    description: "Exploitation du cimetière pour accélérer des menaces Delve colossales comme Gurmag Angler.",
    gameplan: "Remplir le cimetière par des échanges agressifs ou de l'auto-meule, poser Gurmag Angler pour 1 mana et verrouiller le sol.",
    keyCards: ['16b723bc-aab9-40f2-8e1b-b9c2bd2af3bc', 'a465ba74-615a-4261-b4a0-fcb0819f10b3', '53fd9fb1-c28f-4d73-bf98-94cdab418f21'],
    supportCards: ['22222222-bbbb-4000-8000-000000000003'],
    recommendedCreatureCount: [14, 18],
    recommendedRemovalCount: [5, 8],
  },
  {
    id: 'hugues:boros_synth_tokens',
    name: 'Boros Synthesizer and Burn',
    primaryColors: ['R', 'W'],
    category: 'aggro',
    description: "Moteur d'artefacts récursifs générant des jetons, de la pioche impulsive et un finish dévastateur aux blasts.",
    gameplan: "Enchaîner Thraben Inspector et Goblin Legionnaire, rejouer les artefacts avec Kor Skyfisher, puis achever aux Lightning Bolt.",
    keyCards: ['caa02547-66e3-4e27-a2d3-5e94f3e7a069', '582fdfbe-c5fe-45d0-b3ff-e66db5183725', '4457ed35-7c10-48c8-9776-456485fdf070'],
    supportCards: ['054a0193-861e-4644-ab0a-8aa33407abc8'],
    recommendedCreatureCount: [15, 19],
    recommendedRemovalCount: [5, 8],
  },
  {
    id: 'hugues:simic_ramp_value',
    name: 'Simic Ramp and Tempo Value',
    primaryColors: ['G', 'U'],
    category: 'ramp',
    description: "Développement accéléré du mana, créatures cantrip et contrôle du tempo via les effets de rebond.",
    gameplan: "Développer le mana avec Coiling Oracle, poser de grosses menaces évasives comme Aeromunculus et gérer les attaquants avec Snakeform.",
    keyCards: ['69fd4ddf-9ed8-4c56-bef3-9944daf05e4f', 'a0cd19c1-9125-4627-83ba-d42c489b4e7d', '76ae07ce-ca0c-4308-b8bd-d999eea0a65f'],
    supportCards: ['24d0f5e7-0d9e-4b76-900e-a7274e80312d'],
    recommendedCreatureCount: [14, 18],
    recommendedRemovalCount: [4, 7],
  },
  {
    id: 'hugues:pauper_staple',
    name: 'Pauper Staples and Goodstuff',
    primaryColors: ['W', 'U'],
    splashColors: ['B', 'R', 'G'],
    category: 'midrange',
    description: "Piliers transversaux inconditionnels du format Pauper assurant régularité, card advantage et tempo.",
    gameplan: "Maximiser la flexibilité et la rentabilité mana avec les meilleures cartes du format.",
    keyCards: ['4457ed35-7c10-48c8-9776-456485fdf070', '11111111-aaaa-4000-8000-000000000002', '11111111-aaaa-4000-8000-000000000009'],
    supportCards: ['24d0f5e7-0d9e-4b76-900e-a7274e80312d'],
    recommendedCreatureCount: [12, 16],
    recommendedRemovalCount: [5, 8],
  },
];

huguesMeta.archetypes = archetypesDefinitions;
writeFileSync(huguesMetaPath, JSON.stringify(huguesMeta, null, 2) + '\n', 'utf8');
console.log(`✅ Updated ${huguesMetaPath} (cardCount: ${huguesMeta.cardCount}, archetypes: ${huguesMeta.archetypes.length})`);

// 4. Update cube.json
const huguesCube = JSON.parse(readFileSync(huguesCubePath, 'utf8'));
huguesCube.cardCount = huguesCardIndex.length;
huguesCube.archetypes = archetypesDefinitions;
huguesCube.cardIndex = huguesCardIndex;
writeFileSync(huguesCubePath, JSON.stringify(huguesCube, null, 2) + '\n', 'utf8');
console.log(`✅ Generated ${huguesCubePath} (${huguesCardIndex.length} cards indexed)`);
