// Registre Multi-Cubes du Groupe & Parser CubeCobra
const CUBE_TITOU_CARDS = [
  {
    "name": "Champion of the Parish",
    "tier": "A",
    "color": "Blanc",
    "cmc": 1,
    "type": "Creature - Human Soldier",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
    "image": "https://api.scryfall.com/cards/named?exact=Champion%20of%20the%20Parish&format=image&version=normal"
  },
  {
    "name": "Mother of Runes",
    "tier": "B",
    "color": "Blanc",
    "cmc": 1,
    "type": "Creature - Human Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Mother%20of%20Runes&format=image&version=normal"
  },
  {
    "name": "Hidden Dragonslayer",
    "tier": "A",
    "color": "Blanc",
    "cmc": 2,
    "type": "Creature - Human Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Hidden%20Dragonslayer&format=image&version=normal"
  },
  {
    "name": "Imposing Sovereign",
    "tier": "A",
    "color": "Blanc",
    "cmc": 2,
    "type": "Creature - Human Noble",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Noble).",
    "image": "https://api.scryfall.com/cards/named?exact=Imposing%20Sovereign&format=image&version=normal"
  },
  {
    "name": "Selfless Spirit",
    "tier": "A",
    "color": "Blanc",
    "cmc": 2,
    "type": "Creature - Spirit Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Spirit Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Selfless%20Spirit&format=image&version=normal"
  },
  {
    "name": "Thalia's Lieutenant",
    "tier": "A",
    "color": "Blanc",
    "cmc": 2,
    "type": "Creature - Human Soldier",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
    "image": "https://api.scryfall.com/cards/named?exact=Thalia%27s%20Lieutenant&format=image&version=normal"
  },
  {
    "name": "Thalia, Guardian of Thraben",
    "tier": "A",
    "color": "Blanc",
    "cmc": 2,
    "type": "Legendary Creature - Human Soldier",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Soldier).",
    "image": "https://api.scryfall.com/cards/named?exact=Thalia%2C%20Guardian%20of%20Thraben&format=image&version=normal"
  },
  {
    "name": "Avian Changeling",
    "tier": "C",
    "color": "Blanc",
    "cmc": 3,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Avian%20Changeling&format=image&version=normal"
  },
  {
    "name": "Mirror Entity",
    "tier": "A",
    "color": "Blanc",
    "cmc": 3,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Mirror%20Entity&format=image&version=normal"
  },
  {
    "name": "Linvala, Keeper of Silence",
    "tier": "S",
    "color": "Blanc",
    "cmc": 4,
    "type": "Legendary Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Linvala%2C%20Keeper%20of%20Silence&format=image&version=normal"
  },
  {
    "name": "Ranger of Eos",
    "tier": "A",
    "color": "Blanc",
    "cmc": 4,
    "type": "Creature - Human Soldier",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
    "image": "https://api.scryfall.com/cards/named?exact=Ranger%20of%20Eos&format=image&version=normal"
  },
  {
    "name": "Restoration Angel",
    "tier": "A",
    "color": "Blanc",
    "cmc": 4,
    "type": "Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Restoration%20Angel&format=image&version=normal"
  },
  {
    "name": "Riders of Gavony",
    "tier": "A",
    "color": "Blanc",
    "cmc": 4,
    "type": "Creature - Human Knight",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Knight).",
    "image": "https://api.scryfall.com/cards/named?exact=Riders%20of%20Gavony&format=image&version=normal"
  },
  {
    "name": "Sublime Archangel",
    "tier": "S",
    "color": "Blanc",
    "cmc": 4,
    "type": "Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Sublime%20Archangel&format=image&version=normal"
  },
  {
    "name": "Baneslayer Angel",
    "tier": "S",
    "color": "Blanc",
    "cmc": 5,
    "type": "Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Baneslayer%20Angel&format=image&version=normal"
  },
  {
    "name": "Karmic Guide",
    "tier": "A",
    "color": "Blanc",
    "cmc": 5,
    "type": "Creature - Angel Spirit",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel Spirit).",
    "image": "https://api.scryfall.com/cards/named?exact=Karmic%20Guide&format=image&version=normal"
  },
  {
    "name": "Lyra Dawnbringer",
    "tier": "S",
    "color": "Blanc",
    "cmc": 5,
    "type": "Legendary Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Lyra%20Dawnbringer&format=image&version=normal"
  },
  {
    "name": "Avacyn, Angel of Hope",
    "tier": "S",
    "color": "Blanc",
    "cmc": 8,
    "type": "Legendary Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Avacyn%2C%20Angel%20of%20Hope&format=image&version=normal"
  },
  {
    "name": "Path to Exile",
    "tier": "B",
    "color": "Blanc",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Path%20to%20Exile&format=image&version=normal"
  },
  {
    "name": "Swords to Plowshares",
    "tier": "B",
    "color": "Blanc",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Swords%20to%20Plowshares&format=image&version=normal"
  },
  {
    "name": "Disenchant",
    "tier": "C",
    "color": "Blanc",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Disenchant&format=image&version=normal"
  },
  {
    "name": "Crib Swap",
    "tier": "B",
    "color": "Blanc",
    "cmc": 3,
    "type": "Tribal Instant - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Tribal Instant - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Crib%20Swap&format=image&version=normal"
  },
  {
    "name": "Declaration in Stone",
    "tier": "A",
    "color": "Blanc",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Declaration%20in%20Stone&format=image&version=normal"
  },
  {
    "name": "Timely Reinforcements",
    "tier": "B",
    "color": "Blanc",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Timely%20Reinforcements&format=image&version=normal"
  },
  {
    "name": "Day of Judgment",
    "tier": "A",
    "color": "Blanc",
    "cmc": 4,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Day%20of%20Judgment&format=image&version=normal"
  },
  {
    "name": "Martial Coup",
    "tier": "A",
    "color": "Blanc",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Martial%20Coup&format=image&version=normal"
  },
  {
    "name": "Oblivion Ring",
    "tier": "B",
    "color": "Blanc",
    "cmc": 3,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Oblivion%20Ring&format=image&version=normal"
  },
  {
    "name": "Angelic Destiny",
    "tier": "S",
    "color": "Blanc",
    "cmc": 4,
    "type": "Enchantment - Aura",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Aura).",
    "image": "https://api.scryfall.com/cards/named?exact=Angelic%20Destiny&format=image&version=normal"
  },
  {
    "name": "Delver of Secrets",
    "tier": "C",
    "color": "Bleu",
    "cmc": 1,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Delver%20of%20Secrets&format=image&version=normal"
  },
  {
    "name": "Sage of Epityr",
    "tier": "C",
    "color": "Bleu",
    "cmc": 1,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Sage%20of%20Epityr&format=image&version=normal"
  },
  {
    "name": "Baral, Chief of Compliance",
    "tier": "A",
    "color": "Bleu",
    "cmc": 2,
    "type": "Legendary Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Baral%2C%20Chief%20of%20Compliance&format=image&version=normal"
  },
  {
    "name": "Omenspeaker",
    "tier": "C",
    "color": "Bleu",
    "cmc": 2,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Omenspeaker&format=image&version=normal"
  },
  {
    "name": "Phantasmal Image",
    "tier": "A",
    "color": "Bleu",
    "cmc": 2,
    "type": "Creature - Illusion",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Illusion).",
    "image": "https://api.scryfall.com/cards/named?exact=Phantasmal%20Image&format=image&version=normal"
  },
  {
    "name": "Snapcaster Mage",
    "tier": "A",
    "color": "Bleu",
    "cmc": 2,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Snapcaster%20Mage&format=image&version=normal"
  },
  {
    "name": "Sea Gate Oracle",
    "tier": "C",
    "color": "Bleu",
    "cmc": 3,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Sea%20Gate%20Oracle&format=image&version=normal"
  },
  {
    "name": "Clever Impersonator",
    "tier": "S",
    "color": "Bleu",
    "cmc": 4,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Clever%20Impersonator&format=image&version=normal"
  },
  {
    "name": "Glen Elendra Archmage",
    "tier": "A",
    "color": "Bleu",
    "cmc": 4,
    "type": "Creature - Faerie Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Faerie Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Glen%20Elendra%20Archmage&format=image&version=normal"
  },
  {
    "name": "Stunt Double",
    "tier": "A",
    "color": "Bleu",
    "cmc": 4,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Stunt%20Double&format=image&version=normal"
  },
  {
    "name": "Venser, Shaper Savant",
    "tier": "A",
    "color": "Bleu",
    "cmc": 4,
    "type": "Legendary Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Venser%2C%20Shaper%20Savant&format=image&version=normal"
  },
  {
    "name": "Phyrexian Metamorph",
    "tier": "A",
    "color": "Bleu",
    "cmc": 4,
    "type": "Artifact Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Phyrexian%20Metamorph&format=image&version=normal"
  },
  {
    "name": "Icefall Regent",
    "tier": "A",
    "color": "Bleu",
    "cmc": 5,
    "type": "Creature - Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Icefall%20Regent&format=image&version=normal"
  },
  {
    "name": "Keiga, the Tide Star",
    "tier": "A",
    "color": "Bleu",
    "cmc": 6,
    "type": "Legendary Creature - Dragon Spirit",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon Spirit).",
    "image": "https://api.scryfall.com/cards/named?exact=Keiga%2C%20the%20Tide%20Star&format=image&version=normal"
  },
  {
    "name": "Jace Beleren",
    "tier": "S",
    "color": "Bleu",
    "cmc": 3,
    "type": "Legendary Planeswalker - Jace",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Jace).",
    "image": "https://api.scryfall.com/cards/named?exact=Jace%20Beleren&format=image&version=normal"
  },
  {
    "name": "Blustersquall",
    "tier": "B",
    "color": "Bleu",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Blustersquall&format=image&version=normal"
  },
  {
    "name": "Rapid Hybridization",
    "tier": "B",
    "color": "Bleu",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Rapid%20Hybridization&format=image&version=normal"
  },
  {
    "name": "Arcane Denial",
    "tier": "C",
    "color": "Bleu",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Arcane%20Denial&format=image&version=normal"
  },
  {
    "name": "Counterspell",
    "tier": "C",
    "color": "Bleu",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Counterspell&format=image&version=normal"
  },
  {
    "name": "Cyclonic Rift",
    "tier": "A",
    "color": "Bleu",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Cyclonic%20Rift&format=image&version=normal"
  },
  {
    "name": "Essence Scatter",
    "tier": "C",
    "color": "Bleu",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Essence%20Scatter&format=image&version=normal"
  },
  {
    "name": "Remand",
    "tier": "B",
    "color": "Bleu",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Remand&format=image&version=normal"
  },
  {
    "name": "Dissolve",
    "tier": "B",
    "color": "Bleu",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Dissolve&format=image&version=normal"
  },
  {
    "name": "Forbid",
    "tier": "B",
    "color": "Bleu",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Forbid&format=image&version=normal"
  },
  {
    "name": "Repulse",
    "tier": "C",
    "color": "Bleu",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Repulse&format=image&version=normal"
  },
  {
    "name": "Sage's Dousing",
    "tier": "B",
    "color": "Bleu",
    "cmc": 3,
    "type": "Tribal Instant - Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Tribal Instant - Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Sage%27s%20Dousing&format=image&version=normal"
  },
  {
    "name": "Desertion",
    "tier": "A",
    "color": "Bleu",
    "cmc": 5,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Desertion&format=image&version=normal"
  },
  {
    "name": "Preordain",
    "tier": "C",
    "color": "Bleu",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Preordain&format=image&version=normal"
  },
  {
    "name": "Guul Draz Vampire",
    "tier": "C",
    "color": "Noir",
    "cmc": 1,
    "type": "Creature - Vampire Rogue",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Rogue).",
    "image": "https://api.scryfall.com/cards/named?exact=Guul%20Draz%20Vampire&format=image&version=normal"
  },
  {
    "name": "Gifted Aetherborn",
    "tier": "B",
    "color": "Noir",
    "cmc": 2,
    "type": "Creature - Aetherborn Vampire",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Aetherborn Vampire).",
    "image": "https://api.scryfall.com/cards/named?exact=Gifted%20Aetherborn&format=image&version=normal"
  },
  {
    "name": "Cabal Slaver",
    "tier": "B",
    "color": "Noir",
    "cmc": 3,
    "type": "Creature - Human Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Cabal%20Slaver&format=image&version=normal"
  },
  {
    "name": "Dark Impostor",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Creature - Vampire Assassin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Assassin).",
    "image": "https://api.scryfall.com/cards/named?exact=Dark%20Impostor&format=image&version=normal"
  },
  {
    "name": "Drana, Liberator of Malakir",
    "tier": "S",
    "color": "Noir",
    "cmc": 3,
    "type": "Legendary Creature - Vampire Ally",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Ally).",
    "image": "https://api.scryfall.com/cards/named?exact=Drana%2C%20Liberator%20of%20Malakir&format=image&version=normal"
  },
  {
    "name": "Mad Auntie",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Creature - Goblin Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Mad%20Auntie&format=image&version=normal"
  },
  {
    "name": "Ophiomancer",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Creature - Human Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Ophiomancer&format=image&version=normal"
  },
  {
    "name": "Vampire Nighthawk",
    "tier": "B",
    "color": "Noir",
    "cmc": 3,
    "type": "Creature - Vampire Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Vampire%20Nighthawk&format=image&version=normal"
  },
  {
    "name": "Kalitas, Traitor of Ghet",
    "tier": "S",
    "color": "Noir",
    "cmc": 4,
    "type": "Legendary Creature - Vampire Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Kalitas%2C%20Traitor%20of%20Ghet&format=image&version=normal"
  },
  {
    "name": "Nekrataal",
    "tier": "B",
    "color": "Noir",
    "cmc": 4,
    "type": "Creature - Human Assassin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Assassin).",
    "image": "https://api.scryfall.com/cards/named?exact=Nekrataal&format=image&version=normal"
  },
  {
    "name": "Cairn Wanderer",
    "tier": "A",
    "color": "Noir",
    "cmc": 5,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Cairn%20Wanderer&format=image&version=normal"
  },
  {
    "name": "Sorin, Imperious Bloodlord",
    "tier": "S",
    "color": "Noir",
    "cmc": 3,
    "type": "Legendary Planeswalker - Sorin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Sorin).",
    "image": "https://api.scryfall.com/cards/named?exact=Sorin%2C%20Imperious%20Bloodlord&format=image&version=normal"
  },
  {
    "name": "Tragic Slip",
    "tier": "C",
    "color": "Noir",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Tragic%20Slip&format=image&version=normal"
  },
  {
    "name": "Doom Blade",
    "tier": "C",
    "color": "Noir",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Doom%20Blade&format=image&version=normal"
  },
  {
    "name": "Go for the Throat",
    "tier": "B",
    "color": "Noir",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Go%20for%20the%20Throat&format=image&version=normal"
  },
  {
    "name": "Victim of Night",
    "tier": "C",
    "color": "Noir",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Victim%20of%20Night&format=image&version=normal"
  },
  {
    "name": "Duress",
    "tier": "C",
    "color": "Noir",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Duress&format=image&version=normal"
  },
  {
    "name": "Reanimate",
    "tier": "B",
    "color": "Noir",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Reanimate&format=image&version=normal"
  },
  {
    "name": "Thoughtseize",
    "tier": "A",
    "color": "Noir",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Thoughtseize&format=image&version=normal"
  },
  {
    "name": "Hymn to Tourach",
    "tier": "B",
    "color": "Noir",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Hymn%20to%20Tourach&format=image&version=normal"
  },
  {
    "name": "Ruinous Path",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Ruinous%20Path&format=image&version=normal"
  },
  {
    "name": "Consuming Vapors",
    "tier": "A",
    "color": "Noir",
    "cmc": 4,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Consuming%20Vapors&format=image&version=normal"
  },
  {
    "name": "Sever the Bloodline",
    "tier": "A",
    "color": "Noir",
    "cmc": 4,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Sever%20the%20Bloodline&format=image&version=normal"
  },
  {
    "name": "Crux of Fate",
    "tier": "A",
    "color": "Noir",
    "cmc": 5,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Crux%20of%20Fate&format=image&version=normal"
  },
  {
    "name": "Cover of Darkness",
    "tier": "A",
    "color": "Noir",
    "cmc": 2,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Cover%20of%20Darkness&format=image&version=normal"
  },
  {
    "name": "Phyrexian Arena",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Phyrexian%20Arena&format=image&version=normal"
  },
  {
    "name": "Dragonmaster Outcast",
    "tier": "S",
    "color": "Rouge",
    "cmc": 1,
    "type": "Creature - Human Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Dragonmaster%20Outcast&format=image&version=normal"
  },
  {
    "name": "Goblin Guide",
    "tier": "A",
    "color": "Rouge",
    "cmc": 1,
    "type": "Creature - Goblin Scout",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Scout).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Guide&format=image&version=normal"
  },
  {
    "name": "Goblin Lackey",
    "tier": "S",
    "color": "Rouge",
    "cmc": 1,
    "type": "Creature - Goblin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Lackey&format=image&version=normal"
  },
  {
    "name": "Grim Lavamancer",
    "tier": "A",
    "color": "Rouge",
    "cmc": 1,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Grim%20Lavamancer&format=image&version=normal"
  },
  {
    "name": "Spikeshot Elder",
    "tier": "A",
    "color": "Rouge",
    "cmc": 1,
    "type": "Creature - Goblin Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Spikeshot%20Elder&format=image&version=normal"
  },
  {
    "name": "Bloodmark Mentor",
    "tier": "B",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Bloodmark%20Mentor&format=image&version=normal"
  },
  {
    "name": "Dragonlord's Servant",
    "tier": "B",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature - Goblin Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Dragonlord%27s%20Servant&format=image&version=normal"
  },
  {
    "name": "Mogg War Marshal",
    "tier": "C",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Mogg%20War%20Marshal&format=image&version=normal"
  },
  {
    "name": "Goblin Chieftain",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Creature - Goblin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Chieftain&format=image&version=normal"
  },
  {
    "name": "Goblin Matron",
    "tier": "B",
    "color": "Rouge",
    "cmc": 3,
    "type": "Creature - Goblin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Matron&format=image&version=normal"
  },
  {
    "name": "Goblin Rabblemaster",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Rabblemaster&format=image&version=normal"
  },
  {
    "name": "Goblin Warchief",
    "tier": "B",
    "color": "Rouge",
    "cmc": 3,
    "type": "Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Warchief&format=image&version=normal"
  },
  {
    "name": "Guttersnipe",
    "tier": "B",
    "color": "Rouge",
    "cmc": 3,
    "type": "Creature - Goblin Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Guttersnipe&format=image&version=normal"
  },
  {
    "name": "Taurean Mauler",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Taurean%20Mauler&format=image&version=normal"
  },
  {
    "name": "Krenko, Mob Boss",
    "tier": "A",
    "color": "Rouge",
    "cmc": 4,
    "type": "Legendary Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Krenko%2C%20Mob%20Boss&format=image&version=normal"
  },
  {
    "name": "Goblin Dark-Dwellers",
    "tier": "A",
    "color": "Rouge",
    "cmc": 5,
    "type": "Creature - Goblin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Dark-Dwellers&format=image&version=normal"
  },
  {
    "name": "Thundermaw Hellkite",
    "tier": "S",
    "color": "Rouge",
    "cmc": 5,
    "type": "Creature - Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Thundermaw%20Hellkite&format=image&version=normal"
  },
  {
    "name": "Sarkhan, Fireblood",
    "tier": "S",
    "color": "Rouge",
    "cmc": 3,
    "type": "Legendary Planeswalker - Sarkhan",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Sarkhan).",
    "image": "https://api.scryfall.com/cards/named?exact=Sarkhan%2C%20Fireblood&format=image&version=normal"
  },
  {
    "name": "Lightning Bolt",
    "tier": "C",
    "color": "Rouge",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Lightning%20Bolt&format=image&version=normal"
  },
  {
    "name": "Draconic Roar",
    "tier": "B",
    "color": "Rouge",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Draconic%20Roar&format=image&version=normal"
  },
  {
    "name": "Brimstone Volley",
    "tier": "C",
    "color": "Rouge",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Brimstone%20Volley&format=image&version=normal"
  },
  {
    "name": "Staggershock",
    "tier": "C",
    "color": "Rouge",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Staggershock&format=image&version=normal"
  },
  {
    "name": "Goblin Grenade",
    "tier": "B",
    "color": "Rouge",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Grenade&format=image&version=normal"
  },
  {
    "name": "Arc Trail",
    "tier": "B",
    "color": "Rouge",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Arc%20Trail&format=image&version=normal"
  },
  {
    "name": "Flames of the Firebrand",
    "tier": "B",
    "color": "Rouge",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Flames%20of%20the%20Firebrand&format=image&version=normal"
  },
  {
    "name": "Descent of the Dragons",
    "tier": "S",
    "color": "Rouge",
    "cmc": 6,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Descent%20of%20the%20Dragons&format=image&version=normal"
  },
  {
    "name": "Devil's Play",
    "tier": "A",
    "color": "Rouge",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Devil%27s%20Play&format=image&version=normal"
  },
  {
    "name": "Bonfire of the Damned",
    "tier": "S",
    "color": "Rouge",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Bonfire%20of%20the%20Damned&format=image&version=normal"
  },
  {
    "name": "Dragon Tempest",
    "tier": "A",
    "color": "Rouge",
    "cmc": 2,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Dragon%20Tempest&format=image&version=normal"
  },
  {
    "name": "Goblin Bombardment",
    "tier": "B",
    "color": "Rouge",
    "cmc": 2,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Bombardment&format=image&version=normal"
  },
  {
    "name": "Elvish Mystic",
    "tier": "C",
    "color": "Vert",
    "cmc": 1,
    "type": "Creature - Elf Druid",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
    "image": "https://api.scryfall.com/cards/named?exact=Elvish%20Mystic&format=image&version=normal"
  },
  {
    "name": "Llanowar Elves",
    "tier": "C",
    "color": "Vert",
    "cmc": 1,
    "type": "Creature - Elf Druid",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
    "image": "https://api.scryfall.com/cards/named?exact=Llanowar%20Elves&format=image&version=normal"
  },
  {
    "name": "Mayor of Avabruck",
    "tier": "A",
    "color": "Vert",
    "cmc": 2,
    "type": "Creature - Human Advisor Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Advisor Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Mayor%20of%20Avabruck&format=image&version=normal"
  },
  {
    "name": "Sylvan Advocate",
    "tier": "A",
    "color": "Vert",
    "cmc": 2,
    "type": "Creature - Elf Druid Ally",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid Ally).",
    "image": "https://api.scryfall.com/cards/named?exact=Sylvan%20Advocate&format=image&version=normal"
  },
  {
    "name": "Wolf-Skull Shaman",
    "tier": "B",
    "color": "Vert",
    "cmc": 2,
    "type": "Creature - Elf Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Wolf-Skull%20Shaman&format=image&version=normal"
  },
  {
    "name": "Ezuri, Renegade Leader",
    "tier": "S",
    "color": "Vert",
    "cmc": 3,
    "type": "Legendary Creature - Elf Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Ezuri%2C%20Renegade%20Leader&format=image&version=normal"
  },
  {
    "name": "Imperious Perfect",
    "tier": "B",
    "color": "Vert",
    "cmc": 3,
    "type": "Creature - Elf Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Imperious%20Perfect&format=image&version=normal"
  },
  {
    "name": "Reclamation Sage",
    "tier": "B",
    "color": "Vert",
    "cmc": 3,
    "type": "Creature - Elf Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Reclamation%20Sage&format=image&version=normal"
  },
  {
    "name": "Witchstalker",
    "tier": "A",
    "color": "Vert",
    "cmc": 3,
    "type": "Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Witchstalker&format=image&version=normal"
  },
  {
    "name": "Briarpack Alpha",
    "tier": "B",
    "color": "Vert",
    "cmc": 4,
    "type": "Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Briarpack%20Alpha&format=image&version=normal"
  },
  {
    "name": "Chameleon Colossus",
    "tier": "A",
    "color": "Vert",
    "cmc": 4,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Chameleon%20Colossus&format=image&version=normal"
  },
  {
    "name": "Dwynen, Gilt-Leaf Daen",
    "tier": "A",
    "color": "Vert",
    "cmc": 4,
    "type": "Legendary Creature - Elf Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Dwynen%2C%20Gilt-Leaf%20Daen&format=image&version=normal"
  },
  {
    "name": "Master of the Wild Hunt",
    "tier": "S",
    "color": "Vert",
    "cmc": 4,
    "type": "Creature - Human Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Master%20of%20the%20Wild%20Hunt&format=image&version=normal"
  },
  {
    "name": "Nightpack Ambusher",
    "tier": "A",
    "color": "Vert",
    "cmc": 4,
    "type": "Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Nightpack%20Ambusher&format=image&version=normal"
  },
  {
    "name": "Wren's Run Packmaster",
    "tier": "A",
    "color": "Vert",
    "cmc": 4,
    "type": "Creature - Elf Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Wren%27s%20Run%20Packmaster&format=image&version=normal"
  },
  {
    "name": "Kessig Cagebreakers",
    "tier": "A",
    "color": "Vert",
    "cmc": 5,
    "type": "Creature - Human Rogue",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Rogue).",
    "image": "https://api.scryfall.com/cards/named?exact=Kessig%20Cagebreakers&format=image&version=normal"
  },
  {
    "name": "Wolfir Silverheart",
    "tier": "A",
    "color": "Vert",
    "cmc": 5,
    "type": "Creature - Wolf Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Wolfir%20Silverheart&format=image&version=normal"
  },
  {
    "name": "Garruk Relentless",
    "tier": "S",
    "color": "Vert",
    "cmc": 4,
    "type": "Legendary Planeswalker - Garruk",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Garruk).",
    "image": "https://api.scryfall.com/cards/named?exact=Garruk%20Relentless&format=image&version=normal"
  },
  {
    "name": "Vines of Vastwood",
    "tier": "C",
    "color": "Vert",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Vines%20of%20Vastwood&format=image&version=normal"
  },
  {
    "name": "Green Sun's Zenith",
    "tier": "A",
    "color": "Vert",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Green%20Sun%27s%20Zenith&format=image&version=normal"
  },
  {
    "name": "Rancor",
    "tier": "B",
    "color": "Vert",
    "cmc": 1,
    "type": "Enchantment - Aura",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Aura).",
    "image": "https://api.scryfall.com/cards/named?exact=Rancor&format=image&version=normal"
  },
  {
    "name": "Lifecrafter's Bestiary",
    "tier": "A",
    "color": "Vert",
    "cmc": 3,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Lifecrafter%27s%20Bestiary&format=image&version=normal"
  },
  {
    "name": "Glacial Fortress",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Glacial%20Fortress&format=image&version=normal"
  },
  {
    "name": "Render Silent",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Render%20Silent&format=image&version=normal"
  },
  {
    "name": "Detention Sphere",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Detention%20Sphere&format=image&version=normal"
  },
  {
    "name": "Dragonlord Ojutai",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Legendary Creature - Elder Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Dragonlord%20Ojutai&format=image&version=normal"
  },
  {
    "name": "Dismal Backwater",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Dismal%20Backwater&format=image&version=normal"
  },
  {
    "name": "Drowned Catacomb",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Drowned%20Catacomb&format=image&version=normal"
  },
  {
    "name": "Dimir Doppelganger",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Dimir%20Doppelganger&format=image&version=normal"
  },
  {
    "name": "Evil Twin",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Evil%20Twin&format=image&version=normal"
  },
  {
    "name": "Hostage Taker",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Creature - Human Pirate",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Pirate).",
    "image": "https://api.scryfall.com/cards/named?exact=Hostage%20Taker&format=image&version=normal"
  },
  {
    "name": "Dragonlord Silumgar",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 6,
    "type": "Legendary Creature - Elder Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Dragonlord%20Silumgar&format=image&version=normal"
  },
  {
    "name": "Dragonskull Summit",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Dragonskull%20Summit&format=image&version=normal"
  },
  {
    "name": "Rakdos Guildgate",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Gate",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Gate).",
    "image": "https://api.scryfall.com/cards/named?exact=Rakdos%20Guildgate&format=image&version=normal"
  },
  {
    "name": "Dreadbore",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Dreadbore&format=image&version=normal"
  },
  {
    "name": "Kolaghan's Command",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Kolaghan%27s%20Command&format=image&version=normal"
  },
  {
    "name": "Olivia Voldaren",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Creature - Vampire",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire).",
    "image": "https://api.scryfall.com/cards/named?exact=Olivia%20Voldaren&format=image&version=normal"
  },
  {
    "name": "Kolaghan, the Storm's Fury",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Legendary Creature - Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Kolaghan%2C%20the%20Storm%27s%20Fury&format=image&version=normal"
  },
  {
    "name": "Copperline Gorge",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Copperline%20Gorge&format=image&version=normal"
  },
  {
    "name": "Rootbound Crag",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Rootbound%20Crag&format=image&version=normal"
  },
  {
    "name": "Huntmaster of the Fells",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Creature - Human Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Huntmaster%20of%20the%20Fells&format=image&version=normal"
  },
  {
    "name": "Dragonlord Atarka",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 7,
    "type": "Legendary Creature - Elder Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Dragonlord%20Atarka&format=image&version=normal"
  },
  {
    "name": "Razorverge Thicket",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Razorverge%20Thicket&format=image&version=normal"
  },
  {
    "name": "Sunpetal Grove",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Sunpetal%20Grove&format=image&version=normal"
  },
  {
    "name": "Watchwolf",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Watchwolf&format=image&version=normal"
  },
  {
    "name": "Sigarda, Heron's Grace",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Legendary Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Sigarda%2C%20Heron%27s%20Grace&format=image&version=normal"
  },
  {
    "name": "Scoured Barrens",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Scoured%20Barrens&format=image&version=normal"
  },
  {
    "name": "Temple of Silence",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Temple%20of%20Silence&format=image&version=normal"
  },
  {
    "name": "Anguished Unmaking",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Anguished%20Unmaking&format=image&version=normal"
  },
  {
    "name": "Vindicate",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Vindicate&format=image&version=normal"
  },
  {
    "name": "Utter End",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Utter%20End&format=image&version=normal"
  },
  {
    "name": "Deathpact Angel",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 6,
    "type": "Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Deathpact%20Angel&format=image&version=normal"
  },
  {
    "name": "Jungle Hollow",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Jungle%20Hollow&format=image&version=normal"
  },
  {
    "name": "Deathrite Shaman",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 1,
    "type": "Creature - Elf Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Deathrite%20Shaman&format=image&version=normal"
  },
  {
    "name": "Maelstrom Pulse",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Maelstrom%20Pulse&format=image&version=normal"
  },
  {
    "name": "Hinterland Harbor",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Hinterland%20Harbor&format=image&version=normal"
  },
  {
    "name": "Thornwood Falls",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Thornwood%20Falls&format=image&version=normal"
  },
  {
    "name": "Simic Charm",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Simic%20Charm&format=image&version=normal"
  },
  {
    "name": "Edric, Spymaster of Trest",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Elf Rogue",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Rogue).",
    "image": "https://api.scryfall.com/cards/named?exact=Edric%2C%20Spymaster%20of%20Trest&format=image&version=normal"
  },
  {
    "name": "Progenitor Mimic",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 6,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Progenitor%20Mimic&format=image&version=normal"
  },
  {
    "name": "Swiftwater Cliffs",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Swiftwater%20Cliffs&format=image&version=normal"
  },
  {
    "name": "Goblin Electromancer",
    "tier": "C",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Creature - Goblin Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Electromancer&format=image&version=normal"
  },
  {
    "name": "Fire // Ice",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Fire%20//%20Ice&format=image&version=normal"
  },
  {
    "name": "Dack's Duplicate",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Dack%27s%20Duplicate&format=image&version=normal"
  },
  {
    "name": "Wind-Scarred Crag",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Wind-Scarred%20Crag&format=image&version=normal"
  },
  {
    "name": "Boros Charm",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Boros%20Charm&format=image&version=normal"
  },
  {
    "name": "Karrthus, Tyrant of Jund",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 7,
    "type": "Legendary Creature - Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Karrthus%2C%20Tyrant%20of%20Jund&format=image&version=normal"
  },
  {
    "name": "Kaalia of the Vast",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Creature - Human Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Kaalia%20of%20the%20Vast&format=image&version=normal"
  },
  {
    "name": "Vorosh, the Hunter",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 6,
    "type": "Legendary Creature - Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Vorosh%2C%20the%20Hunter&format=image&version=normal"
  },
  {
    "name": "Aether Spellbomb",
    "tier": "C",
    "color": "Bleu",
    "cmc": 1,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Aether%20Spellbomb&format=image&version=normal"
  },
  {
    "name": "Coldsteel Heart",
    "tier": "B",
    "color": "Incolore",
    "cmc": 2,
    "type": "Snow Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Snow Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Coldsteel%20Heart&format=image&version=normal"
  },
  {
    "name": "Lightning Greaves",
    "tier": "B",
    "color": "Incolore",
    "cmc": 2,
    "type": "Artifact - Equipment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
    "image": "https://api.scryfall.com/cards/named?exact=Lightning%20Greaves&format=image&version=normal"
  },
  {
    "name": "Mind Stone",
    "tier": "B",
    "color": "Incolore",
    "cmc": 2,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Mind%20Stone&format=image&version=normal"
  },
  {
    "name": "Chromatic Lantern",
    "tier": "A",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Chromatic%20Lantern&format=image&version=normal"
  },
  {
    "name": "Herald's Horn",
    "tier": "B",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Herald%27s%20Horn&format=image&version=normal"
  },
  {
    "name": "Coat of Arms",
    "tier": "A",
    "color": "Incolore",
    "cmc": 5,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Coat%20of%20Arms&format=image&version=normal"
  },
  {
    "name": "Metallic Mimic",
    "tier": "A",
    "color": "Incolore",
    "cmc": 2,
    "type": "Artifact Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Metallic%20Mimic&format=image&version=normal"
  },
  {
    "name": "Adaptive Automaton",
    "tier": "A",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact Creature - Construct",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Construct).",
    "image": "https://api.scryfall.com/cards/named?exact=Adaptive%20Automaton&format=image&version=normal"
  },
  {
    "name": "Duplicant",
    "tier": "A",
    "color": "Incolore",
    "cmc": 6,
    "type": "Artifact Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Duplicant&format=image&version=normal"
  },
  {
    "name": "Cavern of Souls",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Cavern%20of%20Souls&format=image&version=normal"
  },
  {
    "name": "City of Brass",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=City%20of%20Brass&format=image&version=normal"
  },
  {
    "name": "Evolving Wilds",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Evolving%20Wilds&format=image&version=normal"
  },
  {
    "name": "Haven of the Spirit Dragon",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Haven%20of%20the%20Spirit%20Dragon&format=image&version=normal"
  },
  {
    "name": "Mutavault",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Mutavault&format=image&version=normal"
  },
  {
    "name": "Reflecting Pool",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Reflecting%20Pool&format=image&version=normal"
  },
  {
    "name": "Terramorphic Expanse",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Terramorphic%20Expanse&format=image&version=normal"
  },
  {
    "name": "Vivid Crag",
    "tier": "B",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Crag&format=image&version=normal"
  },
  {
    "name": "Vivid Creek",
    "tier": "B",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Creek&format=image&version=normal"
  },
  {
    "name": "Vivid Grove",
    "tier": "B",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Grove&format=image&version=normal"
  },
  {
    "name": "Vivid Marsh",
    "tier": "B",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Marsh&format=image&version=normal"
  },
  {
    "name": "Vivid Meadow",
    "tier": "B",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Meadow&format=image&version=normal"
  },
  {
    "name": "Goblin Trashmaster",
    "tier": "A",
    "color": "Rouge",
    "cmc": 4,
    "type": "Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Trashmaster&format=image&version=normal"
  },
  {
    "name": "Krenko, Tin Street Kingpin",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Legendary Creature - Goblin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin).",
    "image": "https://api.scryfall.com/cards/named?exact=Krenko%2C%20Tin%20Street%20Kingpin&format=image&version=normal"
  },
  {
    "name": "Embercleave",
    "tier": "S",
    "color": "Rouge",
    "cmc": 6,
    "type": "Legendary Artifact - Equipment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Artifact - Equipment).",
    "image": "https://api.scryfall.com/cards/named?exact=Embercleave&format=image&version=normal"
  },
  {
    "name": "Glorybringer",
    "tier": "A",
    "color": "Rouge",
    "cmc": 5,
    "type": "Creature - Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Glorybringer&format=image&version=normal"
  },
  {
    "name": "Paradise Druid",
    "tier": "B",
    "color": "Vert",
    "cmc": 2,
    "type": "Creature - Elf Druid",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
    "image": "https://api.scryfall.com/cards/named?exact=Paradise%20Druid&format=image&version=normal"
  },
  {
    "name": "Barrin, Tolarian Archmage",
    "tier": "A",
    "color": "Bleu",
    "cmc": 3,
    "type": "Legendary Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Barrin%2C%20Tolarian%20Archmage&format=image&version=normal"
  },
  {
    "name": "Verdant Catacombs",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Verdant%20Catacombs&format=image&version=normal"
  },
  {
    "name": "Steam Vents",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Island Mountain",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Mountain).",
    "image": "https://api.scryfall.com/cards/named?exact=Steam%20Vents&format=image&version=normal"
  },
  {
    "name": "Arid Mesa",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Arid%20Mesa&format=image&version=normal"
  },
  {
    "name": "Breeding Pool",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Forest Island",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Island).",
    "image": "https://api.scryfall.com/cards/named?exact=Breeding%20Pool&format=image&version=normal"
  },
  {
    "name": "Skysovereign, Consul Flagship",
    "tier": "S",
    "color": "Incolore",
    "cmc": 5,
    "type": "Legendary Artifact - Vehicle",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Artifact - Vehicle).",
    "image": "https://api.scryfall.com/cards/named?exact=Skysovereign%2C%20Consul%20Flagship&format=image&version=normal"
  },
  {
    "name": "Fabled Passage",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Fabled%20Passage&format=image&version=normal"
  },
  {
    "name": "Maskwood Nexus",
    "tier": "A",
    "color": "Incolore",
    "cmc": 4,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Maskwood%20Nexus&format=image&version=normal"
  },
  {
    "name": "Mazemind Tome",
    "tier": "A",
    "color": "Incolore",
    "cmc": 2,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Mazemind%20Tome&format=image&version=normal"
  },
  {
    "name": "Ugin, the Ineffable",
    "tier": "A",
    "color": "Incolore",
    "cmc": 6,
    "type": "Legendary Planeswalker - Ugin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Ugin).",
    "image": "https://api.scryfall.com/cards/named?exact=Ugin%2C%20the%20Ineffable&format=image&version=normal"
  },
  {
    "name": "Giant Killer",
    "tier": "A",
    "color": "Blanc",
    "cmc": 1,
    "type": "Creature - Human Peasant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Peasant).",
    "image": "https://api.scryfall.com/cards/named?exact=Giant%20Killer&format=image&version=normal"
  },
  {
    "name": "Authority of the Consuls",
    "tier": "A",
    "color": "Blanc",
    "cmc": 1,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Authority%20of%20the%20Consuls&format=image&version=normal"
  },
  {
    "name": "Soul Warden",
    "tier": "B",
    "color": "Blanc",
    "cmc": 1,
    "type": "Creature - Human Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Soul%20Warden&format=image&version=normal"
  },
  {
    "name": "Charming Prince",
    "tier": "A",
    "color": "Blanc",
    "cmc": 2,
    "type": "Creature - Human Noble",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Noble).",
    "image": "https://api.scryfall.com/cards/named?exact=Charming%20Prince&format=image&version=normal"
  },
  {
    "name": "Luminarch Aspirant",
    "tier": "A",
    "color": "Blanc",
    "cmc": 2,
    "type": "Creature - Human Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Luminarch%20Aspirant&format=image&version=normal"
  },
  {
    "name": "Righteous Valkyrie",
    "tier": "A",
    "color": "Blanc",
    "cmc": 3,
    "type": "Creature - Angel Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Righteous%20Valkyrie&format=image&version=normal"
  },
  {
    "name": "Ajani, Strength of the Pride",
    "tier": "S",
    "color": "Blanc",
    "cmc": 4,
    "type": "Legendary Planeswalker - Ajani",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Ajani).",
    "image": "https://api.scryfall.com/cards/named?exact=Ajani%2C%20Strength%20of%20the%20Pride&format=image&version=normal"
  },
  {
    "name": "Inscription of Ruin",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Inscription%20of%20Ruin&format=image&version=normal"
  },
  {
    "name": "Bloodchief's Thirst",
    "tier": "B",
    "color": "Noir",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Bloodchief%27s%20Thirst&format=image&version=normal"
  },
  {
    "name": "Nighthawk Scavenger",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Creature - Vampire Rogue",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Rogue).",
    "image": "https://api.scryfall.com/cards/named?exact=Nighthawk%20Scavenger&format=image&version=normal"
  },
  {
    "name": "Vito, Thorn of the Dusk Rose",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Legendary Creature - Vampire Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Vito%2C%20Thorn%20of%20the%20Dusk%20Rose&format=image&version=normal"
  },
  {
    "name": "Heartless Act",
    "tier": "B",
    "color": "Noir",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Heartless%20Act&format=image&version=normal"
  },
  {
    "name": "Knight of the Ebon Legion",
    "tier": "A",
    "color": "Noir",
    "cmc": 1,
    "type": "Creature - Vampire Knight",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Knight).",
    "image": "https://api.scryfall.com/cards/named?exact=Knight%20of%20the%20Ebon%20Legion&format=image&version=normal"
  },
  {
    "name": "Elvish Archdruid",
    "tier": "A",
    "color": "Vert",
    "cmc": 3,
    "type": "Creature - Elf Druid",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
    "image": "https://api.scryfall.com/cards/named?exact=Elvish%20Archdruid&format=image&version=normal"
  },
  {
    "name": "Pelt Collector",
    "tier": "A",
    "color": "Vert",
    "cmc": 1,
    "type": "Creature - Elf Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Pelt%20Collector&format=image&version=normal"
  },
  {
    "name": "Collected Company",
    "tier": "A",
    "color": "Vert",
    "cmc": 4,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Collected%20Company&format=image&version=normal"
  },
  {
    "name": "Realmwalker",
    "tier": "A",
    "color": "Vert",
    "cmc": 3,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Realmwalker&format=image&version=normal"
  },
  {
    "name": "Primal Might",
    "tier": "A",
    "color": "Vert",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Primal%20Might&format=image&version=normal"
  },
  {
    "name": "Cultivate",
    "tier": "C",
    "color": "Vert",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Cultivate&format=image&version=normal"
  },
  {
    "name": "Elvish Warmaster",
    "tier": "A",
    "color": "Vert",
    "cmc": 2,
    "type": "Creature - Elf Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Elvish%20Warmaster&format=image&version=normal"
  },
  {
    "name": "Craterhoof Behemoth",
    "tier": "S",
    "color": "Vert",
    "cmc": 8,
    "type": "Creature - Beast",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Beast).",
    "image": "https://api.scryfall.com/cards/named?exact=Craterhoof%20Behemoth&format=image&version=normal"
  },
  {
    "name": "Masked Vandal",
    "tier": "C",
    "color": "Vert",
    "cmc": 2,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Masked%20Vandal&format=image&version=normal"
  },
  {
    "name": "Jaspera Sentinel",
    "tier": "C",
    "color": "Vert",
    "cmc": 1,
    "type": "Creature - Elf Rogue",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Rogue).",
    "image": "https://api.scryfall.com/cards/named?exact=Jaspera%20Sentinel&format=image&version=normal"
  },
  {
    "name": "Finale of Devastation",
    "tier": "S",
    "color": "Vert",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Finale%20of%20Devastation&format=image&version=normal"
  },
  {
    "name": "Ram Through",
    "tier": "C",
    "color": "Vert",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Ram%20Through&format=image&version=normal"
  },
  {
    "name": "Curious Obsession",
    "tier": "B",
    "color": "Bleu",
    "cmc": 1,
    "type": "Enchantment - Aura",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Aura).",
    "image": "https://api.scryfall.com/cards/named?exact=Curious%20Obsession&format=image&version=normal"
  },
  {
    "name": "Disdainful Stroke",
    "tier": "C",
    "color": "Bleu",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Disdainful%20Stroke&format=image&version=normal"
  },
  {
    "name": "Legion Loyalist",
    "tier": "A",
    "color": "Rouge",
    "cmc": 1,
    "type": "Creature - Goblin Soldier",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Soldier).",
    "image": "https://api.scryfall.com/cards/named?exact=Legion%20Loyalist&format=image&version=normal"
  },
  {
    "name": "Overgrown Tomb",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Swamp Forest",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Forest).",
    "image": "https://api.scryfall.com/cards/named?exact=Overgrown%20Tomb&format=image&version=normal"
  },
  {
    "name": "Chevill, Bane of Monsters",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Legendary Creature - Human Rogue",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Rogue).",
    "image": "https://api.scryfall.com/cards/named?exact=Chevill%2C%20Bane%20of%20Monsters&format=image&version=normal"
  },
  {
    "name": "Assassin's Trophy",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Assassin%27s%20Trophy&format=image&version=normal"
  },
  {
    "name": "Sarulf, Realm Eater",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Sarulf%2C%20Realm%20Eater&format=image&version=normal"
  },
  {
    "name": "Binding the Old Gods",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Enchantment - Saga",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
    "image": "https://api.scryfall.com/cards/named?exact=Binding%20the%20Old%20Gods&format=image&version=normal"
  },
  {
    "name": "Watery Grave",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Island Swamp",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Swamp).",
    "image": "https://api.scryfall.com/cards/named?exact=Watery%20Grave&format=image&version=normal"
  },
  {
    "name": "Eladamri's Call",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Eladamri%27s%20Call&format=image&version=normal"
  },
  {
    "name": "Blood Crypt",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Swamp Mountain",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Mountain).",
    "image": "https://api.scryfall.com/cards/named?exact=Blood%20Crypt&format=image&version=normal"
  },
  {
    "name": "Godless Shrine",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Plains Swamp",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Swamp).",
    "image": "https://api.scryfall.com/cards/named?exact=Godless%20Shrine&format=image&version=normal"
  },
  {
    "name": "Radha, Heart of Keld",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Elf Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Radha%2C%20Heart%20of%20Keld&format=image&version=normal"
  },
  {
    "name": "Domri's Ambush",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Domri%27s%20Ambush&format=image&version=normal"
  },
  {
    "name": "Sacred Foundry",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Mountain Plains",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Plains).",
    "image": "https://api.scryfall.com/cards/named?exact=Sacred%20Foundry&format=image&version=normal"
  },
  {
    "name": "Spirebluff Canal",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Spirebluff%20Canal&format=image&version=normal"
  },
  {
    "name": "The Bears of Littjara",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Enchantment - Saga",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
    "image": "https://api.scryfall.com/cards/named?exact=The%20Bears%20of%20Littjara&format=image&version=normal"
  },
  {
    "name": "Frilled Mystic",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Creature - Elf Lizard Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Lizard Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Frilled%20Mystic&format=image&version=normal"
  },
  {
    "name": "Tundra",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Plains Island",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Island).",
    "image": "https://api.scryfall.com/cards/named?exact=Tundra&format=image&version=normal"
  },
  {
    "name": "Underground Sea",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Island Swamp",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Swamp).",
    "image": "https://api.scryfall.com/cards/named?exact=Underground%20Sea&format=image&version=normal"
  },
  {
    "name": "Badlands",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Swamp Mountain",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Mountain).",
    "image": "https://api.scryfall.com/cards/named?exact=Badlands&format=image&version=normal"
  },
  {
    "name": "Taiga",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Mountain Forest",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Forest).",
    "image": "https://api.scryfall.com/cards/named?exact=Taiga&format=image&version=normal"
  },
  {
    "name": "Savannah",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Forest Plains",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Plains).",
    "image": "https://api.scryfall.com/cards/named?exact=Savannah&format=image&version=normal"
  },
  {
    "name": "Scrubland",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Plains Swamp",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Swamp).",
    "image": "https://api.scryfall.com/cards/named?exact=Scrubland&format=image&version=normal"
  },
  {
    "name": "Volcanic Island",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Island Mountain",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Mountain).",
    "image": "https://api.scryfall.com/cards/named?exact=Volcanic%20Island&format=image&version=normal"
  },
  {
    "name": "Bayou",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Swamp Forest",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Forest).",
    "image": "https://api.scryfall.com/cards/named?exact=Bayou&format=image&version=normal"
  },
  {
    "name": "Plateau",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Mountain Plains",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Plains).",
    "image": "https://api.scryfall.com/cards/named?exact=Plateau&format=image&version=normal"
  },
  {
    "name": "Tropical Island",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Forest Island",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Island).",
    "image": "https://api.scryfall.com/cards/named?exact=Tropical%20Island&format=image&version=normal"
  },
  {
    "name": "Terror of the Peaks",
    "tier": "S",
    "color": "Rouge",
    "cmc": 5,
    "type": "Creature - Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Terror%20of%20the%20Peaks&format=image&version=normal"
  },
  {
    "name": "Goblin Cratermaker",
    "tier": "B",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Cratermaker&format=image&version=normal"
  },
  {
    "name": "Archangel Avacyn",
    "tier": "S",
    "color": "Blanc",
    "cmc": 5,
    "type": "Legendary Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Archangel%20Avacyn&format=image&version=normal"
  },
  {
    "name": "Vampire of the Dire Moon",
    "tier": "B",
    "color": "Noir",
    "cmc": 1,
    "type": "Creature - Vampire",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire).",
    "image": "https://api.scryfall.com/cards/named?exact=Vampire%20of%20the%20Dire%20Moon&format=image&version=normal"
  },
  {
    "name": "Saw It Coming",
    "tier": "B",
    "color": "Bleu",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Saw%20It%20Coming&format=image&version=normal"
  },
  {
    "name": "Llanowar Visionary",
    "tier": "C",
    "color": "Vert",
    "cmc": 3,
    "type": "Creature - Elf Druid",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
    "image": "https://api.scryfall.com/cards/named?exact=Llanowar%20Visionary&format=image&version=normal"
  },
  {
    "name": "Hallowed Fountain",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Plains Island",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Island).",
    "image": "https://api.scryfall.com/cards/named?exact=Hallowed%20Fountain&format=image&version=normal"
  },
  {
    "name": "Sulfuric Vortex",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Sulfuric%20Vortex&format=image&version=normal"
  },
  {
    "name": "Once Upon a Time",
    "tier": "A",
    "color": "Vert",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Once%20Upon%20a%20Time&format=image&version=normal"
  },
  {
    "name": "Solve the Equation",
    "tier": "B",
    "color": "Bleu",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Solve%20the%20Equation&format=image&version=normal"
  },
  {
    "name": "Expressive Iteration",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Expressive%20Iteration&format=image&version=normal"
  },
  {
    "name": "Rip Apart",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Rip%20Apart&format=image&version=normal"
  },
  {
    "name": "Archmage Emeritus",
    "tier": "A",
    "color": "Bleu",
    "cmc": 4,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Archmage%20Emeritus&format=image&version=normal"
  },
  {
    "name": "Vanishing Verse",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Vanishing%20Verse&format=image&version=normal"
  },
  {
    "name": "Galazeth Prismari",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Creature - Elder Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Galazeth%20Prismari&format=image&version=normal"
  },
  {
    "name": "Baleful Mastery",
    "tier": "A",
    "color": "Noir",
    "cmc": 4,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Baleful%20Mastery&format=image&version=normal"
  },
  {
    "name": "Ranger Class",
    "tier": "A",
    "color": "Vert",
    "cmc": 2,
    "type": "Enchantment - Class",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Class).",
    "image": "https://api.scryfall.com/cards/named?exact=Ranger%20Class&format=image&version=normal"
  },
  {
    "name": "Glasspool Mimic",
    "tier": "A",
    "color": "Bleu",
    "cmc": 3,
    "type": "Creature - Shapeshifter Rogue",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter Rogue).",
    "image": "https://api.scryfall.com/cards/named?exact=Glasspool%20Mimic&format=image&version=normal"
  },
  {
    "name": "Turntimber Symbiosis",
    "tier": "S",
    "color": "Vert",
    "cmc": 7,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Turntimber%20Symbiosis&format=image&version=normal"
  },
  {
    "name": "Emeria's Call",
    "tier": "S",
    "color": "Blanc",
    "cmc": 7,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Emeria%27s%20Call&format=image&version=normal"
  },
  {
    "name": "Battle Cry Goblin",
    "tier": "B",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature - Goblin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
    "image": "https://api.scryfall.com/cards/named?exact=Battle%20Cry%20Goblin&format=image&version=normal"
  },
  {
    "name": "Blade Historian",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Creature - Human Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Blade%20Historian&format=image&version=normal"
  },
  {
    "name": "Shatterskull Smashing",
    "tier": "S",
    "color": "Rouge",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Shatterskull%20Smashing&format=image&version=normal"
  },
  {
    "name": "Orvar, the All-Form",
    "tier": "S",
    "color": "Bleu",
    "cmc": 4,
    "type": "Legendary Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Orvar%2C%20the%20All-Form&format=image&version=normal"
  },
  {
    "name": "Tireless Provisioner",
    "tier": "B",
    "color": "Vert",
    "cmc": 3,
    "type": "Creature - Elf Scout",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Scout).",
    "image": "https://api.scryfall.com/cards/named?exact=Tireless%20Provisioner&format=image&version=normal"
  },
  {
    "name": "Werewolf Pack Leader",
    "tier": "A",
    "color": "Vert",
    "cmc": 2,
    "type": "Creature - Human Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Werewolf%20Pack%20Leader&format=image&version=normal"
  },
  {
    "name": "Consider",
    "tier": "C",
    "color": "Bleu",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Consider&format=image&version=normal"
  },
  {
    "name": "Tovolar's Huntmaster",
    "tier": "A",
    "color": "Vert",
    "cmc": 6,
    "type": "Creature - Human Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Tovolar%27s%20Huntmaster&format=image&version=normal"
  },
  {
    "name": "Duskwatch Recruiter",
    "tier": "B",
    "color": "Vert",
    "cmc": 2,
    "type": "Creature - Human Warrior Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Warrior Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Duskwatch%20Recruiter&format=image&version=normal"
  },
  {
    "name": "Burn Down the House",
    "tier": "A",
    "color": "Rouge",
    "cmc": 5,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Burn%20Down%20the%20House&format=image&version=normal"
  },
  {
    "name": "Tovolar, Dire Overlord",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Human Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Tovolar%2C%20Dire%20Overlord&format=image&version=normal"
  },
  {
    "name": "Immersturm Predator",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Creature - Vampire Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Immersturm%20Predator&format=image&version=normal"
  },
  {
    "name": "Reckless Stormseeker",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Creature - Human Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Reckless%20Stormseeker&format=image&version=normal"
  },
  {
    "name": "Fading Hope",
    "tier": "B",
    "color": "Bleu",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Fading%20Hope&format=image&version=normal"
  },
  {
    "name": "Voldaren Bloodcaster",
    "tier": "A",
    "color": "Noir",
    "cmc": 2,
    "type": "Creature - Vampire Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Voldaren%20Bloodcaster&format=image&version=normal"
  },
  {
    "name": "Hive of the Eye Tyrant",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Hive%20of%20the%20Eye%20Tyrant&format=image&version=normal"
  },
  {
    "name": "Go Blank",
    "tier": "B",
    "color": "Noir",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Go%20Blank&format=image&version=normal"
  },
  {
    "name": "Hagra Mauling",
    "tier": "A",
    "color": "Noir",
    "cmc": 4,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Hagra%20Mauling&format=image&version=normal"
  },
  {
    "name": "Sorin the Mirthless",
    "tier": "S",
    "color": "Noir",
    "cmc": 4,
    "type": "Legendary Planeswalker - Sorin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Sorin).",
    "image": "https://api.scryfall.com/cards/named?exact=Sorin%20the%20Mirthless&format=image&version=normal"
  },
  {
    "name": "Showdown of the Skalds",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Enchantment - Saga",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
    "image": "https://api.scryfall.com/cards/named?exact=Showdown%20of%20the%20Skalds&format=image&version=normal"
  },
  {
    "name": "Thraben Inspector",
    "tier": "C",
    "color": "Blanc",
    "cmc": 1,
    "type": "Creature - Human Soldier",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
    "image": "https://api.scryfall.com/cards/named?exact=Thraben%20Inspector&format=image&version=normal"
  },
  {
    "name": "Dauntless Bodyguard",
    "tier": "B",
    "color": "Blanc",
    "cmc": 1,
    "type": "Creature - Human Knight",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Knight).",
    "image": "https://api.scryfall.com/cards/named?exact=Dauntless%20Bodyguard&format=image&version=normal"
  },
  {
    "name": "Conclave Tribunal",
    "tier": "B",
    "color": "Blanc",
    "cmc": 4,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Conclave%20Tribunal&format=image&version=normal"
  },
  {
    "name": "Basri Ket",
    "tier": "S",
    "color": "Blanc",
    "cmc": 3,
    "type": "Legendary Planeswalker - Basri",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Basri).",
    "image": "https://api.scryfall.com/cards/named?exact=Basri%20Ket&format=image&version=normal"
  },
  {
    "name": "Valorous Stance",
    "tier": "B",
    "color": "Blanc",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Valorous%20Stance&format=image&version=normal"
  },
  {
    "name": "Cast Out",
    "tier": "B",
    "color": "Blanc",
    "cmc": 4,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Cast%20Out&format=image&version=normal"
  },
  {
    "name": "Maul of the Skyclaves",
    "tier": "A",
    "color": "Blanc",
    "cmc": 3,
    "type": "Artifact - Equipment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
    "image": "https://api.scryfall.com/cards/named?exact=Maul%20of%20the%20Skyclaves&format=image&version=normal"
  },
  {
    "name": "Vivien, Champion of the Wilds",
    "tier": "A",
    "color": "Vert",
    "cmc": 3,
    "type": "Legendary Planeswalker - Vivien",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Vivien).",
    "image": "https://api.scryfall.com/cards/named?exact=Vivien%2C%20Champion%20of%20the%20Wilds&format=image&version=normal"
  },
  {
    "name": "Light Up the Stage",
    "tier": "B",
    "color": "Rouge",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Light%20Up%20the%20Stage&format=image&version=normal"
  },
  {
    "name": "Roil Eruption",
    "tier": "C",
    "color": "Rouge",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Roil%20Eruption&format=image&version=normal"
  },
  {
    "name": "Chandra, Acolyte of Flame",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Legendary Planeswalker - Chandra",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Chandra).",
    "image": "https://api.scryfall.com/cards/named?exact=Chandra%2C%20Acolyte%20of%20Flame&format=image&version=normal"
  },
  {
    "name": "Lier, Disciple of the Drowned",
    "tier": "S",
    "color": "Bleu",
    "cmc": 5,
    "type": "Legendary Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Lier%2C%20Disciple%20of%20the%20Drowned&format=image&version=normal"
  },
  {
    "name": "Memory Deluge",
    "tier": "A",
    "color": "Bleu",
    "cmc": 4,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Memory%20Deluge&format=image&version=normal"
  },
  {
    "name": "Sublime Epiphany",
    "tier": "A",
    "color": "Bleu",
    "cmc": 6,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Sublime%20Epiphany&format=image&version=normal"
  },
  {
    "name": "Narset, Parter of Veils",
    "tier": "B",
    "color": "Bleu",
    "cmc": 3,
    "type": "Legendary Planeswalker - Narset",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Narset).",
    "image": "https://api.scryfall.com/cards/named?exact=Narset%2C%20Parter%20of%20Veils&format=image&version=normal"
  },
  {
    "name": "Spell Pierce",
    "tier": "C",
    "color": "Bleu",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Spell%20Pierce&format=image&version=normal"
  },
  {
    "name": "Jwari Disruption",
    "tier": "B",
    "color": "Bleu",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Jwari%20Disruption&format=image&version=normal"
  },
  {
    "name": "Bloodline Pretender",
    "tier": "B",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Bloodline%20Pretender&format=image&version=normal"
  },
  {
    "name": "Spikefield Hazard",
    "tier": "B",
    "color": "Rouge",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Spikefield%20Hazard&format=image&version=normal"
  },
  {
    "name": "Graveshifter",
    "tier": "B",
    "color": "Noir",
    "cmc": 4,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Graveshifter&format=image&version=normal"
  },
  {
    "name": "Nullpriest of Oblivion",
    "tier": "A",
    "color": "Noir",
    "cmc": 2,
    "type": "Creature - Vampire Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Nullpriest%20of%20Oblivion&format=image&version=normal"
  },
  {
    "name": "Impostor of the Sixth Pride",
    "tier": "C",
    "color": "Blanc",
    "cmc": 2,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Impostor%20of%20the%20Sixth%20Pride&format=image&version=normal"
  },
  {
    "name": "Ephemerate",
    "tier": "C",
    "color": "Blanc",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Ephemerate&format=image&version=normal"
  },
  {
    "name": "Kabira Takedown",
    "tier": "B",
    "color": "Blanc",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Kabira%20Takedown&format=image&version=normal"
  },
  {
    "name": "Cemetery Prowler",
    "tier": "S",
    "color": "Vert",
    "cmc": 3,
    "type": "Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Cemetery%20Prowler&format=image&version=normal"
  },
  {
    "name": "Brutal Cathar",
    "tier": "A",
    "color": "Blanc",
    "cmc": 3,
    "type": "Creature - Human Soldier Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Brutal%20Cathar&format=image&version=normal"
  },
  {
    "name": "Fable of the Mirror-Breaker",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Enchantment - Saga",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
    "image": "https://api.scryfall.com/cards/named?exact=Fable%20of%20the%20Mirror-Breaker&format=image&version=normal"
  },
  {
    "name": "Deadly Dispute",
    "tier": "C",
    "color": "Noir",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Deadly%20Dispute&format=image&version=normal"
  },
  {
    "name": "Goro-Goro, Disciple of Ryusei",
    "tier": "A",
    "color": "Rouge",
    "cmc": 2,
    "type": "Legendary Creature - Goblin Samurai",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Samurai).",
    "image": "https://api.scryfall.com/cards/named?exact=Goro-Goro%2C%20Disciple%20of%20Ryusei&format=image&version=normal"
  },
  {
    "name": "Twinshot Sniper",
    "tier": "B",
    "color": "Rouge",
    "cmc": 4,
    "type": "Artifact Creature - Goblin Archer",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Goblin Archer).",
    "image": "https://api.scryfall.com/cards/named?exact=Twinshot%20Sniper&format=image&version=normal"
  },
  {
    "name": "Reckoner Bankbuster",
    "tier": "A",
    "color": "Incolore",
    "cmc": 2,
    "type": "Artifact - Vehicle",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Vehicle).",
    "image": "https://api.scryfall.com/cards/named?exact=Reckoner%20Bankbuster&format=image&version=normal"
  },
  {
    "name": "Miirym, Sentinel Wyrm",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 6,
    "type": "Legendary Creature - Dragon Spirit",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon Spirit).",
    "image": "https://api.scryfall.com/cards/named?exact=Miirym%2C%20Sentinel%20Wyrm&format=image&version=normal"
  },
  {
    "name": "Unburial Rites",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Unburial%20Rites&format=image&version=normal"
  },
  {
    "name": "Multiple Choice",
    "tier": "A",
    "color": "Bleu",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Multiple%20Choice&format=image&version=normal"
  },
  {
    "name": "Callous Bloodmage",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Creature - Vampire Warlock",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Warlock).",
    "image": "https://api.scryfall.com/cards/named?exact=Callous%20Bloodmage&format=image&version=normal"
  },
  {
    "name": "Adeline, Resplendent Cathar",
    "tier": "A",
    "color": "Blanc",
    "cmc": 3,
    "type": "Legendary Creature - Human Knight",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Knight).",
    "image": "https://api.scryfall.com/cards/named?exact=Adeline%2C%20Resplendent%20Cathar&format=image&version=normal"
  },
  {
    "name": "Tolsimir, Friend to Wolves",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Legendary Creature - Elf Scout",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Scout).",
    "image": "https://api.scryfall.com/cards/named?exact=Tolsimir%2C%20Friend%20to%20Wolves&format=image&version=normal"
  },
  {
    "name": "Sling-Gang Lieutenant",
    "tier": "B",
    "color": "Noir",
    "cmc": 4,
    "type": "Creature - Goblin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
    "image": "https://api.scryfall.com/cards/named?exact=Sling-Gang%20Lieutenant&format=image&version=normal"
  },
  {
    "name": "Changeling Outcast",
    "tier": "C",
    "color": "Noir",
    "cmc": 1,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Changeling%20Outcast&format=image&version=normal"
  },
  {
    "name": "Intrepid Adversary",
    "tier": "S",
    "color": "Blanc",
    "cmc": 2,
    "type": "Creature - Human Scout",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Scout).",
    "image": "https://api.scryfall.com/cards/named?exact=Intrepid%20Adversary&format=image&version=normal"
  },
  {
    "name": "Sword Coast Serpent",
    "tier": "C",
    "color": "Bleu",
    "cmc": 7,
    "type": "Creature - Serpent Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Serpent Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Sword%20Coast%20Serpent&format=image&version=normal"
  },
  {
    "name": "Malevolent Hermit",
    "tier": "A",
    "color": "Bleu",
    "cmc": 2,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Malevolent%20Hermit&format=image&version=normal"
  },
  {
    "name": "Aether Channeler",
    "tier": "A",
    "color": "Bleu",
    "cmc": 3,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Aether%20Channeler&format=image&version=normal"
  },
  {
    "name": "Steel Seraph",
    "tier": "A",
    "color": "Blanc",
    "cmc": 6,
    "type": "Artifact Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Steel%20Seraph&format=image&version=normal"
  },
  {
    "name": "Loran of the Third Path",
    "tier": "A",
    "color": "Blanc",
    "cmc": 3,
    "type": "Legendary Creature - Human Artificer",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Artificer).",
    "image": "https://api.scryfall.com/cards/named?exact=Loran%20of%20the%20Third%20Path&format=image&version=normal"
  },
  {
    "name": "Unsettled Mariner",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Unsettled%20Mariner&format=image&version=normal"
  },
  {
    "name": "Linvala, Shield of Sea Gate",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Angel Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Linvala%2C%20Shield%20of%20Sea%20Gate&format=image&version=normal"
  },
  {
    "name": "Ertai Resurrected",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Creature - Phyrexian Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Phyrexian Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Ertai%20Resurrected&format=image&version=normal"
  },
  {
    "name": "Phyrexian Dragon Engine",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Artifact Creature - Phyrexian Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Phyrexian Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Phyrexian%20Dragon%20Engine&format=image&version=normal"
  },
  {
    "name": "Manaform Hellkite",
    "tier": "S",
    "color": "Rouge",
    "cmc": 4,
    "type": "Creature - Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Manaform%20Hellkite&format=image&version=normal"
  },
  {
    "name": "The Elder Dragon War",
    "tier": "A",
    "color": "Rouge",
    "cmc": 4,
    "type": "Enchantment - Saga",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
    "image": "https://api.scryfall.com/cards/named?exact=The%20Elder%20Dragon%20War&format=image&version=normal"
  },
  {
    "name": "Lair of the Hydra",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Lair%20of%20the%20Hydra&format=image&version=normal"
  },
  {
    "name": "Cave of the Frost Dragon",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Cave%20of%20the%20Frost%20Dragon&format=image&version=normal"
  },
  {
    "name": "Den of the Bugbear",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Den%20of%20the%20Bugbear&format=image&version=normal"
  },
  {
    "name": "Hall of Storm Giants",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Hall%20of%20Storm%20Giants&format=image&version=normal"
  },
  {
    "name": "Far // Away",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Far%20//%20Away&format=image&version=normal"
  },
  {
    "name": "Watcher for Tomorrow",
    "tier": "B",
    "color": "Bleu",
    "cmc": 2,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Watcher%20for%20Tomorrow&format=image&version=normal"
  },
  {
    "name": "Bloodtithe Harvester",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Creature - Vampire",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire).",
    "image": "https://api.scryfall.com/cards/named?exact=Bloodtithe%20Harvester&format=image&version=normal"
  },
  {
    "name": "Dismiss",
    "tier": "B",
    "color": "Bleu",
    "cmc": 4,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Dismiss&format=image&version=normal"
  },
  {
    "name": "Gix's Command",
    "tier": "A",
    "color": "Noir",
    "cmc": 5,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Gix%27s%20Command&format=image&version=normal"
  },
  {
    "name": "Sprite Dragon",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Creature - Faerie Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Faerie Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Sprite%20Dragon&format=image&version=normal"
  },
  {
    "name": "Velomachus Lorehold",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 7,
    "type": "Legendary Creature - Elder Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Velomachus%20Lorehold&format=image&version=normal"
  },
  {
    "name": "Glissa Sunslayer",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Phyrexian Zombie Elf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Phyrexian Zombie Elf).",
    "image": "https://api.scryfall.com/cards/named?exact=Glissa%20Sunslayer&format=image&version=normal"
  },
  {
    "name": "Vraan, Executioner Thane",
    "tier": "A",
    "color": "Noir",
    "cmc": 2,
    "type": "Legendary Creature - Phyrexian Vampire",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Phyrexian Vampire).",
    "image": "https://api.scryfall.com/cards/named?exact=Vraan%2C%20Executioner%20Thane&format=image&version=normal"
  },
  {
    "name": "Jadar, Ghoulcaller of Nephalia",
    "tier": "A",
    "color": "Noir",
    "cmc": 2,
    "type": "Legendary Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Jadar%2C%20Ghoulcaller%20of%20Nephalia&format=image&version=normal"
  },
  {
    "name": "Lazav, the Multifarious",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Legendary Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Lazav%2C%20the%20Multifarious&format=image&version=normal"
  },
  {
    "name": "Goro-Goro and Satoru",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Goblin Human",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Human).",
    "image": "https://api.scryfall.com/cards/named?exact=Goro-Goro%20and%20Satoru&format=image&version=normal"
  },
  {
    "name": "Kethis, the Hidden Hand",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Elf Advisor",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Advisor).",
    "image": "https://api.scryfall.com/cards/named?exact=Kethis%2C%20the%20Hidden%20Hand&format=image&version=normal"
  },
  {
    "name": "Arwen, Mortal Queen",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Elf Noble",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Noble).",
    "image": "https://api.scryfall.com/cards/named?exact=Arwen%2C%20Mortal%20Queen&format=image&version=normal"
  },
  {
    "name": "Sigarda, Font of Blessings",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Sigarda%2C%20Font%20of%20Blessings&format=image&version=normal"
  },
  {
    "name": "Play with Fire",
    "tier": "B",
    "color": "Rouge",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Play%20with%20Fire&format=image&version=normal"
  },
  {
    "name": "Dragon's Hoard",
    "tier": "A",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Dragon%27s%20Hoard&format=image&version=normal"
  },
  {
    "name": "Zurgo and Ojutai",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Legendary Creature - Orc Dragon",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Orc Dragon).",
    "image": "https://api.scryfall.com/cards/named?exact=Zurgo%20and%20Ojutai&format=image&version=normal"
  },
  {
    "name": "Skirk Prospector",
    "tier": "C",
    "color": "Rouge",
    "cmc": 1,
    "type": "Creature - Goblin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
    "image": "https://api.scryfall.com/cards/named?exact=Skirk%20Prospector&format=image&version=normal"
  },
  {
    "name": "Pashalik Mons",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Legendary Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Pashalik%20Mons&format=image&version=normal"
  },
  {
    "name": "Muxus, Goblin Grandee",
    "tier": "A",
    "color": "Rouge",
    "cmc": 6,
    "type": "Legendary Creature - Goblin Noble",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Noble).",
    "image": "https://api.scryfall.com/cards/named?exact=Muxus%2C%20Goblin%20Grandee&format=image&version=normal"
  },
  {
    "name": "Kumano Faces Kakkazan",
    "tier": "B",
    "color": "Rouge",
    "cmc": 1,
    "type": "Enchantment - Saga",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
    "image": "https://api.scryfall.com/cards/named?exact=Kumano%20Faces%20Kakkazan&format=image&version=normal"
  },
  {
    "name": "Act of Treason",
    "tier": "B",
    "color": "Rouge",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Act%20of%20Treason&format=image&version=normal"
  },
  {
    "name": "Abrade",
    "tier": "B",
    "color": "Rouge",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Abrade&format=image&version=normal"
  },
  {
    "name": "Ascendant Packleader",
    "tier": "A",
    "color": "Vert",
    "cmc": 1,
    "type": "Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Ascendant%20Packleader&format=image&version=normal"
  },
  {
    "name": "Primal Adversary",
    "tier": "S",
    "color": "Vert",
    "cmc": 3,
    "type": "Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Primal%20Adversary&format=image&version=normal"
  },
  {
    "name": "Avabruck Caretaker",
    "tier": "S",
    "color": "Vert",
    "cmc": 6,
    "type": "Creature - Human Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Avabruck%20Caretaker&format=image&version=normal"
  },
  {
    "name": "Harmonize",
    "tier": "B",
    "color": "Vert",
    "cmc": 4,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Harmonize&format=image&version=normal"
  },
  {
    "name": "Beast Within",
    "tier": "B",
    "color": "Vert",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Beast%20Within&format=image&version=normal"
  },
  {
    "name": "Tenacious Underdog",
    "tier": "A",
    "color": "Noir",
    "cmc": 2,
    "type": "Creature - Human Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Tenacious%20Underdog&format=image&version=normal"
  },
  {
    "name": "Dismember",
    "tier": "B",
    "color": "Noir",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Dismember&format=image&version=normal"
  },
  {
    "name": "Cultivator's Caravan",
    "tier": "A",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact - Vehicle",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Vehicle).",
    "image": "https://api.scryfall.com/cards/named?exact=Cultivator%27s%20Caravan&format=image&version=normal"
  },
  {
    "name": "Wedding Invitation",
    "tier": "C",
    "color": "Incolore",
    "cmc": 2,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Wedding%20Invitation&format=image&version=normal"
  },
  {
    "name": "Sanctuary Warden",
    "tier": "S",
    "color": "Blanc",
    "cmc": 6,
    "type": "Creature - Angel Soldier",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel Soldier).",
    "image": "https://api.scryfall.com/cards/named?exact=Sanctuary%20Warden&format=image&version=normal"
  },
  {
    "name": "Inspiring Overseer",
    "tier": "C",
    "color": "Blanc",
    "cmc": 3,
    "type": "Creature - Angel Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Inspiring%20Overseer&format=image&version=normal"
  },
  {
    "name": "Suspicious Stowaway",
    "tier": "A",
    "color": "Bleu",
    "cmc": 2,
    "type": "Creature - Human Rogue Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Rogue Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Suspicious%20Stowaway&format=image&version=normal"
  },
  {
    "name": "Bloodvial Purveyor",
    "tier": "A",
    "color": "Noir",
    "cmc": 4,
    "type": "Creature - Vampire",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire).",
    "image": "https://api.scryfall.com/cards/named?exact=Bloodvial%20Purveyor&format=image&version=normal"
  },
  {
    "name": "Indatha Triome",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Plains Swamp Forest",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Swamp Forest).",
    "image": "https://api.scryfall.com/cards/named?exact=Indatha%20Triome&format=image&version=normal"
  },
  {
    "name": "Ketria Triome",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Forest Island Mountain",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Island Mountain).",
    "image": "https://api.scryfall.com/cards/named?exact=Ketria%20Triome&format=image&version=normal"
  },
  {
    "name": "Raugrin Triome",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Island Mountain Plains",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Mountain Plains).",
    "image": "https://api.scryfall.com/cards/named?exact=Raugrin%20Triome&format=image&version=normal"
  },
  {
    "name": "Savai Triome",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Mountain Plains Swamp",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Plains Swamp).",
    "image": "https://api.scryfall.com/cards/named?exact=Savai%20Triome&format=image&version=normal"
  },
  {
    "name": "Zagoth Triome",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Swamp Forest Island",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Forest Island).",
    "image": "https://api.scryfall.com/cards/named?exact=Zagoth%20Triome&format=image&version=normal"
  },
  {
    "name": "Xander's Lounge",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Island Swamp Mountain",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Swamp Mountain).",
    "image": "https://api.scryfall.com/cards/named?exact=Xander%27s%20Lounge&format=image&version=normal"
  },
  {
    "name": "Spara's Headquarters",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Forest Plains Island",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Plains Island).",
    "image": "https://api.scryfall.com/cards/named?exact=Spara%27s%20Headquarters&format=image&version=normal"
  },
  {
    "name": "Ziatora's Proving Ground",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Swamp Mountain Forest",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Mountain Forest).",
    "image": "https://api.scryfall.com/cards/named?exact=Ziatora%27s%20Proving%20Ground&format=image&version=normal"
  },
  {
    "name": "Raffine's Tower",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Plains Island Swamp",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Island Swamp).",
    "image": "https://api.scryfall.com/cards/named?exact=Raffine%27s%20Tower&format=image&version=normal"
  },
  {
    "name": "Jetmir's Garden",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Mountain Forest Plains",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Forest Plains).",
    "image": "https://api.scryfall.com/cards/named?exact=Jetmir%27s%20Garden&format=image&version=normal"
  },
  {
    "name": "Polluted Delta",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Polluted%20Delta&format=image&version=normal"
  },
  {
    "name": "Windswept Heath",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Windswept%20Heath&format=image&version=normal"
  },
  {
    "name": "Temple Garden",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Forest Plains",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Plains).",
    "image": "https://api.scryfall.com/cards/named?exact=Temple%20Garden&format=image&version=normal"
  },
  {
    "name": "Flooded Strand",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Flooded%20Strand&format=image&version=normal"
  },
  {
    "name": "Tranquil Cove",
    "tier": "C",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Tranquil%20Cove&format=image&version=normal"
  },
  {
    "name": "Spellseeker",
    "tier": "A",
    "color": "Bleu",
    "cmc": 3,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Spellseeker&format=image&version=normal"
  },
  {
    "name": "Shark Typhoon",
    "tier": "A",
    "color": "Bleu",
    "cmc": 6,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Shark%20Typhoon&format=image&version=normal"
  },
  {
    "name": "Pact of Negation",
    "tier": "A",
    "color": "Bleu",
    "cmc": 0,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Pact%20of%20Negation&format=image&version=normal"
  },
  {
    "name": "Otawara, Soaring City",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Legendary Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Otawara%2C%20Soaring%20City&format=image&version=normal"
  },
  {
    "name": "Serra Paragon",
    "tier": "S",
    "color": "Blanc",
    "cmc": 4,
    "type": "Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Serra%20Paragon&format=image&version=normal"
  },
  {
    "name": "Unlicensed Hearse",
    "tier": "A",
    "color": "Incolore",
    "cmc": 2,
    "type": "Artifact - Vehicle",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Vehicle).",
    "image": "https://api.scryfall.com/cards/named?exact=Unlicensed%20Hearse&format=image&version=normal"
  },
  {
    "name": "Maelstrom Archangel",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Maelstrom%20Archangel&format=image&version=normal"
  },
  {
    "name": "Atraxa, Grand Unifier",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 7,
    "type": "Legendary Creature - Phyrexian Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Phyrexian Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Atraxa%2C%20Grand%20Unifier&format=image&version=normal"
  },
  {
    "name": "Tiamat",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 7,
    "type": "Legendary Creature - Dragon God",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon God).",
    "image": "https://api.scryfall.com/cards/named?exact=Tiamat&format=image&version=normal"
  },
  {
    "name": "Boseiju, Who Endures",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Legendary Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Boseiju%2C%20Who%20Endures&format=image&version=normal"
  },
  {
    "name": "Nissa, Resurgent Animist",
    "tier": "S",
    "color": "Vert",
    "cmc": 3,
    "type": "Legendary Creature - Elf Scout",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Scout).",
    "image": "https://api.scryfall.com/cards/named?exact=Nissa%2C%20Resurgent%20Animist&format=image&version=normal"
  },
  {
    "name": "The Great Henge",
    "tier": "S",
    "color": "Vert",
    "cmc": 9,
    "type": "Legendary Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=The%20Great%20Henge&format=image&version=normal"
  },
  {
    "name": "The Meathook Massacre",
    "tier": "S",
    "color": "Noir",
    "cmc": 2,
    "type": "Legendary Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=The%20Meathook%20Massacre&format=image&version=normal"
  },
  {
    "name": "Immerwolf",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Immerwolf&format=image&version=normal"
  },
  {
    "name": "Kaito Shizuki",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Planeswalker - Kaito",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Kaito).",
    "image": "https://api.scryfall.com/cards/named?exact=Kaito%20Shizuki&format=image&version=normal"
  },
  {
    "name": "Ob Nixilis, the Adversary",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Planeswalker - Nixilis",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Nixilis).",
    "image": "https://api.scryfall.com/cards/named?exact=Ob%20Nixilis%2C%20the%20Adversary&format=image&version=normal"
  },
  {
    "name": "Ajani, Sleeper Agent",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Planeswalker - Ajani",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Ajani).",
    "image": "https://api.scryfall.com/cards/named?exact=Ajani%2C%20Sleeper%20Agent&format=image&version=normal"
  },
  {
    "name": "Vraska, Golgari Queen",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Planeswalker - Vraska",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Vraska).",
    "image": "https://api.scryfall.com/cards/named?exact=Vraska%2C%20Golgari%20Queen&format=image&version=normal"
  },
  {
    "name": "Sorin, Lord of Innistrad",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Planeswalker - Sorin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Sorin).",
    "image": "https://api.scryfall.com/cards/named?exact=Sorin%2C%20Lord%20of%20Innistrad&format=image&version=normal"
  },
  {
    "name": "Teferi, Time Raveler",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Planeswalker - Teferi",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Teferi).",
    "image": "https://api.scryfall.com/cards/named?exact=Teferi%2C%20Time%20Raveler&format=image&version=normal"
  },
  {
    "name": "Ajani Vengeant",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Planeswalker - Ajani",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Ajani).",
    "image": "https://api.scryfall.com/cards/named?exact=Ajani%20Vengeant&format=image&version=normal"
  },
  {
    "name": "Dack Fayden",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Planeswalker - Dack",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Dack).",
    "image": "https://api.scryfall.com/cards/named?exact=Dack%20Fayden&format=image&version=normal"
  },
  {
    "name": "Mana Confluence",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Mana%20Confluence&format=image&version=normal"
  },
  {
    "name": "Urborg, Tomb of Yawgmoth",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Legendary Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Urborg%2C%20Tomb%20of%20Yawgmoth&format=image&version=normal"
  },
  {
    "name": "Bloodstained Mire",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Bloodstained%20Mire&format=image&version=normal"
  },
  {
    "name": "Wooded Foothills",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Wooded%20Foothills&format=image&version=normal"
  },
  {
    "name": "Stomping Ground",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Mountain Forest",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Forest).",
    "image": "https://api.scryfall.com/cards/named?exact=Stomping%20Ground&format=image&version=normal"
  },
  {
    "name": "Marsh Flats",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Marsh%20Flats&format=image&version=normal"
  },
  {
    "name": "Misty Rainforest",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Misty%20Rainforest&format=image&version=normal"
  },
  {
    "name": "Arid Mesa",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Arid%20Mesa&format=image&version=normal"
  },
  {
    "name": "Verdant Catacombs",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Verdant%20Catacombs&format=image&version=normal"
  },
  {
    "name": "Murderous Redcap",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Creature - Goblin Assassin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Assassin).",
    "image": "https://api.scryfall.com/cards/named?exact=Murderous%20Redcap&format=image&version=normal"
  },
  {
    "name": "Arlinn Kord",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Planeswalker - Arlinn",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Arlinn).",
    "image": "https://api.scryfall.com/cards/named?exact=Arlinn%20Kord&format=image&version=normal"
  },
  {
    "name": "Steam Vents",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land - Island Mountain",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Mountain).",
    "image": "https://api.scryfall.com/cards/named?exact=Steam%20Vents&format=image&version=normal"
  },
  {
    "name": "Angelfire Ignition",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Angelfire%20Ignition&format=image&version=normal"
  },
  {
    "name": "Aragorn, the Uniter",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Creature - Human Noble",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Noble).",
    "image": "https://api.scryfall.com/cards/named?exact=Aragorn%2C%20the%20Uniter&format=image&version=normal"
  },
  {
    "name": "Smoldering Egg",
    "tier": "A",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature - Dragon Egg",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon Egg).",
    "image": "https://api.scryfall.com/cards/named?exact=Smoldering%20Egg&format=image&version=normal"
  },
  {
    "name": "Goblin Wardriver",
    "tier": "B",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Wardriver&format=image&version=normal"
  },
  {
    "name": "Unclaimed Territory",
    "tier": "B",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Unclaimed%20Territory&format=image&version=normal"
  },
  {
    "name": "Ancient Ziggurat",
    "tier": "B",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Ancient%20Ziggurat&format=image&version=normal"
  },
  {
    "name": "Stoneforge Masterwork",
    "tier": "A",
    "color": "Incolore",
    "cmc": 1,
    "type": "Artifact - Equipment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
    "image": "https://api.scryfall.com/cards/named?exact=Stoneforge%20Masterwork&format=image&version=normal"
  },
  {
    "name": "The Celestus",
    "tier": "A",
    "color": "Incolore",
    "cmc": 3,
    "type": "Legendary Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=The%20Celestus&format=image&version=normal"
  },
  {
    "name": "Errant and Giada",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Human Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Errant%20and%20Giada&format=image&version=normal"
  },
  {
    "name": "Elite Guardmage",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Elite%20Guardmage&format=image&version=normal"
  },
  {
    "name": "Kessig Naturalist",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Creature - Human Werewolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Kessig%20Naturalist&format=image&version=normal"
  },
  {
    "name": "Nissa, Steward of Elements",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Legendary Planeswalker - Nissa",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Nissa).",
    "image": "https://api.scryfall.com/cards/named?exact=Nissa%2C%20Steward%20of%20Elements&format=image&version=normal"
  },
  {
    "name": "Shivan Devastator",
    "tier": "S",
    "color": "Rouge",
    "cmc": 1,
    "type": "Creature - Dragon Hydra",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon Hydra).",
    "image": "https://api.scryfall.com/cards/named?exact=Shivan%20Devastator&format=image&version=normal"
  },
  {
    "name": "Vampire Hexmage",
    "tier": "B",
    "color": "Noir",
    "cmc": 2,
    "type": "Creature - Vampire Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Vampire%20Hexmage&format=image&version=normal"
  },
  {
    "name": "Jodah, the Unifier",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Legendary Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Jodah%2C%20the%20Unifier&format=image&version=normal"
  },
  {
    "name": "Elenda and Azor",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 6,
    "type": "Legendary Creature - Vampire Knight Sphinx",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Knight Sphinx).",
    "image": "https://api.scryfall.com/cards/named?exact=Elenda%20and%20Azor&format=image&version=normal"
  },
  {
    "name": "Pile On",
    "tier": "A",
    "color": "Noir",
    "cmc": 4,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Pile%20On&format=image&version=normal"
  },
  {
    "name": "Katilda and Lier",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Human",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human).",
    "image": "https://api.scryfall.com/cards/named?exact=Katilda%20and%20Lier&format=image&version=normal"
  },
  {
    "name": "Rona, Herald of Invasion",
    "tier": "A",
    "color": "Bleu",
    "cmc": 2,
    "type": "Legendary Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Rona%2C%20Herald%20of%20Invasion&format=image&version=normal"
  },
  {
    "name": "Youthful Valkyrie",
    "tier": "B",
    "color": "Blanc",
    "cmc": 2,
    "type": "Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Youthful%20Valkyrie&format=image&version=normal"
  },
  {
    "name": "Witch's Oven",
    "tier": "B",
    "color": "Incolore",
    "cmc": 1,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Witch%27s%20Oven&format=image&version=normal"
  },
  {
    "name": "Windrider Wizard",
    "tier": "B",
    "color": "Bleu",
    "cmc": 3,
    "type": "Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Windrider%20Wizard&format=image&version=normal"
  },
  {
    "name": "Elven Chorus",
    "tier": "A",
    "color": "Vert",
    "cmc": 4,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Elven%20Chorus&format=image&version=normal"
  },
  {
    "name": "Flame of Anor",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Flame%20of%20Anor&format=image&version=normal"
  },
  {
    "name": "Swashbuckler Extraordinaire",
    "tier": "B",
    "color": "Rouge",
    "cmc": 3,
    "type": "Creature - Dragon Rogue Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon Rogue Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Swashbuckler%20Extraordinaire&format=image&version=normal"
  },
  {
    "name": "Up the Beanstalk",
    "tier": "B",
    "color": "Vert",
    "cmc": 2,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Up%20the%20Beanstalk&format=image&version=normal"
  },
  {
    "name": "Relic of Legends",
    "tier": "B",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Relic%20of%20Legends&format=image&version=normal"
  },
  {
    "name": "Welcoming Vampire",
    "tier": "A",
    "color": "Blanc",
    "cmc": 3,
    "type": "Creature - Vampire",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire).",
    "image": "https://api.scryfall.com/cards/named?exact=Welcoming%20Vampire&format=image&version=normal"
  },
  {
    "name": "General Ferrous Rokiric",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 3,
    "type": "Legendary Creature - Human Soldier",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Soldier).",
    "image": "https://api.scryfall.com/cards/named?exact=General%20Ferrous%20Rokiric&format=image&version=normal"
  },
  {
    "name": "Growth Spiral",
    "tier": "C",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Growth%20Spiral&format=image&version=normal"
  },
  {
    "name": "Zimone, Paradox Sculptor",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Zimone%2C%20Paradox%20Sculptor&format=image&version=normal"
  },
  {
    "name": "Trelasarra, Moon Dancer",
    "tier": "B",
    "color": "Multicolore",
    "cmc": 2,
    "type": "Legendary Creature - Elf Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Trelasarra%2C%20Moon%20Dancer&format=image&version=normal"
  },
  {
    "name": "High-Society Hunter",
    "tier": "A",
    "color": "Noir",
    "cmc": 5,
    "type": "Creature - Vampire Noble",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Noble).",
    "image": "https://api.scryfall.com/cards/named?exact=High-Society%20Hunter&format=image&version=normal"
  },
  {
    "name": "Virtue of Persistence",
    "tier": "S",
    "color": "Noir",
    "cmc": 7,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Virtue%20of%20Persistence&format=image&version=normal"
  },
  {
    "name": "Preacher of the Schism",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Creature - Vampire Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Preacher%20of%20the%20Schism&format=image&version=normal"
  },
  {
    "name": "Exemplar of Light",
    "tier": "A",
    "color": "Blanc",
    "cmc": 4,
    "type": "Creature - Angel",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
    "image": "https://api.scryfall.com/cards/named?exact=Exemplar%20of%20Light&format=image&version=normal"
  },
  {
    "name": "Virtue of Loyalty",
    "tier": "S",
    "color": "Blanc",
    "cmc": 5,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Virtue%20of%20Loyalty&format=image&version=normal"
  },
  {
    "name": "Tyvar, the Pummeler",
    "tier": "S",
    "color": "Vert",
    "cmc": 3,
    "type": "Legendary Creature - Elf Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Tyvar%2C%20the%20Pummeler&format=image&version=normal"
  },
  {
    "name": "Bone Shards",
    "tier": "C",
    "color": "Noir",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Bone%20Shards&format=image&version=normal"
  },
  {
    "name": "Sunfall",
    "tier": "A",
    "color": "Blanc",
    "cmc": 5,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Sunfall&format=image&version=normal"
  },
  {
    "name": "Reprieve",
    "tier": "B",
    "color": "Blanc",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Reprieve&format=image&version=normal"
  },
  {
    "name": "Three Steps Ahead",
    "tier": "A",
    "color": "Bleu",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Three%20Steps%20Ahead&format=image&version=normal"
  },
  {
    "name": "Malevolent Rumble",
    "tier": "C",
    "color": "Vert",
    "cmc": 2,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Malevolent%20Rumble&format=image&version=normal"
  },
  {
    "name": "Koh, the Face Stealer",
    "tier": "S",
    "color": "Noir",
    "cmc": 6,
    "type": "Legendary Creature - Shapeshifter Spirit",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Shapeshifter Spirit).",
    "image": "https://api.scryfall.com/cards/named?exact=Koh%2C%20the%20Face%20Stealer&format=image&version=normal"
  },
  {
    "name": "Plaza of Heroes",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Plaza%20of%20Heroes&format=image&version=normal"
  },
  {
    "name": "Searslicer Goblin",
    "tier": "A",
    "color": "Rouge",
    "cmc": 2,
    "type": "Creature - Goblin Warrior",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
    "image": "https://api.scryfall.com/cards/named?exact=Searslicer%20Goblin&format=image&version=normal"
  },
  {
    "name": "Prismatic Vista",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Prismatic%20Vista&format=image&version=normal"
  },
  {
    "name": "Jace, Vryn's Prodigy",
    "tier": "S",
    "color": "Bleu",
    "cmc": 2,
    "type": "Legendary Creature - Human Wizard",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
    "image": "https://api.scryfall.com/cards/named?exact=Jace%2C%20Vryn%27s%20Prodigy&format=image&version=normal"
  },
  {
    "name": "Smuggler's Copter",
    "tier": "A",
    "color": "Incolore",
    "cmc": 2,
    "type": "Artifact - Vehicle",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Vehicle).",
    "image": "https://api.scryfall.com/cards/named?exact=Smuggler%27s%20Copter&format=image&version=normal"
  },
  {
    "name": "Niv-Mizzet Reborn",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 5,
    "type": "Legendary Creature - Dragon Avatar",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon Avatar).",
    "image": "https://api.scryfall.com/cards/named?exact=Niv-Mizzet%20Reborn&format=image&version=normal"
  },
  {
    "name": "Universal Automaton",
    "tier": "C",
    "color": "Incolore",
    "cmc": 1,
    "type": "Artifact Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Universal%20Automaton&format=image&version=normal"
  },
  {
    "name": "Icon of Ancestry",
    "tier": "A",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Icon%20of%20Ancestry&format=image&version=normal"
  },
  {
    "name": "Heirloom Blade",
    "tier": "B",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact - Equipment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
    "image": "https://api.scryfall.com/cards/named?exact=Heirloom%20Blade&format=image&version=normal"
  },
  {
    "name": "Faceless Haven",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Snow Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Snow Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Faceless%20Haven&format=image&version=normal"
  },
  {
    "name": "Mu Yanling, Wind Rider",
    "tier": "S",
    "color": "Bleu",
    "cmc": 4,
    "type": "Legendary Creature - Human Wizard Pilot",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard Pilot).",
    "image": "https://api.scryfall.com/cards/named?exact=Mu%20Yanling%2C%20Wind%20Rider&format=image&version=normal"
  },
  {
    "name": "Summon: Fenrir",
    "tier": "B",
    "color": "Vert",
    "cmc": 3,
    "type": "Enchantment Creature - Saga Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment Creature - Saga Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Summon%3A%20Fenrir&format=image&version=normal"
  },
  {
    "name": "Mai, Scornful Striker",
    "tier": "A",
    "color": "Noir",
    "cmc": 2,
    "type": "Legendary Creature - Human Noble Ally",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Noble Ally).",
    "image": "https://api.scryfall.com/cards/named?exact=Mai%2C%20Scornful%20Striker&format=image&version=normal"
  },
  {
    "name": "Mana Vault",
    "tier": "A",
    "color": "Incolore",
    "cmc": 1,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Mana%20Vault&format=image&version=normal"
  },
  {
    "name": "Guide of Souls",
    "tier": "A",
    "color": "Blanc",
    "cmc": 1,
    "type": "Creature - Human Cleric",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
    "image": "https://api.scryfall.com/cards/named?exact=Guide%20of%20Souls&format=image&version=normal"
  },
  {
    "name": "Roaming Throne",
    "tier": "A",
    "color": "Incolore",
    "cmc": 4,
    "type": "Artifact Creature - Golem",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Golem).",
    "image": "https://api.scryfall.com/cards/named?exact=Roaming%20Throne&format=image&version=normal"
  },
  {
    "name": "Mana Drain",
    "tier": "S",
    "color": "Bleu",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Mana%20Drain&format=image&version=normal"
  },
  {
    "name": "Raise the Palisade",
    "tier": "A",
    "color": "Bleu",
    "cmc": 5,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Raise%20the%20Palisade&format=image&version=normal"
  },
  {
    "name": "Urza's Incubator",
    "tier": "A",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Urza%27s%20Incubator&format=image&version=normal"
  },
  {
    "name": "Crucible of Worlds",
    "tier": "S",
    "color": "Incolore",
    "cmc": 3,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Crucible%20of%20Worlds&format=image&version=normal"
  },
  {
    "name": "Paradise Mantle",
    "tier": "B",
    "color": "Incolore",
    "cmc": 0,
    "type": "Artifact - Equipment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
    "image": "https://api.scryfall.com/cards/named?exact=Paradise%20Mantle&format=image&version=normal"
  },
  {
    "name": "Force of Will",
    "tier": "S",
    "color": "Bleu",
    "cmc": 5,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Force%20of%20Will&format=image&version=normal"
  },
  {
    "name": "Allosaurus Shepherd",
    "tier": "S",
    "color": "Vert",
    "cmc": 1,
    "type": "Creature - Elf Shaman",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Shaman).",
    "image": "https://api.scryfall.com/cards/named?exact=Allosaurus%20Shepherd&format=image&version=normal"
  },
  {
    "name": "Noble Hierarch",
    "tier": "A",
    "color": "Vert",
    "cmc": 1,
    "type": "Creature - Human Druid",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Druid).",
    "image": "https://api.scryfall.com/cards/named?exact=Noble%20Hierarch&format=image&version=normal"
  },
  {
    "name": "Cosmogrand Zenith",
    "tier": "S",
    "color": "Blanc",
    "cmc": 3,
    "type": "Creature - Human Soldier",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
    "image": "https://api.scryfall.com/cards/named?exact=Cosmogrand%20Zenith&format=image&version=normal"
  },
  {
    "name": "Portal to Phyrexia",
    "tier": "S",
    "color": "Incolore",
    "cmc": 9,
    "type": "Artifact",
    "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
    "image": "https://api.scryfall.com/cards/named?exact=Portal%20to%20Phyrexia&format=image&version=normal"
  },
  {
    "name": "Black Market Connections",
    "tier": "A",
    "color": "Noir",
    "cmc": 3,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Black%20Market%20Connections&format=image&version=normal"
  },
  {
    "name": "Broadside Bombardiers",
    "tier": "A",
    "color": "Rouge",
    "cmc": 3,
    "type": "Creature - Goblin Pirate",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Pirate).",
    "image": "https://api.scryfall.com/cards/named?exact=Broadside%20Bombardiers&format=image&version=normal"
  },
  {
    "name": "Entomb",
    "tier": "A",
    "color": "Noir",
    "cmc": 1,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Entomb&format=image&version=normal"
  },
  {
    "name": "Heroic Intervention",
    "tier": "A",
    "color": "Vert",
    "cmc": 2,
    "type": "Instant",
    "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
    "image": "https://api.scryfall.com/cards/named?exact=Heroic%20Intervention&format=image&version=normal"
  },
  {
    "name": "Fastbond",
    "tier": "A",
    "color": "Vert",
    "cmc": 1,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Fastbond&format=image&version=normal"
  },
  {
    "name": "Leaf-Crowned Visionary",
    "tier": "A",
    "color": "Vert",
    "cmc": 2,
    "type": "Creature - Elf Druid",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
    "image": "https://api.scryfall.com/cards/named?exact=Leaf-Crowned%20Visionary&format=image&version=normal"
  },
  {
    "name": "Kindred Discovery",
    "tier": "A",
    "color": "Bleu",
    "cmc": 5,
    "type": "Enchantment",
    "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
    "image": "https://api.scryfall.com/cards/named?exact=Kindred%20Discovery&format=image&version=normal"
  },
  {
    "name": "Morophon, the Boundless",
    "tier": "S",
    "color": "Incolore",
    "cmc": 7,
    "type": "Legendary Creature - Shapeshifter",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Shapeshifter).",
    "image": "https://api.scryfall.com/cards/named?exact=Morophon%2C%20the%20Boundless&format=image&version=normal"
  },
  {
    "name": "Ancient Tomb",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Ancient%20Tomb&format=image&version=normal"
  },
  {
    "name": "Karakas",
    "tier": "S",
    "color": "Terrain",
    "cmc": 0,
    "type": "Legendary Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Karakas&format=image&version=normal"
  },
  {
    "name": "The Ur-Dragon",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 9,
    "type": "Legendary Creature - Dragon Avatar",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon Avatar).",
    "image": "https://api.scryfall.com/cards/named?exact=The%20Ur-Dragon&format=image&version=normal"
  },
  {
    "name": "Strip Mine",
    "tier": "S",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Strip%20Mine&format=image&version=normal"
  },
  {
    "name": "Wasteland",
    "tier": "B",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Wasteland&format=image&version=normal"
  },
  {
    "name": "Multiversal Passage",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Multiversal%20Passage&format=image&version=normal"
  },
  {
    "name": "Gaea's Cradle",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Legendary Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Gaea%27s%20Cradle&format=image&version=normal"
  },
  {
    "name": "Field of the Dead",
    "tier": "A",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Field%20of%20the%20Dead&format=image&version=normal"
  },
  {
    "name": "Oust",
    "tier": "B",
    "color": "Blanc",
    "cmc": 1,
    "type": "Sorcery",
    "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
    "image": "https://api.scryfall.com/cards/named?exact=Oust&format=image&version=normal"
  },
  {
    "name": "Edgar, Charmed Groom",
    "tier": "A",
    "color": "Multicolore",
    "cmc": 4,
    "type": "Legendary Creature - Vampire Noble",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Noble).",
    "image": "https://api.scryfall.com/cards/named?exact=Edgar%2C%20Charmed%20Groom&format=image&version=normal"
  },
  {
    "name": "Zacama, Primal Calamity",
    "tier": "S",
    "color": "Multicolore",
    "cmc": 9,
    "type": "Legendary Creature - Elder Dinosaur",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dinosaur).",
    "image": "https://api.scryfall.com/cards/named?exact=Zacama%2C%20Primal%20Calamity&format=image&version=normal"
  },
  {
    "name": "Cecil, Dark Knight",
    "tier": "A",
    "color": "Blanc",
    "cmc": 1,
    "type": "Legendary Creature - Human Knight",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Knight).",
    "image": "https://api.scryfall.com/cards/named?exact=Cecil%2C%20Dark%20Knight&format=image&version=normal"
  },
  {
    "name": "Torgal, A Fine Hound",
    "tier": "B",
    "color": "Vert",
    "cmc": 2,
    "type": "Legendary Creature - Wolf",
    "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Wolf).",
    "image": "https://api.scryfall.com/cards/named?exact=Torgal%2C%20A%20Fine%20Hound&format=image&version=normal"
  },
  {
    "name": "Library of Alexandria",
    "tier": "B",
    "color": "Terrain",
    "cmc": 0,
    "type": "Land",
    "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
    "image": "https://api.scryfall.com/cards/named?exact=Library%20of%20Alexandria&format=image&version=normal"
  },
  {
    "name": "Vein Ripper",
    "tier": "S",
    "color": "Noir",
    "cmc": 6,
    "type": "Creature - Vampire Assassin",
    "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Assassin).",
    "image": "https://api.scryfall.com/cards/named?exact=Vein%20Ripper&format=image&version=normal"
  }
];

