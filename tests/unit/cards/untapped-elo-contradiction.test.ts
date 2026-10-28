import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CardCatalog } from "../../../src/cards/card-catalog.ts";

const rootDir = process.cwd();
const bottomTiers = new Set(["D+", "D", "D-", "F"]);

interface RankingEntry {
  readonly name: string;
  readonly score: number;
  readonly source: string;
  readonly rawSourceScore?: number;
  readonly method?: string;
  readonly rejectedUntappedScore?: number;
}

const ranking = (
  JSON.parse(
    readFileSync(resolve(rootDir, "data/power-rankings/power-ranking-v1.json"), "utf8"),
  ) as { ranking: readonly RankingEntry[] }
).ranking;

async function loadCatalog() {
  const loaded = await CardCatalog.fromFile(resolve(rootDir, "data/cards/master-cards.json"));
  if (!loaded.ok) throw new Error("master catalog failed to load");
  return loaded.value;
}

describe("Untapped scores contradicted by CubeCobra Elo", () => {
  it.each([
    ["Umezawa's Jitte", 11, ["cedric_cube", "nico_candyshop"]],
    ["Young Pyromancer", 10, ["cedric_cube", "nico_candyshop"]],
    ["Emrakul, the Aeons Torn", 10, ["cedric_cube", "nico_candyshop"]],
    ["Faithless Looting", 10, ["cedric_cube"]],
    ["Lion's Eye Diamond", 10, ["nico_candyshop"]],
    ["Mishra's Workshop", 10, ["nico_candyshop"]],
    // 17lands grades these B and C: Arena does not corroborate their low Untapped score.
    ["Retrofitter Foundry", 15, ["nico_candyshop"]],
    ["Urza's Bauble", 16, ["nico_candyshop"]],
  ] as const)(
    "lifts %s from its Arena score %i out of the bottom tiers",
    async (name, arenaScore, cubes) => {
      const card = (await loadCatalog()).getCardByName(name);
      expect(card, name).toBeDefined();
      expect(card?.powerScore).toMatchObject({
        source: "expert_heuristic",
        harmonizationDegree: "calibrated_medium",
        confidence: 0.6,
      });
      expect(card?.powerScore.rawSourceScore).toBe(card?.powerScore.score);
      expect(card?.powerScore.score).toBeGreaterThanOrEqual(arenaScore + 12);
      for (const cubeKey of cubes) {
        expect(bottomTiers.has(card?.cubeAnalyses[cubeKey]?.tier ?? "F"), cubeKey).toBe(false);
      }

      const entry = ranking.find((candidate) => candidate.name === name);
      expect(entry).toMatchObject({
        score: card?.powerScore.score,
        source: "expert_heuristic",
        method: "untapped_elo_contradiction_v1",
        rejectedUntappedScore: arenaScore,
      });
    },
  );

  it.each([
    // 17lands corroborates the low Arena score (grade D- or F on 2 000+ games): draft traps.
    ["Batterskull", 5],
    ["Show and Tell", 12],
    ["Sword of Fire and Ice", 5],
    ["Bolas's Citadel", 8],
    ["Yawgmoth's Will", 8],
    // Elo below the 1300 trust floor.
    ["Haywire Mite", 5],
    ["Phyrexian Revoker", 4],
    // Gap under 12 points.
    ["Ephemerate", 9],
    // User-verified mid-band scores whose Elo estimate is less than double them.
    ["Fabled Passage", 17],
    ["Channel", 19],
  ] as const)("keeps the native Untapped score of %s at %i", async (name, score) => {
    const card = (await loadCatalog()).getCardByName(name);
    expect(card?.powerScore).toMatchObject({
      score,
      source: "untapped",
      harmonizationDegree: "native",
      confidence: 1,
    });
    const entry = ranking.find((candidate) => candidate.name === name);
    expect(entry?.method).not.toBe("untapped_elo_contradiction_v1");
    expect(entry?.rejectedUntappedScore).toBeUndefined();
  });
});
