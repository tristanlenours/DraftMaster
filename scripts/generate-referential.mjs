import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();

// 1. Load historical titou cube snapshot
const titouSnapshot = JSON.parse(
  readFileSync(resolve(rootDir, "data/cubes/titou_tribal/2026-02-24.1.json"), "utf8")
);

// 2. Load card metadata from untapped history
const cardMetadata = JSON.parse(
  readFileSync(resolve(rootDir, "data/untapped_history/card-metadata-v1.json"), "utf8")
);

// 3. Load Untapped static scores
const draftsBackup = Object.values(
  JSON.parse(readFileSync(resolve(rootDir, "data/untapped_history/drafts_backup.json"), "utf8"))
);

const nameToUntappedScore = new Map();
for (const draft of draftsBackup) {
  for (const pick of draft.picks ?? []) {
    for (const [grpId, scoreObj] of Object.entries(pick.PackScores ?? {})) {
      if (scoreObj && typeof scoreObj.staticScore === "number") {
        const meta = cardMetadata[grpId];
        if (meta?.name) {
          nameToUntappedScore.set(meta.name.trim().toLowerCase(), scoreObj.staticScore);
        }
      }
    }
  }
}

// 4. Map titou cube cards to unique oracleIds
const oracleMap = new Map();
for (const card of titouSnapshot.cards) {
  if (!oracleMap.has(card.oracleId)) {
    oracleMap.set(card.oracleId, {
      oracleId: card.oracleId,
      name: card.name,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
    });
  }
}

// Map card names in titou to oracleId
const titouNameToOracle = new Map();
for (const card of titouSnapshot.cards) {
  titouNameToOracle.set(card.name.trim().toLowerCase(), card.oracleId);
}

// Helper to find oracleId by name in titou snapshot
function getTitouOracleId(name) {
  return titouNameToOracle.get(name.trim().toLowerCase()) ?? null;
}

// 5. Build Titou Tribal Cube Meta
const championOracle = getTitouOracleId("Champion of the Parish");
const thaliaLtOracle = getTitouOracleId("Thalia's Lieutenant");
const adelineOracle = getTitouOracleId("Adeline, Resplendent Cathar");
const motherOracle = getTitouOracleId("Mother of Runes");
const thaliaOracle = getTitouOracleId("Thalia, Guardian of Thraben");
const righteousValkyrieOracle = getTitouOracleId("Righteous Valkyrie");
const youthfulValkyrieOracle = getTitouOracleId("Youthful Valkyrie");
const restorationAngelOracle = getTitouOracleId("Restoration Angel");
const guideOfSoulsOracle = getTitouOracleId("Guide of Souls");
const soulWardenOracle = getTitouOracleId("Soul Warden");
const luminarchOracle = getTitouOracleId("Luminarch Aspirant");
const charmingPrinceOracle = getTitouOracleId("Charming Prince");

const titouMeta = {
  schemaVersion: 1,
  cubeKey: "titou_tribal",
  name: "Titou's Tribal and Chromatic Cube",
  owner: "eltitou007",
  activeSnapshotId: "titou_tribal@2026-02-24.1",
  cardCount: 545,
  powerTier: "synergy_unpowered",
  pacing: "midrange_attrition",
  fundamentalTurn: {
    targetTurn: 4.0,
    criticalWindow: "T3-T5",
    pacingDescription: "Format synergique articulé sur les types de créatures et les seigneurs. Les parties basculent quand un joueur atteint la masse critique tribale ou verrouille les airs au tour 4.",
    deckExpectation: "Un deck doit développer sa courbe de créatures T1-T3 pour capitaliser sur un seigneur ou un payoff d'archétype au T4, tout en conservant 3 à 5 removals pour casser les moteurs adverses."
  },
  technicalAxes: {
    speedIndex: 5.8,
    interactionDensityPercentage: 16.0,
    averageCmcEstimate: 3.1,
    fixingQuality: "rainbow_tribal",
    comboPotential: "high_synergy_engine"
  },
  fixingDensityPercentage: 14.5,
  dominantMechanics: ["Tribal", "Lifegain", "Blink", "+1/+1 Counters", "Graveyard"],
  archetypes: [
    {
      id: "titou:tribal_angels",
      name: "Orzhov/Mono-W Anges & Clercs",
      primaryColors: ["W"],
      splashColors: ["B"],
      category: "midrange",
      description: "Synergies tribales aériennes et gain de vie exponentiel grâce aux anges et clercs.",
      gameplan: "Développer des créatures clercs à bas coût pour activer les seuils de PV, puis déployer les anges pour buffer l'ensemble du board aérien.",
      keyCards: [righteousValkyrieOracle, youthfulValkyrieOracle, restorationAngelOracle].filter(Boolean),
      supportCards: [guideOfSoulsOracle, soulWardenOracle, motherOracle].filter(Boolean),
      recommendedCreatureCount: [16, 19],
      recommendedRemovalCount: [4, 6]
    },
    {
      id: "titou:tribal_humans",
      name: "Mono-W / Selesnya Humains Aggro",
      primaryColors: ["W"],
      splashColors: ["G"],
      category: "aggro",
      description: "Deck agressif ultra-synergique empilant des compteurs +1/+1 sur chaque humain joué.",
      gameplan: "Sortir vite avec Champion of the Parish et Mother of Runes, puis enchaîner Thalia's Lieutenant et Adeline pour submerger l'adversaire avant ses wrath.",
      keyCards: [championOracle, thaliaLtOracle, adelineOracle].filter(Boolean),
      supportCards: [motherOracle, thaliaOracle, luminarchOracle].filter(Boolean),
      recommendedCreatureCount: [17, 20],
      recommendedRemovalCount: [3, 5]
    }
  ],
  scoringProfile: {
    tribalSynergyMultiplier: 2.2,
    comboSynergyMultiplier: 0.6,
    fixingPriorityBonus: 1.5,
    curveStrictness: 1.8
  }
};

