import { describe, expect, it } from "vitest";
import { computePowerRankings, toPowerBarPercentage } from "../../../src/web/power-ranking.js";

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

  it("renders the 1 to 53 score on a percentage-width bar", () => {
    expect(toPowerBarPercentage(53)).toBe(100);
    expect(toPowerBarPercentage(31)).toBe(58);
  });
});
