import { describe, expect, it } from "vitest";
import {
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
});
