import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const rootDir = process.cwd();
const itemsDir = resolve(rootDir, 'data/cards/items');
const cubeDir = resolve(rootDir, 'data/cubes/titou_arena_peasant_plus');
mkdirSync(cubeDir, { recursive: true });

const rawPath = join(cubeDir, 'cubecobra-raw.json');
const metaPath = join(cubeDir, 'cube-meta.json');
const cubePath = join(cubeDir, 'cube.json');

export function cardNameToSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

console.log('🌿 Starting Titou Arena Peasant Plus Cube Import...');

// 1. Fetch CubeCobra raw archive if not cached
if (!existsSync(rawPath)) {
  console.log('🌐 Fetching jdgp cube from CubeCobra API...');
  const res = await fetch('https://cubecobra.com/cube/api/cubeJSON/jdgp', {
    headers: { 'user-agent': 'DraftMaster/0.1 (+https://github.com/tristanlenours/DraftMaster)' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch jdgp from CubeCobra: HTTP ${res.status}`);
  }
  const rawData = await res.json();
  writeFileSync(rawPath, JSON.stringify(rawData, null, 2) + '\n', 'utf8');
  console.log(`💾 Saved raw CubeCobra archive to ${rawPath}`);
}

const rawCube = JSON.parse(readFileSync(rawPath, 'utf8'));
const rawMainboard = rawCube.cards?.mainboard || [];
console.log(`📦 Loaded ${rawMainboard.length} cards from CubeCobra raw archive.`);

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

// 3. Substitution mapping for 10 Shocklands + 2 Rare Multi/Fixing Lands
const LAND_SUBSTITUTIONS = new Map([
  ['Abandoned Campground', 'Hallowed Fountain'],
  ['Murky Sewer', 'Watery Grave'],
  ['Raucous Carnival', 'Blood Crypt'],
  ['Razortrap Gorge', 'Stomping Ground'],
  ['Etched Cornfield', 'Temple Garden'],
  ['Strangled Cemetery', 'Godless Shrine'],
  ['Peculiar Lighthouse', 'Steam Vents'],
  ['Bleeding Woods', 'Overgrown Tomb'],
  ['Neglected Manor', 'Sacred Foundry'],
  ['Lakeside Shack', 'Breeding Pool'],
  ['Escape Tunnel', 'Fabled Passage'],
  ['Hobbit Hole', 'Mana Confluence'],
]);

// Build effective mainboard entries (360 cards total)
const mainboard = [];
let replacedCount = 0;

for (const entry of rawMainboard) {
  const originalName = entry.details?.name;
  if (LAND_SUBSTITUTIONS.has(originalName)) {
    const targetLandName = LAND_SUBSTITUTIONS.get(originalName);
    const existingLand = existingByName.get(targetLandName.toLowerCase().trim());
    if (!existingLand) {
      throw new Error(`Replacement land "${targetLandName}" not found in items repository.`);
    }
    const doc = existingLand.doc;
    mainboard.push({
      card_id: doc.oracleId,
      details: {
        name: doc.name,
        oracle_id: doc.oracleId,
        scryfall_id: doc.scryfallId,
        type: doc.typeLine,
        cmc: doc.cmc,
        colors: doc.colors,
        color_identity: doc.colorIdentity,
        produced_mana: doc.producesColors,
        oracle_text: doc.oracleText,
        keywords: doc.keywords,
        elo: 1550,
        image_normal: doc.image?.url,
        art_crop: doc.image?.artCropUrl,
      },
    });
    replacedCount++;
  } else {
    mainboard.push(entry);
  }
}

console.log(`🔄 Replaced ${replacedCount} slow/tap lands with 10 Shocklands + Fabled Passage + Mana Confluence.`);
console.log(`🎯 Active pool contains ${mainboard.length} cards.`);

// Map of names to oracle IDs in mainboard for archetype key/support card resolution
const nameToOracleId = new Map();
for (const entry of mainboard) {
  const d = entry.details;
  if (!d || !d.name) continue;
  const oracle = d.oracle_id || existingByName.get(d.name.toLowerCase().trim())?.doc?.oracleId;
  if (oracle) {
    nameToOracleId.set(d.name.toLowerCase().trim(), oracle);
  }
}

function resolveCardUuid(name, fallbackUuid) {
  const found = nameToOracleId.get(name.toLowerCase().trim());
  if (found && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(found)) {
    return found;
  }
  return fallbackUuid;
}

// 4. Define 10 Guild Archetypes for Peasant Plus
const archetypes = [
  {
    id: 'titou_peasant:azorius_tempo',
    name: 'Azorius Tempo & Disruptive Fliers',
    primaryColors: ['W', 'U'],
    category: 'midrange',
    description: 'Bêtes évasives et disruptives soutenues par des contresorts et du bounce économique.',
    gameplan: 'Développer des menaces à bas coût (Sokka, fliers), perturber le tempo adverse et clore rapidement la partie.',
    keyCards: [
      resolveCardUuid('Sokka, Lateral Strategist', '24d0f5e7-0d9e-4b76-900e-a7274e80312d'),
      resolveCardUuid('Floodpits Drowner', '0230de18-8d15-4cfa-9d42-7ccddd9f9570'),
      resolveCardUuid('Hallowed Fountain', 'f1750962-a87c-49f6-b731-02ae971ac6ea'),
    ],
    supportCards: [
      resolveCardUuid('Razortide Bridge', 'ae7604bb-4818-45a3-960c-cf3d83f15964'),
    ],
    recommendedCreatureCount: [14, 18],
    recommendedRemovalCount: [5, 8],
  },
  {
    id: 'titou_peasant:dimir_control',
    name: 'Dimir Control & Draw-Two',
    primaryColors: ['U', 'B'],
    category: 'control',
    description: 'Contrôle réactif d’attrition combinant pioche régulière, removals chirurgicaux et payoffs de pioche.',
    gameplan: 'Neutraliser les premières menaces avec Cast Down et contre-sorts, rentabiliser Morbid Opportunist et Sneaky Snacker.',
    keyCards: [
      resolveCardUuid('Morbid Opportunist', 'a044474a-cd72-4e9d-bd8d-a08f2de9cdc0'),
      resolveCardUuid('Shoreline Looter', 'c0d8fef4-65f4-4769-982d-b397d2b7e977'),
      resolveCardUuid('Watery Grave', 'fc9ec820-4245-4a96-b009-5308a818ca58'),
    ],
    supportCards: [
      resolveCardUuid('Mistvault Bridge', 'f759d112-76db-4091-a22b-b9f19ab6fa5f'),
    ],
    recommendedCreatureCount: [10, 14],
    recommendedRemovalCount: [7, 10],
  },
  {
    id: 'titou_peasant:rakdos_artifacts_sac',
    name: 'Rakdos Artifacts & Sacrifice',
    primaryColors: ['B', 'R'],
    category: 'aggro',
    description: 'Moteur de sacrifice d’artefacts infligeant des dégâts continus via drain et portée directe.',
    gameplan: 'Générer des tokens et trésors, activer Oni-Cult Anvil et achever l’adversaire avec Marionette Apprentice et Improvised Club.',
    keyCards: [
      resolveCardUuid('Oni-Cult Anvil', 'c13c79da-2244-4693-9c84-82a89369d724'),
      resolveCardUuid('Marionette Apprentice', '38b99105-ff36-4767-a06a-37701e858485'),
      resolveCardUuid('Blood Crypt', '43985bbc-a0f6-4812-984e-392bc8562633'),
    ],
    supportCards: [
      resolveCardUuid('Drossforge Bridge', 'b3815349-ec44-4a25-83c8-6eb86a635848'),
    ],
    recommendedCreatureCount: [14, 18],
    recommendedRemovalCount: [5, 8],
  },
  {
    id: 'titou_peasant:gruul_stompy',
    name: 'Gruul Stompy & Power Curve',
    primaryColors: ['R', 'G'],
    category: 'midrange',
    description: 'Déploiement agressif de créatures surdimensionnées mettant sous pression constante la défense adverse.',
    gameplan: 'Accélérer la courbe, poser des menaces imposantes dès le T3 et déborder les bloqueurs avec piétinement et burn.',
    keyCards: [
      resolveCardUuid('Wandertale Mentor', '9c2d1b0a-3132-4876-900e-a7274e80312d'),
      resolveCardUuid('Eldrazi Repurposer', '7c8b0e12-8d15-4cfa-9d42-7ccddd9f9570'),
      resolveCardUuid('Stomping Ground', '16052b52-ade1-406f-a06b-ce7ea607fb63'),
    ],
    supportCards: [
      resolveCardUuid('Slagwoods Bridge', '35807c14-4647-482f-9ba1-6d640fd5e8d8'),
    ],
    recommendedCreatureCount: [16, 20],
    recommendedRemovalCount: [4, 7],
  },
  {
    id: 'titou_peasant:selesnya_tokens',
    name: 'Selesnya Go-Wide & Anthems',
    primaryColors: ['G', 'W'],
    category: 'aggro',
    description: 'Production massive de jetons créatures amplifiés par des effets d’hymne et de synergies de plateau.',
    gameplan: 'Multiplier les présences au sol dès les premiers tours, puis verrouiller la table avec des boosts globaux.',
    keyCards: [
      resolveCardUuid('Rosie Cotton of South Lane', '4ec85850-f274-4c0c-9a03-0488267caa14'),
      resolveCardUuid('A Killer Among Us', '60c60923-ff1b-43f7-8768-731499fcffc9'),
      resolveCardUuid('Temple Garden', 'f413a83d-a40d-434c-b20a-4c707c0527fa'),
    ],
    supportCards: [
      resolveCardUuid('Thornglint Bridge', '2ccdc60a-49a9-44b9-a7af-0ebf18b26785'),
    ],
    recommendedCreatureCount: [15, 19],
    recommendedRemovalCount: [4, 7],
  },
  {
    id: 'titou_peasant:orzhov_recursion',
    name: 'Orzhov Grind & Recursion',
    primaryColors: ['W', 'B'],
    category: 'midrange',
    description: 'Guerre d’usure et récursion de permanents à forte valeur pour épuiser toutes les réponses adverses.',
    gameplan: 'Rentabiliser Ruthless Lawbringer et Sunpearl Kirin avec des effets de réanimation et de sacrifice tactique.',
    keyCards: [
      resolveCardUuid('Ruthless Lawbringer', '1c747fe2-289e-492a-a846-aa77707e2dc3'),
      resolveCardUuid('Lively Dirge', '0efb0d7e-dea0-4817-a243-15066e9ef333'),
      resolveCardUuid('Godless Shrine', '73864fcc-1bde-4bc0-831e-2b93e546e417'),
    ],
    supportCards: [
      resolveCardUuid('Goldmire Bridge', '13d4c46b-c2d6-44cc-a252-4a991d471854'),
    ],
    recommendedCreatureCount: [13, 17],
    recommendedRemovalCount: [6, 9],
  },
  {
    id: 'titou_peasant:golgari_food',
    name: 'Golgari Food & Graveyard Value',
    primaryColors: ['B', 'G'],
    category: 'midrange',
    description: 'Utilisation stratégique des jetons Nourriture comme ressources d’activation, couplée au cimetière.',
    gameplan: 'Déposer Tough Cookie et Vinereap Mentor, engranger du card advantage et convertir la nourriture en victoires.',
    keyCards: [
      resolveCardUuid('Tough Cookie', '22f1a4a4-c423-4d1c-8775-0ed604a9fa51'),
      resolveCardUuid('Vinereap Mentor', '6bd872b2-5c40-4e11-9a7f-0136a51b0642'),
      resolveCardUuid('Overgrown Tomb', '975ec9a3-6f20-4177-8211-82526e092538'),
    ],
    supportCards: [
      resolveCardUuid('Darkmoss Bridge', '800c258a-cfc4-4a54-a667-065ea8dea69e'),
    ],
    recommendedCreatureCount: [14, 18],
    recommendedRemovalCount: [5, 8],
  },
  {
    id: 'titou_peasant:simic_tempo_ramp',
    name: 'Simic Ramp & Combat Tricks',
    primaryColors: ['G', 'U'],
    category: 'ramp',
    description: 'Développement rapide de mana vers des menaces polyvalentes protégées par des sorts de protection.',
    gameplan: 'Poser des accélérateurs, déployer des menaces 2-pour-1 et punir les réponses adverses avec Repulsive Mutation.',
    keyCards: [
      resolveCardUuid('Repulsive Mutation', 'dfbd3afc-9905-4cff-a4f4-df08a4d0a7fa'),
      resolveCardUuid('Trumpeting Herd', '3979067a-9c68-443d-a85f-d9f07be880b9'),
      resolveCardUuid('Breeding Pool', '20283c4a-f1f0-42f0-bc08-6da87474426b'),
    ],
    supportCards: [
      resolveCardUuid('Tanglepool Bridge', '11111111-aaaa-4000-8000-000000000002'),
    ],
    recommendedCreatureCount: [14, 18],
    recommendedRemovalCount: [4, 7],
  },
  {
    id: 'titou_peasant:izzet_artifacts',
    name: 'Izzet Artifacts & Noncreature Spells',
    primaryColors: ['U', 'R'],
    category: 'midrange',
    description: 'Synergie dynamique entre créatures mécaniques, noncreature spells et génération de thopters.',
    gameplan: 'Poser des artefacts tôt, déclencher Maverick Thopterist et clore par des attaques aériennes et du burn.',
    keyCards: [
      resolveCardUuid('Maverick Thopterist', '11111111-aaaa-4000-8000-000000000001'),
      resolveCardUuid('Sokenzan Smelter', '11111111-aaaa-4000-8000-000000000003'),
      resolveCardUuid('Steam Vents', '17039058-822d-409f-938c-b727a366ba63'),
    ],
    supportCards: [
      resolveCardUuid('Silverbluff Bridge', '11111111-aaaa-4000-8000-000000000004'),
    ],
    recommendedCreatureCount: [13, 17],
    recommendedRemovalCount: [6, 9],
  },
  {
    id: 'titou_peasant:boros_game_objects',
    name: 'Boros Aggro & Game Objects',
    primaryColors: ['R', 'W'],
    category: 'aggro',
    description: 'Déferlement agressif créant un nombre massif d’objets de jeu (jetons, artefacts) exploités par Arabella.',
    gameplan: 'Submerger le plateau de petites créatures et convertir la masse en dégâts directs dévastateurs.',
    keyCards: [
      resolveCardUuid('Arabella, Abandoned Doll', '11111111-aaaa-4000-8000-000000000005'),
      resolveCardUuid('Case of the Gateway Express', '11111111-aaaa-4000-8000-000000000006'),
      resolveCardUuid('Sacred Foundry', '45181cb8-2090-4471-ba90-e5a8f04d525f'),
    ],
    supportCards: [
      resolveCardUuid('Rustvale Bridge', '11111111-aaaa-4000-8000-000000000007'),
    ],
    recommendedCreatureCount: [16, 20],
    recommendedRemovalCount: [4, 7],
  },
];

// 5. Build cube-meta.json & full cube parameters
const cubeDescription =
  'Un cube Peasant Plus de 360 cartes MTG Arena combinant les meilleures communes et uncos du jeu avec les 10 Shocklands et fixers rares pour des affrontements fluides, interactifs et profondément synergiques.';
const cubePhilosophy =
  "Le Titou Arena Peasant Plus Cube magnifie le meilleur du jeu Peasant MTG Arena. En associant une densité exceptionnelle d'interactions communes/unco aux 10 Shocklands rares et fixers incontournables (Fabled Passage, Mana Confluence), il élimine la frustration du mana screw et permet aux joueurs de bâtir des decks bicolores et tricolores aux synergies dignes du format Construit.";

const cubeMetaDoc = {
  schemaVersion: 1,
  cubeKey: 'titou_arena_peasant_plus',
  name: "Titou's Arena Peasant Plus Cube",
  owner: 'titou',
  coverImage: 'data/cubes/titou_arena_peasant_plus/titouPeasant.jpg',
  activeSnapshotId: 'titou_arena_peasant_plus@2026-09-08.1',
  cardCount: mainboard.length,
  powerTier: 'peasant',
  pacing: 'midrange_attrition',
  fundamentalTurn: {
    targetTurn: 3.5,
    criticalWindow: 'T3-T4',
    pacingDescription:
      'Format Peasant optimisé par des bilands parfaits (Shocklands fetchables par les Landscapes MH3). Le tour pivot se joue au T3-T4 où les synergies d’artefacts, de sacrifice, de tokens ou de food s’enchaînent avec une régularité remarquable.',
    deckExpectation:
      'Un deck équilibré doit stabiliser sa base de mana dès les premiers tours et développer des interactions à bas coût (abattages, cantrips, synergies d’artefacts) pour dominer les échanges au tour pivot T3/T4.',
  },
  technicalAxes: {
    speedIndex: 6.5,
    interactionDensityPercentage: 24.5,
    averageCmcEstimate: 2.6,
    fixingQuality: 'shocks_checks',
    comboPotential: 'minimal_fair_only',
  },
  dominantMechanics: [
    'Artifacts & Sacrifice',
    'Food Engine',
    'Tokens & Go-Wide',
    'Recursion & Attrition',
    'Tempo & Evasion',
    'Shocklands & Landscapes',
  ],
  fixingDensityPercentage: 8.9,
  archetypes,
  scoringProfile: {
    tribalSynergyMultiplier: 1.0,
    comboSynergyMultiplier: 1.2,
    fixingPriorityBonus: 2.0,
    curveStrictness: 2.0,
  },
};

writeFileSync(metaPath, JSON.stringify(cubeMetaDoc, null, 2) + '\n', 'utf8');
console.log(`✅ Generated ${metaPath}`);

// 6. Process Mainboard Cards
const VALID_MTG_COLORS = new Set(['W', 'U', 'B', 'R', 'G']);
const SHOCKLAND_NAMES = new Set([
  'Hallowed Fountain', 'Watery Grave', 'Blood Crypt', 'Stomping Ground', 'Temple Garden',
  'Godless Shrine', 'Steam Vents', 'Overgrown Tomb', 'Sacred Foundry', 'Breeding Pool',
  'Fabled Passage', 'Mana Confluence',
]);

let updatedExisting = 0;
let createdNew = 0;
const cardIndex = [];

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

  if (SHOCKLAND_NAMES.has(cardName)) {
    tier = 'S';
    fit = 'staple';
    scoreModifier = 10;
  } else if (elo >= 1400) {
    tier = 'S';
    fit = 'staple';
    scoreModifier = 10;
  } else if (elo >= 1300) {
    tier = 'A';
    fit = 'support';
    scoreModifier = 6;
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

  // Archetype matching
  const cardArchetypes = [];
  const colors = (d.colors || []).filter((c) => VALID_MTG_COLORS.has(c));
  const oracleLower = (d.oracle_text || '').toLowerCase();
  const typeLower = (d.type || '').toLowerCase();

  const isW = colors.includes('W');
  const isU = colors.includes('U');
  const isB = colors.includes('B');
  const isR = colors.includes('R');
  const isG = colors.includes('G');

  if ((isU && isW) || (isW && typeLower.includes('flying') && isU)) {
    cardArchetypes.push('titou_peasant:azorius_tempo');
  } else if ((isU && isB) || (isB && oracleLower.includes('draw') && isU)) {
    cardArchetypes.push('titou_peasant:dimir_control');
  } else if ((isB && isR) || (isB && (oracleLower.includes('sacrifice') || typeLower.includes('artifact')) && isR)) {
    cardArchetypes.push('titou_peasant:rakdos_artifacts_sac');
  } else if ((isR && isG) || (isG && (oracleLower.includes('trample') || isR))) {
    cardArchetypes.push('titou_peasant:gruul_stompy');
  } else if ((isG && isW) || (isW && (oracleLower.includes('token') || oracleLower.includes('populate')) && isG)) {
    cardArchetypes.push('titou_peasant:selesnya_tokens');
  } else if ((isW && isB) || (isB && (oracleLower.includes('return') && oracleLower.includes('graveyard')) && isW)) {
    cardArchetypes.push('titou_peasant:orzhov_recursion');
  } else if ((isB && isG) || (isG && (oracleLower.includes('food') || oracleLower.includes('graveyard')) && isB)) {
    cardArchetypes.push('titou_peasant:golgari_food');
  } else if ((isG && isU) || (isU && (oracleLower.includes('counter') || oracleLower.includes('add {')) && isG)) {
    cardArchetypes.push('titou_peasant:simic_tempo_ramp');
  } else if ((isU && isR) || (isR && (typeLower.includes('artifact') || oracleLower.includes('instant or sorcery')) && isU)) {
    cardArchetypes.push('titou_peasant:izzet_artifacts');
  } else if ((isR && isW) || (isW && (oracleLower.includes('creature token') || oracleLower.includes('attack')) && isR)) {
    cardArchetypes.push('titou_peasant:boros_game_objects');
  } else {
    cardArchetypes.push('titou_peasant:peasant_staple');
  }

  const synergyTags = (d.oracle_tags && d.oracle_tags.length > 0)
    ? d.oracle_tags.slice(0, 3).map((t) => t.replace(/[^a-z0-9_-]/g, ''))
    : ['peasant_plus'];

  const analysisObj = {
    cubeKey: 'titou_arena_peasant_plus',
    fit,
    tier,
    archetypes: cardArchetypes,
    synergyTags,
    scoreModifier,
    analysis: `Sélectionné pour le Titou Arena Peasant Plus Cube. Carte d'impact majeur sur le Tour Pivot (T3-T4).`,
    pedagogy: {
      howToPlay: `Prioriser sur courbe pour développer votre plan de jeu ou interagir efficacement au tour 3-4.`,
      archetypeFit: [
        {
          colors: colors.length > 0 ? colors : ['W'],
          archetype: cardArchetypes[0].replace('titou_peasant:', '').replace(/_/g, ' ').toUpperCase(),
          grade: tier,
          winrateOrScore: `${Math.min(68, Math.max(48, Math.round((50 + (elo - 1200) / 20) * 10) / 10)).toFixed(1)} %`,
          comment: `Pièce de valeur pour l'environnement Titou Peasant Plus.`,
        },
      ],
    },
  };

  const validOracleId =
    d.oracle_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(d.oracle_id)
      ? d.oracle_id
      : existingEntry?.doc?.oracleId || randomUUID();

  cardIndex.push({
    slug,
    name: cardName,
    oracleId: validOracleId,
    tier,
    fit,
    scoreModifier,
  });

  if (existsSync(cardPath)) {
    try {
      const cardDoc = JSON.parse(readFileSync(cardPath, 'utf8'));
      if (!cardDoc.presentInCubes.includes('titou_arena_peasant_plus')) {
        cardDoc.presentInCubes.push('titou_arena_peasant_plus');
      }
      cardDoc.cubeAnalyses = cardDoc.cubeAnalyses || {};
      cardDoc.cubeAnalyses.titou_arena_peasant_plus = analysisObj;
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
    if (isLand && (producesColors.length > 1 || d.name.includes('Bridge') || d.name.includes('Landscape'))) {
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
      50,
      Math.max(10, Math.round(((elo - 900) / 14.5) * 10) / 10)
    );

    const imageUrl =
      d.image_normal ||
      (d.scryfall_id ? `https://api.scryfall.com/cards/${d.scryfall_id}?format=image` : 'https://cards.scryfall.io/large/front/0/0/placeholder.jpg');
    const artCropUrl =
      d.art_crop ||
      (d.scryfall_id ? `https://api.scryfall.com/cards/${d.scryfall_id}?format=image&version=art_crop` : undefined);

    const newCardDoc = {
      schemaVersion: 1,
      slug,
      name: d.name,
      oracleId: validOracleId,
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
        updatedAt: '2026-09-08T00:00:00.000Z',
      },
      presentInCubes: ['titou_arena_peasant_plus'],
      objectiveAnalysis: {
        summary: `Carte sélectionnée pour le Cube Titou Arena Peasant Plus (ELO CubeCobra: ${Math.round(elo)}).`,
        roles,
        floorRating: Math.min(10, Math.max(1, Math.round((elo / 200) * 10) / 10)),
        ceilingRating: Math.min(10, Math.max(1, Math.round(((elo + 200) / 200) * 10) / 10)),
        tempoImpact: tier === 'S' || tier === 'A' ? 'high' : 'medium',
        quadrantStrengths: {
          opening: tier === 'S' ? 4.6 : 3.8,
          developing: tier === 'S' ? 4.7 : 4.0,
          parity: 3.9,
          behind: tier === 'S' ? 4.0 : 3.4,
        },
      },
      cubeAnalyses: {
        titou_arena_peasant_plus: analysisObj,
      },
    };

    writeFileSync(cardPath, JSON.stringify(newCardDoc, null, 2) + '\n', 'utf8');
    createdNew++;
  }
}

console.log(`✅ Cards processed: ${updatedExisting} updated, ${createdNew} created.`);

// 7. Sort cardIndex by tier then name
const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
cardIndex.sort((a, b) => {
  const tA = tierOrder[a.tier] ?? 99;
  const tB = tierOrder[b.tier] ?? 99;
  if (tA !== tB) return tA - tB;
  return a.name.localeCompare(b.name);
});

// 8. Generate cube.json
const fullCubeDoc = {
  ...cubeMetaDoc,
  description: cubeDescription,
  philosophy: cubePhilosophy,
  cardIndex,
};

writeFileSync(cubePath, JSON.stringify(fullCubeDoc, null, 2) + '\n', 'utf8');
console.log(`✅ Generated ${cubePath} with ${cardIndex.length} cards indexed.`);
console.log('🎉 Titou Arena Peasant Plus import complete!');