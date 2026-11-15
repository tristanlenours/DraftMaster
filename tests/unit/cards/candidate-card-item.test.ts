import { describe, expect, it } from "vitest";
import {
  buildCandidateItem,
  cardNameToSlug,
  classifyRoles,
  extractCubeCobraCard,
} from "../../../scripts/candidate-card-item.mjs";

describe("candidate card item", () => {
  it("slugs a card name without diacritics or punctuation", () => {
    expect(cardNameToSlug("Mjölnir, Hammer of Thor")).toBe("mjolnir-hammer-of-thor");
  });

  it("reads the card of a CubeCobra page even when the props hold undefined", () => {
    const html =
      '<script>window.reactProps = {"card":{"name":"Salt \\"Vampire\\" {x}","elo":1414.5,' +
      '"nested":{"lastKey":undefined},"oracle_tags":["lifegain"]},"lastKey":undefined};</script>';

    expect(extractCubeCobraCard(html)).toEqual({
      name: 'Salt "Vampire" {x}',
      elo: 1414.5,
      nested: { lastKey: null },
      oracle_tags: ["lifegain"],
    });
  });

  it("returns nothing for a page without card props", () => {
    expect(extractCubeCobraCard("<html>Not found</html>")).toBeUndefined();
  });

  it("classifies a cheap removal spell as premium removal and a plain creature as a beater", () => {
    const base = { cmc: 2, isLand: false, producesColors: [], score: 30 };

    expect(classifyRoles({ ...base, tags: ["removal-creature"], types: ["Instant"] })).toEqual([
      "premium_removal",
    ]);
    expect(classifyRoles({ ...base, tags: [], types: ["Creature"] })).toEqual(["beater"]);
  });

  it("marks a candidate with few CubeCobra picks as a low-confidence fallback", () => {
    const item = buildCandidateItem(
      { name: "Salt Vampire", oracle_id: "oracle-1", pickCount: 629, oracle_tags: [] },
      {
        id: "scryfall-1",
        type_line: "Creature — Vampire Shapeshifter",
        colors: ["B"],
        color_identity: ["B"],
        cmc: 2,
        mana_cost: "{1}{B}",
        oracle_text: "Lifelink",
        power: "2",
        toughness: "2",
      },
      { score: 29.8, summary: "Nouveauté", updatedAt: "2026-11-15T00:00:00.000Z" },
    );

    expect(item).toMatchObject({
      slug: "salt-vampire",
      types: ["Creature"],
      subtypes: ["Vampire", "Shapeshifter"],
      presentInCubes: [],
      powerScore: { score: 29.8, harmonizationDegree: "fallback", confidence: 0.4 },
    });
  });
});
