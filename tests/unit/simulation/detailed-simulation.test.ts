import { describe, expect, it } from "vitest";
import { runDetailedDraftSimulation } from "../../../src/simulation/detailed-simulation.ts";

describe("Detailed Draft Simulation & 17Lands Walkthrough", () => {
  it("runs a full 45-pick draft for 8 bots and produces complete walkthrough steps and 23-card decks", async () => {
    const result = await runDetailedDraftSimulation({
      seed: 42,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const report = result.value;
    expect(report.schemaVersion).toBe(2);
    expect(report.cubeKey).toBe("titou_tribal");
    expect(report.seed).toBe(42);
    expect(report.seats).toHaveLength(8);

    // The standalone simulation uses eight bots; the Solo Draft Coach table
    // keeps seat 0 available for its human caller through table-setup.ts.
    const seat0 = report.seats[0];
    expect(seat0?.seatId).toBe(0);
    expect(seat0?.botId).toBe("theo");
    expect(seat0?.botName).toBe("Le Rockeur");
    expect(seat0?.steps).toHaveLength(45);

    // Verify first step (P1P1)
    const p1p1 = seat0?.steps[0];
    expect(p1p1?.packNumber).toBe(1);
    expect(p1p1?.pickNumber).toBe(1);
    expect(p1p1?.boosterCards).toHaveLength(15);
    expect(p1p1?.pickedCardInstanceId).toBeDefined();
    expect(p1p1?.pickedCardName).toBeDefined();
    expect(p1p1?.justification.length).toBeGreaterThan(5);
    expect(p1p1?.poolSoFar).toHaveLength(0);
    expect(p1p1?.boosterId).toBeDefined();
    expect(p1p1?.eventSequence).toBeTypeOf("number");
    expect(p1p1?.decisionTrace.method).toBe("softmax");
    expect(p1p1?.decisionTrace.candidates).toHaveLength(15);

    const pickedCandidate = p1p1?.decisionTrace.candidates.find(
      (candidate) => candidate.cardInstanceId === p1p1.pickedCardInstanceId,
    );
    expect(pickedCandidate?.dynamicScore).toBeTypeOf("number");
    expect(pickedCandidate?.policyScore).toBeTypeOf("number");
    expect(pickedCandidate?.selectionProbability).toBeGreaterThan(0);
    expect(pickedCandidate?.coachingBreakdown).toBeDefined();

    // Verify last step (P3P15)
    const p3p15 = seat0?.steps[44];
    expect(p3p15?.packNumber).toBe(3);
    expect(p3p15?.pickNumber).toBe(15);
    expect(p3p15?.boosterCards).toHaveLength(1);
    expect(p3p15?.poolSoFar).toHaveLength(44);

    // Verify all 8 seats have final deck evaluated (40 cards: ~23 spells + 17 lands)
    for (const seat of report.seats) {
      expect(seat.steps).toHaveLength(45);
      const deck = seat.finalDeck;
      expect(deck.allMaindeck.length).toBe(40);
      expect(deck.maindeckSpells.length).toBeGreaterThanOrEqual(20);
      expect(deck.maindeckSpells.length).toBeLessThanOrEqual(26);
      expect(deck.maindeckLands.length).toBeGreaterThanOrEqual(14);
      expect(deck.maindeckLands.length).toBeLessThanOrEqual(20);

      // Conservation: drafted cards in maindeck + sideboard = 45 cards
      const draftedInMaindeck = deck.allMaindeck.filter((c) => !c.instanceId.startsWith("basic-"));
      expect(draftedInMaindeck.length + deck.sideboard.length).toBe(45);
      expect(deck.sideboard.length).toBeGreaterThanOrEqual(5);
      expect(deck.sideboard.length).toBeLessThanOrEqual(25);

      // Verify 3 macro-axes and 5 Kiviat axes
      expect(deck.macroAxes.power).toBeGreaterThan(0);
      expect(deck.macroAxes.synergy).toBeGreaterThan(0);
      expect(deck.macroAxes.consistency).toBeGreaterThan(0);

      expect(deck.radar.power).toBeGreaterThan(0);
      expect(deck.radar.synergy).toBeGreaterThan(0);
      expect(deck.radar.curve).toBeGreaterThan(0);
      expect(deck.radar.mana).toBeGreaterThan(0);
      expect(deck.radar.interaction).toBeGreaterThan(0);

      expect(deck.overallScore).toBeGreaterThan(40);
      expect(deck.archetype.label).toBeDefined();
    }

    const allSteps = report.seats.flatMap((seat) => seat.steps);
    const pickedEvents = report.draftReport.events.filter((event) => event.type === "CardPicked");
    expect(allSteps).toHaveLength(360);
    expect(pickedEvents).toHaveLength(360);
    expect(new Set(allSteps.map((step) => step.eventSequence)).size).toBe(360);
    for (const step of allSteps) {
      const event = pickedEvents.find((candidate) => candidate.sequence === step.eventSequence);
      expect(event).toMatchObject({
        type: "CardPicked",
        packNumber: step.packNumber,
        pickNumber: step.pickNumber,
        seatId: step.seatId,
        boosterId: step.boosterId,
        cardInstanceId: step.pickedCardInstanceId,
      });
    }
    expect(report.draftReport.functionalDigest).toMatch(/^[a-f0-9]{64}$/);
  }, 15000);

  it("guarantees strict determinism across multiple runs with the exact same seed", async () => {
    const runA = await runDetailedDraftSimulation({ seed: 777 });
    const runB = await runDetailedDraftSimulation({ seed: 777 });

    expect(runA.ok).toBe(true);
    expect(runB.ok).toBe(true);
    if (!runA.ok || !runB.ok) return;

    // Compare all 45 picks for each of the 8 seats
    for (let s = 0; s < 8; s++) {
      const stepsA = runA.value.seats[s]?.steps ?? [];
      const stepsB = runB.value.seats[s]?.steps ?? [];
      expect(stepsA.length).toBe(45);
      expect(stepsB.length).toBe(45);

      for (let r = 0; r < 45; r++) {
        expect(stepsA[r]?.pickedCardInstanceId).toBe(stepsB[r]?.pickedCardInstanceId);
        expect(stepsA[r]?.pickedCardName).toBe(stepsB[r]?.pickedCardName);
      }

      // Compare final deck composition
      const deckA = runA.value.seats[s]?.finalDeck.allMaindeck.map((c) => c.name) ?? [];
      const deckB = runB.value.seats[s]?.finalDeck.allMaindeck.map((c) => c.name) ?? [];
      expect(deckA).toEqual(deckB);
    }
  }, 15000);

  it("deploys exactly 24 initial boosters of 15 cards (360 unique cards)", async () => {
    const result = await runDetailedDraftSimulation({ seed: 42 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const boosters = result.value.initialBoosters;
    expect(boosters).toBeDefined();
    expect(boosters).toHaveLength(24);

    const allInstanceIds: string[] = [];
    for (let p = 1; p <= 3; p++) {
      const packBoosters = boosters?.filter((b) => b.packNumber === p);
      expect(packBoosters).toHaveLength(8);

      for (let s = 0; s < 8; s++) {
        const booster = packBoosters?.find((b) => b.originSeatId === s);
        expect(booster).toBeDefined();
        expect(booster?.cards).toHaveLength(15);

        const cardIds = booster?.cards.map((c) => c.instanceId) ?? [];
        allInstanceIds.push(...cardIds);
      }
    }

    // Exactly 360 cards in total
    expect(allInstanceIds).toHaveLength(360);
    // All 360 cards are distinct instances
    const uniqueIds = new Set(allInstanceIds);
    expect(uniqueIds.size).toBe(360);

    expect(result.value.bombDefinition).toEqual({
      kind: "top-percentile",
      percentile: 0.05,
      scoreField: "powerScore.score",
      includeCutoffTies: true,
      rankedUniqueCards: 542,
      cutoffScore: 44,
      bombCardCount: 29,
    });
    expect(
      boosters?.flatMap((booster) => booster.cards).filter((card) => card.isBomb),
    ).toHaveLength(21);
  }, 15000);
});
