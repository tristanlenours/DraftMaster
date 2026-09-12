import { describe, expect, it } from "vitest";
import { getUnifiedDraftAdvice } from "../../../src/domain/coaching/draft-coach-service.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";
import type { CompanionCard } from "../../../src/companion/card-resolver.ts";
import {
  THEO_PROFILE,
  buildTableSeatAssignments,
  isReanimatorSupportedInCube,
  computeFriendCardBiasContributions,
} from "../../../src/bots/friends/index.ts";
import type { LlmRouter } from "../../../src/companion/llm-router.ts";

describe("Unified DraftCoachService", () => {
  const ocelotPride: CardEvaluationInput = {
    id: "ocelot-pride",
    name: "Ocelot Pride",
    staticScore: 48,
    colors: ["W"],
    cmc: 1,
    types: ["Creature"],
    oracleText:
      "First strike, lifelink. At the beginning of your end step, if you gained life this turn, create a 1/1 white Cat creature token.",
  };

  const solRing: CardEvaluationInput = {
    id: "sol-ring",
    name: "Sol Ring",
    staticScore: 50,
    colors: [],
    cmc: 1,
    types: ["Artifact"],
    oracleText: "{T}: Add {C}{C}.",
  };

  const offColorLand: CardEvaluationInput = {
    id: "steam-vents",
    name: "Steam Vents",
    staticScore: 35,
    colors: [],
    producesColors: ["U", "R"],
    isLand: true,
    cmc: 0,
    types: ["Land"],
    oracleText: "{T}: Add {U} or {R}.",
  };

  it("provides deterministic advice with top pick and alternatives", async () => {
    const advice = await getUnifiedDraftAdvice({
      packCards: [ocelotPride, solRing, offColorLand],
      priorPool: [],
      packNumber: 1,
      pickNumber: 1,
      skipLlm: true,
    });

    expect(advice.topPickId).toBe("sol-ring");
    expect(advice.topPickName).toBe("Sol Ring");
    expect(advice.reason.length).toBeGreaterThan(10);
    expect(advice.alternatives.length).toBeGreaterThanOrEqual(1);
    expect(advice.provider).toBe("engine");
  });

  it("works interchangeably with CompanionCard objects", async () => {
    const compCards: CompanionCard[] = [
      {
        grpId: 101,
        name: "Ocelot Pride",
        manaCost: "{W}",
        cmc: 1,
        rarity: 4,
        colors: ["W"],
        isLand: false,
        imageUrl: "",
        oracleText: "First strike, lifelink.",
        powerScore: 48,
        tier: "S",
      },
      {
        grpId: 102,
        name: "Solitude",
        manaCost: "{3}{W}{W}",
        cmc: 5,
        rarity: 4,
        colors: ["W"],
        isLand: false,
        imageUrl: "",
        oracleText: "Flash, lifelink. When Solitude enters, exile up to one target creature.",
        powerScore: 47,
        tier: "S",
      },
    ];

    const advice = await getUnifiedDraftAdvice({
      packCards: compCards,
      priorPool: [],
      packNumber: 1,
      pickNumber: 1,
      skipLlm: true,
    });

    expect(advice.topPickId).toBe("101");
    expect(advice.topPickName).toBe("Ocelot Pride");
    expect(advice.alternatives[0]?.id).toBe("102");
  });

  it("matches LLM json responses to card ids when llmRouter returns a recommendation", async () => {
    const mockRouter = {
      hasConfiguredKeys: () => true,
      generateJson: () =>
        Promise.resolve({
          success: true as const,
          provider: "Gemini Flash Mock",
          content: {
            topPick: "Ocelot Pride",
            reason: "Une véritable bombe tempo T1 de Modern Horizons 3 !",
            alternatives: [{ name: "Sol Ring", reason: "Accélération colossale incolore" }],
          },
        }),
    } as unknown as LlmRouter;

    const advice = await getUnifiedDraftAdvice({
      packCards: [ocelotPride, solRing, offColorLand],
      priorPool: [],
      packNumber: 1,
      pickNumber: 1,
      llmRouter: mockRouter,
    });

    expect(advice.topPickId).toBe("ocelot-pride");
    expect(advice.topPickName).toBe("Ocelot Pride");
    expect(advice.reason).toBe("Une véritable bombe tempo T1 de Modern Horizons 3 !");
    expect(advice.alternatives[0]?.id).toBe("sol-ring");
    expect(advice.provider).toBe("Gemini Flash Mock");
  });
});

