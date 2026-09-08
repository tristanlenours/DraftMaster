import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface PoweredCubeFixture {
  readonly id: string;
  readonly result: string;
  readonly mainDeckSize: number;
  readonly mythicEvidence: string;
  readonly calibrationUse: string;
  readonly expectedStrengthRange: readonly [number, number];
  readonly mainDeck: readonly { readonly name: string; readonly quantity: number }[];
}

interface PoweredCubeFixtureSet {
  readonly schemaVersion: number;
  readonly fixtureId: string;
  readonly anchors: readonly PoweredCubeFixture[];
}

describe("Powered Cube trophy calibration fixtures", () => {
  it("preserves the five sourced decklists as qualitative positive anchors", () => {
    const fixtures = JSON.parse(
      readFileSync("data/calibration/powered-cube-trophy-decks-v1.json", "utf8"),
    ) as PoweredCubeFixtureSet;

    expect(fixtures.schemaVersion).toBe(1);
    expect(fixtures.fixtureId).toBe("powered-cube-trophy-decks-v1");
    expect(fixtures.anchors.map((anchor) => anchor.id)).toEqual([
      "eee93f65fb654472918f1d4a273d96dd",
      "375ecb3e1d434c65bcb88d21541a5ef6",
      "af99b1512a8745f3ac7284ff98f37913",
      "f62f0aeac9694c2ab33b7bdbd1ca4d94",
      "fead108d5e2f46fbac1314fcf5b972b7",
    ]);
    expect(fixtures.anchors.map((anchor) => anchor.result)).toEqual([
      "7-0",
      "7-1",
      "7-2",
      "7-2",
      "7-0",
    ]);

    for (const anchor of fixtures.anchors) {
      expect(anchor.mainDeck.reduce((sum, card) => sum + card.quantity, 0)).toBe(
        anchor.mainDeckSize,
      );
      expect(anchor.calibrationUse).toBe("qualitative-positive-anchor");
      expect(anchor.mythicEvidence).toBe("user-declared-unverified-on-deck-page");
      expect(anchor.expectedStrengthRange).toEqual([90, 98]);
    }
  });
});
