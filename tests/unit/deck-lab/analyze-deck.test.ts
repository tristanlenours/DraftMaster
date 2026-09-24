import { resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { CardCatalog } from "../../../src/cards/card-catalog.ts";
import {
  analyzeDeckText,
  DeckLabInputError,
  type DeckLabCatalog,
} from "../../../src/deck-lab/analyze-deck.ts";

let catalog: DeckLabCatalog;

beforeAll(async () => {
  const loaded = await CardCatalog.fromFile(resolve("data/cards/master-cards.json"));
  if (!loaded.ok) throw new Error(loaded.error.message);
  catalog = { resolveCard: (name) => loaded.value.getCardByName(name) };
});

describe("deck lab", () => {
  it("rates exactly the 40-card maindeck with the five existing axes", () => {
    const result = analyzeDeckText(
      "Deck\n23 Lightning Bolt\n17 Mountain\nSideboard\n5 Counterspell",
      "rate",
      catalog,
    );

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
    expect(result.rating.evidence.power.examples).toContain("Lightning Bolt");
    expect(result.rating.evidence.interaction.examples).toContain("Lightning Bolt");
    expect(result.warnings.join(" ")).toMatch(/réserve ignorée/iu);
  });

  it("rejects incomplete ratings and cards without trustworthy catalog facts", () => {
    expect(() => analyzeDeckText("Deck\n23 Lightning Bolt\n16 Mountain", "rate", catalog)).toThrow(
      DeckLabInputError,
    );
    expect(() => analyzeDeckText("Deck\n23 Unknown Card\n17 Mountain", "rate", catalog)).toThrow(
      /Unknown Card/u,
    );
  });

  it("ignores unknown sideboard cards when rating the 40-card maindeck", () => {
    const result = analyzeDeckText(
      "Deck\n23 Lightning Bolt\n17 Mountain\nSideboard\n1 Unknown Card",
      "rate",
      catalog,
    );
    expect(result.rating.score).toBeGreaterThanOrEqual(0);
    expect(result.warnings.join(" ")).toMatch(/réserve ignorée/iu);
  });

  it("builds a legal 40-card proposal from at most 45 supplied cards", () => {
    const result = analyzeDeckText(
      "Deck\n23 Lightning Bolt\n17 Mountain\nSideboard\n5 Counterspell",
      "pimp",
      catalog,
    );
    expect(result.input.poolCount).toBe(45);
    if (!("build" in result)) throw new Error("Pimp result is missing its build");
    const selected = result.build.keep.reduce((sum, card) => sum + card.count, 0);
    const basics = Object.values(result.build.basicLands).reduce((sum, count) => sum + count, 0);
    expect(selected + basics).toBe(40);
    expect(result.build.reserve.reduce((sum, card) => sum + card.count, 0)).toBe(28 - selected);
    expect(result.build.add.every((card) => card.name === "Counterspell")).toBe(true);
    expect(result.build.remove.every((card) => card.name === "Lightning Bolt")).toBe(true);
  });

  it("returns the same proposal and rating for the same pool", () => {
    const input = "Deck\n23 Lightning Bolt\n17 Mountain\nSideboard\n5 Counterspell";
    const first = analyzeDeckText(input, "pimp", catalog);
    const second = analyzeDeckText(input, "pimp", catalog);
    expect(second).toEqual(first);
  });

  it("treats an unsectioned 45-card pool as a pool and rejects 46 cards", () => {
    const result = analyzeDeckText("Deck\n45 Lightning Bolt", "pimp", catalog);
    if (!("build" in result)) throw new Error("Pimp result is missing its build");
    expect(result.build.reserve.reduce((sum, card) => sum + card.count, 0)).toBeGreaterThan(0);
    expect(result.before).toBeNull();
    expect(() => analyzeDeckText("Deck\n46 Lightning Bolt", "pimp", catalog)).toThrow(
      /45 cartes/iu,
    );
  });

  it("accepts a sparse pool while marking the recommendation preliminary", () => {
    const result = analyzeDeckText("Deck\n10 Lightning Bolt", "pimp", catalog);
    expect(result.warnings.join(" ")).toMatch(/préliminaire/iu);
    if (!("build" in result)) throw new Error("Pimp result is missing its build");
    const selected = result.build.keep.reduce((sum, card) => sum + card.count, 0);
    const basics = Object.values(result.build.basicLands).reduce((sum, count) => sum + count, 0);
    expect(selected + basics).toBe(40);
  });
});
