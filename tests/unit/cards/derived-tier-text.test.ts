import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatScoreMention,
  isGeneratedArchetypeFitRow,
  refreshDerivedTierText,
  refreshScoreMentions,
} from "../../../src/cards/derived-tier-text.ts";
import {
  RELATIVE_TIERS,
  type CubeSpecificCardAnalysis,
  type MasterCatalogCard,
} from "../../../src/cards/types.ts";

const staleAnalysis: CubeSpecificCardAnalysis & { readonly relativeTier?: string } = {
  cubeKey: "titou_tribal",
  fit: "staple",
  tier: "A+",
  relativeTier: "A+",
  archetypes: [],
  synergyTags: ["removal"],
  scoreModifier: 0,
  analysis: "Carte de rang S (Score : 43.0) dans l'environnement tribal et interactif de Titou.",
  pedagogy: {
    howToPlay: "Menace ou ressource clé.",
    archetypeFit: [
      {
        colors: ["R"],
        archetype: "TRIBAL SYNERGY",
        grade: "S",
        winrateOrScore: "Score 43.0",
        comment: "Alignement au métagame Titou Tribal (S).",
      },
      {
        colors: ["R", "W"],
        archetype: "Boros Synth & Burn",
        grade: "S",
        winrateOrScore: "Score 43.0 (Grade F)",
        comment: "Removal premium et reach décisif.",
      },
    ],
  },
};

describe("refreshDerivedTierText", () => {
  it("rewrites the rank and the score quoted in the analysis prose", () => {
    const refreshed = refreshDerivedTierText(staleAnalysis, 42);
    expect(refreshed.analysis).toBe(
      "Carte de rang A+ (Score : 42.0) dans l'environnement tribal et interactif de Titou.",
    );
  });

  it("aligns generated archetype rows on the cube tier and the current score", () => {
    const [generated] = refreshDerivedTierText(staleAnalysis, 42).pedagogy?.archetypeFit ?? [];
    expect(generated).toEqual({
      colors: ["R"],
      archetype: "TRIBAL SYNERGY",
      grade: "A+",
      winrateOrScore: "Score 42.0",
      comment: "Alignement au métagame Titou Tribal (A+).",
    });
  });

  it("keeps the grade and comment of hand-written archetype rows, refreshing only the score", () => {
    const [, curated] = refreshDerivedTierText(staleAnalysis, 42).pedagogy?.archetypeFit ?? [];
    expect(curated?.grade).toBe("S");
    expect(curated?.comment).toBe("Removal premium et reach décisif.");
    expect(curated?.winrateOrScore).toBe("Score 42.0 (Grade F)");
  });

  it("drops the relativeTier alias and leaves the input untouched", () => {
    const refreshed = refreshDerivedTierText(staleAnalysis, 42);
    expect(refreshed).not.toHaveProperty("relativeTier");
    expect(refreshed.tier).toBe("A+");
    expect(staleAnalysis.relativeTier).toBe("A+");
    expect(staleAnalysis.analysis).toContain("rang S");
  });

  it("is idempotent", () => {
    const once = refreshDerivedTierText(staleAnalysis, 42);
    expect(refreshDerivedTierText(once, 42)).toEqual(once);
  });

  it("leaves prose without derived values and analyses without pedagogy unchanged", () => {
    const plain: CubeSpecificCardAnalysis = {
      cubeKey: "hugues_pauper",
      fit: "support",
      archetypes: [],
      synergyTags: [],
      scoreModifier: 0,
      analysis: "Détruit 95% des créatures du format pour 1 mana.",
    };
    expect(refreshDerivedTierText(plain, 17.94)).toEqual(plain);
  });
});

describe("refreshScoreMentions", () => {
  it("quotes the current score with one decimal", () => {
    expect(refreshScoreMentions("Carte commune du Pauper Cube de Hugues (Score : 17.9).", 21)).toBe(
      "Carte commune du Pauper Cube de Hugues (Score : 21.0).",
    );
    expect(formatScoreMention(28.34)).toBe("28.3");
  });
});

describe("isGeneratedArchetypeFitRow", () => {
  it("separates importer labels from hand-written archetype names", () => {
    expect(isGeneratedArchetypeFitRow({ archetype: "VINTAGE STAPLE" })).toBe(true);
    expect(isGeneratedArchetypeFitRow({ archetype: "Izzet Skred / Spells" })).toBe(false);
  });
});

describe("card items on disk", () => {
  it("quote one tier and one power score everywhere (npm run data:sync)", async () => {
    const itemsDir = resolve(process.cwd(), "data/cards/items");
    const files = (await readdir(itemsDir)).filter((file) => file.endsWith(".json"));
    const tiers: readonly string[] = RELATIVE_TIERS;
    const stale: string[] = [];

    for (const file of files) {
      const card = JSON.parse(await readFile(resolve(itemsDir, file), "utf8")) as MasterCatalogCard;
      const score = card.powerScore.score;
      if (
        refreshScoreMentions(card.objectiveAnalysis.summary, score) !==
        card.objectiveAnalysis.summary
      ) {
        stale.push(`${file}: summary`);
      }
      for (const [cubeKey, analysis] of Object.entries(card.cubeAnalyses)) {
        if (analysis.tier !== undefined && !tiers.includes(analysis.tier)) {
          stale.push(`${file}/${cubeKey}: tier ${analysis.tier} is off the A+ to F scale`);
        }
        if (JSON.stringify(refreshDerivedTierText(analysis, score)) !== JSON.stringify(analysis)) {
          stale.push(`${file}/${cubeKey}: analysis`);
        }
      }
    }

    expect(stale).toEqual([]);
  }, 15000);
});
