import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateDeck,
  loadLeagueWitnessCorpus,
  validateLeagueCalibration,
  type CardEvaluationInput,
  type CubeEvaluationContext,
  type DeckSynergyProfile,
  type LeagueCalibration,
} from "../../../src/domain/coaching/index.ts";

describe("League Deck Calibration Integration (US1 - FR-002, FR-005, SC-005, SC-006)", () => {
  const leaguePath = path.resolve("tests/fixtures/golden-datasets/powered-vintage/league.json");
  const leagueCalibration = JSON.parse(readFileSync(leaguePath, "utf8")) as LeagueCalibration;

  const testDeck: readonly CardEvaluationInput[] = [
    // 16 Lands
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `plains-${String(i)}`,
      name: "Plains",
      staticScore: 25,
      colors: ["W"] as const,
      isLand: true,
      producesColors: ["W"] as const,
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `island-${String(i)}`,
      name: "Island",
      staticScore: 25,
      colors: ["U"] as const,
      isLand: true,
      producesColors: ["U"] as const,
    })),
    // 24 Spells
    ...Array.from({ length: 24 }, (_, i) => ({
      id: `spell-${String(i)}`,
      name: `Spell ${String(i)}`,
      oracleId: `oracle-spell-${String(i)}`,
      staticScore: 38,
      colors: ["W", "U"] as const,
      cmc: 2,
      types: ["Creature"],
    })),
  ];

  it("validates the loaded powered-vintage league fixture", () => {
    expect(leagueCalibration.leagueId).toBe("powered_vintage");
    expect(leagueCalibration.memberCubes).toContain("arena_powered");
    expect(leagueCalibration.memberCubes).toContain("candyshop");
    expect(() => {
      validateLeagueCalibration(leagueCalibration);
    }).not.toThrow();
  });

  it("evaluates decks from arena_powered and candyshop under the shared league calibration", () => {
    const arenaContext: CubeEvaluationContext = {
      cubeKey: "arena_powered",
      cubeSnapshotId: "2026-09-08",
      leagueId: "powered_vintage",
      bombThreshold: 52,
    };

    const candyshopContext: CubeEvaluationContext = {
      cubeKey: "candyshop",
      cubeSnapshotId: "2026-08-30",
      leagueId: "powered_vintage",
      bombThreshold: 48,
    };

    const evalArena = evaluateDeck(testDeck, {
      leagueCalibration,
      cubeContext: arenaContext,
    });

    const evalCandyshop = evaluateDeck(testDeck, {
      leagueCalibration,
      cubeContext: candyshopContext,
    });

    // Both decks report overall tier calibrated against powered_vintage
    expect(evalArena.audit.leagueId).toBe("powered_vintage");
    expect(evalCandyshop.audit.leagueId).toBe("powered_vintage");
    expect(evalArena.audit.cubeKey).toBe("arena_powered");
    expect(evalCandyshop.audit.cubeKey).toBe("candyshop");

    // Both share the calibration version and status
    expect(evalArena.audit.calibrationVersion).toBe("1.0.0");
    expect(evalCandyshop.audit.calibrationVersion).toBe("1.0.0");
    expect(evalArena.audit.calibrationStatus).toBe("provisional");
    expect(evalCandyshop.audit.calibrationStatus).toBe("provisional");

    // But retain independent cube contexts (different bomb thresholds)
    expect(evalArena.audit.power.bombThreshold).toBe(52);
    expect(evalCandyshop.audit.power.bombThreshold).toBe(48);
  });

  it("retains independent synergy profiles for member cubes (SC-006)", () => {
    const arenaSynergyProfile: DeckSynergyProfile = {
      cubeKey: "arena_powered",
      cubeSnapshotId: "2026-09-08",
      archetypes: [
        {
          id: "azorius_control",
          name: "Azorius Control",
          keyCards: ["oracle-spell-0", "oracle-spell-1"],
          supportCards: ["oracle-spell-2", "oracle-spell-3"],
        },
      ],
    };

    const candyshopSynergyProfile: DeckSynergyProfile = {
      cubeKey: "candyshop",
      cubeSnapshotId: "2026-08-30",
      archetypes: [
        {
          id: "artifact_tempo",
          name: "Artifact Tempo",
          keyCards: ["oracle-spell-10", "oracle-spell-11"],
          supportCards: ["oracle-spell-12"],
        },
      ],
    };

    const evalArena = evaluateDeck(testDeck, {
      leagueCalibration,
      cubeContext: {
        cubeKey: "arena_powered",
        cubeSnapshotId: "2026-09-08",
        leagueId: "powered_vintage",
        synergyProfile: arenaSynergyProfile,
      },
    });

    const evalCandyshop = evaluateDeck(testDeck, {
      leagueCalibration,
      cubeContext: {
        cubeKey: "candyshop",
        cubeSnapshotId: "2026-08-30",
        leagueId: "powered_vintage",
        synergyProfile: candyshopSynergyProfile,
      },
    });

    expect(evalArena.audit.synergy.bestArchetype?.id).toBe("azorius_control");
    expect(evalCandyshop.audit.synergy.bestArchetype?.id).toBe("artifact_tempo");
  });

  it("strictly rejects a non-member cube without fallback", () => {
    const foreignContext: CubeEvaluationContext = {
      cubeKey: "titou_tribal",
      cubeSnapshotId: "2026-02-24.1",
      leagueId: "powered_vintage",
    };

    expect(() =>
      evaluateDeck(testDeck, {
        leagueCalibration,
        cubeContext: foreignContext,
      }),
    ).toThrow(/titou_tribal.*not a member/i);
  });

  it("is strictly deterministic across repeated evaluations (SC-005)", () => {
    const context: CubeEvaluationContext = {
      cubeKey: "arena_powered",
      cubeSnapshotId: "2026-09-08",
      leagueId: "powered_vintage",
    };

    const first = evaluateDeck(testDeck, { leagueCalibration, cubeContext: context });
    const second = evaluateDeck(testDeck, { leagueCalibration, cubeContext: context });

    expect(first.overallScore).toBe(second.overallScore);
    expect(first.overallTier).toBe(second.overallTier);
    expect(first.audit).toEqual(second.audit);
  });

  it("loads and evaluates the real 11 September Arena Powered witness (US2 - FR-010, FR-011, SC-001, SC-002)", () => {
    const witnessCorpusPath = path.resolve(
      "tests/fixtures/golden-datasets/powered-vintage/arena-powered/2026-09-08/corpus.json",
    );
    const corpus = loadLeagueWitnessCorpus(witnessCorpusPath);

    expect(corpus.schemaVersion).toBe(1);
    expect(corpus.draftWitnesses).toHaveLength(1);

    const draft = corpus.draftWitnesses[0];
    expect(draft).toBeDefined();
    if (!draft) return;

    expect(draft.draftId).toBe("bc4cdb9d-6412-43a1-84a2-d66b5dbed559");
    expect(draft.picks).toHaveLength(45);
    expect(new Set(draft.poolCardIds).size).toBe(45);
    expect(draft.finalDeckCardIds).toHaveLength(40);

    const deckWitness = corpus.deckWitnesses[0];
    expect(deckWitness).toBeDefined();
    if (!deckWitness) return;

    expect(deckWitness.expectedTier).toBe("A");
    expect(deckWitness.tierPlacement).toBe("upper");
    expect(deckWitness.hasPowerNine).toBe(false);
    expect(deckWitness.observedResult?.wins).toBe(0);
    expect(deckWitness.observedResult?.losses).toBe(3);

    // Evaluate the real deck through evaluateDeck
    const evalResult = evaluateDeck(draft.deckEvaluationCards, {
      leagueCalibration,
      cubeContext: {
        cubeKey: "arena_powered",
        cubeSnapshotId: "2026-09-08",
        leagueId: "powered_vintage",
      },
    });

    // Without an explicit cube synergy profile, synergy is unmeasured (0) and evaluates to C,
    // demonstrating why independent expert witness annotation (expectedTier: A) is essential for calibration.
    expect(evalResult.overallTier).toBe("C");
    expect(evalResult.audit.leagueId).toBe("powered_vintage");
    expect(evalResult.audit.calibrationVersion).toBe("1.0.0");
  });
});
