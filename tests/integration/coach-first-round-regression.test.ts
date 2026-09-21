import { describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SoloDraftSession } from "../../src/solo-draft/solo-draft-session.ts";
import { getUnifiedDraftAdvice } from "../../src/domain/coaching/draft-coach-service.ts";
import type { LlmRouter } from "../../src/companion/llm-router.ts";
import type { CardEvaluationInput } from "../../src/domain/coaching/types.ts";
import { createRequestHandler } from "../../scripts/serve-web.mjs";

describe("Coach IA - Test de Non-Régression Obligatoire Tour 1 (Pertinence & Durée)", () => {
  it("exécute un premier tour complet (P1P1 à P1P15) en validant pertinence tactique et respect strict du SLA de durée", async () => {
    // 1. Initialiser une session de draft solo sur le cube titou_tribal avec seed déterministe
    const session = await SoloDraftSession.create({
      playerName: "Tour 1 Tester",
      cubeKey: "titou_tribal",
      seed: 42,
      randomizeSeats: false,
    });

    expect(session.status).toBe("drafting");
    const initial = session.getStateDto();
    expect(initial.packNumber).toBe(1);
    expect(initial.pickNumber).toBe(1);

    const latencies: number[] = [];

    // 2. Parcourir les 15 picks du Pack 1
    for (let pickIndex = 1; pickIndex <= 15; pickIndex++) {
      const state = session.getStateDto();
      expect(state.packNumber).toBe(1);
      expect(state.pickNumber).toBe(pickIndex);

      const boosterCards = state.currentBooster;
      const expectedCardCount = 16 - pickIndex;
      expect(boosterCards.length).toBe(expectedCardCount);

      const boosterInstanceIds = boosterCards.map((c) => c.instanceId);

      // Mesure de la durée d'obtention du conseil
      const startTime = performance.now();
      const advice = await session.getPickAdvice();
      const elapsedMs = performance.now() - startTime;
      latencies.push(elapsedMs);

      // -----------------------------------------------------------------------
      // A. VÉRIFICATIONS STRICTES DE DURÉE (SLA)
      // -----------------------------------------------------------------------
      // SLA absolu : aucun pick ne doit jamais dépasser 2 000 ms
      expect(elapsedMs).toBeLessThan(2000);

      // Du P1P2 au P1P15, le prefetch d'arrière-plan doit rendre la réponse quasi-instantanée (< 100 ms)
      if (pickIndex > 1) {
        expect(elapsedMs).toBeLessThan(100);
      }

      // -----------------------------------------------------------------------
      // B. VÉRIFICATIONS STRICTES DE PERTINENCE TACTIQUE
      // -----------------------------------------------------------------------
      // 1. Zéro hallucination : la carte recommandée DOIT être dans le booster proposé
      expect(boosterInstanceIds).toContain(advice.topPickId);
      expect(advice.topPickName).toBeTruthy();

      const matchedCard = boosterCards.find((c) => c.instanceId === advice.topPickId);
      expect(matchedCard).toBeDefined();
      expect(matchedCard?.name).toBe(advice.topPickName);

      // 2. Justification riche et substantielle
      expect(advice.reason.length).toBeGreaterThanOrEqual(15);

      // 3. Alternatives valides et distinctes
      expect(Array.isArray(advice.alternatives)).toBe(true);
      for (const alt of advice.alternatives) {
        expect(boosterInstanceIds).toContain(alt.id);
        expect(alt.id).not.toBe(advice.topPickId);
        expect(alt.name).toBeTruthy();
        expect(alt.reason.length).toBeGreaterThan(0);
      }
      const altIds = advice.alternatives.map((a) => a.id);
      expect(new Set(altIds).size).toBe(altIds.length); // alternatives uniques

      // 4. Signaux de la roue (Picks 9 à 15 : le booster vu au tour 1 revient après 8 tours de table)
      if (pickIndex >= 9) {
        expect(advice.wheelSignals).toBeDefined();
        expect(advice.wheelSignals?.originalPickNumber).toBe(pickIndex - 8);
        expect(advice.wheelSignals?.currentPickNumber).toBe(pickIndex);
        expect(advice.wheelSignals?.cardsWheeled.length).toBeGreaterThan(0);
        expect(advice.wheelSignals?.signalSummary.length).toBeGreaterThan(10);
      }

      // 5. Réaliser le pick (choix de la carte recommandée par le coach)
      session.makePick(advice.topPickId);
    }

    // 3. Vérification de fin de tour 1
    const finalState = session.getStateDto();
    expect(finalState.playerPool.length).toBe(15);
    expect(finalState.packNumber).toBe(2);
    expect(finalState.pickNumber).toBe(1);

    // Temps moyen sur l'ensemble du tour 1 inférieur à 100 ms
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    expect(avgLatency).toBeLessThan(100);
  });

  it("garantit le SLA de durée (< 2 000 ms) et la pertinence du conseil en cas de panne ou latence extrême du LLM (circuit breaker)", async () => {
    // Création d'un mock router qui simule une requête pendante de 10 secondes (ou un 503)
    const slowRouter = {
      hasConfiguredKeys: () => true,
      generateJson: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        return { success: false, content: null, provider: "None" };
      },
    } as unknown as LlmRouter;

    const sampleCards: CardEvaluationInput[] = [
      {
        id: "c1",
        name: "Lightning Bolt",
        colors: ["R"],
        staticScore: 45,
        cmc: 1,
        types: ["Instant"],
        oracleText: "Deal 3 damage.",
      },
      {
        id: "c2",
        name: "Sol Ring",
        colors: [],
        staticScore: 50,
        cmc: 1,
        types: ["Artifact"],
        oracleText: "{T}: Add {C}{C}.",
      },
      {
        id: "c3",
        name: "Counterspell",
        colors: ["U"],
        staticScore: 42,
        cmc: 2,
        types: ["Instant"],
        oracleText: "Counter target spell.",
      },
    ];

    const start = performance.now();
    const advice = await getUnifiedDraftAdvice({
      packCards: sampleCards,
      priorPool: [],
      packNumber: 1,
      pickNumber: 1,
      llmRouter: slowRouter,
    });
    const duration = performance.now() - start;

    // Le circuit breaker / timeout global DOIT couper sous les 2 000 ms (+ petite marge d'ordonnancement)
    expect(duration).toBeLessThan(2300);

    // Bascule automatique sur l'engine déterministe
    expect(advice.provider).toBe("engine");
    expect(advice.topPickId).toBe("c2"); // Sol Ring a le score le plus élevé (50)
    expect(advice.topPickName).toBe("Sol Ring");
    expect(advice.reason.length).toBeGreaterThan(15);
    expect(sampleCards.map((c) => c.id)).toContain(advice.topPickId);
  });

  it("valide le parcours HTTP API /api/draft/advice sur l'intégralité du Pack 1 (SLA et pertinence en conditions web)", async () => {
    const testDir = await mkdtemp(join(tmpdir(), "draftmaster-coach-http-"));
    const handler = createRequestHandler({
      reportsDirectory: join(testDir, "reports"),
      adminDraftsPath: join(testDir, "admin-drafts.json"),
      leaderboardPath: join(testDir, "leaderboard.json"),
    });

    const server = createServer(handler);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        resolve();
      });
    });
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      throw new Error("Unable to obtain server port");
    }
    const baseUrl = `http://localhost:${String(addr.port)}`;

    try {
      // 1. Démarrer le draft
      const startRes = await fetch(`${baseUrl}/api/draft/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: "HTTP SLA Tester", seed: 42 }),
      });
      expect(startRes.status).toBe(200);
      const startData = (await startRes.json()) as {
        ok: boolean;
        session: { sessionId: string; currentBooster: { instanceId: string; name: string }[] };
      };
      expect(startData.ok).toBe(true);
      const sessionId = startData.session.sessionId;

      let currentBooster = startData.session.currentBooster;

      // 2. Jouer les 15 picks du Pack 1 via HTTP
      for (let pick = 1; pick <= 15; pick++) {
        const boosterIds = currentBooster.map((c) => c.instanceId);

        // Appel de l'endpoint /api/draft/advice
        const tStart = performance.now();
        const adviceRes = await fetch(`${baseUrl}/api/draft/advice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const elapsed = performance.now() - tStart;

        expect(adviceRes.status).toBe(200);
        const adviceData = (await adviceRes.json()) as {
          ok: boolean;
          advice: {
            topPickId: string;
            topPickName: string;
            reason: string;
            alternatives: { id: string; name: string; reason: string }[];
            wheelSignals?: unknown;
          };
        };
        expect(adviceData.ok).toBe(true);

        // SLA HTTP < 2000 ms (et < 150 ms en précalculé pour picks > 1)
        expect(elapsed).toBeLessThan(2000);
        if (pick > 1) {
          expect(elapsed).toBeLessThan(150);
        }

        // Pertinence : carte obligatoirement dans le booster
        expect(boosterIds).toContain(adviceData.advice.topPickId);
        expect(adviceData.advice.topPickName).toBeTruthy();
        expect(adviceData.advice.reason.length).toBeGreaterThan(15);

        // Faire le pick recommandé
        const pickRes = await fetch(`${baseUrl}/api/draft/pick`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, cardInstanceId: adviceData.advice.topPickId }),
        });
        expect(pickRes.status).toBe(200);
        const pickData = (await pickRes.json()) as {
          ok: boolean;
          session: { currentBooster: { instanceId: string; name: string }[] };
        };
        expect(pickData.ok).toBe(true);
        currentBooster = pickData.session.currentBooster;
      }
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
      await rm(testDir, { recursive: true, force: true });
    }
  });
});
