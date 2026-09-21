import { describe, expect, it } from "vitest";
import { NICO_PROFILE, THEO_PROFILE } from "../../../src/bots/friends/profiles.ts";
import {
  buildJevDraftContext,
  chooseWithJevBot,
  formatCubePowerHierarchy,
  loadCubeCardsWithScores,
} from "../../../src/bots/jev/jev-bot-decision.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";
import { LlmRouter } from "../../../src/companion/llm-router.ts";

describe("JEV Bot Decision & Rich Context Engine", () => {
  const sampleOffered: CardEvaluationInput[] = [
    {
      id: "c1",
      name: "Griselbrand",
      manaCost: "{4}{B}{B}{B}{B}",
      cmc: 8,
      colors: ["B"],
      types: ["Creature"],
      isLand: false,
      oracleText: "Flying, lifelink. Pay 7 life: Draw 7 cards.",
      staticScore: 48,
    },
    {
      id: "c2",
      name: "Counterspell",
      manaCost: "{U}{U}",
      cmc: 2,
      colors: ["U"],
      types: ["Instant"],
      isLand: false,
      oracleText: "Counter target spell.",
      staticScore: 42,
    },
  ];

  const samplePriorPool: CardEvaluationInput[] = [
    {
      id: "p1",
      name: "Entomb",
      manaCost: "{B}",
      cmc: 1,
      colors: ["B"],
      types: ["Instant"],
      isLand: false,
      staticScore: 45,
    },
    {
      id: "p2",
      name: "Underground Sea",
      manaCost: "",
      cmc: 0,
      colors: ["U", "B"],
      types: ["Land"],
      isLand: true,
      staticScore: 48,
    },
  ];

  it("builds a rich context containing archetypes, bot biases, and pool distribution", () => {
    const { state, criteria, instanceIdByName } = buildJevDraftContext({
      packNumber: 2,
      pickNumber: 1,
      direction: "right",
      profile: THEO_PROFILE,
      offeredCards: sampleOffered,
      priorPool: samplePriorPool,
      cubeMeta: {
        schemaVersion: 1,
        cubeKey: "vintage_test",
        name: "Vintage Test Cube",
        owner: "test",
        coachReadiness: { status: "ready", reason: "ok" },
        activeSnapshotId: "snap-1",
        cardCount: 360,
        powerTier: "powered_vintage",
        pacing: "blistering_fast",
        fundamentalTurn: {
          targetTurn: 2,
          criticalWindow: "T1-T3",
          pacingDescription: "Fast combos",
          deckExpectation: "Early disruption required",
        },
        technicalAxes: {
          speedIndex: 9,
          interactionDensityPercentage: 20,
          averageCmcEstimate: 2.2,
          fixingQuality: "fast_fetches_duals",
        },
        dominantMechanics: ["Reanimator", "Storm"],
        fixingDensityPercentage: 15,
        scoringProfile: {
          tribalSynergyMultiplier: 1,
          comboSynergyMultiplier: 1,
          fixingPriorityBonus: 1,
          curveStrictness: 1,
        },
        archetypes: [
          {
            id: "reanimator",
            name: "Grixis Reanimator",
            primaryColors: ["B", "U"],
            category: "combo",
            description: "Cheats giant monsters into play from graveyard.",
            gameplan: "Entomb then Reanimate.",
            keyCards: [],
            supportCards: [],
          },
        ],
      },
    });

    // Verify Cube info is present
    expect(state).toContain("Vintage Test Cube");
    expect(state).toContain("Grixis Reanimator");
    expect(state).toContain("T1-T3");

    // Verify Bot biases are present
    expect(state).toContain("Théo");
    expect(state).toContain("reanimationBonus");

    // Verify Pool analytics are present
    expect(state).toContain("CURRENT POOL (2 cards drafted)");
    expect(state).toContain("Entomb");
    expect(state).toContain("Underground Sea");

    // Verify Criteria
    expect(criteria.Griselbrand).toContain("{4}{B}{B}{B}{B}");
    expect(criteria.Counterspell).toContain("{U}{U}");
    expect(instanceIdByName.get("Griselbrand")).toBe("c1");
    expect(instanceIdByName.get("Counterspell")).toBe("c2");
  });

  it("falls back gracefully to heuristic scoring when JEV key is absent", async () => {
    const router = new LlmRouter();
    router.clearKeysForTesting();

    const result = await chooseWithJevBot({
      router,
      profile: NICO_PROFILE,
      packNumber: 1,
      pickNumber: 1,
      offeredCards: sampleOffered,
      priorPool: [],
    });

    expect(result.usedJev).toBe(false);
    expect(result.cardInstanceId).toBeDefined();
    expect(result.reason).toContain("Choix heuristique");
  });

  it("throws error when offered booster is empty", async () => {
    await expect(
      chooseWithJevBot({
        packNumber: 1,
        pickNumber: 1,
        offeredCards: [],
        priorPool: [],
      }),
    ).rejects.toThrow("Cannot choose from an empty booster");
  });

  it("loads cube cards with power scores from disk for known cubes", () => {
    const cards = loadCubeCardsWithScores("nico_candyshop");
    expect(cards.length).toBe(730);

    const solRing = cards.find((c) => c.name === "Sol Ring");
    expect(solRing).toBeDefined();
    expect(solRing?.score).toBe(54);

    const griselbrand = cards.find((c) => c.name === "Griselbrand");
    expect(griselbrand).toBeDefined();
    expect(griselbrand?.score).toBe(29);

    // Non-existent cube returns empty array safely
    const emptyCards = loadCubeCardsWithScores("non_existent_cube_xyz");
    expect(emptyCards).toEqual([]);
  });

  it("formats cube power hierarchy correctly into relative tiers A+ down to F", () => {
    const formatted = formatCubePowerHierarchy([
      { name: "Black Lotus", tier: "A+", score: 53 },
      { name: "Griselbrand", tier: "A", score: 48 },
      { name: "Counterspell", tier: "B+", score: 42 },
      { name: "Llanowar Elves", tier: "C", score: 38 },
      { name: "Cancel", tier: "F", score: 30 },
    ]);

    expect(formatted).toContain("CUBE CARD ROSTER & RELATIVE TIERS (5 cards in this cube):");
    expect(formatted).toContain("• Tier A+ (Top Cube Bombs & Format Defining, 1 cards):");
    expect(formatted).toContain("Black Lotus (53)");
    expect(formatted).toContain("• Tier A (High Impact First Picks, 1 cards):");
    expect(formatted).toContain("Griselbrand (48)");
    expect(formatted).toContain("• Tier B+ (High Synergy & Strong Playables, 1 cards):");
    expect(formatted).toContain("Counterspell (42)");
    expect(formatted).toContain("• Tier C (Average Solid Playables, 1 cards):");
    expect(formatted).toContain("Llanowar Elves (38)");
    expect(formatted).toContain("• Tier F (Bottom Tier / Late Picks, 1 cards):");
    expect(formatted).toContain("Cancel (30)");
  });

  it("includes relative tiers and card tiers in buildJevDraftContext when cubeCards are provided", () => {
    const { state, criteria } = buildJevDraftContext({
      packNumber: 1,
      pickNumber: 1,
      offeredCards: sampleOffered,
      priorPool: [],
      cubeCards: [
        { name: "Sol Ring", tier: "A+", score: 54 },
        { name: "Griselbrand", tier: "B+", score: 48 },
      ],
    });

    expect(state).toContain("CUBE CARD ROSTER & RELATIVE TIERS (2 cards in this cube):");
    expect(state).toContain("• Tier A+");
    expect(state).toContain("Sol Ring (54)");
    expect(state).toContain("• Tier B+");
    expect(state).toContain("Griselbrand (48)");

    // Criteria includes matched relative tier
    expect(criteria.Griselbrand).toContain("[Tier: B+]");
    expect(criteria.Griselbrand).toContain("[Power: 48]");
  });
});
