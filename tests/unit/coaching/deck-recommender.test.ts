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

  it("monte a 18 terrains pour une courbe haute", () => {
    const pool = [
      ...Array.from({ length: 27 }, (_, index) =>
        makeCard(
          `U_${String(index)}`,
          `Blue Control ${String(index)}`,
          ["U"],
          45,
          5,
          false,
          "o4oU",
        ),
      ),
      ...Array.from({ length: 18 }, (_, index) =>
        makeCard(`R_${String(index)}`, `Red Card ${String(index)}`, ["R"], 20, 2),
      ),
    ];

    const option = recommendDeckBuilds(pool)[0];

    expect(option?.maindeck).toHaveLength(40);
    expect(option?.maindeck.filter((id) => id.startsWith("basic-"))).toHaveLength(18);
  });

  it("compte les terrains non-basiques dans la cible totale", () => {
    const pool = [
      ...Array.from({ length: 24 }, (_, index) =>
        makeCard(`W_${String(index)}`, `White Spell ${String(index)}`, ["W"], 40, 3, false, "o2oW"),
      ),
      {
        ...makeCard("land_1", "Hallowed Fountain", [], 40, 0, true),
        producesColors: ["W", "U"] as const,
      },
      {
        ...makeCard("land_2", "Tundra", [], 39, 0, true),
        producesColors: ["W", "U"] as const,
      },
      ...Array.from({ length: 19 }, (_, index) =>
        makeCard(`G_${String(index)}`, `Green Card ${String(index)}`, ["G"], 20, 3),
      ),
    ];

    const option = recommendDeckBuilds(pool)[0];
    const draftedLands = option?.maindeck.filter((id) => id.startsWith("land_")) ?? [];
    const basics = option?.maindeck.filter((id) => id.startsWith("basic-")) ?? [];

    expect(draftedLands).toHaveLength(2);
    expect(basics).toHaveLength(15);
    expect(draftedLands.length + basics.length).toBe(17);
  });

  it("traite un MDFC terrain-sort comme une source sans le sortir des sorts", () => {
    const pool = [
      ...Array.from({ length: 23 }, (_, index) =>
        makeCard(`B_${String(index)}`, `Black Spell ${String(index)}`, ["B"], 40, 3, false, "o2oB"),
      ),
      {
        ...makeCard("mdfc_1", "Agadeem's Awakening", ["B"], 50, 3, false, "oXoBoBoB"),
        typeLine: "Sorcery // Land",
        producesColors: ["B"] as const,
        oracleText: "As this land enters, you may pay 3 life. {T}: Add {B}.",
      },
      ...Array.from({ length: 21 }, (_, index) =>
        makeCard(`G_${String(index)}`, `Green Card ${String(index)}`, ["G"], 20, 3),
      ),
    ];

    const option = recommendDeckBuilds(pool)[0];

    expect(option?.maindeck).toContain("mdfc_1");
    expect(option?.maindeck.filter((id) => id.startsWith("basic-"))).toHaveLength(16);
    expect(option?.maindeck).toHaveLength(40);
  });

  it("conserve deux exemplaires selectionnes quand leurs IDs d'instance sont distincts", () => {
    const pool = [
      makeCard("bolt_1", "Lightning Bolt", ["R"], 55, 1, false, "oR"),
      makeCard("bolt_2", "Lightning Bolt", ["R"], 54, 1, false, "oR"),
      ...Array.from({ length: 28 }, (_, index) =>
        makeCard(`R_${String(index)}`, `Red Spell ${String(index)}`, ["R"], 40, 2, false, "o1oR"),
      ),
      ...Array.from({ length: 15 }, (_, index) =>
        makeCard(`G_${String(index)}`, `Green Card ${String(index)}`, ["G"], 20, 4),
      ),
    ];

    const option = recommendDeckBuilds(pool)[0];

    expect(option?.maindeck).toEqual(expect.arrayContaining(["bolt_1", "bolt_2"]));
  });

  describe("assembly reliability", () => {
    const land = (id: string, name: string, producesColors: ("W" | "U" | "B" | "R" | "G")[]) => ({
      ...makeCard(id, name, [], 45, 0, true),
      producesColors,
    });

    it("plays a dual only when it taps for two colors of the build", () => {
      const pool = [
        ...Array.from({ length: 12 }, (_, index) =>
          makeCard(`W_${String(index)}`, `White ${String(index)}`, ["W"], 40, 2, false, "o1oW"),
        ),
        ...Array.from({ length: 12 }, (_, index) =>
          makeCard(`U_${String(index)}`, `Blue ${String(index)}`, ["U"], 40, 2, false, "o1oU"),
        ),
        ...Array.from({ length: 18 }, (_, index) =>
          makeCard(`R_${String(index)}`, `Red ${String(index)}`, ["R"], 10, 3, false, "o2oR"),
        ),
        land("land_breeding_pool", "Breeding Pool", ["G", "U"]),
        land("land_stomping_ground", "Stomping Ground", ["R", "G"]),
        { ...land("land_hallowed_fountain", "Hallowed Fountain", ["W", "U"]), staticScore: 30 },
      ];

      const option = recommendDeckBuilds(pool)[0];

      expect(option?.evaluation.audit.mana.usedColors).toEqual(["W", "U"]);
      expect(option?.maindeck).toContain("land_hallowed_fountain");
      expect(option?.maindeck).not.toContain("land_breeding_pool");
      expect(option?.maindeck).not.toContain("land_stomping_ground");
      expect(option?.maindeck).toHaveLength(40);
    });

    it("gives no basic land to a color the chosen spells never use", () => {
      const pool = [
        ...Array.from({ length: 30 }, (_, index) =>
          makeCard(`W_${String(index)}`, `White ${String(index)}`, ["W"], 40, 2, false, "o1oW"),
        ),
        ...Array.from({ length: 15 }, (_, index) =>
          makeCard(`G_${String(index)}`, `Green ${String(index)}`, ["G"], 10, 3, false, "o2oG"),
        ),
      ];

      const basics = recommendDeckBuilds(pool)[0]?.maindeck.filter((id) => id.startsWith("basic-"));

      expect(basics?.length).toBeGreaterThanOrEqual(16);
      expect(new Set(basics)).toEqual(new Set(["basic-plains"]));
    });

    it("splits basics by unmet source requirements after counting nonbasic sources", () => {
      const pool = [
        ...Array.from({ length: 18 }, (_, index) =>
          makeCard(`W_${String(index)}`, `White ${String(index)}`, ["W"], 40, 2, false, "o1oW"),
        ),
        ...Array.from({ length: 5 }, (_, index) =>
          makeCard(`U_${String(index)}`, `Blue ${String(index)}`, ["U"], 40, 2, false, "o1oU"),
        ),
        ...Array.from({ length: 19 }, (_, index) =>
          makeCard(`R_${String(index)}`, `Red ${String(index)}`, ["R"], 10, 3, false, "o2oR"),
        ),
        land("land_1", "Hallowed Fountain", ["W", "U"]),
        land("land_2", "Tundra", ["W", "U"]),
        land("land_3", "Glacial Fortress", ["W", "U"]),
      ];

      const mana = recommendDeckBuilds(pool)[0]?.evaluation.audit.mana;
      if (!mana) throw new Error("Missing build");

      // Single-pip two-drops need 8 sources each (Karsten, 40 cards): Islands must not be starved
      // while Plains overshoot.
      expect(mana.sourcesByColor.U).toBeGreaterThanOrEqual(mana.targetSourcesByColor.U);
      expect(mana.sourcesByColor.W).toBeGreaterThanOrEqual(mana.targetSourcesByColor.W);
    });

    it("keeps a drafted card in the maindeck whatever its instance id", () => {
      const pool = [
        makeCard("90790", "Fireblast", ["R"], 60, 1, false, "oR"),
        ...Array.from({ length: 29 }, (_, index) =>
          makeCard(`R_${String(index)}`, `Red ${String(index)}`, ["R"], 40, 2, false, "o1oR"),
        ),
        ...Array.from({ length: 15 }, (_, index) =>
          makeCard(`G_${String(index)}`, `Green ${String(index)}`, ["G"], 10, 4),
        ),
      ];

      const option = recommendDeckBuilds(pool)[0];

      expect(option?.maindeck).toContain("90790");
      expect(option?.sideboard).not.toContain("90790");
      expect((option?.maindeck.length ?? 0) + (option?.sideboard.length ?? 0)).toBe(
        40 + pool.length - (option?.maindeck.filter((id) => !id.startsWith("basic-")).length ?? 0),
      );
    });
  });
});
