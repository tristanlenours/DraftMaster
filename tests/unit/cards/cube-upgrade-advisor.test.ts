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
    activeSnapshotId: "titou_tribal@test",
    archetypes: [
      {
        id: "titou:tribal_goblins",
        name: "Rakdos Gobelins Aggro & Burn",
        primaryColors: ["R"],
        splashColors: ["B"],
        creatureTypes: ["Goblin"],
        keyCards: [],
        supportCards: [],
      },
    ],
  };

  const mockRunContext = {
    generatedAt: "2026-09-20T00:00:00.000Z",
    catalog: {
      id: "test-catalog",
      version: "1",
      sha256: "catalog-hash",
      license: "test-license",
      method: "test-method",
    },
    releaseMetadata: {
      id: "test-releases",
      version: "1",
      sha256: "release-hash",
      license: "test-license",
      method: "test-method",
    },
    benchmarks: {
      id: "test-benchmarks",
      version: "1",
      sha256: "benchmark-hash",
      license: "test-license",
      method: "test-method",
    },
    cubeCobra: {
      id: "test-cubecobra",
      version: "1",
      sha256: "cubecobra-hash",
      license: "test-license",
      method: "test-method",
    },
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

    it("accepts an easier-to-cast mono-color replacement for a multicolor spell", () => {
      const multicolorTarget: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "multicolor-target",
        name: "Rakdos Removal",
        cmc: 2,
        colors: ["B", "R"],
        colorIdentity: ["B", "R"],
        powerScore: { ...mockTargetCard.powerScore, score: 15 },
      };
      const monoColorCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "mono-candidate",
        name: "Efficient Red Removal",
        cmc: 2,
        colors: ["R"],
        colorIdentity: ["R"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "titou_tribal",
        [multicolorTarget, monoColorCandidate],
        mockMeta,
      );

      expect(upgrades[multicolorTarget.name]?.suggestedCard.name).toBe(monoColorCandidate.name);
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

    it("does not let recency outweigh a substantially stronger compatible card", () => {
      const strongerEstablishedCard: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "established-card",
        name: "Established Premium Removal",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 40 },
      };
      const weakerRecentCard: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "recent-card",
        name: "Recent Medium Removal",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 30 },
      };
      const releaseMap = new Map([
        ["established premium removal", { firstPrintYear: 2018, rarity: "rare" }],
        ["recent medium removal", { firstPrintYear: 2026, rarity: "rare" }],
      ]);

      const upgrades = generateCubeUpgradeProposals(
        "cedric_cube",
        [
          { ...mockTargetCard, presentInCubes: ["cedric_cube"] },
          strongerEstablishedCard,
          weakerRecentCard,
        ],
        { ...mockMeta, cubeKey: "cedric_cube" },
        undefined,
        releaseMap,
      );

      expect(upgrades[mockTargetCard.name]?.suggestedCard.name).toBe(strongerEstablishedCard.name);
    });

    it("does not recommend a replacement below the interesting-card score floor", () => {
      const lowQualityCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "low-quality-candidate",
        name: "Marginal Upgrade",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 24 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "cedric_cube",
        [{ ...mockTargetCard, presentInCubes: ["cedric_cube"] }, lowQualityCandidate],
        { ...mockMeta, cubeKey: "cedric_cube" },
      );

      expect(upgrades[mockTargetCard.name]).toBeUndefined();
    });

    it("preserves artifact membership for artifact-synergy creatures", () => {
      const artifactTarget: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "artifact-target",
        name: "Artifact Synergy Target",
        cmc: 4,
        typeLine: "Artifact Creature — Construct",
        types: ["Artifact", "Creature"],
        subtypes: ["Construct"],
        oracleText: "Ward {2}.",
        presentInCubes: ["nico_candyshop"],
      };
      const genericCreature: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "generic-creature",
        name: "Generic Creature",
        cmc: 4,
        typeLine: "Creature — Human Artificer",
        types: ["Creature"],
        subtypes: ["Human", "Artificer"],
        presentInCubes: ["titou_tribal"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 45 },
      };
      const artifactCreature: MasterCatalogCard = {
        ...genericCreature,
        oracleId: "artifact-creature",
        name: "Artifact Creature",
        typeLine: "Artifact Creature — Golem",
        types: ["Artifact", "Creature"],
        subtypes: ["Golem"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "nico_candyshop",
        [artifactTarget, genericCreature, artifactCreature],
        { ...mockMeta, cubeKey: "nico_candyshop" },
      );

      expect(upgrades[artifactTarget.name]?.suggestedCard.name).toBe(artifactCreature.name);
    });

    it("preserves specialized permanent subtypes such as Equipment", () => {
      const equipmentTarget: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "equipment-target",
        name: "Equipment Target",
        cmc: 2,
        colors: [],
        colorIdentity: [],
        typeLine: "Artifact — Equipment",
        types: ["Artifact"],
        subtypes: ["Equipment"],
        oracleText: "Equipped creature gets +1/+1. Equip {1}.",
        presentInCubes: ["cedric_cube"],
      };
      const foodCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "food-candidate",
        name: "Food Candidate",
        cmc: 2,
        colors: [],
        colorIdentity: [],
        typeLine: "Artifact — Food",
        types: ["Artifact"],
        subtypes: ["Food"],
        oracleText: "When this artifact enters, draw a card.",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 45 },
      };
      const equipmentCandidate: MasterCatalogCard = {
        ...foodCandidate,
        oracleId: "equipment-candidate",
        name: "Equipment Candidate",
        typeLine: "Artifact — Equipment",
        subtypes: ["Equipment"],
        oracleText: "Equipped creature gets +2/+2. Equip {1}.",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "cedric_cube",
        [equipmentTarget, foodCandidate, equipmentCandidate],
        { ...mockMeta, cubeKey: "cedric_cube" },
      );

      expect(upgrades[equipmentTarget.name]?.suggestedCard.name).toBe(equipmentCandidate.name);
    });

    it("prefers the same rules function for noncreature spell replacements", () => {
      const manaTarget: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "mana-target",
        name: "Mana Ritual Target",
        cmc: 2,
        colors: ["B"],
        colorIdentity: ["B"],
        oracleText: "Add {B}{B}{B}.",
        presentInCubes: ["nico_candyshop"],
      };
      const unrelatedRemoval: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "unrelated-removal",
        name: "Unrelated Removal",
        cmc: 2,
        colors: ["B"],
        colorIdentity: ["B"],
        oracleText: "Destroy target creature.",
        presentInCubes: ["titou_tribal"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 45 },
      };
      const manaCandidate: MasterCatalogCard = {
        ...unrelatedRemoval,
        oracleId: "mana-candidate",
        name: "Mana Ritual Candidate",
        oracleText: "Add {B}{B}{B}{B}.",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "nico_candyshop",
        [manaTarget, unrelatedRemoval, manaCandidate],
        { ...mockMeta, cubeKey: "nico_candyshop" },
      );

      expect(upgrades[manaTarget.name]?.suggestedCard.name).toBe(manaCandidate.name);
    });

    it.each([
      ["blink", "Exile target creature you control, then return it to the battlefield."],
      ["card selection", "Draw a card, then scry 1."],
      ["counterspell", "Counter target spell."],
      ["discard", "Target player discards a card."],
      ["mana", "Add {G}{G}."],
      ["reanimation", "Return target creature card from your graveyard to the battlefield."],
      ["removal", "Destroy target creature."],
      ["tokens", "Create a 1/1 white Soldier creature token."],
    ])("preserves the %s Oracle function", (_label, oracleText) => {
      const target: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: `function-target-${_label}`,
        name: `Function Target ${_label}`,
        oracleText,
        presentInCubes: ["nico_candyshop"],
      };
      const incompatibleText =
        _label === "discard" ? "Destroy target creature." : "Target player discards a card.";
      const incompatible: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: `function-incompatible-${_label}`,
        name: `Function Incompatible ${_label}`,
        oracleText: incompatibleText,
        presentInCubes: ["titou_tribal"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 45 },
      };
      const compatible: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: `function-compatible-${_label}`,
        name: `Function Compatible ${_label}`,
        oracleText,
        presentInCubes: ["titou_tribal"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "nico_candyshop",
        [target, incompatible, compatible],
        { ...mockMeta, cubeKey: "nico_candyshop" },
      );

      expect(upgrades[target.name]?.suggestedCard.name).toBe(compatible.name);
    });

    it.each([
      ["Aura", "Enchantment"],
      ["Class", "Enchantment"],
      ["Clue", "Artifact"],
      ["Equipment", "Artifact"],
      ["Food", "Artifact"],
      ["Map", "Artifact"],
      ["Saga", "Enchantment"],
      ["Treasure", "Artifact"],
      ["Vehicle", "Artifact"],
    ])("preserves the %s specialized subtype", (subtype, structuralType) => {
      const target: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: `subtype-target-${subtype}`,
        name: `Subtype Target ${subtype}`,
        colors: [],
        colorIdentity: [],
        typeLine: `${structuralType} — ${subtype}`,
        types: [structuralType],
        subtypes: [subtype],
        oracleText: "Ward {1}.",
        presentInCubes: ["cedric_cube"],
      };
      const incompatible: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: `subtype-incompatible-${subtype}`,
        name: `Subtype Incompatible ${subtype}`,
        colors: [],
        colorIdentity: [],
        typeLine: structuralType,
        types: [structuralType],
        subtypes: [],
        oracleText: "Ward {2}.",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 45 },
      };
      const compatible: MasterCatalogCard = {
        ...incompatible,
        oracleId: `subtype-compatible-${subtype}`,
        name: `Subtype Compatible ${subtype}`,
        typeLine: `${structuralType} — ${subtype}`,
        subtypes: [subtype],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "cedric_cube",
        [target, incompatible, compatible],
        { ...mockMeta, cubeKey: "cedric_cube" },
      );

      expect(upgrades[target.name]?.suggestedCard.name).toBe(compatible.name);
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

    it("prefers a candidate that preserves the target's functional role", () => {
      const removalTarget: MasterCatalogCard = {
        ...mockTargetCard,
        objectiveAnalysis: {
          ...mockTargetCard.objectiveAnalysis,
          roles: ["situational_removal"],
        },
      };
      const strongerButDifferentRole: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "different-role",
        name: "Raw Card Draw",
        cmc: 2,
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 38 },
        objectiveAnalysis: {
          ...mockCandidateUpgrade.objectiveAnalysis,
          roles: ["card_advantage"],
        },
      };
      const alignedRemoval: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "aligned-role",
        name: "Reliable Removal",
        cmc: 2,
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
        objectiveAnalysis: {
          ...mockCandidateUpgrade.objectiveAnalysis,
          roles: ["premium_removal"],
        },
      };

      const upgrades = generateCubeUpgradeProposals(
        "titou_tribal",
        [removalTarget, strongerButDifferentRole, alignedRemoval],
        mockMeta,
      );

      expect(upgrades[removalTarget.name]?.suggestedCard.name).toBe(alignedRemoval.name);
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
    it("honors maxSuggestions even when more direct replacements are available", () => {
      const secondCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "second-candidate",
        name: "Second Candidate",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const maybeboard = generateCubeMaybeboard(
        "titou_tribal",
        [mockTargetCard, mockCandidateUpgrade, secondCandidate],
        mockMeta,
        undefined,
        undefined,
        undefined,
        1,
      );

      expect(maybeboard).toHaveLength(1);
    });

    it("reserves part of the maybeboard for recent discoveries beyond direct replacements", () => {
      const targetFor = (name: string, color: "R" | "U" | "G"): MasterCatalogCard => ({
        ...mockTargetCard,
        oracleId: `${name}-target`,
        name: `${name} Target`,
        colors: [color],
        colorIdentity: [color],
        presentInCubes: ["cedric_cube"],
      });
      const candidateFor = (name: string, color: "R" | "U" | "G"): MasterCatalogCard => ({
        ...mockCandidateUpgrade,
        oracleId: `${name}-candidate`,
        name: `${name} Candidate`,
        colors: [color],
        colorIdentity: [color],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 40 },
      });
      const targets = [targetFor("Red", "R"), targetFor("Blue", "U"), targetFor("Green", "G")];
      const directCandidates = [
        candidateFor("Red", "R"),
        candidateFor("Blue", "U"),
        candidateFor("Green", "G"),
      ];
      const recentDiscovery: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "recent-discovery",
        name: "Recent Discovery",
        colors: ["W"],
        colorIdentity: ["W"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };
      const releaseMap = new Map<string, { firstPrintYear: number; rarity: string }>([
        ...directCandidates.map(
          (card) => [card.name.toLowerCase(), { firstPrintYear: 2020, rarity: "rare" }] as const,
        ),
        ["recent discovery", { firstPrintYear: 2026, rarity: "rare" }] as const,
      ]);
      const catalog = [...targets, ...directCandidates, recentDiscovery];
      const meta = { ...mockMeta, cubeKey: "cedric_cube" };
      const upgrades = generateCubeUpgradeProposals(
        "cedric_cube",
        catalog,
        meta,
        undefined,
        releaseMap,
      );

      const maybeboard = generateCubeMaybeboard(
        "cedric_cube",
        catalog,
        meta,
        undefined,
        releaseMap,
        undefined,
        3,
        upgrades,
      );

      expect(maybeboard).toHaveLength(3);
      expect(maybeboard.map((suggestion) => suggestion.card.name)).toContain(recentDiscovery.name);
    });

    it("does not let the discovery reserve evict a substantially stronger established card", () => {
      const established: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "established-discovery",
        name: "Established Discovery",
        colors: ["W"],
        colorIdentity: ["W"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 40 },
      };
      const weakerRecent: MasterCatalogCard = {
        ...established,
        oracleId: "weaker-recent-discovery",
        name: "Weaker Recent Discovery",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 25 },
      };
      const releaseMap = new Map([
        ["established discovery", { firstPrintYear: 2020, rarity: "rare" }],
        ["weaker recent discovery", { firstPrintYear: 2026, rarity: "rare" }],
      ]);

      const maybeboard = generateCubeMaybeboard(
        "cedric_cube",
        [established, weakerRecent],
        { ...mockMeta, cubeKey: "cedric_cube" },
        undefined,
        releaseMap,
        undefined,
        1,
      );

      expect(maybeboard.map((suggestion) => suggestion.card.name)).toEqual([established.name]);
    });

    it("uses a rolling three-year window anchored to the newest release metadata", () => {
      const releaseMap = new Map([
        ["lightning bolt", { firstPrintYear: 2023, rarity: "rare" }],
        ["recent discovery", { firstPrintYear: 2026, rarity: "rare" }],
      ]);
      const recentDiscovery: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "rolling-window-recent",
        name: "Recent Discovery",
        colors: ["W"],
        colorIdentity: ["W"],
      };

      const maybeboard = generateCubeMaybeboard(
        "cedric_cube",
        [mockCandidateUpgrade, recentDiscovery],
        { ...mockMeta, cubeKey: "cedric_cube" },
        undefined,
        releaseMap,
      );

      expect(maybeboard.find((item) => item.card.name === "Lightning Bolt")?.isRecent).toBe(false);
      expect(maybeboard.find((item) => item.card.name === "Recent Discovery")?.isRecent).toBe(true);
    });

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

    it("keeps creatures from the cube's declared tribes and excludes unrelated tribes", () => {
      const unrelatedMerfolk: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "merfolk-candidate",
        name: "Unrelated Merfolk",
        cmc: 2,
        typeLine: "Creature — Merfolk Scout",
        types: ["Creature"],
        subtypes: ["Merfolk", "Scout"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 50 },
      };
      const goblinCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "goblin-candidate",
        name: "Relevant Goblin",
        cmc: 2,
        typeLine: "Creature — Goblin Scout",
        types: ["Creature"],
        subtypes: ["Goblin", "Scout"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const maybeboard = generateCubeMaybeboard(
        "titou_tribal",
        [mockTargetCard, unrelatedMerfolk, goblinCandidate],
        mockMeta,
      );
      const names = maybeboard.map((suggestion) => suggestion.card.name);

      expect(names).toContain("Relevant Goblin");
      expect(names).not.toContain("Unrelated Merfolk");
    });

    it("matches a tribal creature only to archetypes that support its creature type", () => {
      const goblinCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "focused-goblin-candidate",
        name: "Focused Goblin",
        cmc: 2,
        typeLine: "Creature — Goblin Scout",
        types: ["Creature"],
        subtypes: ["Goblin", "Scout"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };
      const metaWithWizard = {
        ...mockMeta,
        archetypes: [
          ...mockMeta.archetypes,
          {
            id: "titou:tribal_wizards",
            name: "Izzet Sorciers Spells & Tempo",
            primaryColors: ["R", "U"],
            creatureTypes: ["Wizard"],
            keyCards: [],
            supportCards: [],
          },
        ],
      };

      const maybeboard = generateCubeMaybeboard(
        "titou_tribal",
        [mockTargetCard, goblinCandidate],
        metaWithWizard,
      );
      const suggestion = maybeboard.find((item) => item.card.name === goblinCandidate.name);

      expect(suggestion?.archetypes).toEqual(["titou:tribal_goblins"]);
    });
  });

  describe("Full Suggestions Report", () => {
    it("exposes the advisor version, cube snapshot, and benchmark source coverage", () => {
      const catalog = [mockTargetCard, mockCandidateUpgrade];
      const benchmarkMap = new Map([
        ["lightning bolt", ["MTGO Vintage Cube"]],
        ["missing benchmark card", ["Tribal Synergy Cube"]],
      ]);
      const report = generateCubeSuggestionsReport(
        "titou_tribal",
        catalog,
        { ...mockMeta, activeSnapshotId: "titou_tribal@test" },
        undefined,
        undefined,
        benchmarkMap,
        mockRunContext,
      );

      expect(report.schemaVersion).toBe(2);
      expect(report.engineVersion).toBe("cube-upgrade-advisor@3");
      expect(report.snapshotId).toBe("titou_tribal@test");
      expect(report.generatedAt).toBe(mockRunContext.generatedAt);
      expect(report.sourceProvenance).toEqual({
        ...mockRunContext,
        recentWindow: { years: 3, referenceYear: null, earliestYear: null },
      });
      expect(report.sourceCoverage).toEqual({
        catalogCards: 2,
        availableCandidates: 1,
        benchmarkCards: 2,
        benchmarkCardsInCatalog: 1,
        missingBenchmarkCards: 1,
        benchmarkCoveragePercentage: 50,
      });
    });

    it("builds an integrated report with upgrades and maybeboard", () => {
      const catalog = [mockTargetCard, mockCandidateUpgrade];
      const report = generateCubeSuggestionsReport(
        "titou_tribal",
        catalog,
        mockMeta,
        undefined,
        undefined,
        undefined,
        mockRunContext,
      );

      expect(report.cubeKey).toBe("titou_tribal");
      expect(report.stats.totalUpgrades).toBe(1);
      expect(report.stats.totalMaybeboard).toBe(1);
      expect(report.upgrades["Shocking Strike"]).toBeDefined();
      expect(report.upgrades["Shocking Strike"]?.rankingFactors).toContainEqual({
        key: "power",
        points: 54,
      });
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
        mockRunContext,
      );

      expect(report.stats.recentUpgradesCount).toBe(1);
      expect(report.stats.benchmarkMatchesCount).toBe(1);
      expect(report.stats.recentMaybeboardCount).toBe(1);
      expect(report.stats.directReplacementMaybeboardCount).toBe(1);
      expect(report.sourceProvenance.recentWindow).toEqual({
        years: 3,
        referenceYear: 2024,
        earliestYear: 2022,
      });
    });

    it("rejects reports without a bound snapshot or source provenance", () => {
      const catalog = [mockTargetCard, mockCandidateUpgrade];

      expect(() =>
        generateCubeSuggestionsReport(
          "titou_tribal",
          catalog,
          { ...mockMeta, activeSnapshotId: undefined },
          undefined,
          undefined,
          undefined,
          mockRunContext,
        ),
      ).toThrow("Missing active snapshot ID");
      expect(() =>
        generateCubeSuggestionsReport(
          "titou_tribal",
          catalog,
          mockMeta,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ).toThrow("Missing source provenance");
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
      const metaWithDragons = {
        ...mockMeta,
        archetypes: [
          ...mockMeta.archetypes,
          {
            id: "titou:tribal_dragons",
            name: "Temur Dragons Ramp",
            primaryColors: ["R", "G", "U"],
            creatureTypes: ["Dragon"],
            keyCards: [],
            supportCards: [],
          },
        ],
      };
      const upgrades = generateCubeUpgradeProposals("titou_tribal", catalog, metaWithDragons);

      const proposal = upgrades.Glorybringer;
      expect(proposal).toBeDefined();
      expect(proposal?.suggestedCard.name).toBe("Bonehoard Dracosaur");
      expect(proposal?.suggestedCard.name).not.toBe("Gladiolus Amicitia");
    });

    it("preserves an explicitly named tribe on noncreature replacements", () => {
      const goblinSpellTarget: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "goblin-spell-target",
        name: "Goblin Spell Target",
        oracleText: "Goblin creatures you control get +1/+0 until end of turn.",
      };
      const strongerElfSpell: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "elf-spell-candidate",
        name: "Elf Spell Candidate",
        oracleText: "Elf creatures you control get +2/+2 until end of turn.",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 45 },
      };
      const goblinSpellCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "goblin-spell-candidate",
        name: "Goblin Spell Candidate",
        oracleText: "Goblin creatures you control get +2/+0 until end of turn.",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "titou_tribal",
        [goblinSpellTarget, strongerElfSpell, goblinSpellCandidate],
        mockMeta,
      );

      expect(upgrades[goblinSpellTarget.name]?.suggestedCard.name).toBe(goblinSpellCandidate.name);
    });

    it("preserves universal tribal glue instead of replacing a Changeling with an unrelated creature", () => {
      const changelingTarget: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "changeling-target",
        name: "Avian Changeling",
        cmc: 2,
        colors: ["W"],
        colorIdentity: ["W"],
        typeLine: "Creature — Shapeshifter",
        types: ["Creature"],
        subtypes: ["Shapeshifter"],
        oracleText: "Changeling (This card is every creature type.)",
        powerScore: { ...mockTargetCard.powerScore, score: 12 },
      };
      const unrelatedCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "cat-candidate",
        name: "Ajani, Nacatl Pariah",
        cmc: 2,
        colors: ["W"],
        colorIdentity: ["W"],
        typeLine: "Legendary Creature — Cat Warrior",
        types: ["Creature"],
        subtypes: ["Cat", "Warrior"],
        oracleText: "When Ajani enters, create a Cat token.",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 49 },
      };
      const changelingCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "changeling-candidate",
        name: "Mirror Entity",
        cmc: 3,
        colors: ["W"],
        colorIdentity: ["W"],
        typeLine: "Creature — Shapeshifter",
        types: ["Creature"],
        subtypes: ["Shapeshifter"],
        oracleText: "Changeling (This card is every creature type.)",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "titou_tribal",
        [changelingTarget, unrelatedCandidate, changelingCandidate],
        mockMeta,
      );

      expect(upgrades[changelingTarget.name]?.suggestedCard.name).toBe("Mirror Entity");
    });

    it("does not treat an opposing tribal hoser as universal tribal glue", () => {
      const goblinTarget: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "goblin-lord-target",
        name: "Goblin Lord Target",
        typeLine: "Creature — Goblin Shaman",
        types: ["Creature"],
        subtypes: ["Goblin", "Shaman"],
        oracleText: "Other Goblins you control get +1/+1.",
      };
      const tribalHoser: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "tribal-hoser",
        name: "Tribal Hoser",
        cmc: 2,
        typeLine: "Creature — Phyrexian Carrier",
        types: ["Creature"],
        subtypes: ["Phyrexian", "Carrier"],
        oracleText:
          "As this creature enters, choose a creature type. Creatures of the chosen type your opponents control get -1/-1.",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 45 },
      };
      const goblinCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "goblin-candidate",
        name: "Goblin Candidate",
        cmc: 2,
        typeLine: "Creature — Goblin Warrior",
        types: ["Creature"],
        subtypes: ["Goblin", "Warrior"],
        oracleText: "Haste",
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "titou_tribal",
        [goblinTarget, tribalHoser, goblinCandidate],
        mockMeta,
      );

      expect(upgrades[goblinTarget.name]?.suggestedCard.name).toBe(goblinCandidate.name);
    });

    it("preserves every produced mana color when replacing a land", () => {
      const fiveColorTarget: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "five-color-target",
        name: "Mana Confluence",
        cmc: 0,
        colors: [],
        colorIdentity: [],
        typeLine: "Land",
        types: ["Land"],
        subtypes: [],
        oracleText: "{T}, Pay 1 life: Add one mana of any color.",
        isLand: true,
        producesColors: ["W", "U", "B", "R", "G"],
        powerScore: { ...mockTargetCard.powerScore, score: 15 },
        objectiveAnalysis: {
          ...mockTargetCard.objectiveAnalysis,
          roles: ["mana_fixing"],
        },
      };
      const narrowCandidate: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "narrow-land",
        name: "Commercial District",
        cmc: 0,
        colors: [],
        colorIdentity: ["R", "G"],
        typeLine: "Land — Mountain Forest",
        types: ["Land"],
        subtypes: ["Mountain", "Forest"],
        oracleText: "{T}: Add {R} or {G}.",
        isLand: true,
        producesColors: ["R", "G"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 45 },
      };
      const fiveColorCandidate: MasterCatalogCard = {
        ...narrowCandidate,
        oracleId: "five-color-land",
        name: "City of Brass",
        colorIdentity: [],
        subtypes: [],
        oracleText: "{T}: Add one mana of any color.",
        producesColors: ["W", "U", "B", "R", "G"],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 35 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "titou_tribal",
        [fiveColorTarget, narrowCandidate, fiveColorCandidate],
        mockMeta,
      );

      expect(upgrades[fiveColorTarget.name]?.suggestedCard.name).toBe("City of Brass");
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

    it("allows Power 9 candidates for the canonical powered cube key", () => {
      const mockWeakArtifact: MasterCatalogCard = {
        ...mockTargetCard,
        oracleId: "powered-target",
        name: "Weak Powered Artifact",
        cmc: 1,
        colors: [],
        colorIdentity: [],
        typeLine: "Artifact",
        types: ["Artifact"],
        subtypes: [],
        presentInCubes: ["nico_candyshop"],
        cubeAnalyses: {},
      };
      const mockBlackLotus: MasterCatalogCard = {
        ...mockCandidateUpgrade,
        oracleId: "powered-lotus",
        name: "Black Lotus",
        cmc: 0,
        colors: [],
        colorIdentity: [],
        typeLine: "Artifact",
        types: ["Artifact"],
        subtypes: [],
        presentInCubes: [],
        powerScore: { ...mockCandidateUpgrade.powerScore, score: 55 },
      };

      const upgrades = generateCubeUpgradeProposals(
        "nico_candyshop",
        [mockWeakArtifact, mockBlackLotus],
        { cubeKey: "nico_candyshop", archetypes: [] },
      );

      expect(upgrades["Weak Powered Artifact"]?.suggestedCard.name).toBe("Black Lotus");
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