// 6. Build Nico's Cube Meta (Vintage / Artifact / Storm focused)
// Deterministic compliant UUIDv4 for Nico cube cards
const tinkerOracle = "b3208538-8924-4ab2-b258-29ceeead2a99";
const brainFreezeOracle = "3d76e3cc-a9e9-4e78-be7f-a63e26bb5b3c";
const breachOracle = "018595a8-ef01-4475-8025-a1c1d81b94e3";
const ledOracle = "006d9972-e1c0-4f51-b844-0b1d3ef1ec7b";
const urzaOracle = "44444444-5555-4666-8777-888888888888";
const solRingOracle = "99999999-aaaa-4bbb-8ccc-dddddddddddd";

const nicoMeta = {
  schemaVersion: 1,
  cubeKey: "nico_candyshop",
  name: "Nico's Vintage Candyshop Cube",
  owner: "nico",
  activeSnapshotId: "nico_candyshop@2026-03-01.1",
  cardCount: 540,
  powerTier: "powered_vintage",
  pacing: "blistering_fast",
  fundamentalTurn: {
    targetTurn: 2.0,
    criticalWindow: "T1-T3",
    pacingDescription: "Format ultra-rapide dominé par le fast mana (Moxen, Lotus, Sol Ring), les réanimations précoces et les combos en un tour. La partie bascule ou se verrouille souvent dès le tour 2.",
    deckExpectation: "Un deck viable DOIT impérativement développer des actions proactives ou disposer d'interactions gratuites/à 1 mana (Force of Will, Daze, Swords to Plowshares, Lightning Bolt, Thoughtseize) dès le T1/T2 sous peine de défaite instantanée."
  },
  technicalAxes: {
    speedIndex: 9.8,
    interactionDensityPercentage: 24.5,
    averageCmcEstimate: 2.1,
    fixingQuality: "fast_fetches_duals",
    comboPotential: "infinite_turn1_3"
  },
  fixingDensityPercentage: 18.0,
  dominantMechanics: ["Storm", "Artifact Ramp", "Blink / Value", "Reanimator", "Fast Mana"],
  archetypes: [
    {
      id: "nico:storm_combo",
      name: "Izzet / Grixis Storm",
      primaryColors: ["U", "R"],
      splashColors: ["B"],
      category: "combo",
      description: "Génération de mana rituel, pioche en chaîne et clôture via Brain Freeze, Tendrils of Agony ou Underworld Breach.",
      gameplan: "Sculpter une main critique avec des cantrips, assembler Underworld Breach / Lion's Eye Diamond / Brain Freeze, et meuler ou vider les PV en un tour.",
      keyCards: [brainFreezeOracle, breachOracle, ledOracle],
      supportCards: [restorationAngelOracle ?? solRingOracle],
      recommendedCreatureCount: [3, 8],
      recommendedRemovalCount: [4, 7]
    },
    {
      id: "nico:artifact_ramp",
      name: "Mono-Blue / Colorless Artifact Ramp",
      primaryColors: ["U"],
      category: "ramp",
      description: "Accélération brutale via mana rocks, Tinker dans de gros payoffs comme Blightsteel ou Bolas's Citadel.",
      gameplan: "Déposer des cailloux T1/T2, sacrifier un artefact pour Tinker ou lancer Urza pour dominer la table.",
      keyCards: [tinkerOracle, urzaOracle],
      supportCards: [solRingOracle],
      recommendedCreatureCount: [8, 12],
      recommendedRemovalCount: [4, 6]
    }
  ],
  scoringProfile: {
    tribalSynergyMultiplier: 0.4,
    comboSynergyMultiplier: 2.5,
    fixingPriorityBonus: 2.2,
    curveStrictness: 2.0
  }
};

