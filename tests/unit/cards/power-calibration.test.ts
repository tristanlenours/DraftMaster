import { describe, expect, it } from "vitest";
import {
  fitIsotonicCalibration,
  predictIsotonicScore,
  roundPowerScore,
  selectRepresentativeScore,
} from "../../../src/cards/power-calibration.ts";

describe("power score calibration", () => {
  it("selects the most frequent observation and resolves ties by the earliest observation", () => {
    expect(
      selectRepresentativeScore([
        { score: 31, observedAt: 1 },
        { score: 30, observedAt: 2 },
        { score: 31, observedAt: 3 },
        { score: 29, observedAt: 4 },
      ]),
    ).toBe(31);
    expect(
      selectRepresentativeScore([
        { score: 48, observedAt: 1 },
        { score: 47, observedAt: 2 },
      ]),
    ).toBe(48);
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
