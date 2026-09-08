import { describe, expect, it } from "vitest";

import type { PickContext } from "../../../src/bots/pick-policy.ts";
import { createScriptedPolicy } from "../../../src/bots/scripted-policy.ts";
import { createSeededRandomPolicy } from "../../../src/bots/seeded-random-policy.ts";
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

describe("SeededRandomPolicy", () => {
  it("exposes immutable non-empty id and version", () => {
    const policy = createSeededRandomPolicy(42, 0);

    expect(policy.id).toBe("seeded-random");
    expect(policy.version).toBe("1");
    expect(Object.isFrozen(policy)).toBe(true);
  });

  it("makes reproducible legal choices from the booster without mutating context", () => {
    const policyA = createSeededRandomPolicy(42, 0);
    const policyB = createSeededRandomPolicy(42, 0);
    const context = createContext({ currentBooster: ["card-A", "card-B", "card-C"] });

    const choiceA1 = policyA.choose(context);
    const choiceB1 = policyB.choose(context);

    expect(choiceA1.ok).toBe(true);
    expect(choiceB1.ok).toBe(true);
    if (choiceA1.ok && choiceB1.ok) {
      expect(choiceA1.value).toEqual(choiceB1.value);
      expect(context.currentBooster).toContain(choiceA1.value.cardInstanceId);
    }
  });

  it("fails cleanly when current booster is empty", () => {
    const policy = createSeededRandomPolicy(42, 0);
    const context = createContext({ currentBooster: [] });

    const result = policy.choose(context);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("POLICY_FAILED");
    }
  });

  it("operates without session ID or timestamp in context", () => {
    const policy = createSeededRandomPolicy(42, 0);
    const context = createContext();

    expect("sessionId" in context).toBe(false);
    expect("occurredAt" in context).toBe(false);
    expect("startedAt" in context).toBe(false);

    const result = policy.choose(context);
    expect(result.ok).toBe(true);
  });
});

describe("ScriptedPolicy", () => {
  it("exposes immutable non-empty id and version", () => {
    const policy = createScriptedPolicy(["card-1", "card-2"]);

    expect(policy.id).toBe("scripted");
    expect(policy.version).toBe("1");
    expect(Object.isFrozen(policy)).toBe(true);
  });

  it("returns pre-scripted choices sequentially", () => {
    const policy = createScriptedPolicy(["card-2", "card-1"]);
    const context = createContext({ currentBooster: ["card-1", "card-2", "card-3"] });

    const first = policy.choose(context);
    const second = policy.choose(context);

    expect(first).toEqual({ ok: true, value: { cardInstanceId: "card-2" } });
    expect(second).toEqual({ ok: true, value: { cardInstanceId: "card-1" } });
  });

  it("fails with POLICY_FAILED when scripted choices are exhausted", () => {
    const policy = createScriptedPolicy(["card-only"]);
    const context = createContext();

    policy.choose(context);
    const result = policy.choose(context);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("POLICY_FAILED");
    }
  });

  it("can return an illegal choice when scripted for error testing", () => {
    const policy = createScriptedPolicy(["illegal-card-not-in-booster"]);
    const context = createContext({ currentBooster: ["card-1", "card-2"] });

    const result = policy.choose(context);

    expect(result).toEqual({
      ok: true,
      value: { cardInstanceId: "illegal-card-not-in-booster" },
    });
  });
});
