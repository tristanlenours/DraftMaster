import { describe, expect, it, vi } from "vitest";
import { getUnifiedDraftAdvice } from "../../../src/domain/coaching/draft-coach-service.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";
import { LlmRouter } from "../../../src/companion/llm-router.ts";

describe("DraftCoachService JEV Fallback & Precedence Hierarchy", () => {
  const cardA: CardEvaluationInput = {
    id: "card-a",
    name: "Black Lotus",
    staticScore: 50,
    colors: [],
    cmc: 0,
    types: ["Artifact"],
  };

  const cardB: CardEvaluationInput = {
    id: "card-b",
    name: "Ancestral Recall",
    staticScore: 48,
    colors: ["U"],
    cmc: 1,
    types: ["Instant"],
  };

  const cardC: CardEvaluationInput = {
    id: "card-c",
    name: "Lightning Bolt",
    staticScore: 42,
    colors: ["R"],
    cmc: 1,
    types: ["Instant"],
  };

  it("returns primary LLM advice when generateJson succeeds", async () => {
    const mockRouter = new LlmRouter();
    vi.spyOn(mockRouter, "hasConfiguredKeys").mockReturnValue(true);
    vi.spyOn(mockRouter, "generateJson").mockResolvedValue({
      success: true,
      content: {
        topPick: "Black Lotus",
        reason: "Le meilleur caillou de mana de tout le jeu.",
        alternatives: [{ name: "Ancestral Recall", reason: "Piocher 3 pour 1 bleu." }],
      },
      provider: "Gemini Flash",
      model: "gemini-2.5-flash",
    });

    const advice = await getUnifiedDraftAdvice({
      packCards: [cardA, cardB, cardC],
      priorPool: [],
      packNumber: 1,
      pickNumber: 1,
      llmRouter: mockRouter,
    });

    expect(advice.provider).toBe("Gemini Flash");
    expect(advice.topPickName).toBe("Black Lotus");
    expect(advice.reason).toContain("meilleur caillou");
    expect(advice.alternatives).toHaveLength(1);
    expect(advice.alternatives[0]?.name).toBe("Ancestral Recall");
  });

  it("falls back to JEV when primary LLM fails but JEV key is available", async () => {
    const mockRouter = new LlmRouter();
    vi.spyOn(mockRouter, "hasConfiguredKeys").mockReturnValue(true);
    vi.spyOn(mockRouter, "hasJevKey").mockReturnValue(true);

    // Primary LLM times out / fails
    vi.spyOn(mockRouter, "generateJson").mockRejectedValue(new Error("Primary LLM timeout"));

    // JEV succeeds
    vi.spyOn(mockRouter, "callJevDecision").mockResolvedValue({
      success: true,
      content: {
        id: "mock-jev-1",
        provider: "TypeSafe (Jev)",
        model: "~typesafe/jev-latest",
        usage: { input_tokens: 100, output_tokens: 20, cost: 0.001 },
        answers: {
          bot_pick: {
            type: "choice",
            choice: "Ancestral Recall",
            confidence: 0.92,
            probabilities: {
              "Ancestral Recall": 0.85,
              "Black Lotus": 0.15,
            },
          },
        },
      },
      provider: "TypeSafe (Jev)",
      model: "~typesafe/jev-latest",
    });

    const advice = await getUnifiedDraftAdvice({
      packCards: [cardA, cardB, cardC],
      priorPool: [],
      packNumber: 1,
      pickNumber: 1,
      llmRouter: mockRouter,
    });

    expect(advice.provider).toBe("JEV (OpenRouter)");
    expect(advice.topPickName).toBe("Ancestral Recall");
    expect(advice.topPickId).toBe("card-b");
    expect(advice.reason).toContain("Choix IA JEV");
    expect(advice.alternatives.length).toBeGreaterThanOrEqual(1);
    expect(advice.alternatives[0]?.name).toBe("Black Lotus");
    expect(advice.alternatives[0]?.reason).toContain("Alternative JEV");
  });

  it("falls back to deterministic engine as strictly the last resort when both LLM and JEV fail", async () => {
    const mockRouter = new LlmRouter();
    vi.spyOn(mockRouter, "hasConfiguredKeys").mockReturnValue(true);
    vi.spyOn(mockRouter, "hasJevKey").mockReturnValue(true);

    // Primary LLM fails
    vi.spyOn(mockRouter, "generateJson").mockRejectedValue(new Error("Network connection dropped"));

    // JEV also fails
    vi.spyOn(mockRouter, "callJevDecision").mockResolvedValue({
      success: false,
      content: null,
      provider: "None",
      error: "Jev service 503 unavailable",
    });

    const advice = await getUnifiedDraftAdvice({
      packCards: [cardA, cardB, cardC],
      priorPool: [],
      packNumber: 1,
      pickNumber: 1,
      llmRouter: mockRouter,
    });

    expect(advice.provider).toBe("engine");
    expect(advice.topPickId).toBe("card-a");
    expect(advice.topPickName).toBe("Black Lotus");
    expect(advice.reason).toContain("Meilleure carte du booster");
  });
});
