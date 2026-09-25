export const RED_SPELLS = [
  "Lightning Bolt",
  "Abrade",
  "Act of Treason",
  "Arc Trail",
  "Battle Cry Goblin",
  "Bloodmark Mentor",
  "Bonfire of the Damned",
  "Brimstone Volley",
  "Broadside Bombardiers",
  "Burn Down the House",
  "Chandra, Acolyte of Flame",
  "Descent of the Dragons",
  "Devil's Play",
  "Draconic Roar",
  "Dragon Tempest",
  "Dragonlord's Servant",
  "Dragonmaster Outcast",
  "Embercleave",
  "Flames of the Firebrand",
  "Glorybringer",
  "Goblin Bombardment",
  "Goblin Chieftain",
  "Goblin Cratermaker",
] as const;

export const redDeck = (basics = 0): string =>
  `Deck\n${RED_SPELLS.map((name) => `1 ${name}`).join("\n")}${basics ? `\n${String(basics)} Mountain` : ""}`;
