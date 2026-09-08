import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluatePack,
  type CardEvaluationInput,
  type PackEvaluationContext,
} from "../../../src/domain/coaching/index.ts";

interface UntappedPick {
  readonly PackNumber: number;
  readonly PickNumber: number;
  readonly DraftPack: readonly string[];
  readonly PickedCards: readonly string[];
  readonly PickedCard?: string;
  readonly PackScores?: Record<string, { staticScore: number; dynamicScore: number }>;
}

interface UntappedDraft {
  readonly picks?: readonly UntappedPick[];
}

describe("Untapped Historical Benchmark", () => {
  const historyPath = resolve("data/untapped_history/drafts_backup.json");
  const hasHistory = existsSync(historyPath);

  it("benchmarks against real Untapped drafts", () => {
    if (!hasHistory) {
      // Gracefully pass if history file is absent in CI
      expect(true).toBe(true);
      return;
    }

    const raw = JSON.parse(readFileSync(historyPath, "utf-8")) as Record<string, UntappedDraft>;
    const drafts = Object.values(raw);

    let totalP1P1Cards = 0;
    let p1p1PerfectMatches = 0;

    for (const draft of drafts) {
      const p1p1 = draft.picks?.find((p) => p.PackNumber === 1 && p.PickNumber === 1);
      if (!p1p1?.PackScores) continue;

      const offered: CardEvaluationInput[] = Object.entries(p1p1.PackScores).map(([id, score]) => ({
        id,
        name: id,
        staticScore: score.staticScore,
        colors: [],
      }));

      const context: PackEvaluationContext = {
        packNumber: 1,
        pickNumber: 1,
        offeredCards: offered,
        priorPool: [],
      };

      const evaluated = evaluatePack(context);
      for (const card of evaluated) {
        totalP1P1Cards++;
        const untapped = p1p1.PackScores[card.id];
        if (untapped && Math.abs(card.dynamicScore - untapped.dynamicScore) < 0.001) {
          p1p1PerfectMatches++;
        }
      }
    }

    // In P1P1, our distilled formula perfectly matches 100% of Untapped dynamic scores
    expect(totalP1P1Cards).toBeGreaterThan(300);
    expect(p1p1PerfectMatches).toBe(totalP1P1Cards);
  });
});
