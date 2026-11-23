/**
 * Pure print-sheet geometry for the proxy studio (millimetres, DOM-free).
 *
 * A sheet holds a grid of cards. Each cell is the 63x88 mm trim box grown by
 * the bleed on every side; cut marks sit in the page margins, on the trim lines,
 * so a guillotine or rotary cutter can follow them straight across the sheet.
 */

export const CARD_TRIM_WIDTH_MM = 63;
export const CARD_TRIM_HEIGHT_MM = 88;

export const PAGE_FORMATS = Object.freeze({
  a4: Object.freeze({ id: "a4", label: "A4", widthMm: 210, heightMm: 297, cssSize: "A4" }),
  letter: Object.freeze({
    id: "letter",
    label: "Letter",
    widthMm: 215.9,
    heightMm: 279.4,
    cssSize: "letter",
  }),
});

export const BLEED_OPTIONS_MM = Object.freeze([0, 1, 2]);
export const GAP_OPTIONS_MM = Object.freeze([0, 2]);
/** Home printers cannot print closer than ~3 mm to the paper edge. */
export const MIN_PRINTABLE_MARGIN_MM = 3;
export const CUT_MARK_LENGTH_MM = 4;

function round(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Computes the grid geometry of one sheet.
 *
 * @returns {{
 *   page: object, columns: number, rows: number, perPage: number,
 *   cellWidthMm: number, cellHeightMm: number, gapMm: number, bleedMm: number,
 *   originXMm: number, originYMm: number, gridWidthMm: number, gridHeightMm: number,
 *   cells: Array<{ index: number, column: number, row: number, xMm: number, yMm: number }>,
 *   trimLinesXMm: number[], trimLinesYMm: number[], marginXMm: number, marginYMm: number,
 *   fits: boolean,
 * }}
 */
export function computeSheetLayout({
  pageFormat = "a4",
  gapMm = 0,
  bleedMm = 0,
  columns = 3,
  rows = 3,
} = {}) {
  const page = PAGE_FORMATS[pageFormat] ?? PAGE_FORMATS.a4;
  const bleed = Math.max(0, Number(bleedMm) || 0);
  const gap = Math.max(0, Number(gapMm) || 0);
  const cellWidthMm = CARD_TRIM_WIDTH_MM + bleed * 2;
  const cellHeightMm = CARD_TRIM_HEIGHT_MM + bleed * 2;
  const gridWidthMm = columns * cellWidthMm + (columns - 1) * gap;
  const gridHeightMm = rows * cellHeightMm + (rows - 1) * gap;
  const marginXMm = (page.widthMm - gridWidthMm) / 2;
  const marginYMm = (page.heightMm - gridHeightMm) / 2;

  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      cells.push({
        index: row * columns + column,
        column,
        row,
        xMm: round(marginXMm + column * (cellWidthMm + gap)),
        yMm: round(marginYMm + row * (cellHeightMm + gap)),
      });
    }
  }

  const trimLinesXMm = uniqueSorted(
    Array.from({ length: columns }, (_, column) => {
      const left = marginXMm + column * (cellWidthMm + gap) + bleed;
      return [left, left + CARD_TRIM_WIDTH_MM];
    }).flat(),
  );
  const trimLinesYMm = uniqueSorted(
    Array.from({ length: rows }, (_, row) => {
      const top = marginYMm + row * (cellHeightMm + gap) + bleed;
      return [top, top + CARD_TRIM_HEIGHT_MM];
    }).flat(),
  );

  return {
    page,
    columns,
    rows,
    perPage: columns * rows,
    cellWidthMm: round(cellWidthMm),
    cellHeightMm: round(cellHeightMm),
    gapMm: gap,
    bleedMm: bleed,
    originXMm: round(marginXMm),
    originYMm: round(marginYMm),
    gridWidthMm: round(gridWidthMm),
    gridHeightMm: round(gridHeightMm),
    marginXMm: round(marginXMm),
    marginYMm: round(marginYMm),
    cells,
    trimLinesXMm,
    trimLinesYMm,
    fits: marginXMm >= MIN_PRINTABLE_MARGIN_MM && marginYMm >= MIN_PRINTABLE_MARGIN_MM,
  };
}

function uniqueSorted(values) {
  const rounded = values.map(round).sort((a, b) => a - b);
  return rounded.filter((value, index) => index === 0 || value - rounded[index - 1] > 0.001);
}

/**
 * Cut marks: short strokes in the page margins, prolonging every trim line.
 * Returns segments in millimetres: `{ x1, y1, x2, y2 }`.
 */
export function computeCutMarks(layout, lengthMm = CUT_MARK_LENGTH_MM) {
  const marks = [];
  const top = layout.originYMm;
  const bottom = layout.originYMm + layout.gridHeightMm;
  const left = layout.originXMm;
  const right = layout.originXMm + layout.gridWidthMm;
  const offset = 1; // keep 1 mm clear of the grid so marks never print on a card
  const vertical = Math.max(0, Math.min(lengthMm, layout.marginYMm - offset - 0.5));
  const horizontal = Math.max(0, Math.min(lengthMm, layout.marginXMm - offset - 0.5));
  if (vertical > 0) {
    for (const x of layout.trimLinesXMm) {
      marks.push({ x1: x, y1: round(top - offset - vertical), x2: x, y2: round(top - offset) });
      marks.push({
        x1: x,
        y1: round(bottom + offset),
        x2: x,
        y2: round(bottom + offset + vertical),
      });
    }
  }
  if (horizontal > 0) {
    for (const y of layout.trimLinesYMm) {
      marks.push({ x1: round(left - offset - horizontal), y1: y, x2: round(left - offset), y2: y });
      marks.push({
        x1: round(right + offset),
        y1: y,
        x2: round(right + offset + horizontal),
        y2: y,
      });
    }
  }
  return marks;
}

/**
 * Splits print slots into sheets.
 *
 * Without duplex, front and back faces simply follow each other. With duplex,
 * every page of fronts is followed by a page of backs whose columns are
 * mirrored, so after a long-edge flip each back lands behind its front; cards
 * without a back face leave their back cell empty.
 *
 * @param {Array<{ face: "front"|"back" }>} slots ordered slots, a back always right after its front
 * @returns {Array<{ side: "front"|"back"|"mixed", cells: Array<object|null> }>}
 */
export function paginatePrintSlots(slots, { perPage = 9, columns = 3, duplex = false } = {}) {
  const pages = [];
  if (!duplex) {
    for (let start = 0; start < slots.length; start += perPage) {
      pages.push({ side: "mixed", cells: slots.slice(start, start + perPage) });
    }
    return pages;
  }

  const pairs = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.face === "back") continue;
    const next = slots[i + 1];
    pairs.push({ front: slot, back: next?.face === "back" ? next : null });
  }

  for (let start = 0; start < pairs.length; start += perPage) {
    const chunk = pairs.slice(start, start + perPage);
    pages.push({ side: "front", cells: chunk.map((pair) => pair.front) });
    if (chunk.some((pair) => pair.back)) {
      const backs = new Array(Math.min(perPage, Math.ceil(chunk.length / columns) * columns)).fill(
        null,
      );
      chunk.forEach((pair, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;
        backs[row * columns + (columns - 1 - column)] = pair.back;
      });
      pages.push({ side: "back", cells: backs });
    }
  }
  return pages;
}
