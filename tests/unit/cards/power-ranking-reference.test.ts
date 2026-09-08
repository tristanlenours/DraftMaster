import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CardCatalog } from "../../../src/cards/card-catalog.ts";

const expectedReferenceScores = new Map<string, number>([
  ["Black Lotus", 53],
  ["Ancestral Recall", 53],
  ["Time Walk", 53],
  ["Minsc & Boo, Timeless Heroes", 53],
  ["Mox Pearl", 51],
  ["Mox Sapphire", 51],
  ["Mox Jet", 51],
  ["Mox Ruby", 51],
  ["Mox Emerald", 51],
  ["Sol Ring", 51],
  ["Ajani, Nacatl Pariah", 50],
  ["Mana Crypt", 50],
  ["Phlage, Titan of Fire's Fury", 50],
  ["Karakas", 49],
  ["Orcish Bowmasters", 49],
  ["Psychic Frog", 49],
  ["Oko, Thief of Crowns", 48],
  ["Ocelot Pride", 48],
  ["Swords to Plowshares", 48],
  ["Broadside Bombardiers", 47],
  ["Teferi, Time Raveler", 47],
  ["Ragavan, Nimble Pilferer", 47],
  ["Nadu, Winged Wisdom", 47],
  ["Phelia, Exuberant Shepherd", 47],
  ["Wooded Foothills", 46],
  ["Ancient Tomb", 31],
  ["Thriving Bluff", 10],
  ["Thriving Grove", 10],
  ["Thriving Heath", 10],
  ["Thriving Isle", 10],
  ["Thriving Moor", 10],
]);

describe("power ranking reference", () => {
  it("reproduces the user-verified reference scores without saturating the ranking", async () => {
    const loaded = await CardCatalog.fromFile(
      resolve(process.cwd(), "data/cards/master-cards.json"),
    );
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const cards = Object.values(loaded.value.catalog.cards);
    for (const [name, expectedScore] of expectedReferenceScores) {
      expect(loaded.value.getCardByName(name)?.powerScore.score, name).toBe(expectedScore);
    }

    expect(Math.max(...cards.map((card) => card.powerScore.score))).toBe(53);
    expect(cards.filter((card) => card.powerScore.score === 55)).toHaveLength(0);
  });
});
