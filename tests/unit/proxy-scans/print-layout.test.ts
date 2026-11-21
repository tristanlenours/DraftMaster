import { describe, expect, it } from "vitest";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  CARDS_PER_A4_SHEET,
  MTG_CARD_HEIGHT_MM,
  MTG_CARD_WIDTH_MM,
  computeA4GridGeometry,
  paginateProxySheets,
} from "../../../src/proxy-scans/print-layout.ts";

describe("proxy-scans A4 print sheet layout", () => {
  it("computes exact 63x88mm 3x3 geometry within A4 portrait bounds", () => {
    const flush = computeA4GridGeometry(0);
    expect(flush.cardWidthMm).toBe(MTG_CARD_WIDTH_MM);
    expect(flush.cardHeightMm).toBe(MTG_CARD_HEIGHT_MM);
    expect(flush.gridWidthMm).toBe(189);
    expect(flush.gridHeightMm).toBe(264);
    expect(flush.gridWidthMm + flush.marginHorizontalMm * 2).toBe(A4_WIDTH_MM);
    expect(flush.gridHeightMm + flush.marginVerticalMm * 2).toBe(A4_HEIGHT_MM);

    const spaced = computeA4GridGeometry(2);
    expect(spaced.gridWidthMm).toBe(193);
    expect(spaced.gridHeightMm).toBe(268);
    expect(spaced.marginHorizontalMm).toBeGreaterThan(0);
    expect(spaced.marginVerticalMm).toBeGreaterThan(0);
  });

  it("paginates quantities and optional DFC back faces cleanly across 9-card A4 sheets", () => {
    const pages = paginateProxySheets(
      [
        {
          oracleId: "id-1",
          slug: "lightning-bolt",
          name: "Lightning Bolt",
          variant: "classic",
          quantity: 4,
        },
        {
          oracleId: "id-2",
          slug: "fable-of-the-mirror-breaker",
          name: "Fable of the Mirror-Breaker",
          variant: "original",
          quantity: 3,
          hasBackFace: true,
        },
      ],
      { cropMarks: true, gapMm: 0, includeBackFaces: true },
    );

    // 4 fronts + 3*(front+back) = 10 slots -> 2 A4 pages (9 + 1)
    expect(pages).toHaveLength(2);
    expect(pages[0]?.slots).toHaveLength(CARDS_PER_A4_SHEET);
    expect(pages[1]?.slots).toHaveLength(1);
    expect(pages[0]?.totalPages).toBe(2);
    expect(pages[0]?.slots.filter((s) => s.face === "back").length).toBeGreaterThanOrEqual(2);
  });

  it("omits back faces when includeBackFaces is false", () => {
    const pages = paginateProxySheets(
      [
        {
          oracleId: "id-2",
          slug: "delver-of-secrets",
          name: "Delver of Secrets",
          variant: "classic",
          quantity: 4,
          hasBackFace: true,
        },
      ],
      { cropMarks: false, gapMm: 2, includeBackFaces: false },
    );

    expect(pages).toHaveLength(1);
    expect(pages[0]?.slots).toHaveLength(4);
    expect(pages[0]?.slots.every((s) => s.face === "front")).toBe(true);
  });
});
