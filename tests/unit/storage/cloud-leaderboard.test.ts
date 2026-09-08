import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getUnifiedLeaderboard,
  saveUnifiedLeaderboardEntry,
  getMagiciensProfilesWithStats,
  getDeckShareData,
} from "../../../src/storage/cloud-leaderboard.ts";
import {
  isSupabaseConfigured,
  getPublicSupabaseConfig,
} from "../../../src/storage/supabase-client.ts";
import type { LeaderboardEntry } from "../../../src/solo-draft/solo-draft-types.ts";

describe("Cloud Leaderboard & Supabase Storage Adapter", () => {
  const TEST_DIR = resolve(process.cwd(), "tests/fixtures/test-cloud-storage");
  const TEST_LEADERBOARD = resolve(TEST_DIR, "leaderboard.json");

  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignorer
    }
  });

  it("gère l'absence de configuration Supabase en mode dégradé local sécurisé", () => {
    // Dans l'environnement de test sans SUPABASE_URL
    const configured = isSupabaseConfigured();
    expect(typeof configured).toBe("boolean");

    const pubConfig = getPublicSupabaseConfig();
    expect(pubConfig).toBeDefined();
    if (!configured) {
      expect(pubConfig.configured).toBe(false);
    }
  });

  it("sauvegarde et lit un record dans le dépôt unifié localement", async () => {
    const entryInput: Omit<LeaderboardEntry, "id" | "rank"> & { magicienSlug: string } = {
      playerName: "Nico",
      magicienSlug: "nico",
      overallScore: 88.5,
      macroAxes: { power: 90, synergy: 85, consistency: 90 },
      radar: { power: 90, synergy: 85, curve: 92, mana: 88, interaction: 95 },
      archetype: {
        category: "control",
        label: "Dimir Control",
        description: "Contrôle pur et tempo",
        primaryColors: ["U", "B"],
        splashColors: [],
      },
      draftDurationSeconds: 240,
      totalDurationSeconds: 400,
      seed: 42,
      cubeKey: "titou_tribal",
      occurredAt: new Date().toISOString(),
      isHomologated: true,
      reports: { walkthroughUrl: "/reports/test.html", boostersUrl: "/reports/test-boosters.html" },
      maindeckCards: [],
      basicLands: { Plains: 0, Island: 9, Swamp: 8, Mountain: 0, Forest: 0 },
    };

    const saveResult = await saveUnifiedLeaderboardEntry(entryInput, TEST_LEADERBOARD);
    expect(saveResult.entry.id).toBeDefined();
    expect(saveResult.entry.playerName).toBe("Nico");
    expect(saveResult.entry.rank).toBe(1);

    const list = await getUnifiedLeaderboard(TEST_LEADERBOARD);
    expect(list.length).toBe(1);
    expect(list[0]?.playerName).toBe("Nico");
    expect(list[0]?.overallScore).toBe(88.5);
  });

  it("renvoie la liste des 8 Magiciens avec leurs profils et statistiques", async () => {
    const magiciens = await getMagiciensProfilesWithStats();
    expect(magiciens.length).toBe(8);

    const slugs = magiciens.map((m) => m.slug);
    expect(slugs).toContain("nico");
    expect(slugs).toContain("titou");
    expect(slugs).toContain("cedric");
    expect(slugs).toContain("hugues");
    expect(slugs).toContain("remi");
    expect(slugs).toContain("papayou");
    expect(slugs).toContain("ivan");
    expect(slugs).toContain("theo");

    const nico = magiciens.find((m) => m.slug === "nico");
    expect(nico?.nickname).toBe("Big Nixos");
    expect(nico?.avatarUrl).toContain("dicebear");
  });

  it("permet de retrouver un deck par son ID pour le partage", async () => {
    const notFound = await getDeckShareData("unknown-id-1234");
    expect(notFound).toBeNull();
  });
});
