import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { CubeMetaRegistry } from "../../../src/cubes/cube-meta.ts";

const rootDir = process.cwd();

describe("Cube Fundamental Turn & Technical Characteristics", () => {
  it("validates Nico's Candyshop meta with Turn 2 Fundamental Clock", async () => {
    const filePath = resolve(rootDir, "data/cubes/nico_candyshop/cube-meta.json");
    const result = await CubeMetaRegistry.fromFile(filePath);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const { meta } = result.value;
      expect(meta.powerTier).toBe("powered_vintage");
      expect(meta.pacing).toBe("blistering_fast");
      expect(meta.fundamentalTurn).toBeDefined();
      expect(meta.fundamentalTurn?.targetTurn).toBe(2.0);
      expect(meta.fundamentalTurn?.criticalWindow).toBe("T1-T3");
      expect(meta.fundamentalTurn?.deckExpectation).toContain("T1/T2");
      expect(meta.technicalAxes).toBeDefined();
      expect(meta.technicalAxes?.speedIndex).toBeGreaterThanOrEqual(9.0);
      expect(meta.technicalAxes?.fixingQuality).toBe("fast_fetches_duals");
    }
  });

  it("validates Hugues' Pauper Cube meta with Turn 4-5 Fundamental Clock", async () => {
    const filePath = resolve(rootDir, "data/cubes/hugues_pauper/cube-meta.json");
    const result = await CubeMetaRegistry.fromFile(filePath);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const { meta } = result.value;
      expect(meta.powerTier).toBe("pauper");
      expect(meta.pacing).toBe("midrange_attrition");
      expect(meta.fundamentalTurn).toBeDefined();
      expect(meta.fundamentalTurn?.targetTurn).toBe(4.5);
      expect(meta.fundamentalTurn?.criticalWindow).toBe("T4-T5");
      expect(meta.fundamentalTurn?.deckExpectation).toContain("2-pour-1");
      expect(meta.technicalAxes).toBeDefined();
      expect(meta.technicalAxes?.speedIndex).toBeLessThanOrEqual(5.0);
      expect(meta.technicalAxes?.fixingQuality).toBe("bouncelands_taplands");
    }
  });

  it("validates Titou's Tribal Cube meta with Turn 4 Fundamental Clock", async () => {
    const filePath = resolve(rootDir, "data/cubes/titou_tribal/cube-meta.json");
    const result = await CubeMetaRegistry.fromFile(filePath);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const { meta } = result.value;
      expect(meta.powerTier).toBe("synergy_unpowered");
      expect(meta.fundamentalTurn).toBeDefined();
      expect(meta.fundamentalTurn?.targetTurn).toBe(4.0);
      expect(meta.fundamentalTurn?.criticalWindow).toBe("T3-T5");
    }
  });
});
