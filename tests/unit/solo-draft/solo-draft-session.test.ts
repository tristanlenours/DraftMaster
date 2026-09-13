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
    expect(state).toMatchObject({ nextBoosterFromBotName: "TitouBot" });

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

  it("identifies the bot feeding the next booster for each rotation direction", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Tristan",
      seed: 42,
    });

    expect(session.getStateDto()).toMatchObject({ nextBoosterFromBotName: "TitouBot" });

    for (let round = 0; round < 15; round++) {
      const state = session.getStateDto();
      const firstCard = state.currentBooster[0];
      if (!firstCard) throw new Error("Booster card missing");
      session.makePick(firstCard.instanceId);
    }

    expect(session.getStateDto()).toMatchObject({
      packNumber: 2,
      nextBoosterFromBotName: "Big Nixos",
    });
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

    // Verify AI Deck Recommendation is populated
    expect(deckState.deckRecommendation).toBeDefined();
    expect(deckState.deckRecommendation?.maindeckCardInstanceIds.length).toBe(23);
    const totalRecoLands =
      (deckState.deckRecommendation?.basicLands.Plains ?? 0) +
      (deckState.deckRecommendation?.basicLands.Island ?? 0) +
      (deckState.deckRecommendation?.basicLands.Swamp ?? 0) +
      (deckState.deckRecommendation?.basicLands.Mountain ?? 0) +
      (deckState.deckRecommendation?.basicLands.Forest ?? 0);
    expect(totalRecoLands).toBe(17);
    expect(deckState.deckRecommendation?.archetype).toBeDefined();
    expect(["S", "A", "B", "C", "D"]).toContain(deckState.deckRecommendation?.overallTier);

    const directReco = session.getDeckRecommendation();
    expect(directReco.maindeckCardInstanceIds.length).toBe(23);

    // Reject finalizing with < 23 cards
    await expect(
      session.buildDeckAndFinalize({
        sessionId: session.sessionId,
        maindeckCardInstanceIds: deckState.playerPool.slice(0, 20).map((c) => c.instanceId),
      }),
    ).rejects.toThrow(/exactly 23 cards/);

    // Select exactly 23 cards and publish
    const chosen23 = deckState.playerPool.slice(0, 23).map((c) => c.instanceId);
    const finalResult = await session.buildDeckAndFinalize(
      {
        sessionId: session.sessionId,
        maindeckCardInstanceIds: chosen23,
        publishToLeaderboard: true,
      },
      {
        customReportsDir: TEST_REPORTS_DIR,
        customLeaderboardPath: TEST_LEADERBOARD_PATH,
        customAdminDraftsPath: TEST_ADMIN_DRAFTS_PATH,
      },
    );

    expect(session.status).toBe("completed");
    expect(finalResult.playerName).toBe("Tristan Champion");
    expect(finalResult.isPublished).toBe(true);
    expect(finalResult.evaluation.overallScore).toBeGreaterThan(0);
    expect(finalResult.evaluation.overallScore).toBeLessThanOrEqual(100);
    expect(finalResult.evaluation.allMaindeck.length).toBe(40); // 23 spells + 17 lands
    expect(finalResult.leaderboardEntry?.rank).toBeDefined();

    // Verify reports generated on disk
    const walkthroughStat = await stat(finalResult.reports.walkthroughPath);
    expect(walkthroughStat.isFile()).toBe(true);
    expect(walkthroughStat.size).toBeGreaterThan(1000);

    const boostersStat = await stat(finalResult.reports.boostersPath);
    expect(boostersStat.isFile()).toBe(true);
    expect(boostersStat.size).toBeGreaterThan(1000);
  }, 15000);

  it("does not publish to leaderboard in training mode (publishToLeaderboard: false)", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Training Hero",
      seed: 42,
    });

    for (let round = 0; round < 45; round++) {
      const state = session.getStateDto();
      const cardToPick = state.currentBooster[0];
      if (!cardToPick) throw new Error("Booster card missing");
      session.makePick(cardToPick.instanceId);
    }

    const deckState = session.getStateDto();
    const chosen23 = deckState.playerPool.slice(0, 23).map((c) => c.instanceId);
    const result = await session.buildDeckAndFinalize(
      {
        sessionId: session.sessionId,
        maindeckCardInstanceIds: chosen23,
        publishToLeaderboard: false,
      },
      {
        customReportsDir: TEST_REPORTS_DIR,
        customLeaderboardPath: TEST_LEADERBOARD_PATH,
        customAdminDraftsPath: TEST_ADMIN_DRAFTS_PATH,
      },
    );

    expect(result.isPublished).toBe(false);
    expect(result.leaderboardEntry).toBeUndefined();

    // Can publish later on demand
    const published = await session.publishToLeaderboard(TEST_LEADERBOARD_PATH);
    expect(published.entry.playerName).toBe("Training Hero");
    expect(published.entry.rank).toBeDefined();
  }, 15000);

  it("provides AI pick advice on demand during drafting and flags session as unhomologated", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Curious Drafter",
      seed: 42,
    });

    expect(session.isHomologated).toBe(true);

    const advice = await session.getPickAdvice();
    expect(advice.topPickId).toBeDefined();
    expect(advice.topPickName).toBeDefined();
    expect(advice.reason.length).toBeGreaterThan(0);
    expect(Array.isArray(advice.alternatives)).toBe(true);
    expect(session.isHomologated).toBe(false);
  });

  it("includes all 8 seats with overallTier and radarTiers in final buildDeckAndFinalize result", async () => {
    const session = await SoloDraftSession.create({
      playerName: "Tier Challenger",
      seed: 42,
    });

    for (let round = 0; round < 45; round++) {
      const state = session.getStateDto();
      const cardToPick = state.currentBooster[0];
      if (!cardToPick) throw new Error("Booster card missing");
      session.makePick(cardToPick.instanceId);
    }

    const deckState = session.getStateDto();
    const chosen23 = deckState.playerPool.slice(0, 23).map((c) => c.instanceId);
    const result = await session.buildDeckAndFinalize(
      {
        sessionId: session.sessionId,
        maindeckCardInstanceIds: chosen23,
        publishToLeaderboard: false,
      },
      {
        customReportsDir: TEST_REPORTS_DIR,
        customLeaderboardPath: TEST_LEADERBOARD_PATH,
        customAdminDraftsPath: TEST_ADMIN_DRAFTS_PATH,
      },
    );

    // Human evaluation has overallTier and radarTiers
    expect(result.evaluation.overallTier).toMatch(/^[SABCD]$/);
    expect(result.evaluation.radarTiers.power).toMatch(/^[SABCD]$/);
    expect(result.evaluation.radarTiers.synergy).toMatch(/^[SABCD]$/);
    expect(result.evaluation.radarTiers.curve).toMatch(/^[SABCD]$/);
    expect(result.evaluation.radarTiers.mana).toMatch(/^[SABCD]$/);
    expect(result.evaluation.radarTiers.interaction).toMatch(/^[SABCD]$/);

    // 8 seats are returned in result
    expect(result.seats.length).toBe(8);
    expect(result.seats[0]?.seatId).toBe(0);
    expect(result.seats[0]?.isBot).toBe(false);
    expect(result.seats[0]?.deck.overallTier).toMatch(/^[SABCD]$/);

    for (let s = 1; s < 8; s++) {
      const botSeat = result.seats[s];
      expect(botSeat).toBeDefined();
      expect(botSeat?.isBot).toBe(true);
      expect(botSeat?.deck.overallTier).toMatch(/^[SABCD]$/);
      expect(botSeat?.deck.allMaindeck.length).toBe(40);
    }
  }, 15000);

  it("randomizes bot seats and returns full seats DTO with matching feeder", async () => {
    const session = await SoloDraftSession.create({
      playerName: "RandomTester",
      seed: 8888,
      randomizeSeats: true,
    });

    const state = session.getStateDto();
    expect(state.seats).toHaveLength(8);
    expect(state.seats?.[0]?.isHuman).toBe(true);
    expect(state.seats?.[0]?.name).toBe("RandomTester");

    // All 7 bot seats are populated
    for (let i = 1; i <= 7; i++) {
      expect(state.seats?.[i]?.isHuman).toBe(false);
      expect(state.seats?.[i]?.name).toBeTruthy();
      expect(state.seats?.[i]?.avatar).toBeTruthy();
    }

    // Feeder in pack 1 is seat 7
    const seat7Bot = state.seats?.[7];
    expect(state.nextBoosterFromBotName).toBe(seat7Bot?.botName ?? seat7Bot?.name);
  });

  it("assigns explicit botIds to seats 1 through 7 when provided", async () => {
    // Put Le Gourmand at seat 1 (left) and Big Nixos at seat 7 (right)
    const explicitBots = ["ivan", "cedric", "hugues", "papayou", "remi", "theo", "nico"];
    const session = await SoloDraftSession.create({
      playerName: "CustomOrderPlayer",
      seed: 1234,
      botIds: explicitBots,
    });

    const state = session.getStateDto();
    expect(state.seats).toHaveLength(8);
    expect(state.seats?.[1]?.id).toBe("ivan");
    expect(state.seats?.[1]?.name).toBe("Le Gourmand");

    expect(state.seats?.[7]?.id).toBe("nico");
    expect(state.seats?.[7]?.name).toBe("Big Nixos");

    // In Pack 1, booster is fed from seat 7 (Big Nixos)
    expect(state.nextBoosterFromBotName).toBe("Big Nixos");
  });
});
