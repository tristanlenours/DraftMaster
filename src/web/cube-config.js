// Static configuration and editorial content for the community cubes.

export const CUBE_KEYS = {
  NICO: "nico_candyshop",
  HUGUES: "hugues_pauper",
  TITOU: "titou_tribal",
  CEDRIC: "cedric_cube",
  TITOU_PEASANT: "titou_arena_peasant_plus",
};

export const CUBE_CONFIGS = {
  [CUBE_KEYS.NICO]: {
    key: CUBE_KEYS.NICO,
    name: "Nico's Vintage Candyshop Cube",
    author: "Nico (@Fedor007)",
    metaPath: "/data/cubes/nico_candyshop/cube-meta.json",
  },
  [CUBE_KEYS.HUGUES]: {
    key: CUBE_KEYS.HUGUES,
    name: "Huge's Pauper Cube",
    author: "Huge / Hugues",
    metaPath: "/data/cubes/hugues_pauper/cube-meta.json",
  },
  [CUBE_KEYS.TITOU]: {
    key: CUBE_KEYS.TITOU,
    name: "Titou's Tribal & Chromatic Cube",
    author: "Tristan (@eltitou007)",
    metaPath: "/data/cubes/titou_tribal/cube-meta.json",
  },
  [CUBE_KEYS.CEDRIC]: {
    key: CUBE_KEYS.CEDRIC,
    name: "Cédric's High-Power Cube",
    author: "Cédric (@Strobinellus)",
    metaPath: "/data/cubes/cedric_cube/cube-meta.json",
  },
  [CUBE_KEYS.TITOU_PEASANT]: {
    key: CUBE_KEYS.TITOU_PEASANT,
    name: "Titou's Arena Peasant Plus Cube",
    author: "Tristan (@eltitou007) / Jank Diver",
    metaPath: "/data/cubes/titou_arena_peasant_plus/cube-meta.json",
  },
};

export const CUBE_FORMAT_DETAILS = {
  [CUBE_KEYS.TITOU]: {
    name: "Titou's Master Guild Challenge®",
    inventedYear: 2016,
    description:
      "Format hybride scellé & draft inventé par Titou pour créer des decks d'un niveau de puissance et d'une fluidité proches du format Construit.",
    phases: [
      {
        phaseNumber: 1,
        title: "La Sélection Secrète de Guilde",
        description:
          "Chaque joueur note secrètement sa guilde de prédilection (combinaison de 2 couleurs). Les choix sont révélés simultanément. En cas de conflit (plusieurs joueurs sur la même guilde), un jet de dé départage les joueurs ; les perdants choisissent une guilde restante.",
      },
      {
        phaseNumber: 2,
        title: "La Distribution (Base Scellée 60 cartes)",
        description:
          "Chaque joueur reçoit son 'Guild Kit' tribal formant le cœur de son pool de 60 cartes : 14 cartes de guilde (dont 5 bilands/terrains), 15 cartes de la couleur primaire, 15 cartes de la couleur secondaire, et 6 cartes incolores/artéfacts.",
      },
      {
        phaseNumber: 3,
        title: "Le Draft de Précision (Packs de 5)",
        description:
          "10 cartes supplémentaires sont draftées sous forme de 2 packs de 5 cartes pour ajuster la curve et les réponses. Mécanique de rattrapage : les joueurs ayant perdu le jet de dé en phase 1 ont priorité. Option Tricolore : possibilité d'échanger un pack contre un pack tricolore dédié (Dragons, Vampires Mardu, etc.).",
      },
    ],
  },
};

