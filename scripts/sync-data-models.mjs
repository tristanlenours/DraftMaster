import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const rootDir = process.cwd();

// Helper to convert card name to kebab-case slug
export function cardNameToSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

console.log('🔄 Starting Data Model Synchronization...');

// 1. Ensure target directories exist
const itemsDir = resolve(rootDir, 'data/cards/items');
mkdirSync(itemsDir, { recursive: true });

// 2. Load master catalog base
const masterPath = resolve(rootDir, 'data/cards/master-cards.json');
const masterRaw = readFileSync(masterPath, 'utf8');
const masterData = JSON.parse(masterRaw);

// 3. Load all individual JSON files in itemsDir
const itemFiles = readdirSync(itemsDir).filter((f) => f.endsWith('.json'));
console.log(`📦 Found ${itemFiles.length} card documents in data/cards/items/`);

let cardCount = 0;
const cardsByOracleId = {};

for (const file of itemFiles) {
  const singleCardPath = join(itemsDir, file);
  const cardDoc = JSON.parse(readFileSync(singleCardPath, 'utf8'));
  cardsByOracleId[cardDoc.oracleId] = cardDoc;
  cardCount++;
}

console.log(`✅ Successfully indexed ${cardCount} individual card JSON files from data/cards/items/`);

// 4. Update master-cards.json bundle for sync
masterData.cardCount = cardCount;
masterData.cards = cardsByOracleId;
masterData.generatedAt = new Date().toISOString();
writeFileSync(masterPath, JSON.stringify(masterData, null, 2) + '\n', 'utf8');
console.log(`✅ Synchronized data/cards/master-cards.json bundle`);

// 5. Build Unified cube.json for each of the 3 community cubes
const cubeConfigs = [
  {
    key: 'nico_candyshop',
    dir: 'data/cubes/nico_candyshop',
    description:
      "L'un des environnements les plus rapides et brutaux de Magic papier. Fast mana, combos en un tour et interactions à 0 mana imposent un rythme impitoyable où chaque tour compte double.",
    philosophy:
      "Le Vintage Candyshop est conçu pour offrir l'expérience Vintage Cube la plus explosive et interactive possible. " +
      "Les Moxen, Black Lotus et Time Walk créent des accélérations phénoménales où la partie peut basculer dès le premier ou second tour. " +
      "Chaque deck doit être proactif dès le Tour 1 ou armé d'interactions gratuites (Force of Will, Daze, Mindbreak Trap) sous peine d'écrasement immédiat.",
  },
  {
    key: 'hugues_pauper',
    dir: 'data/cubes/hugues_pauper',
    description:
      "Un environnement 100% cartes communes célébrant les purs fondamentaux de Magic : combats sur le champ de bataille, avantage de cartes à l'usure et arbitrages tactiques permanents.",
    philosophy:
      "Le Pauper Cube de Hugues valorise la pureté du jeu de plateau sans les accélérations dégénérées des raretés supérieures. " +
      "Ici, la victoire se construit par le double-spelling, l'optimisation minutieuse des échanges 2-pour-1 (Mulldrifter, Ephemerate, Ninjutsu) " +
      "et la rentabilisation des synergies d'artefacts et de cimetière. Le tour pivot (T4/T5) consacre le joueur ayant le mieux géré ses ressources et son tempo.",
  },
  {
    key: 'titou_tribal',
    dir: 'data/cubes/titou_tribal',
    description:
      "Un format centré sur les synergies de types de créatures, les seigneurs et l'assemblage d'armées tribales dans un environnement de draft convivial et riche en couleurs.",
    philosophy:
      "Le Tribal & Chromatique Cube de Titou explore la richesse des interactions entre créatures de mêmes familles (Humains, Anges, Elfes, Gobelins). " +
      "Le format encourage la construction d'armées cohérentes où chaque pièce amplifie ses voisines. " +
      "Le tour pivot (T4) marque le moment où la masse critique tribale permet de submerger la défense adverse ou de verrouiller le contrôle aérien.",
  },
  {
    key: 'cedric_cube',
    dir: 'data/cubes/cedric_cube',
    description:
      "Un environnement Vintage Non-Powered de 720 cartes célébrant le jeu interactif de haut niveau : réanimation, monstres sneak/show, planeswalkers et synergies de guilde sans la brutalité non interactive du Power 9.",
    philosophy:
      "Le Cube de Cédric (Strobinellus) privilégie la profondeur stratégique et l'équilibre interactif. " +
      "En écartant le Power 9 au profit d'accélérateurs sélectifs (Mana Vault, Mox Diamond, Grim Monolith) et de bilands parfaits, " +
      "il permet des affrontements spectaculaires où le Tour Pivot (T3.5 - T4) récompense l'anticipation, les échanges 2-pour-1 et les synergies construites.",
  },
  {
    key: 'titou_arena_peasant_plus',
    dir: 'data/cubes/titou_arena_peasant_plus',
    description:
      "Un cube Peasant Plus de 360 cartes MTG Arena combinant les meilleures communes et uncos du jeu avec les 10 Shocklands et fixers rares pour des affrontements fluides, interactifs et profondément synergiques.",
    philosophy:
      "Le Titou Arena Peasant Plus Cube magnifie le meilleur du jeu Peasant MTG Arena. " +
      "En associant une densité exceptionnelle d'interactions communes/unco aux 10 Shocklands rares et fixers incontournables (Fabled Passage, Mana Confluence), " +
      "il élimine la frustration du mana screw et permet aux joueurs de bâtir des decks bicolores et tricolores aux synergies dignes du format Construit.",
  },
];

