import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CardCatalog } from "../../../src/cards/card-catalog.ts";

const expectedReferenceScores = new Map<string, number>([
  ["Black Lotus", 53],
  ["Ancestral Recall", 53],
  ["Time Walk", 53],
  ["Minsc & Boo, Timeless Heroes", 52],
  ["Mox Pearl", 50],
  ["Mox Sapphire", 51],
  ["Mox Jet", 50],
  ["Mox Ruby", 51],
  ["Mox Emerald", 51],
  ["Sol Ring", 54],
  ["Ajani, Nacatl Pariah", 49],
  ["Mana Crypt", 50],
  ["Phlage, Titan of Fire's Fury", 50],
  ["Karakas", 49],
  ["Orcish Bowmasters", 49],
  ["Psychic Frog", 50],
  ["Oko, Thief of Crowns", 49],
  ["Ocelot Pride", 47],
  ["Swords to Plowshares", 47],
  ["Broadside Bombardiers", 48],
  ["Teferi, Time Raveler", 47],
  ["Ragavan, Nimble Pilferer", 47],
  ["Nadu, Winged Wisdom", 47],
  ["Phelia, Exuberant Shepherd", 47],
  ["Wooded Foothills", 45],
  ["Ancient Tomb", 29],
  ["Fabled Passage", 17],
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

    expect(Math.max(...cards.map((card) => card.powerScore.score))).toBe(54);
    expect(cards.every((card) => card.powerScore.score <= 55)).toBe(true);
  });
});