export const CUBE_STRATEGIC_ADVICE = {
  [CUBE_KEYS.CEDRIC]: {
    title: "Présentation du Cube & Conseils Stratégiques",
    subtitle: "Vintage Non-Powered 720 cartes • Format interactif d'élite sans Power 9",
    presentation:
      "Le Cube de Cédric (Strobinellus) est un environnement Vintage Non-Powered d'exception de 720 cartes célébrant le jeu interactif de haut niveau. Conçu pour maximiser la profondeur décisionnelle et la rejouabilité, il écarte délibérément le Power 9 (Black Lotus, Moxen originaux) et les verrous de stax non-interactifs (Winter Orb, Smokestack, Tangle Wire). En contrepartie, il rassemble l'excellence absolue de Magic : les 10 Dual Lands originaux d'Alpha/Beta/Revised, les 10 Fetchlands, une accélération sélective (Mana Vault, Grim Monolith, Mox Diamond), le cycle complet des 5 Incarnations d'Évocation MH2 (Solitude, Grief, Fury, Subtlety, Endurance) et 46 Planeswalkers prêts pour Superfriends.",
    keyFacts: [
      {
        label: "Taille du Cube",
        value:
          "720 cartes (50% ouvert par draft de 8 = immense variété, pas de combos rigides A+B)",
      },
      {
        label: "Base de Mana",
        value:
          "10 Vrais Duals + 10 Fetchlands + Fast Mana (Ancient Tomb, Strip Mine, Mox Diamond...)",
      },
      {
        label: "Tour Pivot",
        value: "T3.5 - T4 (Stabilisation par sweepers & planeswalkers face aux départs explosifs)",
      },
      {
        label: "Densité d'Interaction",
        value:
          "25% de sorts de gestion réactive (Swords to Plowshares, Thoughtseize, Force of Will...)",
      },
    ],
    rulesOfDraft: [
      {
        icon: "🎯",
        title: "La Trinité P1P1 : Fast Mana, Tuteurs & Dieux Planeswalkers",
        description:
          "Ouvrez en priorité sur du Fast Mana (Mana Vault, Grim Monolith, Mox Diamond, Ancient Tomb) qui s'insère dans 100% des decks, des Tuteurs universels (Demonic/Vampiric Tutor, Tinker) ou l'un des 4 Planeswalkers Tier S (Oko, Minsc & Boo, Wrenn and Six, Dack Fayden). Les bombes immédiates comme Forth Eorlingas! ou Ragavan sont aussi des first-picks absolus.",
      },
      {
        icon: "💎",
        title: "Priorité Haute aux Fetchlands & Vrais Duals",
        description:
          "Dans un cube de 720 cartes, sécuriser 3 ou 4 fetchs et des Duals originaux dès le début du draft permet de rester ouvert et d'absorber les meilleures cartes ouvertes des packs 2 et 3 sans être bridé par la mana. Ne sous-estimez jamais les terrains arrivant dégagés.",
      },
      {
        icon: "⚡",
        title: "Exigence d'un Plan A Proactif & Létal",
        description:
          "En Vintage Unpowered, un deck purement passif se fait inévitablement déborder par une sortie adverse explosive (Tinker T2, Reanimate T2, Oko T2, Forth Eorlingas). Votre deck doit impérativement porter un plan proactif rapide capable de dicter le rythme de la partie.",
      },
      {
        icon: "⚠️",
        title: "Gérer la Variance du Format 720 Cartes",
        description:
          "Seulement 360 cartes sur les 720 sont ouvertes lors d'un draft à 8 joueurs. Ne vous enfermez jamais dans une combo fragile nécessitant deux cartes uniques : privilégiez des packages modulaires et redondants (plusieurs moteurs de sacrifice, plusieurs cibles de réanimation, plusieurs accélérateurs).",
      },
    ],
    keyPackages: [
      {
        category: "Combo / Ramp",
        name: "Tinker & Colosses Mécaniques",
        description:
          "Sacrifiez une babiole ou un jeton pour déposer un Blightsteel Colossus ou un Sundering Titan dès le tour 2 ou 3.",
        cards: [
          "Tinker",
          "Blightsteel Colossus",
          "Sundering Titan",
          "Urza, Lord High Artificer",
          "Grim Monolith",
        ],
      },
      {
        category: "Combo Cimetière",
        name: "Reanimator Express",
        description:
          "Enterrez Griselbrand ou Archon of Cruelty dès les premiers tours et relevez-les immédiatement à bas coût avec protection.",
        cards: [
          "Entomb",
          "Reanimate",
          "Animate Dead",
          "Griselbrand",
          "Archon of Cruelty",
          "Shallow Grave",
        ],
      },
      {
        category: "Triche de Créatures",
        name: "Monster Cheat & Sneak Attack",
        description:
          "Contournez les coûts de mana de titans légendaires pour attaquer avec célérité ou envahir la table.",
        cards: [
          "Sneak Attack",
          "Show and Tell",
          "Natural Order",
          "Channel",
          "Worldspine Wurm",
          "Emrakul, the Aeons Torn",
        ],
      },
      {
        category: "Arsenal d'Élite",
        name: "Stoneforge Mystic & Équipements",
        description:
          "Tutorisez Skullclamp, Jitte, Batterskull ou Kaldra Compleat pour convertir n'importe quelle créature en menace majeure.",
        cards: [
          "Stoneforge Mystic",
          "Skullclamp",
          "Umezawa's Jitte",
          "Batterskull",
          "Kaldra Compleat",
          "Sword of Fire and Ice",
        ],
      },
      {
        category: "Aggro & Disruption",
        name: "Armageddon & Sligh Agressif",
        description:
          "Prenez l'avantage tôt au sol avec Ragavan ou Thalia, puis détruisez tous les terrains avec Armageddon pour interdire tout retour adverse.",
        cards: [
          "Armageddon",
          "Ravages of War",
          "Balance",
          "Ragavan, Nimble Pilferer",
          "Thalia, Guardian of Thraben",
          "Sulfuric Vortex",
        ],
      },
    ],
  },
  [CUBE_KEYS.TITOU_PEASANT]: {
    title: "Présentation du Cube & Conseils Stratégiques",
    subtitle:
      "Arena Peasant Plus 360 cartes • Format optimisé par les 10 Shocklands & Synergies Fermées",
    presentation:
      "Inspiré du célèbre Jank Diver Peasant Cube (JDGP), Titou Peasant Plus transcende le format Peasant en substituant aux bilands lents les 10 Shocklands rares, Fabled Passage et Mana Confluence. Associés aux Landscapes MH3 et aux créatures à cyclage de terrain, ces terrains offrent une base de mana parfaite sans temps mort. Le format est résolument orienté sur la synergie bicolore : sans bombes solitaires capables de plier la partie en solo, la victoire appartient aux packages cohérents et aux moteurs d'attrition.",
    keyFacts: [
      {
        label: "Taille du Cube",
        value: "360 cartes (100% ouvert lors d'un draft à 8 = régularité et archétypes fiables)",
      },
      {
        label: "Base de Mana",
        value:
          "10 Shocklands + 10 Ponts MH2 + 10 Landscapes MH3 + Fabled Passage + Mana Confluence",
      },
      {
        label: "Tour Pivot",
        value:
          "T3 - T4 (Ne rien jouer au T2 est fatal : 128 cartes à CMC 2 composent le cœur du cube)",
      },
      {
        label: "Règle de Synergie",
        value: "Les decks 'Good-Stuff' sans thème s'essoufflent face aux synergies fermées",
      },
    ],
    rulesOfDraft: [
      {
        icon: "🎯",
        title: "Priorité Absolue aux Shocklands P1P1",
        description:
          "Les 10 Shocklands sont des Tier S majeurs. En plus de stabiliser vos couleurs sans perdre de tempo, ils sont fetchables par les Landscapes MH3 et les Landcyclers (Lórien Revealed, Troll, Oliphaunt), tout en ouvrant la voie à un splash de 3e couleur.",
      },
      {
        icon: "🧩",
        title: "Le Piège du 'Good-Stuff' sans Thème",
        description:
          "En Peasant, aucune carte ne gagne seule sans synergie. Les decks qui empilent de bonnes cartes disparates se font balayer par les moteurs d'Oni-Cult Anvil, Rosie Cotton ou Arabella. Engagez-vous franchement dans un thème de guilde.",
      },
      {
        icon: "⚡",
        title: "La Règle d'Or du Tour 2",
        description:
          "Avec 128 cartes à 2 manas, le Tour 2 est le round de boxe décisif. Assurez-vous d'avoir au moins 6 à 9 cartes jouables au Tour 2 (créatures à value ou removals efficients) pour ne pas subir le tempo de la table.",
      },
      {
        icon: "🔥",
        title: "Ne Jamais Négliger la Portée Directe (Reach)",
        description:
          "La fin de partie en Peasant se joue souvent hors de la phase de combat : Improvised Club, Arabella, Burst Lightning et Marionette Apprentice contournent les murs de bloqueurs pour grignoter les derniers PV.",
      },
    ],
    keyPackages: [
      {
        category: "Attrition & Burn",
        name: "Sacrifice d'Artefacts & Portée Directe",
        description:
          "Moteur de sacrifice continu drainant l'adversaire à chaque départ d'artefact et terminant au blast direct.",
        cards: [
          "Oni-Cult Anvil",
          "Marionette Apprentice",
          "Dubious Delicacy",
          "Improvised Club",
          "Blood Crypt",
        ],
      },
      {
        category: "Ressource & Vie",
        name: "Économie de Nourriture (Food)",
        description:
          "La Food utilisée non pas pour le simple gain de PV, mais comme munition pour animer des 4/4 ou piocher.",
        cards: ["Tough Cookie", "Vinereap Mentor", "Honest Rutstein", "Overgrown Tomb"],
      },
      {
        category: "Go-Wide",
        name: "Nuée de Jetons & Amplificateurs",
        description:
          "Inondation du champ de bataille de jetons variés amplifiés par des boosts de masse dévastateurs.",
        cards: [
          "Rosie Cotton of South Lane",
          "Mighty Mutanimals",
          "A Killer Among Us",
          "Temple Garden",
        ],
      },
      {
        category: "Card Advantage",
        name: "Draw-Two & Contrôle d'Usure",
        description:
          "Removals inconditionnels couplés à des déclencheurs de pioche récurrente pour asphyxier l'adversaire.",
        cards: [
          "Morbid Opportunist",
          "Shoreline Looter",
          "Sneaky Snacker",
          "The Bath Song",
          "Watery Grave",
        ],
      },
      {
        category: "Masse Agressive",
        name: "Boros Game Objects",
        description:
          "Production d'une multitude d'objets de jeu (jetons, auras, artefacts) convertis en volées de dégâts par Arabella.",
        cards: [
          "Arabella, Abandoned Doll",
          "Case of the Gateway Express",
          "Mechanized Ninja Cavalry",
          "Sacred Foundry",
        ],
      },
    ],
  },
  [CUBE_KEYS.TITOU]: {
    title: "Présentation du Cube & Conseils Stratégiques",
    subtitle: "Titou's Tribal & Chromatic 545 cartes • Maîtrise des synergies tribales & Seigneurs",
    presentation:
      "Le Titou Tribal & Chromatic Cube est une célébration des grandes familles de créatures de Magic (Gobelins, Elfes, Vampires, Zombies, Humains, Sorciers, Dragons...). Structuré autour des seigneurs tribaux et des récompenses d'archétypes, il privilégie l'effet boule de neige et le combat tactique. La base de mana généreuse permet aux tribus de s'étendre sur 2 ou 3 couleurs.",
    keyFacts: [
      {
        label: "Taille du Cube",
        value: "545 cartes (Format Master Guild Challenge & Draft traditionnel)",
      },
      {
        label: "Base de Mana",
        value: "Bilands tribaux, Cavern of Souls, Unclaimed Territory, fixers chromatiques",
      },
      {
        label: "Tour Pivot",
        value: "T4 (Masse critique tribale, pose d'un seigneur ou d'une bombe tribale)",
      },
      {
        label: "Interaction",
        value: "16% de removals ciblés (à réserver en priorité pour casser les moteurs adverses)",
      },
    ],
    rulesOfDraft: [
      {
        icon: "🎯",
        title: "P1P1 : Seigneurs Universels & Fixers Chromatiques",
        description:
          "Priorisez les seigneurs souples (Metallic Mimic, Adaptive Automaton, Herald's Horn, Realmwalker) et les bombes de couleur (Cavern of Souls, The Great Henge).",
      },
      {
        icon: "👑",
        title: "Équilibre Seigneurs vs Masse Tribale",
        description:
          "Un deck tribal performant doit rassembler 16 à 20 créatures partageant le type ou le thème, avec un équilibre entre créatures à bas coût et seigneurs multiplicateurs.",
      },
      {
        icon: "🛡️",
        title: "Ne Jamais Sacrifier la Gestion",
        description:
          "Même dans un deck tribal proactif, conservez 4 à 6 sorts de gestion pour éliminer les seigneurs adverses avant qu'ils ne verrouillent le plateau.",
      },
      {
        icon: "🌈",
        title: "Exploiter les Tribus Tricolores",
        description:
          "Certaines tribus comme les Vampires (Mardu WBR) ou les Humains gagnent une dimension supérieure en exploitant une 3e couleur grâce aux fixers tribaux.",
      },
    ],
    keyPackages: [
      {
        category: "Aggro & Burn",
        name: "Gobelins Déferlants",
        description:
          "Pression agressive dès le T1, chair à canon sacrificielle et coup de grâce avec Goblin Grenade ou Muxus.",
        cards: ["Goblin Grenade", "Muxus, Goblin Grandee", "Goblin Chieftain", "Krenko, Mob Boss"],
      },
      {
        category: "Ramp & Débordement",
        name: "Elfes & Mana Débridé",
        description:
          "Génération exponentielle de mana pour déborder l'adversaire ou poser un Craterhoof Behemoth.",
        cards: [
          "Elvish Archdruid",
          "Priest of Titania",
          "Craterhoof Behemoth",
          "Ezuri, Renegade Leader",
        ],
      },
      {
        category: "Aristocrates",
        name: "Vampires & Drain de Vie",
        description:
          "Guerre d'usure grattant les points de vie à chaque mort de créature tout en maintenant un total de PV élevé.",
        cards: [
          "Blood Artist",
          "Captivating Vampire",
          "Vito, Thorn of the Dusk Rose",
          "Sorin, Imperious Bloodlord",
        ],
      },
      {
        category: "Cimetière",
        name: "Zombies Déferlants & Récursion",
        description:
          "Une armée impossible à éteindre qui revient sans cesse du cimetière pour submerger les défenses.",
        cards: ["Lord of the Accursed", "Diregraf Colossus", "Gravecrawler", "Undead Augur"],
      },
    ],
  },
  [CUBE_KEYS.NICO]: {
    title: "Présentation du Cube & Conseils Stratégiques",
    subtitle:
      "Powered Vintage 730 cartes • Le summum de la puissance, du Fast Mana et des combos en un tour",
    presentation:
      "Le Nico's Vintage Candyshop Cube est un monument du Powered Vintage rassemblant 730 cartes parmi les plus redoutables de toute l'histoire de Magic. Avec le Power 9 intégral (Black Lotus, les 5 Moxen, Time Walk, Ancestral Recall, Timetwister), Sol Ring, Mana Crypt, Library of Alexandria, Bazaar of Baghdad et les combos les plus foudroyantes (Underworld Breach Storm, Tinker-Blightsteel, Sneak & Show, Reanimator T1), c'est un format à la vélocité supersonique où le Tour Fondamental T2 fait office de juge de paix. Pour triompher, vous devez soit initier une sortie proactive dévastatrice dès le T1/T2, soit disposer d'interactions gratuites (Force of Will, Force of Negation, Mindbreak Trap, Daze, Mental Misstep) pour survivre au premier assaut.",
    keyFacts: [
      {
        label: "Taille du Cube",
        value:
          "730 cartes (50% ouvert par draft de 8 = immense rejouabilité, redondance indispensable)",
      },
      {
        label: "Niveau de Puissance",
        value: "Powered Vintage (Power 9 complet + Fast Mana absolu)",
      },
      {
        label: "Tour Pivot",
        value: "T2 (Critique T1-T3 : la partie peut se plier ou se verrouiller dès le tour 2)",
      },
      {
        label: "Fixation de Mana",
        value: "10 Fetchlands + 10 Vrais Duals originaux + Fast Mana omniprésent",
      },
    ],
    rulesOfDraft: [
      {
        icon: "💎",
        title: "La Hiérarchie Absolue P1P1 : Power 9 & Fast Mana",
        description:
          "Black Lotus, Sol Ring, Time Walk, Ancestral Recall et les Moxen passent avant absolument tout. Le fast mana s'insère dans 100% des archétypes et brise la symétrie du tempo. Les tuteurs majeurs (Demonic Tutor, Vampiric Tutor, Tinker) viennent juste après.",
      },
      {
        icon: "🛡️",
        title: "L'Impératif de l'Interaction à 0 Mana",
        description:
          "Dans un univers où l'adversaire peut poser Griselbrand T1 ou lancer Underworld Breach T2, piocher des contres gratuits (Force of Will, Force of Negation, Mindbreak Trap, Daze, Subtlety) ou des removals à 1 mana (Swords to Plowshares, Lightning Bolt, Thoughtseize) est une question de pure survie.",
      },
      {
        icon: "⚡",
        title: "Priorité Élevée aux Fetchlands & Bilands Originaux",
        description:
          "Pour exploiter la puissance brute des cartes multicolores sans concéder de tempo, sécurisez 4 à 6 terrains arrivant dégagés dès les packs 1 et 2. Les Fetchlands alimentent également le cimetière pour Underworld Breach et Treasure Cruise.",
      },
      {
        icon: "🧩",
        title: "Naviguer la Variance à 730 Cartes par la Redondance",
        description:
          "Seules 360 cartes sont ouvertes sur les 730 lors d'un draft à 8. Évitez les combos fermées qui exigent deux pièces uniques strictes non tutorables. Privilégiez des modules à forte interchangeabilité (plusieurs réanimateurs, plusieurs gros payoffs, plusieurs cantrips).",
      },
    ],
    keyPackages: [
      {
        category: "Power 9 & Accélération",
        name: "Fast Mana & Tricherie de Tempo",
        description:
          "Accélération brute brisant la courbe de mana dès le premier tour pour imposer une avance irrattrapable.",
        cards: [
          "Black Lotus",
          "Sol Ring",
          "Time Walk",
          "Ancestral Recall",
          "Mana Crypt",
          "Mox Sapphire",
        ],
      },
      {
        category: "Combo / Ramp",
        name: "Tinker & Colosses Mécaniques",
        description:
          "Conversion d'un artefact modeste en colosse létal ou moteur de jeu écrasant dès le tour 2.",
        cards: [
          "Tinker",
          "Blightsteel Colossus",
          "Bolas's Citadel",
          "Urza, Lord High Artificer",
          "Tolarian Academy",
        ],
      },
      {
        category: "Combo Cimetière",
        name: "Reanimator Foudroyant",
        description:
          "Dépose d'un monstre de légende au cimetière suivi d'une réanimation à bas coût protégée par des contres.",
        cards: [
          "Entomb",
          "Reanimate",
          "Animate Dead",
          "Griselbrand",
          "Archon of Cruelty",
          "Atraxa, Grand Unifier",
        ],
      },
      {
        category: "Triche de Créatures",
        name: "Sneak Attack & Show and Tell",
        description:
          "Contournement des coûts de mana pour déployer Emrakul ou Atraxa avec célérité.",
        cards: [
          "Sneak Attack",
          "Show and Tell",
          "Through the Breach",
          "Oath of Druids",
          "Emrakul, the Aeons Torn",
        ],
      },
      {
        category: "Combo Storm",
        name: "Underworld Breach & Storm",
        description:
          "Enchaînement de sorts rituels et de cantrips pour alimenter le cimetière et conclure avec Brain Freeze ou Tendrils.",
        cards: [
          "Underworld Breach",
          "Lion's Eye Diamond",
          "Brain Freeze",
          "Tendrils of Agony",
          "Lotus Petal",
        ],
      },
    ],
  },
  [CUBE_KEYS.HUGUES]: {
    title: "Présentation du Cube & Conseils Stratégiques",
    subtitle: "Huge's Pauper Cube 357 cartes • La pureté tactique des communes sans Fast Mana",
    presentation:
      "Le Pauper Cube de Hugues est un hommage vibrant à l'essence tactique de Magic. Composé exclusivement de cartes communes, il élimine délibérément le fast mana, les bombes solitaires incontrôlables et les combos dégénérés. Ici, chaque point de vie et chaque carte comptent double : les victoires s'arrachent au combat sur le champ de bataille, par le double-spelling et par l'accumulation méthodique d'avantages 2-pour-1 (Mulldrifter, Ninjutsu). Avec un Tour Pivot T4.5 - T5, c'est le format par excellence du jeu interactif et de la construction de courbe rigoureuse.",
    keyFacts: [
      {
        label: "Taille du Cube",
        value: "357 cartes (100% ouvert lors d'un draft à 8 = régularité maximale des archétypes)",
      },
      {
        label: "Niveau de Puissance",
        value: "Pauper (100% cartes communes, parties interactives et équilibrées)",
      },
      {
        label: "Tour Pivot",
        value: "T4.5 - T5 (Stabilisation, double-spelling et bascule de l'avantage de cartes)",
      },
      {
        label: "Fixation de Mana",
        value: "Bouncelands (Karoo), Bridges MH2, Campagnes & Terrains arrivant engagés",
      },
    ],
    rulesOfDraft: [
      {
        icon: "🎯",
        title: "La Courbe de Mana est Reine",
        description:
          "En Pauper, rater son tour 2 ou son tour 3 est rédhibitoire. Visez une courbe dense centrée sur 1-3 manas (CMC moyen entre 2.4 et 2.8) pour toujours développer du jeu tout en gardant du mana pour interagir.",
      },
      {
        icon: "💎",
        title: "Maximiser les Échanges 2-pour-1",
        description:
          "Sans créatures surpuissantes capables de renverser une table à elles seules, la partie se gagne à l'usure : privilégiez les créatures avec effets d'arrivée en jeu (Mulldrifter, Thraben Inspector, Kor Skyfisher) et la récursion.",
      },
      {
        icon: "⚖️",
        title: "Anticiper le Tempo des Bouncelands",
        description:
          "Les Bouncelands garantissent deux sources de mana sur une seule carte mais arrivent engagés. Planifiez vos séquences de jeu pour ne pas sacrifier votre tempo face aux départs agressifs.",
      },
      {
        icon: "🛡️",
        title: "Ne Jamais Négliger les Removals Polyvalents",
        description:
          "Lightning Bolt, Cast Down, Blightning et Counterspell sont les piliers défensifs indispensables pour neutraliser les menaces adverses et protéger vos propres moteurs de value.",
      },
    ],
    keyPackages: [
      {
        category: "Value & Blink",
        name: "Blink & Arrivées en Jeu",
        description:
          "Réactivation continue des meilleurs effets d'arrivée en jeu pour submerger l'adversaire de cartes.",
        cards: ["Mulldrifter", "Kor Skyfisher", "Thraben Inspector", "Counterspell"],
      },
      {
        category: "Tempo & Évasion",
        name: "Ninjutsu & Fées",
        description:
          "Attaques évasives à bas coût converties en pioche et en tempo avec les Ninjas.",
        cards: ["Ninja of the Deep Hours", "Faerie Seer", "Counterspell", "Preordain"],
      },
      {
        category: "Cimetière & Attrition",
        name: "Delve & Tortured Existence",
        description:
          "Alimentation du cimetière pour déployer Gurmag Angler ou boucler des créatures en boucle.",
        cards: ["Gurmag Angler", "Tortured Existence", "Cast Down", "Lightning Bolt"],
      },
      {
        category: "Burn & Contrôle",
        name: "Spellslinger & Reach",
        description:
          "Association de cantrips et de sorts de dégâts directs pour contrôler le plateau et terminer l'adversaire.",
        cards: ["Lightning Bolt", "Blightning", "Preordain", "Counterspell"],
      },
    ],
  },
};