describe("Bot Théo - Black Appetite & Reanimator Cube Detection", () => {
  const doomBlade: CardEvaluationInput = {
    id: "doom-blade",
    name: "Doom Blade",
    staticScore: 35,
    colors: ["B"],
    cmc: 2,
    types: ["Instant"],
    oracleText: "Destroy target nonblack creature.",
  };

  const bigTitan: CardEvaluationInput = {
    id: "grave-titan",
    name: "Grave Titan",
    staticScore: 42,
    colors: ["B"],
    cmc: 6,
    types: ["Creature"],
    oracleText:
      "Deathtouch. Whenever Grave Titan enters or attacks, create two 2/2 black Zombie creature tokens.",
  };

  const lightningBolt: CardEvaluationInput = {
    id: "lightning-bolt",
    name: "Lightning Bolt",
    staticScore: 36,
    colors: ["R"],
    cmc: 1,
    types: ["Instant"],
    oracleText: "Lightning Bolt deals 3 damage to any target.",
  };

  it("has primary preference for Black only (not locked to Rakdos)", () => {
    expect(THEO_PROFILE.preferredColors).toEqual(["B"]);
    expect(THEO_PROFILE.biases.colorDiscipline).toBe(0.9);
  });

  it("detects when reanimator is not supported in Titou Tribal", () => {
    expect(isReanimatorSupportedInCube({ cubeKey: "titou_tribal" })).toBe(false);
    expect(isReanimatorSupportedInCube({ cubeKey: "powered_vintage" })).toBe(true);
  });

  it("does not grant reanimation payoff bonus to big creatures when cube lacks reanimator", () => {
    // In Titou Tribal (no reanimator)
    const titouContributions = computeFriendCardBiasContributions(bigTitan, THEO_PROFILE, [], 0, {
      isReanimatorSupported: false,
    });
    const keys = titouContributions.map((c) => c.key);
    expect(keys).toContain("preferred-color");
    expect(keys).not.toContain("reanimation-payoff");

    // In a cube with reanimator
    const reanimContributions = computeFriendCardBiasContributions(bigTitan, THEO_PROFILE, [], 0, {
      isReanimatorSupported: true,
    });
    const reanimKeys = reanimContributions.map((c) => c.key);
    expect(reanimKeys).toContain("preferred-color");
    expect(reanimKeys).toContain("reanimation-payoff");
  });

  it("allows Théo to pivot to open colors with softer color discipline", () => {
    const disciplineContribution = computeFriendCardBiasContributions(
      lightningBolt,
      THEO_PROFILE,
      [doomBlade],
      10, // colorPenalty of 10
      { isReanimatorSupported: false },
    );
    const disc = disciplineContribution.find((c) => c.key === "color-discipline");
    // With 0.9 color discipline: (1 - 0.9) * 10 = +1.0 openness
    expect(disc?.points).toBe(1.0);
    expect(disc?.label).toBe("Ouverture aux couleurs");
  });

  it("seats 8 distinct magiciens without duplicating TitouBot when human is Titou", () => {
    const seatsTitou = buildTableSeatAssignments("titou");
    expect(seatsTitou).toHaveLength(8);
    expect(seatsTitou[0]).toBeNull(); // Human
    const botIds = seatsTitou.slice(1).map((b) => b?.id);
    expect(botIds).toContain("theo");
    expect(botIds).not.toContain("titou"); // No duplicate Titou!

    const seatsTheo = buildTableSeatAssignments("theo");
    const botIdsTheo = seatsTheo.slice(1).map((b) => b?.id);
    expect(botIdsTheo).toContain("titou");
    expect(botIdsTheo).not.toContain("theo"); // No duplicate Théo!
  });

  describe("Mid-Draft Review (Pack 2 & 3 Pick 1)", () => {
    const spellDrop1: CardEvaluationInput = {
      id: "ragavan",
      name: "Ragavan, Nimble Pilferer",
      staticScore: 48,
      colors: ["R"],
      cmc: 1,
      types: ["Creature"],
      oracleText: "Dash {1}{R}",
    };

    const spellDrop2: CardEvaluationInput = {
      id: "bloodthirsty-adversary",
      name: "Bloodthirsty Adversary",
      staticScore: 35,
      colors: ["R"],
      cmc: 2,
      types: ["Creature"],
      oracleText: "Haste",
    };

    const spellDrop4: CardEvaluationInput = {
      id: "torbran",
      name: "Torbran, Thane of Red Fell",
      staticScore: 38,
      colors: ["R"],
      cmc: 4,
      types: ["Creature"],
      oracleText: "If a red source you control would deal damage...",
    };

    const whiteDrop3: CardEvaluationInput = {
      id: "fable",
      name: "Adeline, Resplendent Cathar",
      staticScore: 40,
      colors: ["W"],
      cmc: 3,
      types: ["Creature"],
      oracleText: "Vigilance",
    };

    const dualLand: CardEvaluationInput = {
      id: "sacred-foundry",
      name: "Sacred Foundry",
      staticScore: 35,
      colors: [],
      producesColors: ["W", "R"],
      isLand: true,
      cmc: 0,
      types: ["Land"],
      oracleText: "{T}: Add {R} or {W}.",
    };

    it("does not generate packReview at Pack 1 Pick 1 or mid-pack", async () => {
      const adviceP1P1 = await getUnifiedDraftAdvice({
        packCards: [spellDrop1, spellDrop2],
        priorPool: [],
        packNumber: 1,
        pickNumber: 1,
        skipLlm: true,
      });
      expect(adviceP1P1.packReview).toBeUndefined();

      const adviceP2P2 = await getUnifiedDraftAdvice({
        packCards: [spellDrop1, spellDrop2],
        priorPool: [spellDrop1, spellDrop2],
        packNumber: 2,
        pickNumber: 2,
        skipLlm: true,
      });
      expect(adviceP2P2.packReview).toBeUndefined();
    });

    it("generates complete mid-draft review at Pack 2 Pick 1 with curve and fixers diagnosis", async () => {
      // Pool with heavy curve (0 drop 1, 1 drop 2, several drop 4) and 2 colors with 0 fixers
      const pool = [
        spellDrop2,
        whiteDrop3,
        spellDrop4,
        { ...spellDrop4, id: "spell4-b" },
        { ...spellDrop4, id: "spell4-c" },
      ];

      const adviceP2P1 = await getUnifiedDraftAdvice({
        packCards: [spellDrop1, dualLand],
        priorPool: pool,
        packNumber: 2,
        pickNumber: 1,
        skipLlm: true,
      });

      const review = adviceP2P1.packReview;
      expect(review).toBeDefined();
      if (!review) return;
      expect(review.packNumber).toBe(2);
      expect(review.poolSummary).toContain("Pool actuel : 5 cartes");
      expect(review.archetypeLabel).toContain("Boros");

      // Curve analysis
      expect(review.curveStats.oneDrops).toBe(0);
      expect(review.curveStats.twoDrops).toBe(1);
      expect(review.curveStats.fourPlusDrops).toBe(3);
      expect(review.curveAnalysis).toContain("Courbe trop lourde");

      // Fixers analysis (0 fixers in 2 colors -> warning)
      expect(review.fixingStats.fixersCount).toBe(0);
      expect(review.fixingStats.isProportionGood).toBe(false);
      expect(review.fixingAnalysis).toContain("Déficit de fixeurs");

      // Priorities
      expect(review.priorities.some((p) => p.includes("baisser la courbe"))).toBe(true);
      expect(review.priorities.some((p) => p.includes("fixeurs ou terrains doubles"))).toBe(true);
      expect(review.priorities.some((p) => p.includes("carte clé dans l'archétype"))).toBe(true);
      expect(review.priorities.some((p) => p.includes("c'est bingo !"))).toBe(true);

      // Reading signals tip
      expect(review.signalTip).toContain("deuxième passage des cartes");
      expect(review.signalTip).toContain("roue");
    });

    it("recognizes healthy mana fixing when dual lands are present", async () => {
      const pool = [
        spellDrop1,
        spellDrop2,
        whiteDrop3,
        dualLand,
        { ...dualLand, id: "arid-mesa", name: "Arid Mesa" },
      ];

      const adviceP2P1 = await getUnifiedDraftAdvice({
        packCards: [spellDrop4],
        priorPool: pool,
        packNumber: 2,
        pickNumber: 1,
        skipLlm: true,
      });

      expect(adviceP2P1.packReview?.fixingStats.fixersCount).toBe(2);
      expect(adviceP2P1.packReview?.fixingStats.isProportionGood).toBe(true);
      expect(adviceP2P1.packReview?.fixingAnalysis).toContain("Stabilité de mana en bonne voie");
    });
  });
});
