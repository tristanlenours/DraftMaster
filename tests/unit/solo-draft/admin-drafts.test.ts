import { describe, it, expect, afterEach } from "vitest";
import { rm } from "node:fs/promises";
import {
  getAdminDrafts,
  getAdminDraftById,
  saveAdminDraft,
} from "../../../src/solo-draft/admin-drafts.ts";
import type {
  AdminDraftEntry,
  AdminDraftSeatSummary,
} from "../../../src/solo-draft/solo-draft-types.ts";

const TEST_ADMIN_DRAFTS_PATH = "data/test-admin-drafts.json";

describe("Admin Drafts Storage", () => {
  afterEach(async () => {
    try {
      await rm(TEST_ADMIN_DRAFTS_PATH, { force: true });
    } catch {
      // ignore
    }
  });

  const dummyDraft: AdminDraftEntry = {
    id: "draft-test-1",
    sessionId: "sess-test-1",
    seed: 42,
    cubeKey: "titou_tribal",
    cubeName: "Titou Cube",
    playerName: "Tristan",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    draftDurationSeconds: 300,
    totalDurationSeconds: 600,
    reports: {
      walkthroughUrl: "/reports/test.html",
      boostersUrl: "/reports/test-boosters.html",
    },
    seats: [
      {
        seatId: 0,
        isBot: false,
        botId: "human",
        botName: "Tristan",
        title: "Challenger",
        quote: "GG",
        level: "elite",
        preferredColors: ["U", "B"],
        deck: {
          maindeckSpells: [],
          maindeckLands: [],
          allMaindeck: [],
          sideboard: [],
          archetype: {
            category: "control",
            primaryColors: ["U", "B"],
            splashColors: [],
            label: "Dimir Control",
            description: "Test description",
          },
          overallScore: 85,
          radar: { power: 80, synergy: 85, curve: 90, mana: 85, interaction: 85 },
          audit: {
            cardCount: 40,
            hasRequiredSpells: true,
            hasRecommendedLands: true,
            colorBreakdown: { W: 0, U: 12, B: 11, R: 0, G: 0, C: 0 },
            curveDistribution: { 0: 0, 1: 3, 2: 8, 3: 6, 4: 4, 5: 1, 6: 1, 7: 0 },
          },
          macroAxes: { power: 80, synergy: 85, consistency: 87 },
          strengths: ["Bonne courbe"],
          weaknesses: ["Peu de sweepers"],
          recommendations: ["Ajouter plus de pioche"],
        } as unknown as AdminDraftSeatSummary["deck"],
      },
    ],
  };

  it("returns empty array when file does not exist", async () => {
    const drafts = await getAdminDrafts("data/non-existent-admin.json");
    expect(drafts).toEqual([]);
  });

  it("saves and retrieves admin draft entries", async () => {
    await saveAdminDraft(dummyDraft, TEST_ADMIN_DRAFTS_PATH);

    const drafts = await getAdminDrafts(TEST_ADMIN_DRAFTS_PATH);
    expect(drafts.length).toBe(1);
    expect(drafts[0]?.id).toBe("draft-test-1");
    expect(drafts[0]?.seats.length).toBe(1);
    expect(drafts[0]?.seats[0]?.botName).toBe("Tristan");
  });

  it("retrieves draft by id or sessionId", async () => {
    await saveAdminDraft(dummyDraft, TEST_ADMIN_DRAFTS_PATH);

    const byId = await getAdminDraftById("draft-test-1", TEST_ADMIN_DRAFTS_PATH);
    expect(byId).not.toBeNull();
    expect(byId?.seed).toBe(42);

    const bySession = await getAdminDraftById("sess-test-1", TEST_ADMIN_DRAFTS_PATH);
    expect(bySession).not.toBeNull();
    expect(bySession?.playerName).toBe("Tristan");

    const missing = await getAdminDraftById("unknown", TEST_ADMIN_DRAFTS_PATH);
    expect(missing).toBeNull();
  });
});
