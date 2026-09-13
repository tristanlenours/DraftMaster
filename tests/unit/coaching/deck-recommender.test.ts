import { describe, expect, it } from "vitest";
import {
  recommendDeckBuilds,
  type CardEvaluationInput,
} from "../../../src/domain/coaching/index.ts";

function makeCard(
  id: string,
  name: string,
  colors: ("W" | "U" | "B" | "R" | "G")[],
  staticScore = 30,
  cmc = 3,
  isLand = false,
  manaCost?: string,
): CardEvaluationInput {
  return {
    id,
    name,
    colors,
    staticScore,
    cmc,
    isLand,
    manaCost: manaCost ?? (isLand ? "" : `o${String(cmc)}`),
  };
}

describe("Deck Recommender (FR-015)", () => {
  it("generates 2 to 3 build options from a 45-card pool and sorts them by score", () => {
    const pool: CardEvaluationInput[] = [];

    // 15 White cards (quality ~35)
    for (let i = 1; i <= 15; i++) {
      pool.push(
        makeCard(`W_${String(i)}`, `White Spell ${String(i)}`, ["W"], 32 + (i % 5), (i % 4) + 1),
      );
    }

    // 15 Blue cards (quality ~36)
    for (let i = 1; i <= 15; i++) {
      pool.push(
        makeCard(`U_${String(i)}`, `Blue Spell ${String(i)}`, ["U"], 33 + (i % 5), (i % 4) + 1),
      );
    }

    // 10 Black cards (quality ~28)
    for (let i = 1; i <= 10; i++) {
      pool.push(
        makeCard(`B_${String(i)}`, `Black Spell ${String(i)}`, ["B"], 28 + (i % 4), (i % 3) + 2),
      );
    }

    // 2 Azorius non-basic lands
    pool.push({
      id: "land_hallowed_fountain",
      name: "Hallowed Fountain",
      colors: [],
      isLand: true,
      staticScore: 30,
      producesColors: ["W", "U"],
      cmc: 0,
    });
    pool.push({
      id: "land_tundra",
      name: "Tundra",
      colors: [],
      isLand: true,
      staticScore: 35,
      producesColors: ["W", "U"],
      cmc: 0,
    });

    // 3 Red off-color picks
    pool.push(makeCard("R_1", "Lightning Bolt", ["R"], 35, 1));
    pool.push(makeCard("R_2", "Ragavan", ["R"], 40, 1));
    pool.push(makeCard("R_3", "Fable of the Mirror-Breaker", ["R"], 38, 3));

    expect(pool).toHaveLength(45);

    const options = recommendDeckBuilds(pool);

    // FR-015: 2 to 3 options
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options.length).toBeLessThanOrEqual(3);

    // Each option check
    for (const opt of options) {
      expect(opt.maindeck).toHaveLength(40);
      expect(opt.position).toBeGreaterThanOrEqual(1);
      expect(opt.position).toBeLessThanOrEqual(3);
      expect(opt.title).toMatch(/^Option \d : /);
      expect(opt.evaluation).toBeDefined();
      expect(opt.evaluation.overallScore).toBeGreaterThanOrEqual(0);
      expect(opt.evaluation.overallScore).toBeLessThanOrEqual(100);

      // Verify radar
      const { power, synergy, curve, mana, interaction } = opt.evaluation.radar;
      expect(power).toBeGreaterThanOrEqual(0);
      expect(synergy).toBeGreaterThanOrEqual(0);
      expect(curve).toBeGreaterThanOrEqual(0);
      expect(mana).toBeGreaterThanOrEqual(0);
      expect(interaction).toBeGreaterThanOrEqual(0);
    }

    // Ordered by overallScore descending
    const opt0 = options[0];
    const opt1 = options[1];
    const opt2 = options[2];
    if (opt0 && opt1) {
      expect(opt0.evaluation.overallScore).toBeGreaterThanOrEqual(opt1.evaluation.overallScore);
    }
    if (opt1 && opt2) {
      expect(opt1.evaluation.overallScore).toBeGreaterThanOrEqual(opt2.evaluation.overallScore);
    }

    // Position numbering is 1, 2, 3
    expect(options.map((o) => o.position)).toEqual([1, 2, 3].slice(0, options.length));
  });

  it("adapte le nombre de terrains a une courbe tres basse au lieu d'imposer 23/17", () => {
    const pool = [
      ...Array.from({ length: 30 }, (_, index) =>
        makeCard(
          `R_${String(index)}`,
          `Red Aggro ${String(index)}`,
          ["R"],
          45 - index / 10,
          index % 3 === 0 ? 2 : 1,
          false,
          index % 3 === 0 ? "o1oR" : "oR",
        ),
      ),
      ...Array.from({ length: 15 }, (_, index) =>
        makeCard(`G_${String(index)}`, `Green Card ${String(index)}`, ["G"], 20, 4),
      ),
    ];

    const option = recommendDeckBuilds(pool)[0];

    expect(option?.maindeck).toHaveLength(40);
    expect(option?.maindeck.filter((id) => id.startsWith("basic-"))).toHaveLength(16);
    expect(option?.maindeck.filter((id) => !id.startsWith("basic-"))).toHaveLength(24);
  });
});
