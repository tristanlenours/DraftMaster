import type {
  ProxyPrintSelection,
  ProxyPrintSlot,
  ProxySheetLayoutOptions,
  ProxySheetPage,
} from "./types.ts";

export const MTG_CARD_WIDTH_MM = 63;
export const MTG_CARD_HEIGHT_MM = 88;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_GRID_COLUMNS = 3;
export const A4_GRID_ROWS = 3;
export const CARDS_PER_A4_SHEET = A4_GRID_COLUMNS * A4_GRID_ROWS;

export interface A4GridGeometry {
  readonly cardWidthMm: number;
  readonly cardHeightMm: number;
  readonly gapMm: number;
  readonly gridWidthMm: number;
  readonly gridHeightMm: number;
  readonly marginHorizontalMm: number;
  readonly marginVerticalMm: number;
}

export function computeA4GridGeometry(gapMm: 0 | 2): A4GridGeometry {
  const gridWidthMm = A4_GRID_COLUMNS * MTG_CARD_WIDTH_MM + (A4_GRID_COLUMNS - 1) * gapMm;
  const gridHeightMm = A4_GRID_ROWS * MTG_CARD_HEIGHT_MM + (A4_GRID_ROWS - 1) * gapMm;
  const marginHorizontalMm = (A4_WIDTH_MM - gridWidthMm) / 2;
  const marginVerticalMm = (A4_HEIGHT_MM - gridHeightMm) / 2;

  return {
    cardWidthMm: MTG_CARD_WIDTH_MM,
    cardHeightMm: MTG_CARD_HEIGHT_MM,
    gapMm,
    gridWidthMm,
    gridHeightMm,
    marginHorizontalMm,
    marginVerticalMm,
  };
}

/**
 * Expands user card selections into ordered print slots and splits them
 * across exact 3x3 A4 sheets (9 cards of 63x88mm per sheet).
 */
export function paginateProxySheets(
  selections: readonly ProxyPrintSelection[],
  options: ProxySheetLayoutOptions,
): readonly ProxySheetPage[] {
  const slots: ProxyPrintSlot[] = [];

  for (const selection of selections) {
    const qty = Math.max(0, Math.min(20, Math.trunc(selection.quantity)));
    for (let copy = 1; copy <= qty; copy++) {
      slots.push({
        oracleId: selection.oracleId,
        slug: selection.slug,
        name: selection.name,
        variant: selection.variant,
        face: "front",
        copyIndex: copy,
      });
      if (options.includeBackFaces && selection.hasBackFace) {
        slots.push({
          oracleId: selection.oracleId,
          slug: selection.slug,
          name: selection.name,
          variant: selection.variant,
          face: "back",
          copyIndex: copy,
        });
      }
    }
  }

  if (slots.length === 0) {
    return [];
  }

  const totalPages = Math.ceil(slots.length / CARDS_PER_A4_SHEET);
  const pages: ProxySheetPage[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const start = pageIndex * CARDS_PER_A4_SHEET;
    pages.push({
      pageNumber: pageIndex + 1,
      totalPages,
      slots: slots.slice(start, start + CARDS_PER_A4_SHEET),
    });
  }

  return pages;
}