for (const cfg of cubeConfigs) {
  const metaPath = resolve(rootDir, cfg.dir, 'cube-meta.json');
  if (!existsSync(metaPath)) {
    console.warn(`⚠️ Warning: ${metaPath} not found, skipping.`);
    continue;
  }

  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

  // Build card index for this cube
  const cardIndex = [];
  for (const card of Object.values(cardsByOracleId)) {
    if (card.presentInCubes && card.presentInCubes.includes(cfg.key)) {
      const ana = card.cubeAnalyses[cfg.key];
      cardIndex.push({
        slug: card.slug,
        name: card.name,
        oracleId: card.oracleId,
        tier: ana?.tier || 'B',
        fit: ana?.fit || 'support',
        scoreModifier: ana?.scoreModifier || 0,
      });
    }
  }

  // Sort card index by Tier, then name
  const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
  cardIndex.sort((a, b) => {
    const tA = tierOrder[a.tier] ?? 99;
    const tB = tierOrder[b.tier] ?? 99;
    if (tA !== tB) return tA - tB;
    return a.name.localeCompare(b.name);
  });

  const cubeDoc = {
    schemaVersion: 1,
    cubeKey: meta.cubeKey,
    name: meta.name,
    owner: meta.owner,
    coverImage: meta.coverImage,
    activeSnapshotId: meta.activeSnapshotId,
    cardCount: meta.cardCount,
    powerTier: meta.powerTier,
    pacing: meta.pacing,
    description: cfg.description,
    fundamentalTurn: meta.fundamentalTurn,
    technicalAxes: meta.technicalAxes,
    philosophy: cfg.philosophy,
    dominantMechanics: meta.dominantMechanics,
    fixingDensityPercentage: meta.fixingDensityPercentage,
    archetypes: meta.archetypes,
    scoringProfile: meta.scoringProfile,
    cardIndex,
  };

  const cubeJsonPath = resolve(rootDir, cfg.dir, 'cube.json');
  writeFileSync(cubeJsonPath, JSON.stringify(cubeDoc, null, 2) + '\n', 'utf8');
  console.log(`✅ Generated unified ${cubeJsonPath} (${cardIndex.length} cards indexed)`);
}

console.log('🎉 Data Model Synchronization complete!');
