import { describe, expect, it } from "vitest";
import { assignRelativeTiers, getUniversalScore } from "../../../src/cards/relative-tier-engine.ts";
import { RELATIVE_TIERS } from "../../../src/cards/types.ts";

describe("Relative Tier Engine (13 Quantiles)", () => {
  it("divides 730 cards evenly into 13 quantiles of 56 or 57 cards", () => {
    const fakeCards = Array.from({ length: 730 }, (_, i) => ({
      name: `Card ${String(i).padStart(3, "0")}`,
      powerScore: { score: 55 - (i / 730) * 50 },
    }));

    const result = assignRelativeTiers(fakeCards);
    expect(result).toHaveLength(730);

    // Group by tier
    const countByTier = new Map<string, number>();
    for (const item of result) {
      countByTier.set(item.tier, (countByTier.get(item.tier) ?? 0) + 1);
    }

    // Every of the 13 tiers must have between 56 and 57 cards
    for (const tier of RELATIVE_TIERS) {
      const count = countByTier.get(tier) ?? 0;
      expect(count).toBeGreaterThanOrEqual(56);
      expect(count).toBeLessThanOrEqual(57);
    }

    // Highest score is A+, lowest is F
    expect(result[0]?.tier).toBe("A+");
    expect(result[0]?.rank).toBe(1);
    expect(result[729]?.tier).toBe("F");
    expect(result[729]?.rank).toBe(730);
  });

  it("assigns metaRole and metaBonus correctly according to archetype definitions", () => {
    const cards = [
      { name: "Underworld Breach", oracleId: "id-breach", powerScore: { score: 45 } },
      { name: "Brain Freeze", oracleId: "id-freeze", powerScore: { score: 35 } },
      { name: "Yawgmoth's Will", oracleId: "id-will", powerScore: { score: 20 } },
      { name: "Island", oracleId: "id-island", powerScore: { score: 10 } },
    ];

    const cubeMeta = {
      archetypes: [
        {
          keyCards: ["id-breach"],
          supportCards: ["id-freeze"],
          trapCards: ["id-will"],
        },
      ],
    };

    const result = assignRelativeTiers(cards, cubeMeta, {
      keyCardBonus: 10,
      supportCardBonus: 5,
      trapCardPenalty: -6,
    });

    const breach = result.find((r) => r.card.name === "Underworld Breach");
    const freeze = result.find((r) => r.card.name === "Brain Freeze");
    const will = result.find((r) => r.card.name === "Yawgmoth's Will");
    const island = result.find((r) => r.card.name === "Island");

    expect(breach?.metaRole).toBe("key");
    expect(breach?.metaBonus).toBe(10);
    expect(breach?.scoreModifier).toBe(10);

    expect(freeze?.metaRole).toBe("support");
    expect(freeze?.metaBonus).toBe(5);

    expect(will?.metaRole).toBe("trap");
    expect(will?.metaBonus).toBe(-6);

    expect(island?.metaRole).toBe("neutral");
    expect(island?.metaBonus).toBe(0);
  });

  it("handles empty card list gracefully", () => {
    expect(assignRelativeTiers([])).toEqual([]);
  });

  it("extracts universal score from various structures", () => {
    expect(getUniversalScore({ name: "A", powerScore: { score: 42 } })).toBe(42);
    expect(getUniversalScore({ name: "B", score: 30 })).toBe(30);
    expect(getUniversalScore({ name: "C" })).toBe(1);
  });
});
