import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const rootDir = process.cwd();
const itemsDir = resolve(rootDir, 'data/cards/items');
const rawPath = resolve(rootDir, 'data/cubes/cedric_cube/cubecobra-raw.json');
const cedricMetaPath = resolve(rootDir, 'data/cubes/cedric_cube/cube-meta.json');
const cedricCubePath = resolve(rootDir, 'data/cubes/cedric_cube/cube.json');

export function cardNameToSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

console.log("⚔️ Starting Cedric's High-Power Cube (Strobinellus) Import...");

// 1. Ensure cube-meta.json exists and is valid
const cedricMeta = {
  schemaVersion: 1,
  cubeKey: 'cedric_cube',
  name: "Cédric's High-Power Cube (Strobinellus)",
  owner: 'cedric',
  coverImage: 'data/cubes/cedric_cube/cedricCube.jpg',
  activeSnapshotId: 'cedric_cube@2026-03-01.1',
  cardCount: 720,
  powerTier: 'vintage_unpowered',
  pacing: 'midrange_attrition',
  description: "Un environnement Vintage Non-Powered de 720 cartes célébrant le jeu interactif de haut niveau : réanimation, monstres sneak/show, planeswalkers et synergies de guilde sans la brutalité non interactive du Power 9.",
  fundamentalTurn: {
    targetTurn: 3.5,
    criticalWindow: 'T3-T4',
    pacingDescription: "Format de très haut niveau interactif sans Power 9. L'accélération sélective (Mana Vault, Mox Diamond, Grim Monolith) et les bilands parfaits permettent aux decks agressifs et réanimateurs d'imposer une horloge dès le T3, tandis que les jeux midrange et contrôle stabilisent au T4 via des sweepers et des planeswalkers décisifs.",
    deckExpectation: "Un deck compétitif doit développer des interactions à bas coût dès le T1/T2 (Thoughtseize, Swords to Plowshares, Lightning Bolt, Mana Drain) pour contenir l'agression ou protéger son propre plan proactif avant le tour pivot T4."
  },
  technicalAxes: {
    speedIndex: 7.8,
    interactionDensityPercentage: 25.0,
    averageCmcEstimate: 3.2,
    fixingQuality: 'fast_fetches_duals',
    comboPotential: 'high_synergy_engine'
  },
  philosophy: "Le Cube de Cédric (Strobinellus) privilégie la profondeur stratégique et l'équilibre interactif. En écartant le Power 9 au profit d'accélérateurs sélectifs et de bilands parfaits, il permet des affrontements spectaculaires où le Tour Pivot (T3.5 - T4) récompense l'anticipation, les échanges 2-pour-1 et les synergies construites.",
  dominantMechanics: [
    'Reanimator',
    'Sneak and Show',
    'Tinker and Artifact Ramp',
    'Planeswalkers and Superfriends',
    'Midrange Value and Attrition',
    'Equipment and Swords',
    'Man-Lands'
  ],
  fixingDensityPercentage: 9.7,
  archetypes: [
    {
      id: 'cedric:azorius_control_blink',
      name: 'Azorius Control and Blink',
      primaryColors: ['W', 'U'],
      category: 'control',
      description: 'Verrouillage de table par contre-sorts et sweepers, rentabilisé par le clignement de créatures à haute valeur ajoutée.',
      gameplan: 'Contrôler le tempo tôt avec Counterspell et Mana Drain, nettoyer avec Supreme Verdict, puis clore via Teferi, Restoration Angel ou Consecrated Sphinx.',
      keyCards: [
        'ae7604bb-4818-45a3-960c-cf3d83f15964',
        '0230de18-8d15-4cfa-9d42-7ccddd9f9570',
        'dfbd3afc-9905-4cff-a4f4-df08a4d0a7fa'
      ],
      supportCards: [
        '3979067a-9c68-443d-a85f-d9f07be880b9'
      ],
      recommendedCreatureCount: [8, 14],
      recommendedRemovalCount: [6, 10]
    },
    {
      id: 'cedric:dimir_reanimator',
      name: 'Dimir Reanimator and Tempo',
      primaryColors: ['U', 'B'],
      category: 'combo',
      description: 'Mise rapide de monstres terrifiants au cimetière et réanimation économique dès les premiers tours.',
      gameplan: 'Défausser ou meuler Griselbrand ou Archon of Cruelty avec Entomb ou Thoughtseize, puis réanimer avec Reanimate ou Shallow Grave.',
      keyCards: [
        'a044474a-cd72-4e9d-bd8d-a08f2de9cdc0',
        'c0d8fef4-65f4-4769-982d-b397d2b7e977',
        'f759d112-76db-4091-a22b-b9f19ab6fa5f'
      ],
      supportCards: [
        '11111111-aaaa-4000-8000-000000000002'
      ],
      recommendedCreatureCount: [10, 15],
      recommendedRemovalCount: [5, 8]
    },
    {
      id: 'cedric:rakdos_aristocrats',
      name: 'Rakdos Aristocrats and Attrition',
      primaryColors: ['B', 'R'],
      category: 'midrange',
      description: "Sacrifices récursifs, défausse agressive et finisseurs directs pour épuiser l'adversaire.",
      gameplan: "Poser Bloodghast et Gobelins, perturber la main adverse avec Thoughtseize et Blightning, et convertir le plateau avec Daretti.",
      keyCards: [
        'add0f7e7-8990-4fd1-8ac7-8115f7802912',
        'a6496440-dc0c-4d9b-bf37-f537b6f0187b',
        'e97f9c2b-b41e-4f36-9245-77c0ac125647'
      ],
      supportCards: [
        '4457ed35-7c10-48c8-9776-456485fdf070'
      ],
      recommendedCreatureCount: [14, 18],
      recommendedRemovalCount: [6, 9]
    },
    {
      id: 'cedric:gruul_stompy_sneak',
      name: 'Gruul Stompy and Monster Cheat',
      primaryColors: ['R', 'G'],
      category: 'ramp',
      description: 'Accélération de mana brutale et projection immédiate de créatures gigantesques via Sneak Attack ou Natural Order.',
      gameplan: 'Ramper avec Wood Elves ou Sylvan Caryatid, poser Minsc and Boo ou activer Sneak Attack pour envoyer Worldspine Wurm.',
      keyCards: [
        '3a310554-3f69-4158-bb94-9d6965c7125a',
        '3f0c9466-5ab9-4205-a84f-b4b27b5a678e',
        'e7aee670-e6ac-4b3a-b3d1-7b7013db8f3d'
      ],
      supportCards: [
        '13d4c46b-c2d6-44cc-a252-4a991d471854'
      ],
      recommendedCreatureCount: [15, 20],
      recommendedRemovalCount: [3, 6]
    },
    {
      id: 'cedric:selesnya_tokens_midrange',
      name: 'Selesnya Midrange and Hatebears',
      primaryColors: ['G', 'W'],
      category: 'midrange',
      description: 'Déploiement de créatures résilientes, protection des menaces et amplification par le nombre.',
      gameplan: 'Protéger ses attaquants avec Giver of Runes, déployer Voice of Resurgence et Knight of Autumn pour dominer le combat.',
      keyCards: [
        '5cbbb3f3-63a4-4983-81ea-8c405b10e63f',
        'c4212ba4-8c43-40ca-aa36-b3b535659fa8',
        '4ec85850-f274-4c0c-9a03-0488267caa14'
      ],
      supportCards: [
        '13d4c46b-c2d6-44cc-a252-4a991d471854'
      ],
      recommendedCreatureCount: [16, 21],
      recommendedRemovalCount: [3, 6]
    },
    {
      id: 'cedric:orzhov_attrition_tokens',
      name: 'Orzhov Attrition and Tokens',
      primaryColors: ['W', 'B'],
      category: 'midrange',
      description: "Contrôle à l'usure combinant removal inconditionnel, esprits volants et récursion de menaces à bas coût.",
      gameplan: 'Éliminer toute menace avec Vindicate, peupler les airs avec Lingering Souls ou Sorin, et récurer avec Lurrus.',
      keyCards: [
        '63c1ac21-e3d8-40c2-8c09-3f31c52992ef',
        '5c780dda-ee76-482a-a610-53c321c4fdec',
        '3bc757c1-3adb-4321-8832-8e1cc9e687f7'
      ],
      supportCards: [
        '4ec85850-f274-4c0c-9a03-0488267caa14'
      ],
      recommendedCreatureCount: [12, 17],
      recommendedRemovalCount: [5, 9]
    },
    {
      id: 'cedric:izzet_spells_tempo',
      name: 'Izzet Spells and Tempo',
      primaryColors: ['U', 'R'],
      category: 'midrange',
      description: "Enchaînement de sorts à faible coût, pioche impulsive, gestion de tempo et vol d'artefacts.",
      gameplan: 'Gérer les créatures au blast avec Lightning Bolt et Electrolyze, générer du card advantage avec Dack Fayden et Fact or Fiction.',
      keyCards: [
        '9d4b1e44-3c66-4b1b-8a1d-308aa4f841f8',
        '07b222d7-24f2-4994-9004-ff6672ebe161',
        '4457ed35-7c10-48c8-9776-456485fdf070'
      ],
      supportCards: [
        '3979067a-9c68-443d-a85f-d9f07be880b9'
      ],
      recommendedCreatureCount: [10, 15],
      recommendedRemovalCount: [5, 8]
    },
    {
      id: 'cedric:golgari_rock_graveyard',
      name: 'Golgari The Rock and Graveyard',
      primaryColors: ['B', 'G'],
      category: 'midrange',
      description: 'Destruction chirurgicale permanente, menaces polyvalentes et exploitation du cimetière comme ressource.',
      gameplan: "Détruire les permanents clés avec Abrupt Decay et Assassin's Trophy, alimenter Deathrite Shaman et régner avec Grist.",
      keyCards: [
        '22f1a4a4-c423-4d1c-8775-0ed604a9fa51',
        '1c747fe2-289e-492a-a846-aa77707e2dc3',
        '0efb0d7e-dea0-4817-a243-15066e9ef333'
      ],
      supportCards: [
        '13d4c46b-c2d6-44cc-a252-4a991d471854'
      ],
      recommendedCreatureCount: [14, 19],
      recommendedRemovalCount: [5, 8]
    },
    {
      id: 'cedric:boros_aggro_equipment',
      name: 'Boros Aggro and Equipment',
      primaryColors: ['R', 'W'],
      category: 'aggro',
      description: "Agression ultra-rapide sur courbe basse armée d'équipements mirrans et de blasts dévastateurs.",
      gameplan: 'Dérouler des attaquants rapides, équiper une Sword of Fire and Ice et achever au blast avec Forth Eorlingas! et Lightning Helix.',
      keyCards: [
        '35807c14-4647-482f-9ba1-6d640fd5e8d8',
        '800c258a-cfc4-4a54-a667-065ea8dea69e',
        '2ccdc60a-49a9-44b9-a7af-0ebf18b26785'
      ],
      supportCards: [
        '4ec85850-f274-4c0c-9a03-0488267caa14'
      ],
      recommendedCreatureCount: [16, 21],
      recommendedRemovalCount: [4, 7]
    },
    {
      id: 'cedric:simic_ramp_goodstuff',
      name: 'Simic Ramp and Big Mana',
      primaryColors: ['G', 'U'],
      category: 'ramp',
      description: 'Accélération mana continue vers des menaces intraitables et domination totale du champ de bataille.',
      gameplan: "Poser Oko T2 via Sylvan Caryatid ou mana rock, développer d'immenses Hydroid Krasis et verrouiller aux contres.",
      keyCards: [
        '60c60923-ff1b-43f7-8768-731499fcffc9',
        '6bd872b2-5c40-4e11-9a7f-0136a51b0642',
        '13d4c46b-c2d6-44cc-a252-4a991d471854'
      ],
      supportCards: [
        'dfbd3afc-9905-4cff-a4f4-df08a4d0a7fa'
      ],
      recommendedCreatureCount: [13, 18],
      recommendedRemovalCount: [3, 6]
    }
  ],
  scoringProfile: {
    tribalSynergyMultiplier: 0.5,
    comboSynergyMultiplier: 1.8,
    fixingPriorityBonus: 2.0,
    curveStrictness: 1.8
  }
};

