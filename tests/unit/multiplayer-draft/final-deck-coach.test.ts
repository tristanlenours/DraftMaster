import { describe, expect, it, vi } from "vitest";

import type { CardEvaluationInput } from "../../../src/domain/coaching/index.ts";
import {
  createFinalDeckCoach,
  type ExternalFinalDeckProposal,
} from "../../../src/multiplayer-draft/final-deck-coach.ts";

function makePool(): CardEvaluationInput[] {
  return [
    ...Array.from({ length: 30 }, (_, index) => ({
      id: `red-${String(index)}`,
      name: index < 2 ? "Lightning Bolt" : `Red Spell ${String(index)}`,
      colors: ["R"] as const,
      staticScore: 50 - index / 10,
      cmc: index % 3 === 0 ? 2 : 1,
      manaCost: index % 3 === 0 ? "{1}{R}" : "{R}",
      typeLine: "Instant",
      isLand: false,
      oracleText: "Deal 3 damage to any target.",
    })),
    ...Array.from({ length: 15 }, (_, index) => ({
      id: `green-${String(index)}`,
      name: `Green Spell ${String(index)}`,
      colors: ["G"] as const,
      staticScore: 20,
      cmc: 4,
      manaCost: "{3}{G}",
      typeLine: "Creature",
      isLand: false,
    })),
  ];
}

function validExternalProposal(): ExternalFinalDeckProposal {
  return {
    maindeckCardInstanceIds: Array.from({ length: 24 }, (_, index) => `red-${String(index)}`),
    basicLands: { Plains: 0, Island: 0, Swamp: 0, Mountain: 16, Forest: 0 },
    strategy: "Mettre la pression des le premier tour puis finir au burn.",
    primaryColors: ["R"],
    splashColors: [],
    includedReasons: [
      {
        cardInstanceIds: ["red-0", "red-1"],
        reason: "Deux exemplaires de Bolt finissent les courses.",
      },
      { cardInstanceIds: ["red-2"], reason: "Cette menace maintient la pression." },
    ],
    excludedReasons: [
      { cardInstanceIds: ["green-0"], reason: "Le splash vert fragiliserait la mana." },
      { cardInstanceIds: ["green-1"], reason: "La courbe a quatre est deja pleine." },
    ],
    manaRationale: "Seize montagnes suffisent a cette courbe tres basse monocolore.",
    landCountRationale: "La courbe culmine principalement a deux manas.",
  };
}

describe("FinalDeckCoach", () => {
  it("valide une recommandation externe de 40 cartes et recalcule ses cinq axes localement", async () => {
    const generateJson = vi.fn().mockResolvedValue({
      success: true,
      content: validExternalProposal(),
      provider: "Gemini Flash",
      model: "gemini-test",
    });
    const coach = createFinalDeckCoach({ generateJson });

    const recommendation = await coach.recommend({
      cubeKey: "titou_tribal",
      snapshotId: "titou_tribal@test",
      pool: makePool(),
    });

    expect(recommendation.source).toBe("external");
    expect(recommendation.promptVersion).toBe("final-deck-coach@1");
    expect(recommendation.provider).toBe("Gemini Flash");
    expect(recommendation.maindeckCardInstanceIds).toHaveLength(24);
    expect(recommendation.sideboardCardInstanceIds).toHaveLength(21);
    expect(recommendation.totalCardCount).toBe(40);
    expect(recommendation.landCount).toBe(16);
    expect(Object.values(recommendation.evaluation.radar).every(Number.isFinite)).toBe(true);
  });

  it("rejette une carte fabriquee et rend le meme repli local legal", async () => {
    const invalid = validExternalProposal();
    const generateJson = vi.fn().mockResolvedValue({
      success: true,
      content: {
        ...invalid,
        maindeckCardInstanceIds: [...invalid.maindeckCardInstanceIds.slice(0, 23), "invented"],
      },
      provider: "DeepSeek",
      model: "deepseek-test",
    });
    const coach = createFinalDeckCoach({ generateJson });
    const request = {
      cubeKey: "titou_tribal",
      snapshotId: "titou_tribal@test",
      pool: makePool(),
    } as const;

    const invalidExternal = await coach.recommend(request);
    const unavailable = await createFinalDeckCoach().recommend(request);

    expect(invalidExternal.source).toBe("fallback");
    expect(invalidExternal.fallbackReason).toBe("INVALID_EXTERNAL_RECOMMENDATION");
    expect(invalidExternal.maindeckCardInstanceIds).not.toContain("invented");
    expect(invalidExternal.maindeckCardInstanceIds).toEqual(unavailable.maindeckCardInstanceIds);
    expect(invalidExternal.basicLands).toEqual(unavailable.basicLands);
    expect(invalidExternal.totalCardCount).toBe(40);
  });
});
