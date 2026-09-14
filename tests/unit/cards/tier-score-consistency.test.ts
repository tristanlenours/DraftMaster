import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { CardCatalog } from "../../../src/cards/card-catalog.ts";
import { scoreToPowerTier } from "../../../src/web/power-ranking.js";

const rootDir = process.cwd();

interface CubeCardIndexItem {
  readonly slug: string;
  readonly name: string;
  readonly oracleId: string;
  readonly tier: string;
  readonly fit: string;
  readonly scoreModifier: number;
}

interface CubeDocument {
  readonly cubeKey: string;
  readonly cardIndex: CubeCardIndexItem[];
}

interface InvalidTierSCard {
  readonly name: string;
  readonly score: number;
  readonly tier: string;
}

interface UtilityCardTestCase {
  readonly name: string;
  readonly maxScore: number;
  readonly expectedTier: string;
}

describe("Tier and Power Score Consistency", () => {
  const masterPath = resolve(rootDir, "data/cards/master-cards.json");

  it("enforces that no card in Nico's Candyshop is Tier S with a power score < 38", async () => {
    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;
    const nicoCards = catalog.getCardsInCube("nico_candyshop");
    const invalidCards: InvalidTierSCard[] = [];

    for (const card of nicoCards) {
      const nicoAnalysis = card.cubeAnalyses.nico_candyshop;
      if (nicoAnalysis?.tier === "S") {
        const score = card.powerScore.score;
        if (score < 38) {
          invalidCards.push({ name: card.name, score, tier: nicoAnalysis.tier });
        }
      }
    }

    expect(
      invalidCards,
      `Found ${String(invalidCards.length)} cards in Nico Candyshop with Tier S but score < 38: ${JSON.stringify(invalidCards)}`,
    ).toHaveLength(0);
  });

  it("verifies that iconic Vintage Cube staples have power scores >= 38 and Tier S in Candyshop", async () => {
    const iconicStaples = [
      "Orcish Bowmasters",
      "Black Lotus",
      "Ancestral Recall",
      "Time Walk",
      "Sol Ring",
      "Mana Crypt",
      "Mana Vault",
      "Mox Diamond",
      "Oko, Thief of Crowns",
      "Minsc & Boo, Timeless Heroes",
      "Ragavan, Nimble Pilferer",
      "Archon of Cruelty",
    ];

    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;

    for (const stapleName of iconicStaples) {
      const card = catalog.getCardByName(stapleName);
      expect(card, `Card ${stapleName} should exist in card catalog`).toBeDefined();
      if (!card) continue;

      const score = card.powerScore.score;
      expect(
        score,
        `Card ${stapleName} must have calibrated score >= 38 (actual: ${String(score)})`,
      ).toBeGreaterThanOrEqual(38);

      if (card.presentInCubes.includes("nico_candyshop")) {
        const tier = card.cubeAnalyses.nico_candyshop?.tier;
        expect(
          tier,
          `Card ${stapleName} must be Tier S in Nico Candyshop (actual: ${String(tier)})`,
        ).toBe("S");
      }
    }
  });

  it("enforces that Orcish Bowmasters is Tier S with score 49 in Nico Candyshop and Cedric Cube", async () => {
    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;
    const card = catalog.getCardByName("Orcish Bowmasters");
    expect(card, "Orcish Bowmasters must exist in catalog").toBeDefined();
    if (!card) return;

    expect(card.powerScore.score).toBe(49);
    expect(card.powerScore.score).toBeGreaterThanOrEqual(38);

    // Nico Candyshop
    expect(card.presentInCubes).toContain("nico_candyshop");
    const nicoAnalysis = card.cubeAnalyses.nico_candyshop;
    expect(nicoAnalysis).toBeDefined();
    expect(nicoAnalysis?.tier).toBe("S");
    expect(nicoAnalysis?.fit).toBe("staple");
    expect(nicoAnalysis?.scoreModifier).toBe(15);
    expect(nicoAnalysis?.pedagogy?.archetypeFit?.[0]?.grade).toBe("S");

    // Cedric's Cube
    expect(card.presentInCubes).toContain("cedric_cube");
    const cedricAnalysis = card.cubeAnalyses.cedric_cube;
    expect(cedricAnalysis).toBeDefined();
    expect(cedricAnalysis?.tier).toBe("S");
    expect(cedricAnalysis?.fit).toBe("staple");
  });

  it("enforces that iconic low-performing cards like Yawgmoth's Will and Bolas's Citadel reflect low power scores (score <= 15)", async () => {
    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;
    const yw = catalog.getCardByName("Yawgmoth's Will");
    expect(yw?.powerScore.score).toBeLessThanOrEqual(15);

    const bc = catalog.getCardByName("Bolas's Citadel");
    expect(bc?.powerScore.score).toBeLessThanOrEqual(15);
  });

  it("enforces that Channel reflects its empirical Untapped score of 18 and Tier B in Candyshop", async () => {
    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;
    const channel = catalog.getCardByName("Channel");
    expect(channel, "Channel must exist in catalog").toBeDefined();
    if (!channel) return;

    expect(channel.powerScore.score).toBe(18);
    expect(channel.powerScore.source).toBe("untapped");

    const nicoAnalysis = channel.cubeAnalyses.nico_candyshop;
    expect(nicoAnalysis).toBeDefined();
    expect(nicoAnalysis?.tier).toBe("B");
    expect(nicoAnalysis?.fit).toBe("support");
  });

  it("enforces that all top non-land cards with score >= 45 in Nico's Candyshop are Tier S", async () => {
    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;
    const nicoCards = catalog.getCardsInCube("nico_candyshop");
    const demotedTopCards: { name: string; score: number; tier: string }[] = [];

    for (const card of nicoCards) {
      if (card.isLand) continue;
      const score = card.powerScore.score;
      const tier = card.cubeAnalyses.nico_candyshop?.tier;
      if (score >= 45 && tier !== "S") {
        demotedTopCards.push({ name: card.name, score, tier: tier ?? "undefined" });
      }
    }

    expect(
      demotedTopCards,
      `Cards with score >= 45 should be Tier S in Candyshop: ${JSON.stringify(demotedTopCards)}`,
    ).toHaveLength(0);
  });

  it("ensures utility and lower-power cards in Candyshop are categorized below Tier S", async () => {
    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;

    const testCases: UtilityCardTestCase[] = [
      { name: "Stoneforge Mystic", maxScore: 30, expectedTier: "A" },
      { name: "Mishra's Bauble", maxScore: 25, expectedTier: "B" },
      { name: "Mana Confluence", maxScore: 25, expectedTier: "B" },
      { name: "Fabled Passage", maxScore: 20, expectedTier: "C" },
      { name: "Retrofitter Foundry", maxScore: 25, expectedTier: "B" },
      { name: "Urza's Bauble", maxScore: 20, expectedTier: "C" },
    ];

    for (const tc of testCases) {
      const card = catalog.getCardByName(tc.name);
      expect(card, `Card ${tc.name} should exist`).toBeDefined();
      if (!card) continue;

      expect(card.powerScore.score).toBeLessThan(tc.maxScore);
      const tier = card.cubeAnalyses.nico_candyshop?.tier;
      expect(tier).not.toBe("S");
      expect(tier).toBe(tc.expectedTier);
    }
  });

  it("verifies compiled nico_candyshop cube.json cardIndex has 0 cards in Tier S with score < 38", async () => {
    const cubePath = resolve(rootDir, "data/cubes/nico_candyshop/cube.json");
    const cubeData = JSON.parse(readFileSync(cubePath, "utf8")) as CubeDocument;

    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;
    const tierSCards = cubeData.cardIndex.filter((c) => c.tier === "S");
    expect(tierSCards.length).toBeGreaterThan(50);

    const violatingCards: CubeCardIndexItem[] = [];
    for (const c of tierSCards) {
      const masterCard = catalog.getCardByOracleId(c.oracleId);
      if (masterCard && masterCard.powerScore.score < 38) {
        violatingCards.push(c);
      }
    }

    expect(
      violatingCards,
      `Compiled cube.json must have 0 Tier S cards with score < 38`,
    ).toHaveLength(0);
  });

  it("enforces that no card in master-cards.json has cubecobra_elo as powerScore.source", async () => {
    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;
    const eloCards = Object.values(catalog.catalog.cards).filter(
      (c) => (c.powerScore.source as string) === "cubecobra_elo",
    );
    expect(eloCards).toHaveLength(0);
  });

  it("enforces that no file in data/cards/items contains (ELO or cubecobra_elo", () => {
    const itemsDir = resolve(rootDir, "data/cards/items");
    const itemFiles = readdirSync(itemsDir).filter((f) => f.endsWith(".json"));
    const filesWithElo: string[] = [];

    for (const file of itemFiles) {
      const content = readFileSync(resolve(itemsDir, file), "utf8");
      if (content.includes("(ELO") || content.includes("cubecobra_elo")) {
        filesWithElo.push(file);
      }
    }

    expect(
      filesWithElo,
      `Expected 0 files with (ELO or cubecobra_elo, found: ${filesWithElo.join(", ")}`,
    ).toHaveLength(0);
  });

  it("verifies all compiled cubes in data/cubes have 0 cards in Tier S with score < 38", async () => {
    const catalogResult = await CardCatalog.fromFile(masterPath);
    expect(catalogResult.ok).toBe(true);
    if (!catalogResult.ok) return;

    const catalog = catalogResult.value;
    const highPowerCubes = [
      "nico_candyshop",
      "cedric_cube",
      "titou_tribal",
      "titou_arena_peasant_plus",
    ];

    for (const cubeKey of highPowerCubes) {
      const cubePath = resolve(rootDir, `data/cubes/${cubeKey}/cube.json`);
      const cubeData = JSON.parse(readFileSync(cubePath, "utf8")) as CubeDocument;

      for (const card of cubeData.cardIndex) {
        if (card.tier === "S") {
          const masterCard =
            catalog.getCardByOracleId(card.oracleId) ?? catalog.getCardByName(card.name);
          const score = masterCard?.powerScore.score;
          expect(
            score,
            `Card ${card.name} in cube ${cubeKey} is Tier S but has powerScore ${String(score)} < 38`,
          ).toBeGreaterThanOrEqual(38);
        }
      }
    }
  });

  describe("scoreToPowerTier threshold mapping", () => {
    it("maps scores to correct tiers according to the domain threshold specification", () => {
      expect(scoreToPowerTier(55)).toBe("S");
      expect(scoreToPowerTier(45)).toBe("S");
      expect(scoreToPowerTier(38)).toBe("S");
      expect(scoreToPowerTier(37.9)).toBe("A");
      expect(scoreToPowerTier(26)).toBe("A");
      expect(scoreToPowerTier(25.9)).toBe("B");
      expect(scoreToPowerTier(17)).toBe("B");
      expect(scoreToPowerTier(16.9)).toBe("C");
      expect(scoreToPowerTier(10)).toBe("C");
      expect(scoreToPowerTier(9.9)).toBe("D");
      expect(scoreToPowerTier(1)).toBe("D");
      expect(scoreToPowerTier(undefined)).toBe("D");
    });

    it("prevents any card with score < 38 from ever being classified as Tier S", () => {
      const lowScores = [37.9, 35, 28, 20, 18, 15, 7.1, 5.7, 1];
      for (const score of lowScores) {
        expect(scoreToPowerTier(score)).not.toBe("S");
      }
    });
  });
});
