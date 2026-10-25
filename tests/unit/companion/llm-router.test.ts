import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { LlmRouter } from "../../../src/companion/llm-router.ts";
import { loadLocalEnvFiles } from "../../../src/config/env-files.ts";

describe("Companion - LlmRouter Key Pool & Rotation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEYS;
    delete process.env.GEMINI_API_KEY_1;
    delete process.env.GEMINI_API_KEY_2;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_PREMIUM_API_KEY;
    delete process.env.JEV_API_KEY;
  });

  afterEach(() => {
    // Restore in place: replacing process.env would detach it from the real
    // environment that process.loadEnvFile writes to.
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) Reflect.deleteProperty(process.env, key);
    }
    Object.assign(process.env, originalEnv);
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

  it("reads keys from process.env only, never from .env files on disk", () => {
    // Entry points load .env files explicitly (src/config/env-files.ts); the library
    // stays hermetic so tests never pick up a developer's real keys.
    const router = new LlmRouter();
    expect(router.getGeminiKeyCount()).toBe(0);
    expect(router.hasConfiguredKeys()).toBe(false);
    expect(router.hasJevKey()).toBe(false);
  });

  it("uses keys that an entry point loaded from env files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "llm-env-"));
    try {
      fs.writeFileSync(path.join(dir, ".env.local"), "GEMINI_API_KEYS=local1,local2\n");
      fs.writeFileSync(path.join(dir, ".env"), "GEMINI_API_KEYS=base\nJEV_API_KEY=jev\n");
      loadLocalEnvFiles(dir);

      const router = new LlmRouter();
      expect(router.getGeminiKeyCount()).toBe(2);
      expect(router.hasJevKey()).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
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

  it("loads JEV key and verifies JEV availability", () => {
    process.env.JEV_API_KEY = "test-jev-key";
    const router = new LlmRouter();
    expect(router.hasJevKey()).toBe(true);
    expect(router.hasConfiguredKeys()).toBe(true);
  });

  it("fails gracefully when calling Jev decision without keys", async () => {
    // When no env files or keys
    const router = new LlmRouter();
    router.clearKeysForTesting();

    const res = await router.callJevDecision("State", {
      choice: {
        type: "choice",
        instructions: "Pick one",
        criteria: { a: "First", b: "Second" },
      },
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Aucune clé JEV ou OpenRouter");
  });
});
