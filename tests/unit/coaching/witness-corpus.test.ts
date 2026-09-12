import { describe, expect, it } from "vitest";
import {
  validateLeagueWitnessCorpusJson,
  type DeckWitness,
  type DraftWitness,
  type LeagueWitnessCorpus,
} from "../../../src/domain/coaching/index.ts";

describe("Witness Corpus Unit Tests (US2 & US3)", () => {
  function createValidCorpusFixture(): LeagueWitnessCorpus {
    const cardIdentities: Record<
      string,
      { id: string; name: string; colors: ("W" | "U")[]; cmc: number; isLand: boolean }
    > = {};
    const deckEvaluationCards = [];
    const poolCardIds: string[] = [];
    const picks = [];

    // Create 45 distinct cards
    for (let i = 1; i <= 45; i++) {
      const id = `card-${String(i)}`;
      poolCardIds.push(id);
      cardIdentities[id] = {
        id,
        name: `Test Card ${String(i)}`,
        colors: ["W", "U"],
        cmc: 2,
        isLand: false,
      };
    }

    // Basic lands for 40-card deck
    for (let i = 46; i <= 50; i++) {
      const id = `land-${String(i)}`;
      cardIdentities[id] = {
        id,
        name: `Land ${String(i)}`,
        colors: ["W"],
        cmc: 0,
        isLand: true,
      };
    }

    // 45 picks across 3 packs
    let cardIdx = 0;
    for (let pack = 1; pack <= 3; pack++) {
      for (let pick = 1; pick <= 15; pick++) {
        const remaining = 16 - pick;
        const pickedId = poolCardIds[cardIdx++] ?? "";
        const offered = [pickedId];
        for (let o = 1; o < remaining; o++) {
          offered.push(`dummy-${String(pack)}-${String(pick)}-${String(o)}`);
        }
        picks.push({
          packNumber: pack,
          pickNumber: pick,
          offeredCardIds: offered,
          pickedCardId: pickedId,
        });
      }
    }

    // 40 cards in final deck (25 drafted spells + 15 basic lands)
    const finalDeckCardIds = [
      ...poolCardIds.slice(0, 25),
      ...Array.from({ length: 15 }, () => "land-46"),
    ];
    for (const cardId of finalDeckCardIds) {
      const ident = cardIdentities[cardId];
      if (!ident) continue;
      deckEvaluationCards.push({
        id: cardId,
        name: ident.name,
        staticScore: 35,
        colors: ident.colors,
        cmc: ident.cmc,
        isLand: ident.isLand,
      });
    }

    const draftWitness: DraftWitness = {
      draftId: "bc4cdb9d-6412-43a1-84a2-d66b5dbed559",
      source: "mtga_untapped",
      startedAt: "2026-09-11T20:00:00.000Z",
      leagueId: "powered_vintage",
      cubeKey: "arena_powered",
      cubeSnapshotId: "2026-09-08",
      picks,
      poolCardIds,
      finalDeckCardIds,
      sideboardCardIds: poolCardIds.slice(25),
      cardIdentities,
      deckEvaluationCards,
      observedResults: {
        wins: 0,
        losses: 3,
        matchCount: 3,
      },
      provenance: {
        extractedAt: "2026-09-12T10:00:00.000Z",
        method: "scripts/import-arena-witness.mjs",
        sourceHashes: {
          untappedDrafts: "sha256:abc123",
          playerLog: "sha256:def456",
        },
      },
    };

    return {
      schemaVersion: 1,
      corpusId: "arena-powered-2026-09-08-corpus",
      corpusVersion: "1.0.0",
      leagueCalibration: {
        leagueId: "powered_vintage",
        calibrationVersion: "1.0.0",
        status: "provisional",
        memberCubes: ["arena_powered", "candyshop"],
        tierThresholds: { S: 90, A: 80, B: 70, C: 60 },
        readinessPolicy: {
          minWitnessesPerTier: 3,
          minDraftWitnessesPerCube: 10,
          minDeckWitnessesPerCube: 15,
        },
      },
      cubes: [
        {
          cubeKey: "arena_powered",
          snapshotId: "2026-09-08",
          name: "Arena Powered Cube",
        },
      ],
      draftWitnesses: [draftWitness],
      deckWitnesses: [
        {
          deckWitnessId: "deck-bc4cdb9d",
          draftId: "bc4cdb9d-6412-43a1-84a2-d66b5dbed559",
          leagueId: "powered_vintage",
          cubeKey: "arena_powered",
          cubeSnapshotId: "2026-09-08",
          expectedTier: "A",
          tierPlacement: "upper",
          annotation: {
            author: "Tristan",
            role: "expert",
            reviewedAt: "2026-09-12T08:00:00.000Z",
            rationale: "High quality Azorius tempo/control deck without Power Nine",
            strengths: ["Strong curve", "Solid interaction"],
            weaknesses: ["No Power Nine"],
            confidence: "high",
          },
          hasPowerNine: false,
          observedResult: {
            wins: 0,
            losses: 3,
            matchCount: 3,
          },
          usagePolicy: "evaluation_only",
        },
      ],
      provenance: {
        extractedAt: "2026-09-12T10:00:00.000Z",
        method: "scripts/import-arena-witness.mjs",
        sourceHashes: {
          untappedDrafts: "sha256:abc123",
          playerLog: "sha256:def456",
        },
      },
      usagePolicy: "evaluation_only",
    };
  }

  function getFirstDraftWitness(corpus: LeagueWitnessCorpus): DraftWitness {
    const draft = corpus.draftWitnesses[0];
    if (!draft) {
      throw new Error("Fixture missing draftWitnesses[0]");
    }
    return draft;
  }

  function getFirstDeckWitness(corpus: LeagueWitnessCorpus): DeckWitness {
    const deck = corpus.deckWitnesses[0];
    if (!deck) {
      throw new Error("Fixture missing deckWitnesses[0]");
    }
    return deck;
  }

  it("accepts a well-formed corpus fixture and returns deeply immutable data", () => {
    const fixture = createValidCorpusFixture();
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(fixture));

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.schemaVersion).toBe(1);
    expect(result.data.draftWitnesses[0]?.picks).toHaveLength(45);
    expect(result.data.draftWitnesses[0]?.finalDeckCardIds).toHaveLength(40);
    expect(Object.isFrozen(result.data)).toBe(true);
    expect(Object.isFrozen(result.data.draftWitnesses[0])).toBe(true);
  });

  it("rejects invalid JSON string", () => {
    const result = validateLeagueWitnessCorpusJson("invalid { json");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => e.code === "INVALID_JSON")).toBe(true);
  });

  it("rejects invalid schema version", () => {
    const fixture = { ...createValidCorpusFixture(), schemaVersion: 2 };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(fixture));
    expect(result.success).toBe(false);
  });

  it("rejects forbidden unknown identity-bearing fields (privacy check FR-009, SC-004)", () => {
    const withPlayerId = {
      ...createValidCorpusFixture(),
      playerId: "secret-account-id-123",
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(withPlayerId));
    expect(result.success).toBe(false);
  });

  it("rejects invalid expectedTier (e.g. A+ is forbidden by FR-004)", () => {
    const fixture = createValidCorpusFixture();
    const deck = getFirstDeckWitness(fixture);
    const badTier = {
      ...fixture,
      deckWitnesses: [
        {
          ...deck,
          expectedTier: "A+",
        },
      ],
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(badTier));
    expect(result.success).toBe(false);
  });

  it("rejects pick order that is not strictly P1P1..P3P15 with decreasing pack sizes", () => {
    const fixture = createValidCorpusFixture();
    const draft = getFirstDraftWitness(fixture);
    const badPicks = [...draft.picks];
    // Swap pick 1 and pick 2
    const first = badPicks[0];
    const second = badPicks[1];
    if (!first || !second) throw new Error("Missing picks");
    badPicks[0] = second;
    badPicks[1] = first;

    const modified = {
      ...fixture,
      draftWitnesses: [{ ...draft, picks: badPicks }],
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(modified));
    expect(result.success).toBe(false);
  });

  it("rejects when picked card is not in offeredCardIds", () => {
    const fixture = createValidCorpusFixture();
    const draft = getFirstDraftWitness(fixture);
    const badPicks = draft.picks.map((p, idx) =>
      idx === 0 ? { ...p, pickedCardId: "not-offered-card" } : p,
    );
    const modified = {
      ...fixture,
      draftWitnesses: [{ ...draft, picks: badPicks }],
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(modified));
    expect(result.success).toBe(false);
  });

  it("rejects finalDeckCardIds count different from 40", () => {
    const fixture = createValidCorpusFixture();
    const draft = getFirstDraftWitness(fixture);
    const shortDeck = draft.finalDeckCardIds.slice(0, 39);
    const modified = {
      ...fixture,
      draftWitnesses: [{ ...draft, finalDeckCardIds: shortDeck }],
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(modified));
    expect(result.success).toBe(false);
  });

  it("rejects when deckEvaluationCards is missing any final deck card (offline resolution FR-008)", () => {
    const fixture = createValidCorpusFixture();
    const draft = getFirstDraftWitness(fixture);
    const incompleteEvaluationCards = draft.deckEvaluationCards.slice(0, 39);
    const modified = {
      ...fixture,
      draftWitnesses: [{ ...draft, deckEvaluationCards: incompleteEvaluationCards }],
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(modified));
    expect(result.success).toBe(false);
  });

  it("rejects forbidden opponent identity fields in draft witness or observed result (FR-009, SC-004)", () => {
    const fixture = createValidCorpusFixture();
    const draft = getFirstDraftWitness(fixture);
    const observed = draft.observedResults;
    if (!observed) throw new Error("Missing observedResults");
    const withOpponent = {
      ...fixture,
      draftWitnesses: [
        {
          ...draft,
          observedResults: {
            ...observed,
            opponentName: "PlayerOne#12345",
          },
        },
      ],
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(withOpponent));
    expect(result.success).toBe(false);
  });

  it("rejects usage-policy leakage when an evaluation_only corpus contains training_allowed witness (FR-012)", () => {
    const fixture = createValidCorpusFixture();
    const deck = getFirstDeckWitness(fixture);
    const leakyCorpus = {
      ...fixture,
      usagePolicy: "evaluation_only",
      deckWitnesses: [
        {
          ...deck,
          usagePolicy: "training_allowed",
        },
      ],
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(leakyCorpus));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => e.code === "USAGE_POLICY_LEAKAGE")).toBe(true);
  });

  it("rejects witness when leagueId does not match corpus leagueCalibration.leagueId (FR-017)", () => {
    const fixture = createValidCorpusFixture();
    const draft = getFirstDraftWitness(fixture);
    const mismatchedLeague = {
      ...fixture,
      draftWitnesses: [
        {
          ...draft,
          leagueId: "other_league",
        },
      ],
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(mismatchedLeague));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => e.code === "LEAGUE_MISMATCH")).toBe(true);
  });

  it("rejects witness when cubeKey is not declared in memberCubes (FR-017)", () => {
    const fixture = createValidCorpusFixture();
    const deck = getFirstDeckWitness(fixture);
    const rogueCube = {
      ...fixture,
      deckWitnesses: [
        {
          ...deck,
          cubeKey: "titou_tribal",
        },
      ],
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(rogueCube));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => e.code === "CUBE_NOT_IN_LEAGUE")).toBe(true);
  });

  it("enforces deep immutability on loaded corpus and nested structures (SC-005)", () => {
    const fixture = createValidCorpusFixture();
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(fixture));
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(() => {
      // @ts-expect-error mutating frozen object
      result.data.corpusId = "mutated";
    }).toThrow(TypeError);

    expect(() => {
      // @ts-expect-error mutating frozen nested object
      result.data.draftWitnesses[0].picks[0].packNumber = 99;
    }).toThrow(TypeError);

    expect(() => {
      // @ts-expect-error mutating frozen nested object
      result.data.deckWitnesses[0].annotation.author = "Hacker";
    }).toThrow(TypeError);
  });

  it("rejects declared evidenceCounts mismatching actual witnesses in corpus (FR-014, SC-008)", () => {
    const fixture = createValidCorpusFixture();
    const wrongCounts = {
      ...fixture,
      leagueCalibration: {
        ...fixture.leagueCalibration,
        evidenceCounts: {
          tierCoverage: { S: 5, A: 1, B: 0, C: 0, D: 0 }, // S says 5, but there are 0 in deckWitnesses
          draftsByCube: { arena_powered: 1, candyshop: 0 },
          decksByCube: { arena_powered: 1, candyshop: 0 },
        },
      },
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(wrongCounts));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.some((e) => e.code === "EVIDENCE_COUNTS_MISMATCH")).toBe(true);
  });

  it("rejects ready status when corpus witnesses do not meet policy minimums (FR-014, SC-008)", () => {
    const fixture = createValidCorpusFixture();
    const falseReady = {
      ...fixture,
      leagueCalibration: {
        ...fixture.leagueCalibration,
        status: "ready" as const, // only 1 deck witness in fixture!
      },
    };
    const result = validateLeagueWitnessCorpusJson(JSON.stringify(falseReady));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.errors.some(
        (e) => e.code === "INVALID_CALIBRATION_STATUS" || e.code === "SCHEMA_VALIDATION_FAILED",
      ),
    ).toBe(true);
  });

  it("loads and validates the corpus in under 500 ms budget (Plan Performance Goals)", () => {
    const fixture = createValidCorpusFixture();
    const raw = JSON.stringify(fixture);

    const start = performance.now();
    const result = validateLeagueWitnessCorpusJson(raw);
    const elapsed = performance.now() - start;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });
});
