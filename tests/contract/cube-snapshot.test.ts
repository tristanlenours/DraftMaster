import { describe, expect, it } from "vitest";

import { validateSnapshot, validateSnapshotJson } from "../../src/cubes/validate-snapshot.ts";
import {
  buildSyntheticSnapshot,
  loadInitialSnapshotFixture,
  refreshFixtureIntegrity,
} from "../fixtures/cube-fixtures.js";

describe("cube snapshot contract", () => {
  it.each(["", "{"])("rejects empty or malformed JSON", (raw) => {
    expect(validateSnapshotJson(raw)).toMatchObject({
      ok: false,
      error: { code: "INVALID_SNAPSHOT" },
    });
  });

  it("accepts the immutable initial Titou snapshot", () => {
    expect(validateSnapshot(loadInitialSnapshotFixture())).toMatchObject({
      ok: true,
      value: {
        snapshotId: "titou_tribal@2026-02-24.1",
        integrity: {
          cardCount: 545,
          uniquePrintingCount: 543,
          uniqueOracleCount: 542,
        },
      },
    });
  });

  it("rejects properties outside the strict schema", () => {
    const snapshot = { ...loadInitialSnapshotFixture(), unexpected: true };

    expect(validateSnapshot(snapshot)).toMatchObject({
      ok: false,
      error: { code: "INVALID_SNAPSHOT" },
    });
  });

  it.each([
    [
      "version",
      (snapshot: ReturnType<typeof loadInitialSnapshotFixture>) => {
        snapshot.version = "2026-03-01";
      },
      "INVALID_CUBE_VERSION",
    ],
    [
      "provenance",
      (snapshot: ReturnType<typeof loadInitialSnapshotFixture>) => {
        snapshot.source.provider = "Unknown";
      },
      "INVALID_SNAPSHOT",
    ],
  ])("rejects invalid %s", (_label, mutate, code) => {
    const snapshot = structuredClone(loadInitialSnapshotFixture());
    mutate(snapshot);

    expect(validateSnapshot(snapshot)).toMatchObject({ ok: false, error: { code } });
  });

  it("rejects a snapshot with only 359 instances", () => {
    expect(validateSnapshot(buildSyntheticSnapshot(359, "2026-03-01.1"))).toMatchObject({
      ok: false,
      error: { code: "INSUFFICIENT_CARDS" },
    });
  });

  it("rejects duplicate instance IDs", () => {
    const snapshot = buildSyntheticSnapshot(360, "2026-03-01.1");
    const firstCard = snapshot.cards[0];
    const secondCard = snapshot.cards[1];
    if (firstCard === undefined || secondCard === undefined) {
      throw new Error("Synthetic snapshot is incomplete.");
    }
    secondCard.instanceId = firstCard.instanceId;
    refreshFixtureIntegrity(snapshot);

    expect(validateSnapshot(snapshot)).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_INSTANCE_ID" },
    });
  });

  it("rejects non-contiguous source indexes", () => {
    const snapshot = buildSyntheticSnapshot(360, "2026-03-01.1");
    const finalCard = snapshot.cards.at(-1);
    if (finalCard === undefined) {
      throw new Error("Synthetic snapshot is incomplete.");
    }
    finalCard.sourceIndex = 999;
    refreshFixtureIntegrity(snapshot);

    expect(validateSnapshot(snapshot)).toMatchObject({
      ok: false,
      error: { code: "INVALID_SNAPSHOT" },
    });
  });

  it.each(["cardCount", "uniquePrintingCount", "uniqueOracleCount"] as const)(
    "rejects an altered %s integrity counter",
    (counter) => {
      const snapshot = buildSyntheticSnapshot(360, "2026-03-01.1");
      snapshot.integrity[counter] += 1;

      expect(validateSnapshot(snapshot)).toMatchObject({
        ok: false,
        error: { code: "INTEGRITY_MISMATCH" },
      });
    },
  );

  it("rejects an altered canonical digest", () => {
    const snapshot = buildSyntheticSnapshot(360, "2026-03-01.1");
    snapshot.integrity.canonicalSha256 = "0".repeat(64);

    expect(validateSnapshot(snapshot)).toMatchObject({
      ok: false,
      error: { code: "INTEGRITY_MISMATCH" },
    });
  });

  it("allows repeated cards and printing identities as distinct instances", () => {
    const snapshot = buildSyntheticSnapshot(360, "2026-03-01.1");
    const firstCard = snapshot.cards[0];
    const secondCard = snapshot.cards[1];
    if (firstCard === undefined || secondCard === undefined) {
      throw new Error("Synthetic snapshot is incomplete.");
    }
    secondCard.printingId = firstCard.printingId;
    secondCard.oracleId = firstCard.oracleId;
    secondCard.name = firstCard.name;
    refreshFixtureIntegrity(snapshot);

    expect(validateSnapshot(snapshot)).toMatchObject({ ok: true });
  });

  it.each([540, 360])("accepts a synthetic Titou version with %i instances", (count) => {
    expect(validateSnapshot(buildSyntheticSnapshot(count, "2026-03-01.1"))).toMatchObject({
      ok: true,
      value: { integrity: { cardCount: count } },
    });
  });
});
