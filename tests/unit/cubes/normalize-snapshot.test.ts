import { describe, expect, it } from "vitest";

import {
  buildRawCubeFixture,
  normalizationMetadata,
  type SnapshotFixture,
} from "../../fixtures/cube-fixtures.js";
import { type CubeOperationResult, loadSnapshotNormalizationApi } from "../../helpers/cube-apis.js";

const { normalizeSnapshot } = await loadSnapshotNormalizationApi();

function expectNormalized(
  result: CubeOperationResult<Readonly<SnapshotFixture>>,
): Extract<typeof result, { ok: true }>["value"] {
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) {
    throw new Error(`Expected normalization to succeed, received ${result.error.code}.`);
  }
  return result.value;
}

describe("normalize Titou snapshot", () => {
  it("selects only the mainboard while retaining a basic land listed there", () => {
    const result = normalizeSnapshot({
      cube: buildRawCubeFixture(),
      version: "2026-03-01.1",
      ...normalizationMetadata,
    });
    const snapshot = expectNormalized(result);

    expect(snapshot.cards).toHaveLength(360);
    expect(snapshot.cards[0]).toMatchObject({ name: "Plains", sourceIndex: 0 });
    expect(snapshot.cards.map(({ name }) => name)).not.toContain("Excluded Forest");
    expect(snapshot.cards.map(({ name }) => name)).not.toContain("Excluded Candidate");
  });

  it("preserves printing and Oracle identities without deduplicating cards", () => {
    const snapshot = expectNormalized(
      normalizeSnapshot({
        cube: buildRawCubeFixture(),
        version: "2026-03-01.1",
        ...normalizationMetadata,
      }),
    );
    const secondCard = snapshot.cards[1];
    const thirdCard = snapshot.cards[2];

    expect(secondCard).toMatchObject({ name: "Shared Oracle Card" });
    expect(thirdCard).toMatchObject({ name: "Shared Oracle Card" });
    expect(secondCard?.oracleId).toBe(thirdCard?.oracleId);
    expect(secondCard?.printingId).not.toBe(thirdCard?.printingId);
  });

  it("creates stable ordered instance IDs", () => {
    const snapshot = expectNormalized(
      normalizeSnapshot({
        cube: buildRawCubeFixture(),
        version: "2026-03-01.1",
        ...normalizationMetadata,
      }),
    );

    expect(snapshot.cards[0]?.instanceId).toBe("titou_tribal@2026-03-01.1/mainboard/000");
    expect(snapshot.cards[9]?.instanceId).toBe("titou_tribal@2026-03-01.1/mainboard/009");
    expect(snapshot.cards[359]?.instanceId).toBe("titou_tribal@2026-03-01.1/mainboard/359");
  });

  it("returns the existing snapshot for an unchanged reimport", () => {
    const first = expectNormalized(
      normalizeSnapshot({
        cube: buildRawCubeFixture(),
        version: "2026-03-01.1",
        ...normalizationMetadata,
      }),
    );
    const second = expectNormalized(
      normalizeSnapshot({
        cube: buildRawCubeFixture(),
        existingSnapshot: first,
        version: "2026-03-01.1",
        ...normalizationMetadata,
        retrievedAt: "2026-03-01T12:10:00.000Z",
      }),
    );

    expect(second).toEqual(first);
  });

  it("refuses changed content under an existing version", () => {
    const cube = buildRawCubeFixture();
    const existingSnapshot = expectNormalized(
      normalizeSnapshot({ cube, version: "2026-03-01.1", ...normalizationMetadata }),
    );
    const changedCube = structuredClone(cube);
    const firstCard = changedCube.cards.mainboard[0];
    if (firstCard === undefined) {
      throw new Error("Raw cube fixture is incomplete.");
    }
    firstCard.details.name = "Changed card";

    expect(
      normalizeSnapshot({
        cube: changedCube,
        existingSnapshot,
        version: "2026-03-01.1",
        ...normalizationMetadata,
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_CUBE_VERSION" } });
  });

  it("accepts an explicit dated suffix for a changed revision", () => {
    const cube = buildRawCubeFixture();
    const previousSnapshot = expectNormalized(
      normalizeSnapshot({ cube, version: "2026-03-01.1", ...normalizationMetadata }),
    );
    const changedCube = structuredClone(cube);
    changedCube.version += 1;
    const firstCard = changedCube.cards.mainboard[0];
    if (firstCard === undefined) {
      throw new Error("Raw cube fixture is incomplete.");
    }
    firstCard.details.name = "Changed card";

    const nextSnapshot = expectNormalized(
      normalizeSnapshot({
        cube: changedCube,
        existingSnapshot: previousSnapshot,
        version: "2026-03-01.2",
        ...normalizationMetadata,
      }),
    );

    expect(nextSnapshot.snapshotId).toBe("titou_tribal@2026-03-01.2");
    expect(nextSnapshot.cards[0]?.instanceId).toBe("titou_tribal@2026-03-01.2/mainboard/000");
  });
});
