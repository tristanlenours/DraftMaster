import { describe, it, expect } from "vitest";
import {
  generateCubeUpgradeProposals,
  generateCubeMaybeboard,
  generateCubeSuggestionsReport,
  type MaybeboardSuggestion,
} from "../../../src/cards/cube-upgrade-advisor.ts";
import type { MasterCatalogCard } from "../../../src/cards/types.ts";

describe("Cube Upgrade Advisor", () => {
  const mockTargetCard: MasterCatalogCard = {
    oracleId: "target-1",
    slug: "shocking-strike",
    name: "Shocking Strike",
    cmc: 3,
    colors: ["R"],
    colorIdentity: ["R"],
    typeLine: "Instant",
    types: ["Instant"],
    subtypes: [],
    oracleText: "Deal 2 damage to target creature.",
    isLand: false,
    keywords: [],
    producesColors: [],
    presentInCubes: ["titou_tribal"],
    powerScore: {
      score: 14,
      source: "untapped",
      harmonizationDegree: "native",
      confidence: 1,
      updatedAt: "2026-01-01T00:00:00Z",
    },
    objectiveAnalysis: {
      summary: "Weak removal",
      roles: ["situational_removal"],
      floorRating: 1,
      ceilingRating: 2,
      tempoImpact: "low",
      quadrantStrengths: { opening: 2, developing: 2, parity: 1, behind: 1 },
    },
    cubeAnalyses: {
      titou_tribal: {
        cubeKey: "titou_tribal",
        fit: "filler",
        relativeTier: "F",
        tier: "F",
        archetypes: ["titou:tribal_goblins"],
        synergyTags: ["burn"],
        scoreModifier: 0,
        analysis: "Outdated removal spell.",
      },
    },
  };

  const mockCandidateUpgrade: MasterCatalogCard = {
    oracleId: "cand-1",
    slug: "lightning-bolt",
    name: "Lightning Bolt",
    cmc: 1,
    colors: ["R"],
    colorIdentity: ["R"],
    typeLine: "Instant",
    types: ["Instant"],
    subtypes: [],
    oracleText: "Lightning Bolt deals 3 damage to any target.",
    isLand: false,
    keywords: [],
    producesColors: [],
    presentInCubes: ["nico_candyshop"], // absent from titou_tribal
    powerScore: {
      score: 54,
      source: "untapped",
      harmonizationDegree: "native",
      confidence: 1,
      updatedAt: "2026-01-01T00:00:00Z",
    },
    objectiveAnalysis: {
      summary: "Premier burn spell",
      roles: ["premium_removal"],
      floorRating: 5,
      ceilingRating: 5,
      tempoImpact: "high",
      quadrantStrengths: { opening: 5, developing: 5, parity: 4, behind: 4 },
    },
    cubeAnalyses: {},
  };

  const mockPauperIllegalRare: MasterCatalogCard = {
    oracleId: "rare-1",
    slug: "fable-of-the-mirror-breaker",
    name: "Fable of the Mirror-Breaker",
    cmc: 3,
    colors: ["R"],
    colorIdentity: ["R"],
    typeLine: "Enchantment — Saga",
    types: ["Enchantment"],
    subtypes: ["Saga"],
    oracleText: "Create a 2/2 Goblin Shaman token...",
    isLand: false,
    keywords: [],
    producesColors: [],
    presentInCubes: ["nico_candyshop"],
    powerScore: {
      score: 50,
      source: "untapped",
      harmonizationDegree: "native",
      confidence: 1,
      updatedAt: "2026-01-01T00:00:00Z",
    },
    objectiveAnalysis: {
      summary: "Powerful saga",
      roles: ["engine", "card_advantage"],
      floorRating: 4,
      ceilingRating: 5,
      tempoImpact: "high",
      quadrantStrengths: { opening: 3, developing: 5, parity: 5, behind: 4 },
    },
    cubeAnalyses: {},
  };

  const mockMeta = {
    cubeKey: "titou_tribal",
    archetypes: [
      {
        id: "titou:tribal_goblins",
        name: "Rakdos Gobelins Aggro & Burn",
        primaryColors: ["R"],
        splashColors: ["B"],
        keyCards: [],
        supportCards: [],
      },
    ],
  };

  describe("1-to-1 Upgrade Matching (Poste pour poste)", () => {
    it("suggests a strictly superior card of compatible color and lower/equal CMC", () => {
      const catalog = [mockTargetCard, mockCandidateUpgrade];
      const upgrades = generateCubeUpgradeProposals("titou_tribal", catalog, mockMeta);

      expect(upgrades).toHaveProperty("Shocking Strike");
      const proposal = upgrades["Shocking Strike"];
      expect(proposal).toBeDefined();
      if (!proposal) throw new Error("Expected proposal to be defined");
      expect(proposal.suggestedCard.name).toBe("Lightning Bolt");
      expect(proposal.scoreDelta).toBe(40); // 54 - 14
      expect(proposal.swapType).toBe("strict_upgrade");
      expect(proposal.reason).toMatch(/coût|mana|dégâts|retrait/i);
    });

    it("does not suggest cards that are already present in the cube", () => {
      const cardAlreadyInCube: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        presentInCubes: ["titou_tribal"],
      };
      const catalog = [mockTargetCard, cardAlreadyInCube];
      const upgrades = generateCubeUpgradeProposals("titou_tribal", catalog, mockMeta);

      expect(upgrades["Shocking Strike"]).toBeUndefined();
    });

    it("does not suggest cards of incompatible colors", () => {
      const blueCard: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        colors: ["U"],
        colorIdentity: ["U"],
      };
      const catalog = [mockTargetCard, blueCard];
      const upgrades = generateCubeUpgradeProposals("titou_tribal", catalog, mockMeta);

      expect(upgrades["Shocking Strike"]).toBeUndefined();
    });

    it("enforces Pauper legality when recommending for hugues_pauper", () => {
      const targetPauperCard: MasterCatalogCard = {
        ...mockTargetCard,
        presentInCubes: ["hugues_pauper"],
        cubeAnalyses: {
          hugues_pauper: {
            cubeKey: "hugues_pauper",
            fit: "filler",
            relativeTier: "F",
            tier: "F",
            archetypes: [],
            synergyTags: [],
            scoreModifier: 0,
            analysis: "Underwhelming",
          },
        },
      };

      // mockPauperIllegalRare has rarity rare, not Pauper legal
      const catalog = [targetPauperCard, mockPauperIllegalRare];
      const pauperMeta = { cubeKey: "hugues_pauper", archetypes: [] };
      const upgrades = generateCubeUpgradeProposals("hugues_pauper", catalog, pauperMeta);

      expect(upgrades[targetPauperCard.name]).toBeUndefined();
    });

    it("prioritizes matching creature types in tribal cubes", () => {
      const goblinTarget: MasterCatalogCard = {
        ...mockTargetCard,
        name: "Raging Goblin",
        typeLine: "Creature — Goblin",
        types: ["Creature"],
        subtypes: ["Goblin"],
        cmc: 1,
        powerScore: { ...mockTargetCard.powerScore, score: 12 },
      };

      const nonTribalCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        name: "Monastery Swiftspear",
        typeLine: "Creature — Human Monk",
        types: ["Creature"],
        subtypes: ["Human", "Monk"],
        cmc: 1,
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 36 },
      };

      const goblinCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        name: "Goblin Guide",
        typeLine: "Creature — Goblin Scout",
        types: ["Creature"],
        subtypes: ["Goblin", "Scout"],
        cmc: 1,
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const catalog = [goblinTarget, nonTribalCandidate, goblinCandidate];
      const upgrades = generateCubeUpgradeProposals("titou_tribal", catalog, mockMeta);

      const goblinProposal = upgrades["Raging Goblin"];
      expect(goblinProposal).toBeDefined();
      if (!goblinProposal) throw new Error("Expected goblin proposal");
      // Should prefer Goblin Guide because of creature type alignment in titou_tribal
      expect(goblinProposal.suggestedCard.name).toBe("Goblin Guide");
    });

    it("prioritizes recent cards (<= 3 years old) over older cards when scores are comparable", () => {
      const olderCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        name: "Burst Lightning",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 38 },
      };
      const recentCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        name: "Play with Fire",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 37 },
      };
      const releaseMap = new Map([
        [
          "burst lightning",
          { firstPrintYear: 2009, isRecent: false, set: "ZEN", rarity: "common" },
        ],
        [
          "play with fire",
          { firstPrintYear: 2024, isRecent: true, set: "MID", rarity: "uncommon" },
        ],
      ]);

      const catalog = [mockTargetCard, olderCandidate, recentCandidate];
      const upgrades = generateCubeUpgradeProposals(
        "titou_tribal",
        catalog,
        mockMeta,
        undefined,
        releaseMap,
      );

      const proposal = upgrades["Shocking Strike"];
      expect(proposal).toBeDefined();
      expect(proposal?.suggestedCard.name).toBe("Play with Fire");
      expect(proposal?.isRecent).toBe(true);
      expect(proposal?.releaseYear).toBe(2024);
    });

    it("prioritizes cards featured in popular peer benchmark cubes", () => {
      const candidateA: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        name: "Standard Burn",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };
      const candidateB: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        name: "Benchmark Staple",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };
      const benchmarkMap = new Map([
        ["benchmark staple", ["The Pauper Cube", "MTGO Vintage Cube"]],
      ]);

      const catalog = [mockTargetCard, candidateA, candidateB];
      const upgrades = generateCubeUpgradeProposals(
        "titou_tribal",
        catalog,
        mockMeta,
        undefined,
        undefined,
        benchmarkMap,
      );

      const proposal = upgrades["Shocking Strike"];
      expect(proposal).toBeDefined();
      expect(proposal?.suggestedCard.name).toBe("Benchmark Staple");
      expect(proposal?.benchmarkCubes).toContain("The Pauper Cube");
    });

    it("generates structured meta added value analysis with pedagogical French summaries", () => {
      const releaseMap = new Map([
        ["lightning bolt", { firstPrintYear: 2024, isRecent: true, set: "MH3", rarity: "rare" }],
      ]);
      const benchmarkMap = new Map([["lightning bolt", ["MTGO Vintage Cube"]]]);

      const catalog = [mockTargetCard, mockCandidateUpgrade];
      const upgrades = generateCubeUpgradeProposals(
        "titou_tribal",
        catalog,
        mockMeta,
        undefined,
        releaseMap,
        benchmarkMap,
      );

      const proposal = upgrades["Shocking Strike"];
      expect(proposal?.metaAddedValue).toBeDefined();
      expect(proposal?.metaAddedValue.strategicRole).toBeTruthy();
      expect(proposal?.metaAddedValue.summary).toContain("Rakdos Gobelins Aggro & Burn");
      expect(proposal?.metaAddedValue.affectedArchetypes).toContain("Rakdos Gobelins Aggro & Burn");
      expect(proposal?.metaAddedValue.benchmarkPresence).toContain("MTGO Vintage Cube");
      expect(proposal?.metaAddedValue.releaseContext).toContain("2024");
    });
  });

  describe("AI Maybeboard Generation", () => {
    it("generates a ranked list of suggestions reinforcing cube archetypes", () => {
      const catalog = [mockTargetCard, mockCandidateUpgrade];
      const maybeboard: readonly MaybeboardSuggestion[] = generateCubeMaybeboard(
        "titou_tribal",
        catalog,
        mockMeta,
      );

      expect(maybeboard.length).toBeGreaterThan(0);
      const firstSuggestion = maybeboard[0];
      expect(firstSuggestion).toBeDefined();
      if (!firstSuggestion) throw new Error("Expected suggestion");
      expect(firstSuggestion.card.name).toBe("Lightning Bolt");
      expect(firstSuggestion.archetypes).toContain("titou:tribal_goblins");
      expect(firstSuggestion.rationale).toBeTruthy();
    });
  });

  describe("Full Suggestions Report", () => {
    it("builds an integrated report with upgrades and maybeboard", () => {
      const catalog = [mockTargetCard, mockCandidateUpgrade];
      const report = generateCubeSuggestionsReport("titou_tribal", catalog, mockMeta);

      expect(report.cubeKey).toBe("titou_tribal");
      expect(report.stats.totalUpgrades).toBe(1);
      expect(report.stats.totalMaybeboard).toBe(1);
      expect(report.upgrades["Shocking Strike"]).toBeDefined();
      const firstMaybe = report.maybeboard[0];
      expect(firstMaybe).toBeDefined();
      if (!firstMaybe) throw new Error("Expected maybeboard entry");
      expect(firstMaybe.card.name).toBe("Lightning Bolt");
    });

    it("reports diagnostic stats for recent upgrades and benchmark matches", () => {
      const releaseMap = new Map([
        ["lightning bolt", { firstPrintYear: 2024, isRecent: true, set: "MH3", rarity: "rare" }],
      ]);
      const benchmarkMap = new Map([["lightning bolt", ["MTGO Vintage Cube"]]]);
      const catalog = [mockTargetCard, mockCandidateUpgrade];
      const report = generateCubeSuggestionsReport(
        "titou_tribal",
        catalog,
        mockMeta,
        undefined,
        releaseMap,
        benchmarkMap,
      );

      expect(report.stats.recentUpgradesCount).toBe(1);
      expect(report.stats.benchmarkMatchesCount).toBe(1);
    });

    it("strictly enforces tribal coherence on titou_tribal: never replaces a Dragon with a non-Dragon", () => {
      const mockDragonTarget: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "dragon-target",
        name: "Glorybringer",
        cmc: 5,
        typeLine: "Creature — Dragon",
        types: ["Creature"],
        subtypes: ["Dragon"],
        powerScore: {
          score: 15,
          source: "untapped",
          harmonizationDegree: "native",
          confidence: 1,
          updatedAt: "2026-01-01T00:00:00Z",
        },
      };

      const mockHumanWarriorCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "human-cand",
        name: "Gladiolus Amicitia",
        cmc: 5,
        typeLine: "Legendary Creature — Human Warrior",
        types: ["Creature"],
        subtypes: ["Human", "Warrior"],
        powerScore: {
          score: 45,
          source: "untapped",
          harmonizationDegree: "native",
          confidence: 1,
          updatedAt: "2026-01-01T00:00:00Z",
        },
      };

      const mockDragonCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "dragon-cand",
        name: "Bonehoard Dracosaur",
        cmc: 5,
        typeLine: "Creature — Dinosaur Dragon",
        types: ["Creature"],
        subtypes: ["Dinosaur", "Dragon"],
        powerScore: {
          score: 40,
          source: "untapped",
          harmonizationDegree: "native",
          confidence: 1,
          updatedAt: "2026-01-01T00:00:00Z",
        },
      };

      // When both are available, non-Dragon is rejected despite higher raw power score
      const catalog = [mockDragonTarget, mockHumanWarriorCandidate, mockDragonCandidate];
      const upgrades = generateCubeUpgradeProposals("titou_tribal", catalog, mockMeta);

      const proposal = upgrades.Glorybringer;
      expect(proposal).toBeDefined();
      expect(proposal?.suggestedCard.name).toBe("Bonehoard Dracosaur");
      expect(proposal?.suggestedCard.name).not.toBe("Gladiolus Amicitia");
    });

    it("rejects Power 9 and vintage fast mana for unpowered cubes", () => {
      const mockWeakSpell: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "weak-spell",
        name: "Aether Spellbomb",
        cmc: 1,
        colors: [],
        typeLine: "Artifact",
        types: ["Artifact"],
        subtypes: [],
      };

      const mockBlackLotus: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "p9-lotus",
        name: "Black Lotus",
        cmc: 0,
        colors: [],
        typeLine: "Artifact",
        types: ["Artifact"],
        subtypes: [],
        powerScore: {
          score: 55,
          source: "untapped",
          harmonizationDegree: "native",
          confidence: 1,
          updatedAt: "2026-01-01T00:00:00Z",
        },
      };

      const catalog = [mockWeakSpell, mockBlackLotus];
      const upgrades = generateCubeUpgradeProposals("titou_tribal", catalog, mockMeta);

      // Black Lotus must NOT be suggested for titou_tribal
      expect(upgrades["Aether Spellbomb"]).toBeUndefined();
    });

    it("strictly excludes cards already in the cube from both AI maybeboard and upgrade proposals", () => {
      const existingInCubeCard: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "already-in-cube",
        name: "Ragavan, Nimble Pilferer",
        presentInCubes: ["titou_tribal"],
        powerScore: {
          score: 55,
          source: "untapped",
          harmonizationDegree: "native",
          confidence: 1,
          updatedAt: "2026-01-01T00:00:00Z",
        },
      };

      const candidateNotInCube: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "not-in-cube",
        name: "Lightning Bolt",
        presentInCubes: ["nico_candyshop"],
        powerScore: {
          score: 50,
          source: "untapped",
          harmonizationDegree: "native",
          confidence: 1,
          updatedAt: "2026-01-01T00:00:00Z",
        },
      };

      const catalog = [mockTargetCard, existingInCubeCard, candidateNotInCube];

      // 1. In upgrades: existingInCubeCard cannot be a suggested upgrade
      const upgrades = generateCubeUpgradeProposals("titou_tribal", catalog, mockMeta);
      for (const proposal of Object.values(upgrades)) {
        expect(proposal.suggestedCard.name).not.toBe("Ragavan, Nimble Pilferer");
        expect(proposal.targetCard.name).not.toBe("Lightning Bolt");
      }

      // 2. In maybeboard: existingInCubeCard cannot be in maybeboard
      const maybeboard = generateCubeMaybeboard("titou_tribal", catalog, mockMeta);
      const maybeNames = maybeboard.map((m) => m.card.name);
      expect(maybeNames).not.toContain("Ragavan, Nimble Pilferer");
      expect(maybeNames).not.toContain("Shocking Strike");
      expect(maybeNames).toContain("Lightning Bolt");
    });
  });
});
