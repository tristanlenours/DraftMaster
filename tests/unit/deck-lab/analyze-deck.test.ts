import { resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { CardCatalog } from "../../../src/cards/card-catalog.ts";
import { analyzeDeckText, type DeckLabCatalog } from "../../../src/deck-lab/analyze-deck.ts";

let catalog: DeckLabCatalog;

const RED_SPELLS = [
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
const redDeck = (basics = 0) =>
  `Deck\n${RED_SPELLS.map((name) => `1 ${name}`).join("\n")}${basics ? `\n${String(basics)} Mountain` : ""}`;
const WHITE_SPELLS = [
  "Adeline, Resplendent Cathar",
  "Ajani, Strength of the Pride",
  "Angelic Destiny",
  "Authority of the Consuls",
  "Avacyn, Angel of Hope",
  "Avian Changeling",
  "Baneslayer Angel",
  "Basri Ket",
  "Cast Out",
  "Champion of the Parish",
  "Charming Prince",
  "Conclave Tribunal",
  "Cosmogrand Zenith",
  "Crib Swap",
  "Dauntless Bodyguard",
  "Day of Judgment",
  "Declaration in Stone",
  "Disenchant",
  "Ephemerate",
  "Exemplar of Light",
  "Giant Killer",
  "Guide of Souls",
  "Hidden Dragonslayer",
] as const;

beforeAll(async () => {
  const loaded = await CardCatalog.fromFile(resolve("data/cards/master-cards.json"));
  if (!loaded.ok) throw new Error(loaded.error.message);
  catalog = { resolveCard: (name) => loaded.value.getCardByName(name) };
});

describe("deck lab", () => {
  it("rates exactly the 40-card maindeck with the five existing axes", () => {
    const result = analyzeDeckText(`${redDeck(17)}\nSideboard\n1 Counterspell`, "rate", catalog);

    expect(result.rating.score).toBeGreaterThanOrEqual(0);
    expect(result.rating.score).toBeLessThanOrEqual(100);
    expect(Object.keys(result.rating.axes)).toEqual([
      "power",
      "synergy",
      "curve",
      "mana",
      "interaction",
    ]);
    expect(result.rating.formulaVersion).toMatch(/^deck-evaluation@/u);
    expect(result.rating.audit.contributions).toHaveLength(5);
    expect(result.rating.audit.power.components).toHaveProperty("bombDensityBonus");
    expect(result.rating.evidence.power.examples).toContain("Lightning Bolt");
    expect(result.rating.evidence.interaction.examples).toContain("Lightning Bolt");
    expect(result.warnings.join(" ")).toMatch(/réserve ignorée/iu);
  });

  it("rates an incomplete singleton deck with disclosed virtual basics", () => {
    const result = analyzeDeckText(redDeck(16), "rate", catalog);
    expect(result.input.maindeckCount).toBe(39);
    expect(result.input.virtualBasicLands).toEqual([{ name: "Mountain", count: 1 }]);
    expect(result.rating.evidence.mana.lands).toBe(17);
    expect(result.warnings.join(" ")).toMatch(/virtuel.*Mountain/iu);
    const withoutBasics = analyzeDeckText(redDeck(), "rate", catalog);
    expect(withoutBasics.input.virtualBasicLands).toEqual([{ name: "Mountain", count: 17 }]);
    expect(withoutBasics.rating.evidence.mana.lands).toBe(17);
  });

  it("rejects a second copy of a nonbasic card but accepts repeated basics", () => {
    expect(() => analyzeDeckText("Deck\n2 Lightning Bolt\n38 Mountain", "rate", catalog)).toThrow(
      /un seul exemplaire.*Lightning Bolt/iu,
    );
    expect(() =>
      analyzeDeckText(`${redDeck(17)}\nSideboard\n1 Lightning Bolt`, "pimp", catalog),
    ).toThrow(/un seul exemplaire.*Lightning Bolt/iu);
    expect(() =>
      analyzeDeckText(`${redDeck(17)}\nSideboard\n1 Lightning Bolt`, "rate", catalog),
    ).toThrow(/un seul exemplaire.*Lightning Bolt/iu);
    expect(analyzeDeckText(redDeck(17), "rate", catalog).input.virtualBasicLands).toEqual([]);
  });

  it("selects 23 true nonlands and 17 lands, counting Emeria's Call as a land", () => {
    const text = `Deck\n${WHITE_SPELLS.map((name) => `1 ${name}`).join("\n")}\n1 Emeria's Call\n30 Plains`;
    const result = analyzeDeckText(text, "pimp", catalog);
    if (!("build" in result)) throw new Error("Pimp result is missing its build");
    expect(result.build.final.find((card) => card.name === "Emeria's Call")?.count).toBe(1);
    const chosenNonlands = result.build.final.filter(
      (card) => !catalog.resolveCard(card.name)?.isLand,
    );
    expect(chosenNonlands.reduce((sum, card) => sum + card.count, 0)).toBe(23);
    const chosenLands = result.build.final.filter((card) => catalog.resolveCard(card.name)?.isLand);
    expect(
      chosenLands.reduce((sum, card) => sum + card.count, 0) +
        Object.values(result.build.basicLands).reduce((sum, count) => sum + count, 0),
    ).toBe(17);
    expect(result.input.nonbasicPoolCount).toBe(24);
  });

  it("rebuilds a 40-card deck that starts with 24 nonlands", () => {
    const result = analyzeDeckText(`${redDeck(16)}\n1 Goblin Guide`, "pimp", catalog);
    if (!("build" in result)) throw new Error("Pimp result is missing its build");
    expect(result.before).not.toBeNull();
    expect(result.build.title).not.toBe("Deck actuel conservé");
    expect(
      result.build.final.filter((card) => !catalog.resolveCard(card.name)?.isLand),
    ).toHaveLength(23);
    expect(Object.values(result.build.basicLands).reduce((sum, count) => sum + count, 0)).toBe(17);
  });

  it("rejects a maindeck above 40 cards and unknown card names", () => {
    expect(() => analyzeDeckText(`${redDeck(17)}\n1 Plains`, "rate", catalog)).toThrow(
      /maximum 40/iu,
    );
    expect(() => analyzeDeckText("Deck\n1 Unknown Card", "rate", catalog)).toThrow(/Unknown Card/u);
  });

  it("ignores unknown sideboard cards when rating the 40-card maindeck", () => {
    const result = analyzeDeckText(`${redDeck(17)}\nSideboard\n1 Unknown Card`, "rate", catalog);
    expect(result.rating.score).toBeGreaterThanOrEqual(0);
    expect(result.warnings.join(" ")).toMatch(/réserve ignorée/iu);
  });

  it("builds a singleton 23/17 deck from a pool with a sideboard", () => {
    const result = analyzeDeckText(`${redDeck(17)}\nSideboard\n1 Black Lotus`, "pimp", catalog);
    expect(result.input.poolCount).toBe(41);
    expect(result.input.nonbasicPoolCount).toBe(24);
    if (!("build" in result)) throw new Error("Pimp result is missing its build");
    const selected = result.build.final.reduce((sum, card) => sum + card.count, 0);
    const basics = Object.values(result.build.basicLands).reduce((sum, count) => sum + count, 0);
    expect(selected + basics).toBe(40);
    expect(result.build.final.every((card) => card.count === 1)).toBe(true);
    expect(
      result.build.final.filter((card) => !catalog.resolveCard(card.name)?.isLand),
    ).toHaveLength(23);
  });

  it("separates retained cards from additions and names removed basic lands", () => {
    const result = analyzeDeckText(
      `Deck\n${RED_SPELLS.slice(0, 22)
        .map((name) => `1 ${name}`)
        .join("\n")}\n20 Mountain\nSideboard\n1 Black Lotus`,
      "pimp",
      catalog,
    );
    if (!("build" in result)) throw new Error("Pimp result is missing its build");
    const count = (cards: readonly { name: string; count: number }[], name: string) =>
      cards.find((card) => card.name === name)?.count ?? 0;
    expect(count(result.build.add, "Black Lotus")).toBe(1);
    expect(count(result.build.keep, "Black Lotus")).toBe(0);
    expect(count(result.build.keep, "Mountain")).toBe(
      Math.min(20, result.build.basicLands.Mountain ?? 0),
    );
    expect(count(result.build.final, "Black Lotus")).toBe(1);
    expect(count(result.build.remove, "Mountain")).toBe(
      20 - (result.build.basicLands.Mountain ?? 0),
    );
  });

  it("names unused sideboard basic lands in the reserve", () => {
    const result = analyzeDeckText(`${redDeck(17)}\nSideboard\n5 Island`, "pimp", catalog);
    if (!("build" in result)) throw new Error("Pimp result is missing its build");
    const unusedIslands = result.build.reserve.find((card) => card.name === "Island")?.count ?? 0;
    expect(unusedIslands).toBe(Math.max(0, 5 - (result.build.basicLands.Island ?? 0)));
  });

  it("returns the same proposal and rating for the same pool", () => {
    const input = `${redDeck(17)}\nSideboard\n1 Black Lotus`;
    const first = analyzeDeckText(input, "pimp", catalog);
    const second = analyzeDeckText(input, "pimp", catalog);
    expect(second).toEqual(first);
  });

  it("accepts 45 unique nonbasics plus basics and rejects 46 nonbasics", () => {
    const names = [...RED_SPELLS, ...WHITE_SPELLS];
    const list = (count: number) =>
      `Deck\n${names
        .slice(0, count)
        .map((name) => `1 ${name}`)
        .join("\n")}\n30 Mountain`;
    const result = analyzeDeckText(list(45), "pimp", catalog);
    if (!("build" in result)) throw new Error("Pimp result is missing its build");
    expect(result.build.reserve.reduce((sum, card) => sum + card.count, 0)).toBeGreaterThan(0);
    expect(result.before).toBeNull();
    expect(result.input.nonbasicPoolCount).toBe(45);
    expect(() => analyzeDeckText(list(46), "pimp", catalog)).toThrow(/45 cartes non basiques/iu);
  });

  it("rejects a pool with fewer than 23 true nonlands", () => {
    expect(() =>
      analyzeDeckText(
        `Deck\n${RED_SPELLS.slice(0, 22)
          .map((name) => `1 ${name}`)
          .join("\n")}\n1 Emeria's Call`,
        "pimp",
        catalog,
      ),
    ).toThrow(/23 cartes hors terrain/iu);
  });
});
