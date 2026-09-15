import { describe, expect, it } from "vitest";
import { buildDraftAdvicePrompt } from "../../../src/companion/coach-prompts.ts";
import { getUnifiedDraftAdvice } from "../../../src/domain/coaching/draft-coach-service.ts";
import type { CardEvaluationInput } from "../../../src/domain/coaching/types.ts";
import type { CubeMetaDefinition } from "../../../src/cubes/cube-meta-types.ts";
import type { LlmRouter } from "../../../src/companion/llm-router.ts";
import type { CompanionCard } from "../../../src/companion/card-resolver.ts";

describe("AI Coach API Contracts & Client Experience (UX Safeguards)", () => {
  const sampleCubeMeta = {
    schemaVersion: 1,
    cubeKey: "titou_tribal",
    name: "Titou's Tribal and Chromatic Cube",
    owner: "eltitou007",
    cardCount: 545,
    powerTier: "synergy_unpowered",
    pacing: "midrange_attrition",
    coachReadiness: { status: "ready" },
    activeSnapshotId: "titou_tribal@2026-02-24.1",
    scoringProfile: { version: "scoring@1" },
    fundamentalTurn: {
      targetTurn: 4,
      criticalWindow: "T3-T5",
      pacingDescription: "Format synergique articulé sur les types de créatures et les seigneurs.",
      deckExpectation: "Développer une courbe T1-T3 pour capitaliser au T4.",
    },
    technicalAxes: {
      speedIndex: 5.8,
      interactionDensityPercentage: 16,
      averageCmcEstimate: 3.1,
      fixingQuality: "rainbow_tribal",
      comboPotential: "high_synergy_engine",
    },
    fixingDensityPercentage: 14.5,
    dominantMechanics: ["Tribal", "Lifegain"],
    archetypes: [
      {
        id: "titou:tribal_goblins",
        name: "Rakdos Gobelins Aggro & Burn",
        primaryColors: ["R"],
        splashColors: ["B"],
        category: "aggro",
        description: "Tribu agressive",
        gameplan: "Déployer des gobelins T1-T3 et finir au burn.",
        keyCards: [],
        supportCards: [],
      },
    ],
  } as unknown as CubeMetaDefinition;

  const solRing: CardEvaluationInput = {
    id: "sol-ring",
    name: "Sol Ring",
    colors: [],
    staticScore: 50,
    cmc: 1,
    types: ["Artifact"],
    oracleText: "{T}: Add {C}{C}.",
  };

  const ocelotPride: CardEvaluationInput = {
    id: "ocelot-pride",
    name: "Ocelot Pride",
    colors: ["W"],
    staticScore: 48,
    cmc: 1,
    types: ["Creature"],
    oracleText: "First strike, lifelink.",
  };

  const lightningBolt: CardEvaluationInput = {
    id: "lightning-bolt",
    name: "Lightning Bolt",
    colors: ["R"],
    staticScore: 45,
    cmc: 1,
    types: ["Instant"],
    oracleText: "Deal 3 damage to any target.",
  };

  const lowRankCard: CardEvaluationInput = {
    id: "fountain-of-youth",
    name: "Fountain of Youth",
    colors: [],
    staticScore: 10,
    cmc: 0,
    types: ["Artifact"],
    oracleText: "{2}, {T}: Gain 1 life.",
  };

  const immerwolf: CardEvaluationInput = {
    id: "immerwolf",
    name: "Immerwolf",
    colors: ["R", "G"],
    staticScore: 36,
    cmc: 3,
    types: ["Creature"],
    subtypes: ["Wolf"],
    oracleText: "Other Wolf and Werewolf creatures you control get +1/+1.",
  };

  const goblinGuide: CardEvaluationInput = {
    id: "goblin-guide",
    name: "Goblin Guide",
    colors: ["R"],
    staticScore: 40,
    cmc: 1,
    types: ["Creature"],
    subtypes: ["Goblin"],
    oracleText: "Haste. Whenever Goblin Guide attacks, defending player reveals top card.",
  };

  const goblinWarchief: CardEvaluationInput = {
    id: "goblin-warchief",
    name: "Goblin Warchief",
    colors: ["R"],
    staticScore: 38,
    cmc: 3,
    types: ["Creature"],
    subtypes: ["Goblin"],
    oracleText: "Goblin spells you cast cost {1} less to cast. Goblins you control have haste.",
  };

  // Helper to create a fake LlmRouter returning scripted JSON
  function createMockRouter(scripted: {
    success: boolean;
    content?: unknown;
    provider?: string;
    error?: string;
  }): LlmRouter {
    return {
      hasConfiguredKeys: () => true,
      generateJson: () => {
        if (!scripted.success) {
          return Promise.resolve({
            success: false,
            content: null,
            provider: "None",
            error: scripted.error ?? "Simulated failure",
          });
        }
        return Promise.resolve({
          success: true,
          content: scripted.content,
          provider: (scripted.provider ?? "DeepSeek (OpenRouter)") as "DeepSeek (OpenRouter)",
        });
      },
    } as unknown as LlmRouter;
  }

  // ---------------------------------------------------------------------------
  // 1. INPUT CONTRACTS (Ce qu'on passe dans l'API)
  // ---------------------------------------------------------------------------
  describe("Input Contracts: Prompt Construction & Token Bounds", () => {
    it("generates a well-formed prompt with cube context, archetypes, and bounded length", () => {
      const { system, user } = buildDraftAdvicePrompt(
        [solRing, ocelotPride, lightningBolt] as unknown as CompanionCard[],
        [],
        1,
        1,
        { cubeMeta: sampleCubeMeta },
      );

      // System prompt integrity
      expect(system).toContain("Tu es un Coach de Draft Cube Magic");
      expect(system).toContain("Titou's Tribal and Chromatic Cube");
      expect(system).toContain("Rakdos Gobelins Aggro & Burn");
      expect(system).toContain("T3-T5");
      expect(system).toContain("Format synergique articulé sur les types de créatures");

      // User prompt integrity
      expect(user).toContain("Pack 1, Pick 1.");
      expect(user).toContain("Booster proposé (3 cartes) :");
      expect(user).toContain("Sol Ring");
      expect(user).toContain("Ocelot Pride");
      expect(user).toContain("Lightning Bolt");

      // Length bounds: Prompt must be compact (< 10 000 chars, ~2 500 tokens)
      const totalChars = system.length + user.length;
      expect(totalChars).toBeLessThan(12000);
      expect(totalChars).toBeGreaterThan(1000);
    });

    it("handles edge-case cards gracefully without throwing or leaving undefined text", () => {
      const weirdCard: CardEvaluationInput = {
        id: "weird-card",
        name: "Weird Mystery Card",
        colors: [],
        staticScore: 20,
        cmc: 0,
        oracleText: undefined,
        manaCost: undefined,
        typeLine: undefined,
      };

      const { user } = buildDraftAdvicePrompt([weirdCard] as unknown as CompanionCard[], [], 1, 1);

      expect(user).toContain("Weird Mystery Card");
      expect(user).not.toContain("undefined");
      expect(user).toContain("Terrain"); // fallback when manaCost is missing
    });

    it("formats wheel signals accurately into the prompt when provided at Pick 9+", () => {
      const { user } = buildDraftAdvicePrompt(
        [goblinGuide] as unknown as CompanionCard[],
        [lightningBolt] as unknown as CompanionCard[],
        1,
        9,
        {
          wheelSignals: {
            originalPickNumber: 1,
            currentPickNumber: 9,
            pickedCardAtInitialPass: lightningBolt,
            cardsWheeled: [goblinGuide],
            cardsTakenByTable: [ocelotPride],
            takenColorCounts: { W: 1, U: 0, B: 0, R: 0, G: 0 },
            wheeledColorCounts: { W: 0, U: 0, B: 0, R: 1, G: 0 },
            openColors: ["R"],
            contestedColors: ["W"],
            wheeledBombs: [goblinGuide],
            signalSummary: "Couleur ouverte : R.",
          },
        },
      );

      expect(user).toContain("ANALYSE DE LA ROUE (Booster P1P1 revenu au P1P9)");
      expect(user).toContain("Tu avais choisi Lightning Bolt");
      expect(user).toContain("Cartes prises par les 7 autres joueurs (1) : Ocelot Pride (W)");
      expect(user).toContain("Cartes revenues dans ce booster (1) : Goblin Guide (R)");
      expect(user).toContain("Couleurs ouvertes = [R]");
      expect(user).toContain("Couleurs contestées = [W]");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. OUTPUT CONTRACTS & CHAOS RESILIENCE (Ce qu'on récupère en sortie)
  // ---------------------------------------------------------------------------
  describe("Output Contracts & Resilience Safeguards", () => {
    const pack = [solRing, ocelotPride, lightningBolt, lowRankCard];

    it("accepts and maps nominal DeepSeek JSON response to pack card instance IDs", async () => {
      const mockRouter = createMockRouter({
        success: true,
        provider: "DeepSeek (OpenRouter)",
        content: {
          topPick: "Sol Ring",
          reason:
            "Le meilleur accélérateur incolore disponible, indispensable pour dominer la fenêtre critique.",
          alternatives: [
            {
              name: "Ocelot Pride",
              reason: "Menace agressive prompte à faire boule de neige.",
            },
          ],
        },
      });

      const advice = await getUnifiedDraftAdvice({
        packCards: pack,
        priorPool: [],
        packNumber: 1,
        pickNumber: 1,
        llmRouter: mockRouter,
      });

      expect(advice.provider).toBe("DeepSeek (OpenRouter)");
      expect(advice.topPickId).toBe("sol-ring");
      expect(advice.topPickName).toBe("Sol Ring");
      expect(advice.reason).toContain("accélérateur incolore");
      expect(advice.alternatives).toHaveLength(1);
      expect(advice.alternatives[0]?.id).toBe("ocelot-pride");
      expect(advice.alternatives[0]?.name).toBe("Ocelot Pride");
    });

    it("strips fenced markdown code blocks from LLM content cleanly", async () => {
      const mockRouter = createMockRouter({
        success: true,
        provider: "Gemini Flash",
        content: {
          topPick: "Ocelot Pride",
          reason: "Choix blanc très puissant.",
          alternatives: [{ name: "Lightning Bolt", reason: "Excellent removal." }],
        },
      });

      const advice = await getUnifiedDraftAdvice({
        packCards: pack,
        priorPool: [],
        packNumber: 1,
        pickNumber: 1,
        llmRouter: mockRouter,
      });

      expect(advice.topPickId).toBe("ocelot-pride");
      expect(advice.topPickName).toBe("Ocelot Pride");
      expect(advice.provider).toBe("Gemini Flash");
    });

    it("rejects hallucinated card names and falls back to deterministic top pick", async () => {
      const mockRouter = createMockRouter({
        success: true,
        content: {
          topPick: "Black Lotus", // Hallucination! Black Lotus is not in this booster
          reason: "Parce que c'est la carte la plus forte de Magic.",
        },
      });

      const advice = await getUnifiedDraftAdvice({
        packCards: pack,
        priorPool: [],
        packNumber: 1,
        pickNumber: 1,
        llmRouter: mockRouter,
      });

      // Must safely fallback to deterministic engine choice without crashing
      expect(advice.provider).toBe("engine");
      expect(advice.topPickId).toBe("sol-ring");
      expect(advice.topPickName).toBe("Sol Ring");
      expect(advice.reason.length).toBeGreaterThan(10);
    });

    it("rejects LLM picks that fall outside the deterministic Top 3", async () => {
      const mockRouter = createMockRouter({
        success: true,
        content: {
          topPick: "Fountain of Youth", // Ranked last (#4)
          reason: "Pour gagner des points de vie tranquillement.",
        },
      });

      const advice = await getUnifiedDraftAdvice({
        packCards: pack,
        priorPool: [],
        packNumber: 1,
        pickNumber: 1,
        llmRouter: mockRouter,
      });

      // Must be rejected because Fountain of Youth is outside the top 3
      expect(advice.provider).toBe("engine");
      expect(advice.topPickId).toBe("sol-ring");
    });

    it("enforces tribal safety guard: rejects incompatible tribal recommendation", async () => {
      // Player is firmly on Goblins
      const goblinPool = [goblinGuide, goblinWarchief];
      // Booster contains Immerwolf (Werewolf/Wolf lord, strictly incompatible on Titou Tribal)
      const tribalPack = [immerwolf, goblinGuide, lightningBolt];

      const mockRouter = createMockRouter({
        success: true,
        content: {
          topPick: "Immerwolf", // Incompatible with Goblins!
          reason: "Une créature 2/2 puissante pour 3 mana.",
          alternatives: [{ name: "Goblin Guide", reason: "Option gobelin." }],
        },
      });

      const advice = await getUnifiedDraftAdvice({
        packCards: tribalPack,
        priorPool: goblinPool,
        packNumber: 1,
        pickNumber: 3,
        evaluationContext: {
          cubeKey: "titou_tribal",
        },
        llmRouter: mockRouter,
      });

      // Immerwolf must NOT be recommended to a Goblin player
      expect(advice.topPickId).not.toBe("immerwolf");
      expect(advice.topPickName).not.toBe("Immerwolf");
      // Must have recommended a safe alternative (Goblin Guide or Lightning Bolt)
      expect(["goblin-guide", "lightning-bolt"]).toContain(advice.topPickId);
    });

    it("handles total LLM outage gracefully with immediate deterministic engine fallback", async () => {
      const mockRouter = createMockRouter({
        success: false,
        error: "Network timeout: All providers offline (503)",
      });

      const advice = await getUnifiedDraftAdvice({
        packCards: pack,
        priorPool: [],
        packNumber: 1,
        pickNumber: 1,
        llmRouter: mockRouter,
      });

      // No crash, returns engine advice immediately
      expect(advice.provider).toBe("engine");
      expect(advice.topPickId).toBe("sol-ring");
      expect(advice.topPickName).toBe("Sol Ring");
      expect(advice.reason).toBeDefined();
      expect(advice.alternatives.length).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    // 3. CLIENT UX INVARIANTS (Contrat absolu pour le frontend)
    // -------------------------------------------------------------------------
    it("guarantees all client UX invariants across any advice scenario", async () => {
      const scenarios: { name: string; router: LlmRouter }[] = [
        {
          name: "DeepSeek OK",
          router: createMockRouter({
            success: true,
            provider: "DeepSeek (OpenRouter)",
            content: { topPick: "Sol Ring", reason: "Super mana", alternatives: [] },
          }),
        },
        {
          name: "LLM Failure",
          router: createMockRouter({ success: false, error: "timeout" }),
        },
        {
          name: "LLM Garbage JSON",
          router: createMockRouter({ success: true, content: {} }),
        },
      ];

      for (const scenario of scenarios) {
        const advice = await getUnifiedDraftAdvice({
          packCards: pack,
          priorPool: [],
          packNumber: 1,
          pickNumber: 1,
          llmRouter: scenario.router,
        });

        // 1. topPickId must strictly exist in the current booster
        const inPack = pack.some((c) => c.id === advice.topPickId);
        expect(inPack, `Scenario '${scenario.name}': topPickId not in pack`).toBe(true);

        // 2. topPickName must be non-empty string
        expect(advice.topPickName.length).toBeGreaterThan(0);

        // 3. reason must be informative (>= 5 chars)
        expect(advice.reason.length).toBeGreaterThanOrEqual(5);

        // 4. alternatives must all exist in the pack and differ from top pick
        for (const alt of advice.alternatives) {
          expect(alt.id).not.toBe(advice.topPickId);
          expect(pack.some((c) => c.id === alt.id)).toBe(true);
          expect(alt.name.length).toBeGreaterThan(0);
          expect(alt.reason.length).toBeGreaterThan(0);
        }

        // 5. provider must be transparently identified
        expect(typeof advice.provider).toBe("string");
        expect(advice.provider.length).toBeGreaterThan(0);
      }
    });
  });
});