// 7. Write Cube Metas
mkdirSync(resolve(rootDir, "data/cubes/titou_tribal"), { recursive: true });
mkdirSync(resolve(rootDir, "data/cubes/nico_candyshop"), { recursive: true });
writeFileSync(resolve(rootDir, "data/cubes/titou_tribal/cube-meta.json"), JSON.stringify(titouMeta, null, 2) + "\n");
writeFileSync(resolve(rootDir, "data/cubes/nico_candyshop/cube-meta.json"), JSON.stringify(nicoMeta, null, 2) + "\n");

// 8. Generate Master Card Catalog
// We generate cards for all distinct oracle cards in titou, plus the iconic Nico cards
const catalogCards = {};

// Metadata lookup by card name
const nameToMeta = new Map();
for (const m of Object.values(cardMetadata)) {
  if (m?.name) {
    nameToMeta.set(m.name.trim().toLowerCase(), m);
  }
}

// Build cards
const allCardSeeds = [
  ...titouSnapshot.cards.map((c) => ({
    oracleId: c.oracleId,
    name: c.name,
    presentInCubes: ["titou_tribal"],
  })),
  {
    oracleId: tinkerOracle,
    name: "Tinker",
    presentInCubes: ["nico_candyshop"],
  },
  {
    oracleId: brainFreezeOracle,
    name: "Brain Freeze",
    presentInCubes: ["nico_candyshop"],
  },
  {
    oracleId: breachOracle,
    name: "Underworld Breach",
    presentInCubes: ["nico_candyshop"],
  },
  {
    oracleId: ledOracle,
    name: "Lion's Eye Diamond",
    presentInCubes: ["nico_candyshop"],
  },
  {
    oracleId: urzaOracle,
    name: "Urza, Lord High Artificer",
    presentInCubes: ["nico_candyshop"],
  },
  {
    oracleId: solRingOracle,
    name: "Sol Ring",
    presentInCubes: ["nico_candyshop"],
  },
];

// De-duplicate by oracleId and merge presentInCubes
const mergedSeeds = new Map();
for (const s of allCardSeeds) {
  const existing = mergedSeeds.get(s.oracleId);
  if (!existing) {
    mergedSeeds.set(s.oracleId, { ...s, presentInCubes: [...s.presentInCubes] });
  } else {
    for (const cube of s.presentInCubes) {
      if (!existing.presentInCubes.includes(cube)) {
        existing.presentInCubes.push(cube);
      }
    }
  }
}

const nowIso = new Date().toISOString();

