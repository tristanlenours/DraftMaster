import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { CardCatalog, validateMasterCatalogJson } from "../../../src/cards/card-catalog.ts";
import {
  createUntappedScore,
  createCubeCobraScore,
  harmonize17LandsGihWr,
  harmonizeFallbackHeuristic,
} from "../../../src/cards/power-harmonizer.ts";
import { CubeMetaRegistry, validateCubeMetaJson } from "../../../src/cubes/cube-meta.ts";
import { evaluateCard } from "../../../src/domain/coaching/dynamic-score.ts";
import type {
  CardEvaluationInput,
  PackEvaluationContext,
} from "../../../src/domain/coaching/types.ts";

const rootDir = process.cwd();

describe("Master Card & Cube Referential System", () => {
  describe("Power Harmonizer", () => {
    it("creates native Untapped score with 1.0 confidence and proper clamping", () => {
      const normal = createUntappedScore(38.4);
      expect(normal.score).toBe(38.4);
      expect(normal.source).toBe("untapped");
      expect(normal.harmonizationDegree).toBe("native");
      expect(normal.confidence).toBe(1.0);

      const high = createUntappedScore(60.0);
      expect(high.score).toBe(55.0);

      const low = createUntappedScore(0.5);
      expect(low.score).toBe(1.0);
    });

    it("harmonizes 17Lands GIH WR with calibrated_high degree", () => {
      // 55% WR baseline maps to 28.0 (Gold start)
      const baseline = harmonize17LandsGihWr(0.55);
      expect(baseline.score).toBe(28.0);
      expect(baseline.source).toBe("17lands_normalized");
      expect(baseline.harmonizationDegree).toBe("calibrated_high");
      expect(baseline.confidence).toBe(0.85);

      // 65% WR bomb maps to Fire tier (46.0)
      const bomb = harmonize17LandsGihWr(65.0);
      expect(bomb.score).toBe(46.0);
      expect(bomb.rawSourceScore).toBe(65.0);

      // 45% WR weak card maps to 10.0 (Bronze)
      const weak = harmonize17LandsGihWr(0.45);
      expect(weak.score).toBe(10.0);
    });

    it("records CubeCobra Elo without pretending Elo alone determines the score", () => {
      const score = createCubeCobraScore(1500, 36.4);
      expect(score.score).toBe(36.4);
      expect(score.rawSourceScore).toBe(1500);
      expect(score.source).toBe("cubecobra_elo");
      expect(score.harmonizationDegree).toBe("calibrated_medium");
      expect(score.confidence).toBe(0.6);
    });

    it("provides fallback heuristic scores with lower confidence", () => {
      const fallback = harmonizeFallbackHeuristic("gold", 1.5);
      expect(fallback.score).toBe(33.0);
      expect(fallback.source).toBe("expert_heuristic");
      expect(fallback.harmonizationDegree).toBe("fallback");
      expect(fallback.confidence).toBe(0.5);
    });
  });

  describe("Master Card Catalog Contract & Functionality", () => {
    it("loads and validates the reference master catalog", async () => {
      const filePath = resolve(rootDir, "data/cards/master-cards.json");
      const loadResult = await CardCatalog.fromFile(filePath);
      expect(loadResult.ok).toBe(true);

      if (loadResult.ok) {
        const catalog = loadResult.value;
        expect(catalog.totalCards).toBeGreaterThanOrEqual(545);

        // Check cards in Titou Tribal
        const titouCards = catalog.getCardsInCube("titou_tribal");
        expect(titouCards.length).toBeGreaterThanOrEqual(540);

        // Check cards in Nico Candyshop
        const nicoCards = catalog.getCardsInCube("nico_candyshop");
        expect(nicoCards.length).toBeGreaterThanOrEqual(5);

        // Lookup by name
        const solRing = catalog.getCardByName("Sol Ring");
        expect(solRing).toBeDefined();
        expect(solRing?.presentInCubes).not.toContain("titou_tribal");
        expect(solRing?.presentInCubes).toContain("nico_candyshop");
        expect(solRing?.powerScore.source).toBe("untapped");
        expect(solRing?.powerScore.score).toBe(51);

        const bolt = catalog.getCardByName("Lightning Bolt");
        expect(bolt).toBeDefined();
        expect(bolt?.presentInCubes).toContain("titou_tribal");
        expect(bolt?.presentInCubes).toContain("nico_candyshop");

        // Lookup archetype cards
        const angelCards = catalog.getCardsForArchetype("titou_tribal", "titou:tribal_angels");
        expect(angelCards.length).toBeGreaterThan(0);
      }
    });

    it("rejects schema violations in master catalog", () => {
      const invalidJson = JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-09-05T00:00:00Z",
        cardCount: 1,
        cards: {
          invalid_card: {
            oracleId: "not-a-uuid",
            name: "Invalid",
          },
        },
      });
      const result = validateMasterCatalogJson(invalidJson);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("SCHEMA_VALIDATION_FAILED");
      }
    });
  });

  describe("Cube Meta Registry Contract & Functionality", () => {
    it("loads and validates the Titou Tribal cube meta definition", async () => {
      const filePath = resolve(rootDir, "data/cubes/titou_tribal/cube-meta.json");
      const loadResult = await CubeMetaRegistry.fromFile(filePath);
      expect(loadResult.ok).toBe(true);

      if (loadResult.ok) {
        const registry = loadResult.value;
        expect(registry.cubeKey).toBe("titou_tribal");
        expect(registry.meta.powerTier).toBe("synergy_unpowered");
        expect(registry.meta.scoringProfile.tribalSynergyMultiplier).toBe(2.2);

        const angelsArch = registry.getArchetype("titou:tribal_angels");
        expect(angelsArch).toBeDefined();
        expect(angelsArch?.keyCards.length).toBeGreaterThan(0);
      }
    });

    it("loads and validates Nico's Candyshop cube meta definition", async () => {
      const filePath = resolve(rootDir, "data/cubes/nico_candyshop/cube-meta.json");
      const loadResult = await CubeMetaRegistry.fromFile(filePath);
      expect(loadResult.ok).toBe(true);

      if (loadResult.ok) {
        const registry = loadResult.value;
        expect(registry.cubeKey).toBe("nico_candyshop");
        expect(registry.meta.powerTier).toBe("powered_vintage");
        expect(registry.meta.scoringProfile.comboSynergyMultiplier).toBe(2.5);

        const stormArch = registry.getArchetype("nico:storm_combo");
        expect(stormArch).toBeDefined();
        expect(stormArch?.category).toBe("combo");
      }
    });

    it("rejects invalid cube meta json", () => {
      const invalid = JSON.stringify({
        schemaVersion: 1,
        cubeKey: "invalid!",
        cardCount: 50, // min is 180
      });
      const result = validateCubeMetaJson(invalid);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("SCHEMA_VALIDATION_FAILED");
      }
    });
  });

  describe("Dynamic Contextual Scoring Integration", () => {
    it("applies tribal synergy bonuses and cube modifiers in Titou Tribal", async () => {
      const catalogResult = await CardCatalog.fromFile(
        resolve(rootDir, "data/cards/master-cards.json"),
      );
      const titouMetaResult = await CubeMetaRegistry.fromFile(
        resolve(rootDir, "data/cubes/titou_tribal/cube-meta.json"),
      );
      expect(catalogResult.ok).toBe(true);
      expect(titouMetaResult.ok).toBe(true);

      if (catalogResult.ok && titouMetaResult.ok) {
        const catalog = catalogResult.value;
        const cubeMeta = titouMetaResult.value;

        const championOfTheParish = catalog.getCardByName("Champion of the Parish");
        const thaliasLieutenant = catalog.getCardByName("Thalia's Lieutenant");
        const motherOfRunes = catalog.getCardByName("Mother of Runes");

        expect(championOfTheParish).toBeDefined();
        expect(thaliasLieutenant).toBeDefined();
        expect(motherOfRunes).toBeDefined();

        if (!championOfTheParish || !thaliasLieutenant || !motherOfRunes) {
          throw new Error("Missing expected fixture cards");
        }

        // Player's pool already has 2 Humans in Pack 2 Pick 1
        const priorPool: CardEvaluationInput[] = [
          {
            id: "1",
            name: championOfTheParish.name,
            staticScore: championOfTheParish.powerScore.score,
            colors: ["W"],
            oracleId: championOfTheParish.oracleId,
          },
          {
            id: "2",
            name: motherOfRunes.name,
            staticScore: motherOfRunes.powerScore.score,
            colors: ["W"],
            oracleId: motherOfRunes.oracleId,
          },
        ];

        const cardToPick: CardEvaluationInput = {
          id: "3",
          name: thaliasLieutenant.name,
          staticScore: thaliasLieutenant.powerScore.score,
          colors: ["W"],
          oracleId: thaliasLieutenant.oracleId,
        };

        const context: PackEvaluationContext = {
          packNumber: 2,
          pickNumber: 1,
          offeredCards: [cardToPick],
          priorPool,
          cubeKey: "titou_tribal",
          catalog,
          cubeMeta,
        };

        const evaluated = evaluateCard(cardToPick, context);

        // Should receive cubeScoreModifier and synergyBonus from the prior 2 humans!
        expect(evaluated.breakdown.cubeScoreModifier).toBe(5.0);
        expect(evaluated.breakdown.synergyBonus).toBeGreaterThan(0);
        expect(evaluated.breakdown.powerSource).toBe("cubecobra_elo");
        expect(evaluated.breakdown.harmonizationConfidence).toBe(0.6);
        expect(evaluated.dynamicScore).toBeGreaterThan(cardToPick.staticScore);

        // Also test an Untapped card to verify native source and confidence 1.0
        const solRing = catalog.getCardByName("Sol Ring");
        expect(solRing).toBeDefined();
        if (!solRing) throw new Error("Missing Sol Ring");

        const offeredSol = {
          id: "sol",
          name: solRing.name,
          staticScore: solRing.powerScore.score,
          colors: [] as const,
        };
        const contextSolRing: PackEvaluationContext = {
          packNumber: 1,
          pickNumber: 1,
          offeredCards: [offeredSol],
          priorPool: [],
          cubeKey: "titou_tribal",
          catalog,
          cubeMeta,
        };
        const evalSolRing = evaluateCard(offeredSol, contextSolRing);
        expect(evalSolRing.breakdown.powerSource).toBe("untapped");
        expect(evalSolRing.breakdown.harmonizationConfidence).toBe(1.0);
      }
    });

    it("applies combo synergy bonuses and cube modifiers in Nico Candyshop", async () => {
      const catalogResult = await CardCatalog.fromFile(
        resolve(rootDir, "data/cards/master-cards.json"),
      );
      const nicoMetaResult = await CubeMetaRegistry.fromFile(
        resolve(rootDir, "data/cubes/nico_candyshop/cube-meta.json"),
      );
      expect(catalogResult.ok).toBe(true);
      expect(nicoMetaResult.ok).toBe(true);

      if (catalogResult.ok && nicoMetaResult.ok) {
        const catalog = catalogResult.value;
        const cubeMeta = nicoMetaResult.value;

        const led = catalog.getCardByName("Lion's Eye Diamond");
        const breach = catalog.getCardByName("Underworld Breach");
        const brainFreeze = catalog.getCardByName("Brain Freeze");

        expect(led).toBeDefined();
        expect(breach).toBeDefined();
        expect(brainFreeze).toBeDefined();

        if (!led || !breach || !brainFreeze) {
          throw new Error("Missing combo fixture cards");
        }

        // Player drafted LED and Underworld Breach, now sees Brain Freeze
        const priorPool: CardEvaluationInput[] = [
          {
            id: "101",
            name: led.name,
            staticScore: led.powerScore.score,
            colors: [],
            oracleId: led.oracleId,
          },
          {
            id: "102",
            name: breach.name,
            staticScore: breach.powerScore.score,
            colors: ["R"],
            oracleId: breach.oracleId,
          },
        ];

        const cardToPick: CardEvaluationInput = {
          id: "103",
          name: brainFreeze.name,
          staticScore: brainFreeze.powerScore.score,
          colors: ["U"],
          oracleId: brainFreeze.oracleId,
        };

        const context: PackEvaluationContext = {
          packNumber: 2,
          pickNumber: 1,
          offeredCards: [cardToPick],
          priorPool,
          cubeKey: "nico_candyshop",
          catalog,
          cubeMeta,
        };

        const evaluated = evaluateCard(cardToPick, context);

        expect(evaluated.breakdown.cubeScoreModifier).toBe(7.0);
        expect(evaluated.breakdown.synergyBonus).toBeGreaterThan(0);
        expect(evaluated.dynamicScore).toBeGreaterThan(cardToPick.staticScore);
      }
    });
  });
});
