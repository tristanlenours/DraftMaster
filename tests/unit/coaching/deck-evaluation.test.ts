import { describe, expect, it } from "vitest";
import {
  detectArchetype,
  evaluateDeck,
  type CardEvaluationInput,
} from "../../../src/domain/coaching/index.ts";

describe("Deck Evaluation & 5-Axis Kiviat Radar", () => {
  // 1. Boros Aggro deck cards
  const borosAggroDeck: readonly CardEvaluationInput[] = [
    // 16 Lands
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `land-r-${String(i)}`,
      name: "Mountain",
      staticScore: 25,
      colors: ["R"] as const,
      isLand: true,
      producesColors: ["R"] as const,
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `land-w-${String(i)}`,
      name: "Plains",
      staticScore: 25,
      colors: ["W"] as const,
      isLand: true,
      producesColors: ["W"] as const,
    })),
    // 24 Aggro Spells (low curve, CMC 1-2 heavy)
    {
      id: "b1",
      name: "Figure of Destiny",
      staticScore: 35,
      colors: ["R", "W"],
      cmc: 1,
      manaCost: "o(R/W)",
    },
    { id: "b2", name: "Goblin Guide", staticScore: 38, colors: ["R"], cmc: 1, types: ["Creature"] },
    {
      id: "b3",
      name: "Monastery Swiftspear",
      staticScore: 36,
      colors: ["R"],
      cmc: 1,
      types: ["Creature"],
    },
    { id: "b4", name: "Ocelot Pride", staticScore: 42, colors: ["W"], cmc: 1, types: ["Creature"] },
    {
      id: "b5",
      name: "Lightning Bolt",
      staticScore: 45,
      colors: ["R"],
      cmc: 1,
      oracleText: "deals 3 damage to any target",
    },
    {
      id: "b6",
      name: "Path to Exile",
      staticScore: 42,
      colors: ["W"],
      cmc: 1,
      oracleText: "Exile target creature",
    },
    {
      id: "b7",
      name: "Swords to Plowshares",
      staticScore: 45,
      colors: ["W"],
      cmc: 1,
      oracleText: "Exile target creature",
    },
    {
      id: "b8",
      name: "Eidolon of the Great Revel",
      staticScore: 38,
      colors: ["R"],
      cmc: 2,
      types: ["Creature"],
    },
    {
      id: "b9",
      name: "Thalia, Guardian of Thraben",
      staticScore: 40,
      colors: ["W"],
      cmc: 2,
      types: ["Creature"],
    },
    {
      id: "b10",
      name: "Fear of Missing Out",
      staticScore: 41,
      colors: ["R"],
      cmc: 2,
      types: ["Creature"],
    },
    {
      id: "b11",
      name: "Lightning Helix",
      staticScore: 37,
      colors: ["R", "W"],
      cmc: 2,
      oracleText: "deals 3 damage to any target",
    },
    {
      id: "b12",
      name: "Adanto Vanguard",
      staticScore: 33,
      colors: ["W"],
      cmc: 2,
      types: ["Creature"],
    },
    {
      id: "b13",
      name: "Young Pyromancer",
      staticScore: 35,
      colors: ["R"],
      cmc: 2,
      types: ["Creature"],
    },
    {
      id: "b14",
      name: "Bonecrusher Giant",
      staticScore: 39,
      colors: ["R"],
      cmc: 3,
      types: ["Creature"],
    },
    {
      id: "b15",
      name: "Elite Spellbinder",
      staticScore: 38,
      colors: ["W"],
      cmc: 3,
      types: ["Creature"],
    },
    {
      id: "b16",
      name: "Fable of the Mirror-Breaker",
      staticScore: 45,
      colors: ["R"],
      cmc: 3,
      types: ["Enchantment"],
    },
    {
      id: "b17",
      name: "Broadside Bombardiers",
      staticScore: 40,
      colors: ["R"],
      cmc: 3,
      types: ["Creature"],
    },
    {
      id: "b18",
      name: "Seasoned Pyromancer",
      staticScore: 38,
      colors: ["R"],
      cmc: 3,
      types: ["Creature"],
    },
    {
      id: "b19",
      name: "Abrade",
      staticScore: 35,
      colors: ["R"],
      cmc: 2,
      oracleText: "deals 3 damage to target creature",
    },
    {
      id: "b20",
      name: "Get Lost",
      staticScore: 38,
      colors: ["W"],
      cmc: 2,
      oracleText: "Destroy target creature or enchantment",
    },
    {
      id: "b21",
      name: "Sunbaked Canyon",
      staticScore: 35,
      colors: ["R", "W"],
      isLand: true,
      producesColors: ["R", "W"],
    },
    {
      id: "b22",
      name: "Inspiring Vantage",
      staticScore: 35,
      colors: ["R", "W"],
      isLand: true,
      producesColors: ["R", "W"],
    },
    {
      id: "b23",
      name: "Sacred Foundry",
      staticScore: 42,
      colors: ["R", "W"],
      isLand: true,
      producesColors: ["R", "W"],
    },
    {
      id: "b24",
      name: "Plateau",
      staticScore: 42,
      colors: ["R", "W"],
      isLand: true,
      producesColors: ["R", "W"],
    },
  ];

  // 2. Mono-Green Ramp deck cards
  const monoGreenRampDeck: readonly CardEvaluationInput[] = [
    // 16 Forests
    ...Array.from({ length: 16 }, (_, i) => ({
      id: `forest-${String(i)}`,
      name: "Forest",
      staticScore: 25,
      colors: ["G"] as const,
      isLand: true,
      producesColors: ["G"] as const,
    })),
    // Mana dorks (count as mana sources!)
    {
      id: "g1",
      name: "Llanowar Elves",
      staticScore: 36,
      colors: ["G"],
      cmc: 1,
      types: ["Creature"],
      producesColors: ["G"],
    },
    {
      id: "g2",
      name: "Elvish Mystic",
      staticScore: 35,
      colors: ["G"],
      cmc: 1,
      types: ["Creature"],
      producesColors: ["G"],
    },
    {
      id: "g3",
      name: "Fyndhorn Elves",
      staticScore: 35,
      colors: ["G"],
      cmc: 1,
      types: ["Creature"],
      producesColors: ["G"],
    },
    {
      id: "g4",
      name: "Birds of Paradise",
      staticScore: 42,
      colors: ["G"],
      cmc: 1,
      types: ["Creature"],
      producesColors: ["W", "U", "B", "R", "G"],
    },
    {
      id: "g5",
      name: "Noble Hierarch",
      staticScore: 40,
      colors: ["G"],
      cmc: 1,
      types: ["Creature"],
      producesColors: ["W", "U", "G"],
    },
    {
      id: "g6",
      name: "Delighted Halfling",
      staticScore: 38,
      colors: ["G"],
      cmc: 1,
      types: ["Creature"],
      producesColors: ["G"],
    },
    {
      id: "g7",
      name: "Rofellos, Llanowar Emissary",
      staticScore: 42,
      colors: ["G"],
      cmc: 2,
      types: ["Creature"],
      producesColors: ["G"],
    },
    {
      id: "g8",
      name: "Wall of Roots",
      staticScore: 34,
      colors: ["G"],
      cmc: 2,
      types: ["Creature"],
      producesColors: ["G"],
    },
    {
      id: "g9",
      name: "Cultivate",
      staticScore: 32,
      colors: ["G"],
      cmc: 3,
      oracleText: "Search your library for basic land",
    },
    {
      id: "g10",
      name: "Karn, the Great Creator",
      staticScore: 40,
      colors: [],
      cmc: 4,
      types: ["Planeswalker"],
    },
    {
      id: "g11",
      name: "Nissa, Who Shakes the World",
      staticScore: 45,
      colors: ["G"],
      cmc: 5,
      types: ["Planeswalker"],
    },
    {
      id: "g12",
      name: "Primeval Titan",
      staticScore: 44,
      colors: ["G"],
      cmc: 6,
      types: ["Creature"],
    },
    {
      id: "g13",
      name: "Woodfall Primus",
      staticScore: 38,
      colors: ["G"],
      cmc: 8,
      types: ["Creature"],
    },
    {
      id: "g14",
      name: "Craterhoof Behemoth",
      staticScore: 46,
      colors: ["G"],
      cmc: 8,
      types: ["Creature"],
    },
    {
      id: "g15",
      name: "Worldspine Wurm",
      staticScore: 35,
      colors: ["G"],
      cmc: 11,
      types: ["Creature"],
    },
    {
      id: "g16",
      name: "Green Sun's Zenith",
      staticScore: 42,
      colors: ["G"],
      cmc: 1,
      oracleText: "Search your library for a green creature",
    },
    {
      id: "g17",
      name: "Natural Order",
      staticScore: 45,
      colors: ["G"],
      cmc: 4,
      oracleText: "Search your library for a green creature",
    },
    {
      id: "g18",
      name: "Beast Within",
      staticScore: 35,
      colors: ["G"],
      cmc: 3,
      oracleText: "Destroy target permanent",
    },
    {
      id: "g19",
      name: "Boseiju, Who Endures",
      staticScore: 44,
      colors: ["G"],
      isLand: true,
      producesColors: ["G"],
      oracleText: "Destroy target artifact or enchantment",
    },
    {
      id: "g20",
      name: "Gaea's Cradle",
      staticScore: 48,
      colors: ["G"],
      isLand: true,
      producesColors: ["G"],
    },
    {
      id: "g21",
      name: "Scavenging Ooze",
      staticScore: 35,
      colors: ["G"],
      cmc: 2,
      types: ["Creature"],
    },
    { id: "g22", name: "Endurance", staticScore: 40, colors: ["G"], cmc: 3, types: ["Creature"] },
    {
      id: "g23",
      name: "Eternal Witness",
      staticScore: 37,
      colors: ["G"],
      cmc: 3,
      types: ["Creature"],
    },
    {
      id: "g24",
      name: "Sylvan Library",
      staticScore: 44,
      colors: ["G"],
      cmc: 2,
      types: ["Enchantment"],
    },
  ];

  it("classifies Boros Aggro deck correctly", () => {
    const archetype = detectArchetype(borosAggroDeck);
    expect(archetype.category).toBe("aggro");
    expect(archetype.primaryColors).toContain("R");
    expect(archetype.primaryColors).toContain("W");
    expect(archetype.label).toContain("Boros");
  });

  it("classifies Mono-Green Ramp deck correctly", () => {
    const archetype = detectArchetype(monoGreenRampDeck);
    expect(archetype.category).toBe("ramp");
    expect(archetype.primaryColors).toEqual(["G"]);
    expect(archetype.label).toContain("Green");
  });

  it("evaluates Boros Aggro with high curve score adapted to aggro", () => {
    const evaluation = evaluateDeck(borosAggroDeck);
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(60);
    expect(evaluation.overallScore).toBeLessThanOrEqual(100);

    // 5 Kiviat Axes must be within [0, 100]
    expect(evaluation.radar.power).toBeGreaterThan(60);
    expect(evaluation.radar.synergy).toBe(0);
    expect(evaluation.radar.curve).toBeGreaterThan(80); // Low curve is rewarded in Aggro
    expect(evaluation.radar.mana).toBeGreaterThan(70);
    expect(evaluation.radar.interaction).toBeGreaterThan(70); // Has Bolt, Path, Swords, Helix, Abrade, Get Lost

    // Normalized weighting check: overallScore must match the weighted formula
    const expectedScore = Math.round(
      0.2 * evaluation.radar.power +
        0.25 * evaluation.radar.synergy +
        0.2 * evaluation.radar.curve +
        0.2 * evaluation.radar.mana +
        0.15 * evaluation.radar.interaction,
    );
    expect(evaluation.overallScore).toBe(expectedScore);
  });

  it("counts mana dorks as mana sources in Ramp deck evaluation", () => {
    const evaluation = evaluateDeck(monoGreenRampDeck);
    // Mana dorks (Birds, Llanowar, Fyndhorn, Elvish, Hierarch, Halfling...) boost the mana score
    expect(evaluation.radar.mana).toBeGreaterThanOrEqual(80);
    expect(evaluation.archetype.category).toBe("ramp");
    // High curve with heavy ramp should NOT be penalized as bad curve in Ramp
    expect(evaluation.radar.curve).toBeGreaterThanOrEqual(70);
  });

  it("keeps an elite powered package visible instead of diluting it into the spell average", () => {
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `powered-land-${String(index)}`,
      name: "Island",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: ["U"] as const,
    }));
    const ordinarySpells: readonly CardEvaluationInput[] = Array.from(
      { length: 18 },
      (_, index) => ({
        id: `ordinary-${String(index)}`,
        name: `Ordinary spell ${String(index)}`,
        staticScore: 30,
        colors: ["U"] as const,
        cmc: 2,
        typeLine: "Creature",
        types: ["Creature"] as const,
      }),
    );
    const poweredCards: readonly CardEvaluationInput[] = [
      {
        id: "black-lotus",
        name: "Black Lotus",
        staticScore: 53,
        colors: [],
        cmc: 0,
        typeLine: "Artifact",
        oracleText: "Sacrifice Black Lotus: Add three mana of any one color.",
      },
      {
        id: "ancestral-recall",
        name: "Ancestral Recall",
        staticScore: 53,
        colors: ["U"],
        cmc: 1,
        typeLine: "Instant",
        oracleText: "Target player draws three cards.",
      },
      {
        id: "mox-sapphire",
        name: "Mox Sapphire",
        staticScore: 51,
        colors: [],
        cmc: 0,
        typeLine: "Artifact",
        producesColors: ["U"],
        oracleText: "{T}: Add {U}.",
      },
      {
        id: "mox-jet",
        name: "Mox Jet",
        staticScore: 51,
        colors: [],
        cmc: 0,
        typeLine: "Artifact",
        producesColors: ["B"],
        oracleText: "{T}: Add {B}.",
      },
      {
        id: "sol-ring",
        name: "Sol Ring",
        staticScore: 51,
        colors: [],
        cmc: 1,
        typeLine: "Artifact",
        oracleText: "{T}: Add {C}{C}.",
      },
    ];

    const evaluation = evaluateDeck([...lands, ...ordinarySpells, ...poweredCards], {
      bombThreshold: 51,
    });

    expect(evaluation.radar.power).toBeGreaterThanOrEqual(82);
    expect(evaluation.audit.formulaVersion).toBe("deck-evaluation@3");
    expect(evaluation.audit.scoreMeaning).toContain("ni une probabilité de victoire");
    expect(evaluation.audit.power.meanStaticScore).toBeCloseTo(34.74, 2);
    expect(evaluation.audit.power.topFiveMean).toBeCloseTo(51.8, 2);
    expect(evaluation.audit.power.bombThreshold).toBe(51);
    expect(evaluation.audit.power.bombCards).toEqual([
      "Ancestral Recall",
      "Black Lotus",
      "Mox Jet",
      "Mox Sapphire",
      "Sol Ring",
    ]);
    expect(evaluation.audit.power.fastManaCards.map((card) => card.name)).toEqual([
      "Black Lotus",
      "Mox Jet",
      "Mox Sapphire",
      "Sol Ring",
    ]);
    expect(evaluation.audit.power.fastManaCards.reduce((sum, card) => sum + card.manaGain, 0)).toBe(
      7,
    );
  });

  it("audits the effective deployment curve of a redundant creature-cheat package", () => {
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 16 }, (_, index) => ({
      id: `combo-land-${String(index)}`,
      name: index < 8 ? "Island" : "Mountain",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: [index < 8 ? "U" : "R"] as const,
    }));
    const enablers: readonly CardEvaluationInput[] = [
      {
        id: "show-and-tell",
        name: "Show and Tell",
        staticScore: 20,
        colors: ["U"],
        cmc: 3,
        typeLine: "Sorcery",
        oracleText:
          "Each player may put an artifact, creature, enchantment, or land card from their hand onto the battlefield.",
      },
      {
        id: "sneak-attack",
        name: "Sneak Attack",
        staticScore: 25,
        colors: ["R"],
        cmc: 4,
        typeLine: "Enchantment",
        oracleText:
          "{R}: You may put a creature card from your hand onto the battlefield. That creature gains haste.",
      },
    ];
    const payoffs: readonly CardEvaluationInput[] = [
      ["griselbrand", "Griselbrand", 8],
      ["worldspine-wurm", "Worldspine Wurm", 11],
      ["archon-of-cruelty", "Archon of Cruelty", 8],
      ["atraxa", "Atraxa, Grand Unifier", 7],
      ["torsten", "Torsten, Founder of Benalia", 7],
    ].map(([id, name, cmc]) => ({
      id: String(id),
      name: String(name),
      staticScore: 42,
      colors: [],
      cmc: Number(cmc),
      typeLine: "Creature",
      types: ["Creature"],
    }));
    const support: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `combo-support-${String(index)}`,
      name: `Selection spell ${String(index)}`,
      staticScore: 34,
      colors: ["U"] as const,
      cmc: index < 10 ? 1 : 3,
      typeLine: "Sorcery",
      oracleText: index === 0 ? "Search your library for a card." : "Scry 2, then draw a card.",
    }));

    const evaluation = evaluateDeck([...lands, ...enablers, ...payoffs, ...support]);
    const cheatPackage = evaluation.audit.synergy.packages.find(
      (candidate) => candidate.id === "creature-cheat",
    );

    expect(evaluation.archetype.category).toBe("combo");
    expect(cheatPackage).toMatchObject({
      enablers: ["Show and Tell", "Sneak Attack"],
      payoffs: [
        "Griselbrand",
        "Worldspine Wurm",
        "Archon of Cruelty",
        "Atraxa, Grand Unifier",
        "Torsten, Founder of Benalia",
      ],
    });
    expect(cheatPackage?.supportCards).toContain("Selection spell 0");
    expect(evaluation.audit.curve.printedAverageCmc).toBeGreaterThan(3.2);
    expect(evaluation.audit.curve.effectiveAverageCmc).toBeLessThan(3);
    expect(evaluation.audit.curve.effectiveCostAdjustments).toHaveLength(5);
    expect(evaluation.radar.curve).toBeGreaterThanOrEqual(82);
  });

  it("grades interaction quality and coverage against the detected game plan", () => {
    const rampEvaluation = evaluateDeck(monoGreenRampDeck);

    expect(rampEvaluation.archetype.category).toBe("ramp");
    expect(rampEvaluation.audit.interaction.targetRange).toEqual({
      minimum: 1,
      ideal: 3,
      maximum: 6,
    });
    expect(rampEvaluation.audit.interaction.cards.map((card) => card.name)).toEqual([
      "Beast Within",
    ]);
    expect(rampEvaluation.audit.interaction.planAdequacy).toBeGreaterThanOrEqual(85);
    expect(rampEvaluation.radar.interaction).toBeGreaterThanOrEqual(65);

    const controlLands: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `control-land-${String(index)}`,
      name: "Island",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: ["U"] as const,
    }));
    const controlInteraction: readonly CardEvaluationInput[] = [
      ["Counterspell", "Counter target spell.", "Instant", 2],
      [
        "Thoughtseize",
        "Target player reveals their hand, then discards a nonland card.",
        "Sorcery",
        1,
      ],
      ["Fatal Push", "Destroy target creature.", "Instant", 1],
      ["Vindicate", "Destroy target permanent.", "Sorcery", 3],
      ["Wrath of God", "Destroy all creatures.", "Sorcery", 4],
      ["Cling to Dust", "Exile target card from a graveyard. Draw a card.", "Instant", 1],
    ].map(([name, oracleText, typeLine, cmc], index) => ({
      id: `answer-${String(index)}`,
      name: String(name),
      staticScore: 38,
      colors: ["U"],
      cmc: Number(cmc),
      typeLine: String(typeLine),
      oracleText: String(oracleText),
    }));
    const controlValue: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `control-value-${String(index)}`,
      name: `Control value ${String(index)}`,
      staticScore: 34,
      colors: ["U"] as const,
      cmc: 3,
      typeLine: "Creature",
      types: ["Creature"] as const,
    }));
    const controlEvaluation = evaluateDeck([
      ...controlLands,
      ...controlInteraction,
      ...controlValue,
    ]);

    expect(controlEvaluation.archetype.category).toBe("control");
    expect(controlEvaluation.audit.interaction.targetRange.minimum).toBe(6);
    expect(controlEvaluation.audit.interaction.cards).toHaveLength(6);
    expect(controlEvaluation.audit.interaction.coverage).toEqual([
      "créatures",
      "permanents",
      "pile",
      "main",
      "cimetières",
      "sweeper",
    ]);
  });

  it("exposes a redundant reanimation chain from graveyard setup to payoffs", () => {
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `reanimator-land-${String(index)}`,
      name: "Swamp",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: ["B"] as const,
    }));
    const packageCards: readonly CardEvaluationInput[] = [
      {
        id: "entomb",
        name: "Entomb",
        staticScore: 44,
        colors: ["B"],
        cmc: 1,
        typeLine: "Instant",
        oracleText:
          "Search your library for a card, put that card into your graveyard, then shuffle.",
      },
      {
        id: "bone-shards",
        name: "Bone Shards",
        staticScore: 35,
        colors: ["B"],
        cmc: 1,
        typeLine: "Sorcery",
        oracleText: "As an additional cost, discard a card. Destroy target creature.",
      },
      {
        id: "reanimate",
        name: "Reanimate",
        staticScore: 45,
        colors: ["B"],
        cmc: 1,
        typeLine: "Sorcery",
        oracleText:
          "Put target creature card from a graveyard onto the battlefield under your control.",
      },
      {
        id: "recurring-nightmare",
        name: "Recurring Nightmare",
        staticScore: 40,
        colors: ["B"],
        cmc: 3,
        typeLine: "Enchantment",
        oracleText:
          "Return target creature card from your graveyard to the battlefield. Activate only as a sorcery.",
      },
      {
        id: "grave-titan",
        name: "Grave Titan",
        staticScore: 42,
        colors: ["B"],
        cmc: 6,
        typeLine: "Creature",
        types: ["Creature"],
      },
      {
        id: "woodfall-primus",
        name: "Woodfall Primus",
        staticScore: 40,
        colors: ["G"],
        cmc: 8,
        typeLine: "Creature",
        types: ["Creature"],
      },
      {
        id: "archon-of-cruelty",
        name: "Archon of Cruelty",
        staticScore: 44,
        colors: ["B"],
        cmc: 8,
        typeLine: "Creature",
        types: ["Creature"],
      },
    ];
    const support: readonly CardEvaluationInput[] = Array.from({ length: 16 }, (_, index) => ({
      id: `reanimator-support-${String(index)}`,
      name: `Reanimator support ${String(index)}`,
      staticScore: 34,
      colors: ["B"] as const,
      cmc: 2,
      typeLine: "Creature",
      types: ["Creature"] as const,
    }));

    const evaluation = evaluateDeck([...lands, ...packageCards, ...support]);
    const reanimation = evaluation.audit.synergy.packages.find(
      (candidate) => candidate.id === "reanimation",
    );

    expect(reanimation).toMatchObject({
      enablers: ["Entomb", "Bone Shards"],
      payoffs: ["Grave Titan", "Woodfall Primus", "Archon of Cruelty"],
      supportCards: ["Reanimate", "Recurring Nightmare"],
      fragilityPenalty: 0,
    });
    expect(evaluation.audit.curve.effectiveCostAdjustments.map((card) => card.name)).toEqual([
      "Grave Titan",
      "Woodfall Primus",
      "Archon of Cruelty",
    ]);
    expect(
      evaluation.audit.interaction.cards.find((card) => card.name === "Bone Shards")?.coverage,
    ).toEqual(["créatures"]);
  });

  it("publishes real lands, land equivalents, accelerators, and colored sources separately", () => {
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 14 }, (_, index) => ({
      id: `mana-audit-land-${String(index)}`,
      name: "Island",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: ["U"] as const,
    }));
    const manaCards: readonly CardEvaluationInput[] = [
      {
        id: "mana-crypt",
        name: "Mana Crypt",
        staticScore: 50,
        colors: [],
        cmc: 0,
        typeLine: "Artifact",
        oracleText: "{T}: Add {C}{C}.",
      },
      {
        id: "mana-vault",
        name: "Mana Vault",
        staticScore: 42,
        colors: [],
        cmc: 1,
        typeLine: "Artifact",
        oracleText: "{T}: Add {C}{C}{C}.",
      },
      {
        id: "lorien-revealed",
        name: "Lórien Revealed",
        staticScore: 32,
        colors: ["U"],
        cmc: 5,
        typeLine: "Sorcery",
        oracleText: "Draw three cards. Islandcycling {1}.",
      },
      {
        id: "mana-drain",
        name: "Mana Drain",
        staticScore: 45,
        colors: ["U"],
        cmc: 2,
        typeLine: "Instant",
        oracleText:
          "Counter target spell. At the beginning of your next main phase, add {C} for each mana in that spell's mana cost.",
      },
    ];
    const spells: readonly CardEvaluationInput[] = Array.from({ length: 22 }, (_, index) => ({
      id: `mana-audit-spell-${String(index)}`,
      name: `Blue spell ${String(index)}`,
      staticScore: 34,
      colors: ["U"] as const,
      cmc: 2,
      typeLine: "Creature",
      types: ["Creature"] as const,
    }));

    const evaluation = evaluateDeck([...lands, ...manaCards, ...spells]);

    expect(evaluation.audit.mana.landCount).toBe(14);
    expect(evaluation.audit.mana.landEquivalentCards).toEqual(["Lórien Revealed"]);
    expect(evaluation.audit.mana.effectiveLandCount).toBe(14.75);
    expect(evaluation.audit.mana.accelerators.map((card) => card.name)).toEqual([
      "Mana Crypt",
      "Mana Vault",
    ]);
    expect(evaluation.audit.mana.sourcesByColor.U).toBe(14.75);
  });

  it("scores a well-sized mono-colored mana base at 100", () => {
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `mono-mana-land-${String(index)}`,
      name: "Forest",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: ["G"] as const,
    }));
    const spells: readonly CardEvaluationInput[] = Array.from({ length: 23 }, (_, index) => ({
      id: `mono-mana-spell-${String(index)}`,
      name: `Green spell ${String(index)}`,
      staticScore: 30,
      colors: ["G"] as const,
      cmc: 2,
      typeLine: "Creature",
      types: ["Creature"] as const,
    }));

    expect(evaluateDeck([...lands, ...spells]).radar.mana).toBe(100);
  });

  it("scores cube archetype cards with key cards worth three and supports worth one", () => {
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `synergy-land-${String(index)}`,
      name: "Forest",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: ["G"] as const,
    }));
    const spells: readonly CardEvaluationInput[] = Array.from({ length: 23 }, (_, index) => ({
      id: `synergy-spell-${String(index)}`,
      oracleId: `synergy-oracle-${String(index)}`,
      name: `Elf card ${String(index)}`,
      staticScore: 30,
      colors: ["G"] as const,
      cmc: 2,
      typeLine: "Creature — Elf",
      types: ["Creature"] as const,
      subtypes: ["Elf"] as const,
    }));
    const keyCards = spells.slice(0, 3).map((card) => card.oracleId ?? "");
    const supportCards = spells.slice(3, 12).map((card) => card.oracleId ?? "");

    const evaluation = evaluateDeck([...lands, ...spells], {
      synergyProfile: {
        archetypes: [
          {
            id: "test:elves",
            name: "Elfes",
            keyCards,
            supportCards,
            targetPoints: 18,
          },
        ],
      },
    });

    expect(evaluation.radar.synergy).toBe(100);
    expect(evaluation.audit.synergy.bestArchetype).toMatchObject({
      id: "test:elves",
      keyCardCount: 3,
      supportCardCount: 9,
      points: 18,
      targetPoints: 18,
    });
  });

  it("scores a five-color mana base without multicolor lands or fixers at 0", () => {
    const colors = ["W", "U", "B", "R", "G"] as const;
    const landNames = {
      W: "Plains",
      U: "Island",
      B: "Swamp",
      R: "Mountain",
      G: "Forest",
    } as const;
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => {
      const color = colors[index % colors.length] ?? "W";
      return {
        id: `five-color-basic-${String(index)}`,
        name: landNames[color],
        staticScore: 5,
        colors: [] as const,
        isLand: true,
        producesColors: [color],
      };
    });
    const spells: readonly CardEvaluationInput[] = Array.from({ length: 23 }, (_, index) => {
      const color = colors[index % colors.length] ?? "W";
      return {
        id: `five-color-spell-${String(index)}`,
        name: `Five-color spell ${String(index)}`,
        staticScore: 30,
        colors: [color],
        cmc: 2,
        typeLine: "Creature",
        types: ["Creature"] as const,
      };
    });

    expect(evaluateDeck([...lands, ...spells]).radar.mana).toBe(0);
  });

  it("rewards the required density of multicolor lands in a five-color deck", () => {
    const colors = ["W", "U", "B", "R", "G"] as const;
    const rainbowLands: readonly CardEvaluationInput[] = Array.from({ length: 8 }, (_, index) => ({
      id: `rainbow-land-${String(index)}`,
      name: "City of Brass",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: colors,
    }));
    const basics: readonly CardEvaluationInput[] = Array.from({ length: 9 }, (_, index) => {
      const color = colors[index % colors.length] ?? "W";
      return {
        id: `five-color-fixed-basic-${String(index)}`,
        name: "Basic land",
        staticScore: 5,
        colors: [] as const,
        isLand: true,
        producesColors: [color],
      };
    });
    const spells: readonly CardEvaluationInput[] = Array.from({ length: 23 }, (_, index) => ({
      id: `five-color-fixed-spell-${String(index)}`,
      name: `Fixed spell ${String(index)}`,
      staticScore: 30,
      colors: [colors[index % colors.length] ?? "W"],
      cmc: 2,
      typeLine: "Creature",
      types: ["Creature"] as const,
    }));

    const evaluation = evaluateDeck([...rainbowLands, ...basics, ...spells]);

    expect(evaluation.radar.mana).toBe(100);
    expect(evaluation.audit.mana.requiredFixerUnits).toBe(8);
    expect(evaluation.audit.mana.fixerUnits).toBe(8);
  });

  it("publishes the five weighted contributions that produce the final score", () => {
    const evaluation = evaluateDeck(borosAggroDeck);

    expect(evaluation.audit.contributions.map((contribution) => contribution.axis)).toEqual([
      "power",
      "synergy",
      "curve",
      "mana",
      "interaction",
    ]);
    expect(evaluation.audit.contributions.map((contribution) => contribution.weight)).toEqual([
      0.2, 0.25, 0.2, 0.2, 0.15,
    ]);
    expect(
      Math.round(
        evaluation.audit.contributions.reduce(
          (sum, contribution) => sum + contribution.weightedPoints,
          0,
        ),
      ),
    ).toBe(evaluation.overallScore);
  });

  it("exposes an equipment tutor package and its creature carriers", () => {
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `equipment-land-${String(index)}`,
      name: "Plains",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: ["W"] as const,
    }));
    const equipmentCards: readonly CardEvaluationInput[] = [
      {
        id: "stoneforge-mystic",
        name: "Stoneforge Mystic",
        staticScore: 42,
        colors: ["W"],
        cmc: 2,
        typeLine: "Creature — Kor Artificer",
        types: ["Creature"],
        oracleText:
          "Search your library for an Equipment card, reveal it, and put it into your hand.",
      },
      {
        id: "jitte",
        name: "Umezawa's Jitte",
        staticScore: 48,
        colors: [],
        cmc: 2,
        typeLine: "Legendary Artifact — Equipment",
      },
      {
        id: "batterskull",
        name: "Batterskull",
        staticScore: 44,
        colors: [],
        cmc: 5,
        typeLine: "Artifact — Equipment",
      },
    ];
    const carriers: readonly CardEvaluationInput[] = Array.from({ length: 20 }, (_, index) => ({
      id: `carrier-${String(index)}`,
      name: `Carrier ${String(index)}`,
      staticScore: 34,
      colors: ["W"] as const,
      cmc: index < 12 ? 1 : 2,
      typeLine: "Creature",
      types: ["Creature"] as const,
    }));

    const evaluation = evaluateDeck([...lands, ...equipmentCards, ...carriers]);
    const equipment = evaluation.audit.synergy.packages.find(
      (candidate) => candidate.id === "equipment-tutor",
    );

    expect(equipment).toMatchObject({
      enablers: ["Stoneforge Mystic"],
      payoffs: ["Umezawa's Jitte", "Batterskull"],
      fragilityPenalty: 0,
    });
    expect(equipment?.supportCards).toContain("Carrier 0");
  });

  it("exposes ramp redundancy instead of treating accelerators as isolated cards", () => {
    const evaluation = evaluateDeck(monoGreenRampDeck);
    const ramp = evaluation.audit.synergy.packages.find(
      (candidate) => candidate.id === "mana-ramp",
    );

    expect(ramp?.enablers).toEqual(
      expect.arrayContaining([
        "Llanowar Elves",
        "Birds of Paradise",
        "Rofellos, Llanowar Emissary",
        "Cultivate",
      ]),
    );
    expect(ramp?.payoffs).toEqual([
      "Primeval Titan",
      "Woodfall Primus",
      "Craterhoof Behemoth",
      "Worldspine Wurm",
    ]);
    expect(ramp?.supportCards).toEqual(["Green Sun's Zenith", "Natural Order"]);
    expect(ramp?.fragilityPenalty).toBe(0);
  });

  it("exposes an asymmetric wheel package", () => {
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `wheel-land-${String(index)}`,
      name: "Island",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      producesColors: ["U"] as const,
    }));
    const wheelCards: readonly CardEvaluationInput[] = [
      {
        id: "hullbreacher",
        name: "Hullbreacher",
        staticScore: 44,
        colors: ["U"],
        cmc: 3,
        typeLine: "Creature",
        types: ["Creature"],
        oracleText:
          "If an opponent would draw a card except the first one they draw in each of their draw steps, instead you create a Treasure token.",
      },
      {
        id: "echo-of-eons",
        name: "Echo of Eons",
        staticScore: 40,
        colors: ["U"],
        cmc: 6,
        typeLine: "Sorcery",
        oracleText:
          "Each player shuffles their hand and graveyard into their library, then draws seven cards.",
      },
    ];
    const support: readonly CardEvaluationInput[] = Array.from({ length: 21 }, (_, index) => ({
      id: `wheel-support-${String(index)}`,
      name: `Wheel support ${String(index)}`,
      staticScore: 34,
      colors: ["U"] as const,
      cmc: index < 12 ? 2 : 3,
      typeLine: "Creature",
      types: ["Creature"] as const,
      oracleText: index < 4 ? "Draw a card, then discard a card." : "",
    }));

    const evaluation = evaluateDeck([...lands, ...wheelCards, ...support]);
    const wheel = evaluation.audit.synergy.packages.find(
      (candidate) => candidate.id === "asymmetric-wheel",
    );

    expect(wheel).toMatchObject({
      enablers: ["Hullbreacher"],
      payoffs: ["Echo of Eons"],
      fragilityPenalty: 2,
    });
    expect(wheel?.supportCards).toEqual([
      "Wheel support 0",
      "Wheel support 1",
      "Wheel support 2",
      "Wheel support 3",
    ]);
  });

  it("audits non-destruction interaction used by control decks", () => {
    const lands: readonly CardEvaluationInput[] = Array.from({ length: 17 }, (_, index) => ({
      id: `control-land-${String(index)}`,
      name: "Island",
      staticScore: 5,
      colors: [] as const,
      isLand: true,
      typeLine: "Basic Land — Island",
    }));
    const interaction: readonly CardEvaluationInput[] = [
      {
        id: "balance",
        name: "Balance",
        staticScore: 48,
        colors: ["W"],
        cmc: 2,
        typeLine: "Sorcery",
        oracleText:
          "Players discard cards and sacrifice creatures so each player matches the player with the fewest.",
      },
      {
        id: "spellbinder",
        name: "Elite Spellbinder",
        staticScore: 38,
        colors: ["W"],
        cmc: 3,
        typeLine: "Creature",
        oracleText:
          "Look at target opponent's hand. You may exile a nonland card from it. That spell costs {2} more to cast.",
      },
      {
        id: "teferi",
        name: "Teferi, Hero of Dominaria",
        staticScore: 46,
        colors: ["W", "U"],
        cmc: 5,
        typeLine: "Legendary Planeswalker",
        oracleText: "Put target nonland permanent into its owner's library third from the top.",
      },
      {
        id: "skydiver",
        name: "Thieving Skydiver",
        staticScore: 35,
        colors: ["U"],
        cmc: 2,
        typeLine: "Creature",
        oracleText: "Gain control of target artifact with mana value X or less.",
      },
    ];
    const filler: readonly CardEvaluationInput[] = Array.from({ length: 19 }, (_, index) => ({
      id: `control-filler-${String(index)}`,
      name: `Control filler ${String(index)}`,
      staticScore: 30,
      colors: ["U"] as const,
      cmc: 2,
      typeLine: "Creature",
    }));

    const auditedCards = evaluateDeck([...lands, ...interaction, ...filler]).audit.interaction
      .cards;
    const coverageByName = Object.fromEntries(
      auditedCards.map((card) => [card.name, card.coverage]),
    );

    expect(coverageByName.Balance).toEqual(
      expect.arrayContaining(["créatures", "main", "sweeper"]),
    );
    expect(coverageByName["Elite Spellbinder"]).toContain("main");
    expect(coverageByName["Teferi, Hero of Dominaria"]).toContain("permanents");
    expect(coverageByName["Thieving Skydiver"]).toContain("permanents");
  });
});
