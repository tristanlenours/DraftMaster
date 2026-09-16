import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LlmRouter } from "../../../src/companion/llm-router.ts";

describe("Companion - LlmRouter Key Pool & Rotation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEYS;
    delete process.env.GEMINI_API_KEY_1;
    delete process.env.GEMINI_API_KEY_2;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_PREMIUM_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("loads and deduplicates multiple Gemini keys from GEMINI_API_KEYS and GEMINI_API_KEY_*", () => {
    process.env.GEMINI_API_KEYS = "keyA, keyB, keyC";
    process.env.GEMINI_API_KEY = "keyA, keyD";
    process.env.GEMINI_API_KEY_EXTRA = "keyE";

    const router = new LlmRouter();
    expect(router.getGeminiKeyCount()).toBe(5);
    expect(router.hasConfiguredKeys()).toBe(true);
    expect(router.hasAvailableGeminiKey()).toBe(true);
  });

  it("loads configured keys from project env or fallback files when present", () => {
    const hasLocalEnv =
      fs.existsSync(path.resolve(process.cwd(), ".env")) ||
      fs.existsSync(path.resolve(process.cwd(), ".env.local"));

    if (hasLocalEnv) {
      const router = new LlmRouter();
      expect(router.getGeminiKeyCount()).toBeGreaterThanOrEqual(4);
      expect(router.hasConfiguredKeys()).toBe(true);
      expect(router.hasAvailableGeminiKey()).toBe(true);
    } else {
      const router = new LlmRouter();
      expect(router.getGeminiKeyCount()).toBe(0);
      expect(router.hasConfiguredKeys()).toBe(false);
      expect(router.hasAvailableGeminiKey()).toBe(false);
    }
  });

  it("handles per-key cooldowns: retains availability until all keys are cooling down", () => {
    process.env.GEMINI_API_KEYS = "key1, key2, key3";
    const router = new LlmRouter();

    expect(router.getGeminiKeyCount()).toBe(3);
    expect(router.getAvailableGeminiKeyCount()).toBe(3);
    expect(router.hasAvailableGeminiKey()).toBe(true);

    // Put key1 on cooldown
    router.markKeyCooldownForTesting("key1", 60_000);
    expect(router.getAvailableGeminiKeyCount()).toBe(2);
    expect(router.hasAvailableGeminiKey()).toBe(true);

    // Put key2 on cooldown
    router.markKeyCooldownForTesting("key2", 60_000);
    expect(router.getAvailableGeminiKeyCount()).toBe(1);
    expect(router.hasAvailableGeminiKey()).toBe(true);

    // Put key3 on cooldown -> all keys in cooldown
    router.markKeyCooldownForTesting("key3", 60_000);
    expect(router.getAvailableGeminiKeyCount()).toBe(0);
    expect(router.hasAvailableGeminiKey()).toBe(false);
  });
});
