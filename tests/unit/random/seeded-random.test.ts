import { describe, expect, it } from "vitest";

import {
  RANDOM_SYSTEM_METADATA,
  createSeededRandom,
  deriveStreamSeed,
  type RandomStreamName,
} from "../../../src/random/seeded-random.ts";

const expectedSeeds: Readonly<Record<RandomStreamName, number>> = {
  distribution: -1_756_759_403,
  "policy:seat:0": -819_600_728,
  "policy:seat:1": 205_480_162,
  "policy:seat:2": -1_382_311_167,
  "policy:seat:3": -1_922_379_586,
  "policy:seat:4": 250_574_435,
  "policy:seat:5": 90_278_005,
  "policy:seat:6": 1_823_606_222,
  "policy:seat:7": -1_643_270_695,
};

describe("seed derivation", () => {
  it("locks the SHA-256 draftmaster-seed-v1 vectors for every named stream", () => {
    for (const [streamName, expected] of Object.entries(expectedSeeds) as [
      RandomStreamName,
      number,
    ][]) {
      expect(deriveStreamSeed(42, streamName)).toBe(expected);
    }
  });

  it.each([-2_147_483_649, 2_147_483_648, 1.5, Number.NaN])(
    "rejects a non-int32 public seed (%s)",
    (seed) => {
      expect(() => deriveStreamSeed(seed, "distribution")).toThrow(RangeError);
    },
  );
});

describe("seeded random stream", () => {
  it("locks xoroshiro128plus and unbiased inclusive integer sampling", () => {
    const random = createSeededRandom(42, "distribution");

    expect(Array.from({ length: 8 }, () => random.nextInt(0, 99))).toEqual([
      50, 98, 1, 8, 60, 45, 70, 55,
    ]);
  });

  it("locks Fisher-Yates output without mutating its input", () => {
    const input = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const random = createSeededRandom(42, "distribution");

    expect(random.shuffle(input)).toEqual([3, 8, 4, 7, 9, 6, 2, 5, 1, 0]);
    expect(input).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("keeps distribution and all seat streams independent", () => {
    const distribution = createSeededRandom(42, "distribution");
    const seats = Array.from({ length: 8 }, (_, seat) =>
      createSeededRandom(42, `policy:seat:${String(seat)}` as RandomStreamName),
    );
    const expectedSeatZero = createSeededRandom(42, "policy:seat:0").nextInt(0, 1_000_000);

    distribution.nextInt(0, 1_000_000);
    distribution.nextInt(0, 1_000_000);

    expect(seats[0]?.nextInt(0, 1_000_000)).toBe(expectedSeatZero);
    expect(new Set(seats.map((random) => random.nextInt(0, 1_000_000))).size).toBe(8);
  });

  it("publishes immutable algorithm and implementation versions", () => {
    expect(RANDOM_SYSTEM_METADATA).toEqual({
      algorithm: "xoroshiro128plus",
      algorithmVersion: "1",
      implementation: "pure-rand",
      implementationVersion: "8.4.2",
      seedDerivationVersion: "draftmaster-seed-v1",
    });
    expect(Object.isFrozen(RANDOM_SYSTEM_METADATA)).toBe(true);
  });

  it("rejects invalid integer ranges", () => {
    const random = createSeededRandom(42, "distribution");

    expect(() => random.nextInt(2, 1)).toThrow(RangeError);
    expect(() => random.nextInt(0.5, 2)).toThrow(RangeError);
  });
});
