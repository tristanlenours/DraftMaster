import { describe, expect, it } from "vitest";
import { computeWheelSignals } from "../../../src/domain/coaching/wheel-signals.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";

describe("Wheel Signals Domain Analysis", () => {
  const lightningBolt: CardEvaluationInput = {
    id: "lightning-bolt",
    name: "Lightning Bolt",
    colors: ["R"],
    staticScore: 45,
    powerScore: 45,
    tier: "S",
    cmc: 1,
  };

  const goblinGuide: CardEvaluationInput = {
    id: "goblin-guide",
    name: "Goblin Guide",
    colors: ["R"],
    staticScore: 35,
    powerScore: 35,
    tier: "A",
    cmc: 1,
  };

  const monasterySwiftspear: CardEvaluationInput = {
    id: "swiftspear",
    name: "Monastery Swiftspear",
    colors: ["R"],
    staticScore: 30,
    powerScore: 30,
    tier: "B",
    cmc: 1,
  };

  const wrathOfGod: CardEvaluationInput = {
    id: "wrath-of-god",
    name: "Wrath of God",
    colors: ["W"],
    staticScore: 42,
    powerScore: 42,
    tier: "A",
    cmc: 4,
  };

  const swordsToPlowshares: CardEvaluationInput = {
    id: "swords",
    name: "Swords to Plowshares",
    colors: ["W"],
    staticScore: 48,
    powerScore: 48,
    tier: "S",
    cmc: 1,
  };

  const counterspell: CardEvaluationInput = {
    id: "counterspell",
    name: "Counterspell",
    colors: ["U"],
    staticScore: 38,
    powerScore: 38,
    tier: "A",
    cmc: 2,
  };

  const darkRitual: CardEvaluationInput = {
    id: "dark-ritual",
    name: "Dark Ritual",
    colors: ["B"],
    staticScore: 34,
    powerScore: 34,
    tier: "B",
    cmc: 1,
  };

  const birdsOfParadise: CardEvaluationInput = {
    id: "birds",
    name: "Birds of Paradise",
    colors: ["G"],
    staticScore: 40,
    powerScore: 40,
    tier: "A",
    cmc: 1,
  };

  it("accurately classifies cards taken vs wheeled and detects open/contested colors", () => {
    // Human picked Lightning Bolt at Pick 1, passing 5 cards
    const passedCards = [
      goblinGuide,
      monasterySwiftspear,
      wrathOfGod,
      swordsToPlowshares,
      counterspell,
    ];

    // At Pick 9 (wheel), only the two Red cards return; the two White cards and one Blue card were taken
    const currentBoosterCards = [goblinGuide, monasterySwiftspear];

    const analysis = computeWheelSignals({
      originalPickNumber: 1,
      currentPickNumber: 9,
      pickedCardAtInitialPass: lightningBolt,
      passedCards,
      currentBoosterCards,
    });

    expect(analysis.originalPickNumber).toBe(1);
    expect(analysis.currentPickNumber).toBe(9);
    expect(analysis.pickedCardAtInitialPass?.name).toBe("Lightning Bolt");
    expect(analysis.cardsWheeled).toHaveLength(2);
    expect(analysis.cardsTakenByTable).toHaveLength(3);

    // Color counts
    expect(analysis.takenColorCounts.W).toBe(2);
    expect(analysis.takenColorCounts.U).toBe(1);
    expect(analysis.takenColorCounts.R).toBe(0);

    expect(analysis.wheeledColorCounts.R).toBe(2);
    expect(analysis.wheeledColorCounts.W).toBe(0);

    // Open & contested colors
    expect(analysis.openColors).toContain("R");
    expect(analysis.contestedColors).toContain("W");

    // Wheeled bombs
    expect(analysis.wheeledBombs.map((c) => c.name)).toContain("Goblin Guide");

    // Diagnostic summary
    expect(analysis.signalSummary).toContain("Goblin Guide");
    expect(analysis.signalSummary).toContain("R");
  });

  it("handles empty or single-card passed scenarios gracefully", () => {
    const analysis = computeWheelSignals({
      originalPickNumber: 7,
      currentPickNumber: 15,
      pickedCardAtInitialPass: darkRitual,
      passedCards: [birdsOfParadise],
      currentBoosterCards: [birdsOfParadise],
    });

    expect(analysis.cardsWheeled).toHaveLength(1);
    expect(analysis.cardsTakenByTable).toHaveLength(0);
    expect(analysis.openColors).toContain("G");
  });
});
