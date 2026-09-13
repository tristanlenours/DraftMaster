import { describe, expect, it } from "vitest";

import { loadActiveCubeSnapshot } from "../../src/cubes/load-active-snapshot.ts";

describe("loadActiveCubeSnapshot", () => {
  it.each(["titou_tribal", "nico_candyshop", "cedric_cube", "titou_arena_peasant_plus"])(
    "charge le Snapshot actif draftable de %s",
    async (cubeKey) => {
      const result = await loadActiveCubeSnapshot(process.cwd(), cubeKey);

      expect(result).toMatchObject({
        ok: true,
        value: { cubeKey },
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(typeof result.value.integrity.cardCount).toBe("number");
      expect(result.value.cards.length).toBeGreaterThanOrEqual(360);
    },
  );

  it("refuse le cube Hugues tant que son mainboard ne remplit pas les 360 sieges", async () => {
    await expect(loadActiveCubeSnapshot(process.cwd(), "hugues_pauper")).resolves.toMatchObject({
      ok: false,
      error: { code: "INSUFFICIENT_CARDS" },
    });
  });
});
