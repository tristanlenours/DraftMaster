import { describe, expect, it } from "vitest";
import {
  CARD_TRIM_HEIGHT_MM,
  CARD_TRIM_WIDTH_MM,
  computeCutMarks,
  computeSheetLayout,
  paginatePrintSlots,
} from "../../../src/web/proxy-print-layout.js";

describe("computeSheetLayout", () => {
  it("centres a borderless 3x3 grid of 63x88 mm cards on A4", () => {
    const layout = computeSheetLayout({ pageFormat: "a4" });
    expect(layout.gridWidthMm).toBe(189);
    expect(layout.gridHeightMm).toBe(264);
    expect(layout.originXMm).toBe(10.5);
    expect(layout.originYMm).toBe(16.5);
    expect(layout.cells).toHaveLength(9);
    expect(layout.cells[4]).toMatchObject({ column: 1, row: 1, xMm: 73.5, yMm: 104.5 });
    expect(layout.fits).toBe(true);
  });

  it("grows every cell by the bleed while keeping the trim box at 63x88 mm", () => {
    const layout = computeSheetLayout({ pageFormat: "a4", bleedMm: 2 });
    expect(layout.cellWidthMm).toBe(CARD_TRIM_WIDTH_MM + 4);
    expect(layout.cellHeightMm).toBe(CARD_TRIM_HEIGHT_MM + 4);
    // Shared cut between two bled cards: one trim line per card edge.
    expect(layout.trimLinesXMm).toEqual([6.5, 69.5, 73.5, 136.5, 140.5, 203.5]);
    for (let column = 0; column < 3; column++) {
      const left = layout.trimLinesXMm[column * 2] ?? 0;
      const right = layout.trimLinesXMm[column * 2 + 1] ?? 0;
      expect(right - left).toBeCloseTo(CARD_TRIM_WIDTH_MM);
    }
  });

  it("merges trim lines of adjacent cards when there is neither gap nor bleed", () => {
    const layout = computeSheetLayout({ pageFormat: "a4" });
    expect(layout.trimLinesXMm).toEqual([10.5, 73.5, 136.5, 199.5]);
    expect(layout.trimLinesYMm).toEqual([16.5, 104.5, 192.5, 280.5]);
  });

  it("supports US Letter and flags grids that leave less than the printable margin", () => {
    expect(computeSheetLayout({ pageFormat: "letter" }).fits).toBe(true);
    const tight = computeSheetLayout({ pageFormat: "letter", bleedMm: 2, gapMm: 2 });
    expect(tight.marginYMm).toBeLessThan(3);
    expect(tight.fits).toBe(false);
  });
});

describe("computeCutMarks", () => {
  it("prolongs every trim line into the margins without touching the grid", () => {
    const layout = computeSheetLayout({ pageFormat: "a4", gapMm: 2 });
    const marks = computeCutMarks(layout);
    const expected = (layout.trimLinesXMm.length + layout.trimLinesYMm.length) * 2;
    expect(marks).toHaveLength(expected);
    for (const mark of marks) {
      const vertical = mark.x1 === mark.x2;
      if (vertical) {
        const outsideTop = mark.y2 <= layout.originYMm;
        const outsideBottom = mark.y1 >= layout.originYMm + layout.gridHeightMm;
        expect(outsideTop || outsideBottom).toBe(true);
        expect(Math.min(mark.y1, mark.y2)).toBeGreaterThanOrEqual(0);
      } else {
        const outsideLeft = mark.x2 <= layout.originXMm;
        const outsideRight = mark.x1 >= layout.originXMm + layout.gridWidthMm;
        expect(outsideLeft || outsideRight).toBe(true);
      }
    }
  });
});

describe("paginatePrintSlots", () => {
  const front = (id: string) => ({ id, face: "front" as const });
  const back = (id: string) => ({ id, face: "back" as const });

  it("chains fronts and backs page by page without duplex", () => {
    const slots = [
      front("a"),
      back("a"),
      ...Array.from({ length: 8 }, (_, i) => front(`c${String(i)}`)),
    ];
    const pages = paginatePrintSlots(slots, { perPage: 9 });
    expect(pages.map((page) => page.cells.length)).toEqual([9, 1]);
    expect(pages[0]?.side).toBe("mixed");
  });

  it("puts backs on a mirrored page so they align after a long-edge flip", () => {
    const slots = [front("a"), back("a"), front("b"), front("c"), back("c"), front("d")];
    const pages = paginatePrintSlots(slots, { perPage: 9, columns: 3, duplex: true });
    expect(pages.map((page) => page.side)).toEqual(["front", "back"]);
    expect(pages[0]?.cells.map((cell) => cell?.id)).toEqual(["a", "b", "c", "d"]);
    // Row 0: a,b,c -> mirrored c,b,a ; row 1: d -> mirrored into the last column.
    expect(pages[1]?.cells.map((cell) => (cell ? `${cell.id}:${cell.face}` : null))).toEqual([
      "c:back",
      null,
      "a:back",
      null,
      null,
      null,
    ]);
  });

  it("skips the back page when no card on the sheet has a back face", () => {
    const pages = paginatePrintSlots([front("a"), front("b")], { duplex: true });
    expect(pages.map((page) => page.side)).toEqual(["front"]);
  });
});
