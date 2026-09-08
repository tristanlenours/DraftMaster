import { describe, expect, it } from "vitest";
import {
  computeCommitment,
  evaluateCard,
  evaluatePack,
  type CardEvaluationInput,
  type PackEvaluationContext,
} from "../../../src/domain/coaching/index.ts";

describe("Dynamic Scoring Engine", () => {
  const ocelotPride: CardEvaluationInput = {
    id: "90887",
    name: "Ocelot Pride",
    staticScore: 48,
    colors: ["W"],
    cmc: 1,
  };

  const nobleHierarch: CardEvaluationInput = {
    id: "47035",
    name: "Noble Hierarch",
    staticScore: 42,
    colors: ["G"],
    cmc: 1,
  };

  const floodfarmVerge: CardEvaluationInput = {
    id: "92359",
    name: "Floodfarm Verge",
    staticScore: 42,
    colors: ["W", "U"],
    isLand: true,
    producesColors: ["W", "U"],
  };

  const moxOpal: CardEvaluationInput = {
    id: "colorless-card",
    name: "Mox Opal",
    staticScore: 45,
    colors: [],
    cmc: 0,
  };

  const priorPoolEsper: readonly CardEvaluationInput[] = [
    { id: "1", name: "Mana Drain", staticScore: 46, colors: ["U"], cmc: 2 },
    { id: "2", name: "Teferi, Hero of Dominaria", staticScore: 45, colors: ["W", "U"], cmc: 5 },
    { id: "3", name: "Reanimate", staticScore: 45, colors: ["B"], cmc: 1 },
  ];

  it("at P1P1, dynamic score strictly equals static score with zero penalty", () => {
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 1,
      offeredCards: [ocelotPride, nobleHierarch, floodfarmVerge, moxOpal],
      priorPool: [],
    };

    const results = evaluatePack(context);
    expect(results[0]?.explanation).toContain("Meilleure carte du booster");

    for (const card of results) {
      expect(card.dynamicScore).toBe(card.staticScore);
      expect(card.delta).toBe(0);
      expect(card.breakdown.colorPenalty).toBe(0);
      expect(card.explanation.length).toBeGreaterThan(0);
    }
  });

  it("commitment increases monotonically from P1P1 to P3P15", () => {
    let prevCommitment = -1;
    for (let p = 1; p <= 3; p++) {
      for (let pk = 1; pk <= 15; pk++) {
        const c = computeCommitment(p, pk);
        expect(c).toBeGreaterThanOrEqual(prevCommitment);
        expect(c).toBeLessThanOrEqual(0.95);
        prevCommitment = c;
      }
    }
    expect(computeCommitment(1, 1)).toBe(0);
    expect(computeCommitment(3, 15)).toBe(0.95);
  });

  it("penalizes off-color cards progressively as draft advances", () => {
    const contextP1P5: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 5,
      offeredCards: [nobleHierarch],
      priorPool: priorPoolEsper,
    };
    const resP1P5 = evaluateCard(nobleHierarch, contextP1P5);

    const contextP3P5: PackEvaluationContext = {
      packNumber: 3,
      pickNumber: 5,
      offeredCards: [nobleHierarch],
      priorPool: priorPoolEsper,
    };
    const resP3P5 = evaluateCard(nobleHierarch, contextP3P5);

    // Green is completely off-color in WU/B
    expect(resP1P5.dynamicScore).toBeLessThan(nobleHierarch.staticScore);
    expect(resP3P5.dynamicScore).toBeLessThan(resP1P5.dynamicScore);
    expect(resP1P5.breakdown.colorPenalty).toBeGreaterThan(10);
  });

  it("grants mana fixing bonus to on-color dual lands", () => {
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 5,
      offeredCards: [floodfarmVerge],
      priorPool: priorPoolEsper,
    };

    const evaluated = evaluateCard(floodfarmVerge, context);
    expect(evaluated.breakdown.manaFixingBonus).toBeGreaterThan(0);
    expect(evaluated.dynamicScore).toBeGreaterThan(35);
  });

  it("caps contextual bonuses at Black Lotus' maximum power score", () => {
    const blackLotusCeilingFixer: CardEvaluationInput = {
      ...floodfarmVerge,
      id: "black-lotus-ceiling-fixer",
      name: "Black Lotus Ceiling Fixer",
      staticScore: 53,
    };
    const context: PackEvaluationContext = {
      packNumber: 2,
      pickNumber: 2,
      offeredCards: [blackLotusCeilingFixer],
      priorPool: [
        { id: "w1", name: "White 1", staticScore: 30, colors: ["W"], cmc: 2 },
        { id: "w2", name: "White 2", staticScore: 30, colors: ["W"], cmc: 2 },
        { id: "w3", name: "White 3", staticScore: 30, colors: ["W"], cmc: 2 },
        { id: "u1", name: "Blue 1", staticScore: 30, colors: ["U"], cmc: 2 },
        { id: "u2", name: "Blue 2", staticScore: 30, colors: ["U"], cmc: 2 },
        { id: "u3", name: "Blue 3", staticScore: 30, colors: ["U"], cmc: 2 },
      ],
    };

    const evaluated = evaluateCard(blackLotusCeilingFixer, context);
    expect(evaluated.breakdown.manaFixingBonus).toBeGreaterThan(0);
    expect(evaluated.dynamicScore).toBe(53);
  });

  it("preserves full value for colorless cards", () => {
    const context: PackEvaluationContext = {
      packNumber: 2,
      pickNumber: 5,
      offeredCards: [moxOpal],
      priorPool: priorPoolEsper,
    };

    const evaluated = evaluateCard(moxOpal, context);
    expect(evaluated.breakdown.colorPenalty).toBe(0);
    expect(evaluated.breakdown.colorAffinityFactor).toBe(1.0);
  });

  it("ranks the photo pack realistically (Ocelot Pride & Floodfarm Verge at the top)", () => {
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 5,
      offeredCards: [ocelotPride, nobleHierarch, floodfarmVerge],
      priorPool: priorPoolEsper,
    };

    const evaluated = evaluatePack(context);
    expect(evaluated[0]?.id).toBe(ocelotPride.id); // Ocelot Pride #1
    expect(evaluated[1]?.id).toBe(floodfarmVerge.id); // Floodfarm Verge #2
    expect(evaluated[2]?.id).toBe(nobleHierarch.id); // Noble Hierarch dropped to #3
    expect(evaluated[2]?.explanation).toContain("Attention piège");
  });

  it("penalizes an off-color fetchland when its target basics do not match pool colors", () => {
    const mistyRainforest: CardEvaluationInput = {
      id: "77058",
      name: "Misty Rainforest",
      staticScore: 45,
      colors: [],
      isLand: true,
      oracleText:
        "{oT}, Pay 1 life, Sacrifice CARDNAME: Search your library for a Forest or Island card, put it onto the battlefield, then shuffle.",
    };

    const priorPoolBoros: readonly CardEvaluationInput[] = [
      { id: "1", name: "Fear of Missing Out", staticScore: 42, colors: ["R"], cmc: 2 },
      { id: "2", name: "Elite Spellbinder", staticScore: 40, colors: ["W"], cmc: 3 },
    ];

    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 3,
      offeredCards: [mistyRainforest],
      priorPool: priorPoolBoros,
    };

    const evaluated = evaluateCard(mistyRainforest, context);
    // Misty fetches Forest or Island, neither is in Boros (RW)
    expect(evaluated.breakdown.colorPenalty).toBeGreaterThan(0);
    expect(evaluated.breakdown.manaFixingBonus).toBe(0);
    expect(evaluated.dynamicScore).toBeLessThan(mistyRainforest.staticScore);
  });

  it("recognizes hybrid mana flexibility for Boros card in mono-Red or Boros pool", () => {
    const figureOfDestiny: CardEvaluationInput = {
      id: "30238",
      name: "Figure of Destiny",
      staticScore: 30,
      colors: ["W", "R"],
      manaCost: "o(R/W)",
      cmc: 1,
    };

    const priorPoolRed: readonly CardEvaluationInput[] = [
      { id: "1", name: "Fear of Missing Out", staticScore: 42, colors: ["R"], cmc: 2 },
    ];

    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards: [figureOfDestiny],
      priorPool: priorPoolRed,
    };

    const evaluated = evaluateCard(figureOfDestiny, context);
    // Hybrid (R/W) fits mono-Red without off-color penalty
    expect(evaluated.breakdown.colorPenalty).toBe(0);
    expect(evaluated.breakdown.colorAffinityFactor).toBe(1.0);
  });

  it("evaluates a full 15-card pack in less than 1 ms on average (SC-002)", () => {
    const pack: CardEvaluationInput[] = [
      { id: "1", name: "Card 1", staticScore: 40, colors: ["W"], cmc: 2 },
      { id: "2", name: "Card 2", staticScore: 35, colors: ["U"], cmc: 3 },
      { id: "3", name: "Card 3", staticScore: 38, colors: ["B"], cmc: 1 },
      { id: "4", name: "Card 4", staticScore: 32, colors: ["R"], cmc: 4 },
      { id: "5", name: "Card 5", staticScore: 42, colors: ["G"], cmc: 2 },
      { id: "6", name: "Card 6", staticScore: 45, colors: ["W", "U"], cmc: 5 },
      { id: "7", name: "Card 7", staticScore: 30, colors: ["B", "R"], cmc: 3 },
      { id: "8", name: "Card 8", staticScore: 28, colors: ["G", "W"], cmc: 2 },
      { id: "9", name: "Card 9", staticScore: 50, colors: [], cmc: 0 },
      { id: "10", name: "Card 10", staticScore: 25, colors: ["U", "B"], cmc: 3 },
      { id: "11", name: "Card 11", staticScore: 33, colors: ["R", "G"], cmc: 4 },
      { id: "12", name: "Card 12", staticScore: 20, colors: ["W"], cmc: 1 },
      { id: "13", name: "Card 13", staticScore: 18, colors: ["B"], cmc: 6 },
      {
        id: "14",
        name: "Card 14",
        staticScore: 36,
        colors: [],
        cmc: 0,
        isLand: true,
        producesColors: ["W", "U"],
      },
      { id: "15", name: "Card 15", staticScore: 22, colors: ["G"], cmc: 3 },
    ];

    const priorPool: CardEvaluationInput[] = [
      { id: "p1", name: "Prior 1", staticScore: 40, colors: ["W"], cmc: 2 },
      { id: "p2", name: "Prior 2", staticScore: 38, colors: ["U"], cmc: 3 },
      { id: "p3", name: "Prior 3", staticScore: 35, colors: ["W", "U"], cmc: 4 },
    ];

    const context: PackEvaluationContext = {
      packNumber: 2,
      pickNumber: 3,
      offeredCards: pack,
      priorPool,
    };

    // Warm-up
    for (let i = 0; i < 50; i++) {
      evaluatePack(context);
    }

    const iterations = 500;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      evaluatePack(context);
    }
    const duration = performance.now() - start;
    const avgMs = duration / iterations;

    expect(avgMs).toBeLessThan(1.0);
  });
});
