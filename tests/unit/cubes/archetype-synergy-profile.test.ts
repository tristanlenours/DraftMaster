import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ArchetypeSynergyProfileRegistry,
  validateArchetypeSynergyProfileJson,
} from "../../../src/cubes/archetype-synergy-profile.ts";

const rootDir = resolve(import.meta.dirname, "../../..");

describe("Archetype Synergy Profile", () => {
  it.each([
    ["titou_tribal", 7],
    ["nico_candyshop", 8],
  ] as const)(
    "loads the versioned %s profile and resolves every card to its archive",
    async (cubeKey, count) => {
      const profileResult = await ArchetypeSynergyProfileRegistry.fromFile(
        resolve(rootDir, `data/cubes/${cubeKey}/archetype-synergy-v1.json`),
      );
      expect(profileResult.ok).toBe(true);
      if (!profileResult.ok) return;

      const raw = JSON.parse(
        await readFile(resolve(rootDir, `data/cubes/${cubeKey}/cubecobra-raw.json`), "utf8"),
      ) as {
        readonly cards: {
          readonly mainboard: readonly {
            readonly details: { readonly oracle_id: string; readonly name: string };
          }[];
        };
      };
      const archivedByOracleId = new Map(
        raw.cards.mainboard.map((entry) => [entry.details.oracle_id, entry.details.name]),
      );
      const registry = profileResult.value;

      expect(registry.document.modelVersion).toBe("archetype-synergy@1");
      expect(registry.document.cubeKey).toBe(cubeKey);
      expect(registry.document.archetypes).toHaveLength(count);
      expect(
        registry.document.archetypes.some((archetype) => archetype.id.includes("staple")),
      ).toBe(false);

      for (const archetype of registry.document.archetypes) {
        expect(archetype.cards.some((card) => card.strength === "key")).toBe(true);
        expect(archetype.cards.some((card) => card.strength === "support")).toBe(true);
        for (const card of archetype.cards) {
          expect(archivedByOracleId.get(card.oracleId), `${archetype.id}: ${card.name}`).toBe(
            card.name,
          );
        }
      }
    },
  );

  it("rejects a card assigned to an undeclared role family", () => {
    const result = validateArchetypeSynergyProfileJson(
      JSON.stringify({
        schemaVersion: 1,
        modelVersion: "archetype-synergy@1",
        cubeKey: "test_cube",
        cubeSnapshotId: "test_cube@1",
        archetypes: [
          {
            id: "test:package",
            name: "Package",
            targetPoints: 4,
            requiredFamilies: [{ id: "engine", name: "Moteur", minimum: 1 }],
            cards: [
              {
                oracleId: "00000000-0000-4000-8000-000000000001",
                name: "Moteur",
                strength: "key",
                roles: ["enabler"],
                families: ["engine"],
                evidence: [{ source: "curated_inference", detail: "Moteur témoin." }],
                confidence: "A",
              },
              {
                oracleId: "00000000-0000-4000-8000-000000000002",
                name: "Support",
                strength: "support",
                roles: ["velocity"],
                families: ["missing_family"],
                evidence: [{ source: "curated_inference", detail: "Support témoin." }],
                confidence: "B",
              },
            ],
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "SEMANTIC_VALIDATION_FAILED" },
    });
  });
});
