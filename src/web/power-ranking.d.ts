export interface PowerRankableCard {
  readonly oracleId?: string;
  readonly slug?: string;
  readonly name: string;
  readonly powerScore?: { readonly score?: number };
  readonly [key: string]: unknown;
}

export interface PowerRankingEntry {
  readonly rank: number;
  readonly total: number;
  readonly score: number;
  readonly percentile: number;
}

export const MAX_POWER_SCORE: 55;
export function toPowerBarPercentage(score: number): number;
export function computePowerRankings(
  cards: readonly PowerRankableCard[],
): Record<string, PowerRankingEntry>;
