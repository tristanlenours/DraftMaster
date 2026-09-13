import { describe, expect, it } from "vitest";
import {
  ALL_FRIEND_PROFILES,
  DEFAULT_FRIEND_SEAT_PROFILES,
  buildTableSeatAssignments,
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

  it("assigns the expected bot names", () => {
    expect(HUGUES_PROFILE.botName).toBe("HugE");

    expect(PAPAYOU_PROFILE.botName).toBe("Papayourt");
    expect(PAPAYOU_PROFILE.preferredColors).toEqual(["U", "W", "R"]);

    expect(NICO_PROFILE.botName).toBe("Big Nixos");

    expect(CEDRIC_PROFILE.botName).toBe("Jakko");

    expect(REMI_PROFILE.botName).toBe("Le Rouxeleur");

    expect(IVAN_PROFILE.botName).toBe("Le Gourmand");

    expect(TITOU_PROFILE.botName).toBe("TitouBot");

    expect(THEO_PROFILE.botName).toBe("Le Rockeur");
    expect(THEO_PROFILE.preferredColors).toEqual(["B"]);
    expect(THEO_PROFILE.biases.reanimationBonus).toBe(5.0);
    expect(THEO_PROFILE.biases.colorDiscipline).toBe(0.9);
  });

  it("verifies seat assignments at the 8-player table", () => {
    expect(DEFAULT_FRIEND_SEAT_PROFILES).toHaveLength(8);
    expect(DEFAULT_FRIEND_SEAT_PROFILES[0]).toBeNull(); // Human player
    expect(DEFAULT_FRIEND_SEAT_PROFILES[1]?.botName).toBe("Big Nixos");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[2]?.botName).toBe("Le Rouxeleur");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[3]?.botName).toBe("HugE");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[4]?.botName).toBe("Le Gourmand");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[5]?.botName).toBe("Papayourt");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[6]?.botName).toBe("Jakko");
    expect(DEFAULT_FRIEND_SEAT_PROFILES[7]?.botName).toBe("TitouBot");
  });

  it("checks that every profile has valid title, quote, temperature, and biases", () => {
    for (const profile of ALL_FRIEND_PROFILES) {
      expect(profile.name).toBeTruthy();
      expect(profile.botName).toBeTruthy();
      expect(profile.title).toBeTruthy();
      expect(profile.quote).toBeTruthy();
      expect(profile.temperature).toBeGreaterThan(0);
      expect(["elite", "medium", "ambitious"]).toContain(profile.level);
      expect(profile.biases).toBeDefined();
    }
  });

  it("randomizes the 7 bot seats when randomize: true is specified", () => {
    const defaultSeats = buildTableSeatAssignments();
    expect(defaultSeats[0]).toBeNull();

    const randomized1 = buildTableSeatAssignments(undefined, { seed: 12345, randomize: true });
    const randomized2 = buildTableSeatAssignments(undefined, { seed: 99999, randomize: true });
    const randomizedDeterministic = buildTableSeatAssignments(undefined, {
      seed: 12345,
      randomize: true,
    });

    expect(randomized1).toHaveLength(8);
    expect(randomized1[0]).toBeNull();
    expect(randomized2[0]).toBeNull();

    // Verify determinism: same seed produces identical seating
    expect(randomized1.map((p) => p?.id)).toEqual(randomizedDeterministic.map((p) => p?.id));

    // Verify all 7 seats are distinct bots
    const botIds1 = randomized1.slice(1).map((p) => p?.id);
    expect(new Set(botIds1).size).toBe(7);

    // Verify different seeds produce different permutations
    const botIds2 = randomized2.slice(1).map((p) => p?.id);
    expect(botIds1).not.toEqual(botIds2);
  });
});
