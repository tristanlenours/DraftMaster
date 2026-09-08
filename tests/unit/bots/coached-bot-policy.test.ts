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
    ocelot: { id: "ocelot", name: "Ocelot Pride", staticScore: 48, colors: ["W"] },
    noble: { id: "noble", name: "Noble Hierarch", staticScore: 42, colors: ["G"] },
    teferi: { id: "teferi", name: "Teferi", staticScore: 45, colors: ["W", "U"] },
    filler: { id: "filler", name: "Filler Card", staticScore: 15, colors: ["R"] },
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
});