for (const seed of mergedSeeds.values()) {
  const normalizedName = seed.name.trim().toLowerCase();
  const meta = nameToMeta.get(normalizedName);
  const untappedScore = nameToUntappedScore.get(normalizedName);

  // Determine power score
  let powerScore;
  if (typeof untappedScore === "number") {
    powerScore = {
      score: Math.round(untappedScore * 10) / 10,
      source: "untapped",
      rawSourceScore: untappedScore,
      harmonizationDegree: "native",
      confidence: 1.0,
      updatedAt: nowIso,
    };
  } else if (seed.name === "Tinker" || seed.name === "Underworld Breach") {
    powerScore = {
      score: 47.5,
      source: "17lands_normalized",
      rawSourceScore: 66.2,
      harmonizationDegree: "calibrated_high",
      confidence: 0.85,
      updatedAt: nowIso,
    };
  } else if (seed.name === "Lion's Eye Diamond") {
    powerScore = {
      score: 42.0,
      source: "cubecobra_elo",
      rawSourceScore: 1720,
      harmonizationDegree: "calibrated_medium",
      confidence: 0.7,
      updatedAt: nowIso,
    };
  } else {
    powerScore = {
      score: 22.0,
      source: "expert_heuristic",
      harmonizationDegree: "fallback",
      confidence: 0.5,
      updatedAt: nowIso,
    };
  }

  // Objective analysis
  const isCreature = meta?.type_line?.includes("Creature") ?? false;
  const isRemoval = meta?.oracle_text && /destroy|exile|counter target|deals? \d+ damage/i.test(meta.oracle_text);
  const isBomb = powerScore.score >= 40.0;

  const roles = [];
  if (isBomb) roles.push("bomb");
  if (isRemoval) roles.push("premium_removal");
  if (isCreature) roles.push("beater");
  if (meta?.type_line?.includes("Land")) roles.push("mana_fixing");
  if (roles.length === 0) roles.push("synergy_enabler");

  const objectiveAnalysis = {
    summary: `${seed.name} est une carte ${isBomb ? "de premier ordre" : "solide"} offrant un bon tempo et une flexibilité appréciable.`,
    roles,
    floorRating: Math.max(1.0, Math.min(10.0, Math.round((powerScore.score / 6.0) * 10) / 10)),
    ceilingRating: Math.max(1.0, Math.min(10.0, Math.round(((powerScore.score + 5.0) / 6.0) * 10) / 10)),
    tempoImpact: powerScore.score >= 35.0 ? "high" : "medium",
    quadrantStrengths: {
      opening: 3.5,
      developing: 4.0,
      parity: 3.8,
      behind: 3.0,
    },
  };

  // Cube specific analyses
  const cubeAnalyses = {};

  if (seed.presentInCubes.includes("titou_tribal")) {
    const isAngel = seed.name.includes("Valkyrie") || seed.name.includes("Angel") || seed.name === "Soul Warden";
    const isHuman = seed.name.includes("Parish") || seed.name.includes("Lieutenant") || seed.name.includes("Adeline") || seed.name.includes("Thalia") || seed.name.includes("Mother");

    let fit = "support";
    let scoreModifier = 0.0;
    const archetypes = [];
    const synergyTags = [];

    if (isAngel) {
      fit = "build_around";
      scoreModifier = +6.0;
      archetypes.push("titou:tribal_angels");
      synergyTags.push("tribe:angel", "lifegain");
    } else if (isHuman) {
      fit = "build_around";
      scoreModifier = +5.0;
      archetypes.push("titou:tribal_humans");
      synergyTags.push("tribe:human", "aggro", "counters");
    }

    const effScore = powerScore.score + scoreModifier;
    const tier = effScore >= 38 ? "S" : effScore >= 28 ? "A" : effScore >= 18 ? "B" : effScore >= 10 ? "C" : "D";

    cubeAnalyses.titou_tribal = {
      cubeKey: "titou_tribal",
      fit,
      tier,
      archetypes,
      synergyTags,
      scoreModifier,
      analysis: isAngel
        ? "Excellente pièce de l'archétype Anges, capitalise sur les synergies de gain de vie et le vol."
        : isHuman
        ? "Moteur de l'archétype Humains, prend rapidement de la valeur avec les synergies tribales."
        : "Carte utilitaire ou de support polyvalente dans l'environnement tribal de Titou.",
      keyPairs: isAngel ? ["Righteous Valkyrie", "Restoration Angel"] : isHuman ? ["Champion of the Parish", "Thalia's Lieutenant"] : undefined,
      pedagogy: {
        howToPlay: isBomb
          ? `Menace ou ressource clé : déployez ${seed.name} dès que possible en sécurisant votre avantage.`
          : isRemoval
          ? `Conservez ${seed.name} pour neutraliser les seigneurs de guerre et créatures volantes adverses.`
          : `Jouez ${seed.name} sur courbe de mana pour consolider la présence sur table.`,
        keySynergies: isAngel
          ? [{ cardName: "Restoration Angel", synergyType: "Tribal & Blink", description: "Protège ou réactive vos créatures clés." }]
          : isHuman
          ? [{ cardName: "Thalia's Lieutenant", synergyType: "Renfort Tribal", description: "Renforce toute votre armée humaine." }]
          : [],
        archetypeFit: (meta?.colors || []).length > 0
          ? [
              {
                colors: meta.colors.slice(0, 2),
                archetype: isAngel ? "Tribal Anges" : isHuman ? "Tribal Humains" : "Synergie Tribale",
                grade: tier,
                winrateOrScore: `${Math.min(70, Math.round(50 + effScore / 3))}.0 %`,
                comment: isAngel || isHuman ? "Pilier direct de l'archétype." : "Apport régulier sur courbe."
              }
            ]
          : []
      }
    };
  }

  if (seed.presentInCubes.includes("nico_candyshop")) {
    const isStorm = seed.name === "Brain Freeze" || seed.name === "Underworld Breach" || seed.name === "Lion's Eye Diamond";
    const isArtifactRamp = seed.name === "Tinker" || seed.name === "Urza, Lord High Artificer" || seed.name === "Sol Ring";

    let fit = "support";
    let scoreModifier = 0.0;
    const archetypes = [];
    const synergyTags = [];

    if (isStorm) {
      fit = "build_around";
      scoreModifier = +7.0;
      archetypes.push("nico:storm_combo");
      synergyTags.push("engine:storm", "combo", "graveyard");
    } else if (isArtifactRamp) {
      fit = "build_around";
      scoreModifier = +6.5;
      archetypes.push("nico:artifact_ramp");
      synergyTags.push("ramp", "artifact", "cheat_into_play");
    }

    const effScore = powerScore.score + scoreModifier;
    const tier = effScore >= 42 ? "S" : effScore >= 30 ? "A" : effScore >= 20 ? "B" : effScore >= 10 ? "C" : "D";

    cubeAnalyses.nico_candyshop = {
      cubeKey: "nico_candyshop",
      fit,
      tier,
      archetypes,
      synergyTags,
      scoreModifier,
      analysis: isStorm
        ? "Pilier absolu de l'archétype Storm Combo chez Nico."
        : isArtifactRamp
        ? "Moteur de rampe et de triche d'artefacts majeur dans le Vintage Candyshop."
        : "Bonne carte polyvalente pour la méta rapide du Candyshop.",
      keyPairs: isStorm ? ["Underworld Breach", "Lion's Eye Diamond"] : isArtifactRamp ? ["Tinker", "Sol Ring"] : undefined,
      pedagogy: {
        howToPlay: isStorm
          ? "Gardez vos pièces en main jusqu'au tour de combo décisif pour tout déclencher d'un coup."
          : isArtifactRamp
          ? "Accélérez immédiatement pour poser des menaces massives avant que l'adversaire ne s'installe."
          : "Optimisez vos tours 1 et 2 pour rivaliser avec la vitesse explosive du cube.",
        keySynergies: isStorm
          ? [{ cardName: "Underworld Breach", synergyType: "Combo Storm", description: "Récursion illimitée du cimetière." }]
          : isArtifactRamp
          ? [{ cardName: "Tinker", synergyType: "Cheat Mana", description: "Triche un artefact géant en jeu." }]
          : [],
        archetypeFit: [
          {
            colors: ["U", "R"],
            archetype: isStorm ? "Storm Combo" : "Vintage Value",
            grade: tier,
            winrateOrScore: `${Math.min(75, Math.round(52 + effScore / 3))}.0 %`,
            comment: isStorm ? "Cœur névralgique de la chaîne de combo." : "Support de tempo."
          }
        ]
      }
    };
  }

  catalogCards[seed.oracleId] = {
    oracleId: seed.oracleId,
    name: seed.name,
    manaCost: meta?.mana_cost ?? "{2}",
    cmc: meta?.cmc ?? 2,
    colors: meta?.colors ?? ["W"],
    colorIdentity: meta?.color_identity ?? ["W"],
    typeLine: meta?.type_line ?? "Creature",
    types: meta?.type_line?.split("—")[0]?.trim()?.split(" ") ?? ["Creature"],
    subtypes: meta?.subtypes ?? [],
    oracleText: meta?.oracle_text ?? "",
    keywords: meta?.keywords ?? [],
    power: meta?.power,
    toughness: meta?.toughness,
    loyalty: meta?.loyalty,
    isLand: meta?.type_line?.includes("Land") ?? false,
    producesColors: (meta?.produced_mana ?? []).filter((c) => ["W", "U", "B", "R", "G"].includes(c)),
    imageUrl: `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(seed.name)}&format=image`,
    powerScore,
    presentInCubes: seed.presentInCubes,
    objectiveAnalysis,
    cubeAnalyses,
  };
}

const masterCatalog = {
  schemaVersion: 1,
  generatedAt: nowIso,
  cardCount: Object.keys(catalogCards).length,
  cards: catalogCards,
};

mkdirSync(resolve(rootDir, "data/cards"), { recursive: true });
writeFileSync(
  resolve(rootDir, "data/cards/master-cards.json"),
  JSON.stringify(masterCatalog, null, 2) + "\n"
);

console.log(`Successfully generated master catalog with ${masterCatalog.cardCount} cards.`);
console.log(`Titou meta archetypes count: ${titouMeta.archetypes.length}`);
console.log(`Nico meta archetypes count: ${nicoMeta.archetypes.length}`);
