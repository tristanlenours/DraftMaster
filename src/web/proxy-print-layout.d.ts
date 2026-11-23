export const CARD_TRIM_WIDTH_MM: number;
export const CARD_TRIM_HEIGHT_MM: number;
export const MIN_PRINTABLE_MARGIN_MM: number;
export const CUT_MARK_LENGTH_MM: number;
export const BLEED_OPTIONS_MM: readonly number[];
export const GAP_OPTIONS_MM: readonly number[];

export type PageFormatId = "a4" | "letter";
export interface PageFormat {
  readonly id: PageFormatId;
  readonly label: string;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly cssSize: string;
}
export const PAGE_FORMATS: Readonly<Record<PageFormatId, PageFormat>>;

export interface SheetCell {
  readonly index: number;
  readonly column: number;
  readonly row: number;
  readonly xMm: number;
  readonly yMm: number;
}

export interface SheetLayout {
  readonly page: PageFormat;
  readonly columns: number;
  readonly rows: number;
  readonly perPage: number;
  readonly cellWidthMm: number;
  readonly cellHeightMm: number;
  readonly gapMm: number;
  readonly bleedMm: number;
  readonly originXMm: number;
  readonly originYMm: number;
  readonly gridWidthMm: number;
  readonly gridHeightMm: number;
  readonly marginXMm: number;
  readonly marginYMm: number;
  readonly cells: readonly SheetCell[];
  readonly trimLinesXMm: readonly number[];
  readonly trimLinesYMm: readonly number[];
  readonly fits: boolean;
}

export function computeSheetLayout(options?: {
  readonly pageFormat?: PageFormatId;
  readonly gapMm?: number;
  readonly bleedMm?: number;
  readonly columns?: number;
  readonly rows?: number;
}): SheetLayout;

export interface CutMark {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}
export function computeCutMarks(layout: SheetLayout, lengthMm?: number): CutMark[];

export interface PrintSlotLike {
  readonly face: "front" | "back";
}
export interface PrintPage<T extends PrintSlotLike> {
  readonly side: "front" | "back" | "mixed";
  readonly cells: readonly (T | null)[];
}
export function paginatePrintSlots<T extends PrintSlotLike>(
  slots: readonly T[],
  options?: { readonly perPage?: number; readonly columns?: number; readonly duplex?: boolean },
): PrintPage<T>[];
