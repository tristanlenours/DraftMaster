const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'data', 'cubes', 'hugues_pauper');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const content = {
  schemaVersion: 1,
  cubeKey: 'hugues_pauper',
  name: "Huge's Pauper Cube",
  owner: 'hugues',
  activeSnapshotId: 'hugues_pauper@2026-03-01.1',
  cardCount: 450,
  powerTier: 'pauper',
  pacing: 'midrange_attrition',
  fundamentalTurn: {
    targetTurn: 4.5,
    criticalWindow: 'T4-T5',
    pacingDescription: "Format 100% cartes communes sans fast mana ni combo infini dégénéré. La partie bascule lors des tours 4 et 5 par le double-spelling, l'accumulation de card advantage (Mulldrifter, Ninjutsu) et les batailles d'usure sur le board.",
    deckExpectation: "Un deck performant doit présenter une courbe régulière et équilibrée (CMC moyen 2.4 à 2.8), maximiser les échanges 2-pour-1, et rentabiliser ses interactions économiques (Lightning Bolt, Cast Down, Counterspell) pour stabiliser le board au tour 4/5."
  },
  technicalAxes: {
    speedIndex: 4.5,
    interactionDensityPercentage: 22.0,
    averageCmcEstimate: 2.6,
    fixingQuality: 'bouncelands_taplands',
    comboPotential: 'minimal_fair_only'
  },
  fixingDensityPercentage: 11.5,
  dominantMechanics: [
    'Ninjutsu',
    'Blink / ETB Value',
    'Graveyard / Delve',
    'Synthesizer / Artifacts',
    'Tokens / Go-Wide',
    'Card Advantage'
  ],
  archetypes: [
    {
      id: 'hugues:faeries_ninjas_tempo',
      name: 'Dimir / Mono-U Faeries and Ninjas',
      primaryColors: ['U'],
      splashColors: ['B'],
      category: 'midrange',
      description: 'Menaces évasives à 1 mana réactivées par Ninjutsu pour générer du card advantage continu protégé par Counterspell.',
      gameplan: 'Poser une créature évasive T1 (Faerie Seer), attaquer T2 pour Ninjutsu avec Ninja of the Deep Hours, et garder la mana ouverte pour contrer ou retirer.',
      keyCards: [
        '33333333-cccc-4444-8888-ffffffff0001',
        '33333333-cccc-4444-8888-ffffffff0002',
        '33333333-cccc-4444-8888-ffffffff0003'
      ],
      supportCards: [
        '33333333-cccc-4444-8888-ffffffff0004'
      ],
      recommendedCreatureCount: [14, 18],
      recommendedRemovalCount: [4, 7]
    },
    {
      id: 'hugues:boros_synth_tokens',
      name: 'Boros Synthesizer and Burn',
      primaryColors: ['R', 'W'],
      category: 'aggro',
      description: "Moteur d'artefacts récursifs générant des jetons, de la pioche impulsive et un finish dévastateur aux blasts.",
      gameplan: 'Enchaîner Thraben Inspector et Experimental Synthesizer, rejouer les artefacts avec Kor Skyfisher, puis achever aux Lightning Bolt.',
      keyCards: [
        '33333333-cccc-4444-8888-ffffffff0005',
        '33333333-cccc-4444-8888-ffffffff0006',
        '33333333-cccc-4444-8888-ffffffff0007'
      ],
      supportCards: [
        '33333333-cccc-4444-8888-ffffffff0008'
      ],
      recommendedCreatureCount: [15, 19],
      recommendedRemovalCount: [5, 8]
    },
    {
      id: 'hugues:azorius_blink',
      name: 'Azorius Blink and Attrition',
      primaryColors: ['W', 'U'],
      category: 'control',
      description: "Moteur de value ultime en Pauper : réactivation continue d'effets d'arrivée en jeu de Mulldrifter et d'inspecteurs.",
      gameplan: "Stabiliser les premiers tours avec des cantrips et créatures défensives, évoquer Mulldrifter avec Ephemerate pour piocher 6 cartes et submerger l'adversaire.",
      keyCards: [
        '33333333-cccc-4444-8888-ffffffff0009',
        '33333333-cccc-4444-8888-ffffffff0002',
        '33333333-cccc-4444-8888-ffffffff0003'
      ],
      supportCards: [
        '33333333-cccc-4444-8888-ffffffff0006'
      ],
      recommendedCreatureCount: [12, 16],
      recommendedRemovalCount: [5, 8]
    }
  ],
  scoringProfile: {
    tribalSynergyMultiplier: 0.8,
    comboSynergyMultiplier: 0.3,
    fixingPriorityBonus: 1.8,
    curveStrictness: 1.9
  }
};

fs.writeFileSync(path.join(dir, 'cube-meta.json'), JSON.stringify(content, null, 2), 'utf8');
console.log('Successfully created hugues_pauper/cube-meta.json');
