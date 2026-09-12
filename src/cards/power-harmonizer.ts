import type { PowerScoreMeta } from "./types.ts";

export const MIN_POWER_SCORE = 1.0;
export const MAX_POWER_SCORE = 55.0;

export function clampScore(score: number): number {
  const clamped = Math.max(MIN_POWER_SCORE, Math.min(MAX_POWER_SCORE, score));
  return Math.round(clamped * 10) / 10;
}

export function createUntappedScore(score: number, updatedAt?: string): PowerScoreMeta {
  return {
    score: clampScore(score),
    source: "untapped",
    rawSourceScore: score,
    harmonizationDegree: "native",
    confidence: 1.0,
    updatedAt: updatedAt ?? new Date().toISOString(),
  };
}

/**
 * Harmonizes a 17Lands Game-In-Hand Win Rate (GIH WR, e.g. 0.56 or 56.0) into the DraftMaster 1-55 scale.
 * The baseline 55% WR maps around 28.0 (Gold tier), with top bombs (>=65%) reaching Fire (>=46.0).
 */
export function harmonize17LandsGihWr(gihWrInput: number, updatedAt?: string): PowerScoreMeta {
  const gihWr = gihWrInput > 1.0 ? gihWrInput / 100 : gihWrInput;
  const rawScore = 28.0 + (gihWr - 0.55) * 180.0;
  return {
    score: clampScore(rawScore),
    source: "17lands_normalized",
    rawSourceScore: Math.round(gihWr * 1000) / 10,
    harmonizationDegree: "calibrated_high",
    confidence: 0.85,
    updatedAt: updatedAt ?? new Date().toISOString(),
  };
}

/**
 * Records a CubeCobra Elo together with a score produced by the versioned
 * feature calibration. Elo alone is intentionally insufficient to derive the
 * power score: the rebuild pipeline also uses card structure and functional tags.
 */
export function createCubeCobraScore(
  elo: number,
  calibratedScore: number,
  updatedAt?: string,
): PowerScoreMeta {
  return {
    score: clampScore(calibratedScore),
    source: "cubecobra_elo",
    rawSourceScore: elo,
    harmonizationDegree: "calibrated_medium",
    confidence: 0.6,
    updatedAt: updatedAt ?? new Date().toISOString(),
  };
}

export function harmonizeFallbackHeuristic(
  estimatedTier: "weak" | "bronze" | "silver" | "gold" | "fire",
  fineAdjustment = 0,
  updatedAt?: string,
): PowerScoreMeta {
  const baseScores = {
    weak: 3.5,
    bronze: 8.5,
    silver: 17.0,
    gold: 31.5,
    fire: 48.0,
  };
  const rawScore = baseScores[estimatedTier] + fineAdjustment;
  return {
    score: clampScore(rawScore),
    source: "expert_heuristic",
    rawSourceScore: undefined,
    harmonizationDegree: "fallback",
    confidence: 0.5,
    updatedAt: updatedAt ?? new Date().toISOString(),
  };
}
