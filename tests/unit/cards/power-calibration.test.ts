import { describe, expect, it } from "vitest";
import {
  detectUntappedEloContradiction,
  fitIsotonicCalibration,
  predictIsotonicScore,
  roundPowerScore,
  selectRepresentativeScore,
} from "../../../src/cards/power-calibration.ts";

describe("power score calibration", () => {
  it("selects the most recent observation when scores vary over time", () => {
    expect(
      selectRepresentativeScore([
        { score: 31, observedAt: 1 },
        { score: 30, observedAt: 2 },
        { score: 31, observedAt: 3 },
        { score: 29, observedAt: 4 },
      ]),
    ).toBe(29);
    expect(
      selectRepresentativeScore([
        { score: 48, observedAt: 1 },
        { score: 47, observedAt: 2 },
      ]),
    ).toBe(47);
  });

  it("protects established high-tier cards from isolated noisy tail drops and applies pillar guardrails", () => {
    // Sheoldred-like profile: 6 stable observations at 44 followed by 2 noisy day-1 observations at 28, 26
    expect(
      selectRepresentativeScore([
        { score: 44, observedAt: 1 },
        { score: 44, observedAt: 2 },
        { score: 44, observedAt: 3 },
        { score: 44, observedAt: 4 },
        { score: 44, observedAt: 5 },
        { score: 44, observedAt: 6 },
        { score: 28, observedAt: 7 },
        { score: 26, observedAt: 8 },
      ]),
    ).toBe(44);

    // Skullclamp-like profile: 5 observations at 37-39 followed by 5 lower observations at 25-27
    expect(
      selectRepresentativeScore([
        { score: 39, observedAt: 1 },
        { score: 39, observedAt: 2 },
        { score: 39, observedAt: 3 },
        { score: 39, observedAt: 4 },
        { score: 37, observedAt: 5 },
        { score: 27, observedAt: 6 },
        { score: 25, observedAt: 7 },
        { score: 27, observedAt: 8 },
        { score: 27, observedAt: 9 },
        { score: 26, observedAt: 10 },
      ]),
    ).toBe(37);
  });

  it("fits a monotonic calibration even when samples contain local inversions", () => {
    const blocks = fitIsotonicCalibration([
      { input: 1000, target: 20 },
      { input: 1200, target: 30 },
      { input: 1400, target: 28 },
      { input: 1600, target: 40 },
    ]);

    const predictions = [1000, 1200, 1400, 1600].map((input) =>
      predictIsotonicScore(blocks, input),
    );
    expect(predictions).toEqual([20, 29, 29, 40]);
    expect(predictions).toEqual([...predictions].sort((left, right) => left - right));
  });

  it("keeps the calibrated DraftMaster scale within the 1 to 55 range", () => {
    expect(roundPowerScore(-10)).toBe(1);
    expect(roundPowerScore(31.04)).toBe(31);
    expect(roundPowerScore(80)).toBe(55);
  });

  describe("untapped Elo contradiction rule", () => {
    // Linear Elo -> score map: 1300 -> 20, 1500 -> 30, 1700 -> 40.
    const blocks = fitIsotonicCalibration([
      { input: 1300, target: 20 },
      { input: 1500, target: 30 },
      { input: 1700, target: 40 },
    ]);
    const wellSampled = (elo: number) => ({ elo, pickCount: 50_000 });

    it("replaces a near-zero native score contradicted by a well-sampled Elo", () => {
      expect(detectUntappedEloContradiction(11, wellSampled(1500), blocks)).toBe(30);
      expect(detectUntappedEloContradiction(5, wellSampled(1400), blocks)).toBe(25);
    });

    it("trusts the native score when the gap is under 12 points", () => {
      // Elo 1340 -> 22: native 11 is half the estimate but only 11 points below it.
      expect(detectUntappedEloContradiction(11, wellSampled(1340), blocks)).toBe(undefined);
      expect(detectUntappedEloContradiction(10, wellSampled(1340), blocks)).toBe(22);
    });

    it("trusts mid-band native scores when the estimate is less than double", () => {
      // Gap 16 but 33 < 2 * 17: a Fabled Passage-like disagreement stays native.
      expect(detectUntappedEloContradiction(17, wellSampled(1560), blocks)).toBe(undefined);
      expect(detectUntappedEloContradiction(16, wellSampled(1540), blocks)).toBe(32);
    });

    it("ignores Elo below 1300 or backed by fewer than 10 000 picks", () => {
      expect(detectUntappedEloContradiction(1, wellSampled(1299), blocks)).toBe(undefined);
      expect(detectUntappedEloContradiction(1, wellSampled(1300), blocks)).toBe(20);
      expect(detectUntappedEloContradiction(5, { elo: 1600, pickCount: 9_999 }, blocks)).toBe(
        undefined,
      );
      expect(detectUntappedEloContradiction(5, { elo: 1600 }, blocks)).toBe(undefined);
      expect(detectUntappedEloContradiction(5, undefined, blocks)).toBe(undefined);
    });

    it("keeps a low native score that 17lands corroborates as a draft trap", () => {
      expect(
        detectUntappedEloContradiction(5, wellSampled(1500), blocks, {
          grade: "F",
          gameCount: 2_000,
        }),
      ).toBe(undefined);
      expect(
        detectUntappedEloContradiction(5, wellSampled(1500), blocks, {
          grade: "D-",
          gameCount: 4_000,
        }),
      ).toBe(undefined);
    });

    it("still lifts the score when the 17lands grade is better or thinly sampled", () => {
      expect(
        detectUntappedEloContradiction(5, wellSampled(1500), blocks, {
          grade: "D",
          gameCount: 4_000,
        }),
      ).toBe(30);
      expect(
        detectUntappedEloContradiction(5, wellSampled(1500), blocks, {
          grade: "F",
          gameCount: 1_999,
        }),
      ).toBe(30);
      expect(detectUntappedEloContradiction(5, wellSampled(1500), blocks, { grade: "F" })).toBe(30);
    });

    it("never lowers a native score that exceeds the Elo estimate", () => {
      expect(detectUntappedEloContradiction(51, wellSampled(1300), blocks)).toBe(undefined);
    });
  });
});
