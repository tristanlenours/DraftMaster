import { describe, expect, it } from "vitest";
import {
  M15_GEOMETRY,
  applyFrenchNonBreakingSpaces,
  canRetextVariant,
  clampClusterStart,
  countManaSymbols,
  detectInkPolarity,
  eraseInkInRegion,
  findInkColumnRuns,
  fitSingleLine,
  layoutRulesText,
  manaSymbolFileCode,
  scaleRect,
  scoreM15Layout,
  splitMdfcHint,
  tokenizeRulesText,
} from "../../../src/web/proxy-retext-core.js";

const PAPER = [232, 222, 210] as const;
const INK = [18, 16, 14] as const;

/** Builds a parchment-like RGBA region with deterministic grain and optional ink strokes. */
function makeRegion(
  width: number,
  height: number,
  ink: (x: number, y: number) => boolean,
  paper: readonly number[] = PAPER,
  inkColor: readonly number[] = INK,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const grain = ((x * 7 + y * 13) % 9) - 4;
      const color = ink(x, y) ? inkColor : paper;
      data[p] = (color[0] ?? 0) + (ink(x, y) ? 0 : grain);
      data[p + 1] = (color[1] ?? 0) + (ink(x, y) ? 0 : grain);
      data[p + 2] = (color[2] ?? 0) + (ink(x, y) ? 0 : grain);
      data[p + 3] = 255;
    }
  }
  return data;
}

/** Fake 2-px strokes laid out like a line of text. */
const textStrokes = (x: number, y: number): boolean =>
  y >= 20 && y <= 40 && x >= 10 && x <= 150 && x % 9 < 2;

/** Monospace measure: every character is half the font size wide. */
const monoMeasure = (text: string, { size }: { size: number }): number => text.length * size * 0.5;

describe("canRetextVariant", () => {
  const base = {
    frame: "2015",
    frameEffects: [] as string[],
    isOfficialFrenchScan: false,
    fullArt: false,
  };

  it("accepts an English M15 scan of a normal card", () => {
    expect(canRetextVariant(base, { name: "Lightning Bolt", typeLine: "Instant" })).toBe(true);
  });

  it("keeps official French scans untouched", () => {
    expect(canRetextVariant({ ...base, isOfficialFrenchScan: true }, { name: "Foudre" })).toBe(
      false,
    );
  });

  it("refuses frames and layouts whose text boxes are elsewhere", () => {
    expect(canRetextVariant({ ...base, frame: "2003" }, { name: "Bolt" })).toBe(false);
    expect(canRetextVariant({ ...base, frameEffects: ["showcase"] }, { name: "Bolt" })).toBe(false);
    expect(canRetextVariant({ ...base, fullArt: true }, { name: "Island" })).toBe(false);
    expect(
      canRetextVariant(base, { name: "Jace", typeLine: "Legendary Planeswalker — Jace" }),
    ).toBe(false);
    expect(canRetextVariant(base, { name: "Bonecrusher Giant // Stomp" })).toBe(false);
  });

  it("accepts transform cards, whose front face uses the M15 boxes", () => {
    expect(
      canRetextVariant(
        { ...base, backFace: { name: "Back" } },
        { name: "Delver of Secrets // Insectile Aberration" },
      ),
    ).toBe(true);
  });
});

describe("scaleRect", () => {
  it("maps reference geometry onto a double-resolution scan", () => {
    expect(scaleRect(M15_GEOMETRY.nameBar, 1490, 2080)).toEqual({
      x: 108,
      y: 100,
      w: 1292,
      h: 100,
    });
  });
});

