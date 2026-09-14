import { describe, expect, it } from "vitest";

import { verifyCoachData } from "../../../scripts/verify-coach-data.ts";

describe("coach data integrity", () => {
  it("keeps catalogs, rankings, cube manifests and readiness states coherent", async () => {
    const report = await verifyCoachData(process.cwd());

    expect(report.errors).toEqual([]);
    expect(report.catalog).toMatchObject({ itemCount: 1948, masterCount: 1948 });
    expect(report.cubes.map(({ cubeKey, status }) => ({ cubeKey, status }))).toEqual([
      { cubeKey: "cedric_cube", status: "partial" },
      { cubeKey: "hugues_pauper", status: "blocked" },
      { cubeKey: "nico_candyshop", status: "ready" },
      { cubeKey: "titou_arena_peasant_plus", status: "blocked" },
      { cubeKey: "titou_tribal", status: "ready" },
    ]);
    expect(report.cubes.filter(({ status }) => status === "ready")).toSatisfy(
      (cubes: typeof report.cubes) =>
        cubes.every(({ contextVersion, archetypeModelVersion }) =>
          Boolean(contextVersion && archetypeModelVersion),
        ),
    );
  });
});
