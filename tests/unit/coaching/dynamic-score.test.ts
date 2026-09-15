import { describe, expect, it } from "vitest";
import {
  ALL_COLORS,
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

  it("does not penalize either color opened by a freshly drafted dual land", () => {
    const overgrownTomb: CardEvaluationInput = {
      id: "overgrown-tomb",
      name: "Overgrown Tomb",
      staticScore: 42,
      colors: [],
      isLand: true,
      typeLine: "Land — Swamp Forest",
      producesColors: ["B", "G"],
    };
    const llanowarElves: CardEvaluationInput = {
      id: "llanowar-elves",
      name: "Llanowar Elves",
      staticScore: 41,
      colors: ["G"],
      cmc: 1,
      manaCost: "{G}",
    };
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards: [llanowarElves],
      priorPool: [overgrownTomb],
    };

    const evaluated = evaluatePack(context)[0];

    expect(evaluated?.breakdown.colorPenalty).toBe(0);
  });

  it("explains land-supported colors without claiming an empty mana base", () => {
    const overgrownTomb: CardEvaluationInput = {
      id: "overgrown-tomb",
      name: "Overgrown Tomb",
      staticScore: 42,
      colors: [],
      isLand: true,
      typeLine: "Land — Swamp Forest",
      producesColors: ["B", "G"],
    };
    const boneShards: CardEvaluationInput = {
      id: "bone-shards",
      name: "Bone Shards",
      staticScore: 45,
      colors: ["B"],
      cmc: 1,
      manaCost: "{B}",
    };
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards: [boneShards],
      priorPool: [overgrownTomb],
    };

    const evaluated = evaluatePack(context)[0];

    expect(evaluated?.explanation).toContain("soutenue par vos terrains (B/G)");
    expect(evaluated?.explanation).not.toContain("base ()");
  });

  it("keeps a land-supported color valid in alternative explanations", () => {
    const overgrownTomb: CardEvaluationInput = {
      id: "overgrown-tomb",
      name: "Overgrown Tomb",
      staticScore: 42,
      colors: [],
      isLand: true,
      typeLine: "Land — Swamp Forest",
      producesColors: ["B", "G"],
    };
    const boneShards: CardEvaluationInput = {
      id: "bone-shards",
      name: "Bone Shards",
      staticScore: 45,
      colors: ["B"],
      cmc: 1,
      manaCost: "{B}",
    };
    const llanowarElves: CardEvaluationInput = {
      id: "llanowar-elves",
      name: "Llanowar Elves",
      staticScore: 41,
      colors: ["G"],
      cmc: 1,
      manaCost: "{G}",
    };
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards: [boneShards, llanowarElves],
      priorPool: [overgrownTomb],
    };

    const elves = evaluatePack(context).find((card) => card.id === llanowarElves.id);

    expect(elves?.explanation).toContain("soutenue par vos terrains (B/G)");
    expect(elves?.explanation).not.toContain("hors-couleurs");
  });

  it("describes a supported but uncommitted color without calling it off-color", () => {
    const overgrownTomb: CardEvaluationInput = {
      id: "overgrown-tomb",
      name: "Overgrown Tomb",
      staticScore: 42,
      colors: [],
      isLand: true,
      typeLine: "Land — Swamp Forest",
      producesColors: ["B", "G"],
    };
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 3,
      offeredCards: [
        {
          id: "bone-shards",
          name: "Bone Shards",
          staticScore: 45,
          colors: ["B"],
          cmc: 1,
          manaCost: "{B}",
        },
        {
          id: "llanowar-elves",
          name: "Llanowar Elves",
          staticScore: 41,
          colors: ["G"],
          cmc: 1,
          manaCost: "{G}",
        },
      ],
      priorPool: [
        overgrownTomb,
        { id: "black-card", name: "Black card", staticScore: 35, colors: ["B"], cmc: 2 },
      ],
    };

    const elves = evaluatePack(context).find((card) => card.name === "Llanowar Elves");

    expect(elves?.explanation).toContain("soutenue par vos terrains (B/G)");
    expect(elves?.explanation).not.toContain("hors-couleurs");
  });

  it("describes insufficient land support without claiming the color is absent", () => {
    const priorPool: CardEvaluationInput[] = [
      {
        id: "overgrown-tomb",
        name: "Overgrown Tomb",
        staticScore: 42,
        colors: [],
        isLand: true,
        typeLine: "Land — Swamp Forest",
        producesColors: ["B", "G"],
      },
      ...Array.from({ length: 8 }, (_, index) => ({
        id: `black-card-${String(index)}`,
        name: `Black card ${String(index)}`,
        staticScore: 35,
        colors: ["B"] as const,
        cmc: 2,
        manaCost: "{1}{B}",
      })),
    ];
    const context: PackEvaluationContext = {
      packNumber: 3,
      pickNumber: 5,
      offeredCards: [
        {
          id: "black-bomb",
          name: "Black Bomb",
          staticScore: 50,
          colors: ["B"],
          cmc: 4,
          manaCost: "{2}{B}{B}",
        },
        {
          id: "llanowar-elves",
          name: "Llanowar Elves",
          staticScore: 41,
          colors: ["G"],
          cmc: 1,
          manaCost: "{G}",
        },
      ],
      priorPool,
    };

    const evaluated = evaluatePack(context).find((card) => card.name === "Llanowar Elves");

    expect(evaluated?.breakdown.colorPenalty).toBeGreaterThanOrEqual(10);
    expect(evaluated?.explanation).toContain("pas encore assez de sources");
    expect(evaluated?.explanation).not.toContain("vous n'avez pas ces couleurs");
  });

  it("describes an unsupported early color without an empty mana base", () => {
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards: [
        {
          id: "lightning-bolt",
          name: "Lightning Bolt",
          staticScore: 45,
          colors: ["R"],
          cmc: 1,
          manaCost: "{R}",
        },
      ],
      priorPool: [
        {
          id: "overgrown-tomb",
          name: "Overgrown Tomb",
          staticScore: 42,
          colors: [],
          isLand: true,
          typeLine: "Land — Swamp Forest",
          producesColors: ["B", "G"],
        },
      ],
    };

    const evaluated = evaluatePack(context)[0];

    expect(evaluated?.explanation).toContain("au-delà de vos terrains (B/G)");
    expect(evaluated?.explanation).not.toContain("base ()");
  });

  it("keeps the explanation open after a colorless first pick", () => {
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards: [
        {
          id: "bone-shards",
          name: "Bone Shards",
          staticScore: 45,
          colors: ["B"],
          cmc: 1,
          manaCost: "{B}",
        },
      ],
      priorPool: [
        { id: "sol-ring", name: "Sol Ring", staticScore: 50, colors: [], cmc: 1, manaCost: "{1}" },
      ],
    };

    const evaluated = evaluatePack(context)[0];

    expect(evaluated?.explanation).toContain("votre draft reste entièrement ouvert");
    expect(evaluated?.explanation).not.toContain("base ()");
  });

  it("infers land-supported colors from basic land types when production metadata is absent", () => {
    const overgrownTomb: CardEvaluationInput = {
      id: "overgrown-tomb",
      name: "Overgrown Tomb",
      staticScore: 42,
      colors: [],
      isLand: true,
      typeLine: "Land — Swamp Forest",
    };
    const boneShards: CardEvaluationInput = {
      id: "bone-shards",
      name: "Bone Shards",
      staticScore: 45,
      colors: ["B"],
      cmc: 1,
      manaCost: "{B}",
    };
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards: [boneShards],
      priorPool: [overgrownTomb],
    };

    const evaluated = evaluatePack(context)[0];

    expect(evaluated?.explanation).toContain("soutenue par vos terrains (B/G)");
  });

  it("keeps every color open after only a five-color land", () => {
    const manaConfluence: CardEvaluationInput = {
      id: "mana-confluence",
      name: "Mana Confluence",
      staticScore: 30,
      colors: [],
      isLand: true,
      typeLine: "Land",
      producesColors: ["W", "U", "B", "R", "G"],
    };
    const offeredCards: CardEvaluationInput[] = ALL_COLORS.map((color) => ({
      id: `one-drop-${color}`,
      name: `${color} one-drop`,
      staticScore: 40,
      colors: [color],
      cmc: 1,
      manaCost: `{${color}}`,
    }));
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards,
      priorPool: [manaConfluence],
    };

    const evaluated = evaluatePack(context);

    expect(evaluated.map((card) => card.breakdown.colorPenalty)).toEqual([0, 0, 0, 0, 0]);
    expect(evaluated[0]?.explanation).toContain("vos terrains (W/U/B/R/G)");
  });

  it("does not choose an arbitrary second color from a five-color land", () => {
    const manaConfluence: CardEvaluationInput = {
      id: "mana-confluence",
      name: "Mana Confluence",
      staticScore: 30,
      colors: [],
      isLand: true,
      typeLine: "Land",
      producesColors: ["W", "U", "B", "R", "G"],
    };
    const offeredCards: CardEvaluationInput[] = ["W", "G"].map((color, index) => ({
      id: `supported-one-drop-${String(index)}`,
      name: `${color} supported one-drop`,
      staticScore: 40,
      colors: color === "W" ? ["W"] : ["G"],
      cmc: 1,
      manaCost: `{${color}}`,
    }));
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 3,
      offeredCards,
      priorPool: [
        manaConfluence,
        { id: "black-card", name: "Black card", staticScore: 35, colors: ["B"], cmc: 2 },
      ],
    };

    const evaluated = evaluatePack(context);
    const whitePenalty = evaluated.find((card) => card.name.startsWith("W "))?.breakdown
      .colorPenalty;
    const greenPenalty = evaluated.find((card) => card.name.startsWith("G "))?.breakdown
      .colorPenalty;

    expect(whitePenalty).toBe(greenPenalty);
    expect(whitePenalty).toBeGreaterThan(0);
    expect(whitePenalty).toBeLessThan(20);
  });

  it("does not invent a second dominant color for a mono-color pool", () => {
    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 3,
      offeredCards: [
        {
          id: "white-one-drop",
          name: "White one-drop",
          staticScore: 40,
          colors: ["W"],
          cmc: 1,
          manaCost: "{W}",
        },
      ],
      priorPool: [
        { id: "black-1", name: "Black card 1", staticScore: 35, colors: ["B"], cmc: 2 },
        { id: "black-2", name: "Black card 2", staticScore: 35, colors: ["B"], cmc: 3 },
      ],
    };

    const evaluated = evaluatePack(context)[0];

    expect(evaluated?.breakdown.colorPenalty).toBeGreaterThan(0);
    expect(evaluated?.explanation).not.toContain("dans vos couleurs (B/W)");
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

  it("caps contextual bonuses at the theoretical maximum power score", () => {
    const theoreticalCeilingFixer: CardEvaluationInput = {
      ...floodfarmVerge,
      id: "theoretical-ceiling-fixer",
      name: "Theoretical Ceiling Fixer",
      staticScore: 55,
    };
    const context: PackEvaluationContext = {
      packNumber: 2,
      pickNumber: 2,
      offeredCards: [theoreticalCeilingFixer],
      priorPool: [
        { id: "w1", name: "White 1", staticScore: 30, colors: ["W"], cmc: 2 },
        { id: "w2", name: "White 2", staticScore: 30, colors: ["W"], cmc: 2 },
        { id: "w3", name: "White 3", staticScore: 30, colors: ["W"], cmc: 2 },
        { id: "u1", name: "Blue 1", staticScore: 30, colors: ["U"], cmc: 2 },
        { id: "u2", name: "Blue 2", staticScore: 30, colors: ["U"], cmc: 2 },
        { id: "u3", name: "Blue 3", staticScore: 30, colors: ["U"], cmc: 2 },
      ],
    };

    const evaluated = evaluateCard(theoreticalCeilingFixer, context);
    expect(evaluated.breakdown.manaFixingBonus).toBeGreaterThan(0);
    expect(evaluated.dynamicScore).toBe(55);
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

  it("correctly parses Scryfall standard braces syntax in parseManaCostPips", async () => {
    const { parseManaCostPips } = await import("../../../src/domain/coaching/dynamic-score.ts");

    expect(
      parseManaCostPips({
        id: "1",
        name: "Brutal Cathar",
        staticScore: 28,
        colors: ["W"],
        manaCost: "{2}{W}",
      }),
    ).toEqual([["W"]]);
    expect(
      parseManaCostPips({
        id: "2",
        name: "Finale of Devastation",
        staticScore: 22,
        colors: ["G"],
        manaCost: "{X}{G}{G}",
      }),
    ).toEqual([["G"], ["G"]]);
    expect(
      parseManaCostPips({
        id: "3",
        name: "Teferi",
        staticScore: 40,
        colors: ["W", "U"],
        manaCost: "{1}{W}{U}",
      }),
    ).toEqual([["W"], ["U"]]);
    expect(
      parseManaCostPips({
        id: "4",
        name: "Hybrid",
        staticScore: 30,
        colors: ["W", "U"],
        manaCost: "{W/U}{1}",
      }),
    ).toEqual([["W", "U"]]);
    expect(
      parseManaCostPips({
        id: "5",
        name: "Sol Ring",
        staticScore: 50,
        colors: [],
        manaCost: "{1}",
      }),
    ).toEqual([]);
  });

  it("penalizes off-color cards with Scryfall costs in calculateColorOverlap", async () => {
    const { calculateColorOverlap } = await import("../../../src/domain/coaching/dynamic-score.ts");

    const bluePoolDominant = ["U"] as const;
    const brutalCathar: CardEvaluationInput = {
      id: "bc",
      name: "Brutal Cathar",
      staticScore: 30,
      colors: ["W"],
      manaCost: "{2}{W}",
    };
    const finale: CardEvaluationInput = {
      id: "fin",
      name: "Finale of Devastation",
      staticScore: 30,
      colors: ["G"],
      manaCost: "{X}{G}{G}",
    };
    const spellseeker: CardEvaluationInput = {
      id: "ss",
      name: "Spellseeker",
      staticScore: 30,
      colors: ["U"],
      manaCost: "{2}{U}",
    };

    expect(calculateColorOverlap(brutalCathar, bluePoolDominant, 1)).toBe(0);
    expect(calculateColorOverlap(finale, bluePoolDominant, 1)).toBe(0);
    expect(calculateColorOverlap(spellseeker, bluePoolDominant, 1)).toBe(1);
  });

  it("ensures coaching explanation never describes off-color or colorless cards as in player colors", () => {
    const brutalCathar: CardEvaluationInput = {
      id: "bc",
      name: "Brutal Cathar",
      staticScore: 35,
      colors: ["W"],
      manaCost: "{2}{W}",
    };
    const finale: CardEvaluationInput = {
      id: "fin",
      name: "Finale of Devastation",
      staticScore: 32,
      colors: ["G"],
      manaCost: "{X}{G}{G}",
    };
    const spellseeker: CardEvaluationInput = {
      id: "ss",
      name: "Spellseeker",
      staticScore: 30,
      colors: ["U"],
      manaCost: "{2}{U}",
    };

    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards: [brutalCathar, finale, spellseeker],
      priorPool: [{ id: "p1", name: "Brainstorm", staticScore: 35, colors: ["U"], cmc: 1 }],
    };

    const results = evaluatePack(context);
    for (const card of results) {
      if (card.id === "bc" || card.id === "fin") {
        expect(card.explanation).not.toContain("dans vos couleurs (U)");
      }
      if (card.id === "ss") {
        expect(card.explanation).toContain("dans vos couleurs (U)");
      }
    }
  });

  it("prioritizes on-color staples over off-color 1-drops at P1P2 after picking Lightning Bolt", () => {
    const goblinLackey: CardEvaluationInput = {
      id: "lackey",
      name: "Goblin Lackey",
      staticScore: 35,
      colors: ["R"],
      cmc: 1,
      manaCost: "{R}",
    };
    const manaConfluence: CardEvaluationInput = {
      id: "confluence",
      name: "Mana Confluence",
      staticScore: 18,
      colors: [],
      cmc: 0,
      isLand: true,
      producesColors: ["W", "U", "B", "R", "G"],
    };
    const elvishMystic: CardEvaluationInput = {
      id: "mystic",
      name: "Elvish Mystic",
      staticScore: 38,
      colors: ["G"],
      cmc: 1,
      manaCost: "{G}",
    };
    const dragonmasterOutcast: CardEvaluationInput = {
      id: "outcast",
      name: "Dragonmaster Outcast",
      staticScore: 27,
      colors: ["R"],
      cmc: 1,
      manaCost: "{R}",
    };

    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 2,
      offeredCards: [elvishMystic, goblinLackey, manaConfluence, dragonmasterOutcast],
      priorPool: [{ id: "bolt", name: "Lightning Bolt", staticScore: 43, colors: ["R"], cmc: 1 }],
    };

    const results = evaluatePack(context);
    // Goblin Lackey must be recommended priority over Elvish Mystic
    expect(results[0]?.name).toBe("Goblin Lackey");
    expect(results[0]?.explanation).toContain("dans vos couleurs (R)");

    const evaluatedMystic = results.find((c) => c.name === "Elvish Mystic");
    expect(evaluatedMystic).toBeDefined();
    // Mystic should be heavily penalized as an off-color 1-drop and never recommended to splash
    expect(evaluatedMystic?.explanation).not.toContain("splash");
    expect(evaluatedMystic?.dynamicScore).toBeLessThan(results[0]?.dynamicScore ?? 0);
  });

  it("recommends Sublime Epiphany over off-color lands and neutralizes off-color dual lands for U/B drafter", () => {
    const sublimeEpiphany: CardEvaluationInput = {
      id: "sublime",
      name: "Sublime Epiphany",
      staticScore: 40,
      colors: ["U"],
      cmc: 6,
      manaCost: "{4}{U}{U}",
    };
    const windScarredCrag: CardEvaluationInput = {
      id: "crag",
      name: "Wind-Scarred Crag",
      staticScore: 23.6,
      colors: [],
      cmc: 0,
      isLand: true,
      producesColors: ["R", "W"],
    };
    const welcomingVampire: CardEvaluationInput = {
      id: "welcoming",
      name: "Welcoming Vampire",
      staticScore: 26.4,
      colors: ["W"],
      cmc: 3,
      manaCost: "{2}{W}",
    };
    const consider: CardEvaluationInput = {
      id: "consider",
      name: "Consider",
      staticScore: 15,
      colors: ["U"],
      cmc: 1,
      manaCost: "{U}",
    };

    const context: PackEvaluationContext = {
      packNumber: 1,
      pickNumber: 4,
      offeredCards: [windScarredCrag, welcomingVampire, sublimeEpiphany, consider],
      priorPool: [
        { id: "1", name: "Baleful Strix", staticScore: 35, colors: ["U", "B"], cmc: 2 },
        { id: "2", name: "Counterspell", staticScore: 35, colors: ["U"], cmc: 2 },
        { id: "3", name: "Murder", staticScore: 30, colors: ["B"], cmc: 3 },
      ],
    };

    const results = evaluatePack(context);

    // Sublime Epiphany must be Top Pick
    expect(results[0]?.name).toBe("Sublime Epiphany");
    expect(results[0]?.dynamicScore).toBeGreaterThanOrEqual(35);
    expect(results[0]?.explanation).toContain("dans vos couleurs (U/B)");

    // Wind-Scarred Crag must be bottom rank and penalized to minimum
    const cragResult = results.find((c) => c.name === "Wind-Scarred Crag");
    expect(cragResult).toBeDefined();
    expect(cragResult?.dynamicScore).toBeLessThanOrEqual(5);
    expect(cragResult?.explanation).toContain("Terrain hors de vos couleurs (U/B)");
    expect(cragResult?.explanation).not.toContain("bombe");
    expect(cragResult?.explanation).not.toContain("splash");
  });

  it("recommends Lier, Disciple of the Drowned as top pick for an Izzet Wizards drafter", () => {
    const lier: CardEvaluationInput = {
      id: "lier",
      name: "Lier, Disciple of the Drowned",
      staticScore: 39,
      colors: ["U"],
      cmc: 5,
      manaCost: "{3}{U}{U}",
      subtypes: ["Human", "Wizard"],
    };
    const drownedCatacomb: CardEvaluationInput = {
      id: "catacomb",
      name: "Drowned Catacomb",
      staticScore: 23.9,
      colors: [],
      cmc: 0,
      isLand: true,
      producesColors: ["U", "B"],
    };
    const pathToExile: CardEvaluationInput = {
      id: "path",
      name: "Path to Exile",
      staticScore: 39,
      colors: ["W"],
      cmc: 1,
      manaCost: "{W}",
    };
    const fastbond: CardEvaluationInput = {
      id: "fastbond",
      name: "Fastbond",
      staticScore: 29,
      colors: ["G"],
      cmc: 1,
      manaCost: "{G}",
    };

    const context: PackEvaluationContext = {
      packNumber: 2,
      pickNumber: 2,
      offeredCards: [drownedCatacomb, pathToExile, fastbond, lier],
      priorPool: [
        { id: "1", name: "Lightning Bolt", staticScore: 43, colors: ["R"], cmc: 1 },
        { id: "2", name: "Counterspell", staticScore: 35, colors: ["U"], cmc: 2 },
        {
          id: "3",
          name: "Snapcaster Mage",
          staticScore: 40,
          colors: ["U"],
          cmc: 2,
          subtypes: ["Human", "Wizard"],
        },
        {
          id: "4",
          name: "Sprite Dragon",
          staticScore: 30,
          colors: ["U", "R"],
          cmc: 2,
          subtypes: ["Faerie", "Dragon"],
        },
      ],
      cubeKey: "titou_tribal",
    };

    const results = evaluatePack(context);

    // Lier must be Top Pick
    expect(results[0]?.name).toBe("Lier, Disciple of the Drowned");
    expect(results[0]?.dynamicScore).toBeGreaterThanOrEqual(35);
    expect(results[0]?.explanation).toMatch(/dans vos couleurs \([UR]\/[UR]\)/);

    // Drowned Catacomb must never be recommended as a hatepick
    const catacombResult = results.find((c) => c.name === "Drowned Catacomb");
    expect(catacombResult).toBeDefined();
    expect(catacombResult?.explanation).not.toContain("hatepick");
    expect(catacombResult?.explanation).not.toContain("antidraft");
    expect(catacombResult?.dynamicScore).toBeLessThan(results[0]?.dynamicScore ?? 0);
  });
});