const CUBES_PRESETS = {
  "peasant_360": {
    "id": "peasant_360",
    "name": "Digital Peasant+ 360 (MTG Arena)",
    "owner": "Tristan",
    "size": 360,
    "description": "Cube optimisé 360 cartes pour MTG Arena. 85% Communes/Uncos modernes (MH3, OTJ, BLB, DSK) + 30 Bilands Rares détap.",
    "cards": "CUBE_CARDS_PEASANT"
  },
  "titou_tribal": {
    "id": "titou_tribal",
    "name": "Titou's Tribal & Chromatic Cube",
    "owner": "Tristan (@eltitou007)",
    "size": 545,
    "cubecobra_id": "1itq2",
    "description": "545 cartes physiques. Synergies tribales profondes (Humains, Elfes, Gobelins, Vampires, Zombies, Anges, Dragons), Changélins et ABUR Duals.",
    "cards": [
      {
        "name": "Champion of the Parish",
        "tier": "A",
        "color": "Blanc",
        "cmc": 1,
        "type": "Creature - Human Soldier",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
        "image": "https://api.scryfall.com/cards/named?exact=Champion%20of%20the%20Parish&format=image&version=normal"
      },
      {
        "name": "Mother of Runes",
        "tier": "B",
        "color": "Blanc",
        "cmc": 1,
        "type": "Creature - Human Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Mother%20of%20Runes&format=image&version=normal"
      },
      {
        "name": "Hidden Dragonslayer",
        "tier": "A",
        "color": "Blanc",
        "cmc": 2,
        "type": "Creature - Human Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Hidden%20Dragonslayer&format=image&version=normal"
      },
      {
        "name": "Imposing Sovereign",
        "tier": "A",
        "color": "Blanc",
        "cmc": 2,
        "type": "Creature - Human Noble",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Noble).",
        "image": "https://api.scryfall.com/cards/named?exact=Imposing%20Sovereign&format=image&version=normal"
      },
      {
        "name": "Selfless Spirit",
        "tier": "A",
        "color": "Blanc",
        "cmc": 2,
        "type": "Creature - Spirit Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Spirit Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Selfless%20Spirit&format=image&version=normal"
      },
      {
        "name": "Thalia's Lieutenant",
        "tier": "A",
        "color": "Blanc",
        "cmc": 2,
        "type": "Creature - Human Soldier",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
        "image": "https://api.scryfall.com/cards/named?exact=Thalia%27s%20Lieutenant&format=image&version=normal"
      },
      {
        "name": "Thalia, Guardian of Thraben",
        "tier": "A",
        "color": "Blanc",
        "cmc": 2,
        "type": "Legendary Creature - Human Soldier",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Soldier).",
        "image": "https://api.scryfall.com/cards/named?exact=Thalia%2C%20Guardian%20of%20Thraben&format=image&version=normal"
      },
      {
        "name": "Avian Changeling",
        "tier": "C",
        "color": "Blanc",
        "cmc": 3,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Avian%20Changeling&format=image&version=normal"
      },
      {
        "name": "Mirror Entity",
        "tier": "A",
        "color": "Blanc",
        "cmc": 3,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Mirror%20Entity&format=image&version=normal"
      },
      {
        "name": "Linvala, Keeper of Silence",
        "tier": "S",
        "color": "Blanc",
        "cmc": 4,
        "type": "Legendary Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Linvala%2C%20Keeper%20of%20Silence&format=image&version=normal"
      },
      {
        "name": "Ranger of Eos",
        "tier": "A",
        "color": "Blanc",
        "cmc": 4,
        "type": "Creature - Human Soldier",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
        "image": "https://api.scryfall.com/cards/named?exact=Ranger%20of%20Eos&format=image&version=normal"
      },
      {
        "name": "Restoration Angel",
        "tier": "A",
        "color": "Blanc",
        "cmc": 4,
        "type": "Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Restoration%20Angel&format=image&version=normal"
      },
      {
        "name": "Riders of Gavony",
        "tier": "A",
        "color": "Blanc",
        "cmc": 4,
        "type": "Creature - Human Knight",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Knight).",
        "image": "https://api.scryfall.com/cards/named?exact=Riders%20of%20Gavony&format=image&version=normal"
      },
      {
        "name": "Sublime Archangel",
        "tier": "S",
        "color": "Blanc",
        "cmc": 4,
        "type": "Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Sublime%20Archangel&format=image&version=normal"
      },
      {
        "name": "Baneslayer Angel",
        "tier": "S",
        "color": "Blanc",
        "cmc": 5,
        "type": "Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Baneslayer%20Angel&format=image&version=normal"
      },
      {
        "name": "Karmic Guide",
        "tier": "A",
        "color": "Blanc",
        "cmc": 5,
        "type": "Creature - Angel Spirit",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel Spirit).",
        "image": "https://api.scryfall.com/cards/named?exact=Karmic%20Guide&format=image&version=normal"
      },
      {
        "name": "Lyra Dawnbringer",
        "tier": "S",
        "color": "Blanc",
        "cmc": 5,
        "type": "Legendary Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Lyra%20Dawnbringer&format=image&version=normal"
      },
      {
        "name": "Avacyn, Angel of Hope",
        "tier": "S",
        "color": "Blanc",
        "cmc": 8,
        "type": "Legendary Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Avacyn%2C%20Angel%20of%20Hope&format=image&version=normal"
      },
      {
        "name": "Path to Exile",
        "tier": "B",
        "color": "Blanc",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Path%20to%20Exile&format=image&version=normal"
      },
      {
        "name": "Swords to Plowshares",
        "tier": "B",
        "color": "Blanc",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Swords%20to%20Plowshares&format=image&version=normal"
      },
      {
        "name": "Disenchant",
        "tier": "C",
        "color": "Blanc",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Disenchant&format=image&version=normal"
      },
      {
        "name": "Crib Swap",
        "tier": "B",
        "color": "Blanc",
        "cmc": 3,
        "type": "Tribal Instant - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Tribal Instant - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Crib%20Swap&format=image&version=normal"
      },
      {
        "name": "Declaration in Stone",
        "tier": "A",
        "color": "Blanc",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Declaration%20in%20Stone&format=image&version=normal"
      },
      {
        "name": "Timely Reinforcements",
        "tier": "B",
        "color": "Blanc",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Timely%20Reinforcements&format=image&version=normal"
      },
      {
        "name": "Day of Judgment",
        "tier": "A",
        "color": "Blanc",
        "cmc": 4,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Day%20of%20Judgment&format=image&version=normal"
      },
      {
        "name": "Martial Coup",
        "tier": "A",
        "color": "Blanc",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Martial%20Coup&format=image&version=normal"
      },
      {
        "name": "Oblivion Ring",
        "tier": "B",
        "color": "Blanc",
        "cmc": 3,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Oblivion%20Ring&format=image&version=normal"
      },
      {
        "name": "Angelic Destiny",
        "tier": "S",
        "color": "Blanc",
        "cmc": 4,
        "type": "Enchantment - Aura",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Aura).",
        "image": "https://api.scryfall.com/cards/named?exact=Angelic%20Destiny&format=image&version=normal"
      },
      {
        "name": "Delver of Secrets",
        "tier": "C",
        "color": "Bleu",
        "cmc": 1,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Delver%20of%20Secrets&format=image&version=normal"
      },
      {
        "name": "Sage of Epityr",
        "tier": "C",
        "color": "Bleu",
        "cmc": 1,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Sage%20of%20Epityr&format=image&version=normal"
      },
      {
        "name": "Baral, Chief of Compliance",
        "tier": "A",
        "color": "Bleu",
        "cmc": 2,
        "type": "Legendary Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Baral%2C%20Chief%20of%20Compliance&format=image&version=normal"
      },
      {
        "name": "Omenspeaker",
        "tier": "C",
        "color": "Bleu",
        "cmc": 2,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Omenspeaker&format=image&version=normal"
      },
      {
        "name": "Phantasmal Image",
        "tier": "A",
        "color": "Bleu",
        "cmc": 2,
        "type": "Creature - Illusion",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Illusion).",
        "image": "https://api.scryfall.com/cards/named?exact=Phantasmal%20Image&format=image&version=normal"
      },
      {
        "name": "Snapcaster Mage",
        "tier": "A",
        "color": "Bleu",
        "cmc": 2,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Snapcaster%20Mage&format=image&version=normal"
      },
      {
        "name": "Sea Gate Oracle",
        "tier": "C",
        "color": "Bleu",
        "cmc": 3,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Sea%20Gate%20Oracle&format=image&version=normal"
      },
      {
        "name": "Clever Impersonator",
        "tier": "S",
        "color": "Bleu",
        "cmc": 4,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Clever%20Impersonator&format=image&version=normal"
      },
      {
        "name": "Glen Elendra Archmage",
        "tier": "A",
        "color": "Bleu",
        "cmc": 4,
        "type": "Creature - Faerie Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Faerie Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Glen%20Elendra%20Archmage&format=image&version=normal"
      },
      {
        "name": "Stunt Double",
        "tier": "A",
        "color": "Bleu",
        "cmc": 4,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Stunt%20Double&format=image&version=normal"
      },
      {
        "name": "Venser, Shaper Savant",
        "tier": "A",
        "color": "Bleu",
        "cmc": 4,
        "type": "Legendary Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Venser%2C%20Shaper%20Savant&format=image&version=normal"
      },
      {
        "name": "Phyrexian Metamorph",
        "tier": "A",
        "color": "Bleu",
        "cmc": 4,
        "type": "Artifact Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Phyrexian%20Metamorph&format=image&version=normal"
      },
      {
        "name": "Icefall Regent",
        "tier": "A",
        "color": "Bleu",
        "cmc": 5,
        "type": "Creature - Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Icefall%20Regent&format=image&version=normal"
      },
      {
        "name": "Keiga, the Tide Star",
        "tier": "A",
        "color": "Bleu",
        "cmc": 6,
        "type": "Legendary Creature - Dragon Spirit",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon Spirit).",
        "image": "https://api.scryfall.com/cards/named?exact=Keiga%2C%20the%20Tide%20Star&format=image&version=normal"
      },
      {
        "name": "Jace Beleren",
        "tier": "S",
        "color": "Bleu",
        "cmc": 3,
        "type": "Legendary Planeswalker - Jace",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Jace).",
        "image": "https://api.scryfall.com/cards/named?exact=Jace%20Beleren&format=image&version=normal"
      },
      {
        "name": "Blustersquall",
        "tier": "B",
        "color": "Bleu",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Blustersquall&format=image&version=normal"
      },
      {
        "name": "Rapid Hybridization",
        "tier": "B",
        "color": "Bleu",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Rapid%20Hybridization&format=image&version=normal"
      },
      {
        "name": "Arcane Denial",
        "tier": "C",
        "color": "Bleu",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Arcane%20Denial&format=image&version=normal"
      },
      {
        "name": "Counterspell",
        "tier": "C",
        "color": "Bleu",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Counterspell&format=image&version=normal"
      },
      {
        "name": "Cyclonic Rift",
        "tier": "A",
        "color": "Bleu",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Cyclonic%20Rift&format=image&version=normal"
      },
      {
        "name": "Essence Scatter",
        "tier": "C",
        "color": "Bleu",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Essence%20Scatter&format=image&version=normal"
      },
      {
        "name": "Remand",
        "tier": "B",
        "color": "Bleu",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Remand&format=image&version=normal"
      },
      {
        "name": "Dissolve",
        "tier": "B",
        "color": "Bleu",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Dissolve&format=image&version=normal"
      },
      {
        "name": "Forbid",
        "tier": "B",
        "color": "Bleu",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Forbid&format=image&version=normal"
      },
      {
        "name": "Repulse",
        "tier": "C",
        "color": "Bleu",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Repulse&format=image&version=normal"
      },
      {
        "name": "Sage's Dousing",
        "tier": "B",
        "color": "Bleu",
        "cmc": 3,
        "type": "Tribal Instant - Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Tribal Instant - Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Sage%27s%20Dousing&format=image&version=normal"
      },
      {
        "name": "Desertion",
        "tier": "A",
        "color": "Bleu",
        "cmc": 5,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Desertion&format=image&version=normal"
      },
      {
        "name": "Preordain",
        "tier": "C",
        "color": "Bleu",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Preordain&format=image&version=normal"
      },
      {
        "name": "Guul Draz Vampire",
        "tier": "C",
        "color": "Noir",
        "cmc": 1,
        "type": "Creature - Vampire Rogue",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Rogue).",
        "image": "https://api.scryfall.com/cards/named?exact=Guul%20Draz%20Vampire&format=image&version=normal"
      },
      {
        "name": "Gifted Aetherborn",
        "tier": "B",
        "color": "Noir",
        "cmc": 2,
        "type": "Creature - Aetherborn Vampire",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Aetherborn Vampire).",
        "image": "https://api.scryfall.com/cards/named?exact=Gifted%20Aetherborn&format=image&version=normal"
      },
      {
        "name": "Cabal Slaver",
        "tier": "B",
        "color": "Noir",
        "cmc": 3,
        "type": "Creature - Human Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Cabal%20Slaver&format=image&version=normal"
      },
      {
        "name": "Dark Impostor",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Creature - Vampire Assassin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Assassin).",
        "image": "https://api.scryfall.com/cards/named?exact=Dark%20Impostor&format=image&version=normal"
      },
      {
        "name": "Drana, Liberator of Malakir",
        "tier": "S",
        "color": "Noir",
        "cmc": 3,
        "type": "Legendary Creature - Vampire Ally",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Ally).",
        "image": "https://api.scryfall.com/cards/named?exact=Drana%2C%20Liberator%20of%20Malakir&format=image&version=normal"
      },
      {
        "name": "Mad Auntie",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Creature - Goblin Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Mad%20Auntie&format=image&version=normal"
      },
      {
        "name": "Ophiomancer",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Creature - Human Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Ophiomancer&format=image&version=normal"
      },
      {
        "name": "Vampire Nighthawk",
        "tier": "B",
        "color": "Noir",
        "cmc": 3,
        "type": "Creature - Vampire Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Vampire%20Nighthawk&format=image&version=normal"
      },
      {
        "name": "Kalitas, Traitor of Ghet",
        "tier": "S",
        "color": "Noir",
        "cmc": 4,
        "type": "Legendary Creature - Vampire Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Kalitas%2C%20Traitor%20of%20Ghet&format=image&version=normal"
      },
      {
        "name": "Nekrataal",
        "tier": "B",
        "color": "Noir",
        "cmc": 4,
        "type": "Creature - Human Assassin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Assassin).",
        "image": "https://api.scryfall.com/cards/named?exact=Nekrataal&format=image&version=normal"
      },
      {
        "name": "Cairn Wanderer",
        "tier": "A",
        "color": "Noir",
        "cmc": 5,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Cairn%20Wanderer&format=image&version=normal"
      },
      {
        "name": "Sorin, Imperious Bloodlord",
        "tier": "S",
        "color": "Noir",
        "cmc": 3,
        "type": "Legendary Planeswalker - Sorin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Sorin).",
        "image": "https://api.scryfall.com/cards/named?exact=Sorin%2C%20Imperious%20Bloodlord&format=image&version=normal"
      },
      {
        "name": "Tragic Slip",
        "tier": "C",
        "color": "Noir",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Tragic%20Slip&format=image&version=normal"
      },
      {
        "name": "Doom Blade",
        "tier": "C",
        "color": "Noir",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Doom%20Blade&format=image&version=normal"
      },
      {
        "name": "Go for the Throat",
        "tier": "B",
        "color": "Noir",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Go%20for%20the%20Throat&format=image&version=normal"
      },
      {
        "name": "Victim of Night",
        "tier": "C",
        "color": "Noir",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Victim%20of%20Night&format=image&version=normal"
      },
      {
        "name": "Duress",
        "tier": "C",
        "color": "Noir",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Duress&format=image&version=normal"
      },
      {
        "name": "Reanimate",
        "tier": "B",
        "color": "Noir",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Reanimate&format=image&version=normal"
      },
      {
        "name": "Thoughtseize",
        "tier": "A",
        "color": "Noir",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Thoughtseize&format=image&version=normal"
      },
      {
        "name": "Hymn to Tourach",
        "tier": "B",
        "color": "Noir",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Hymn%20to%20Tourach&format=image&version=normal"
      },
      {
        "name": "Ruinous Path",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Ruinous%20Path&format=image&version=normal"
      },
      {
        "name": "Consuming Vapors",
        "tier": "A",
        "color": "Noir",
        "cmc": 4,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Consuming%20Vapors&format=image&version=normal"
      },
      {
        "name": "Sever the Bloodline",
        "tier": "A",
        "color": "Noir",
        "cmc": 4,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Sever%20the%20Bloodline&format=image&version=normal"
      },
      {
        "name": "Crux of Fate",
        "tier": "A",
        "color": "Noir",
        "cmc": 5,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Crux%20of%20Fate&format=image&version=normal"
      },
      {
        "name": "Cover of Darkness",
        "tier": "A",
        "color": "Noir",
        "cmc": 2,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Cover%20of%20Darkness&format=image&version=normal"
      },
      {
        "name": "Phyrexian Arena",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Phyrexian%20Arena&format=image&version=normal"
      },
      {
        "name": "Dragonmaster Outcast",
        "tier": "S",
        "color": "Rouge",
        "cmc": 1,
        "type": "Creature - Human Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Dragonmaster%20Outcast&format=image&version=normal"
      },
      {
        "name": "Goblin Guide",
        "tier": "A",
        "color": "Rouge",
        "cmc": 1,
        "type": "Creature - Goblin Scout",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Scout).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Guide&format=image&version=normal"
      },
      {
        "name": "Goblin Lackey",
        "tier": "S",
        "color": "Rouge",
        "cmc": 1,
        "type": "Creature - Goblin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Lackey&format=image&version=normal"
      },
      {
        "name": "Grim Lavamancer",
        "tier": "A",
        "color": "Rouge",
        "cmc": 1,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Grim%20Lavamancer&format=image&version=normal"
      },
      {
        "name": "Spikeshot Elder",
        "tier": "A",
        "color": "Rouge",
        "cmc": 1,
        "type": "Creature - Goblin Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Spikeshot%20Elder&format=image&version=normal"
      },
      {
        "name": "Bloodmark Mentor",
        "tier": "B",
        "color": "Rouge",
        "cmc": 2,
        "type": "Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Bloodmark%20Mentor&format=image&version=normal"
      },
      {
        "name": "Dragonlord's Servant",
        "tier": "B",
        "color": "Rouge",
        "cmc": 2,
        "type": "Creature - Goblin Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Dragonlord%27s%20Servant&format=image&version=normal"
      },
      {
        "name": "Mogg War Marshal",
        "tier": "C",
        "color": "Rouge",
        "cmc": 2,
        "type": "Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Mogg%20War%20Marshal&format=image&version=normal"
      },
      {
        "name": "Goblin Chieftain",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Creature - Goblin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Chieftain&format=image&version=normal"
      },
      {
        "name": "Goblin Matron",
        "tier": "B",
        "color": "Rouge",
        "cmc": 3,
        "type": "Creature - Goblin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Matron&format=image&version=normal"
      },
      {
        "name": "Goblin Rabblemaster",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Rabblemaster&format=image&version=normal"
      },
      {
        "name": "Goblin Warchief",
        "tier": "B",
        "color": "Rouge",
        "cmc": 3,
        "type": "Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Warchief&format=image&version=normal"
      },
      {
        "name": "Guttersnipe",
        "tier": "B",
        "color": "Rouge",
        "cmc": 3,
        "type": "Creature - Goblin Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Guttersnipe&format=image&version=normal"
      },
      {
        "name": "Taurean Mauler",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Taurean%20Mauler&format=image&version=normal"
      },
      {
        "name": "Krenko, Mob Boss",
        "tier": "A",
        "color": "Rouge",
        "cmc": 4,
        "type": "Legendary Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Krenko%2C%20Mob%20Boss&format=image&version=normal"
      },
      {
        "name": "Goblin Dark-Dwellers",
        "tier": "A",
        "color": "Rouge",
        "cmc": 5,
        "type": "Creature - Goblin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Dark-Dwellers&format=image&version=normal"
      },
      {
        "name": "Thundermaw Hellkite",
        "tier": "S",
        "color": "Rouge",
        "cmc": 5,
        "type": "Creature - Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Thundermaw%20Hellkite&format=image&version=normal"
      },
      {
        "name": "Sarkhan, Fireblood",
        "tier": "S",
        "color": "Rouge",
        "cmc": 3,
        "type": "Legendary Planeswalker - Sarkhan",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Sarkhan).",
        "image": "https://api.scryfall.com/cards/named?exact=Sarkhan%2C%20Fireblood&format=image&version=normal"
      },
      {
        "name": "Lightning Bolt",
        "tier": "C",
        "color": "Rouge",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Lightning%20Bolt&format=image&version=normal"
      },
      {
        "name": "Draconic Roar",
        "tier": "B",
        "color": "Rouge",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Draconic%20Roar&format=image&version=normal"
      },
      {
        "name": "Brimstone Volley",
        "tier": "C",
        "color": "Rouge",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Brimstone%20Volley&format=image&version=normal"
      },
      {
        "name": "Staggershock",
        "tier": "C",
        "color": "Rouge",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Staggershock&format=image&version=normal"
      },
      {
        "name": "Goblin Grenade",
        "tier": "B",
        "color": "Rouge",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Grenade&format=image&version=normal"
      },
      {
        "name": "Arc Trail",
        "tier": "B",
        "color": "Rouge",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Arc%20Trail&format=image&version=normal"
      },
      {
        "name": "Flames of the Firebrand",
        "tier": "B",
        "color": "Rouge",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Flames%20of%20the%20Firebrand&format=image&version=normal"
      },
      {
        "name": "Descent of the Dragons",
        "tier": "S",
        "color": "Rouge",
        "cmc": 6,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Descent%20of%20the%20Dragons&format=image&version=normal"
      },
      {
        "name": "Devil's Play",
        "tier": "A",
        "color": "Rouge",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Devil%27s%20Play&format=image&version=normal"
      },
      {
        "name": "Bonfire of the Damned",
        "tier": "S",
        "color": "Rouge",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Bonfire%20of%20the%20Damned&format=image&version=normal"
      },
      {
        "name": "Dragon Tempest",
        "tier": "A",
        "color": "Rouge",
        "cmc": 2,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Dragon%20Tempest&format=image&version=normal"
      },
      {
        "name": "Goblin Bombardment",
        "tier": "B",
        "color": "Rouge",
        "cmc": 2,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Bombardment&format=image&version=normal"
      },
      {
        "name": "Elvish Mystic",
        "tier": "C",
        "color": "Vert",
        "cmc": 1,
        "type": "Creature - Elf Druid",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
        "image": "https://api.scryfall.com/cards/named?exact=Elvish%20Mystic&format=image&version=normal"
      },
      {
        "name": "Llanowar Elves",
        "tier": "C",
        "color": "Vert",
        "cmc": 1,
        "type": "Creature - Elf Druid",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
        "image": "https://api.scryfall.com/cards/named?exact=Llanowar%20Elves&format=image&version=normal"
      },
      {
        "name": "Mayor of Avabruck",
        "tier": "A",
        "color": "Vert",
        "cmc": 2,
        "type": "Creature - Human Advisor Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Advisor Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Mayor%20of%20Avabruck&format=image&version=normal"
      },
      {
        "name": "Sylvan Advocate",
        "tier": "A",
        "color": "Vert",
        "cmc": 2,
        "type": "Creature - Elf Druid Ally",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid Ally).",
        "image": "https://api.scryfall.com/cards/named?exact=Sylvan%20Advocate&format=image&version=normal"
      },
      {
        "name": "Wolf-Skull Shaman",
        "tier": "B",
        "color": "Vert",
        "cmc": 2,
        "type": "Creature - Elf Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Wolf-Skull%20Shaman&format=image&version=normal"
      },
      {
        "name": "Ezuri, Renegade Leader",
        "tier": "S",
        "color": "Vert",
        "cmc": 3,
        "type": "Legendary Creature - Elf Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Ezuri%2C%20Renegade%20Leader&format=image&version=normal"
      },
      {
        "name": "Imperious Perfect",
        "tier": "B",
        "color": "Vert",
        "cmc": 3,
        "type": "Creature - Elf Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Imperious%20Perfect&format=image&version=normal"
      },
      {
        "name": "Reclamation Sage",
        "tier": "B",
        "color": "Vert",
        "cmc": 3,
        "type": "Creature - Elf Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Reclamation%20Sage&format=image&version=normal"
      },
      {
        "name": "Witchstalker",
        "tier": "A",
        "color": "Vert",
        "cmc": 3,
        "type": "Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Witchstalker&format=image&version=normal"
      },
      {
        "name": "Briarpack Alpha",
        "tier": "B",
        "color": "Vert",
        "cmc": 4,
        "type": "Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Briarpack%20Alpha&format=image&version=normal"
      },
      {
        "name": "Chameleon Colossus",
        "tier": "A",
        "color": "Vert",
        "cmc": 4,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Chameleon%20Colossus&format=image&version=normal"
      },
      {
        "name": "Dwynen, Gilt-Leaf Daen",
        "tier": "A",
        "color": "Vert",
        "cmc": 4,
        "type": "Legendary Creature - Elf Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Dwynen%2C%20Gilt-Leaf%20Daen&format=image&version=normal"
      },
      {
        "name": "Master of the Wild Hunt",
        "tier": "S",
        "color": "Vert",
        "cmc": 4,
        "type": "Creature - Human Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Master%20of%20the%20Wild%20Hunt&format=image&version=normal"
      },
      {
        "name": "Nightpack Ambusher",
        "tier": "A",
        "color": "Vert",
        "cmc": 4,
        "type": "Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Nightpack%20Ambusher&format=image&version=normal"
      },
      {
        "name": "Wren's Run Packmaster",
        "tier": "A",
        "color": "Vert",
        "cmc": 4,
        "type": "Creature - Elf Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Wren%27s%20Run%20Packmaster&format=image&version=normal"
      },
      {
        "name": "Kessig Cagebreakers",
        "tier": "A",
        "color": "Vert",
        "cmc": 5,
        "type": "Creature - Human Rogue",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Rogue).",
        "image": "https://api.scryfall.com/cards/named?exact=Kessig%20Cagebreakers&format=image&version=normal"
      },
      {
        "name": "Wolfir Silverheart",
        "tier": "A",
        "color": "Vert",
        "cmc": 5,
        "type": "Creature - Wolf Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Wolfir%20Silverheart&format=image&version=normal"
      },
      {
        "name": "Garruk Relentless",
        "tier": "S",
        "color": "Vert",
        "cmc": 4,
        "type": "Legendary Planeswalker - Garruk",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Garruk).",
        "image": "https://api.scryfall.com/cards/named?exact=Garruk%20Relentless&format=image&version=normal"
      },
      {
        "name": "Vines of Vastwood",
        "tier": "C",
        "color": "Vert",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Vines%20of%20Vastwood&format=image&version=normal"
      },
      {
        "name": "Green Sun's Zenith",
        "tier": "A",
        "color": "Vert",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Green%20Sun%27s%20Zenith&format=image&version=normal"
      },
      {
        "name": "Rancor",
        "tier": "B",
        "color": "Vert",
        "cmc": 1,
        "type": "Enchantment - Aura",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Aura).",
        "image": "https://api.scryfall.com/cards/named?exact=Rancor&format=image&version=normal"
      },
      {
        "name": "Lifecrafter's Bestiary",
        "tier": "A",
        "color": "Vert",
        "cmc": 3,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Lifecrafter%27s%20Bestiary&format=image&version=normal"
      },
      {
        "name": "Glacial Fortress",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Glacial%20Fortress&format=image&version=normal"
      },
      {
        "name": "Render Silent",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Render%20Silent&format=image&version=normal"
      },
      {
        "name": "Detention Sphere",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Detention%20Sphere&format=image&version=normal"
      },
      {
        "name": "Dragonlord Ojutai",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Legendary Creature - Elder Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Dragonlord%20Ojutai&format=image&version=normal"
      },
      {
        "name": "Dismal Backwater",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Dismal%20Backwater&format=image&version=normal"
      },
      {
        "name": "Drowned Catacomb",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Drowned%20Catacomb&format=image&version=normal"
      },
      {
        "name": "Dimir Doppelganger",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Dimir%20Doppelganger&format=image&version=normal"
      },
      {
        "name": "Evil Twin",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Evil%20Twin&format=image&version=normal"
      },
      {
        "name": "Hostage Taker",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Creature - Human Pirate",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Pirate).",
        "image": "https://api.scryfall.com/cards/named?exact=Hostage%20Taker&format=image&version=normal"
      },
      {
        "name": "Dragonlord Silumgar",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 6,
        "type": "Legendary Creature - Elder Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Dragonlord%20Silumgar&format=image&version=normal"
      },
      {
        "name": "Dragonskull Summit",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Dragonskull%20Summit&format=image&version=normal"
      },
      {
        "name": "Rakdos Guildgate",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Gate",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Gate).",
        "image": "https://api.scryfall.com/cards/named?exact=Rakdos%20Guildgate&format=image&version=normal"
      },
      {
        "name": "Dreadbore",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Dreadbore&format=image&version=normal"
      },
      {
        "name": "Kolaghan's Command",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Kolaghan%27s%20Command&format=image&version=normal"
      },
      {
        "name": "Olivia Voldaren",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Creature - Vampire",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire).",
        "image": "https://api.scryfall.com/cards/named?exact=Olivia%20Voldaren&format=image&version=normal"
      },
      {
        "name": "Kolaghan, the Storm's Fury",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Legendary Creature - Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Kolaghan%2C%20the%20Storm%27s%20Fury&format=image&version=normal"
      },
      {
        "name": "Copperline Gorge",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Copperline%20Gorge&format=image&version=normal"
      },
      {
        "name": "Rootbound Crag",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Rootbound%20Crag&format=image&version=normal"
      },
      {
        "name": "Huntmaster of the Fells",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Creature - Human Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Huntmaster%20of%20the%20Fells&format=image&version=normal"
      },
      {
        "name": "Dragonlord Atarka",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 7,
        "type": "Legendary Creature - Elder Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Dragonlord%20Atarka&format=image&version=normal"
      },
      {
        "name": "Razorverge Thicket",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Razorverge%20Thicket&format=image&version=normal"
      },
      {
        "name": "Sunpetal Grove",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Sunpetal%20Grove&format=image&version=normal"
      },
      {
        "name": "Watchwolf",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Watchwolf&format=image&version=normal"
      },
      {
        "name": "Sigarda, Heron's Grace",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Legendary Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Sigarda%2C%20Heron%27s%20Grace&format=image&version=normal"
      },
      {
        "name": "Scoured Barrens",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Scoured%20Barrens&format=image&version=normal"
      },
      {
        "name": "Temple of Silence",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Temple%20of%20Silence&format=image&version=normal"
      },
      {
        "name": "Anguished Unmaking",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Anguished%20Unmaking&format=image&version=normal"
      },
      {
        "name": "Vindicate",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Vindicate&format=image&version=normal"
      },
      {
        "name": "Utter End",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Utter%20End&format=image&version=normal"
      },
      {
        "name": "Deathpact Angel",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 6,
        "type": "Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Deathpact%20Angel&format=image&version=normal"
      },
      {
        "name": "Jungle Hollow",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Jungle%20Hollow&format=image&version=normal"
      },
      {
        "name": "Deathrite Shaman",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 1,
        "type": "Creature - Elf Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Deathrite%20Shaman&format=image&version=normal"
      },
      {
        "name": "Maelstrom Pulse",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Maelstrom%20Pulse&format=image&version=normal"
      },
      {
        "name": "Hinterland Harbor",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Hinterland%20Harbor&format=image&version=normal"
      },
      {
        "name": "Thornwood Falls",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Thornwood%20Falls&format=image&version=normal"
      },
      {
        "name": "Simic Charm",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Simic%20Charm&format=image&version=normal"
      },
      {
        "name": "Edric, Spymaster of Trest",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Elf Rogue",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Rogue).",
        "image": "https://api.scryfall.com/cards/named?exact=Edric%2C%20Spymaster%20of%20Trest&format=image&version=normal"
      },
      {
        "name": "Progenitor Mimic",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 6,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Progenitor%20Mimic&format=image&version=normal"
      },
      {
        "name": "Swiftwater Cliffs",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Swiftwater%20Cliffs&format=image&version=normal"
      },
      {
        "name": "Goblin Electromancer",
        "tier": "C",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Creature - Goblin Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Electromancer&format=image&version=normal"
      },
      {
        "name": "Fire // Ice",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Fire%20//%20Ice&format=image&version=normal"
      },
      {
        "name": "Dack's Duplicate",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Dack%27s%20Duplicate&format=image&version=normal"
      },
      {
        "name": "Wind-Scarred Crag",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Wind-Scarred%20Crag&format=image&version=normal"
      },
      {
        "name": "Boros Charm",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Boros%20Charm&format=image&version=normal"
      },
      {
        "name": "Karrthus, Tyrant of Jund",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 7,
        "type": "Legendary Creature - Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Karrthus%2C%20Tyrant%20of%20Jund&format=image&version=normal"
      },
      {
        "name": "Kaalia of the Vast",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Creature - Human Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Kaalia%20of%20the%20Vast&format=image&version=normal"
      },
      {
        "name": "Vorosh, the Hunter",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 6,
        "type": "Legendary Creature - Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Vorosh%2C%20the%20Hunter&format=image&version=normal"
      },
      {
        "name": "Aether Spellbomb",
        "tier": "C",
        "color": "Bleu",
        "cmc": 1,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Aether%20Spellbomb&format=image&version=normal"
      },
      {
        "name": "Coldsteel Heart",
        "tier": "B",
        "color": "Incolore",
        "cmc": 2,
        "type": "Snow Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Snow Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Coldsteel%20Heart&format=image&version=normal"
      },
      {
        "name": "Lightning Greaves",
        "tier": "B",
        "color": "Incolore",
        "cmc": 2,
        "type": "Artifact - Equipment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
        "image": "https://api.scryfall.com/cards/named?exact=Lightning%20Greaves&format=image&version=normal"
      },
      {
        "name": "Mind Stone",
        "tier": "B",
        "color": "Incolore",
        "cmc": 2,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Mind%20Stone&format=image&version=normal"
      },
      {
        "name": "Chromatic Lantern",
        "tier": "A",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Chromatic%20Lantern&format=image&version=normal"
      },
      {
        "name": "Herald's Horn",
        "tier": "B",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Herald%27s%20Horn&format=image&version=normal"
      },
      {
        "name": "Coat of Arms",
        "tier": "A",
        "color": "Incolore",
        "cmc": 5,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Coat%20of%20Arms&format=image&version=normal"
      },
      {
        "name": "Metallic Mimic",
        "tier": "A",
        "color": "Incolore",
        "cmc": 2,
        "type": "Artifact Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Metallic%20Mimic&format=image&version=normal"
      },
      {
        "name": "Adaptive Automaton",
        "tier": "A",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact Creature - Construct",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Construct).",
        "image": "https://api.scryfall.com/cards/named?exact=Adaptive%20Automaton&format=image&version=normal"
      },
      {
        "name": "Duplicant",
        "tier": "A",
        "color": "Incolore",
        "cmc": 6,
        "type": "Artifact Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Duplicant&format=image&version=normal"
      },
      {
        "name": "Cavern of Souls",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Cavern%20of%20Souls&format=image&version=normal"
      },
      {
        "name": "City of Brass",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=City%20of%20Brass&format=image&version=normal"
      },
      {
        "name": "Evolving Wilds",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Evolving%20Wilds&format=image&version=normal"
      },
      {
        "name": "Haven of the Spirit Dragon",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Haven%20of%20the%20Spirit%20Dragon&format=image&version=normal"
      },
      {
        "name": "Mutavault",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Mutavault&format=image&version=normal"
      },
      {
        "name": "Reflecting Pool",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Reflecting%20Pool&format=image&version=normal"
      },
      {
        "name": "Terramorphic Expanse",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Terramorphic%20Expanse&format=image&version=normal"
      },
      {
        "name": "Vivid Crag",
        "tier": "B",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Crag&format=image&version=normal"
      },
      {
        "name": "Vivid Creek",
        "tier": "B",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Creek&format=image&version=normal"
      },
      {
        "name": "Vivid Grove",
        "tier": "B",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Grove&format=image&version=normal"
      },
      {
        "name": "Vivid Marsh",
        "tier": "B",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Marsh&format=image&version=normal"
      },
      {
        "name": "Vivid Meadow",
        "tier": "B",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Vivid%20Meadow&format=image&version=normal"
      },
      {
        "name": "Goblin Trashmaster",
        "tier": "A",
        "color": "Rouge",
        "cmc": 4,
        "type": "Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Trashmaster&format=image&version=normal"
      },
      {
        "name": "Krenko, Tin Street Kingpin",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Legendary Creature - Goblin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin).",
        "image": "https://api.scryfall.com/cards/named?exact=Krenko%2C%20Tin%20Street%20Kingpin&format=image&version=normal"
      },
      {
        "name": "Embercleave",
        "tier": "S",
        "color": "Rouge",
        "cmc": 6,
        "type": "Legendary Artifact - Equipment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Artifact - Equipment).",
        "image": "https://api.scryfall.com/cards/named?exact=Embercleave&format=image&version=normal"
      },
      {
        "name": "Glorybringer",
        "tier": "A",
        "color": "Rouge",
        "cmc": 5,
        "type": "Creature - Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Glorybringer&format=image&version=normal"
      },
      {
        "name": "Paradise Druid",
        "tier": "B",
        "color": "Vert",
        "cmc": 2,
        "type": "Creature - Elf Druid",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
        "image": "https://api.scryfall.com/cards/named?exact=Paradise%20Druid&format=image&version=normal"
      },
      {
        "name": "Barrin, Tolarian Archmage",
        "tier": "A",
        "color": "Bleu",
        "cmc": 3,
        "type": "Legendary Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Barrin%2C%20Tolarian%20Archmage&format=image&version=normal"
      },
      {
        "name": "Verdant Catacombs",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Verdant%20Catacombs&format=image&version=normal"
      },
      {
        "name": "Steam Vents",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Island Mountain",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Mountain).",
        "image": "https://api.scryfall.com/cards/named?exact=Steam%20Vents&format=image&version=normal"
      },
      {
        "name": "Arid Mesa",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Arid%20Mesa&format=image&version=normal"
      },
      {
        "name": "Breeding Pool",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Forest Island",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Island).",
        "image": "https://api.scryfall.com/cards/named?exact=Breeding%20Pool&format=image&version=normal"
      },
      {
        "name": "Skysovereign, Consul Flagship",
        "tier": "S",
        "color": "Incolore",
        "cmc": 5,
        "type": "Legendary Artifact - Vehicle",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Artifact - Vehicle).",
        "image": "https://api.scryfall.com/cards/named?exact=Skysovereign%2C%20Consul%20Flagship&format=image&version=normal"
      },
      {
        "name": "Fabled Passage",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Fabled%20Passage&format=image&version=normal"
      },
      {
        "name": "Maskwood Nexus",
        "tier": "A",
        "color": "Incolore",
        "cmc": 4,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Maskwood%20Nexus&format=image&version=normal"
      },
      {
        "name": "Mazemind Tome",
        "tier": "A",
        "color": "Incolore",
        "cmc": 2,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Mazemind%20Tome&format=image&version=normal"
      },
      {
        "name": "Ugin, the Ineffable",
        "tier": "A",
        "color": "Incolore",
        "cmc": 6,
        "type": "Legendary Planeswalker - Ugin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Ugin).",
        "image": "https://api.scryfall.com/cards/named?exact=Ugin%2C%20the%20Ineffable&format=image&version=normal"
      },
      {
        "name": "Giant Killer",
        "tier": "A",
        "color": "Blanc",
        "cmc": 1,
        "type": "Creature - Human Peasant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Peasant).",
        "image": "https://api.scryfall.com/cards/named?exact=Giant%20Killer&format=image&version=normal"
      },
      {
        "name": "Authority of the Consuls",
        "tier": "A",
        "color": "Blanc",
        "cmc": 1,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Authority%20of%20the%20Consuls&format=image&version=normal"
      },
      {
        "name": "Soul Warden",
        "tier": "B",
        "color": "Blanc",
        "cmc": 1,
        "type": "Creature - Human Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Soul%20Warden&format=image&version=normal"
      },
      {
        "name": "Charming Prince",
        "tier": "A",
        "color": "Blanc",
        "cmc": 2,
        "type": "Creature - Human Noble",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Noble).",
        "image": "https://api.scryfall.com/cards/named?exact=Charming%20Prince&format=image&version=normal"
      },
      {
        "name": "Luminarch Aspirant",
        "tier": "A",
        "color": "Blanc",
        "cmc": 2,
        "type": "Creature - Human Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Luminarch%20Aspirant&format=image&version=normal"
      },
      {
        "name": "Righteous Valkyrie",
        "tier": "A",
        "color": "Blanc",
        "cmc": 3,
        "type": "Creature - Angel Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Righteous%20Valkyrie&format=image&version=normal"
      },
      {
        "name": "Ajani, Strength of the Pride",
        "tier": "S",
        "color": "Blanc",
        "cmc": 4,
        "type": "Legendary Planeswalker - Ajani",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Ajani).",
        "image": "https://api.scryfall.com/cards/named?exact=Ajani%2C%20Strength%20of%20the%20Pride&format=image&version=normal"
      },
      {
        "name": "Inscription of Ruin",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Inscription%20of%20Ruin&format=image&version=normal"
      },
      {
        "name": "Bloodchief's Thirst",
        "tier": "B",
        "color": "Noir",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Bloodchief%27s%20Thirst&format=image&version=normal"
      },
      {
        "name": "Nighthawk Scavenger",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Creature - Vampire Rogue",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Rogue).",
        "image": "https://api.scryfall.com/cards/named?exact=Nighthawk%20Scavenger&format=image&version=normal"
      },
      {
        "name": "Vito, Thorn of the Dusk Rose",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Legendary Creature - Vampire Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Vito%2C%20Thorn%20of%20the%20Dusk%20Rose&format=image&version=normal"
      },
      {
        "name": "Heartless Act",
        "tier": "B",
        "color": "Noir",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Heartless%20Act&format=image&version=normal"
      },
      {
        "name": "Knight of the Ebon Legion",
        "tier": "A",
        "color": "Noir",
        "cmc": 1,
        "type": "Creature - Vampire Knight",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Knight).",
        "image": "https://api.scryfall.com/cards/named?exact=Knight%20of%20the%20Ebon%20Legion&format=image&version=normal"
      },
      {
        "name": "Elvish Archdruid",
        "tier": "A",
        "color": "Vert",
        "cmc": 3,
        "type": "Creature - Elf Druid",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
        "image": "https://api.scryfall.com/cards/named?exact=Elvish%20Archdruid&format=image&version=normal"
      },
      {
        "name": "Pelt Collector",
        "tier": "A",
        "color": "Vert",
        "cmc": 1,
        "type": "Creature - Elf Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Pelt%20Collector&format=image&version=normal"
      },
      {
        "name": "Collected Company",
        "tier": "A",
        "color": "Vert",
        "cmc": 4,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Collected%20Company&format=image&version=normal"
      },
      {
        "name": "Realmwalker",
        "tier": "A",
        "color": "Vert",
        "cmc": 3,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Realmwalker&format=image&version=normal"
      },
      {
        "name": "Primal Might",
        "tier": "A",
        "color": "Vert",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Primal%20Might&format=image&version=normal"
      },
      {
        "name": "Cultivate",
        "tier": "C",
        "color": "Vert",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Cultivate&format=image&version=normal"
      },
      {
        "name": "Elvish Warmaster",
        "tier": "A",
        "color": "Vert",
        "cmc": 2,
        "type": "Creature - Elf Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Elvish%20Warmaster&format=image&version=normal"
      },
      {
        "name": "Craterhoof Behemoth",
        "tier": "S",
        "color": "Vert",
        "cmc": 8,
        "type": "Creature - Beast",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Beast).",
        "image": "https://api.scryfall.com/cards/named?exact=Craterhoof%20Behemoth&format=image&version=normal"
      },
      {
        "name": "Masked Vandal",
        "tier": "C",
        "color": "Vert",
        "cmc": 2,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Masked%20Vandal&format=image&version=normal"
      },
      {
        "name": "Jaspera Sentinel",
        "tier": "C",
        "color": "Vert",
        "cmc": 1,
        "type": "Creature - Elf Rogue",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Rogue).",
        "image": "https://api.scryfall.com/cards/named?exact=Jaspera%20Sentinel&format=image&version=normal"
      },
      {
        "name": "Finale of Devastation",
        "tier": "S",
        "color": "Vert",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Finale%20of%20Devastation&format=image&version=normal"
      },
      {
        "name": "Ram Through",
        "tier": "C",
        "color": "Vert",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Ram%20Through&format=image&version=normal"
      },
      {
        "name": "Curious Obsession",
        "tier": "B",
        "color": "Bleu",
        "cmc": 1,
        "type": "Enchantment - Aura",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Aura).",
        "image": "https://api.scryfall.com/cards/named?exact=Curious%20Obsession&format=image&version=normal"
      },
      {
        "name": "Disdainful Stroke",
        "tier": "C",
        "color": "Bleu",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Disdainful%20Stroke&format=image&version=normal"
      },
      {
        "name": "Legion Loyalist",
        "tier": "A",
        "color": "Rouge",
        "cmc": 1,
        "type": "Creature - Goblin Soldier",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Soldier).",
        "image": "https://api.scryfall.com/cards/named?exact=Legion%20Loyalist&format=image&version=normal"
      },
      {
        "name": "Overgrown Tomb",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Swamp Forest",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Forest).",
        "image": "https://api.scryfall.com/cards/named?exact=Overgrown%20Tomb&format=image&version=normal"
      },
      {
        "name": "Chevill, Bane of Monsters",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Legendary Creature - Human Rogue",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Rogue).",
        "image": "https://api.scryfall.com/cards/named?exact=Chevill%2C%20Bane%20of%20Monsters&format=image&version=normal"
      },
      {
        "name": "Assassin's Trophy",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Assassin%27s%20Trophy&format=image&version=normal"
      },
      {
        "name": "Sarulf, Realm Eater",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Sarulf%2C%20Realm%20Eater&format=image&version=normal"
      },
      {
        "name": "Binding the Old Gods",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Enchantment - Saga",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
        "image": "https://api.scryfall.com/cards/named?exact=Binding%20the%20Old%20Gods&format=image&version=normal"
      },
      {
        "name": "Watery Grave",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Island Swamp",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Swamp).",
        "image": "https://api.scryfall.com/cards/named?exact=Watery%20Grave&format=image&version=normal"
      },
      {
        "name": "Eladamri's Call",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Eladamri%27s%20Call&format=image&version=normal"
      },
      {
        "name": "Blood Crypt",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Swamp Mountain",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Mountain).",
        "image": "https://api.scryfall.com/cards/named?exact=Blood%20Crypt&format=image&version=normal"
      },
      {
        "name": "Godless Shrine",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Plains Swamp",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Swamp).",
        "image": "https://api.scryfall.com/cards/named?exact=Godless%20Shrine&format=image&version=normal"
      },
      {
        "name": "Radha, Heart of Keld",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Elf Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Radha%2C%20Heart%20of%20Keld&format=image&version=normal"
      },
      {
        "name": "Domri's Ambush",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Domri%27s%20Ambush&format=image&version=normal"
      },
      {
        "name": "Sacred Foundry",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Mountain Plains",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Plains).",
        "image": "https://api.scryfall.com/cards/named?exact=Sacred%20Foundry&format=image&version=normal"
      },
      {
        "name": "Spirebluff Canal",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Spirebluff%20Canal&format=image&version=normal"
      },
      {
        "name": "The Bears of Littjara",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Enchantment - Saga",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
        "image": "https://api.scryfall.com/cards/named?exact=The%20Bears%20of%20Littjara&format=image&version=normal"
      },
      {
        "name": "Frilled Mystic",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Creature - Elf Lizard Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Lizard Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Frilled%20Mystic&format=image&version=normal"
      },
      {
        "name": "Tundra",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Plains Island",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Island).",
        "image": "https://api.scryfall.com/cards/named?exact=Tundra&format=image&version=normal"
      },
      {
        "name": "Underground Sea",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Island Swamp",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Swamp).",
        "image": "https://api.scryfall.com/cards/named?exact=Underground%20Sea&format=image&version=normal"
      },
      {
        "name": "Badlands",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Swamp Mountain",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Mountain).",
        "image": "https://api.scryfall.com/cards/named?exact=Badlands&format=image&version=normal"
      },
      {
        "name": "Taiga",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Mountain Forest",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Forest).",
        "image": "https://api.scryfall.com/cards/named?exact=Taiga&format=image&version=normal"
      },
      {
        "name": "Savannah",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Forest Plains",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Plains).",
        "image": "https://api.scryfall.com/cards/named?exact=Savannah&format=image&version=normal"
      },
      {
        "name": "Scrubland",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Plains Swamp",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Swamp).",
        "image": "https://api.scryfall.com/cards/named?exact=Scrubland&format=image&version=normal"
      },
      {
        "name": "Volcanic Island",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Island Mountain",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Mountain).",
        "image": "https://api.scryfall.com/cards/named?exact=Volcanic%20Island&format=image&version=normal"
      },
      {
        "name": "Bayou",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Swamp Forest",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Forest).",
        "image": "https://api.scryfall.com/cards/named?exact=Bayou&format=image&version=normal"
      },
      {
        "name": "Plateau",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Mountain Plains",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Plains).",
        "image": "https://api.scryfall.com/cards/named?exact=Plateau&format=image&version=normal"
      },
      {
        "name": "Tropical Island",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Forest Island",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Island).",
        "image": "https://api.scryfall.com/cards/named?exact=Tropical%20Island&format=image&version=normal"
      },
      {
        "name": "Terror of the Peaks",
        "tier": "S",
        "color": "Rouge",
        "cmc": 5,
        "type": "Creature - Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Terror%20of%20the%20Peaks&format=image&version=normal"
      },
      {
        "name": "Goblin Cratermaker",
        "tier": "B",
        "color": "Rouge",
        "cmc": 2,
        "type": "Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Cratermaker&format=image&version=normal"
      },
      {
        "name": "Archangel Avacyn",
        "tier": "S",
        "color": "Blanc",
        "cmc": 5,
        "type": "Legendary Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Archangel%20Avacyn&format=image&version=normal"
      },
      {
        "name": "Vampire of the Dire Moon",
        "tier": "B",
        "color": "Noir",
        "cmc": 1,
        "type": "Creature - Vampire",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire).",
        "image": "https://api.scryfall.com/cards/named?exact=Vampire%20of%20the%20Dire%20Moon&format=image&version=normal"
      },
      {
        "name": "Saw It Coming",
        "tier": "B",
        "color": "Bleu",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Saw%20It%20Coming&format=image&version=normal"
      },
      {
        "name": "Llanowar Visionary",
        "tier": "C",
        "color": "Vert",
        "cmc": 3,
        "type": "Creature - Elf Druid",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
        "image": "https://api.scryfall.com/cards/named?exact=Llanowar%20Visionary&format=image&version=normal"
      },
      {
        "name": "Hallowed Fountain",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Plains Island",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Island).",
        "image": "https://api.scryfall.com/cards/named?exact=Hallowed%20Fountain&format=image&version=normal"
      },
      {
        "name": "Sulfuric Vortex",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Sulfuric%20Vortex&format=image&version=normal"
      },
      {
        "name": "Once Upon a Time",
        "tier": "A",
        "color": "Vert",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Once%20Upon%20a%20Time&format=image&version=normal"
      },
      {
        "name": "Solve the Equation",
        "tier": "B",
        "color": "Bleu",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Solve%20the%20Equation&format=image&version=normal"
      },
      {
        "name": "Expressive Iteration",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Expressive%20Iteration&format=image&version=normal"
      },
      {
        "name": "Rip Apart",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Rip%20Apart&format=image&version=normal"
      },
      {
        "name": "Archmage Emeritus",
        "tier": "A",
        "color": "Bleu",
        "cmc": 4,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Archmage%20Emeritus&format=image&version=normal"
      },
      {
        "name": "Vanishing Verse",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Vanishing%20Verse&format=image&version=normal"
      },
      {
        "name": "Galazeth Prismari",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Creature - Elder Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Galazeth%20Prismari&format=image&version=normal"
      },
      {
        "name": "Baleful Mastery",
        "tier": "A",
        "color": "Noir",
        "cmc": 4,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Baleful%20Mastery&format=image&version=normal"
      },
      {
        "name": "Ranger Class",
        "tier": "A",
        "color": "Vert",
        "cmc": 2,
        "type": "Enchantment - Class",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Class).",
        "image": "https://api.scryfall.com/cards/named?exact=Ranger%20Class&format=image&version=normal"
      },
      {
        "name": "Glasspool Mimic",
        "tier": "A",
        "color": "Bleu",
        "cmc": 3,
        "type": "Creature - Shapeshifter Rogue",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter Rogue).",
        "image": "https://api.scryfall.com/cards/named?exact=Glasspool%20Mimic&format=image&version=normal"
      },
      {
        "name": "Turntimber Symbiosis",
        "tier": "S",
        "color": "Vert",
        "cmc": 7,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Turntimber%20Symbiosis&format=image&version=normal"
      },
      {
        "name": "Emeria's Call",
        "tier": "S",
        "color": "Blanc",
        "cmc": 7,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Emeria%27s%20Call&format=image&version=normal"
      },
      {
        "name": "Battle Cry Goblin",
        "tier": "B",
        "color": "Rouge",
        "cmc": 2,
        "type": "Creature - Goblin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
        "image": "https://api.scryfall.com/cards/named?exact=Battle%20Cry%20Goblin&format=image&version=normal"
      },
      {
        "name": "Blade Historian",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Creature - Human Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Blade%20Historian&format=image&version=normal"
      },
      {
        "name": "Shatterskull Smashing",
        "tier": "S",
        "color": "Rouge",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Shatterskull%20Smashing&format=image&version=normal"
      },
      {
        "name": "Orvar, the All-Form",
        "tier": "S",
        "color": "Bleu",
        "cmc": 4,
        "type": "Legendary Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Orvar%2C%20the%20All-Form&format=image&version=normal"
      },
      {
        "name": "Tireless Provisioner",
        "tier": "B",
        "color": "Vert",
        "cmc": 3,
        "type": "Creature - Elf Scout",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Scout).",
        "image": "https://api.scryfall.com/cards/named?exact=Tireless%20Provisioner&format=image&version=normal"
      },
      {
        "name": "Werewolf Pack Leader",
        "tier": "A",
        "color": "Vert",
        "cmc": 2,
        "type": "Creature - Human Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Werewolf%20Pack%20Leader&format=image&version=normal"
      },
      {
        "name": "Consider",
        "tier": "C",
        "color": "Bleu",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Consider&format=image&version=normal"
      },
      {
        "name": "Tovolar's Huntmaster",
        "tier": "A",
        "color": "Vert",
        "cmc": 6,
        "type": "Creature - Human Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Tovolar%27s%20Huntmaster&format=image&version=normal"
      },
      {
        "name": "Duskwatch Recruiter",
        "tier": "B",
        "color": "Vert",
        "cmc": 2,
        "type": "Creature - Human Warrior Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Warrior Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Duskwatch%20Recruiter&format=image&version=normal"
      },
      {
        "name": "Burn Down the House",
        "tier": "A",
        "color": "Rouge",
        "cmc": 5,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Burn%20Down%20the%20House&format=image&version=normal"
      },
      {
        "name": "Tovolar, Dire Overlord",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Human Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Tovolar%2C%20Dire%20Overlord&format=image&version=normal"
      },
      {
        "name": "Immersturm Predator",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Creature - Vampire Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Immersturm%20Predator&format=image&version=normal"
      },
      {
        "name": "Reckless Stormseeker",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Creature - Human Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Reckless%20Stormseeker&format=image&version=normal"
      },
      {
        "name": "Fading Hope",
        "tier": "B",
        "color": "Bleu",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Fading%20Hope&format=image&version=normal"
      },
      {
        "name": "Voldaren Bloodcaster",
        "tier": "A",
        "color": "Noir",
        "cmc": 2,
        "type": "Creature - Vampire Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Voldaren%20Bloodcaster&format=image&version=normal"
      },
      {
        "name": "Hive of the Eye Tyrant",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Hive%20of%20the%20Eye%20Tyrant&format=image&version=normal"
      },
      {
        "name": "Go Blank",
        "tier": "B",
        "color": "Noir",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Go%20Blank&format=image&version=normal"
      },
      {
        "name": "Hagra Mauling",
        "tier": "A",
        "color": "Noir",
        "cmc": 4,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Hagra%20Mauling&format=image&version=normal"
      },
      {
        "name": "Sorin the Mirthless",
        "tier": "S",
        "color": "Noir",
        "cmc": 4,
        "type": "Legendary Planeswalker - Sorin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Sorin).",
        "image": "https://api.scryfall.com/cards/named?exact=Sorin%20the%20Mirthless&format=image&version=normal"
      },
      {
        "name": "Showdown of the Skalds",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Enchantment - Saga",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
        "image": "https://api.scryfall.com/cards/named?exact=Showdown%20of%20the%20Skalds&format=image&version=normal"
      },
      {
        "name": "Thraben Inspector",
        "tier": "C",
        "color": "Blanc",
        "cmc": 1,
        "type": "Creature - Human Soldier",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
        "image": "https://api.scryfall.com/cards/named?exact=Thraben%20Inspector&format=image&version=normal"
      },
      {
        "name": "Dauntless Bodyguard",
        "tier": "B",
        "color": "Blanc",
        "cmc": 1,
        "type": "Creature - Human Knight",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Knight).",
        "image": "https://api.scryfall.com/cards/named?exact=Dauntless%20Bodyguard&format=image&version=normal"
      },
      {
        "name": "Conclave Tribunal",
        "tier": "B",
        "color": "Blanc",
        "cmc": 4,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Conclave%20Tribunal&format=image&version=normal"
      },
      {
        "name": "Basri Ket",
        "tier": "S",
        "color": "Blanc",
        "cmc": 3,
        "type": "Legendary Planeswalker - Basri",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Basri).",
        "image": "https://api.scryfall.com/cards/named?exact=Basri%20Ket&format=image&version=normal"
      },
      {
        "name": "Valorous Stance",
        "tier": "B",
        "color": "Blanc",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Valorous%20Stance&format=image&version=normal"
      },
      {
        "name": "Cast Out",
        "tier": "B",
        "color": "Blanc",
        "cmc": 4,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Cast%20Out&format=image&version=normal"
      },
      {
        "name": "Maul of the Skyclaves",
        "tier": "A",
        "color": "Blanc",
        "cmc": 3,
        "type": "Artifact - Equipment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
        "image": "https://api.scryfall.com/cards/named?exact=Maul%20of%20the%20Skyclaves&format=image&version=normal"
      },
      {
        "name": "Vivien, Champion of the Wilds",
        "tier": "A",
        "color": "Vert",
        "cmc": 3,
        "type": "Legendary Planeswalker - Vivien",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Vivien).",
        "image": "https://api.scryfall.com/cards/named?exact=Vivien%2C%20Champion%20of%20the%20Wilds&format=image&version=normal"
      },
      {
        "name": "Light Up the Stage",
        "tier": "B",
        "color": "Rouge",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Light%20Up%20the%20Stage&format=image&version=normal"
      },
      {
        "name": "Roil Eruption",
        "tier": "C",
        "color": "Rouge",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Roil%20Eruption&format=image&version=normal"
      },
      {
        "name": "Chandra, Acolyte of Flame",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Legendary Planeswalker - Chandra",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Chandra).",
        "image": "https://api.scryfall.com/cards/named?exact=Chandra%2C%20Acolyte%20of%20Flame&format=image&version=normal"
      },
      {
        "name": "Lier, Disciple of the Drowned",
        "tier": "S",
        "color": "Bleu",
        "cmc": 5,
        "type": "Legendary Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Lier%2C%20Disciple%20of%20the%20Drowned&format=image&version=normal"
      },
      {
        "name": "Memory Deluge",
        "tier": "A",
        "color": "Bleu",
        "cmc": 4,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Memory%20Deluge&format=image&version=normal"
      },
      {
        "name": "Sublime Epiphany",
        "tier": "A",
        "color": "Bleu",
        "cmc": 6,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Sublime%20Epiphany&format=image&version=normal"
      },
      {
        "name": "Narset, Parter of Veils",
        "tier": "B",
        "color": "Bleu",
        "cmc": 3,
        "type": "Legendary Planeswalker - Narset",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Narset).",
        "image": "https://api.scryfall.com/cards/named?exact=Narset%2C%20Parter%20of%20Veils&format=image&version=normal"
      },
      {
        "name": "Spell Pierce",
        "tier": "C",
        "color": "Bleu",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Spell%20Pierce&format=image&version=normal"
      },
      {
        "name": "Jwari Disruption",
        "tier": "B",
        "color": "Bleu",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Jwari%20Disruption&format=image&version=normal"
      },
      {
        "name": "Bloodline Pretender",
        "tier": "B",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Bloodline%20Pretender&format=image&version=normal"
      },
      {
        "name": "Spikefield Hazard",
        "tier": "B",
        "color": "Rouge",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Spikefield%20Hazard&format=image&version=normal"
      },
      {
        "name": "Graveshifter",
        "tier": "B",
        "color": "Noir",
        "cmc": 4,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Graveshifter&format=image&version=normal"
      },
      {
        "name": "Nullpriest of Oblivion",
        "tier": "A",
        "color": "Noir",
        "cmc": 2,
        "type": "Creature - Vampire Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Nullpriest%20of%20Oblivion&format=image&version=normal"
      },
      {
        "name": "Impostor of the Sixth Pride",
        "tier": "C",
        "color": "Blanc",
        "cmc": 2,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Impostor%20of%20the%20Sixth%20Pride&format=image&version=normal"
      },
      {
        "name": "Ephemerate",
        "tier": "C",
        "color": "Blanc",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Ephemerate&format=image&version=normal"
      },
      {
        "name": "Kabira Takedown",
        "tier": "B",
        "color": "Blanc",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Kabira%20Takedown&format=image&version=normal"
      },
      {
        "name": "Cemetery Prowler",
        "tier": "S",
        "color": "Vert",
        "cmc": 3,
        "type": "Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Cemetery%20Prowler&format=image&version=normal"
      },
      {
        "name": "Brutal Cathar",
        "tier": "A",
        "color": "Blanc",
        "cmc": 3,
        "type": "Creature - Human Soldier Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Brutal%20Cathar&format=image&version=normal"
      },
      {
        "name": "Fable of the Mirror-Breaker",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Enchantment - Saga",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
        "image": "https://api.scryfall.com/cards/named?exact=Fable%20of%20the%20Mirror-Breaker&format=image&version=normal"
      },
      {
        "name": "Deadly Dispute",
        "tier": "C",
        "color": "Noir",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Deadly%20Dispute&format=image&version=normal"
      },
      {
        "name": "Goro-Goro, Disciple of Ryusei",
        "tier": "A",
        "color": "Rouge",
        "cmc": 2,
        "type": "Legendary Creature - Goblin Samurai",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Samurai).",
        "image": "https://api.scryfall.com/cards/named?exact=Goro-Goro%2C%20Disciple%20of%20Ryusei&format=image&version=normal"
      },
      {
        "name": "Twinshot Sniper",
        "tier": "B",
        "color": "Rouge",
        "cmc": 4,
        "type": "Artifact Creature - Goblin Archer",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Goblin Archer).",
        "image": "https://api.scryfall.com/cards/named?exact=Twinshot%20Sniper&format=image&version=normal"
      },
      {
        "name": "Reckoner Bankbuster",
        "tier": "A",
        "color": "Incolore",
        "cmc": 2,
        "type": "Artifact - Vehicle",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Vehicle).",
        "image": "https://api.scryfall.com/cards/named?exact=Reckoner%20Bankbuster&format=image&version=normal"
      },
      {
        "name": "Miirym, Sentinel Wyrm",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 6,
        "type": "Legendary Creature - Dragon Spirit",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon Spirit).",
        "image": "https://api.scryfall.com/cards/named?exact=Miirym%2C%20Sentinel%20Wyrm&format=image&version=normal"
      },
      {
        "name": "Unburial Rites",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Unburial%20Rites&format=image&version=normal"
      },
      {
        "name": "Multiple Choice",
        "tier": "A",
        "color": "Bleu",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Multiple%20Choice&format=image&version=normal"
      },
      {
        "name": "Callous Bloodmage",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Creature - Vampire Warlock",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Warlock).",
        "image": "https://api.scryfall.com/cards/named?exact=Callous%20Bloodmage&format=image&version=normal"
      },
      {
        "name": "Adeline, Resplendent Cathar",
        "tier": "A",
        "color": "Blanc",
        "cmc": 3,
        "type": "Legendary Creature - Human Knight",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Knight).",
        "image": "https://api.scryfall.com/cards/named?exact=Adeline%2C%20Resplendent%20Cathar&format=image&version=normal"
      },
      {
        "name": "Tolsimir, Friend to Wolves",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Legendary Creature - Elf Scout",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Scout).",
        "image": "https://api.scryfall.com/cards/named?exact=Tolsimir%2C%20Friend%20to%20Wolves&format=image&version=normal"
      },
      {
        "name": "Sling-Gang Lieutenant",
        "tier": "B",
        "color": "Noir",
        "cmc": 4,
        "type": "Creature - Goblin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
        "image": "https://api.scryfall.com/cards/named?exact=Sling-Gang%20Lieutenant&format=image&version=normal"
      },
      {
        "name": "Changeling Outcast",
        "tier": "C",
        "color": "Noir",
        "cmc": 1,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Changeling%20Outcast&format=image&version=normal"
      },
      {
        "name": "Intrepid Adversary",
        "tier": "S",
        "color": "Blanc",
        "cmc": 2,
        "type": "Creature - Human Scout",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Scout).",
        "image": "https://api.scryfall.com/cards/named?exact=Intrepid%20Adversary&format=image&version=normal"
      },
      {
        "name": "Sword Coast Serpent",
        "tier": "C",
        "color": "Bleu",
        "cmc": 7,
        "type": "Creature - Serpent Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Serpent Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Sword%20Coast%20Serpent&format=image&version=normal"
      },
      {
        "name": "Malevolent Hermit",
        "tier": "A",
        "color": "Bleu",
        "cmc": 2,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Malevolent%20Hermit&format=image&version=normal"
      },
      {
        "name": "Aether Channeler",
        "tier": "A",
        "color": "Bleu",
        "cmc": 3,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Aether%20Channeler&format=image&version=normal"
      },
      {
        "name": "Steel Seraph",
        "tier": "A",
        "color": "Blanc",
        "cmc": 6,
        "type": "Artifact Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Steel%20Seraph&format=image&version=normal"
      },
      {
        "name": "Loran of the Third Path",
        "tier": "A",
        "color": "Blanc",
        "cmc": 3,
        "type": "Legendary Creature - Human Artificer",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Artificer).",
        "image": "https://api.scryfall.com/cards/named?exact=Loran%20of%20the%20Third%20Path&format=image&version=normal"
      },
      {
        "name": "Unsettled Mariner",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Unsettled%20Mariner&format=image&version=normal"
      },
      {
        "name": "Linvala, Shield of Sea Gate",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Angel Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Linvala%2C%20Shield%20of%20Sea%20Gate&format=image&version=normal"
      },
      {
        "name": "Ertai Resurrected",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Creature - Phyrexian Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Phyrexian Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Ertai%20Resurrected&format=image&version=normal"
      },
      {
        "name": "Phyrexian Dragon Engine",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Artifact Creature - Phyrexian Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Phyrexian Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Phyrexian%20Dragon%20Engine&format=image&version=normal"
      },
      {
        "name": "Manaform Hellkite",
        "tier": "S",
        "color": "Rouge",
        "cmc": 4,
        "type": "Creature - Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Manaform%20Hellkite&format=image&version=normal"
      },
      {
        "name": "The Elder Dragon War",
        "tier": "A",
        "color": "Rouge",
        "cmc": 4,
        "type": "Enchantment - Saga",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
        "image": "https://api.scryfall.com/cards/named?exact=The%20Elder%20Dragon%20War&format=image&version=normal"
      },
      {
        "name": "Lair of the Hydra",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Lair%20of%20the%20Hydra&format=image&version=normal"
      },
      {
        "name": "Cave of the Frost Dragon",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Cave%20of%20the%20Frost%20Dragon&format=image&version=normal"
      },
      {
        "name": "Den of the Bugbear",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Den%20of%20the%20Bugbear&format=image&version=normal"
      },
      {
        "name": "Hall of Storm Giants",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Hall%20of%20Storm%20Giants&format=image&version=normal"
      },
      {
        "name": "Far // Away",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Far%20//%20Away&format=image&version=normal"
      },
      {
        "name": "Watcher for Tomorrow",
        "tier": "B",
        "color": "Bleu",
        "cmc": 2,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Watcher%20for%20Tomorrow&format=image&version=normal"
      },
      {
        "name": "Bloodtithe Harvester",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Creature - Vampire",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire).",
        "image": "https://api.scryfall.com/cards/named?exact=Bloodtithe%20Harvester&format=image&version=normal"
      },
      {
        "name": "Dismiss",
        "tier": "B",
        "color": "Bleu",
        "cmc": 4,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Dismiss&format=image&version=normal"
      },
      {
        "name": "Gix's Command",
        "tier": "A",
        "color": "Noir",
        "cmc": 5,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Gix%27s%20Command&format=image&version=normal"
      },
      {
        "name": "Sprite Dragon",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Creature - Faerie Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Faerie Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Sprite%20Dragon&format=image&version=normal"
      },
      {
        "name": "Velomachus Lorehold",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 7,
        "type": "Legendary Creature - Elder Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Velomachus%20Lorehold&format=image&version=normal"
      },
      {
        "name": "Glissa Sunslayer",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Phyrexian Zombie Elf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Phyrexian Zombie Elf).",
        "image": "https://api.scryfall.com/cards/named?exact=Glissa%20Sunslayer&format=image&version=normal"
      },
      {
        "name": "Vraan, Executioner Thane",
        "tier": "A",
        "color": "Noir",
        "cmc": 2,
        "type": "Legendary Creature - Phyrexian Vampire",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Phyrexian Vampire).",
        "image": "https://api.scryfall.com/cards/named?exact=Vraan%2C%20Executioner%20Thane&format=image&version=normal"
      },
      {
        "name": "Jadar, Ghoulcaller of Nephalia",
        "tier": "A",
        "color": "Noir",
        "cmc": 2,
        "type": "Legendary Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Jadar%2C%20Ghoulcaller%20of%20Nephalia&format=image&version=normal"
      },
      {
        "name": "Lazav, the Multifarious",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Legendary Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Lazav%2C%20the%20Multifarious&format=image&version=normal"
      },
      {
        "name": "Goro-Goro and Satoru",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Goblin Human",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Human).",
        "image": "https://api.scryfall.com/cards/named?exact=Goro-Goro%20and%20Satoru&format=image&version=normal"
      },
      {
        "name": "Kethis, the Hidden Hand",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Elf Advisor",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Advisor).",
        "image": "https://api.scryfall.com/cards/named?exact=Kethis%2C%20the%20Hidden%20Hand&format=image&version=normal"
      },
      {
        "name": "Arwen, Mortal Queen",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Elf Noble",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Noble).",
        "image": "https://api.scryfall.com/cards/named?exact=Arwen%2C%20Mortal%20Queen&format=image&version=normal"
      },
      {
        "name": "Sigarda, Font of Blessings",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Sigarda%2C%20Font%20of%20Blessings&format=image&version=normal"
      },
      {
        "name": "Play with Fire",
        "tier": "B",
        "color": "Rouge",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Play%20with%20Fire&format=image&version=normal"
      },
      {
        "name": "Dragon's Hoard",
        "tier": "A",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Dragon%27s%20Hoard&format=image&version=normal"
      },
      {
        "name": "Zurgo and Ojutai",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Legendary Creature - Orc Dragon",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Orc Dragon).",
        "image": "https://api.scryfall.com/cards/named?exact=Zurgo%20and%20Ojutai&format=image&version=normal"
      },
      {
        "name": "Skirk Prospector",
        "tier": "C",
        "color": "Rouge",
        "cmc": 1,
        "type": "Creature - Goblin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin).",
        "image": "https://api.scryfall.com/cards/named?exact=Skirk%20Prospector&format=image&version=normal"
      },
      {
        "name": "Pashalik Mons",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Legendary Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Pashalik%20Mons&format=image&version=normal"
      },
      {
        "name": "Muxus, Goblin Grandee",
        "tier": "A",
        "color": "Rouge",
        "cmc": 6,
        "type": "Legendary Creature - Goblin Noble",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Goblin Noble).",
        "image": "https://api.scryfall.com/cards/named?exact=Muxus%2C%20Goblin%20Grandee&format=image&version=normal"
      },
      {
        "name": "Kumano Faces Kakkazan",
        "tier": "B",
        "color": "Rouge",
        "cmc": 1,
        "type": "Enchantment - Saga",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment - Saga).",
        "image": "https://api.scryfall.com/cards/named?exact=Kumano%20Faces%20Kakkazan&format=image&version=normal"
      },
      {
        "name": "Act of Treason",
        "tier": "B",
        "color": "Rouge",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Act%20of%20Treason&format=image&version=normal"
      },
      {
        "name": "Abrade",
        "tier": "B",
        "color": "Rouge",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Abrade&format=image&version=normal"
      },
      {
        "name": "Ascendant Packleader",
        "tier": "A",
        "color": "Vert",
        "cmc": 1,
        "type": "Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Ascendant%20Packleader&format=image&version=normal"
      },
      {
        "name": "Primal Adversary",
        "tier": "S",
        "color": "Vert",
        "cmc": 3,
        "type": "Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Primal%20Adversary&format=image&version=normal"
      },
      {
        "name": "Avabruck Caretaker",
        "tier": "S",
        "color": "Vert",
        "cmc": 6,
        "type": "Creature - Human Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Avabruck%20Caretaker&format=image&version=normal"
      },
      {
        "name": "Harmonize",
        "tier": "B",
        "color": "Vert",
        "cmc": 4,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Harmonize&format=image&version=normal"
      },
      {
        "name": "Beast Within",
        "tier": "B",
        "color": "Vert",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Beast%20Within&format=image&version=normal"
      },
      {
        "name": "Tenacious Underdog",
        "tier": "A",
        "color": "Noir",
        "cmc": 2,
        "type": "Creature - Human Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Tenacious%20Underdog&format=image&version=normal"
      },
      {
        "name": "Dismember",
        "tier": "B",
        "color": "Noir",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Dismember&format=image&version=normal"
      },
      {
        "name": "Cultivator's Caravan",
        "tier": "A",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact - Vehicle",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Vehicle).",
        "image": "https://api.scryfall.com/cards/named?exact=Cultivator%27s%20Caravan&format=image&version=normal"
      },
      {
        "name": "Wedding Invitation",
        "tier": "C",
        "color": "Incolore",
        "cmc": 2,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Wedding%20Invitation&format=image&version=normal"
      },
      {
        "name": "Sanctuary Warden",
        "tier": "S",
        "color": "Blanc",
        "cmc": 6,
        "type": "Creature - Angel Soldier",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel Soldier).",
        "image": "https://api.scryfall.com/cards/named?exact=Sanctuary%20Warden&format=image&version=normal"
      },
      {
        "name": "Inspiring Overseer",
        "tier": "C",
        "color": "Blanc",
        "cmc": 3,
        "type": "Creature - Angel Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Inspiring%20Overseer&format=image&version=normal"
      },
      {
        "name": "Suspicious Stowaway",
        "tier": "A",
        "color": "Bleu",
        "cmc": 2,
        "type": "Creature - Human Rogue Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Rogue Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Suspicious%20Stowaway&format=image&version=normal"
      },
      {
        "name": "Bloodvial Purveyor",
        "tier": "A",
        "color": "Noir",
        "cmc": 4,
        "type": "Creature - Vampire",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire).",
        "image": "https://api.scryfall.com/cards/named?exact=Bloodvial%20Purveyor&format=image&version=normal"
      },
      {
        "name": "Indatha Triome",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Plains Swamp Forest",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Swamp Forest).",
        "image": "https://api.scryfall.com/cards/named?exact=Indatha%20Triome&format=image&version=normal"
      },
      {
        "name": "Ketria Triome",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Forest Island Mountain",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Island Mountain).",
        "image": "https://api.scryfall.com/cards/named?exact=Ketria%20Triome&format=image&version=normal"
      },
      {
        "name": "Raugrin Triome",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Island Mountain Plains",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Mountain Plains).",
        "image": "https://api.scryfall.com/cards/named?exact=Raugrin%20Triome&format=image&version=normal"
      },
      {
        "name": "Savai Triome",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Mountain Plains Swamp",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Plains Swamp).",
        "image": "https://api.scryfall.com/cards/named?exact=Savai%20Triome&format=image&version=normal"
      },
      {
        "name": "Zagoth Triome",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Swamp Forest Island",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Forest Island).",
        "image": "https://api.scryfall.com/cards/named?exact=Zagoth%20Triome&format=image&version=normal"
      },
      {
        "name": "Xander's Lounge",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Island Swamp Mountain",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Swamp Mountain).",
        "image": "https://api.scryfall.com/cards/named?exact=Xander%27s%20Lounge&format=image&version=normal"
      },
      {
        "name": "Spara's Headquarters",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Forest Plains Island",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Plains Island).",
        "image": "https://api.scryfall.com/cards/named?exact=Spara%27s%20Headquarters&format=image&version=normal"
      },
      {
        "name": "Ziatora's Proving Ground",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Swamp Mountain Forest",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Swamp Mountain Forest).",
        "image": "https://api.scryfall.com/cards/named?exact=Ziatora%27s%20Proving%20Ground&format=image&version=normal"
      },
      {
        "name": "Raffine's Tower",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Plains Island Swamp",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Plains Island Swamp).",
        "image": "https://api.scryfall.com/cards/named?exact=Raffine%27s%20Tower&format=image&version=normal"
      },
      {
        "name": "Jetmir's Garden",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Mountain Forest Plains",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Forest Plains).",
        "image": "https://api.scryfall.com/cards/named?exact=Jetmir%27s%20Garden&format=image&version=normal"
      },
      {
        "name": "Polluted Delta",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Polluted%20Delta&format=image&version=normal"
      },
      {
        "name": "Windswept Heath",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Windswept%20Heath&format=image&version=normal"
      },
      {
        "name": "Temple Garden",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Forest Plains",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Forest Plains).",
        "image": "https://api.scryfall.com/cards/named?exact=Temple%20Garden&format=image&version=normal"
      },
      {
        "name": "Flooded Strand",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Flooded%20Strand&format=image&version=normal"
      },
      {
        "name": "Tranquil Cove",
        "tier": "C",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Tranquil%20Cove&format=image&version=normal"
      },
      {
        "name": "Spellseeker",
        "tier": "A",
        "color": "Bleu",
        "cmc": 3,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Spellseeker&format=image&version=normal"
      },
      {
        "name": "Shark Typhoon",
        "tier": "A",
        "color": "Bleu",
        "cmc": 6,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Shark%20Typhoon&format=image&version=normal"
      },
      {
        "name": "Pact of Negation",
        "tier": "A",
        "color": "Bleu",
        "cmc": 0,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Pact%20of%20Negation&format=image&version=normal"
      },
      {
        "name": "Otawara, Soaring City",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Legendary Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Otawara%2C%20Soaring%20City&format=image&version=normal"
      },
      {
        "name": "Serra Paragon",
        "tier": "S",
        "color": "Blanc",
        "cmc": 4,
        "type": "Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Serra%20Paragon&format=image&version=normal"
      },
      {
        "name": "Unlicensed Hearse",
        "tier": "A",
        "color": "Incolore",
        "cmc": 2,
        "type": "Artifact - Vehicle",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Vehicle).",
        "image": "https://api.scryfall.com/cards/named?exact=Unlicensed%20Hearse&format=image&version=normal"
      },
      {
        "name": "Maelstrom Archangel",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Maelstrom%20Archangel&format=image&version=normal"
      },
      {
        "name": "Atraxa, Grand Unifier",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 7,
        "type": "Legendary Creature - Phyrexian Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Phyrexian Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Atraxa%2C%20Grand%20Unifier&format=image&version=normal"
      },
      {
        "name": "Tiamat",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 7,
        "type": "Legendary Creature - Dragon God",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon God).",
        "image": "https://api.scryfall.com/cards/named?exact=Tiamat&format=image&version=normal"
      },
      {
        "name": "Boseiju, Who Endures",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Legendary Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Boseiju%2C%20Who%20Endures&format=image&version=normal"
      },
      {
        "name": "Nissa, Resurgent Animist",
        "tier": "S",
        "color": "Vert",
        "cmc": 3,
        "type": "Legendary Creature - Elf Scout",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Scout).",
        "image": "https://api.scryfall.com/cards/named?exact=Nissa%2C%20Resurgent%20Animist&format=image&version=normal"
      },
      {
        "name": "The Great Henge",
        "tier": "S",
        "color": "Vert",
        "cmc": 9,
        "type": "Legendary Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=The%20Great%20Henge&format=image&version=normal"
      },
      {
        "name": "The Meathook Massacre",
        "tier": "S",
        "color": "Noir",
        "cmc": 2,
        "type": "Legendary Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=The%20Meathook%20Massacre&format=image&version=normal"
      },
      {
        "name": "Immerwolf",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Immerwolf&format=image&version=normal"
      },
      {
        "name": "Kaito Shizuki",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Planeswalker - Kaito",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Kaito).",
        "image": "https://api.scryfall.com/cards/named?exact=Kaito%20Shizuki&format=image&version=normal"
      },
      {
        "name": "Ob Nixilis, the Adversary",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Planeswalker - Nixilis",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Nixilis).",
        "image": "https://api.scryfall.com/cards/named?exact=Ob%20Nixilis%2C%20the%20Adversary&format=image&version=normal"
      },
      {
        "name": "Ajani, Sleeper Agent",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Planeswalker - Ajani",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Ajani).",
        "image": "https://api.scryfall.com/cards/named?exact=Ajani%2C%20Sleeper%20Agent&format=image&version=normal"
      },
      {
        "name": "Vraska, Golgari Queen",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Planeswalker - Vraska",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Vraska).",
        "image": "https://api.scryfall.com/cards/named?exact=Vraska%2C%20Golgari%20Queen&format=image&version=normal"
      },
      {
        "name": "Sorin, Lord of Innistrad",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Planeswalker - Sorin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Sorin).",
        "image": "https://api.scryfall.com/cards/named?exact=Sorin%2C%20Lord%20of%20Innistrad&format=image&version=normal"
      },
      {
        "name": "Teferi, Time Raveler",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Planeswalker - Teferi",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Teferi).",
        "image": "https://api.scryfall.com/cards/named?exact=Teferi%2C%20Time%20Raveler&format=image&version=normal"
      },
      {
        "name": "Ajani Vengeant",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Planeswalker - Ajani",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Ajani).",
        "image": "https://api.scryfall.com/cards/named?exact=Ajani%20Vengeant&format=image&version=normal"
      },
      {
        "name": "Dack Fayden",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Planeswalker - Dack",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Dack).",
        "image": "https://api.scryfall.com/cards/named?exact=Dack%20Fayden&format=image&version=normal"
      },
      {
        "name": "Mana Confluence",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Mana%20Confluence&format=image&version=normal"
      },
      {
        "name": "Urborg, Tomb of Yawgmoth",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Legendary Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Urborg%2C%20Tomb%20of%20Yawgmoth&format=image&version=normal"
      },
      {
        "name": "Bloodstained Mire",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Bloodstained%20Mire&format=image&version=normal"
      },
      {
        "name": "Wooded Foothills",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Wooded%20Foothills&format=image&version=normal"
      },
      {
        "name": "Stomping Ground",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Mountain Forest",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Mountain Forest).",
        "image": "https://api.scryfall.com/cards/named?exact=Stomping%20Ground&format=image&version=normal"
      },
      {
        "name": "Marsh Flats",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Marsh%20Flats&format=image&version=normal"
      },
      {
        "name": "Misty Rainforest",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Misty%20Rainforest&format=image&version=normal"
      },
      {
        "name": "Arid Mesa",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Arid%20Mesa&format=image&version=normal"
      },
      {
        "name": "Verdant Catacombs",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Verdant%20Catacombs&format=image&version=normal"
      },
      {
        "name": "Murderous Redcap",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Creature - Goblin Assassin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Assassin).",
        "image": "https://api.scryfall.com/cards/named?exact=Murderous%20Redcap&format=image&version=normal"
      },
      {
        "name": "Arlinn Kord",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Planeswalker - Arlinn",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Arlinn).",
        "image": "https://api.scryfall.com/cards/named?exact=Arlinn%20Kord&format=image&version=normal"
      },
      {
        "name": "Steam Vents",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land - Island Mountain",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land - Island Mountain).",
        "image": "https://api.scryfall.com/cards/named?exact=Steam%20Vents&format=image&version=normal"
      },
      {
        "name": "Angelfire Ignition",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Angelfire%20Ignition&format=image&version=normal"
      },
      {
        "name": "Aragorn, the Uniter",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Creature - Human Noble",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Noble).",
        "image": "https://api.scryfall.com/cards/named?exact=Aragorn%2C%20the%20Uniter&format=image&version=normal"
      },
      {
        "name": "Smoldering Egg",
        "tier": "A",
        "color": "Rouge",
        "cmc": 2,
        "type": "Creature - Dragon Egg",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon Egg).",
        "image": "https://api.scryfall.com/cards/named?exact=Smoldering%20Egg&format=image&version=normal"
      },
      {
        "name": "Goblin Wardriver",
        "tier": "B",
        "color": "Rouge",
        "cmc": 2,
        "type": "Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Goblin%20Wardriver&format=image&version=normal"
      },
      {
        "name": "Unclaimed Territory",
        "tier": "B",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Unclaimed%20Territory&format=image&version=normal"
      },
      {
        "name": "Ancient Ziggurat",
        "tier": "B",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Ancient%20Ziggurat&format=image&version=normal"
      },
      {
        "name": "Stoneforge Masterwork",
        "tier": "A",
        "color": "Incolore",
        "cmc": 1,
        "type": "Artifact - Equipment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
        "image": "https://api.scryfall.com/cards/named?exact=Stoneforge%20Masterwork&format=image&version=normal"
      },
      {
        "name": "The Celestus",
        "tier": "A",
        "color": "Incolore",
        "cmc": 3,
        "type": "Legendary Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=The%20Celestus&format=image&version=normal"
      },
      {
        "name": "Errant and Giada",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Human Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Errant%20and%20Giada&format=image&version=normal"
      },
      {
        "name": "Elite Guardmage",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Elite%20Guardmage&format=image&version=normal"
      },
      {
        "name": "Kessig Naturalist",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Creature - Human Werewolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Werewolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Kessig%20Naturalist&format=image&version=normal"
      },
      {
        "name": "Nissa, Steward of Elements",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Legendary Planeswalker - Nissa",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Planeswalker - Nissa).",
        "image": "https://api.scryfall.com/cards/named?exact=Nissa%2C%20Steward%20of%20Elements&format=image&version=normal"
      },
      {
        "name": "Shivan Devastator",
        "tier": "S",
        "color": "Rouge",
        "cmc": 1,
        "type": "Creature - Dragon Hydra",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon Hydra).",
        "image": "https://api.scryfall.com/cards/named?exact=Shivan%20Devastator&format=image&version=normal"
      },
      {
        "name": "Vampire Hexmage",
        "tier": "B",
        "color": "Noir",
        "cmc": 2,
        "type": "Creature - Vampire Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Vampire%20Hexmage&format=image&version=normal"
      },
      {
        "name": "Jodah, the Unifier",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Legendary Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Jodah%2C%20the%20Unifier&format=image&version=normal"
      },
      {
        "name": "Elenda and Azor",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 6,
        "type": "Legendary Creature - Vampire Knight Sphinx",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Knight Sphinx).",
        "image": "https://api.scryfall.com/cards/named?exact=Elenda%20and%20Azor&format=image&version=normal"
      },
      {
        "name": "Pile On",
        "tier": "A",
        "color": "Noir",
        "cmc": 4,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Pile%20On&format=image&version=normal"
      },
      {
        "name": "Katilda and Lier",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Human",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human).",
        "image": "https://api.scryfall.com/cards/named?exact=Katilda%20and%20Lier&format=image&version=normal"
      },
      {
        "name": "Rona, Herald of Invasion",
        "tier": "A",
        "color": "Bleu",
        "cmc": 2,
        "type": "Legendary Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Rona%2C%20Herald%20of%20Invasion&format=image&version=normal"
      },
      {
        "name": "Youthful Valkyrie",
        "tier": "B",
        "color": "Blanc",
        "cmc": 2,
        "type": "Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Youthful%20Valkyrie&format=image&version=normal"
      },
      {
        "name": "Witch's Oven",
        "tier": "B",
        "color": "Incolore",
        "cmc": 1,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Witch%27s%20Oven&format=image&version=normal"
      },
      {
        "name": "Windrider Wizard",
        "tier": "B",
        "color": "Bleu",
        "cmc": 3,
        "type": "Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Windrider%20Wizard&format=image&version=normal"
      },
      {
        "name": "Elven Chorus",
        "tier": "A",
        "color": "Vert",
        "cmc": 4,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Elven%20Chorus&format=image&version=normal"
      },
      {
        "name": "Flame of Anor",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Flame%20of%20Anor&format=image&version=normal"
      },
      {
        "name": "Swashbuckler Extraordinaire",
        "tier": "B",
        "color": "Rouge",
        "cmc": 3,
        "type": "Creature - Dragon Rogue Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Dragon Rogue Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Swashbuckler%20Extraordinaire&format=image&version=normal"
      },
      {
        "name": "Up the Beanstalk",
        "tier": "B",
        "color": "Vert",
        "cmc": 2,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Up%20the%20Beanstalk&format=image&version=normal"
      },
      {
        "name": "Relic of Legends",
        "tier": "B",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Relic%20of%20Legends&format=image&version=normal"
      },
      {
        "name": "Welcoming Vampire",
        "tier": "A",
        "color": "Blanc",
        "cmc": 3,
        "type": "Creature - Vampire",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire).",
        "image": "https://api.scryfall.com/cards/named?exact=Welcoming%20Vampire&format=image&version=normal"
      },
      {
        "name": "General Ferrous Rokiric",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 3,
        "type": "Legendary Creature - Human Soldier",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Soldier).",
        "image": "https://api.scryfall.com/cards/named?exact=General%20Ferrous%20Rokiric&format=image&version=normal"
      },
      {
        "name": "Growth Spiral",
        "tier": "C",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Growth%20Spiral&format=image&version=normal"
      },
      {
        "name": "Zimone, Paradox Sculptor",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Zimone%2C%20Paradox%20Sculptor&format=image&version=normal"
      },
      {
        "name": "Trelasarra, Moon Dancer",
        "tier": "B",
        "color": "Multicolore",
        "cmc": 2,
        "type": "Legendary Creature - Elf Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Trelasarra%2C%20Moon%20Dancer&format=image&version=normal"
      },
      {
        "name": "High-Society Hunter",
        "tier": "A",
        "color": "Noir",
        "cmc": 5,
        "type": "Creature - Vampire Noble",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Noble).",
        "image": "https://api.scryfall.com/cards/named?exact=High-Society%20Hunter&format=image&version=normal"
      },
      {
        "name": "Virtue of Persistence",
        "tier": "S",
        "color": "Noir",
        "cmc": 7,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Virtue%20of%20Persistence&format=image&version=normal"
      },
      {
        "name": "Preacher of the Schism",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Creature - Vampire Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Preacher%20of%20the%20Schism&format=image&version=normal"
      },
      {
        "name": "Exemplar of Light",
        "tier": "A",
        "color": "Blanc",
        "cmc": 4,
        "type": "Creature - Angel",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Angel).",
        "image": "https://api.scryfall.com/cards/named?exact=Exemplar%20of%20Light&format=image&version=normal"
      },
      {
        "name": "Virtue of Loyalty",
        "tier": "S",
        "color": "Blanc",
        "cmc": 5,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Virtue%20of%20Loyalty&format=image&version=normal"
      },
      {
        "name": "Tyvar, the Pummeler",
        "tier": "S",
        "color": "Vert",
        "cmc": 3,
        "type": "Legendary Creature - Elf Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elf Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Tyvar%2C%20the%20Pummeler&format=image&version=normal"
      },
      {
        "name": "Bone Shards",
        "tier": "C",
        "color": "Noir",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Bone%20Shards&format=image&version=normal"
      },
      {
        "name": "Sunfall",
        "tier": "A",
        "color": "Blanc",
        "cmc": 5,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Sunfall&format=image&version=normal"
      },
      {
        "name": "Reprieve",
        "tier": "B",
        "color": "Blanc",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Reprieve&format=image&version=normal"
      },
      {
        "name": "Three Steps Ahead",
        "tier": "A",
        "color": "Bleu",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Three%20Steps%20Ahead&format=image&version=normal"
      },
      {
        "name": "Malevolent Rumble",
        "tier": "C",
        "color": "Vert",
        "cmc": 2,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Malevolent%20Rumble&format=image&version=normal"
      },
      {
        "name": "Koh, the Face Stealer",
        "tier": "S",
        "color": "Noir",
        "cmc": 6,
        "type": "Legendary Creature - Shapeshifter Spirit",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Shapeshifter Spirit).",
        "image": "https://api.scryfall.com/cards/named?exact=Koh%2C%20the%20Face%20Stealer&format=image&version=normal"
      },
      {
        "name": "Plaza of Heroes",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Plaza%20of%20Heroes&format=image&version=normal"
      },
      {
        "name": "Searslicer Goblin",
        "tier": "A",
        "color": "Rouge",
        "cmc": 2,
        "type": "Creature - Goblin Warrior",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Warrior).",
        "image": "https://api.scryfall.com/cards/named?exact=Searslicer%20Goblin&format=image&version=normal"
      },
      {
        "name": "Prismatic Vista",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Prismatic%20Vista&format=image&version=normal"
      },
      {
        "name": "Jace, Vryn's Prodigy",
        "tier": "S",
        "color": "Bleu",
        "cmc": 2,
        "type": "Legendary Creature - Human Wizard",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard).",
        "image": "https://api.scryfall.com/cards/named?exact=Jace%2C%20Vryn%27s%20Prodigy&format=image&version=normal"
      },
      {
        "name": "Smuggler's Copter",
        "tier": "A",
        "color": "Incolore",
        "cmc": 2,
        "type": "Artifact - Vehicle",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Vehicle).",
        "image": "https://api.scryfall.com/cards/named?exact=Smuggler%27s%20Copter&format=image&version=normal"
      },
      {
        "name": "Niv-Mizzet Reborn",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 5,
        "type": "Legendary Creature - Dragon Avatar",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon Avatar).",
        "image": "https://api.scryfall.com/cards/named?exact=Niv-Mizzet%20Reborn&format=image&version=normal"
      },
      {
        "name": "Universal Automaton",
        "tier": "C",
        "color": "Incolore",
        "cmc": 1,
        "type": "Artifact Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Universal%20Automaton&format=image&version=normal"
      },
      {
        "name": "Icon of Ancestry",
        "tier": "A",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Icon%20of%20Ancestry&format=image&version=normal"
      },
      {
        "name": "Heirloom Blade",
        "tier": "B",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact - Equipment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
        "image": "https://api.scryfall.com/cards/named?exact=Heirloom%20Blade&format=image&version=normal"
      },
      {
        "name": "Faceless Haven",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Snow Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Snow Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Faceless%20Haven&format=image&version=normal"
      },
      {
        "name": "Mu Yanling, Wind Rider",
        "tier": "S",
        "color": "Bleu",
        "cmc": 4,
        "type": "Legendary Creature - Human Wizard Pilot",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Wizard Pilot).",
        "image": "https://api.scryfall.com/cards/named?exact=Mu%20Yanling%2C%20Wind%20Rider&format=image&version=normal"
      },
      {
        "name": "Summon: Fenrir",
        "tier": "B",
        "color": "Vert",
        "cmc": 3,
        "type": "Enchantment Creature - Saga Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment Creature - Saga Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Summon%3A%20Fenrir&format=image&version=normal"
      },
      {
        "name": "Mai, Scornful Striker",
        "tier": "A",
        "color": "Noir",
        "cmc": 2,
        "type": "Legendary Creature - Human Noble Ally",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Noble Ally).",
        "image": "https://api.scryfall.com/cards/named?exact=Mai%2C%20Scornful%20Striker&format=image&version=normal"
      },
      {
        "name": "Mana Vault",
        "tier": "A",
        "color": "Incolore",
        "cmc": 1,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Mana%20Vault&format=image&version=normal"
      },
      {
        "name": "Guide of Souls",
        "tier": "A",
        "color": "Blanc",
        "cmc": 1,
        "type": "Creature - Human Cleric",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Cleric).",
        "image": "https://api.scryfall.com/cards/named?exact=Guide%20of%20Souls&format=image&version=normal"
      },
      {
        "name": "Roaming Throne",
        "tier": "A",
        "color": "Incolore",
        "cmc": 4,
        "type": "Artifact Creature - Golem",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact Creature - Golem).",
        "image": "https://api.scryfall.com/cards/named?exact=Roaming%20Throne&format=image&version=normal"
      },
      {
        "name": "Mana Drain",
        "tier": "S",
        "color": "Bleu",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Mana%20Drain&format=image&version=normal"
      },
      {
        "name": "Raise the Palisade",
        "tier": "A",
        "color": "Bleu",
        "cmc": 5,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Raise%20the%20Palisade&format=image&version=normal"
      },
      {
        "name": "Urza's Incubator",
        "tier": "A",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Urza%27s%20Incubator&format=image&version=normal"
      },
      {
        "name": "Crucible of Worlds",
        "tier": "S",
        "color": "Incolore",
        "cmc": 3,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Crucible%20of%20Worlds&format=image&version=normal"
      },
      {
        "name": "Paradise Mantle",
        "tier": "B",
        "color": "Incolore",
        "cmc": 0,
        "type": "Artifact - Equipment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact - Equipment).",
        "image": "https://api.scryfall.com/cards/named?exact=Paradise%20Mantle&format=image&version=normal"
      },
      {
        "name": "Force of Will",
        "tier": "S",
        "color": "Bleu",
        "cmc": 5,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Force%20of%20Will&format=image&version=normal"
      },
      {
        "name": "Allosaurus Shepherd",
        "tier": "S",
        "color": "Vert",
        "cmc": 1,
        "type": "Creature - Elf Shaman",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Shaman).",
        "image": "https://api.scryfall.com/cards/named?exact=Allosaurus%20Shepherd&format=image&version=normal"
      },
      {
        "name": "Noble Hierarch",
        "tier": "A",
        "color": "Vert",
        "cmc": 1,
        "type": "Creature - Human Druid",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Druid).",
        "image": "https://api.scryfall.com/cards/named?exact=Noble%20Hierarch&format=image&version=normal"
      },
      {
        "name": "Cosmogrand Zenith",
        "tier": "S",
        "color": "Blanc",
        "cmc": 3,
        "type": "Creature - Human Soldier",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Human Soldier).",
        "image": "https://api.scryfall.com/cards/named?exact=Cosmogrand%20Zenith&format=image&version=normal"
      },
      {
        "name": "Portal to Phyrexia",
        "tier": "S",
        "color": "Incolore",
        "cmc": 9,
        "type": "Artifact",
        "comment": "Carte tribale / synergie clé du Cube Titou (Artifact).",
        "image": "https://api.scryfall.com/cards/named?exact=Portal%20to%20Phyrexia&format=image&version=normal"
      },
      {
        "name": "Black Market Connections",
        "tier": "A",
        "color": "Noir",
        "cmc": 3,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Black%20Market%20Connections&format=image&version=normal"
      },
      {
        "name": "Broadside Bombardiers",
        "tier": "A",
        "color": "Rouge",
        "cmc": 3,
        "type": "Creature - Goblin Pirate",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Goblin Pirate).",
        "image": "https://api.scryfall.com/cards/named?exact=Broadside%20Bombardiers&format=image&version=normal"
      },
      {
        "name": "Entomb",
        "tier": "A",
        "color": "Noir",
        "cmc": 1,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Entomb&format=image&version=normal"
      },
      {
        "name": "Heroic Intervention",
        "tier": "A",
        "color": "Vert",
        "cmc": 2,
        "type": "Instant",
        "comment": "Carte tribale / synergie clé du Cube Titou (Instant).",
        "image": "https://api.scryfall.com/cards/named?exact=Heroic%20Intervention&format=image&version=normal"
      },
      {
        "name": "Fastbond",
        "tier": "A",
        "color": "Vert",
        "cmc": 1,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Fastbond&format=image&version=normal"
      },
      {
        "name": "Leaf-Crowned Visionary",
        "tier": "A",
        "color": "Vert",
        "cmc": 2,
        "type": "Creature - Elf Druid",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Elf Druid).",
        "image": "https://api.scryfall.com/cards/named?exact=Leaf-Crowned%20Visionary&format=image&version=normal"
      },
      {
        "name": "Kindred Discovery",
        "tier": "A",
        "color": "Bleu",
        "cmc": 5,
        "type": "Enchantment",
        "comment": "Carte tribale / synergie clé du Cube Titou (Enchantment).",
        "image": "https://api.scryfall.com/cards/named?exact=Kindred%20Discovery&format=image&version=normal"
      },
      {
        "name": "Morophon, the Boundless",
        "tier": "S",
        "color": "Incolore",
        "cmc": 7,
        "type": "Legendary Creature - Shapeshifter",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Shapeshifter).",
        "image": "https://api.scryfall.com/cards/named?exact=Morophon%2C%20the%20Boundless&format=image&version=normal"
      },
      {
        "name": "Ancient Tomb",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Ancient%20Tomb&format=image&version=normal"
      },
      {
        "name": "Karakas",
        "tier": "S",
        "color": "Terrain",
        "cmc": 0,
        "type": "Legendary Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Karakas&format=image&version=normal"
      },
      {
        "name": "The Ur-Dragon",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 9,
        "type": "Legendary Creature - Dragon Avatar",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Dragon Avatar).",
        "image": "https://api.scryfall.com/cards/named?exact=The%20Ur-Dragon&format=image&version=normal"
      },
      {
        "name": "Strip Mine",
        "tier": "S",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Strip%20Mine&format=image&version=normal"
      },
      {
        "name": "Wasteland",
        "tier": "B",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Wasteland&format=image&version=normal"
      },
      {
        "name": "Multiversal Passage",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Multiversal%20Passage&format=image&version=normal"
      },
      {
        "name": "Gaea's Cradle",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Legendary Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Gaea%27s%20Cradle&format=image&version=normal"
      },
      {
        "name": "Field of the Dead",
        "tier": "A",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Field%20of%20the%20Dead&format=image&version=normal"
      },
      {
        "name": "Oust",
        "tier": "B",
        "color": "Blanc",
        "cmc": 1,
        "type": "Sorcery",
        "comment": "Carte tribale / synergie clé du Cube Titou (Sorcery).",
        "image": "https://api.scryfall.com/cards/named?exact=Oust&format=image&version=normal"
      },
      {
        "name": "Edgar, Charmed Groom",
        "tier": "A",
        "color": "Multicolore",
        "cmc": 4,
        "type": "Legendary Creature - Vampire Noble",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Vampire Noble).",
        "image": "https://api.scryfall.com/cards/named?exact=Edgar%2C%20Charmed%20Groom&format=image&version=normal"
      },
      {
        "name": "Zacama, Primal Calamity",
        "tier": "S",
        "color": "Multicolore",
        "cmc": 9,
        "type": "Legendary Creature - Elder Dinosaur",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Elder Dinosaur).",
        "image": "https://api.scryfall.com/cards/named?exact=Zacama%2C%20Primal%20Calamity&format=image&version=normal"
      },
      {
        "name": "Cecil, Dark Knight",
        "tier": "A",
        "color": "Blanc",
        "cmc": 1,
        "type": "Legendary Creature - Human Knight",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Human Knight).",
        "image": "https://api.scryfall.com/cards/named?exact=Cecil%2C%20Dark%20Knight&format=image&version=normal"
      },
      {
        "name": "Torgal, A Fine Hound",
        "tier": "B",
        "color": "Vert",
        "cmc": 2,
        "type": "Legendary Creature - Wolf",
        "comment": "Carte tribale / synergie clé du Cube Titou (Legendary Creature - Wolf).",
        "image": "https://api.scryfall.com/cards/named?exact=Torgal%2C%20A%20Fine%20Hound&format=image&version=normal"
      },
      {
        "name": "Library of Alexandria",
        "tier": "B",
        "color": "Terrain",
        "cmc": 0,
        "type": "Land",
        "comment": "Carte tribale / synergie clé du Cube Titou (Land).",
        "image": "https://api.scryfall.com/cards/named?exact=Library%20of%20Alexandria&format=image&version=normal"
      },
      {
        "name": "Vein Ripper",
        "tier": "S",
        "color": "Noir",
        "cmc": 6,
        "type": "Creature - Vampire Assassin",
        "comment": "Carte tribale / synergie clé du Cube Titou (Creature - Vampire Assassin).",
        "image": "https://api.scryfall.com/cards/named?exact=Vein%20Ripper&format=image&version=normal"
      }
    ]
  },
  "cedric_vintage": {
    "id": "cedric_vintage",
    "name": "Strobinellus's Vintage Unpowered",
    "owner": "Cédric N.",
    "size": 720,
    "cubecobra_id": "17",
    "description": "720 cartes Vintage Unpowered de très haute puissance. Archétypes denses, interactifs et rapides.",
    "cards": []
  },
  "nico_candyshop": {
    "id": "nico_candyshop",
    "name": "Fedor's Candyshop IRL",
    "owner": "Nico (@Fedor007)",
    "size": 730,
    "cubecobra_id": "1nxrs",
    "description": "730 cartes Legacy/Vintage physique. Piliers iconiques : Reanimator, Sneak Attack, Delver Tempo, Contrôle lourd.",
    "cards": []
  },
  "huge_pauper": {
    "id": "huge_pauper",
    "name": "Huge's Pauper Cube",
    "owner": "Huge",
    "size": 450,
    "description": "450 cartes Communes pures. Combat de créatures au sol, card advantage mesuré et respect strict des fondamentaux.",
    "cards": []
  }
};
