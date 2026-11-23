export interface RetextRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const M15_REFERENCE_WIDTH: number;
export const M15_REFERENCE_HEIGHT: number;
export const M15_GEOMETRY: {
  readonly nameBar: RetextRect;
  readonly typeBar: RetextRect;
  readonly rulesBox: RetextRect;
  readonly ptBox: RetextRect;
  readonly holoNotch: RetextRect;
  readonly mdfcStrip: RetextRect;
  readonly mdfcStripText: RetextRect;
  readonly nameTextX: number;
  readonly dfcNameTextX: number;
  readonly typeTextX: number;
  readonly rulesPadX: number;
  readonly rulesPadY: number;
};

export interface RetextVariantLike {
  readonly frame?: string;
  readonly frameEffects?: readonly string[];
  readonly isOfficialFrenchScan?: boolean;
  readonly fullArt?: boolean;
  readonly textless?: boolean;
  readonly backFace?: unknown;
}

export interface RetextCardLike {
  readonly name?: string;
  readonly typeLine?: string;
}

export type InkPolarity = "dark" | "light";

export function canRetextVariant(
  variant: RetextVariantLike | null | undefined,
  card: RetextCardLike | null | undefined,
): boolean;
export function scaleRect(rect: RetextRect, width: number, height: number): RetextRect;
export function detectInkPolarity(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): InkPolarity;
export function estimatePaperBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { readonly blockSize?: number; readonly polarity?: InkPolarity },
): Float32Array;
export function buildInkMask(
  data: Uint8ClampedArray,
  background: Float32Array,
  width: number,
  height: number,
  options?: {
    readonly polarity?: InkPolarity;
    readonly lowThreshold?: number;
    readonly highThreshold?: number;
    readonly dilate?: number;
  },
): Float32Array;
export function createSeededRandom(seed: number): () => number;
export function eraseInkInRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: {
    readonly polarity?: InkPolarity;
    readonly blockSize?: number;
    readonly dilate?: number;
    readonly lowThreshold?: number;
    readonly highThreshold?: number;
    readonly residualBand?: number;
    readonly seed?: number;
  },
): { readonly polarity: InkPolarity; readonly erasedPixels: number; readonly mask: Float32Array };
export function findInkColumnRuns(
  mask: Float32Array,
  width: number,
  height: number,
  options?: { readonly minCoverage?: number; readonly maxGap?: number },
): [number, number][];
export function manaSymbolFileCode(token: string): string | null;
export function applyFrenchNonBreakingSpaces(text: string): string;

export interface RulesToken {
  readonly kind: "text" | "symbol" | "space";
  readonly value: string;
  readonly italic: boolean;
}
export function tokenizeRulesText(text: string): RulesToken[][];

export interface LaidOutRun extends RulesToken {
  readonly x: number;
  readonly width: number;
}
export interface LaidOutLine {
  readonly y: number;
  readonly x0: number;
  readonly runs: readonly LaidOutRun[];
  readonly isFlavor: boolean;
}
export interface RulesLayout {
  readonly size: number;
  readonly lineHeight: number;
  readonly symbolSize: number;
  readonly lines: readonly LaidOutLine[];
  readonly separatorY: number | null;
  readonly height: number;
  readonly offsetY: number;
  readonly fits: boolean;
}
export type TextMeasure = (
  text: string,
  options: { readonly size: number; readonly italic?: boolean },
) => number;
export function layoutRulesText(options: {
  readonly rulesText: string;
  readonly flavorText?: string;
  readonly box: RetextRect;
  readonly measure: TextMeasure;
  readonly maxSize?: number;
  readonly minSize?: number;
  readonly lineHeightRatio?: number;
  readonly paragraphGapRatio?: number;
  readonly symbolScale?: number;
  readonly avoidRects?: readonly RetextRect[];
  readonly verticalCenter?: boolean;
}): RulesLayout;
export function fitSingleLine(
  text: string,
  maxWidth: number,
  measure: TextMeasure,
  options: { readonly maxSize: number; readonly minSize: number },
): { readonly size: number; readonly scaleX: number; readonly width: number };
export function splitMdfcHint(rulesText: string): {
  readonly rulesText: string;
  readonly hint: { readonly type: string; readonly text: string } | null;
};
export function clampClusterStart(
  detected: number,
  width: number,
  band: { readonly minWidth: number; readonly maxWidth: number },
): number;
export function countManaSymbols(manaCost: string): number;
export const M15_LAYOUT_EDGES: readonly number[];
export function scoreM15Layout(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { readonly ratios: number[]; readonly compatible: boolean };
