import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { SoloDraftSession } from "../../../src/solo-draft/solo-draft-session.ts";

const TEST_REPORTS_DIR = ".scratch/test-reports";
const TEST_LEADERBOARD_PATH = ".scratch/test-leaderboard.json";
const TEST_ADMIN_DRAFTS_PATH = ".scratch/test-admin-drafts.json";

describe("SoloDraftSession", () => {
  beforeEach(async () => {
    try {
      await rm(resolve(process.cwd(), TEST_REPORTS_DIR), { recursive: true, force: true });
      await rm(resolve(process.cwd(), TEST_LEADERBOARD_PATH), { force: true });
      await rm(resolve(process.cwd(), TEST_ADMIN_DRAFTS_PATH), { force: true });
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    try {
      await rm(resolve(process.cwd(), TEST_REPORTS_DIR), { recursive: true, force: true });
      await rm(resolve(process.cwd(), TEST_LEADERBOARD_PATH), { force: true });
      await rm(resolve(process.cwd(), TEST_ADMIN_DRAFTS_PATH), { force: true });
    } catch {
      // ignore
    }
  });

  it("initializes a solo draft session with player name and initial booster", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Tristan",
      seed: 42,
    });

    expect(session.playerName).toBe("Tristan");
    expect(session.seed).toBe(42);
    expect(session.status).toBe("drafting");
    expect(session.isHomologated).toBe(true);

    const state = session.getStateDto();
    expect(state.playerName).toBe("Tristan");
    expect(state.packNumber).toBe(1);
    expect(state.pickNumber).toBe(1);
    expect(state.roundIndex).toBe(0);
    expect(state.currentBooster.length).toBe(15);
    expect(state.playerPool.length).toBe(0);

    // Verify card pedagogical and language enrichment
    const sampleCard = state.currentBooster[0];
    expect(sampleCard).toBeDefined();
    expect(typeof sampleCard?.oracleText).toBe("string");
    expect(sampleCard?.howToPlay).toBeDefined();
  });

  it("rejects picking a card that is not in the booster", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Tristan",
      seed: 42,
    });

    expect(() => session.makePick("invalid-card-id")).toThrow(/is not in current booster/);
  });

  it("advances round and passes booster when a valid card is picked", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Tristan",
      seed: 42,
    });

    const initialBooster = session.getStateDto().currentBooster;
    const cardToPick = initialBooster[0];
    expect(cardToPick).toBeDefined();
    if (!cardToPick) throw new Error("Booster card missing");

    const nextState = session.makePick(cardToPick.instanceId);

    expect(nextState.packNumber).toBe(1);
    expect(nextState.pickNumber).toBe(2);
    expect(nextState.roundIndex).toBe(1);
    expect(nextState.playerPool.length).toBe(1);
    expect(nextState.playerPool[0]?.instanceId).toBe(cardToPick.instanceId);
    expect(nextState.currentBooster.length).toBe(14);
    expect(nextState.lastPickedCard?.instanceId).toBe(cardToPick.instanceId);
  });

  it("calculates optimal 17 basic lands matching colored spells", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Tristan",
      seed: 42,
    });

    const booster = session.getStateDto().currentBooster;
    const sampleIds = booster.slice(0, 5).map((c) => c.instanceId);

    const lands = session.calculateOptimalBasicLands(sampleIds);
    const totalLands = lands.Plains + lands.Island + lands.Swamp + lands.Mountain + lands.Forest;
    expect(totalLands).toBe(17);
  });

  it("runs a full 45-pick draft, builds a 23-card deck, and generates reports & leaderboard", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Tristan Champion",
      seed: 42,
    });

    // Pick 45 cards (always pick the first available card in each booster)
    for (let round = 0; round < 45; round++) {
      const state = session.getStateDto();
      expect(state.status).toBe("drafting");
      const cardToPick = state.currentBooster[0];
      expect(cardToPick).toBeDefined();
      if (!cardToPick) throw new Error("Booster card missing");
      session.makePick(cardToPick.instanceId);
    }

    const deckState = session.getStateDto();
    expect(deckState.status).toBe("deckbuilding");
    expect(deckState.playerPool.length).toBe(45);

    // Reject finalizing with < 23 cards
    await expect(
      session.buildDeckAndFinalize({
        sessionId: session.sessionId,
        maindeckCardInstanceIds: deckState.playerPool.slice(0, 20).map((c) => c.instanceId),
      }),
    ).rejects.toThrow(/exactly 23 cards/);

    // Select exactly 23 cards
    const chosen23 = deckState.playerPool.slice(0, 23).map((c) => c.instanceId);
    const finalResult = await session.buildDeckAndFinalize(
      {
        sessionId: session.sessionId,
        maindeckCardInstanceIds: chosen23,
      },
      {
        customReportsDir: TEST_REPORTS_DIR,
        customLeaderboardPath: TEST_LEADERBOARD_PATH,
        customAdminDraftsPath: TEST_ADMIN_DRAFTS_PATH,
      },
    );

    expect(session.status).toBe("completed");
    expect(finalResult.playerName).toBe("Tristan Champion");
    expect(finalResult.evaluation.overallScore).toBeGreaterThan(0);
    expect(finalResult.evaluation.overallScore).toBeLessThanOrEqual(100);
    expect(finalResult.evaluation.allMaindeck.length).toBe(40); // 23 spells + 17 lands
    expect(finalResult.leaderboardEntry.rank).toBeDefined();

    // Verify reports generated on disk
    const walkthroughStat = await stat(finalResult.reports.walkthroughPath);
    expect(walkthroughStat.isFile()).toBe(true);
    expect(walkthroughStat.size).toBeGreaterThan(1000);

    const boostersStat = await stat(finalResult.reports.boostersPath);
    expect(boostersStat.isFile()).toBe(true);
    expect(boostersStat.size).toBeGreaterThan(1000);
  }, 15000);
});
