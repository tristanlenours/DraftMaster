import { describe, expect, it } from "vitest";

import {
  DEFAULT_BASIC_LANDS,
  evaluateDeck,
  optimizeDeck,
  type CardEvaluationInput,
} from "../../../src/domain/coaching/index.ts";

function spell(
  id: string,
  colors: ("W" | "U" | "B" | "R" | "G")[],
  manaCost: string,
  staticScore = 30,
  cmc = 2,
): CardEvaluationInput {
  return { id, name: `Card ${id}`, colors, manaCost, cmc, staticScore, isLand: false };
}

const mountains = (count: number) => Array.from({ length: count }, () => DEFAULT_BASIC_LANDS.R);

describe("optimizeDeck", () => {
  const redDeck = [
    ...Array.from({ length: 23 }, (_, index) => spell(`R_${String(index)}`, ["R"], "o1oR")),
    ...mountains(17),
  ];

  it("swaps in a stronger castable reserve card and reports the score delta", () => {
    const reserve = [
      spell("R_great", ["R"], "o1oR", 60),
      spell("U_bomb", ["U"], "o1oU", 70),
      spell("R_weak", ["R"], "o1oR", 5),
    ];

    const result = optimizeDeck(redDeck, reserve, {}, { maxSwaps: 3 });

    const first = result.swaps[0];
    expect(first?.added.id).toBe("R_great");
    expect(first?.removed.id).toMatch(/^R_\d+$/);
    expect(first?.scoreAfter).toBeGreaterThan(first?.scoreBefore ?? 100);
    expect(first?.axisDeltas.power).toBeGreaterThan(0);
    expect(result.maindeck.map((card) => card.id)).not.toContain("U_bomb");
    expect(result.maindeck).toHaveLength(40);
    expect(result.maindeck.filter((card) => card.isLand)).toHaveLength(17);
    expect(result.evaluation.overallScore).toBe(evaluateDeck(result.maindeck).overallScore);
  });

  it("fixes the basic land split when one color lacks sources", () => {
    const deck = [
      ...Array.from({ length: 12 }, (_, index) => spell(`W_${String(index)}`, ["W"], "o1oW")),
      ...Array.from({ length: 11 }, (_, index) => spell(`U_${String(index)}`, ["U"], "o1oU")),
      ...Array.from({ length: 17 }, () => DEFAULT_BASIC_LANDS.W),
    ];

    const result = optimizeDeck(deck, [], {}, { maxSwaps: 3, basics: DEFAULT_BASIC_LANDS });

    expect(result.swaps.length).toBeGreaterThan(0);
    for (const swap of result.swaps) {
      expect(swap.removed.id).toBe(DEFAULT_BASIC_LANDS.W.id);
      expect(swap.added.id).toBe(DEFAULT_BASIC_LANDS.U.id);
      expect(swap.axisDeltas.mana).toBeGreaterThan(0);
    }
    expect(result.evaluation.overallScore).toBeGreaterThan(evaluateDeck(deck).overallScore);
  });

  it("never lowers the score, keeps singleton reserve use and stops at the swap budget", () => {
    const reserve = Array.from({ length: 6 }, (_, index) =>
      spell(`R_up_${String(index)}`, ["R"], "o1oR", 50 + index),
    );

    const result = optimizeDeck(redDeck, reserve, {}, { maxSwaps: 2 });

    expect(result.swaps).toHaveLength(2);
    let score = evaluateDeck(redDeck).overallScore;
    for (const swap of result.swaps) {
      expect(swap.scoreBefore).toBe(score);
      expect(swap.scoreAfter).toBeGreaterThanOrEqual(score + 1);
      score = swap.scoreAfter;
    }
    const ids = result.maindeck.filter((card) => !card.isLand).map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is deterministic and returns the deck unchanged when nothing improves it", () => {
    const reserve = [spell("R_weak", ["R"], "o1oR", 5)];

    const first = optimizeDeck(redDeck, reserve, {}, { maxSwaps: 3 });
    const second = optimizeDeck(redDeck, reserve, {}, { maxSwaps: 3 });

    expect(first.swaps).toEqual([]);
    expect(first.maindeck).toEqual(redDeck);
    expect(second).toEqual(first);
  });
});
