import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import {
  rankLeaderboardEntries,
  getLeaderboard,
  addLeaderboardEntry,
} from "../../../src/solo-draft/leaderboard.ts";
import type { LeaderboardEntry } from "../../../src/solo-draft/solo-draft-types.ts";

const TEST_LEADERBOARD_FILE = "data/test-leaderboard.json";

describe("Mur des Records / Leaderboard", () => {
  beforeEach(async () => {
    try {
      await rm(TEST_LEADERBOARD_FILE, { force: true });
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    try {
      await rm(TEST_LEADERBOARD_FILE, { force: true });
    } catch {
      // ignore
    }
  });

  it("ranks entries by score descending, then duration ascending", () => {
    const entries: LeaderboardEntry[] = [
      {
        id: "1",
        playerName: "Player Slow 85",
        overallScore: 85,
        macroAxes: { power: 85, synergy: 85, consistency: 85 },
        radar: { power: 85, synergy: 85, curve: 85, mana: 85, interaction: 85 },
        archetype: {
          category: "aggro",
          primaryColors: ["R"],
          splashColors: [],
          label: "Aggro",
          description: "",
        },
        draftDurationSeconds: 500,
        totalDurationSeconds: 1000,
        seed: 1,
        cubeKey: "titou_tribal",
        occurredAt: "2026-09-01T10:00:00.000Z",
        isHomologated: true,
        reports: { walkthroughUrl: "", boostersUrl: "" },
        maindeckCards: [],
        basicLands: { Plains: 0, Island: 0, Swamp: 0, Mountain: 17, Forest: 0 },
      },
      {
        id: "2",
        playerName: "Player Fast 85",
        overallScore: 85,
        macroAxes: { power: 85, synergy: 85, consistency: 85 },
        radar: { power: 85, synergy: 85, curve: 85, mana: 85, interaction: 85 },
        archetype: {
          category: "aggro",
          primaryColors: ["R"],
          splashColors: [],
          label: "Aggro",
          description: "",
        },
        draftDurationSeconds: 300,
        totalDurationSeconds: 600,
        seed: 2,
        cubeKey: "titou_tribal",
        occurredAt: "2026-09-02T10:00:00.000Z",
        isHomologated: true,
        reports: { walkthroughUrl: "", boostersUrl: "" },
        maindeckCards: [],
        basicLands: { Plains: 0, Island: 0, Swamp: 0, Mountain: 17, Forest: 0 },
      },
      {
        id: "3",
        playerName: "Champion 92",
        overallScore: 92,
        macroAxes: { power: 92, synergy: 92, consistency: 92 },
        radar: { power: 92, synergy: 92, curve: 92, mana: 92, interaction: 92 },
        archetype: {
          category: "control",
          primaryColors: ["U", "W"],
          splashColors: [],
          label: "Control",
          description: "",
        },
        draftDurationSeconds: 400,
        totalDurationSeconds: 800,
        seed: 3,
        cubeKey: "titou_tribal",
        occurredAt: "2026-09-03T10:00:00.000Z",
        isHomologated: true,
        reports: { walkthroughUrl: "", boostersUrl: "" },
        maindeckCards: [],
        basicLands: { Plains: 9, Island: 8, Swamp: 0, Mountain: 0, Forest: 0 },
      },
    ];

    const ranked = rankLeaderboardEntries(entries);
    expect(ranked[0]?.playerName).toBe("Champion 92");
    expect(ranked[0]?.rank).toBe(1);

    expect(ranked[1]?.playerName).toBe("Player Fast 85");
    expect(ranked[1]?.rank).toBe(2);

    expect(ranked[2]?.playerName).toBe("Player Slow 85");
    expect(ranked[2]?.rank).toBe(3);
  });

  it("loads empty records if file is absent", async () => {
    const list = await getLeaderboard(TEST_LEADERBOARD_FILE);
    expect(list.length).toBe(0);
  });

  it("adds a new high score at rank 1 and flags isNewHighScore", async () => {
    const result = await addLeaderboardEntry(
      {
        playerName: "Super Grand Master",
        overallScore: 99,
        macroAxes: { power: 99, synergy: 99, consistency: 99 },
        radar: { power: 99, synergy: 99, curve: 99, mana: 99, interaction: 99 },
        archetype: {
          category: "combo",
          primaryColors: ["W", "U", "B", "R", "G"],
          splashColors: [],
          label: "God Tier Cube",
          description: "",
        },
        draftDurationSeconds: 250,
        totalDurationSeconds: 500,
        seed: 42,
        cubeKey: "titou_tribal",
        occurredAt: new Date().toISOString(),
        isHomologated: true,
        reports: {
          walkthroughUrl: "/reports/test.html",
          boostersUrl: "/reports/test-boosters.html",
        },
        maindeckCards: [],
        basicLands: { Plains: 4, Island: 4, Swamp: 3, Mountain: 3, Forest: 3 },
      },
      TEST_LEADERBOARD_FILE,
    );

    expect(result.isNewHighScore).toBe(true);
    expect(result.entry.rank).toBe(1);
    expect(result.allEntries[0]?.playerName).toBe("Super Grand Master");

    // Persisted properly
    const reloaded = await getLeaderboard(TEST_LEADERBOARD_FILE);
    expect(reloaded[0]?.playerName).toBe("Super Grand Master");
  });
});
