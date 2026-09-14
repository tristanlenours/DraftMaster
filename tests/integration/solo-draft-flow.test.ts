import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequestHandler } from "../../scripts/serve-web.mjs";
import { createFinalDeckCoach } from "../../src/multiplayer-draft/final-deck-coach.ts";

describe("Solo Draft Web API & Flow Integration", () => {
  let server: Server;
  let baseUrl: string;
  let testStorageDir: string;
  let workspaceAdminDraftsBefore: string;

  beforeAll(async () => {
    testStorageDir = await mkdtemp(join(tmpdir(), "draftmaster-solo-flow-"));
    workspaceAdminDraftsBefore = await readFile(
      resolve(process.cwd(), "data/admin-drafts.json"),
      "utf8",
    );
    const handler = createRequestHandler({
      reportsDirectory: join(testStorageDir, "reports"),
      adminDraftsPath: join(testStorageDir, "admin-drafts.json"),
      leaderboardPath: join(testStorageDir, "leaderboard.json"),
      finalDeckCoach: createFinalDeckCoach(),
    });
    server = createServer(handler);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        resolve();
      });
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://localhost:${String(addr.port)}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    await rm(testStorageDir, { recursive: true, force: true });
  });

  it("fetches the leaderboard list via GET /api/leaderboard", async () => {
    const res = await fetch(`${baseUrl}/api/leaderboard`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; entries: unknown[] };
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.entries)).toBe(true);
    expect(data.entries.length).toBeGreaterThanOrEqual(0);
  });

  it("completes full solo draft lifecycle via HTTP API", async () => {
    // 1. Start draft
    const startRes = await fetch(`${baseUrl}/api/draft/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "API Tester", seed: 42 }),
    });
    expect(startRes.status).toBe(200);
    const startData = (await startRes.json()) as {
      ok: boolean;
      session: {
        sessionId: string;
        roundIndex: number;
        packNumber: number;
        pickNumber: number;
        currentBooster: { instanceId: string }[];
        playerPool: { instanceId: string }[];
        coachContext: {
          contextVersion: string;
          snapshotId: string;
          archetypeModelVersion: string;
        };
      };
    };

    expect(startData.ok).toBe(true);
    const sessionId = startData.session.sessionId;
    expect(startData.session.currentBooster.length).toBe(15);
    expect(startData.session.playerPool.length).toBe(0);
    expect(startData.session.coachContext).toEqual({
      contextVersion: "coach-context@1",
      snapshotId: "titou_tribal@2026-02-24.1",
      archetypeModelVersion: "archetype-synergy@2",
    });

    // 1b. Test AI Coach Advice endpoint
    const adviceRes = await fetch(`${baseUrl}/api/draft/advice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    expect(adviceRes.status).toBe(200);
    const adviceData = (await adviceRes.json()) as {
      ok: boolean;
      advice: {
        topPickId: string;
        topPickName: string;
        reason: string;
        alternatives: { id: string; name: string; reason: string }[];
      };
    };
    expect(adviceData.ok).toBe(true);
    expect(adviceData.advice.topPickId).toBeDefined();
    expect(adviceData.advice.topPickName).toBeDefined();
    expect(adviceData.advice.reason.length).toBeGreaterThan(0);
    expect(Array.isArray(adviceData.advice.alternatives)).toBe(true);

    // 2. Play all 45 rounds
    let currentBooster = startData.session.currentBooster;
    let pool: { instanceId: string }[] = [];

    for (let round = 0; round < 45; round++) {
      const cardToPick = currentBooster[0];
      if (!cardToPick) {
        throw new Error("Missing card in booster");
      }
      const pickRes = await fetch(`${baseUrl}/api/draft/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, cardInstanceId: cardToPick.instanceId }),
      });
      expect(pickRes.status).toBe(200);
      const pickData = (await pickRes.json()) as {
        ok: boolean;
        session: {
          roundIndex: number;
          status: string;
          currentBooster: { instanceId: string }[];
          playerPool: { instanceId: string }[];
        };
      };
      currentBooster = pickData.session.currentBooster;
      pool = pickData.session.playerPool;

      if (round === 44) {
        expect(pickData.session.status).toBe("deckbuilding");
      }
    }

    expect(pool.length).toBe(45);

    // 2b. Test AI Pre-construction Recommendation endpoint
    const recoRes = await fetch(`${baseUrl}/api/draft/recommend-deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    expect(recoRes.status).toBe(200);
    const recoData = (await recoRes.json()) as {
      ok: boolean;
      recommendation: {
        maindeckCardInstanceIds: string[];
        basicLands: {
          Plains: number;
          Island: number;
          Swamp: number;
          Mountain: number;
          Forest: number;
        };
        archetype: { label: string };
        overallTier: string;
      };
    };
    expect(recoData.ok).toBe(true);
    const totalLands =
      recoData.recommendation.basicLands.Plains +
      recoData.recommendation.basicLands.Island +
      recoData.recommendation.basicLands.Swamp +
      recoData.recommendation.basicLands.Mountain +
      recoData.recommendation.basicLands.Forest;
    expect(recoData.recommendation.maindeckCardInstanceIds.length + totalLands).toBe(40);
    expect(totalLands).toBeGreaterThanOrEqual(0);
    expect(totalLands).toBeLessThanOrEqual(18);
    expect(recoData.recommendation.overallTier).toMatch(/^[SABCD]$/);

    // 3. Finalize the flexible 40-card recommendation
    const recommendedMaindeck = recoData.recommendation.maindeckCardInstanceIds;
    const deckRes = await fetch(`${baseUrl}/api/draft/deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        maindeckCardInstanceIds: recommendedMaindeck,
      }),
    });

    expect(deckRes.status).toBe(200);
    const deckData = (await deckRes.json()) as {
      ok: boolean;
      result: {
        playerName: string;
        evaluation: {
          overallScore: number;
          overallTier: string;
          radarTiers: {
            power: string;
            synergy: string;
            curve: string;
            mana: string;
            interaction: string;
          };
        };
        reports: { walkthroughUrl: string; boostersUrl: string };
        seats: {
          seatId: number;
          isBot: boolean;
          deck: {
            overallTier: string;
            radarTiers: { power: string };
          };
        }[];
      };
    };

    expect(deckData.ok).toBe(true);
    expect(deckData.result.playerName).toBe("API Tester");
    expect(deckData.result.evaluation.overallScore).toBeGreaterThan(0);
    expect(deckData.result.evaluation.overallTier).toMatch(/^[SABCD]$/);
    expect(deckData.result.evaluation.radarTiers.power).toMatch(/^[SABCD]$/);
    expect(deckData.result.seats.length).toBe(8);
    expect(deckData.result.seats[0]?.deck.overallTier).toMatch(/^[SABCD]$/);
    expect(deckData.result.seats[1]?.deck.overallTier).toMatch(/^[SABCD]$/);

    // 4. Fetch the generated HTML report through the server
    const reportRes = await fetch(`${baseUrl}${deckData.result.reports.walkthroughUrl}`);
    expect(reportRes.status).toBe(200);
    const htmlText = await reportRes.text();
    expect(htmlText).toContain("<!DOCTYPE html>");
    expect(htmlText).toContain("API Tester");

    // 5. Query /api/reports list
    const reportsListRes = await fetch(`${baseUrl}/api/reports`);
    expect(reportsListRes.status).toBe(200);
    const reportsListData = (await reportsListRes.json()) as {
      ok: boolean;
      reports: { filename: string }[];
    };
    expect(reportsListData.ok).toBe(true);
    expect(reportsListData.reports.some((r) => r.filename.includes("API_Tester"))).toBe(true);

    // 6. Query /api/admin/drafts to verify all 8 seats (human + 7 bots) are available
    const adminDraftsRes = await fetch(`${baseUrl}/api/admin/drafts`);
    expect(adminDraftsRes.status).toBe(200);
    const adminDraftsData = (await adminDraftsRes.json()) as {
      ok: boolean;
      drafts: {
        id: string;
        playerName: string;
        seats: {
          seatId: number;
          isBot: boolean;
          botName: string;
          deck: { overallScore: number };
        }[];
      }[];
    };
    expect(adminDraftsData.ok).toBe(true);
    const myDraft = adminDraftsData.drafts.find((d) => d.playerName === "API Tester");
    expect(myDraft).toBeDefined();
    expect(myDraft?.seats.length).toBe(8);
    expect(myDraft?.seats[0]?.isBot).toBe(false);
    expect(myDraft?.seats[1]?.isBot).toBe(true);

    const isolatedAdminDrafts = await readFile(join(testStorageDir, "admin-drafts.json"), "utf8");
    expect(isolatedAdminDrafts).toContain("API Tester");
    expect(await readFile(resolve(process.cwd(), "data/admin-drafts.json"), "utf8")).toBe(
      workspaceAdminDraftsBefore,
    );
  }, 90000);
});
