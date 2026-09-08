import { describe, expect, it } from "vitest";
import type { PickContext } from "../../../src/bots/pick-policy.ts";
import {
  createFriendBotPolicy,
  createFriendTablePolicies,
  HUGUES_PROFILE,
  IVAN_PROFILE,
  NICO_PROFILE,
  TITOU_PROFILE,
  THEO_PROFILE,
} from "../../../src/bots/friends/index.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";
import { deriveStreamSeed, getPolicyStreamName } from "../../../src/random/seeded-random.ts";

function createContext(overrides: Partial<PickContext> = {}): PickContext {
  const seatId = overrides.seatId ?? 1;
  const streamName = getPolicyStreamName(seatId);
  return {
    derivedSeed: deriveStreamSeed(42, streamName),
    streamName,
    seatId,
    packNumber: 1,
    pickNumber: 1,
    currentBooster: ["card-1", "card-2"],
    priorPool: [],
    ...overrides,
  };
}

describe("FriendBotPolicy", () => {
  const bigCreature: CardEvaluationInput = {
    id: "carnage-tyrant",
    name: "Carnage Tyrant",
    staticScore: 38,
    colors: ["G"],
    cmc: 6,
    types: ["Creature"],
  };

  const cheapRemoval: CardEvaluationInput = {
    id: "swords-to-plowshares",
    name: "Swords to Plowshares",
    staticScore: 48,
    colors: ["W"],
    cmc: 1,
    types: ["Instant"],
  };

  const weirdEngine: CardEvaluationInput = {
    id: "urzas-saga",
    name: "Urza's Saga",
    staticScore: 42,
    colors: [],
    cmc: 0,
    types: ["Enchantment", "Land", "Saga"],
    isLand: true,
  };

  const cardsDb: Record<string, CardEvaluationInput> = {
    "carnage-tyrant": bigCreature,
    "swords-to-plowshares": cheapRemoval,
    "urzas-saga": weirdEngine,
  };

  const resolveCard = (id: string) => cardsDb[id];

  it("Nico behaves as a pure Spike and picks high-tier cheap removal", () => {
    const policy = createFriendBotPolicy({
      profile: NICO_PROFILE,
      resolveCard,
    });

    const context = createContext({
      currentBooster: ["swords-to-plowshares", "carnage-tyrant"],
    });

    const result = policy.choose(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cardInstanceId).toBe("swords-to-plowshares");
    }
  });

  it("Ivan's Timmy personality boosts big 6-mana creatures", () => {
    // Offer Ivan a 6-mana giant vs a modest card
    const modestCard: CardEvaluationInput = {
      id: "modest-card",
      name: "Modest Bear",
      staticScore: 36,
      colors: ["G"],
      cmc: 2,
      types: ["Creature"],
    };

    const localDb: Record<string, CardEvaluationInput> = {
      ...cardsDb,
      "modest-card": modestCard,
    };

    const policy = createFriendBotPolicy({
      profile: IVAN_PROFILE,
      resolveCard: (id) => localDb[id],
    });

    const context = createContext({
      currentBooster: ["modest-card", "carnage-tyrant"],
    });

    const result = policy.choose({
      ...context,
      currentBooster: ["modest-card", "carnage-tyrant"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Big monster receives +4.5 bonus, winning easily
      expect(result.value.cardInstanceId).toBe("carnage-tyrant");
    }
  });

  it("Ivan favors Wraths and avoids red cards in line with his 4-color non-red gameplan", () => {
    const wrathOfGod: CardEvaluationInput = {
      id: "wrath-of-god",
      name: "Wrath of God",
      staticScore: 40,
      colors: ["W"],
      cmc: 4,
      types: ["Sorcery"],
      oracleText: "Destroy all creatures. They can't be regenerated.",
    };

    const redBomb: CardEvaluationInput = {
      id: "red-bomb",
      name: "Red Dragon Bomb",
      staticScore: 45,
      colors: ["R"],
      cmc: 5,
      types: ["Creature"],
    };

    const localDb: Record<string, CardEvaluationInput> = {
      ...cardsDb,
      "wrath-of-god": wrathOfGod,
      "red-bomb": redBomb,
    };

    const policy = createFriendBotPolicy({
      profile: IVAN_PROFILE,
      resolveCard: (id) => localDb[id],
    });

    const resultWrath = policy.choose(
      createContext({ currentBooster: ["wrath-of-god", "red-bomb"] }),
    );
    expect(resultWrath.ok).toBe(true);
    if (resultWrath.ok) {
      expect(resultWrath.value.cardInstanceId).toBe("wrath-of-god");
    }
  });

  it("Hugues' Johnny personality favors weird sagas and engines", () => {
    const regularCreature: CardEvaluationInput = {
      id: "regular-creature",
      name: "Regular Fighter",
      staticScore: 40,
      colors: ["W"],
      cmc: 3,
      types: ["Creature"],
    };

    const localDb: Record<string, CardEvaluationInput> = {
      ...cardsDb,
      "regular-creature": regularCreature,
    };

    const policy = createFriendBotPolicy({
      profile: HUGUES_PROFILE,
      resolveCard: (id) => localDb[id],
    });

    const context = createContext({
      currentBooster: ["regular-creature", "urzas-saga"],
    });

    const result = policy.choose(context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Urza's Saga receives +4.0 weird engine bonus, taking priority
      expect(result.value.cardInstanceId).toBe("urzas-saga");
    }
  });

  it("produces strictly deterministic choices given the same seed and context", () => {
    const policyA = createFriendBotPolicy({
      profile: NICO_PROFILE,
      resolveCard,
    });
    const policyB = createFriendBotPolicy({
      profile: NICO_PROFILE,
      resolveCard,
    });

    const context = createContext({
      currentBooster: ["swords-to-plowshares", "carnage-tyrant", "urzas-saga"],
    });

    const resA = policyA.choose(context);
    const resB = policyB.choose(context);

    expect(resA.ok).toBe(true);
    expect(resB.ok).toBe(true);
    if (resA.ok && resB.ok) {
      expect(resA.value).toEqual(resB.value);
    }
  });

  it("Théo (Le Rockeur) favors Reanimation spells and Black/Red colors", () => {
    const reanimateCard: CardEvaluationInput = {
      id: "reanimate",
      name: "Reanimate",
      staticScore: 40,
      colors: ["B"],
      cmc: 1,
      types: ["Sorcery"],
      oracleText:
        "Put target creature card from a graveyard onto the battlefield under your control.",
    };

    const greenCard: CardEvaluationInput = {
      id: "green-creature",
      name: "Green Beast",
      staticScore: 42,
      colors: ["G"],
      cmc: 3,
      types: ["Creature"],
    };

    const localDb: Record<string, CardEvaluationInput> = {
      ...cardsDb,
      reanimate: reanimateCard,
      "green-creature": greenCard,
    };

    const policy = createFriendBotPolicy({
      profile: THEO_PROFILE,
      resolveCard: (id) => localDb[id],
    });

    const context = createContext({
      currentBooster: ["green-creature", "reanimate"],
    });

    const res = policy.choose(context);
    expect(res.ok).toBe(true);
    if (res.ok) {
      // Reanimate gets +5.0 reanimation bonus + 2.0 reanim spell bonus + 2.0 black affinity, beating green card
      expect(res.value.cardInstanceId).toBe("reanimate");
      const trace = res.value.trace;
      expect(trace).toBeDefined();
      if (!trace) return;
      expect(trace.method).toBe("softmax");
      expect(trace.temperature).toBe(1.2);
      expect(trace.randomRoll).toBeGreaterThanOrEqual(0);
      expect(trace.randomRoll).toBeLessThanOrEqual(1);

      const reanimate = trace.candidates.find(
        (candidate) => candidate.cardInstanceId === "reanimate",
      );
      expect(reanimate).toMatchObject({
        staticScore: 40,
        dynamicScore: 40,
        personalityBonus: 9,
        policyScore: 49,
        policyRank: 1,
      });
      expect(reanimate?.biasContributions.map((contribution) => contribution.key)).toEqual([
        "preferred-color",
        "reanimation-spell",
      ]);
      expect(
        trace.candidates.reduce((sum, candidate) => sum + candidate.selectionProbability, 0),
      ).toBeCloseTo(1, 10);
    }
  });

  it("makes color discipline visible as a scored contribution", () => {
    const disciplinedPolicy = createFriendBotPolicy({
      profile: NICO_PROFILE,
      resolveCard: (id) =>
        ({
          white: { id: "white", name: "White", staticScore: 35, colors: ["W"] },
          green: { id: "green", name: "Green", staticScore: 40, colors: ["G"] },
          anchor: { id: "anchor", name: "Anchor", staticScore: 40, colors: ["W"] },
        })[id] as CardEvaluationInput | undefined,
    });

    const result = disciplinedPolicy.choose(
      createContext({
        packNumber: 2,
        pickNumber: 5,
        currentBooster: ["white", "green"],
        priorPool: ["anchor"],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || !result.value.trace) return;
    const green = result.value.trace.candidates.find(
      (candidate) => candidate.cardInstanceId === "green",
    );
    const colorDiscipline = green?.biasContributions.find(
      (contribution) => contribution.key === "color-discipline",
    );
    expect(colorDiscipline?.key).toBe("color-discipline");
    expect(colorDiscipline?.points).toBeTypeOf("number");
    expect(colorDiscipline?.points).toBeLessThan(0);
  });

  it("makes Titou's tribal affinity visible when a subtype matches the pool", () => {
    const tribalPolicy = createFriendBotPolicy({
      profile: TITOU_PROFILE,
      resolveCard: (id) =>
        ({
          elf: {
            id: "elf",
            name: "Elf",
            staticScore: 35,
            colors: ["G"],
            types: ["Creature"],
            subtypes: ["Elf"],
          },
          wizard: {
            id: "wizard",
            name: "Wizard",
            staticScore: 37,
            colors: ["U"],
            types: ["Creature"],
            subtypes: ["Wizard"],
          },
          elfAnchor: {
            id: "elfAnchor",
            name: "Elf Anchor",
            staticScore: 35,
            colors: ["G"],
            types: ["Creature"],
            subtypes: ["Elf"],
          },
        })[id] as CardEvaluationInput | undefined,
    });

    const result = tribalPolicy.choose(
      createContext({
        packNumber: 1,
        pickNumber: 4,
        currentBooster: ["wizard", "elf"],
        priorPool: ["elfAnchor"],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || !result.value.trace) return;
    const elf = result.value.trace.candidates.find(
      (candidate) => candidate.cardInstanceId === "elf",
    );
    expect(elf?.biasContributions).toContainEqual({
      key: "tribal-synergy",
      label: "Synergie tribale : Elf",
      points: 3.5,
    });
  });

  it("createFriendTablePolicies configures 8 seats with Seat 0 as human player", () => {
    const tablePolicies = createFriendTablePolicies({ resolveCard });

    expect(tablePolicies).toHaveLength(8);
    expect(tablePolicies[0]).toBeNull(); // Human player
    expect(tablePolicies[1]?.id).toBe("friend:nico");
    expect(tablePolicies[2]?.id).toBe("friend:remi");
    expect(tablePolicies[3]?.id).toBe("friend:hugues");
    expect(tablePolicies[4]?.id).toBe("friend:ivan");
    expect(tablePolicies[5]?.id).toBe("friend:papayou");
    expect(tablePolicies[6]?.id).toBe("friend:cedric");
    expect(tablePolicies[7]?.id).toBe("friend:titou");
  });
});
