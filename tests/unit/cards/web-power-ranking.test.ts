import { describe, expect, it } from "vitest";
import {
  computePowerRankings,
  computeCubeTierThresholds,
  scoreToRelativeTierWithThresholds,
  toPowerBarPercentage,
} from "../../../src/web/power-ranking.js";

describe("cube explorer power ranking", () => {
  it("ranks cards from their absolute power score, independent of cube tiers and modifiers", () => {
    const rankings = computePowerRankings([
      {
        oracleId: "ancient-tomb",
        name: "Ancient Tomb",
        powerScore: { score: 31 },
        cubeAnalyses: { nico: { tier: "S", scoreModifier: 15 } },
      },
      {
        oracleId: "elite-card",
        name: "Elite Card",
        powerScore: { score: 50 },
        cubeAnalyses: { nico: { tier: "B", scoreModifier: 0 } },
      },
    ]);

    expect(rankings["elite-card"]).toMatchObject({ rank: 1, score: 50 });
    expect(rankings["ancient-tomb"]).toMatchObject({ rank: 2, score: 31 });
  });

  it("renders the 1 to 55 score on a percentage-width bar", () => {
    expect(toPowerBarPercentage(55)).toBe(100);
    expect(toPowerBarPercentage(31)).toBe(56);
  });

  it("computes cube tier thresholds and maps maybeboard card scores to identical cube tiers", () => {
    const pauperCards = [
      { name: "Lightning Bolt", powerScore: { score: 42 } },
      { name: "Mana Leak", powerScore: { score: 41 } },
      { name: "Arbor Elf", powerScore: { score: 26.8 } },
      { name: "Werebear", powerScore: { score: 22.9 } },
      ...Array.from({ length: 126 }, (_, i) => ({
        name: `Card ${String(i)}`,
        powerScore: { score: 22 - i * 0.15 },
      })),
    ];

    const thresholds = computeCubeTierThresholds(pauperCards);
    expect(thresholds).toHaveLength(13);

    // Malevolent Rumble with score 42 gets A+ in pauper
    expect(scoreToRelativeTierWithThresholds(42, thresholds)).toBe("A+");
    // Troll of Khazad-dûm with score 36 gets A+ in pauper
    expect(scoreToRelativeTierWithThresholds(36, thresholds)).toBe("A+");
  });
});
