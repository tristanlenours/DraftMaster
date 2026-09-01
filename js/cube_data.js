// Base de données des 360 cartes du Cube Peasant+ avec Tiers & Commentaires Pédagogiques
const CUBE_CARDS = [
  {
    "name": "Doomed Traveler",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Doomed%20Traveler&format=image&version=normal"
  },
  {
    "name": "Thraben Inspector",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Thraben%20Inspector&format=image&version=normal"
  },
  {
    "name": "Novice Inspector",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Novice%20Inspector&format=image&version=normal"
  },
  {
    "name": "Usher of the Fallen",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Usher%20of%20the%20Fallen&format=image&version=normal"
  },
  {
    "name": "Dauntless Bodyguard",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Dauntless%20Bodyguard&format=image&version=normal"
  },
  {
    "name": "Faerie Guidemother",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Faerie%20Guidemother&format=image&version=normal"
  },
  {
    "name": "Skymarcher Aspirant",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Skymarcher%20Aspirant&format=image&version=normal"
  },
  {
    "name": "Selfless Savior",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Selfless%20Savior&format=image&version=normal"
  },
  {
    "name": "Snarlfang Vermin",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Snarlfang%20Vermin&format=image&version=normal"
  },
  {
    "name": "Giant Killer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Giant%20Killer&format=image&version=normal"
  },
  {
    "name": "Clay-Fired Bricks",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Clay-Fired%20Bricks&format=image&version=normal"
  },
  {
    "name": "Nurturing Pixie",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Nurturing%20Pixie&format=image&version=normal"
  },
  {
    "name": "Spirited Companion",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Spirited%20Companion&format=image&version=normal"
  },
  {
    "name": "Charming Prince",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Charming%20Prince&format=image&version=normal"
  },
  {
    "name": "Cathar Commando",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Cathar%20Commando&format=image&version=normal"
  },
  {
    "name": "Ambitious Farmhand",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Ambitious%20Farmhand&format=image&version=normal"
  },
  {
    "name": "Adanto Vanguard",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Adanto%20Vanguard&format=image&version=normal"
  },
  {
    "name": "Resolute Reinforcements",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Resolute%20Reinforcements&format=image&version=normal"
  },
  {
    "name": "Wall of Omens",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Wall%20of%20Omens&format=image&version=normal"
  },
  {
    "name": "Guardian of New Benalia",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Guardian%20of%20New%20Benalia&format=image&version=normal"
  },
  {
    "name": "Ephemerate",
    "tier": "A",
    "color": "Blanc",
    "cmc": 1,
    "type": "Instant",
    "comment": "Blink une créature à l'arrivée en jeu et se répète gratuitement au tour suivant avec Rebond.",
    "image": "https://api.scryfall.com/cards/named?exact=Ephemerate&format=image&version=normal"
  },
  {
    "name": "Loran's Escape",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Loran%27s%20Escape&format=image&version=normal"
  },
  {
    "name": "Reprieve",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Reprieve&format=image&version=normal"
  },
  {
    "name": "Ossification",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Ossification&format=image&version=normal"
  },
  {
    "name": "Get Lost",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Get%20Lost&format=image&version=normal"
  },
  {
    "name": "Valorous Stance",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Valorous%20Stance&format=image&version=normal"
  },
  {
    "name": "Flickerwisp",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Flickerwisp&format=image&version=normal"
  },
  {
    "name": "Elite Spellbinder",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Elite%20Spellbinder&format=image&version=normal"
  },
  {
    "name": "Inspiring Overseer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Inspiring%20Overseer&format=image&version=normal"
  },
  {
    "name": "Militia Bugler",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Militia%20Bugler&format=image&version=normal"
  },
  {
    "name": "Priest of Ancient Lore",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Priest%20of%20Ancient%20Lore&format=image&version=normal"
  },
  {
    "name": "Welcoming Vampire",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Welcoming%20Vampire&format=image&version=normal"
  },
  {
    "name": "Aerial Responder",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Aerial%20Responder&format=image&version=normal"
  },
  {
    "name": "Touch the Spirit Realm",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Touch%20the%20Spirit%20Realm&format=image&version=normal"
  },
  {
    "name": "Banishing Light",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Banishing%20Light&format=image&version=normal"
  },
  {
    "name": "Borrowed Time",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Borrowed%20Time&format=image&version=normal"
  },
  {
    "name": "Stroke of Midnight",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Stroke%20of%20Midnight&format=image&version=normal"
  },
  {
    "name": "Unbreakable Formation",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Unbreakable%20Formation&format=image&version=normal"
  },
  {
    "name": "Serra Paragon",
    "tier": "S",
    "color": "Blanc",
    "cmc": 4,
    "type": "Creature",
    "comment": "Rejoue des terrains ou des sorts à 3 manas ou moins depuis votre cimetière à chaque tour avec gain de points de vie.",
    "image": "https://api.scryfall.com/cards/named?exact=Serra%20Paragon&format=image&version=normal"
  },
  {
    "name": "Master's Guide-Mural",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Master%27s%20Guide-Mural&format=image&version=normal"
  },
  {
    "name": "Hero of the Dunes",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Hero%20of%20the%20Dunes&format=image&version=normal"
  },
  {
    "name": "Timeless Dragon",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Timeless%20Dragon&format=image&version=normal"
  },
  {
    "name": "Cast Out",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Cast%20Out&format=image&version=normal"
  },
  {
    "name": "Restoration Angel",
    "tier": "A",
    "color": "Blanc",
    "cmc": 4,
    "type": "Creature",
    "comment": "Ange Flash 3/4 volant qui blink une créature pour la sauver d'un antibête ou réactiver son effet d'arrivée en jeu.",
    "image": "https://api.scryfall.com/cards/named?exact=Restoration%20Angel&format=image&version=normal"
  },
  {
    "name": "Witch Enchanter",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Witch%20Enchanter&format=image&version=normal"
  },
  {
    "name": "Eagle of Deliverance",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Eagle%20of%20Deliverance&format=image&version=normal"
  },
  {
    "name": "Sunfall",
    "tier": "S",
    "color": "Blanc",
    "cmc": 5,
    "type": "Sorcery",
    "comment": "Exile toutes les créatures de la table et vous laisse avec un incubateur géant prêt à clore la partie.",
    "image": "https://api.scryfall.com/cards/named?exact=Sunfall&format=image&version=normal"
  },
  {
    "name": "Wrath of God",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Wrath%20of%20God&format=image&version=normal"
  },
  {
    "name": "Siren Stormtamer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Siren%20Stormtamer&format=image&version=normal"
  },
  {
    "name": "Spectral Sailor",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Spectral%20Sailor&format=image&version=normal"
  },
  {
    "name": "Shoreline Looter",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Shoreline%20Looter&format=image&version=normal"
  },
  {
    "name": "Opt",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Opt&format=image&version=normal"
  },
  {
    "name": "Consider",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Consider&format=image&version=normal"
  },
  {
    "name": "Brainstorm",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Brainstorm&format=image&version=normal"
  },
  {
    "name": "Spell Pierce",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Spell%20Pierce&format=image&version=normal"
  },
  {
    "name": "Slip Out the Back",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Slip%20Out%20the%20Back&format=image&version=normal"
  },
  {
    "name": "Hard Evidence",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Hard%20Evidence&format=image&version=normal"
  },
  {
    "name": "Moon-Circuit Hacker",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Moon-Circuit%20Hacker&format=image&version=normal"
  },
  {
    "name": "Suspicious Stowaway",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Suspicious%20Stowaway&format=image&version=normal"
  },
  {
    "name": "Faerie Mastermind",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Faerie%20Mastermind&format=image&version=normal"
  },
  {
    "name": "Ledger Shredder",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Ledger%20Shredder&format=image&version=normal"
  },
  {
    "name": "Looter il-Kor",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Looter%20il-Kor&format=image&version=normal"
  },
  {
    "name": "Kitesail Larcenist",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Kitesail%20Larcenist&format=image&version=normal"
  },
  {
    "name": "Snapcaster Mage",
    "tier": "A",
    "color": "Bleu",
    "cmc": 2,
    "type": "Creature",
    "comment": "Donne Flashback à n'importe quel sort de votre cimetière pour un retournement de situation en Flash.",
    "image": "https://api.scryfall.com/cards/named?exact=Snapcaster%20Mage&format=image&version=normal"
  },
  {
    "name": "Counterspell",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Counterspell&format=image&version=normal"
  },
  {
    "name": "Mana Leak",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Mana%20Leak&format=image&version=normal"
  },
  {
    "name": "Make Disappear",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Make%20Disappear&format=image&version=normal"
  },
  {
    "name": "Into the Roil",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Into%20the%20Roil&format=image&version=normal"
  },
  {
    "name": "Fading Hope",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Fading%20Hope&format=image&version=normal"
  },
  {
    "name": "Chart a Course",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Chart%20a%20Course&format=image&version=normal"
  },
  {
    "name": "Blink of an Eye",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Blink%20of%20an%20Eye&format=image&version=normal"
  },
  {
    "name": "Serum Visions",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Serum%20Visions&format=image&version=normal"
  },
  {
    "name": "Whirler Rogue",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Whirler%20Rogue&format=image&version=normal"
  },
  {
    "name": "Mischievous Mystic",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Mischievous%20Mystic&format=image&version=normal"
  },
  {
    "name": "Murmuring Mystic",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Murmuring%20Mystic&format=image&version=normal"
  },
  {
    "name": "Aven Eternal",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Aven%20Eternal&format=image&version=normal"
  },
  {
    "name": "Trinket Mage",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Trinket%20Mage&format=image&version=normal"
  },
  {
    "name": "Champion of Wits",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Champion%20of%20Wits&format=image&version=normal"
  },
  {
    "name": "Thirst for Discovery",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Thirst%20for%20Discovery&format=image&version=normal"
  },
  {
    "name": "The Bath Song",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=The%20Bath%20Song&format=image&version=normal"
  },
  {
    "name": "Compulsive Research",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Compulsive%20Research&format=image&version=normal"
  },
  {
    "name": "Saw It Coming",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Saw%20It%20Coming&format=image&version=normal"
  },
  {
    "name": "Step Through",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Step%20Through&format=image&version=normal"
  },
  {
    "name": "Winged Sponsorgod",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Winged%20Sponsorgod&format=image&version=normal"
  },
  {
    "name": "Skilled Animator",
    "tier": "A",
    "color": "Azorius",
    "cmc": 3,
    "type": "Creature",
    "comment": "Transforme n'importe quel jeton Indice, Nourriture ou Trésor en un monstre artefact 5/5 tant qu'il reste en jeu.",
    "image": "https://api.scryfall.com/cards/named?exact=Skilled%20Animator&format=image&version=normal"
  },
  {
    "name": "Deep Analysis",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Deep%20Analysis&format=image&version=normal"
  },
  {
    "name": "Fact or Fiction",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Fact%20or%20Fiction&format=image&version=normal"
  },
  {
    "name": "Behold the Unspeakable",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Behold%20the%20Unspeakable&format=image&version=normal"
  },
  {
    "name": "Rise from the Tides",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Rise%20from%20the%20Tides&format=image&version=normal"
  },
  {
    "name": "Talrand, Sky Summoner",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Talrand%2C%20Sky%20Summoner&format=image&version=normal"
  },
  {
    "name": "Dungeon Geists",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Dungeon%20Geists&format=image&version=normal"
  },
  {
    "name": "Eddymurk Crab",
    "tier": "A",
    "color": "Bleu",
    "cmc": 8,
    "type": "Creature",
    "comment": "Monstre 5/5 Flash coûtant souvent seulement 2 ou 3 manas en deck Spells, capable d'engager 2 créatures adverses.",
    "image": "https://api.scryfall.com/cards/named?exact=Eddymurk%20Crab&format=image&version=normal"
  },
  {
    "name": "Mulldrifter",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Mulldrifter&format=image&version=normal"
  },
  {
    "name": "Hydroelectric Specimen",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Hydroelectric%20Specimen&format=image&version=normal"
  },
  {
    "name": "Gorging Serpent",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Gorging%20Serpent&format=image&version=normal"
  },
  {
    "name": "Sifter Wurm",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Sifter%20Wurm&format=image&version=normal"
  },
  {
    "name": "Stitcher's Supplier",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Stitcher%27s%20Supplier&format=image&version=normal"
  },
  {
    "name": "Carrion Feeder",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Carrion%20Feeder&format=image&version=normal"
  },
  {
    "name": "Viscera Seer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Viscera%20Seer&format=image&version=normal"
  },
  {
    "name": "Bloodsoaked Champion",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Bloodsoaked%20Champion&format=image&version=normal"
  },
  {
    "name": "Cult Conscript",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Cult%20Conscript&format=image&version=normal"
  },
  {
    "name": "Evolved Sleeper",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Evolved%20Sleeper&format=image&version=normal"
  },
  {
    "name": "Fatal Push",
    "tier": "A",
    "color": "Noir",
    "cmc": 1,
    "type": "Instant",
    "comment": "L'antibête de référence. Détruit n'importe quelle créature à 2 manas ou 4 manas avec Révolte (facile à déclencher avec Trésor/Fetch).",
    "image": "https://api.scryfall.com/cards/named?exact=Fatal%20Push&format=image&version=normal"
  },
  {
    "name": "Cut Down",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Cut%20Down&format=image&version=normal"
  },
  {
    "name": "Village Rites",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Village%20Rites&format=image&version=normal"
  },
  {
    "name": "Corrupted Conviction",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Corrupted%20Conviction&format=image&version=normal"
  },
  {
    "name": "Duress",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Duress&format=image&version=normal"
  },
  {
    "name": "Thoughtseize",
    "tier": "A",
    "color": "Noir",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Disruption T1 suprême. Permet de voir la main adverse et d'exiler sa meilleure menace ou son moteur de jeu.",
    "image": "https://api.scryfall.com/cards/named?exact=Thoughtseize&format=image&version=normal"
  },
  {
    "name": "Blood Artist",
    "tier": "A",
    "color": "Noir",
    "cmc": 2,
    "type": "Creature",
    "comment": "Pousse l'adversaire au suicide à chaque mort de créature sur le terrain (chez vous comme chez lui).",
    "image": "https://api.scryfall.com/cards/named?exact=Blood%20Artist&format=image&version=normal"
  },
  {
    "name": "Zulaport Cutthroat",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Zulaport%20Cutthroat&format=image&version=normal"
  },
  {
    "name": "Priest of Forgotten Gods",
    "tier": "S",
    "color": "Noir",
    "cmc": 2,
    "type": "Creature",
    "comment": "Le meilleur moteur de sacrifice du Cube : force l'adversaire à sacrifier, perd des PV, vous fait piocher et donne 2 manas.",
    "image": "https://api.scryfall.com/cards/named?exact=Priest%20of%20Forgotten%20Gods&format=image&version=normal"
  },
  {
    "name": "Reassembling Skeleton",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Reassembling%20Skeleton&format=image&version=normal"
  },
  {
    "name": "Retrofitted Transmogrant",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Retrofitted%20Transmogrant&format=image&version=normal"
  },
  {
    "name": "Virus Beetle",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Virus%20Beetle&format=image&version=normal"
  },
  {
    "name": "Deep-Cavern Bat",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Deep-Cavern%20Bat&format=image&version=normal"
  },
  {
    "name": "Bitterblossom",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Bitterblossom&format=image&version=normal"
  },
  {
    "name": "Cast Down",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Cast%20Down&format=image&version=normal"
  },
  {
    "name": "Shoot the Sheriff",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Shoot%20the%20Sheriff&format=image&version=normal"
  },
  {
    "name": "Infernal Grasp",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Infernal%20Grasp&format=image&version=normal"
  },
  {
    "name": "Go for the Throat",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Go%20for%20the%20Throat&format=image&version=normal"
  },
  {
    "name": "Bitter Triumph",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Bitter%20Triumph&format=image&version=normal"
  },
  {
    "name": "Dreadhorde Invasion",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Dreadhorde%20Invasion&format=image&version=normal"
  },
  {
    "name": "Midnight Reaper",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Midnight%20Reaper&format=image&version=normal"
  },
  {
    "name": "Grim Haruspex",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Grim%20Haruspex&format=image&version=normal"
  },
  {
    "name": "Morbid Opportunist",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Morbid%20Opportunist&format=image&version=normal"
  },
  {
    "name": "Ayara, First of Locthwain",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Ayara%2C%20First%20of%20Locthwain&format=image&version=normal"
  },
  {
    "name": "Vampire Gourmand",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Vampire%20Gourmand&format=image&version=normal"
  },
  {
    "name": "Chupacabra Echo",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Chupacabra%20Echo&format=image&version=normal"
  },
  {
    "name": "Call of the Ring",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Call%20of%20the%20Ring&format=image&version=normal"
  },
  {
    "name": "Lively Dirge",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Lively%20Dirge&format=image&version=normal"
  },
  {
    "name": "Read the Bones",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Read%20the%20Bones&format=image&version=normal"
  },
  {
    "name": "Phyrexian Arena",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Phyrexian%20Arena&format=image&version=normal"
  },
  {
    "name": "Vampire Nighthawk",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Vampire%20Nighthawk&format=image&version=normal"
  },
  {
    "name": "Murderous Rider",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Murderous%20Rider&format=image&version=normal"
  },
  {
    "name": "Ravenous Chupacabra",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Ravenous%20Chupacabra&format=image&version=normal"
  },
  {
    "name": "Gonti, Lord of Luxury",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Gonti%2C%20Lord%20of%20Luxury&format=image&version=normal"
  },
  {
    "name": "Skinrender",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Skinrender&format=image&version=normal"
  },
  {
    "name": "Master of Death",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Master%20of%20Death&format=image&version=normal"
  },
  {
    "name": "Feed the Swarm",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Feed%20the%20Swarm&format=image&version=normal"
  },
  {
    "name": "Night's Whisper",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Night%27s%20Whisper&format=image&version=normal"
  },
  {
    "name": "Fell the Profane",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Fell%20the%20Profane&format=image&version=normal"
  },
  {
    "name": "Gray Merchant of Asphodel",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Gray%20Merchant%20of%20Asphodel&format=image&version=normal"
  },
  {
    "name": "Shriekmaw",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Shriekmaw&format=image&version=normal"
  },
  {
    "name": "Back for Seconds",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Back%20for%20Seconds&format=image&version=normal"
  },
  {
    "name": "Monastery Swiftspear",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Monastery%20Swiftspear&format=image&version=normal"
  },
  {
    "name": "Dragon's Rage Channeler",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Dragon%27s%20Rage%20Channeler&format=image&version=normal"
  },
  {
    "name": "Rabbit Battery",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Rabbit%20Battery&format=image&version=normal"
  },
  {
    "name": "Kumano Faces Kakkazan",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Kumano%20Faces%20Kakkazan&format=image&version=normal"
  },
  {
    "name": "Goblin Guide",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Guide&format=image&version=normal"
  },
  {
    "name": "Bomat Courier",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Bomat%20Courier&format=image&version=normal"
  },
  {
    "name": "Lightning Bolt",
    "tier": "A",
    "color": "Rouge",
    "cmc": 1,
    "type": "Instant",
    "comment": "Le meilleur sort de dégâts direct du jeu. 3 blessures pour 1 mana, tue presque toutes les créatures du Cube.",
    "image": "https://api.scryfall.com/cards/named?exact=Lightning%20Bolt&format=image&version=normal"
  },
  {
    "name": "Play with Fire",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Play%20with%20Fire&format=image&version=normal"
  },
  {
    "name": "Unholy Heat",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Unholy%20Heat&format=image&version=normal"
  },
  {
    "name": "Shock",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Shock&format=image&version=normal"
  },
  {
    "name": "Burst Lightning",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Burst%20Lightning&format=image&version=normal"
  },
  {
    "name": "Spikefield Hazard",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Spikefield%20Hazard&format=image&version=normal"
  },
  {
    "name": "Flame Slash",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Flame%20Slash&format=image&version=normal"
  },
  {
    "name": "Faithless Looting",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Faithless%20Looting&format=image&version=normal"
  },
  {
    "name": "Young Pyromancer",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Young%20Pyromancer&format=image&version=normal"
  },
  {
    "name": "Dreadhorde Arcanist",
    "tier": "S",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature",
    "comment": "Moteur de tempo absolu en Spellslinger. Rejoue gratuitement tous vos éphémères et rituels à 1 mana (Lightning Bolt, Consider, Thoughtseize) à chaque attaque.",
    "image": "https://api.scryfall.com/cards/named?exact=Dreadhorde%20Arcanist&format=image&version=normal"
  },
  {
    "name": "Battle Cry Goblin",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Battle%20Cry%20Goblin&format=image&version=normal"
  },
  {
    "name": "Earthshaker Khenra",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Earthshaker%20Khenra&format=image&version=normal"
  },
  {
    "name": "Robber of the Rich",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Robber%20of%20the%20Rich&format=image&version=normal"
  },
  {
    "name": "Marauding Mako",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Marauding%20Mako&format=image&version=normal"
  },
  {
    "name": "Viashino Pyromancer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Viashino%20Pyromancer&format=image&version=normal"
  },
  {
    "name": "Magmatic Channeler",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Magmatic%20Channeler&format=image&version=normal"
  },
  {
    "name": "Abrade",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Abrade&format=image&version=normal"
  },
  {
    "name": "Cathartic Reunion",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Cathartic%20Reunion&format=image&version=normal"
  },
  {
    "name": "Thrill of Possibility",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Thrill%20of%20Possibility&format=image&version=normal"
  },
  {
    "name": "Roil Eruption",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Roil%20Eruption&format=image&version=normal"
  },
  {
    "name": "Krenko, Tin Street Kingpin",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Krenko%2C%20Tin%20Street%20Kingpin&format=image&version=normal"
  },
  {
    "name": "Goblin Rabblemaster",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Rabblemaster&format=image&version=normal"
  },
  {
    "name": "Squee, Dubious Monarch",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Squee%2C%20Dubious%20Monarch&format=image&version=normal"
  },
  {
    "name": "Ahn-Crop Crasher",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Ahn-Crop%20Crasher&format=image&version=normal"
  },
  {
    "name": "Gut, True Soul Zealot",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Gut%2C%20True%20Soul%20Zealot&format=image&version=normal"
  },
  {
    "name": "Laelia, the Blade Reforged",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Laelia%2C%20the%20Blade%20Reforged&format=image&version=normal"
  },
  {
    "name": "Seasoned Pyromancer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Seasoned%20Pyromancer&format=image&version=normal"
  },
  {
    "name": "Fable of the Mirror-Breaker",
    "tier": "S",
    "color": "Rouge",
    "cmc": 3,
    "type": "Enchantment",
    "comment": "La meilleure carte du Cube en valeur pure : crée un jeton Trésor, filtre 2 cartes, puis se transforme en Reflets de Kiki-Jiki pour copier vos créatures.",
    "image": "https://api.scryfall.com/cards/named?exact=Fable%20of%20the%20Mirror-Breaker&format=image&version=normal"
  },
  {
    "name": "Book of Mazarbul",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Book%20of%20Mazarbul&format=image&version=normal"
  },
  {
    "name": "Brotherhood's End",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Brotherhood%27s%20End&format=image&version=normal"
  },
  {
    "name": "Light Up the Stage",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Light%20Up%20the%20Stage&format=image&version=normal"
  },
  {
    "name": "Chandra, Acolyte of Flame",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Chandra%2C%20Acolyte%20of%20Flame&format=image&version=normal"
  },
  {
    "name": "Rekindling Phoenix",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Rekindling%20Phoenix&format=image&version=normal"
  },
  {
    "name": "Flametongue Kavu",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Flametongue%20Kavu&format=image&version=normal"
  },
  {
    "name": "Torbran, Thane of Red Fell",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Torbran%2C%20Thane%20of%20Red%20Fell&format=image&version=normal"
  },
  {
    "name": "Wildfire Wickerfolk",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Wildfire%20Wickerfolk&format=image&version=normal"
  },
  {
    "name": "Fear of Burning Alive",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Fear%20of%20Burning%20Alive&format=image&version=normal"
  },
  {
    "name": "Pinnacle Monk",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Pinnacle%20Monk&format=image&version=normal"
  },
  {
    "name": "Glorybringer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Glorybringer&format=image&version=normal"
  },
  {
    "name": "Oliphaunt",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Oliphaunt&format=image&version=normal"
  },
  {
    "name": "Siege-Gang Commander",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Siege-Gang%20Commander&format=image&version=normal"
  },
  {
    "name": "Hellkite Charger",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Hellkite%20Charger&format=image&version=normal"
  },
  {
    "name": "Llanowar Elves",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Llanowar%20Elves&format=image&version=normal"
  },
  {
    "name": "Elvish Mystic",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Elvish%20Mystic&format=image&version=normal"
  },
  {
    "name": "Fyndhorn Elves",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Fyndhorn%20Elves&format=image&version=normal"
  },
  {
    "name": "Gilded Goose",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Gilded%20Goose&format=image&version=normal"
  },
  {
    "name": "Delighted Halfling",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Delighted%20Halfling&format=image&version=normal"
  },
  {
    "name": "Pelt Collector",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Pelt%20Collector&format=image&version=normal"
  },
  {
    "name": "Hardened Scales",
    "tier": "S",
    "color": "Vert",
    "cmc": 1,
    "type": "Enchantment",
    "comment": "Le cœur nucléaire de Selesnya Marqueurs. Double l'impact de Rosie Cotton, Conclave Mentor, Pelt Collector et Quirion Beastcaller.",
    "image": "https://api.scryfall.com/cards/named?exact=Hardened%20Scales&format=image&version=normal"
  },
  {
    "name": "Haywire Mite",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Haywire%20Mite&format=image&version=normal"
  },
  {
    "name": "Bushwhack",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Bushwhack&format=image&version=normal"
  },
  {
    "name": "Utopia Sprawl",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Utopia%20Sprawl&format=image&version=normal"
  },
  {
    "name": "Patchwork Beastie",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Patchwork%20Beastie&format=image&version=normal"
  },
  {
    "name": "Quirion Beastcaller",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Quirion%20Beastcaller&format=image&version=normal"
  },
  {
    "name": "Scavenging Ooze",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Scavenging%20Ooze&format=image&version=normal"
  },
  {
    "name": "Gala Greeters",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Gala%20Greeters&format=image&version=normal"
  },
  {
    "name": "Paradise Druid",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Paradise%20Druid&format=image&version=normal"
  },
  {
    "name": "Wall of Roots",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Wall%20of%20Roots&format=image&version=normal"
  },
  {
    "name": "Sakura-Tribe Elder",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Sakura-Tribe%20Elder&format=image&version=normal"
  },
  {
    "name": "Explore",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Explore&format=image&version=normal"
  },
  {
    "name": "Tamiyo's Safekeeping",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Tamiyo%27s%20Safekeeping&format=image&version=normal"
  },
  {
    "name": "Snakeskin Veil",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Snakeskin%20Veil&format=image&version=normal"
  },
  {
    "name": "Tail Swipe",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Tail%20Swipe&format=image&version=normal"
  },
  {
    "name": "Fecund Greenshell",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Fecund%20Greenshell&format=image&version=normal"
  },
  {
    "name": "Tireless Tracker",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Tireless%20Tracker&format=image&version=normal"
  },
  {
    "name": "Lovestruck Beast",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Lovestruck%20Beast&format=image&version=normal"
  },
  {
    "name": "Llanowar Visionary",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Llanowar%20Visionary&format=image&version=normal"
  },
  {
    "name": "Eternal Witness",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Eternal%20Witness&format=image&version=normal"
  },
  {
    "name": "Reclamation Sage",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Reclamation%20Sage&format=image&version=normal"
  },
  {
    "name": "Jewel Thief",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Jewel%20Thief&format=image&version=normal"
  },
  {
    "name": "A Killer Among Us",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=A%20Killer%20Among%20Us&format=image&version=normal"
  },
  {
    "name": "Rise of the Ants",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Rise%20of%20the%20Ants&format=image&version=normal"
  },
  {
    "name": "Kodama's Reach",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Kodama%27s%20Reach&format=image&version=normal"
  },
  {
    "name": "Cultivate",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Cultivate&format=image&version=normal"
  },
  {
    "name": "Nissa, Resurgent Animist",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Nissa%2C%20Resurgent%20Animist&format=image&version=normal"
  },
  {
    "name": "Evolution Witness",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Evolution%20Witness&format=image&version=normal"
  },
  {
    "name": "Goreclaw, Terror of Qal Sisma",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Goreclaw%2C%20Terror%20of%20Qal%20Sisma&format=image&version=normal"
  },
  {
    "name": "Esika's Chariot",
    "tier": "A",
    "color": "Vert",
    "cmc": 4,
    "type": "Artifact",
    "comment": "Crée 2 chats 2/2 et duplique votre meilleur jeton (chat, incubateur 5/5, monstre 4/4) à chaque attaque.",
    "image": "https://api.scryfall.com/cards/named?exact=Esika%27s%20Chariot&format=image&version=normal"
  },
  {
    "name": "Briarbridge Tracker",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Briarbridge%20Tracker&format=image&version=normal"
  },
  {
    "name": "Birthing Pod",
    "tier": "S",
    "color": "Vert",
    "cmc": 4,
    "type": "Artifact",
    "comment": "Moteur de boîte à outils légendaire. Sacrifie vos créatures à ETB pour aller chercher la réponse exacte sur votre courbe de mana.",
    "image": "https://api.scryfall.com/cards/named?exact=Birthing%20Pod&format=image&version=normal"
  },
  {
    "name": "Beast Within",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Beast%20Within&format=image&version=normal"
  },
  {
    "name": "Garruk Relentless",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Garruk%20Relentless&format=image&version=normal"
  },
  {
    "name": "Trumpeting Herd",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Trumpeting%20Herd&format=image&version=normal"
  },
  {
    "name": "Bala Ged Recovery",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Bala%20Ged%20Recovery&format=image&version=normal"
  },
  {
    "name": "Colossal Skyturtle",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Colossal%20Skyturtle&format=image&version=normal"
  },
  {
    "name": "Greater Tanuki",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Greater%20Tanuki&format=image&version=normal"
  },
  {
    "name": "Generous Ent",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Generous%20Ent&format=image&version=normal"
  },
  {
    "name": "Hornet Queen",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Hornet%20Queen&format=image&version=normal"
  },
  {
    "name": "Titan of Industry",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Titan%20of%20Industry&format=image&version=normal"
  },
  {
    "name": "Craterhoof Behemoth",
    "tier": "S",
    "color": "Vert",
    "cmc": 8,
    "type": "Creature",
    "comment": "Le finisher absolu des decks go-wide et elfes. Donne le piétinement et +X/+X à toute votre armée pour tuer en un coup.",
    "image": "https://api.scryfall.com/cards/named?exact=Craterhoof%20Behemoth&format=image&version=normal"
  },
  {
    "name": "Soulherder",
    "tier": "S",
    "color": "Azorius",
    "cmc": 3,
    "type": "Creature",
    "comment": "Réactive gratuitement une capacité d'arrivée en jeu (ETB) à chaque tour tout en grossissant à chaque blink.",
    "image": "https://api.scryfall.com/cards/named?exact=Soulherder&format=image&version=normal"
  },
  {
    "name": "Reflector Mage",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Reflector%20Mage&format=image&version=normal"
  },
  {
    "name": "Dovin's Veto",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Dovin%27s%20Veto&format=image&version=normal"
  },
  {
    "name": "Cloudblazer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Cloudblazer&format=image&version=normal"
  },
  {
    "name": "Baleful Strix",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Baleful%20Strix&format=image&version=normal"
  },
  {
    "name": "Fallen Shinobi",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Fallen%20Shinobi&format=image&version=normal"
  },
  {
    "name": "Halo Forager",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Halo%20Forager&format=image&version=normal"
  },
  {
    "name": "Hostage Taker",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Hostage%20Taker&format=image&version=normal"
  },
  {
    "name": "Mayhem Devil",
    "tier": "S",
    "color": "Rakdos",
    "cmc": 3,
    "type": "Creature",
    "comment": "Inflige 1 blessure à n'importe quelle cible chaque fois qu'un joueur sacrifie un permanent (créature, trésor, indice, nourriture).",
    "image": "https://api.scryfall.com/cards/named?exact=Mayhem%20Devil&format=image&version=normal"
  },
  {
    "name": "Oni-Cult Anvil",
    "tier": "A",
    "color": "Rakdos",
    "cmc": 2,
    "type": "Artifact",
    "comment": "Génère un jeton construct 1/1 chaque tour où un artefact quitte le champ de bataille et draine 1 PV.",
    "image": "https://api.scryfall.com/cards/named?exact=Oni-Cult%20Anvil&format=image&version=normal"
  },
  {
    "name": "Judith, the Scourge Diva",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Judith%2C%20the%20Scourge%20Diva&format=image&version=normal"
  },
  {
    "name": "Claim the Firstborn",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Claim%20the%20Firstborn&format=image&version=normal"
  },
  {
    "name": "Bloodbraid Elf",
    "tier": "A",
    "color": "Gruul",
    "cmc": 4,
    "type": "Creature",
    "comment": "Cascade légendaire : lance gratuitement un sort à 3 manas ou moins de votre bibliothèque tout en posant une 3/2 célérité.",
    "image": "https://api.scryfall.com/cards/named?exact=Bloodbraid%20Elf&format=image&version=normal"
  },
  {
    "name": "Rhythm of the Wild",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Rhythm%20of%20the%20Wild&format=image&version=normal"
  },
  {
    "name": "Burning-Tree Emissary",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Burning-Tree%20Emissary&format=image&version=normal"
  },
  {
    "name": "Halana and Alena, Partners",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Halana%20and%20Alena%2C%20Partners&format=image&version=normal"
  },
  {
    "name": "Rosie Cotton of South Lane",
    "tier": "S",
    "color": "Selesnya",
    "cmc": 3,
    "type": "Creature",
    "comment": "Génère un jeton Nourriture et pose un marqueur +1/+1 à chaque création de jeton. Synergie explosive avec Tokens et Artefacts.",
    "image": "https://api.scryfall.com/cards/named?exact=Rosie%20Cotton%20of%20South%20Lane&format=image&version=normal"
  },
  {
    "name": "Conclave Mentor",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Conclave%20Mentor&format=image&version=normal"
  },
  {
    "name": "King Darien XLVIII",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=King%20Darien%20XLVIII&format=image&version=normal"
  },
  {
    "name": "Good-Fortune Unicorn",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Good-Fortune%20Unicorn&format=image&version=normal"
  },
  {
    "name": "Ruthless Lawbringer",
    "tier": "A",
    "color": "Orzhov",
    "cmc": 2,
    "type": "Creature",
    "comment": "Détruit n'importe quel permanent non-terrain adverse en sacrifiant une créature ou un jeton. Réutilisable à l'infini avec Pixie/Blink.",
    "image": "https://api.scryfall.com/cards/named?exact=Ruthless%20Lawbringer&format=image&version=normal"
  },
  {
    "name": "Elas il-Kor, Sadistic Pilgrim",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Elas%20il-Kor%2C%20Sadistic%20Pilgrim&format=image&version=normal"
  },
  {
    "name": "Cruel Celebrant",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Cruel%20Celebrant&format=image&version=normal"
  },
  {
    "name": "Lurrus of the Dream-Den",
    "tier": "S",
    "color": "Orzhov",
    "cmc": 3,
    "type": "Creature",
    "comment": "Rejoue un permanent à 2 manas ou moins de votre cimetière chaque tour (Mishra's Bauble, Blood Artist, Nurturing Pixie).",
    "image": "https://api.scryfall.com/cards/named?exact=Lurrus%20of%20the%20Dream-Den&format=image&version=normal"
  },
  {
    "name": "Sprite Dragon",
    "tier": "A",
    "color": "Izzet",
    "cmc": 2,
    "type": "Creature",
    "comment": "Menace volante célérité qui grossit de +1/+1 à chaque éphémère ou rituel lancé.",
    "image": "https://api.scryfall.com/cards/named?exact=Sprite%20Dragon&format=image&version=normal"
  },
  {
    "name": "Third Path Iconoclast",
    "tier": "A",
    "color": "Izzet",
    "cmc": 2,
    "type": "Creature",
    "comment": "Crée un jeton soldat artefact 1/1 à chaque sort non-créature lancé. Nourrit à la fois Spells, Tokens et Artefacts.",
    "image": "https://api.scryfall.com/cards/named?exact=Third%20Path%20Iconoclast&format=image&version=normal"
  },
  {
    "name": "Expressive Iteration",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Expressive%20Iteration&format=image&version=normal"
  },
  {
    "name": "Electrolyze",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Electrolyze&format=image&version=normal"
  },
  {
    "name": "Insidious Roots",
    "tier": "S",
    "color": "Golgari",
    "cmc": 2,
    "type": "Enchantment",
    "comment": "Pilier ultime de Golgari Gravebreak. Génère une armée de plantes et accélère le mana chaque fois qu'une carte quitte votre cimetière.",
    "image": "https://api.scryfall.com/cards/named?exact=Insidious%20Roots&format=image&version=normal"
  },
  {
    "name": "Broodspinner",
    "tier": "A",
    "color": "Golgari",
    "cmc": 2,
    "type": "Creature",
    "comment": "Meule 2 cartes, surveille et se sacrifie pour créer une armée d'araignées volantes 1/1 selon vos cartes de créatures au cimetière.",
    "image": "https://api.scryfall.com/cards/named?exact=Broodspinner&format=image&version=normal"
  },
  {
    "name": "Under the Skin",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Under%20the%20Skin&format=image&version=normal"
  },
  {
    "name": "Meren of Clan Nel Toth",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Meren%20of%20Clan%20Nel%20Toth&format=image&version=normal"
  },
  {
    "name": "Heroic Reinforcements",
    "tier": "A",
    "color": "Boros",
    "cmc": 4,
    "type": "Sorcery",
    "comment": "Crée deux soldats 1/1 et donne +1/+1 et la célérité à toute votre armée. Termine les parties en un tour.",
    "image": "https://api.scryfall.com/cards/named?exact=Heroic%20Reinforcements&format=image&version=normal"
  },
  {
    "name": "Case of the Gateway Express",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Case%20of%20the%20Gateway%20Express&format=image&version=normal"
  },
  {
    "name": "Lightning Helix",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Lightning%20Helix&format=image&version=normal"
  },
  {
    "name": "Inti, Seneschal of the Sun",
    "tier": "A",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature",
    "comment": "Donne le piétinement et +1/+1 en attaquant, et transforme chaque défausse en carte exilée jouable.",
    "image": "https://api.scryfall.com/cards/named?exact=Inti%2C%20Seneschal%20of%20the%20Sun&format=image&version=normal"
  },
  {
    "name": "Repulsive Mutation",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Repulsive%20Mutation&format=image&version=normal"
  },
  {
    "name": "Growth Spiral",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Growth%20Spiral&format=image&version=normal"
  },
  {
    "name": "Tatyova, Benthic Druid",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Tatyova%2C%20Benthic%20Druid&format=image&version=normal"
  },
  {
    "name": "Hydroid Krasis",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Hydroid%20Krasis&format=image&version=normal"
  },
  {
    "name": "Mind Stone",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Mind%20Stone&format=image&version=normal"
  },
  {
    "name": "Guardian Idol",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Guardian%20Idol&format=image&version=normal"
  },
  {
    "name": "Coldsteel Heart",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Coldsteel%20Heart&format=image&version=normal"
  },
  {
    "name": "Arcane Signet",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Arcane%20Signet&format=image&version=normal"
  },
  {
    "name": "Hedron Archive",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Hedron%20Archive&format=image&version=normal"
  },
  {
    "name": "Everflowing Chalice",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Everflowing%20Chalice&format=image&version=normal"
  },
  {
    "name": "Bonesplitter",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Bonesplitter&format=image&version=normal"
  },
  {
    "name": "Eater of Virtue",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Eater%20of%20Virtue&format=image&version=normal"
  },
  {
    "name": "Shadowspear",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Shadowspear&format=image&version=normal"
  },
  {
    "name": "Skullclamp",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Skullclamp&format=image&version=normal"
  },
  {
    "name": "Lightning Greaves",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Lightning%20Greaves&format=image&version=normal"
  },
  {
    "name": "Maul of the Skyclaves",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Maul%20of%20the%20Skyclaves&format=image&version=normal"
  },
  {
    "name": "Heirloom Blade",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Heirloom%20Blade&format=image&version=normal"
  },
  {
    "name": "Patchwork Automaton",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Patchwork%20Automaton&format=image&version=normal"
  },
  {
    "name": "Ornithopter of Paradise",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Ornithopter%20of%20Paradise&format=image&version=normal"
  },
  {
    "name": "Solemn Simulacrum",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Solemn%20Simulacrum&format=image&version=normal"
  },
  {
    "name": "Scrapheap Scrounger",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Scrapheap%20Scrounger&format=image&version=normal"
  },
  {
    "name": "Gingerbrute",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Gingerbrute&format=image&version=normal"
  },
  {
    "name": "Porcelain Legionnaire",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Porcelain%20Legionnaire&format=image&version=normal"
  },
  {
    "name": "Phyrexian Revoker",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Phyrexian%20Revoker&format=image&version=normal"
  },
  {
    "name": "Circuit Mender",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Circuit%20Mender&format=image&version=normal"
  },
  {
    "name": "Steel Overseer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Steel%20Overseer&format=image&version=normal"
  },
  {
    "name": "Containment Construct",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Containment%20Construct&format=image&version=normal"
  },
  {
    "name": "Meteor Golem",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Meteor%20Golem&format=image&version=normal"
  },
  {
    "name": "Smuggler's Copter",
    "tier": "S",
    "color": "Incolore",
    "cmc": 2,
    "type": "Artifact",
    "comment": "Véhicule volant 3/3 avec pilotage 1. Filtre votre main (loot) à chaque attaque et s'intègre dans n'importe quel deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Smuggler%27s%20Copter&format=image&version=normal"
  },
  {
    "name": "Reckoner Bankbuster",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Reckoner%20Bankbuster&format=image&version=normal"
  },
  {
    "name": "Unlicensed Hearse",
    "tier": "B",
    "color": "Synergie",
    "cmc": 2,
    "type": "Creature/Spell",
    "comment": "Excellente carte de support et de synergie dans son archétype. Recommandée dès que vos couleurs sont fixées.",
    "image": "https://api.scryfall.com/cards/named?exact=Unlicensed%20Hearse&format=image&version=normal"
  },
  {
    "name": "Cultivator's Caravan",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Cultivator%27s%20Caravan&format=image&version=normal"
  },
  {
    "name": "Witch's Oven",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Witch%27s%20Oven&format=image&version=normal"
  },
  {
    "name": "Mazemind Tome",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Mazemind%20Tome&format=image&version=normal"
  },
  {
    "name": "Experimental Synthesizer",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Experimental%20Synthesizer&format=image&version=normal"
  },
  {
    "name": "Ichor Wellspring",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Ichor%20Wellspring&format=image&version=normal"
  },
  {
    "name": "Chromatic Star",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Chromatic%20Star&format=image&version=normal"
  },
  {
    "name": "Mishra's Bauble",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Mishra%27s%20Bauble&format=image&version=normal"
  },
  {
    "name": "Springleaf Drum",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Springleaf%20Drum&format=image&version=normal"
  },
  {
    "name": "Phyrexian Dragon Engine",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Phyrexian%20Dragon%20Engine&format=image&version=normal"
  },
  {
    "name": "Inscribed Tablet",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Inscribed%20Tablet&format=image&version=normal"
  },
  {
    "name": "The Celestus",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=The%20Celestus&format=image&version=normal"
  },
  {
    "name": "Treasure Map",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Treasure%20Map&format=image&version=normal"
  },
  {
    "name": "Relic of Progenitus",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Relic%20of%20Progenitus&format=image&version=normal"
  },
  {
    "name": "Hallowed Fountain",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Hallowed%20Fountain&format=image&version=normal"
  },
  {
    "name": "Watery Grave",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Watery%20Grave&format=image&version=normal"
  },
  {
    "name": "Blood Crypt",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Blood%20Crypt&format=image&version=normal"
  },
  {
    "name": "Stomping Ground",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Stomping%20Ground&format=image&version=normal"
  },
  {
    "name": "Temple Garden",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Temple%20Garden&format=image&version=normal"
  },
  {
    "name": "Godless Shrine",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Godless%20Shrine&format=image&version=normal"
  },
  {
    "name": "Steam Vents",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Steam%20Vents&format=image&version=normal"
  },
  {
    "name": "Overgrown Tomb",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Overgrown%20Tomb&format=image&version=normal"
  },
  {
    "name": "Sacred Foundry",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Sacred%20Foundry&format=image&version=normal"
  },
  {
    "name": "Breeding Pool",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Breeding%20Pool&format=image&version=normal"
  },
  {
    "name": "Seachrome Coast",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Seachrome%20Coast&format=image&version=normal"
  },
  {
    "name": "Darkslick Shores",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Darkslick%20Shores&format=image&version=normal"
  },
  {
    "name": "Blackcleave Cliffs",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Blackcleave%20Cliffs&format=image&version=normal"
  },
  {
    "name": "Copperline Gorge",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Copperline%20Gorge&format=image&version=normal"
  },
  {
    "name": "Razorverge Thicket",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Razorverge%20Thicket&format=image&version=normal"
  },
  {
    "name": "Concealed Courtyard",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Concealed%20Courtyard&format=image&version=normal"
  },
  {
    "name": "Spirebluff Canal",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Spirebluff%20Canal&format=image&version=normal"
  },
  {
    "name": "Blooming Marsh",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Blooming%20Marsh&format=image&version=normal"
  },
  {
    "name": "Inspiring Vantage",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Inspiring%20Vantage&format=image&version=normal"
  },
  {
    "name": "Botanical Sanctum",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Botanical%20Sanctum&format=image&version=normal"
  },
  {
    "name": "Adarkar Wastes",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Adarkar%20Wastes&format=image&version=normal"
  },
  {
    "name": "Underground River",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Underground%20River&format=image&version=normal"
  },
  {
    "name": "Sulfurous Springs",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Sulfurous%20Springs&format=image&version=normal"
  },
  {
    "name": "Karplusan Forest",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Karplusan%20Forest&format=image&version=normal"
  },
  {
    "name": "Brushland",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Brushland&format=image&version=normal"
  },
  {
    "name": "Caves of Koilos",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Caves%20of%20Koilos&format=image&version=normal"
  },
  {
    "name": "Shivan Reef",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Shivan%20Reef&format=image&version=normal"
  },
  {
    "name": "Llanowar Wastes",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Llanowar%20Wastes&format=image&version=normal"
  },
  {
    "name": "Battlefield Forge",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Battlefield%20Forge&format=image&version=normal"
  },
  {
    "name": "Yavimaya Coast",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Terrain bicolore arrivant détap. Indispensable pour stabiliser votre base de mana et lancer vos sorts en rythme.",
    "image": "https://api.scryfall.com/cards/named?exact=Yavimaya%20Coast&format=image&version=normal"
  },
  {
    "name": "Mutavault",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Mutavault&format=image&version=normal"
  },
  {
    "name": "Mishra's Factory",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Mishra%27s%20Factory&format=image&version=normal"
  },
  {
    "name": "Demolition Field",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Demolition%20Field&format=image&version=normal"
  },
  {
    "name": "Evolving Wilds",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Evolving%20Wilds&format=image&version=normal"
  },
  {
    "name": "Ash Barrens",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Ash%20Barrens&format=image&version=normal"
  },
  {
    "name": "Fabled Passage",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Fabled%20Passage&format=image&version=normal"
  },
  {
    "name": "Faceless Haven",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Faceless%20Haven&format=image&version=normal"
  },
  {
    "name": "Roadside Reliquary",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Roadside%20Reliquary&format=image&version=normal"
  },
  {
    "name": "Boseiju, Who Endures",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Boseiju%2C%20Who%20Endures&format=image&version=normal"
  },
  {
    "name": "Otawara, Soaring City",
    "tier": "C",
    "color": "Incolore/Mono",
    "cmc": 3,
    "type": "Card",
    "comment": "Bonne carte de remplissage ou outil d'appoint utile pour compléter votre courbe de mana et consolider le deck.",
    "image": "https://api.scryfall.com/cards/named?exact=Otawara%2C%20Soaring%20City&format=image&version=normal"
  }
];
