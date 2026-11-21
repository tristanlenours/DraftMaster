import type { CardDocument, CardFunctionalRole } from "../../src/cards/types.ts";
import type { IsotonicBlock } from "../../src/cards/power-calibration.ts";

export const MIN_RELIABLE_PICK_COUNT: number;
export function cardNameToSlug(name: string): string;
export function classifyRoles(input: {
  tags: readonly string[];
  types: readonly string[];
  cmc: number;
  isLand: boolean;
  producesColors: readonly string[];
  score: number;
}): CardFunctionalRole[];
export function scoreFromElo(calibrationBlocks: readonly IsotonicBlock[], elo: number): number;
export function buildCatalogItem(
  evidence: {
    name: string;
    oracleId: string;
    elo: number;
    pickCount?: number;
    oracleTags?: readonly string[];
    summary: string;
    capturedAt?: string;
    cmc?: number;
    imageNormal?: string;
    artCrop?: string;
  },
  scryfall: Record<string, unknown>,
  calibrationBlocks: readonly IsotonicBlock[],
): CardDocument;
export function extractCubeCobraCard(html: string): Record<string, unknown> | undefined;
