import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { CubeRegistry, validateCubeDocumentJson } from "../../../src/cubes/cube-registry.ts";

const rootDir = process.cwd();

describe("Unified Cube Document Validation", () => {
  it("loads and validates all 3 community cubes via CubeRegistry", async () => {
    const cubesBaseDir = resolve(rootDir, "data/cubes");
    const result = await CubeRegistry.loadAllCubes(cubesBaseDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const registry = result.value;
      expect(registry.size).toBe(4);

      // 1. Nico Vintage Candyshop
      const nico = registry.getCube("nico_candyshop");
      expect(nico).toBeDefined();
      if (!nico) throw new Error("Nico cube missing");
      expect(nico.powerTier).toBe("powered_vintage");
      expect(nico.pacing).toBe("blistering_fast");
      expect(nico.fundamentalTurn.targetTurn).toBe(2.0);
      expect(nico.fundamentalTurn.criticalWindow).toBe("T1-T3");
      expect(nico.technicalAxes.speedIndex).toBe(9.8);
      expect(nico.philosophy).toContain("Vintage Candyshop");
      expect(nico.archetypes.length).toBeGreaterThan(0);
      expect(nico.cardIndex?.length).toBeGreaterThan(0);

      // 2. Huge Pauper Cube
      const hugues = registry.getCube("hugues_pauper");
      expect(hugues).toBeDefined();
      if (!hugues) throw new Error("Hugues cube missing");
      expect(hugues.powerTier).toBe("pauper");
      expect(hugues.pacing).toBe("midrange_attrition");
      expect(hugues.fundamentalTurn.targetTurn).toBe(4.5);
      expect(hugues.fundamentalTurn.criticalWindow).toBe("T4-T5");
      expect(hugues.technicalAxes.speedIndex).toBe(4.5);
      expect(hugues.philosophy).toContain("Pauper Cube");
      expect(hugues.archetypes.length).toBeGreaterThan(0);
      expect(hugues.cardIndex?.length).toBeGreaterThan(0);

      // 3. Titou Tribal Cube
      const titou = registry.getCube("titou_tribal");
      expect(titou).toBeDefined();
      if (!titou) throw new Error("Titou cube missing");
      expect(titou.powerTier).toBe("synergy_unpowered");
      expect(titou.fundamentalTurn.targetTurn).toBe(4.0);
      expect(titou.fundamentalTurn.criticalWindow).toBe("T3-T5");
      expect(titou.technicalAxes.speedIndex).toBe(5.8);
      expect(titou.philosophy).toContain("Tribal & Chromatique");
      expect(titou.archetypes.length).toBeGreaterThan(0);
      expect(titou.cardIndex?.length).toBeGreaterThanOrEqual(500);

      // 4. Cedric High-Power Cube
      const cedric = registry.getCube("cedric_cube");
      expect(cedric).toBeDefined();
      if (!cedric) throw new Error("Cedric cube missing");
      expect(cedric.powerTier).toBe("vintage_unpowered");
      expect(cedric.fundamentalTurn.targetTurn).toBe(3.5);
      expect(cedric.fundamentalTurn.criticalWindow).toBe("T3-T4");
      expect(cedric.technicalAxes.speedIndex).toBe(7.8);
      expect(cedric.philosophy).toContain("Strobinellus");
      expect(cedric.archetypes.length).toBeGreaterThanOrEqual(10);
      expect(cedric.cardIndex?.length).toBe(720);
    }
  });

  it("rejects invalid cube JSON missing required fields", () => {
    const invalidJson = JSON.stringify({
      schemaVersion: 1,
      cubeKey: "incomplete_cube",
      // missing fundamentalTurn, technicalAxes, philosophy, etc.
    });

    const result = validateCubeDocumentJson(invalidJson);
    expect(result.ok).toBe(false);
  });
});