describe("eraseInkInRegion", () => {
  it("rebuilds the paper under dark ink and leaves ink-free pixels untouched", () => {
    const width = 160;
    const height = 60;
    const data = makeRegion(width, height, textStrokes);
    const original = new Uint8ClampedArray(data);

    const result = eraseInkInRegion(data, width, height, { seed: 7 });

    expect(result.polarity).toBe("dark");
    expect(result.erasedPixels).toBeGreaterThan(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        if (textStrokes(x, y)) {
          // Former ink now looks like paper (within the grain amplitude).
          expect(Math.abs((data[p] ?? 0) - PAPER[0])).toBeLessThanOrEqual(14);
          expect(Math.abs((data[p + 2] ?? 0) - PAPER[2])).toBeLessThanOrEqual(14);
        }
        const offsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
        const nearInk = offsets.some((dx) => offsets.some((dy) => textStrokes(x + dx, y + dy)));
        if (!nearInk) {
          expect(data[p]).toBe(original[p]);
        }
      }
    }
  });

  it("is deterministic for a given seed", () => {
    const a = makeRegion(120, 50, textStrokes);
    const b = makeRegion(120, 50, textStrokes);
    eraseInkInRegion(a, 120, 50, { seed: 42 });
    eraseInkInRegion(b, 120, 50, { seed: 42 });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("erases light ink printed on dark panels (inverted frames)", () => {
    const width = 160;
    const height = 60;
    const darkPanel = [30, 32, 38];
    const whiteInk = [245, 245, 240];
    const data = makeRegion(width, height, textStrokes, darkPanel, whiteInk);
    const result = eraseInkInRegion(data, width, height, { seed: 3 });
    expect(result.polarity).toBe("light");
    const p = (30 * width + 10) * 4;
    expect(data[p]).toBeLessThan(60);
  });
});

describe("detectInkPolarity", () => {
  it("tells light paper from dark panels", () => {
    expect(
      detectInkPolarity(
        makeRegion(40, 20, () => false),
        40,
        20,
      ),
    ).toBe("dark");
    expect(
      detectInkPolarity(
        makeRegion(40, 20, () => false, [20, 20, 25]),
        40,
        20,
      ),
    ).toBe("light");
  });
});

describe("findInkColumnRuns", () => {
  it("merges letters into words and keeps distant clusters apart", () => {
    const width = 100;
    const height = 10;
    const mask = new Float32Array(width * height);
    const inkColumns = [2, 3, 6, 7, 8, 80, 81, 84, 85];
    for (const x of inkColumns) for (let y = 0; y < height; y++) mask[y * width + x] = 1;
    expect(findInkColumnRuns(mask, width, height, { maxGap: 6 })).toEqual([
      [2, 8],
      [80, 85],
    ]);
  });
});

describe("manaSymbolFileCode", () => {
  it("maps rules-text tokens to Scryfall SVG file stems", () => {
    expect(manaSymbolFileCode("W")).toBe("W");
    expect(manaSymbolFileCode("{T}")).toBe("T");
    expect(manaSymbolFileCode("2/W")).toBe("2W");
    expect(manaSymbolFileCode("g/p")).toBe("GP");
    expect(manaSymbolFileCode("10")).toBe("10");
    expect(manaSymbolFileCode("½")).toBe("HALF");
  });

  it("rejects anything that is not a symbol code", () => {
    expect(manaSymbolFileCode("")).toBeNull();
    expect(manaSymbolFileCode("../etc")).toBeNull();
    expect(manaSymbolFileCode("W U")).toBeNull();
  });
});

describe("French typography", () => {
  it("makes the space before : ; ! ? » and after « non-breaking", () => {
    expect(applyFrenchNonBreakingSpaces("Ajoutez {W} : piochez « charge » !")).toBe(
      "Ajoutez {W} : piochez « charge » !",
    );
  });

  it("tokenizes symbols, words and italic reminder text", () => {
    const [paragraph] = tokenizeRulesText("{T} : Ajoutez {G}. (Rappel)");
    expect(paragraph?.map((t) => t.kind)).toEqual([
      "symbol",
      "text",
      "space",
      "text",
      "space",
      "symbol",
      "text",
      "space",
      "text",
    ]);
    expect(paragraph?.[1]).toMatchObject({ value: " :", italic: false });
    expect(paragraph?.at(-1)).toMatchObject({ value: "(Rappel)", italic: true });
  });
});

describe("layoutRulesText", () => {
  const box = { x: 0, y: 0, w: 200, h: 120 };

  it("keeps the largest size when the text fits and centres it vertically", () => {
    const layout = layoutRulesText({
      rulesText: "Vol",
      box,
      measure: monoMeasure,
      maxSize: 30,
      minSize: 12,
    });
    expect(layout.size).toBe(30);
    expect(layout.lines).toHaveLength(1);
    expect(layout.offsetY).toBeCloseTo((box.h - layout.height) / 2);
  });

  it("shrinks the font until long French text fits the box", () => {
    const text = "Quand cette créature arrive, piochez une carte. ".repeat(3);
    const layout = layoutRulesText({ rulesText: text, box, measure: monoMeasure, maxSize: 30 });
    expect(layout.fits).toBe(true);
    expect(layout.size).toBeLessThan(30);
    expect(layout.height + layout.offsetY).toBeLessThanOrEqual(box.h + 0.01);
    for (const line of layout.lines) {
      const last = line.runs.at(-1);
      expect((last?.x ?? 0) + (last?.width ?? 0)).toBeLessThanOrEqual(box.w + 0.01);
    }
  });

  it("keeps a symbol and its trailing punctuation on the same line", () => {
    const layout = layoutRulesText({
      rulesText: "Piochez trois cartes {T} : ajoutez {G}.",
      box: { x: 0, y: 0, w: 130, h: 400 },
      measure: monoMeasure,
      maxSize: 12,
      minSize: 12,
    });
    for (const line of layout.lines) {
      expect(line.runs[0]?.kind === "text" && /^[ :.]/u.test(line.runs[0].value)).toBe(false);
    }
  });

  it("never starts a line with French high punctuation", () => {
    const text = "Engagez un artefact ciblé : il ne se dégage pas ; piochez « deux » cartes !";
    const layout = layoutRulesText({
      rulesText: text,
      box: { x: 0, y: 0, w: 120, h: 400 },
      measure: monoMeasure,
      maxSize: 12,
      minSize: 12,
    });
    for (const line of layout.lines) {
      expect(line.runs[0]?.value).not.toMatch(/^[:;!?»]/u);
    }
  });

  it("narrows the lines that run beside the power/toughness box", () => {
    const ptRect = { x: 150, y: 90, w: 50, h: 30 };
    const layout = layoutRulesText({
      rulesText: "mot ".repeat(40),
      box,
      measure: monoMeasure,
      maxSize: 14,
      minSize: 14,
      avoidRects: [ptRect],
      verticalCenter: false,
    });
    for (const line of layout.lines) {
      if (line.y + layout.lineHeight > ptRect.y && line.y < ptRect.y + ptRect.h) {
        const last = line.runs.at(-1);
        expect((last?.x ?? 0) + (last?.width ?? 0)).toBeLessThanOrEqual(ptRect.x - 6 + 0.01);
      }
    }
  });

  it("separates flavor text with a rule and sets it in italics", () => {
    const layout = layoutRulesText({
      rulesText: "Vol",
      flavorText: "« Le ciel est à nous. »",
      box,
      measure: monoMeasure,
    });
    expect(layout.separatorY).not.toBeNull();
    const flavorLines = layout.lines.filter((line) => line.isFlavor);
    expect(flavorLines.length).toBeGreaterThan(0);
    expect(flavorLines.flatMap((line) => line.runs).every((run) => run.italic)).toBe(true);
  });
});

describe("fitSingleLine", () => {
  it("steps the size down, then condenses horizontally as a last resort", () => {
    expect(fitSingleLine("Foudre", 200, monoMeasure, { maxSize: 30, minSize: 20 })).toMatchObject({
      size: 30,
      scaleX: 1,
    });
    const tight = fitSingleLine("Un nom vraiment très long", 200, monoMeasure, {
      maxSize: 30,
      minSize: 20,
    });
    expect(tight.size).toBe(20);
    expect(tight.scaleX).toBeLessThan(1);
  });
});

describe("modal double-faced hint strip", () => {
  it("splits the other face's hint from the printed French text", () => {
    expect(
      splitMdfcHint("Détruisez une cible, créature ou planeswalker.\nTerrain\n{T} : Ajoutez {B}."),
    ).toEqual({
      rulesText: "Détruisez une cible, créature ou planeswalker.",
      hint: { type: "Terrain", text: "{T} : Ajoutez {B}." },
    });
  });

  it("leaves ordinary multi-paragraph text alone", () => {
    const text = "Vol\nVigilance\nQuand cette créature arrive, piochez une carte.";
    expect(splitMdfcHint(text)).toEqual({ rulesText: text, hint: null });
  });
});

describe("cluster helpers", () => {
  it("clamps a mana cost / set symbol cluster into its physical band", () => {
    expect(clampClusterStart(10, 600, { minWidth: 40, maxWidth: 120 })).toBe(480);
    expect(clampClusterStart(590, 600, { minWidth: 40, maxWidth: 120 })).toBe(560);
    expect(clampClusterStart(520, 600, { minWidth: 40, maxWidth: 120 })).toBe(520);
  });

  it("counts mana symbols in a cost", () => {
    expect(countManaSymbols("{2}{U}{U}")).toBe(3);
    expect(countManaSymbols("")).toBe(0);
  });
});

describe("scoreM15Layout", () => {
  /** Grainy 745x1040 render with crisp horizontal bars at the given y positions. */
  function renderWithEdges(edges: readonly number[]): Uint8ClampedArray {
    const width = 745;
    const height = 1040;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      // Flat bands that change brightness at every listed edge.
      const band = edges.filter((edge) => y >= edge).length;
      for (let x = 0; x < width; x++) {
        const p = (y * width + x) * 4;
        const grain = ((x * 13 + y * 7) % 11) - 5;
        const value = (band % 2 === 0 ? 70 : 200) + grain;
        data[p] = value;
        data[p + 1] = value;
        data[p + 2] = value;
        data[p + 3] = 255;
      }
    }
    return data;
  }

  it("recognizes a render whose bars sit at the M15 positions", () => {
    const result = scoreM15Layout(renderWithEdges([50, 100, 589, 638, 656, 960]), 745, 1040);
    expect(result.compatible).toBe(true);
    expect(result.ratios).toHaveLength(5);
  });

  it("rejects an extended template whose type line moved down", () => {
    const result = scoreM15Layout(renderWithEdges([50, 100, 690, 740, 760, 990]), 745, 1040);
    expect(result.compatible).toBe(false);
  });
});
