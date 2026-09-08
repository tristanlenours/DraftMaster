const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'data', 'cards', 'master-cards.json');
const raw = fs.readFileSync(catalogPath, 'utf8');
const catalog = JSON.parse(raw);

const nowIso = new Date().toISOString();

// Helper to construct Scryfall image URL
function getScryfallUrl(name) {
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&format=image`;
}

// Master list of enriched cards (Strictly using Tiers: S, A, B, C, D)
const enrichedCards = [
  // 1. Orcish Bowmasters (Nico Vintage)
  {
    oracleId: '77777777-bbbb-4000-8000-000000000001',
    name: 'Orcish Bowmasters',
    manaCost: '{1}{B}',
    cmc: 2,
    colors: ['B'],
    colorIdentity: ['B'],
    typeLine: 'Creature — Orc Archer',
    types: ['Creature'],
    subtypes: ['Orc', 'Archer'],
    oracleText: 'Flash\nWhen Orcish Bowmasters enters the battlefield and whenever an opponent draws a card except the first one they draw in each of their draw steps, Orcish Bowmasters deals 1 damage to any target. Then amass Orcs 1.',
    keywords: ['Flash', 'Amass'],
    power: '1',
    toughness: '1',
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Orcish Bowmasters'),
    powerScore: {
      score: 48,
      source: 'untapped',
      harmonizationDegree: 'native',
      confidence: 1.0,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop'],
    objectiveAnalysis: {
      summary: "Créature Flash punitive ultra-rentable terrorisant tout joueur tentant de piocher.",
      roles: ['premium_removal', 'beater', 'synergy_enabler'],
      floorRating: 8.5,
      ceilingRating: 10.0,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 5.0, developing: 5.0, parity: 4.8, behind: 4.2 }
    },
    cubeAnalyses: {
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'staple',
        tier: 'A',
        archetypes: ['nico:storm_combo'],
        synergyTags: ['flash_punisher', 'anti_cantrip', 'amass_army'],
        scoreModifier: 18.0,
        analysis: "La punition absolue contre Brainstorm, Wheel of Fortune et Ancestral Recall. Flash permet de détruire un X/1 adverse (Ragavan, dork) tout en posant 2 corps sur table.",
        pedagogy: {
          howToPlay: "À conserver en main avec 2 manas ouverts. Ne le lancez jamais à vide au tour 2 si l'adversaire est susceptible de caster un cantrip (Brainstorm, Ponder, Timetwister). En réponse à la pioche, Bowmasters déclenche une salve de tirs dévastatrice.",
          keySynergies: [
            { cardName: 'Wheel of Fortune', synergyType: 'Combo Meurtrier', description: 'Force l\'adversaire à piocher 7 cartes : Bowmasters mitraille 7 fois et crée une armée 7/7 !' },
            { cardName: 'Brainstorm', synergyType: 'Punition Instantanée', description: 'En réponse à un Brainstorm adverse, inflige 2 dégâts et crée une 2/2 instantanée.' },
            { cardName: 'Timetwister', synergyType: 'Raid Synchrone', description: 'Chaque joueur repioche 7, transformant le board en massacre unilatéral.' }
          ],
          archetypeFit: [
            { colors: ['U', 'B'], archetype: 'Dimir Control / Tempo', grade: 'A', winrateOrScore: '65.0 %', comment: 'Contrôle le rythme, élimine les menaces légères et punit les pioches adverses.' },
            { colors: ['B', 'R'], archetype: 'Rakdos Scam & Burn', grade: 'A', winrateOrScore: '64.5 %', comment: 'Assure un double impact agressif tout en bloquant les bloqueurs x/1.' },
            { colors: ['W', 'B'], archetype: 'Orzhov Attrition', grade: 'A', winrateOrScore: '67.5 %', comment: 'Synergise avec les petites créatures et les effets de sacrifice.' },
            { colors: ['B', 'G'], archetype: 'Golgari Midrange', grade: 'B', winrateOrScore: '58.8 %', comment: 'Stabilisation tempo solide permettant de dérouler les grosses menaces vertes.' }
          ]
        },
        keyPairs: ['Wheel of Fortune', 'Brainstorm', 'Thoughtseize']
      }
    }
  },

  // 2. Lightning Bolt (Shared: Hugues [S], Nico [B], Titou [A])
  {
    oracleId: '11111111-aaaa-4000-8000-000000000001',
    name: 'Lightning Bolt',
    manaCost: '{R}',
    cmc: 1,
    colors: ['R'],
    colorIdentity: ['R'],
    typeLine: 'Instant',
    types: ['Instant'],
    subtypes: [],
    oracleText: 'Lightning Bolt deals 3 damage to any target.',
    keywords: [],
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Lightning Bolt'),
    powerScore: {
      score: 42,
      source: 'expert_heuristic',
      harmonizationDegree: 'calibrated_high',
      confidence: 0.9,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop', 'hugues_pauper', 'titou_tribal'],
    objectiveAnalysis: {
      summary: "Sort d'interaction et de dégâts directs le plus efficient de l'histoire de Magic.",
      roles: ['premium_removal', 'finisher'],
      floorRating: 8.5,
      ceilingRating: 9.8,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 5.0, developing: 4.8, parity: 4.0, behind: 4.2 }
    },
    cubeAnalyses: {
      hugues_pauper: {
        cubeKey: 'hugues_pauper',
        fit: 'staple',
        tier: 'S',
        archetypes: ['hugues:boros_synth_tokens'],
        synergyTags: ['burn', 'cheap_removal', 'reach'],
        scoreModifier: 12.0,
        analysis: "La référence absolue du retrait et du tempo en Pauper. Détruit 95% des créatures du format pour 1 mana éphémère, ou achève l'adversaire. Carte S-Tier incontournable.",
        pedagogy: {
          howToPlay: "Prioriser l'élimination des créatures clés adverses dès leur arrivée (Ninja, Elfe, Synth) pour briser leur tempo. Ne lancer vers les PV adverses qu'en toute fin de partie lorsque le 'lethal' est garanti.",
          keySynergies: [
            { cardName: 'Monastery Swiftspear', synergyType: 'Burst Tempo', description: 'Déclenche Prouesse tout en nettoyant le bloqueur pour laisser passer 2 dégâts supplémentaires.' },
            { cardName: 'Experimental Synthesizer', synergyType: 'Card Advantage', description: 'Révélé sur le Synthétiseur, Bolt est quasi-systématiquement castable pour 1 mana.' }
          ],
          archetypeFit: [
            { colors: ['R', 'W'], archetype: 'Boros Synth & Burn', grade: 'S', winrateOrScore: '66.2 %', comment: 'Removal premium et reach décisif pour fermer la partie.' },
            { colors: ['U', 'R'], archetype: 'Izzet Skred / Spells', grade: 'A', winrateOrScore: '63.8 %', comment: 'Assure le contrôle du board avant le déploiement des serpents ou faeries.' }
          ]
        },
        keyPairs: ['Experimental Synthesizer', 'Monastery Swiftspear']
      },
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'support',
        tier: 'B',
        archetypes: ['nico:storm_combo'],
        synergyTags: ['cheap_removal', 'burn'],
        scoreModifier: 0.0,
        analysis: "Sort fair et économique, mais nettement en retrait dans un environnement dominé par le Fast Mana T1/T2 et les monstres colossaux (Griselbrand, Blightsteel). Reste une réponse honnête à Ragavan.",
        pedagogy: {
          howToPlay: "En Vintage, gardez Bolt pour tuer Ragavan, Bowmasters ou Ocelot Pride au tour 1. Ne comptez pas dessus pour stopper les réanimations de monstres 7/7.",
          keySynergies: [
            { cardName: 'Underworld Breach', synergyType: 'Mitraillage Escape', description: 'Rejouable depuis le cimetière avec Breach pour vider les points de vie résiduels.' }
          ],
          archetypeFit: [
            { colors: ['U', 'R'], archetype: 'Izzet Tempo / Breach', grade: 'B', winrateOrScore: '56.4 %', comment: 'Gère les menaces légères et augmente le storm count.' },
            { colors: ['R'], archetype: 'Mono-Red Aggro', grade: 'A', winrateOrScore: '59.1 %', comment: 'Pilier indispensable de la courbe agressive directe.' }
          ]
        },
        keyPairs: ['Ragavan, Nimble Pilferer', 'Underworld Breach']
      },
      titou_tribal: {
        cubeKey: 'titou_tribal',
        fit: 'staple',
        tier: 'A',
        archetypes: [],
        synergyTags: ['removal'],
        scoreModifier: 6.0,
        analysis: "Excellent removal pour éliminer les seigneurs tribaux adverses avant qu'ils ne buffent tout le board.",
        pedagogy: { howToPlay: "Cibler en priorité absolue les seigneurs de tribus (Lords) avant la phase d'attaque adverse." },
        keyPairs: []
      }
    }
  },

  // 3. Counterspell (Shared: Hugues [S], Nico [B], Titou [B])
  {
    oracleId: '11111111-aaaa-4000-8000-000000000002',
    name: 'Counterspell',
    manaCost: '{U}{U}',
    cmc: 2,
    colors: ['U'],
    colorIdentity: ['U'],
    typeLine: 'Instant',
    types: ['Instant'],
    subtypes: [],
    oracleText: 'Counter target spell.',
    keywords: [],
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Counterspell'),
    powerScore: {
      score: 38,
      source: 'expert_heuristic',
      harmonizationDegree: 'calibrated_high',
      confidence: 0.9,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop', 'hugues_pauper', 'titou_tribal'],
    objectiveAnalysis: {
      summary: "Le contre inconditionnel par excellence.",
      roles: ['premium_removal'],
      floorRating: 7.5,
      ceilingRating: 9.5,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 4.0, developing: 4.8, parity: 4.5, behind: 3.2 }
    },
    cubeAnalyses: {
      hugues_pauper: {
        cubeKey: 'hugues_pauper',
        fit: 'staple',
        tier: 'S',
        archetypes: ['hugues:faeries_ninjas_tempo', 'hugues:azorius_blink'],
        synergyTags: ['hard_counter', 'tempo_lock'],
        scoreModifier: 10.0,
        analysis: "Le roi du contrôle en Pauper. À UU, il stoppe net n'importe quelle menace ou payoff adverse sans restriction. Pilier indiscutable de la couleur bleue.",
        pedagogy: {
          howToPlay: "Gardez toujours deux îles détapées dès le tour 2 si vous n'avez pas de créature avec Ninjutsu à poser. La menace d'un Counterspell force l'adversaire à sous-jouer son tour.",
          keySynergies: [
            { cardName: 'Ninja of the Deep Hours', synergyType: 'Protection du Moteur', description: 'Une fois le Ninja sur table, Counterspell protège votre flux de cartes continu.' }
          ],
          archetypeFit: [
            { colors: ['U', 'B'], archetype: 'Dimir Faeries / Ninjas', grade: 'S', winrateOrScore: '65.5 %', comment: 'Verrouille les réponses adverses et scelle la victoire de tempo.' },
            { colors: ['W', 'U'], archetype: 'Azorius Control', grade: 'A', winrateOrScore: '61.0 %', comment: 'Assure la transition vers les moteurs lourds (Mulldrifter).' }
          ]
        },
        keyPairs: ['Ninja of the Deep Hours', 'Mulldrifter']
      },
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'support',
        tier: 'B',
        archetypes: ['nico:artifact_ramp'],
        synergyTags: ['counterspell'],
        scoreModifier: -2.0,
        analysis: "Trop lent face au Fast Mana qui impose des réponses à 0 mana (Force of Will, Daze, Mindbreak Trap). Payer UU au T2 est souvent trop tard face à Lotus ou Breach.",
        pedagogy: {
          howToPlay: "Ne le priorisez pas au draft face à Force of Will ou Mana Drain. Utilisez-le comme contre secondaire pour consolider le milieu de partie.",
          keySynergies: [],
          archetypeFit: [
            { colors: ['U'], archetype: 'Mono-Blue Control', grade: 'B', winrateOrScore: '55.0 %', comment: 'Bonne réponse générique quand la base de mana est 100% îles.' }
          ]
        },
        keyPairs: ['Force of Will']
      },
      titou_tribal: {
        cubeKey: 'titou_tribal',
        fit: 'support',
        tier: 'B',
        archetypes: [],
        synergyTags: ['counterspell'],
        scoreModifier: 2.0,
        analysis: "Contre solide mais son coût double-bleu ({U}{U}) est exigeant dans un cube axé sur les guildes multicolores.",
        pedagogy: { howToPlay: "Attention aux sources de mana colorées pour garantir {U}{U} au T2." },
        keyPairs: []
      }
    }
  },

  // 4. Mulldrifter (Shared: Hugues [S], Nico [C])
  {
    oracleId: '11111111-aaaa-4000-8000-000000000003',
    name: 'Mulldrifter',
    manaCost: '{4}{U}',
    cmc: 5,
    colors: ['U'],
    colorIdentity: ['U'],
    typeLine: 'Creature — Elemental',
    types: ['Creature'],
    subtypes: ['Elemental'],
    oracleText: 'Flying\nWhen Mulldrifter enters the battlefield, draw two cards.\nEvoke {2}{U}',
    keywords: ['Flying', 'Evoke'],
    power: '2',
    toughness: '2',
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Mulldrifter'),
    powerScore: {
      score: 34,
      source: 'expert_heuristic',
      harmonizationDegree: 'calibrated_high',
      confidence: 0.85,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop', 'hugues_pauper'],
    objectiveAnalysis: {
      summary: "Moteur de card advantage classique combinant corps aérien et pioche, avec flexibilité d'évocation.",
      roles: ['card_advantage', 'engine', 'beater'],
      floorRating: 6.5,
      ceilingRating: 9.0,
      tempoImpact: 'medium',
      quadrantStrengths: { opening: 3.5, developing: 4.5, parity: 5.0, behind: 4.0 }
    },
    cubeAnalyses: {
      hugues_pauper: {
        cubeKey: 'hugues_pauper',
        fit: 'build_around',
        tier: 'S',
        archetypes: ['hugues:azorius_blink'],
        synergyTags: ['card_advantage', 'blink_target', 'evoke'],
        scoreModifier: 14.0,
        analysis: "Bombe absolue et définition même du format Pauper. Jouable en évocation T3 pour creuser ou en 2/2 vol T5 pour un 3-pour-1. Dévastateur combiné avec Ephemerate.",
        pedagogy: {
          howToPlay: "Trick fondamental d'Évocation : castez pour {2}{U}. Quand le trigger de sacrifice et le trigger de pioche vont sur la pile, répondez avec Ephemerate ! Vous exilez la créature avant qu'elle ne se sacrifie, elle revient comme nouvel objet permanent, pioche 2 cartes supplémentaires et reste sur table !",
          keySynergies: [
            { cardName: 'Ephemerate', synergyType: 'Combo Mythique Pauper', description: 'Piocher 6 cartes et conserver une 2/2 vol pour 4 mana au total.' },
            { cardName: 'Kor Skyfisher', synergyType: 'Rebond Value', description: 'Remonte Mulldrifter en main après résolution pour le rejouer plus tard.' }
          ],
          archetypeFit: [
            { colors: ['W', 'U'], archetype: 'Azorius Blink', grade: 'S', winrateOrScore: '68.0 %', comment: 'Le payoff absolu du jeu de rebond et d\'attrition.' },
            { colors: ['U', 'R'], archetype: 'Izzet Skred', grade: 'A', winrateOrScore: '62.4 %', comment: 'Moteur de pioche stabilisateur pour alimenter les sorts de contrôle.' }
          ]
        },
        keyPairs: ['Ephemerate', 'Kor Skyfisher']
      },
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'filler',
        tier: 'C',
        archetypes: [],
        synergyTags: ['card_advantage'],
        scoreModifier: -14.0,
        analysis: "Payer 3 manas pour piocher 2 ou 5 manas pour une 2/2 est un suicide de tempo en Vintage Powered où la partie se décide T1-T2. Totalement surclassé par Ancestral Recall et Timetwister.",
        pedagogy: {
          howToPlay: "À éviter en Vintage Cube. Trop lent, trop gourmand en mana, ne génère aucune interaction immédiate contre les combos létaux du format."
        },
        keyPairs: []
      }
    }
  },

  // 5. Black Lotus (Nico [S])
  {
    oracleId: '00000000-0000-4000-8000-000000000001',
    name: 'Black Lotus',
    manaCost: '{0}',
    cmc: 0,
    colors: [],
    colorIdentity: [],
    typeLine: 'Artifact',
    types: ['Artifact'],
    subtypes: [],
    oracleText: '{T}, Sacrifice Black Lotus: Add three mana of any one color.',
    keywords: [],
    isLand: false,
    producesColors: ['W', 'U', 'B', 'R', 'G'],
    imageUrl: getScryfallUrl('Black Lotus'),
    powerScore: {
      score: 55,
      source: 'untapped',
      harmonizationDegree: 'native',
      confidence: 1.0,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop'],
    objectiveAnalysis: {
      summary: "La carte la plus puissante de l'histoire de Magic : +3 mana gratuits immédiats.",
      roles: ['mana_ramp', 'bomb'],
      floorRating: 10.0,
      ceilingRating: 10.0,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 5.0, developing: 5.0, parity: 4.8, behind: 4.5 }
    },
    cubeAnalyses: {
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'staple',
        tier: 'S',
        archetypes: ['nico:storm_combo', 'nico:artifact_ramp'],
        synergyTags: ['power_nine', 'fast_mana', 'turn1_win'],
        scoreModifier: 25.0,
        analysis: "Le sommet absolu de la puissance en Vintage Cube. Permet des sorties T1 dévastatrices (Underworld Breach, Tinker, Urza ou double sort dès le premier tour). Pick 1 Pack 1 sans aucune hésitation.",
        pedagogy: {
          howToPlay: "Ne pas hésiter à le sacrifier dès le tour 1 pour poser une menace qui plie la partie (Oko, Tinker dans Blightsteel, Sneak Attack). Dans un plan Storm, conserver pour alimenter Underworld Breach et générer un mana infini.",
          keySynergies: [
            { cardName: 'Underworld Breach', synergyType: 'Mana Infini', description: 'Rejouable indéfiniment depuis le cimetière avec Brain Freeze ou Griselbrand.' },
            { cardName: 'Tinker', synergyType: 'Sortie T1 Colosse', description: 'Sacrifiez Lotus pour lancer Tinker T1 et poser Blightsteel Colossus.' }
          ],
          archetypeFit: [
            { colors: ['U', 'R'], archetype: 'Storm Combo', grade: 'S', winrateOrScore: '72.0 %', comment: 'Le meilleur enabler de storm au monde.' },
            { colors: ['U'], archetype: 'Artifact Ramp', grade: 'S', winrateOrScore: '70.5 %', comment: 'Accélération pure vers les monstres incolores.' }
          ]
        },
        keyPairs: ['Underworld Breach', 'Tinker']
      }
    }
  },

  // 6. Underworld Breach (Nico [S])
  {
    oracleId: '018595a8-ef01-4475-8025-a1c1d81b94e3',
    name: 'Underworld Breach',
    manaCost: '{1}{R}',
    cmc: 2,
    colors: ['R'],
    colorIdentity: ['R'],
    typeLine: 'Enchantment',
    types: ['Enchantment'],
    subtypes: [],
    oracleText: 'Each nonland card in your graveyard has escape. The escape cost is equal to the card\'s mana cost plus exile three other cards from your graveyard.\nAt the beginning of the end step, sacrifice Underworld Breach.',
    keywords: ['Escape'],
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Underworld Breach'),
    powerScore: {
      score: 52,
      source: 'expert_heuristic',
      harmonizationDegree: 'calibrated_high',
      confidence: 0.95,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop'],
    objectiveAnalysis: {
      summary: "Moteur de victoire combo récursif permettant de rejouer tout son cimetière en boucle.",
      roles: ['engine', 'bomb'],
      floorRating: 8.0,
      ceilingRating: 10.0,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 4.5, developing: 5.0, parity: 5.0, behind: 4.8 }
    },
    cubeAnalyses: {
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'build_around',
        tier: 'S',
        archetypes: ['nico:storm_combo'],
        synergyTags: ['escape_loop', 'brain_freeze', 'storm_win'],
        scoreModifier: 22.0,
        analysis: "Le cœur battant du combo Storm moderne dans le Cube de Nico. Associé à Brain Freeze ou Black Lotus, il clôture instantanément la partie dès le tour 2.",
        pedagogy: {
          howToPlay: "Ne le posez sur table que pendant le tour où vous comptez gagner (l'enchantement se sacrifie à la fin du tour). Ayez au moins 3 à 6 cartes au cimetière et un rituel de mana ou un cantrip pour amorcer la boucle.",
          keySynergies: [
            { cardName: 'Brain Freeze', synergyType: 'Meule Infinie', description: 'Castez Brain Freeze pour vous meuler, générant du carburant d\'escape infini pour vider la bibliothèque adverse.' },
            { cardName: 'Lion\'s Eye Diamond', synergyType: 'Moteur de Mana Pur', description: 'Sacrifiez LED en défaussant votre main pour 3 manas, puis rejouez vos sorts via Escape !' }
          ],
          archetypeFit: [
            { colors: ['U', 'R'], archetype: 'Izzet Storm', grade: 'S', winrateOrScore: '69.4 %', comment: 'Condition de victoire principale imbattable si non contrée.' }
          ]
        },
        keyPairs: ['Brain Freeze', 'Black Lotus', 'Lion\'s Eye Diamond']
      }
    }
  },

  // 7. Tinker (Nico [S])
  {
    oracleId: 'b3208538-8924-4ab2-b258-29ceeead2a99',
    name: 'Tinker',
    manaCost: '{2}{U}',
    cmc: 3,
    colors: ['U'],
    colorIdentity: ['U'],
    typeLine: 'Sorcery',
    types: ['Sorcery'],
    subtypes: [],
    oracleText: 'As an additional cost to cast this spell, sacrifice an artifact.\nSearch your library for an artifact card, put that card onto the battlefield, then shuffle.',
    keywords: [],
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Tinker'),
    powerScore: {
      score: 51,
      source: 'expert_heuristic',
      harmonizationDegree: 'calibrated_high',
      confidence: 0.95,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop'],
    objectiveAnalysis: {
      summary: "Tricheur de mana légendaire posant directement un artefact titanesque depuis la bibliothèque au tour 2 ou 3.",
      roles: ['engine', 'bomb'],
      floorRating: 8.5,
      ceilingRating: 10.0,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 5.0, developing: 5.0, parity: 4.8, behind: 4.5 }
    },
    cubeAnalyses: {
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'build_around',
        tier: 'S',
        archetypes: ['nico:artifact_ramp'],
        synergyTags: ['artifact_cheat', 'blightsteel', 'bolas_citadel'],
        scoreModifier: 20.0,
        analysis: "Sacrifier un simple Mox ou un jeton pour déposer Blightsteel Colossus ou Bolas's Citadel dès le tour 2. L'un des piliers de non-équité du Vintage Cube.",
        pedagogy: {
          howToPlay: "Assurez-vous d'avoir au moins 1 artefact jetable (Mox, Lotus Petal, Clue, trésor) et vérifiez que l'adversaire n'a pas de contre ouvert ({U}{U} ou Force de Volonté) avant de sacrifier votre ressource.",
          keySynergies: [
            { cardName: 'Blightsteel Colossus', synergyType: 'One-Shot Lethal', description: '11/11 indestructible piétinement et infection : tue en une seule attaque.' },
            { cardName: 'Bolas\'s Citadel', synergyType: 'Vidage de Bibliothèque', description: 'Permet de jouer toute sa bibliothèque en payant des points de vie.' }
          ],
          archetypeFit: [
            { colors: ['U'], archetype: 'Mono-Blue Artifact Ramp', grade: 'S', winrateOrScore: '68.5 %', comment: 'Le meilleur sort bleu après Time Walk et Ancestral.' }
          ]
        },
        keyPairs: ['Black Lotus', 'Sol Ring', 'Blightsteel Colossus']
      }
    }
  },

  // 8. Time Walk (Nico [S])
  {
    oracleId: '00000000-0000-4000-8000-000000000002',
    name: 'Time Walk',
    manaCost: '{1}{U}',
    cmc: 2,
    colors: ['U'],
    colorIdentity: ['U'],
    typeLine: 'Sorcery',
    types: ['Sorcery'],
    subtypes: [],
    oracleText: 'Take an extra turn after this one.',
    keywords: [],
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Time Walk'),
    powerScore: {
      score: 55,
      source: 'untapped',
      harmonizationDegree: 'native',
      confidence: 1.0,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop'],
    objectiveAnalysis: {
      summary: "Prendre un tour supplémentaire pour seulement 2 manas.",
      roles: ['bomb', 'cantrip'],
      floorRating: 10.0,
      ceilingRating: 10.0,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 5.0, developing: 5.0, parity: 5.0, behind: 4.8 }
    },
    cubeAnalyses: {
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'staple',
        tier: 'S',
        archetypes: [],
        synergyTags: ['power_nine', 'extra_turn'],
        scoreModifier: 25.0,
        analysis: "Explore l'avantage de tempo le plus pur de Magic. Se joue dans absolument n'importe quel deck capable de produire du mana bleu.",
        pedagogy: {
          howToPlay: "Se joue dès que vous avez des menaces actives qui peuvent attaquer deux fois, ou pour untap vos terrains et accélérer votre horloge de deux tours d'un coup.",
          keySynergies: [],
          archetypeFit: [
            { colors: ['U'], archetype: 'All Blue Decks', grade: 'S', winrateOrScore: '71.5 %', comment: 'Le sort de tempo absolu du jeu.' }
          ]
        },
        keyPairs: ['Snapcaster Mage', 'Black Lotus']
      }
    }
  },

  // 9. Ancestral Recall (Nico [S])
  {
    oracleId: '00000000-0000-4000-8000-000000000003',
    name: 'Ancestral Recall',
    manaCost: '{U}',
    cmc: 1,
    colors: ['U'],
    colorIdentity: ['U'],
    typeLine: 'Instant',
    types: ['Instant'],
    subtypes: [],
    oracleText: 'Target player draws three cards.',
    keywords: [],
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Ancestral Recall'),
    powerScore: {
      score: 55,
      source: 'untapped',
      harmonizationDegree: 'native',
      confidence: 1.0,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop'],
    objectiveAnalysis: {
      summary: "Piocher 3 cartes à vitesse d'éphémère pour 1 seul mana bleu.",
      roles: ['bomb', 'card_advantage'],
      floorRating: 10.0,
      ceilingRating: 10.0,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 5.0, developing: 5.0, parity: 5.0, behind: 5.0 }
    },
    cubeAnalyses: {
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'staple',
        tier: 'S',
        archetypes: [],
        synergyTags: ['power_nine', 'card_draw'],
        scoreModifier: 25.0,
        analysis: "Le sort de pioche suprême. Toujours rentable, toujours le meilleur pick possible d'un booster.",
        pedagogy: {
          howToPlay: "À lancer à la fin du tour adverse pour garder vos manas ouverts pour un contresort pendant son tour.",
          keySynergies: [],
          archetypeFit: [
            { colors: ['U'], archetype: 'All Blue Decks', grade: 'S', winrateOrScore: '74.2 %', comment: 'Pick 1 Pack 1 absolu.' }
          ]
        },
        keyPairs: ['Bowmasters', 'Black Lotus']
      }
    }
  },

  // 10. Ajani, Nacatl Pariah (Nico [A])
  {
    oracleId: '00000000-0000-4000-8000-000000000004',
    name: 'Ajani, Nacatl Pariah',
    manaCost: '{1}{W}',
    cmc: 2,
    colors: ['W'],
    colorIdentity: ['W', 'R'],
    typeLine: 'Legendary Creature — Cat Warrior',
    types: ['Creature'],
    subtypes: ['Cat', 'Warrior'],
    oracleText: 'When Ajani enters the battlefield, create a 2/1 white Cat creature token.\nWhenever one or more other Cats you control die, exile Ajani, then return him to the battlefield transformed under his owner\'s control.',
    keywords: ['Transform'],
    power: '1',
    toughness: '2',
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Ajani, Nacatl Pariah'),
    powerScore: {
      score: 49,
      source: 'untapped',
      harmonizationDegree: 'native',
      confidence: 1.0,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop'],
    objectiveAnalysis: {
      summary: "Créature bicolore 2-en-1 ultra-agressive se transformant en arpenteur rouge surpuissant.",
      roles: ['bomb', 'beater', 'engine'],
      floorRating: 8.5,
      ceilingRating: 9.8,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 5.0, developing: 4.8, parity: 4.6, behind: 4.0 }
    },
    cubeAnalyses: {
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'staple',
        tier: 'A',
        archetypes: [],
        synergyTags: ['planeswalker_flip', 'aggro_powerhouse'],
        scoreModifier: 19.0,
        analysis: "La meilleure 2-drop blanche de l'histoire moderne de Magic. Pose 3 points de force sur 2 corps et se transforme en Planeswalker dès qu'un chat meurt.",
        pedagogy: {
          howToPlay: "Déployez Ajani au tour 2. Si vous avez un sacrifice outlet ou une attaque favorable avec le chaton 2/1, forcez sa mort pour transformer Ajani immédiatement et commencer à faire sauter les créatures adverses.",
          keySynergies: [],
          archetypeFit: [
            { colors: ['W', 'R'], archetype: 'Boros Aggro', grade: 'A', winrateOrScore: '66.8 %', comment: 'Menace absolue mettant une pression intenable dès le tour 2.' }
          ]
        },
        keyPairs: ['Goblin Bombardment']
      }
    }
  },

  // 11. Elspeth, Storm Slayer (Nico [A])
  {
    oracleId: '00000000-0000-4000-8000-000000000005',
    name: 'Elspeth, Storm Slayer',
    manaCost: '{3}{W}{W}',
    cmc: 5,
    colors: ['W'],
    colorIdentity: ['W'],
    typeLine: 'Legendary Planeswalker — Elspeth',
    types: ['Planeswalker'],
    subtypes: ['Elspeth'],
    oracleText: 'If one or more tokens would be created under your control, twice that many of those tokens are created instead.\n+1: Create a 1/1 white Soldier creature token.\n0: Put a +1/+1 counter on each creature you control. Those creatures gain flying until your next turn.\n-3: Destroy target creature an opponent controls with mana value 3 or greater.',
    keywords: [],
    loyalty: '5',
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Elspeth, Storm Slayer'),
    powerScore: {
      score: 46,
      source: 'untapped',
      harmonizationDegree: 'native',
      confidence: 0.95,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop'],
    objectiveAnalysis: {
      summary: "Arpenteur militaire doublant la production de jetons et capable de raser les grosses menaces.",
      roles: ['bomb', 'engine', 'finisher'],
      floorRating: 8.0,
      ceilingRating: 9.6,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 3.5, developing: 4.6, parity: 5.0, behind: 4.5 }
    },
    cubeAnalyses: {
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'staple',
        tier: 'A',
        archetypes: [],
        synergyTags: ['token_doubler', 'board_stabilizer'],
        scoreModifier: 14.0,
        analysis: "Menace de milieu/fin de partie capable de stabiliser le board immédiatement en créant 2 soldats 1/1 dès son arrivée, tout en menaçant d'octroyer le vol à toute l'armée.",
        pedagogy: {
          howToPlay: "À poser en milieu de partie après avoir nettoyé le board des petites menaces adverses. Si vous avez déjà une armée au sol, activez le [0] pour passer au-dessus des défenses adverses et infliger des dégâts létaux.",
          keySynergies: [],
          archetypeFit: [
            { colors: ['W'], archetype: 'White Weenie / Midrange', grade: 'A', winrateOrScore: '62.0 %', comment: 'Payoff ultime pour transformer une armée de jetons en victoire aérienne.' }
          ]
        },
        keyPairs: ['Ajani, Nacatl Pariah']
      }
    }
  },

  // 12. Ninja of the Deep Hours (Hugues [S])
  {
    oracleId: '22222222-bbbb-4000-8000-000000000001',
    name: 'Ninja of the Deep Hours',
    manaCost: '{3}{U}',
    cmc: 4,
    colors: ['U'],
    colorIdentity: ['U'],
    typeLine: 'Creature — Human Ninja',
    types: ['Creature'],
    subtypes: ['Human', 'Ninja'],
    oracleText: 'Ninjutsu {1}{U}\nWhenever Ninja of the Deep Hours deals combat damage to a player, you may draw a card.',
    keywords: ['Ninjutsu'],
    power: '2',
    toughness: '2',
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Ninja of the Deep Hours'),
    powerScore: {
      score: 36,
      source: 'expert_heuristic',
      harmonizationDegree: 'calibrated_high',
      confidence: 0.9,
      updatedAt: nowIso
    },
    presentInCubes: ['hugues_pauper'],
    objectiveAnalysis: {
      summary: "Moteur de card advantage tactique réactivant les créatures évasives à faible coût.",
      roles: ['engine', 'card_advantage'],
      floorRating: 6.8,
      ceilingRating: 9.3,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 4.8, developing: 4.9, parity: 4.5, behind: 3.0 }
    },
    cubeAnalyses: {
      hugues_pauper: {
        cubeKey: 'hugues_pauper',
        fit: 'build_around',
        tier: 'S',
        archetypes: ['hugues:faeries_ninjas_tempo'],
        synergyTags: ['ninjutsu', 'etb_reuse', 'card_draw'],
        scoreModifier: 12.0,
        analysis: "La signature du Pauper Tempo : posé pour 2 manas sur une créature non bloquée, il pioche immédiatement et remet en main Faerie Seer ou Thraben Inspector pour rejouer leur effet.",
        pedagogy: {
          howToPlay: "Attendez que l'adversaire déclare 'aucun bloqueur' avant d'annoncer le Ninjutsu. Remontez toujours une créature avec un effet d'arrivée en jeu bénéfique (Faerie Seer, Thraben Inspector). Gardez ensuite 1 ou 2 manas ouverts pour protéger le Ninja avec Counterspell ou Spell Pierce.",
          keySynergies: [
            { cardName: 'Faerie Seer', synergyType: 'Moteur Perpétuel', description: 'Créature vol T1 qui permet le Ninjutsu T2 puis se relance pour Scry 2 !' },
            { cardName: 'Snuff Out', synergyType: 'Protection Gratuite', description: 'Permet de tuer un bloqueur adverse sans dépenser de mana avant d\'attaquer.' }
          ],
          archetypeFit: [
            { colors: ['U', 'B'], archetype: 'Dimir Ninjas', grade: 'S', winrateOrScore: '67.0 %', comment: 'Le cœur stratégique de l\'archétype le plus compétitif du format.' }
          ]
        },
        keyPairs: ['Counterspell', 'Snuff Out']
      }
    }
  },

  // 13. Snuff Out (Hugues [S], Nico [B])
  {
    oracleId: '11111111-aaaa-4000-8000-000000000005',
    name: 'Snuff Out',
    manaCost: '{3}{B}',
    cmc: 4,
    colors: ['B'],
    colorIdentity: ['B'],
    typeLine: 'Instant',
    types: ['Instant'],
    subtypes: [],
    oracleText: 'If you control a Swamp, you may pay 4 life rather than pay this spell\'s mana cost.\nDestroy target nonblack creature. It can\'t be regenerated.',
    keywords: [],
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Snuff Out'),
    powerScore: {
      score: 39,
      source: 'expert_heuristic',
      harmonizationDegree: 'calibrated_high',
      confidence: 0.9,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop', 'hugues_pauper'],
    objectiveAnalysis: {
      summary: "Removal gratuit conditionné au contrôle d'un marais au prix de 4 points de vie.",
      roles: ['premium_removal'],
      floorRating: 7.0,
      ceilingRating: 9.5,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 4.8, developing: 4.9, parity: 4.2, behind: 4.0 }
    },
    cubeAnalyses: {
      hugues_pauper: {
        cubeKey: 'hugues_pauper',
        fit: 'staple',
        tier: 'S',
        archetypes: ['hugues:faeries_ninjas_tempo'],
        synergyTags: ['free_spell', 'tempo_swing', 'swamp_synergy'],
        scoreModifier: 12.0,
        analysis: "Le seul removal inconditionnellement gratuit du Pauper ! Taper 0 mana pour détruire une créature tout en posant sa menace donne un avantage de tempo insurmontable.",
        pedagogy: {
          howToPlay: "Payer 4 points de vie est anecdotique en début/milieu de partie face à l'immense swing de tempo que procure un sort gratuit. Utilisez-le pour libérer la voie à une attaque de Ninjutsu ou pour éliminer une menace au moment où l'adversaire a dépensé tout son mana.",
          keySynergies: [
            { cardName: 'Ninja of the Deep Hours', synergyType: 'Ouverture de Ligne', description: 'Détruit le bloqueur adverse gratuitement avant déclaration des attaquants.' }
          ],
          archetypeFit: [
            { colors: ['U', 'B'], archetype: 'Dimir Ninjas', grade: 'S', winrateOrScore: '66.5 %', comment: 'Permet de garder du mana pour contrebalancer les agressions.' }
          ]
        },
        keyPairs: ['Ninja of the Deep Hours']
      },
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'support',
        tier: 'B',
        archetypes: [],
        synergyTags: ['free_spell'],
        scoreModifier: 2.0,
        analysis: "Le coût alternatif est précieux en Vintage, mais la restriction non-noire est punitive face à Grief, Bowmasters ou Griselbrand.",
        pedagogy: {
          howToPlay: "En Vintage, attention aux cibles noires immunisées (Orcish Bowmasters, Griselbrand, Dauthi Voidwalker)."
        },
        keyPairs: []
      }
    }
  },

  // 14. Preordain (Hugues [A], Nico [A])
  {
    oracleId: '11111111-aaaa-4000-8000-000000000009',
    name: 'Preordain',
    manaCost: '{U}',
    cmc: 1,
    colors: ['U'],
    colorIdentity: ['U'],
    typeLine: 'Sorcery',
    types: ['Sorcery'],
    subtypes: [],
    oracleText: 'Scry 2, then draw a card.',
    keywords: ['Scry'],
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Preordain'),
    powerScore: {
      score: 41,
      source: 'expert_heuristic',
      harmonizationDegree: 'calibrated_high',
      confidence: 0.9,
      updatedAt: nowIso
    },
    presentInCubes: ['nico_candyshop', 'hugues_pauper'],
    objectiveAnalysis: {
      summary: "Cantrip ultra-régulier offrant une sélection de 3 cartes profondes.",
      roles: ['cantrip'],
      floorRating: 7.5,
      ceilingRating: 9.2,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 4.9, developing: 4.7, parity: 4.5, behind: 3.8 }
    },
    cubeAnalyses: {
      hugues_pauper: {
        cubeKey: 'hugues_pauper',
        fit: 'staple',
        tier: 'A',
        archetypes: ['hugues:faeries_ninjas_tempo', 'hugues:azorius_blink'],
        synergyTags: ['scry', 'selection', 'cantrip'],
        scoreModifier: 9.0,
        analysis: "Le meilleur cantrip inconditionnel en Pauper où les fetchlands sont absents. Scry 2 garantit de trouver ses terrains ou ses réponses clés.",
        pedagogy: {
          howToPlay: "Ne le lancez pas machinalement au tour 1 si vous n'avez pas de plan précis. Gardez-le pour le tour 2 ou 3 afin de savoir exactement quelle carte vous cherchez à creuser avec Scry 2.",
          keySynergies: [],
          archetypeFit: [
            { colors: ['U'], archetype: 'All Blue Decks', grade: 'A', winrateOrScore: '64.0 %', comment: 'Régularise les départs et lisse la courbe de mana.' }
          ]
        },
        keyPairs: ['Counterspell']
      },
      nico_candyshop: {
        cubeKey: 'nico_candyshop',
        fit: 'staple',
        tier: 'A',
        archetypes: ['nico:storm_combo'],
        synergyTags: ['cantrip', 'storm_count'],
        scoreModifier: 6.0,
        analysis: "Cantrip staple de premier choix pour sculpter sa main et amorcer un tour de Storm ou trouver du Fast Mana.",
        pedagogy: {
          howToPlay: "Utilisez-le pour trouver les pièces manquantes du puzzle combo (Breach, Lotus, Brain Freeze)."
        },
        keyPairs: ['Underworld Breach']
      }
    }
  },

  // 15. Gurmag Angler (Hugues [S])
  {
    oracleId: '22222222-bbbb-4000-8000-000000000003',
    name: 'Gurmag Angler',
    manaCost: '{6}{B}',
    cmc: 7,
    colors: ['B'],
    colorIdentity: ['B'],
    typeLine: 'Creature — Zombie Fish',
    types: ['Creature'],
    subtypes: ['Zombie', 'Fish'],
    oracleText: 'Delve',
    keywords: ['Delve'],
    power: '5',
    toughness: '5',
    isLand: false,
    producesColors: [],
    imageUrl: getScryfallUrl('Gurmag Angler'),
    powerScore: {
      score: 37,
      source: 'expert_heuristic',
      harmonizationDegree: 'calibrated_high',
      confidence: 0.9,
      updatedAt: nowIso
    },
    presentInCubes: ['hugues_pauper'],
    objectiveAnalysis: {
      summary: "Créature 5/5 massive déployée pour seulement 1 mana noir grâce au Delve.",
      roles: ['beater', 'finisher'],
      floorRating: 7.0,
      ceilingRating: 9.4,
      tempoImpact: 'high',
      quadrantStrengths: { opening: 4.2, developing: 4.9, parity: 4.8, behind: 4.2 }
    },
    cubeAnalyses: {
      hugues_pauper: {
        cubeKey: 'hugues_pauper',
        fit: 'staple',
        tier: 'S',
        archetypes: ['hugues:faeries_ninjas_tempo'],
        synergyTags: ['delve', 'beater', 'zombie'],
        scoreModifier: 12.0,
        analysis: "Une 5/5 pour 1 mana noir qui échappe à Lightning Bolt et bloque tout le format. La terreur des champs de bataille Pauper.",
        pedagogy: {
          howToPlay: "Remplissez votre cimetière au T1-T2 avec des cantrips ou de la défausse (Thought Scour, Looting) pour poser la 5/5 dès le T3 avec du mana de contre ouvert.",
          keySynergies: [
            { cardName: 'Counterspell', synergyType: 'Menace Protégée', description: 'Poser Gurmag pour 1 mana et garder UU ouvert pour contrer la réponse adverse.' }
          ],
          archetypeFit: [
            { colors: ['U', 'B'], archetype: 'Dimir Delver / Delve', grade: 'S', winrateOrScore: '65.8 %', comment: 'L\'horloge de fin de partie la plus intimidante.' }
          ]
        },
        keyPairs: ['Counterspell']
      }
    }
  }
];

// Add/merge cards into catalog
let updatedCount = 0;
for (const c of enrichedCards) {
  catalog.cards[c.oracleId] = c;
  updatedCount++;
}

catalog.cardCount = Object.keys(catalog.cards).length;
catalog.generatedAt = nowIso;

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
console.log('Successfully updated master-cards.json with S/A/B/C/D tiers and Scryfall images for', updatedCount, 'cards.');
