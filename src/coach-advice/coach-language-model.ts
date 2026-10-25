import type { LlmRouter } from "../companion/llm-router.ts";

/**
 * What advice orchestration needs from a language-model provider.
 * `LlmRouter` satisfies it; tests pass small fakes. When no model is supplied,
 * callers fall back to the deterministic engine — the choice belongs to the
 * composition root, never to environment detection.
 */
export type CoachLanguageModel = Pick<
  LlmRouter,
  "hasConfiguredKeys" | "hasJevKey" | "generateJson" | "callJevDecision"
>;

export type JevDecisionModel = Pick<LlmRouter, "hasJevKey" | "callJevDecision">;
