import { describe, expect, it } from "vitest";
import {
  recommendDeckBuilds,
  type CardEvaluationInput,
  type DeckEvaluationOptions,
} from "../../../src/domain/coaching/index.ts";

function makeCard(
  id: string,
  name: string,
  colors: ("W" | "U" | "B" | "R" | "G")[],
  staticScore = 30,
  cmc = 3,
  typeLine = "Creature",
  oracleText = "",
  isLand = false,
): CardEvaluationInput {
  return {
    id,
    name,
    colors,
    staticScore,
    cmc,
    typeLine,
    oracleText,
    isLand,
    manaCost: isLand ? "" : `o${String(cmc)}`,
  };
}

describe("Deck Recommender Tribal Cohesion & Anti-Dilution", () => {
  it("prioritizes dominant tribe when critical mass is reached and avoids diluting with competing off-tribe creatures", () => {
    const pool: CardEvaluationInput[] = [];

    // 13 Elves (Green) - Critical mass
    for (let i = 1; i <= 13; i++) {
      pool.push(
        makeCard(
          `elf_${String(i)}`,
          `Elvish Warrior ${String(i)}`,
          ["G"],
          30 + (i % 4), // Scores 30-33
          (i % 3) + 1,
          "Creature — Elf Warrior",
          "{T}: Add {G}.",
        ),
      );
    }

    // 8 Wolves / Werewolves (Green / Red) - Incompatible tribe with moderate scores
    for (let i = 1; i <= 8; i++) {
      pool.push(
        makeCard(
          `wolf_${String(i)}`,
          `Timberpack Wolf ${String(i)}`,
          i % 2 === 0 ? ["R"] : ["G"],
          32, // Good score, slightly higher than some elves!
          2,
          "Creature — Wolf",
          "Wolf creatures you control get +1/+1.",
        ),
      );
    }

    // 1 Exceptional Bomb Werewolf: Huntmaster of the Fells (score 50 >= bombThreshold)
    pool.push(
      makeCard(
        "huntmaster_1",
        "Huntmaster of the Fells",
        ["R", "G"],
        50,
        4,
        "Creature — Human Werewolf",
        "Whenever this creature enters the battlefield, create a 2/2 green Wolf creature token.",
      ),
    );

    // 9 Generic Red / Green removal & support spells (burn, artifact, card advantage)
    pool.push(makeCard("bolt_1", "Lightning Bolt", ["R"], 45, 1, "Instant", "Deal 3 damage."));
    pool.push(
      makeCard("abrade_1", "Abrade", ["R"], 38, 2, "Instant", "Deal 3 damage or destroy artifact."),
    );
    pool.push(makeCard("shock_1", "Shock", ["R"], 34, 1, "Instant", "Deal 2 damage."));
    pool.push(
      makeCard("pyro_1", "Pyroclasm", ["R"], 35, 2, "Sorcery", "Deal 2 damage to all creatures."),
    );
    pool.push(
      makeCard(
        "fable_1",
        "Fable of the Mirror-Breaker",
        ["R"],
        42,
        3,
        "Enchantment",
        "Create Reflection.",
      ),
    );
    pool.push(
      makeCard("cultivate_1", "Cultivate", ["G"], 36, 3, "Sorcery", "Search for two basic lands."),
    );
    pool.push(makeCard("harmonize_1", "Harmonize", ["G"], 37, 4, "Sorcery", "Draw three cards."));
    pool.push(
      makeCard("beast_1", "Beast Within", ["G"], 36, 3, "Instant", "Destroy target permanent."),
    );
    pool.push(makeCard("strike_1", "Lightning Strike", ["R"], 33, 2, "Instant", "Deal 3 damage."));

    // Fill remaining pool with off-color cards (14 Blue cards to reach 45 total cards)
    for (let i = 1; i <= 14; i++) {
      pool.push(
        makeCard(`u_${String(i)}`, `Blue Filler ${String(i)}`, ["U"], 22, 3, "Creature — Merfolk"),
      );
    }

    expect(pool).toHaveLength(45);

    const evaluationOptions: DeckEvaluationOptions = {
      bombThreshold: 45,
    };

    const options = recommendDeckBuilds(pool, undefined, evaluationOptions);

    expect(options.length).toBeGreaterThanOrEqual(1);

    const bestOption = options[0];
    expect(bestOption).toBeDefined();
    if (!bestOption) return;

    // Check spells in bestOption
    const maindeckIds = new Set(bestOption.maindeck);

    // The 13 Elves should be heavily favored
    const includedElves = pool.filter((c) => c.id.startsWith("elf_") && maindeckIds.has(c.id));
    expect(includedElves.length).toBeGreaterThanOrEqual(11);

    // Generic burn / support spells should be included
    expect(maindeckIds.has("bolt_1")).toBe(true);
    expect(maindeckIds.has("abrade_1")).toBe(true);

    // The exceptional bomb Huntmaster (score 50) is allowed as a bomb exception
    expect(maindeckIds.has("huntmaster_1")).toBe(true);

    // BUT ordinary non-bomb Wolves (wolf_1 .. wolf_8) should NOT dilute the Elf deck
    const includedOrdinaryWolves = pool.filter(
      (c) => c.id.startsWith("wolf_") && maindeckIds.has(c.id),
    );
    // At most 0 or 1 ordinary wolf, definitely not the full set of 8!
    expect(includedOrdinaryWolves.length).toBeLessThanOrEqual(1);
  });
});
