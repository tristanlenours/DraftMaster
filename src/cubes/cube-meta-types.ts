import type { MtGColor } from "../domain/coaching/types.ts";

export type MetaPacing =
  "blistering_fast" | "aggro_favored" | "balanced" | "midrange_attrition" | "control_combo_heavy";

export type CubePowerTier =
  "pauper" | "peasant" | "synergy_unpowered" | "vintage_unpowered" | "powered_vintage";

export interface FundamentalTurnMeta {
  readonly targetTurn: number;
  readonly criticalWindow: string;
  readonly pacingDescription: string;
  readonly deckExpectation: string;
}

export interface CubeTechnicalAxes {
  readonly speedIndex: number; // 1 (slow) to 10 (blistering fast)
  readonly interactionDensityPercentage: number;
  readonly averageCmcEstimate: number;
  readonly fixingQuality:
    "fast_fetches_duals" | "shocks_checks" | "bouncelands_taplands" | "rainbow_tribal" | "custom";
  readonly comboPotential?: "infinite_turn1_3" | "high_synergy_engine" | "minimal_fair_only";
}

export interface CubeArchetypeDefinition {
  readonly id: string;
  readonly name: string;
  readonly primaryColors: readonly MtGColor[];
  readonly splashColors?: readonly MtGColor[];
  readonly category: "aggro" | "midrange" | "control" | "ramp" | "combo";
  readonly description: string;
  readonly gameplan: string;
  readonly keyCards: readonly string[];
  readonly supportCards: readonly string[];
  readonly trapCards?: readonly string[];
  readonly targetCurve?: Record<number, number>;
  readonly recommendedCreatureCount?: readonly [number, number];
  readonly recommendedRemovalCount?: readonly [number, number];
}

export interface CubeScoringProfile {
  readonly tribalSynergyMultiplier: number;
  readonly comboSynergyMultiplier: number;
  readonly fixingPriorityBonus: number;
  readonly curveStrictness: number;
}

export interface CubeMetaDefinition {
  readonly schemaVersion: 1;
  readonly cubeKey: string;
  readonly name: string;
  readonly owner: string;
  readonly coverImage?: string;
  readonly activeSnapshotId: string;
  readonly cardCount: number;
  readonly powerTier: CubePowerTier;
  readonly pacing: MetaPacing;
  readonly description?: string;
  readonly fundamentalTurn?: FundamentalTurnMeta;
  readonly technicalAxes?: CubeTechnicalAxes;
  readonly philosophy?: string;
  readonly fixingDensityPercentage: number;
  readonly dominantMechanics: readonly string[];
  readonly archetypes: readonly CubeArchetypeDefinition[];
  readonly scoringProfile: CubeScoringProfile;
}

export interface CubeCardIndexItem {
  readonly slug: string;
  readonly name: string;
  readonly oracleId: string;
  readonly tier: "S" | "A" | "B" | "C" | "D";
  readonly fit: "staple" | "build_around" | "support" | "filler" | "trap";
  readonly scoreModifier?: number;
}

export interface CubeDocument extends CubeMetaDefinition {
  readonly description: string;
  readonly fundamentalTurn: FundamentalTurnMeta;
  readonly technicalAxes: CubeTechnicalAxes;
  readonly philosophy: string;
  readonly cardIndex?: readonly CubeCardIndexItem[];
}
