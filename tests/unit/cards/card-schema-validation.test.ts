import { describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { validateCardDocumentJson } from "../../../src/cards/card-catalog.ts";

const rootDir = process.cwd();

describe("Individual Card Schema Validation", () => {
  it("validates that all individual card JSON files conform to card.schema.json", async () => {
    const itemsDir = resolve(rootDir, "data/cards/items");
    const entries = await readdir(itemsDir);
    const jsonFiles = entries.filter((f) => f.endsWith(".json"));

    expect(jsonFiles.length).toBeGreaterThanOrEqual(500);

    for (const file of jsonFiles) {
      const filePath = join(itemsDir, file);
      const raw = await readFile(filePath, "utf8");
      const result = validateCardDocumentJson(raw);

      if (!result.ok) {
        throw new Error(`Validation failed for card file ${file}: ${JSON.stringify(result.error)}`);
      }

      expect(result.ok).toBe(true);
      const card = result.value;
      expect(card.schemaVersion).toBe(1);
      expect(card.slug).toBeTruthy();
      expect(card.name).toBeTruthy();
      expect(card.oracleId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(card.image.url).toMatch(/^https?:\/\//);
      expect(card.powerScore.score).toBeGreaterThanOrEqual(1.0);

      // Verify strictly S, A, B, C, D tiers
      for (const cubeAnalysis of Object.values(card.cubeAnalyses)) {
        if (cubeAnalysis.tier) {
          expect(["S", "A", "B", "C", "D"]).toContain(cubeAnalysis.tier);
        }
      }
    }
  }, 15000);

  it("rejects invalid card JSON missing required fields or having invalid tiers", () => {
    const invalidMissingField = JSON.stringify({
      schemaVersion: 1,
      slug: "test-card",
      name: "Test Card",
      // missing oracleId, cmc, image, etc.
    });

    const resultMissing = validateCardDocumentJson(invalidMissingField);
    expect(resultMissing.ok).toBe(false);

    const invalidTier = JSON.stringify({
      schemaVersion: 1,
      slug: "test-card",
      name: "Test Card",
      oracleId: "00000000-0000-4000-8000-000000000001",
      cmc: 1,
      colors: ["W"],
      colorIdentity: ["W"],
      typeLine: "Instant",
      types: ["Instant"],
      subtypes: [],
      oracleText: "Test",
      keywords: [],
      isLand: false,
      producesColors: [],
      image: { url: "https://example.com/test.jpg" },
      powerScore: {
        score: 30,
        source: "expert_heuristic",
        harmonizationDegree: "native",
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      },
      presentInCubes: ["nico_candyshop"],
      objectiveAnalysis: {
        summary: "Test",
        roles: ["cantrip"],
        floorRating: 5.0,
        ceilingRating: 7.0,
        tempoImpact: "medium",
        quadrantStrengths: { opening: 3, developing: 3, parity: 3, behind: 3 },
      },
      cubeAnalyses: {
        nico_candyshop: {
          cubeKey: "nico_candyshop",
          fit: "staple",
          tier: "S+", // Invalid tier (only S, A, B, C, D permitted)
          archetypes: [],
          synergyTags: [],
          scoreModifier: 5,
          analysis: "Invalid tier test",
        },
      },
    });

    const resultTier = validateCardDocumentJson(invalidTier);
    expect(resultTier.ok).toBe(false);

    const maximumScoreBoundary = JSON.parse(invalidTier) as {
      cubeAnalyses: { nico_candyshop: { tier: string } };
      powerScore: { score: number };
    };
    maximumScoreBoundary.cubeAnalyses.nico_candyshop.tier = "S";
    maximumScoreBoundary.powerScore.score = 55;
    expect(validateCardDocumentJson(JSON.stringify(maximumScoreBoundary)).ok).toBe(true);

    maximumScoreBoundary.powerScore.score = 56;
    expect(validateCardDocumentJson(JSON.stringify(maximumScoreBoundary)).ok).toBe(false);
  });
});
