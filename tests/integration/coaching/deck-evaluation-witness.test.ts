import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectArchetype,
  evaluateDeck,
  type CardEvaluationInput,
} from "../../../src/domain/coaching/index.ts";

interface RawCardMeta {
  readonly name: string;
  readonly colors: string[];
  readonly type_line: string;
  readonly mana_cost?: string;
  readonly cmc?: number;
  readonly oracle_text?: string;
  readonly produced_mana?: string[];
}

interface WitnessDraft {
  readonly recommendedDeck?: readonly string[];
  readonly recommendedDeckColorPath?: number;
  readonly picks?: readonly {
    readonly PackScores?: Record<string, { staticScore: number }>;
  }[];
}

const BASIC_LANDS: Record<string, CardEvaluationInput> = {
  "90790": {
    id: "90790",
    name: "Plains",
    colors: [],
    typeLine: "Basic Land — Plains",
    isLand: true,
    manaCost: "",
    cmc: 0,
    staticScore: 5,
    oracleText: "{T}: Add {W}.",
  },
  "90792": {
    id: "90792",
    name: "Island",
    colors: [],
    typeLine: "Basic Land — Island",
    isLand: true,
    manaCost: "",
    cmc: 0,
    staticScore: 5,
    oracleText: "{T}: Add {U}.",
  },
  "90794": {
    id: "90794",
    name: "Swamp",
    colors: [],
    typeLine: "Basic Land — Swamp",
    isLand: true,
    manaCost: "",
    cmc: 0,
    staticScore: 5,
    oracleText: "{T}: Add {B}.",
  },
};

describe("Witness Deck Evaluation (SC-005)", () => {
  const historyPath = resolve("data/untapped_history/drafts_backup.json");
  const metaPath = resolve("data/untapped_history/card-metadata-v1.json");

  it("evaluates the witness Esper deck without inventing synergy when no cube profile exists", () => {
    if (!existsSync(historyPath) || !existsSync(metaPath)) {
      expect(true).toBe(true);
      return;
    }

    const drafts = JSON.parse(readFileSync(historyPath, "utf-8")) as Record<string, WitnessDraft>;
    const meta = JSON.parse(readFileSync(metaPath, "utf-8")) as Record<string, RawCardMeta>;

    const witness = drafts["d555b02d-3745-4a4f-b1b6-fdc75c38c5c0"];
    expect(witness).toBeDefined();
    expect(witness?.recommendedDeck).toBeDefined();
    expect(witness?.recommendedDeck).toHaveLength(40);

    // Reconstruct static scores dictionary from pick records
    const staticScoresMap = new Map<string, number>();
    for (const pick of witness?.picks ?? []) {
      if (pick.PackScores) {
        for (const [id, scoreObj] of Object.entries(pick.PackScores)) {
          staticScoresMap.set(id, scoreObj.staticScore);
        }
      }
    }

    const deckCards: CardEvaluationInput[] = (witness?.recommendedDeck ?? []).map((id) => {
      if (BASIC_LANDS[id]) {
        return BASIC_LANDS[id];
      }
      const m = meta[id];
      if (!m) {
        throw new Error(`Missing metadata for card ${id}`);
      }
      const isLand = m.type_line.toLowerCase().includes("land");
      const staticScore = staticScoresMap.get(id) ?? (isLand ? 5 : 25);
      return {
        id,
        name: m.name,
        colors: m.colors as ("W" | "U" | "B" | "R" | "G")[],
        typeLine: m.type_line,
        manaCost: m.mana_cost ?? "",
        cmc: m.cmc ?? 0,
        isLand,
        producesColors: (m.produced_mana ?? []) as ("W" | "U" | "B" | "R" | "G")[],
        staticScore,
        oracleText: m.oracle_text ?? "",
      };
    });

    // 1. Archetype classification
    const archetype = detectArchetype(deckCards);
    expect(archetype.category).toBe("control");
    expect(archetype.primaryColors).toEqual(expect.arrayContaining(["U"]));
    expect(archetype.label).toContain("Esper");

    // 2. Full Deck Evaluation & Kiviat Radar
    const evaluation = evaluateDeck(deckCards);
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(60);
    expect(evaluation.overallScore).toBeLessThanOrEqual(70);
    expect(evaluation.overallScore).toBeLessThanOrEqual(100);

    // Verify 5 Kiviat axes (INV-006)
    const { power, synergy, curve, mana, interaction } = evaluation.radar;
    expect(power).toBeGreaterThanOrEqual(0);
    expect(power).toBeLessThanOrEqual(100);
    expect(synergy).toBeGreaterThanOrEqual(0);
    expect(synergy).toBeLessThanOrEqual(100);
    expect(synergy).toBe(0);
    expect(curve).toBeGreaterThanOrEqual(0);
    expect(curve).toBeLessThanOrEqual(100);
    expect(mana).toBeGreaterThanOrEqual(0);
    expect(mana).toBeLessThanOrEqual(100);
    expect(interaction).toBeGreaterThanOrEqual(0);
    expect(interaction).toBeLessThanOrEqual(100);

    // High interaction in Esper Control
    expect(interaction).toBeGreaterThanOrEqual(80);

    // 3. Mathematical weighting consistency (INV-007)
    const computedOverall = Math.round(
      power * 0.2 + synergy * 0.25 + curve * 0.2 + mana * 0.2 + interaction * 0.15,
    );
    expect(evaluation.overallScore).toBe(computedOverall);
  });
});
