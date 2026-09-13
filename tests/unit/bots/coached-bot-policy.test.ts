import { describe, expect, it } from "vitest";
import type { PickContext } from "../../../src/bots/pick-policy.ts";
import { createCoachedBotPolicy } from "../../../src/bots/coached-bot-policy.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";
import { deriveStreamSeed, getPolicyStreamName } from "../../../src/random/seeded-random.ts";

function createContext(overrides: Partial<PickContext> = {}): PickContext {
  const seatId = overrides.seatId ?? 0;
  const streamName = getPolicyStreamName(seatId);
  return {
    derivedSeed: deriveStreamSeed(42, streamName),
    streamName,
    seatId,
    packNumber: 1,
    pickNumber: 1,
    currentBooster: ["card-1", "card-2", "card-3"],
    priorPool: [],
    ...overrides,
  };
}

describe("CoachedBotPolicy", () => {
  const cardsDb: Record<string, CardEvaluationInput> = {
    ocelot: { id: "ocelot", name: "Ocelot Pride", staticScore: 48, colors: ["W"], cmc: 1 },
    noble: { id: "noble", name: "Noble Hierarch", staticScore: 42, colors: ["G"], cmc: 1 },
    teferi: { id: "teferi", name: "Teferi", staticScore: 45, colors: ["W", "U"], cmc: 3 },
    filler: { id: "filler", name: "Filler Card", staticScore: 15, colors: ["R"], cmc: 2 },
  };

  const resolveCard = (id: string) => cardsDb[id];

  it("chooses the highest static score card at P1P1", () => {
    const policy = createCoachedBotPolicy({ resolveCard });
    const context = createContext({
      packNumber: 1,
      pickNumber: 1,
      currentBooster: ["noble", "ocelot", "filler"],
      priorPool: [],
    });

    const result = policy.choose(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cardInstanceId).toBe("ocelot"); // 48 > 42 > 15
      expect(result.value.trace).toMatchObject({
        method: "highest-score",
        selectedProbability: 1,
      });
    }
  });

  it("prioritizes colors aligned with prior pool later in draft", () => {
    const policy = createCoachedBotPolicy({ resolveCard });
    // Player has Teferi (WU) in pool, pack has noble (G, 42 static) vs filler or ocelot (W, 48 static)
    const context = createContext({
      packNumber: 1,
      pickNumber: 5,
      currentBooster: ["noble", "ocelot"],
      priorPool: ["teferi"],
    });

    const result = policy.choose(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cardInstanceId).toBe("ocelot"); // Ocelot matches white from Teferi
    }
  });

  it("fails cleanly when booster is empty", () => {
    const policy = createCoachedBotPolicy({ resolveCard });
    const context = createContext({ currentBooster: [] });

    const result = policy.choose(context);
    expect(result.ok).toBe(false);
  });

  it("selects a valid option among top 3 that matches an individual bias over the top pick", () => {
    // noble is option 2 (score 42) vs ocelot option 1 (score 48).
    // Ivan has greenRampBonus: 3.0. Noble Hierarch is green ramp CMC <= 3.
    const ivanBiases = { greenRampBonus: 3.0 };
    const policy = createCoachedBotPolicy({ resolveCard, biases: ivanBiases });
    const context = createContext({
      packNumber: 1,
      pickNumber: 1,
      currentBooster: ["ocelot", "noble", "filler"],
      priorPool: [],
    });

    const result = policy.choose(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cardInstanceId).toBe("noble"); // Noble matches green ramp bias!
      expect(result.value.trace).toMatchObject({
        method: "highest-score",
        selectedProbability: 1,
      });
    }
  });

  it("does not pick a card matching a bias if it is outside the top 3 valid options", () => {
    // 4 cards in booster: ocelot (48), teferi (45), noble (42), filler (15 with ramp bias)
    // top 3 are [ocelot, teferi, noble]. Filler is rank 4, so it should NEVER be picked.
    const weirdBiases = { highCmcBonus: 5.0 }; // Assume weird bias on rank 4
    const customCards: Record<string, CardEvaluationInput> = {
      ...cardsDb,
      badFatty: { id: "badFatty", name: "Bad Fatty", staticScore: 10, cmc: 7, colors: ["G"] },
    };
    const policy = createCoachedBotPolicy({
      resolveCard: (id) => customCards[id],
      biases: weirdBiases,
    });
    const context = createContext({
      packNumber: 1,
      pickNumber: 1,
      currentBooster: ["ocelot", "teferi", "noble", "badFatty"],
      priorPool: [],
    });

    const result = policy.choose(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // badFatty has high CMC bias bonus but is rank 4, NOT in top 3 valid options.
      // So policy picks ocelot (highest among top 3).
      expect(result.value.cardInstanceId).toBe("ocelot");
      expect(result.value.trace?.method).toBe("highest-score");
    }
  });
});
