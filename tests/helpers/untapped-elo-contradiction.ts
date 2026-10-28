import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  detectUntappedEloContradiction,
  type ArenaGradeEvidence,
  type CubeCobraEvidence,
  type IsotonicBlock,
} from "../../src/cards/power-calibration.ts";

interface CubeCobraRaw {
  readonly cards?: {
    readonly mainboard?: readonly {
      readonly details?: {
        readonly oracle_id?: string;
        readonly elo: number;
        readonly pickCount?: number;
      };
    }[];
  };
}

const cubeKeys = [
  "cedric_cube",
  "hugues_pauper",
  "nico_candyshop",
  "titou_arena_peasant_plus",
  "titou_tribal",
];

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));

/**
 * Loads the versioned inputs of the Untapped/Elo contradiction rule and returns
 * the estimate the data sync must have applied to a card, or undefined when its
 * native Untapped score is trusted.
 */
export function loadUntappedEloContradiction(): (
  card: { readonly name: string; readonly oracleId: string },
  untappedScore: number,
) => number | undefined {
  const { blocks } = readJson("data/power-rankings/cubecobra-calibration-v1.json") as {
    blocks: readonly IsotonicBlock[];
  };
  const evidenceByOracleId = new Map<string, CubeCobraEvidence>();
  for (const cubeKey of cubeKeys) {
    const raw = readJson(`data/cubes/${cubeKey}/cubecobra-raw.json`) as CubeCobraRaw;
    for (const { details } of raw.cards?.mainboard ?? []) {
      if (details?.oracle_id && !evidenceByOracleId.has(details.oracle_id)) {
        evidenceByOracleId.set(details.oracle_id, {
          elo: details.elo,
          pickCount: details.pickCount,
        });
      }
    }
  }
  const arenaGrades = new Map(
    (
      readJson("data/power-rankings/limitedgrades-powered-cache.json") as {
        cards: readonly ({ name: string } & ArenaGradeEvidence)[];
      }
    ).cards.map(({ name, grade, gameCount }) => [name.trim().toLowerCase(), { grade, gameCount }]),
  );
  return (card, untappedScore) =>
    detectUntappedEloContradiction(
      untappedScore,
      evidenceByOracleId.get(card.oracleId),
      blocks,
      arenaGrades.get(card.name.trim().toLowerCase()),
    );
}
