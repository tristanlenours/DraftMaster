import { describe, expect, it } from "vitest";
import {
  ALL_FRIEND_PROFILES,
  DEFAULT_FRIEND_SEAT_PROFILES,
  HUGUES_PROFILE,
  PAPAYOU_PROFILE,
  NICO_PROFILE,
  CEDRIC_PROFILE,
  REMI_PROFILE,
  IVAN_PROFILE,
  TITOU_PROFILE,
  THEO_PROFILE,
} from "../../../src/bots/friends/index.ts";

describe("FriendBotProfiles", () => {
  it("contains exactly 8 friend bot profiles", () => {
    expect(ALL_FRIEND_PROFILES).toHaveLength(8);
  });

  it("assigns the expected parody clone bot names", () => {
    expect(HUGUES_PROFILE.botName).toBe("Hugo");
    expect(HUGUES_PROFILE.cloneOf).toBe("Hugues");

    expect(PAPAYOU_PROFILE.botName).toBe("LaPapapaie");
    expect(PAPAYOU_PROFILE.cloneOf).toBe("Papayou");
    expect(PAPAYOU_PROFILE.preferredColors).toEqual(["U", "W", "R"]);

    expect(NICO_PROFILE.botName).toBe("Big Nixos");
    expect(NICO_PROFILE.cloneOf).toBe("Nico");

    expect(CEDRIC_PROFILE.botName).toBe("Cédrix");
    expect(CEDRIC_PROFILE.cloneOf).toBe("Cédric");

    expect(REMI_PROFILE.botName).toBe("Le Rouxeleur");
    expect(REMI_PROFILE.cloneOf).toBe("Rémi");

    expect(IVAN_PROFILE.botName).toBe("Le Gourmand");
    expect(IVAN_PROFILE.cloneOf).toBe("Ivan");

    expect(TITOU_PROFILE.botName).toBe("TitouBot");
    expect(TITOU_PROFILE.cloneOf).toBe("Titou");

    expect(THEO_PROFILE.botName).toBe("Le Rockeur");
    expect(THEO_PROFILE.cloneOf).toBe("Théo");
    expect(THEO_PROFILE.preferredColors).toEqual(["B", "R"]);
    expect(THEO_PROFILE.biases.reanimationBonus).toBe(5.0);
  });

  it("verifies seat assignments at the 8-player table", () => {
    expect(DEFAULT_FRIEND_SEAT_PROFILES).toHaveLength(8);
    expect(DEFAULT_FRIEND_SEAT_PROFILES[0]).toBeNull(); // Human player Tristan
    expect(DEFAULT_FRIEND_SEAT_PROFILES[1]?.botName).toBe("Big Nixos");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[2]?.botName).toBe("Le Rouxeleur");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[3]?.botName).toBe("Hugo");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[4]?.botName).toBe("Le Gourmand");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[5]?.botName).toBe("LaPapapaie");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[6]?.botName).toBe("Cédrix");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[7]?.botName).toBe("TitouBot");
  });

  it("checks that every profile has valid title, quote, temperature, and biases", () => {
    for (const profile of ALL_FRIEND_PROFILES) {
      expect(profile.name).toBeTruthy();
      expect(profile.botName).toBeTruthy();
      expect(profile.cloneOf).toBeTruthy();
      expect(profile.title).toBeTruthy();
      expect(profile.quote).toBeTruthy();
      expect(profile.temperature).toBeGreaterThan(0);
      expect(["elite", "medium", "ambitious"]).toContain(profile.level);
      expect(profile.biases).toBeDefined();
    }
  });
});