writeFileSync(cedricMetaPath, JSON.stringify(cedricMeta, null, 2) + '\n', 'utf8');
console.log('✅ Generated data/cubes/cedric_cube/cube-meta.json');

// 2. Index existing cards in data/cards/items
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

const S_TIER_STAPLES = new Set([
  'The One Ring',
  'Mana Vault',
  'Demonic Tutor',
  'Force of Will',
  'Ragavan, Nimble Pilferer',
  'Strip Mine',
  'Forth Eorlingas!',
  'Broadside Bombardiers',
  'Minsc & Boo, Timeless Heroes',
  'Swords to Plowshares',
  'Thoughtseize',
  'Reanimate',
  'Grim Monolith',
  'Oko, Thief of Crowns',
  'Vampiric Tutor',
  'Tinker',
  'Mox Diamond',
  'Mana Drain',
  'Sneak Attack',
  'Griselbrand',
  'Orcish Bowmasters',
  'Psychic Frog',
  'Wrenn and Six',
  'Dack Fayden',
  'Booster Tutor'
]);

const BUILD_AROUNDS = new Set([
  'Sneak Attack',
  'Tinker',
  'Reanimate',
  'Recurring Nightmare',
  'Natural Order',
  'Show and Tell',
  'Channel',
  'Shallow Grave',
  'Dance of the Dead',
  'Animate Dead',
  'Lurrus of the Dream-Den',
  'Defense of the Heart',
  'Tooth and Nail'
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
const cedricCardIndex = [];

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

  const elo = d.elo || 1200;
  let tier = 'B';
  let fit = 'support';
  let scoreModifier = 0;

  if (S_TIER_STAPLES.has(cardName) || elo >= 1650) {
    tier = 'S';
    fit = BUILD_AROUNDS.has(cardName) ? 'build_around' : 'staple';
    scoreModifier = 14;
  } else if (BUILD_AROUNDS.has(cardName)) {
    tier = elo >= 1350 ? 'A' : 'B';
    fit = 'build_around';
    scoreModifier = 10;
  } else if (elo >= 1350) {
    tier = 'A';
    fit = 'support';
    scoreModifier = 7;
  } else if (elo >= 1220) {
    tier = 'B';
    fit = 'support';
    scoreModifier = 0;
  } else if (elo >= 1150) {
    tier = 'C';
    fit = 'filler';
    scoreModifier = -5;
  } else {
    tier = 'D';
    fit = 'filler';
    scoreModifier = -10;
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

  if ((isU && isW) || (isW && oracleLower.includes('blink')) || (isW && typeLower.includes('planeswalker') && isU)) {
    archetypes.push('cedric:azorius_control_blink');
  } else if ((isU && isB) || (isB && (oracleLower.includes('return') && oracleLower.includes('graveyard to the battlefield')))) {
    archetypes.push('cedric:dimir_reanimator');
  } else if ((isB && isR) || (isB && oracleLower.includes('sacrifice'))) {
    archetypes.push('cedric:rakdos_aristocrats');
  } else if ((isR && isG) || (isG && (oracleLower.includes('trample') || oracleLower.includes('sneak attack')))) {
    archetypes.push('cedric:gruul_stompy_sneak');
  } else if ((isG && isW) || (isW && (oracleLower.includes('token') || oracleLower.includes('creature token')))) {
    archetypes.push('cedric:selesnya_tokens_midrange');
  } else if ((isW && isB) || (isB && oracleLower.includes('destroy target permanent'))) {
    archetypes.push('cedric:orzhov_attrition_tokens');
  } else if ((isU && isR) || (isR && (oracleLower.includes('instant or sorcery') || oracleLower.includes('damage to any target') && isU))) {
    archetypes.push('cedric:izzet_spells_tempo');
  } else if ((isB && isG) || (isG && oracleLower.includes('graveyard'))) {
    archetypes.push('cedric:golgari_rock_graveyard');
  } else if ((isR && isW) || (isW && typeLower.includes('equipment')) || (isR && oracleLower.includes('equipment'))) {
    archetypes.push('cedric:boros_aggro_equipment');
  } else if ((isG && isU) || (isG && (oracleLower.includes('add {') || oracleLower.includes('search your library for a land')))) {
    archetypes.push('cedric:simic_ramp_goodstuff');
  } else {
    archetypes.push('cedric:high_power_staple');
  }

  const synergyTags = (d.oracle_tags && d.oracle_tags.length > 0)
    ? d.oracle_tags.slice(0, 3).map((t) => t.replace(/[^a-z0-9_-]/g, ''))
    : ['high_power_cube'];

  const cedricAnalysis = {
    cubeKey: 'cedric_cube',
    fit,
    tier,
    archetypes,
    synergyTags,
    scoreModifier,
    analysis: `Sélectionné pour le High-Power Cube de Cédric (Strobinellus). Carte d'impact majeur sur le Tour Pivot (T3.5 - T4).`,
    pedagogy: {
      howToPlay: `Prioriser sur courbe pour développer des menaces résilientes ou interagir efficacement sur le tour 3-4.`,
      archetypeFit: [
        {
          colors: colors.length > 0 ? colors : ['W'],
          archetype: archetypes[0].replace('cedric:', '').replace(/_/g, ' ').toUpperCase(),
          grade: tier,
          winrateOrScore: `${Math.min(68, Math.max(48, Math.round((50 + (elo - 1200) / 20) * 10) / 10)).toFixed(1)} %`,
          comment: `Pilier compétitif du cube de Cédric.`,
        },
      ],
    },
  };

  cedricCardIndex.push({
    slug,
    name: cardName,
    oracleId: d.oracle_id || existingEntry?.doc?.oracleId || '00000000-0000-4000-8000-000000000000',
    tier,
    fit,
    scoreModifier,
  });

  if (existsSync(cardPath)) {
    // Update existing card document
    try {
      const cardDoc = JSON.parse(readFileSync(cardPath, 'utf8'));
      if (!cardDoc.presentInCubes.includes('cedric_cube')) {
        cardDoc.presentInCubes.push('cedric_cube');
      }
      cardDoc.cubeAnalyses = cardDoc.cubeAnalyses || {};
      cardDoc.cubeAnalyses.cedric_cube = cedricAnalysis;
      writeFileSync(cardPath, JSON.stringify(cardDoc, null, 2) + '\n', 'utf8');
      updatedExisting++;
    } catch (err) {
      console.error(`Error updating existing ${slug}:`, err.message);
    }
  } else {
    // Create new card document conforming to card.schema.json
    const parts = (d.type || 'Card').split('—').map((s) => s.trim());
    const typeWords = parts[0].split(/\s+/).filter(Boolean);
    const subtypes = parts[1] ? parts[1].split(/\s+/).filter(Boolean) : [];

    const isLand = typeWords.includes('Land');
    const colorIdentity = (d.color_identity || []).filter((c) => VALID_MTG_COLORS.has(c));
    const producesColors = (d.produced_mana || []).filter((c) => VALID_MTG_COLORS.has(c));

    const roles = [];
    if (d.name.includes('Mox') || d.name.includes('Lotus') || oracleLower.includes('add {') || oracleLower.includes('search your library for a land')) {
      roles.push('mana_ramp');
    }
    if (isLand && producesColors.length > 1) {
      roles.push('mana_fixing');
    }
    if (oracleLower.includes('destroy') || oracleLower.includes('exile') || oracleLower.includes('damage to any target') || oracleLower.includes('counter target')) {
      roles.push('premium_removal');
    }
    if (oracleLower.includes('draw a card') || oracleLower.includes('draw two cards') || oracleLower.includes('draw three cards')) {
      roles.push('card_advantage');
    }
    if (roles.length === 0) {
      roles.push(tier === 'S' || tier === 'A' ? 'bomb' : 'beater');
    }

    const calculatedPowerScore = Math.min(
      51,
      Math.max(10, Math.round(((elo - 900) / 14.5) * 10) / 10)
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
      scryfallId: d.scryfall_id || undefined,
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
      loyalty: d.loyalty ? String(d.loyalty) : undefined,
      isLand,
      producesColors,
      image: {
        url: imageUrl,
        localPath: `data/cards/images/${slug}.jpg`,
        artCropUrl,
      },
      imageUrl,
      powerScore: {
        score: calculatedPowerScore,
        source: 'cubecobra_elo',
        rawSourceScore: Math.round(elo),
        harmonizationDegree: 'calibrated_high',
        confidence: 0.9,
        updatedAt: '2026-09-06T00:00:00.000Z',
      },
      presentInCubes: ['cedric_cube'],
      objectiveAnalysis: {
        summary: `Carte High-Power sélectionnée pour le Cube de Cédric (ELO CubeCobra: ${Math.round(elo)}).`,
        roles,
        floorRating: Math.min(10, Math.max(1, Math.round((elo / 200) * 10) / 10)),
        ceilingRating: Math.min(10, Math.max(1, Math.round(((elo + 200) / 200) * 10) / 10)),
        tempoImpact: tier === 'S' || tier === 'A' ? 'high' : 'medium',
        quadrantStrengths: {
          opening: tier === 'S' ? 4.7 : 3.8,
          developing: tier === 'S' ? 4.8 : 4.1,
          parity: 3.9,
          behind: tier === 'S' ? 4.1 : 3.4,
        },
      },
      cubeAnalyses: {
        cedric_cube: cedricAnalysis,
      },
    };

    writeFileSync(cardPath, JSON.stringify(newCardDoc, null, 2) + '\n', 'utf8');
    createdNew++;
  }
}

console.log(`✅ Cards processed: ${updatedExisting} updated, ${createdNew} created.`);

// Update cedric_cube/cube.json
const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
cedricCardIndex.sort((a, b) => {
  const tA = tierOrder[a.tier] ?? 99;
  const tB = tierOrder[b.tier] ?? 99;
  if (tA !== tB) return tA - tB;
  return a.name.localeCompare(b.name);
});

const cedricCubeDoc = {
  schemaVersion: 1,
  cubeKey: cedricMeta.cubeKey,
  name: cedricMeta.name,
  owner: cedricMeta.owner,
  coverImage: cedricMeta.coverImage,
  activeSnapshotId: cedricMeta.activeSnapshotId,
  cardCount: mainboard.length,
  powerTier: cedricMeta.powerTier,
  pacing: cedricMeta.pacing,
  description: cedricMeta.description,
  fundamentalTurn: cedricMeta.fundamentalTurn,
  technicalAxes: cedricMeta.technicalAxes,
  philosophy: cedricMeta.philosophy,
  dominantMechanics: cedricMeta.dominantMechanics,
  fixingDensityPercentage: cedricMeta.fixingDensityPercentage,
  archetypes: cedricMeta.archetypes,
  scoringProfile: cedricMeta.scoringProfile,
  cardIndex: cedricCardIndex,
};

writeFileSync(cedricCubePath, JSON.stringify(cedricCubeDoc, null, 2) + '\n', 'utf8');
console.log(`✅ Generated data/cubes/cedric_cube/cube.json with ${cedricCardIndex.length} cards indexed.`);
