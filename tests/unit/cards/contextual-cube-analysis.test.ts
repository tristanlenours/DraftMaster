import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { CardCatalog } from "../../../src/cards/card-catalog.ts";

const rootDir = process.cwd();

describe("Contextual Cube Card Analysis", () => {
  it("exhibits contextual tier and role polarity between Hugues and Nico cubes", async () => {
    const filePath = resolve(rootDir, "data/cards/master-cards.json");
    const result = await CardCatalog.fromFile(filePath);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const catalog = result.value;

      // 1. Lightning Bolt: S-Tier removal in Pauper vs B- role-player in Powered Vintage
      const bolt = catalog.getCardByName("Lightning Bolt");
      expect(bolt).toBeDefined();
      if (!bolt) throw new Error("Lightning Bolt missing");
      expect(bolt.presentInCubes).toContain("hugues_pauper");
      expect(bolt.presentInCubes).toContain("nico_candyshop");

      const boltPauper = bolt.cubeAnalyses.hugues_pauper;
      const boltNico = bolt.cubeAnalyses.nico_candyshop;
      expect(boltPauper?.tier).toBe("S");
      expect(boltPauper?.fit).toBe("staple");
      expect(boltPauper?.scoreModifier).toBeGreaterThan(5);

      expect(boltNico?.tier).toBe("B");
      expect(boltNico?.fit).toBe("support");

      // 2. Mulldrifter: S-Tier bomb build-around in Pauper vs C-Tier filler in Powered Vintage
      const mulldrifter = catalog.getCardByName("Mulldrifter");
      expect(mulldrifter).toBeDefined();
      if (!mulldrifter) throw new Error("Mulldrifter missing");
      expect(mulldrifter.presentInCubes).toContain("hugues_pauper");
      expect(mulldrifter.presentInCubes).toContain("nico_candyshop");

      const driftPauper = mulldrifter.cubeAnalyses.hugues_pauper;
      const driftNico = mulldrifter.cubeAnalyses.nico_candyshop;
      expect(driftPauper?.tier).toBe("S");
      expect(driftPauper?.fit).toBe("build_around");
      expect(driftPauper?.scoreModifier).toBeGreaterThan(10);

      expect(driftNico?.tier).toBe("C");
      expect(driftNico?.fit).toBe("filler");
      expect(driftNico?.scoreModifier).toBeLessThan(-10);

      // 3. Counterspell: S-tier unconditional staple in Pauper vs B support in Vintage
      const counterspell = catalog.getCardByName("Counterspell");
      expect(counterspell).toBeDefined();
      if (!counterspell) throw new Error("Counterspell missing");
      expect(counterspell.cubeAnalyses.hugues_pauper?.tier).toBe("S");
      expect(counterspell.cubeAnalyses.nico_candyshop?.tier).toBe("B");

      // 4. Nico Signatures: Black Lotus and Underworld Breach are S in Nico Candyshop
      const lotus = catalog.getCardByName("Black Lotus");
      expect(lotus).toBeDefined();
      if (!lotus) throw new Error("Black Lotus missing");
      expect(lotus.presentInCubes).toContain("nico_candyshop");
      expect(lotus.cubeAnalyses.nico_candyshop?.tier).toBe("S");

      // 5. Hugues Signatures: Ninja of the Deep Hours in Hugues Pauper
      const ninja = catalog.getCardByName("Ninja of the Deep Hours");
      expect(ninja).toBeDefined();
      if (!ninja) throw new Error("Ninja missing");
      expect(ninja.presentInCubes).toContain("hugues_pauper");
      expect(ninja.cubeAnalyses.hugues_pauper?.tier).toBe("S");
    }
  });
});
