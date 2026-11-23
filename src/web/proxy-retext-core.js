/**
 * Pure, DOM-free core of the "retexturage FR" engine.
 *
 * The engine keeps a real high-resolution English scan, erases its printed
 * text (name, type line, rules box) by rebuilding the frame texture behind the
 * ink, then lets the canvas layer typeset French text on top. Everything here
 * works on plain RGBA byte arrays so it can be unit-tested without a browser.
 */

/** Reference geometry of the 2015 (M15) frame on a 745x1040 Scryfall PNG. */
export const M15_REFERENCE_WIDTH = 745;
export const M15_REFERENCE_HEIGHT = 1040;

export const M15_GEOMETRY = Object.freeze({
  nameBar: Object.freeze({ x: 54, y: 50, w: 646, h: 50 }),
  typeBar: Object.freeze({ x: 54, y: 589, w: 646, h: 49 }),
  rulesBox: Object.freeze({ x: 57, y: 656, w: 633, h: 305 }),
  ptBox: Object.freeze({ x: 586, y: 926, w: 120, h: 62 }),
  /** Holo-stamp housing of rares and mythics, rising into the rules box bottom. */
  holoNotch: Object.freeze({ x: 322, y: 944, w: 102, h: 20 }),
  /** Modal DFC hint strip (other face's type + short text), bottom-left of the rules box. */
  mdfcStrip: Object.freeze({ x: 20, y: 920, w: 336, h: 46 }),
  mdfcStripText: Object.freeze({ x: 50, y: 926, w: 272, h: 34 }),
  nameTextX: 62,
  dfcNameTextX: 104,
  typeTextX: 62,
  rulesPadX: 14,
  rulesPadY: 10,
});

/** Frames whose text boxes sit exactly where {@link M15_GEOMETRY} expects. */
const RETEXT_FRAMES = new Set(["2015"]);
const RETEXT_BLOCKED_EFFECTS = new Set(["showcase", "etched", "fullart", "textless"]);
const RETEXT_BLOCKED_TYPES = [
  "Planeswalker",
  "Saga",
  "Class",
  "Case",
  "Battle",
  "Room",
  "Spacecraft",
  "Planet",
];

/**
 * Tells whether a scan can be retextured in place with the M15 geometry.
 * Other layouts (planeswalkers, sagas, adventures, showcase frames...) keep the
 * synthesized DraftMaster frame.
 */
export function canRetextVariant(variant, card) {
  if (!variant) return false;
  if (variant.isOfficialFrenchScan) return false;
  if (!RETEXT_FRAMES.has(String(variant.frame || ""))) return false;
  if (variant.fullArt || variant.textless) return false;
  const effects = Array.isArray(variant.frameEffects) ? variant.frameEffects : [];
  if (effects.some((effect) => RETEXT_BLOCKED_EFFECTS.has(effect))) return false;
  const typeLine = String(card?.typeLine || "");
  if (RETEXT_BLOCKED_TYPES.some((blocked) => typeLine.includes(blocked))) return false;
  const name = String(card?.name || "");
  const isTransform = Boolean(variant.backFace);
  if (name.includes(" // ") && !isTransform) return false;
  return true;
}

/** Scales a reference rectangle to an arbitrary scan resolution, in whole pixels. */
export function scaleRect(rect, width, height) {
  const sx = width / M15_REFERENCE_WIDTH;
  const sy = height / M15_REFERENCE_HEIGHT;
  const x = Math.round(rect.x * sx);
  const y = Math.round(rect.y * sy);
  return {
    x,
    y,
    w: Math.max(1, Math.round((rect.x + rect.w) * sx) - x),
    h: Math.max(1, Math.round((rect.y + rect.h) * sy) - y),
  };
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Detects whether ink is darker ("dark") or lighter ("light") than the paper
 * of a region. Classic frames print black ink on a light bar; inverted and
 * borderless treatments print white ink on dark panels.
 */
export function detectInkPolarity(data, width, height) {
  const lums = new Float32Array(width * height);
  for (let i = 0, p = 0; i < lums.length; i++, p += 4) {
    lums[i] = luminance(data[p], data[p + 1], data[p + 2]);
  }
  const sorted = Array.from(lums).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  return median >= 110 ? "dark" : "light";
}

/**
 * Estimates the ink-free paper colour of every pixel of a region.
 *
 * The region is split into blocks; in each block the pixels are ranked by
 * luminance and the paper colour is taken from the brighter (dark ink) or
 * darker (light ink) side of the distribution, where ink never dominates. The
 * block colours are then bilinearly interpolated back to full resolution.
 */
export function estimatePaperBackground(data, width, height, options = {}) {
  const blockSize = Math.max(4, Math.round(options.blockSize ?? 28));
  const polarity = options.polarity ?? "dark";
  const rank = polarity === "dark" ? 0.72 : 0.28;
  const cols = Math.max(1, Math.ceil(width / blockSize));
  const rows = Math.max(1, Math.ceil(height / blockSize));
  const grid = new Float32Array(cols * rows * 3);

  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const x0 = bx * blockSize;
      const y0 = by * blockSize;
      const x1 = Math.min(width, x0 + blockSize);
      const y1 = Math.min(height, y0 + blockSize);
      const samples = [];
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = (y * width + x) * 4;
          samples.push([luminance(data[p], data[p + 1], data[p + 2]), p]);
        }
      }
      samples.sort((a, b) => a[0] - b[0]);
      const center = Math.min(samples.length - 1, Math.floor(samples.length * rank));
      const half = Math.max(1, Math.floor(samples.length * 0.1));
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (
        let k = Math.max(0, center - half);
        k <= Math.min(samples.length - 1, center + half);
        k++
      ) {
        const p = samples[k][1];
        r += data[p];
        g += data[p + 1];
        b += data[p + 2];
        n++;
      }
      const g0 = (by * cols + bx) * 3;
      grid[g0] = r / n;
      grid[g0 + 1] = g / n;
      grid[g0 + 2] = b / n;
    }
  }

  const background = new Float32Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(rows - 1, Math.max(0, (y + 0.5) / blockSize - 0.5));
    const gy0 = Math.floor(gy);
    const gy1 = Math.min(rows - 1, gy0 + 1);
    const ty = gy - gy0;
    for (let x = 0; x < width; x++) {
      const gx = Math.min(cols - 1, Math.max(0, (x + 0.5) / blockSize - 0.5));
      const gx0 = Math.floor(gx);
      const gx1 = Math.min(cols - 1, gx0 + 1);
      const tx = gx - gx0;
      const o = (y * width + x) * 3;
      for (let c = 0; c < 3; c++) {
        const a = grid[(gy0 * cols + gx0) * 3 + c];
        const b = grid[(gy0 * cols + gx1) * 3 + c];
        const d = grid[(gy1 * cols + gx0) * 3 + c];
        const e = grid[(gy1 * cols + gx1) * 3 + c];
        background[o + c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
      }
    }
  }
  return background;
}

/**
 * Builds a soft [0..1] mask of the printed ink (letters, mana symbols, italic
 * reminder text) by comparing every pixel to its estimated paper colour.
 */
export function buildInkMask(data, background, width, height, options = {}) {
  const polarity = options.polarity ?? "dark";
  const low = options.lowThreshold ?? 14;
  const high = options.highThreshold ?? 34;
  const dilate = Math.max(0, Math.round(options.dilate ?? 2));
  const raw = new Float32Array(width * height);

  for (let i = 0; i < raw.length; i++) {
    const p = i * 4;
    const o = i * 3;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const lumDelta =
      luminance(background[o], background[o + 1], background[o + 2]) - luminance(r, g, b);
    const directional = polarity === "dark" ? lumDelta : -lumDelta;
    const chroma = Math.max(
      Math.abs(r - background[o]),
      Math.abs(g - background[o + 1]),
      Math.abs(b - background[o + 2]),
    );
    const strength = Math.max(directional, chroma * 0.8);
    raw[i] = Math.min(1, Math.max(0, (strength - low) / (high - low)));
  }

  if (dilate === 0) return raw;

  // Separable max-filter: grows the mask over anti-aliased glyph edges and drop shadows.
  const horizontal = new Float32Array(raw.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let m = 0;
      for (let k = -dilate; k <= dilate; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= width) continue;
        const v = raw[y * width + xx];
        if (v > m) m = v;
      }
      horizontal[y * width + x] = m;
    }
  }
  const mask = new Float32Array(raw.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let m = 0;
      for (let k = -dilate; k <= dilate; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= height) continue;
        const v = horizontal[yy * width + x];
        if (v > m) m = v;
      }
      mask[y * width + x] = m;
    }
  }
  return mask;
}

/** Deterministic mulberry32 PRNG so a given scan always erases identically. */
export function createSeededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Erases the ink of an RGBA region in place.
 *
 * Masked pixels are replaced by the paper colour plus a residual sampled from
 * nearby ink-free pixels, which re-creates the parchment grain instead of a
 * flat smear. Unmasked pixels are left untouched, so the original texture
 * survives everywhere there was no text.
 */
export function eraseInkInRegion(data, width, height, options = {}) {
  const polarity = options.polarity ?? detectInkPolarity(data, width, height);
  const background = estimatePaperBackground(data, width, height, {
    blockSize: options.blockSize,
    polarity,
  });
  const mask = buildInkMask(data, background, width, height, {
    polarity,
    dilate: options.dilate,
    lowThreshold: options.lowThreshold,
    highThreshold: options.highThreshold,
  });
  const random = createSeededRandom(options.seed ?? 20261123);

  // Residual pool from clearly ink-free pixels, bucketed per row band.
  const band = Math.max(4, Math.round(options.residualBand ?? 12));
  const bands = Math.ceil(height / band);
  const pools = Array.from({ length: bands }, () => []);
  for (let y = 0; y < height; y++) {
    const pool = pools[Math.floor(y / band)];
    for (let x = 0; x < width; x += 2) {
      const i = y * width + x;
      if (mask[i] > 0.02) continue;
      const p = i * 4;
      const o = i * 3;
      pool.push(
        data[p] - background[o],
        data[p + 1] - background[o + 1],
        data[p + 2] - background[o + 2],
      );
    }
  }

  let erased = 0;
  for (let y = 0; y < height; y++) {
    let pool = pools[Math.floor(y / band)];
    if (pool.length === 0) {
      pool = pools.find((candidate) => candidate.length > 0) ?? pool;
    }
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const alpha = mask[i];
      if (alpha <= 0) continue;
      erased++;
      const p = i * 4;
      const o = i * 3;
      let nr = 0;
      let ng = 0;
      let nb = 0;
      if (pool.length >= 3) {
        const pick = Math.floor(random() * (pool.length / 3)) * 3;
        nr = pool[pick];
        ng = pool[pick + 1];
        nb = pool[pick + 2];
      }
      const tr = background[o] + nr;
      const tg = background[o + 1] + ng;
      const tb = background[o + 2] + nb;
      data[p] = Math.round(data[p] * (1 - alpha) + tr * alpha);
      data[p + 1] = Math.round(data[p + 1] * (1 - alpha) + tg * alpha);
      data[p + 2] = Math.round(data[p + 2] * (1 - alpha) + tb * alpha);
    }
  }

  return { polarity, erasedPixels: erased, mask };
}

/**
 * Returns the horizontal ink extents of a region as [start, end] column runs,
 * merging runs separated by less than `maxGap` columns. Used to find where the
 * mana cost (name bar) and the expansion symbol (type bar) begin.
 */
export function findInkColumnRuns(mask, width, height, options = {}) {
  const minCoverage = options.minCoverage ?? 0.08;
  const maxGap = options.maxGap ?? 6;
  const columns = new Array(width).fill(false);
  for (let x = 0; x < width; x++) {
    let total = 0;
    for (let y = 0; y < height; y++) total += mask[y * width + x] > 0.5 ? 1 : 0;
    columns[x] = total / height >= minCoverage;
  }
  const runs = [];
  let start = -1;
  let lastInk = -1;
  for (let x = 0; x < width; x++) {
    if (!columns[x]) continue;
    if (start < 0) {
      start = x;
    } else if (x - lastInk > maxGap) {
      runs.push([start, lastInk]);
      start = x;
    }
    lastInk = x;
  }
  if (start >= 0) runs.push([start, lastInk]);
  return runs;
}

/**
 * Converts a mana token as written in rules text (`W`, `2/W`, `W/P`, `10`, `½`)
 * to the Scryfall SVG file stem (`W`, `2W`, `WP`, `10`, `HALF`).
 */
export function manaSymbolFileCode(token) {
  const clean = String(token || "")
    .trim()
    .toUpperCase()
    .replace(/[{}]/g, "");
  if (!clean) return null;
  if (clean === "½") return "HALF";
  if (clean === "∞") return "INFINITY";
  const compact = clean.replace(/\//g, "");
  if (!/^[A-Z0-9]{1,8}$/.test(compact)) return null;
  return compact;
}

const NBSP = " ";

/**
 * Applies French typography so line breaks never orphan punctuation: the space
 * before « : ; ! ? » and after « becomes non-breaking.
 */
export function applyFrenchNonBreakingSpaces(text) {
  return String(text || "")
    .replace(/[ \t  ]+([:;!?»])/g, `${NBSP}$1`)
    .replace(/«[ \t  ]+/g, `«${NBSP}`)
    .replace(/ /g, NBSP);
}

/** Splits rules text into paragraphs of styled runs: text, symbols, italic reminder text. */
export function tokenizeRulesText(text) {
  const paragraphs = [];
  for (const rawParagraph of applyFrenchNonBreakingSpaces(text).split(/\r?\n/)) {
    const paragraph = rawParagraph.trim();
    if (!paragraph) continue;
    const tokens = [];
    let italicDepth = 0;
    const regex = /(\{[^}]+\}|\(|\)|[^ \t{}()]+|[ \t]+)/g;
    let match;
    while ((match = regex.exec(paragraph)) !== null) {
      const value = match[0];
      if (value.startsWith("{")) {
        tokens.push({ kind: "symbol", value: value.slice(1, -1), italic: italicDepth > 0 });
      } else if (value === "(") {
        italicDepth++;
        tokens.push({ kind: "text", value, italic: true });
      } else if (value === ")") {
        tokens.push({ kind: "text", value, italic: true });
        italicDepth = Math.max(0, italicDepth - 1);
      } else if (/^[ \t]+$/.test(value)) {
        tokens.push({ kind: "space", value: " ", italic: italicDepth > 0 });
      } else {
        tokens.push({ kind: "text", value, italic: italicDepth > 0 });
      }
    }
    paragraphs.push(mergeGlueTokens(tokens));
  }
  return paragraphs;
}

/** Glues punctuation to the previous word and adjacent words so line breaks never orphan ":" or "," */
function mergeGlueTokens(tokens) {
  const merged = [];
  for (const token of tokens) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      token.kind === "text" &&
      previous.kind === "text" &&
      previous.italic === token.italic
    ) {
      merged[merged.length - 1] = { ...previous, value: previous.value + token.value };
      continue;
    }
    merged.push(token);
  }
  return merged;
}

/**
 * Lays out rules + flavor text inside a box, shrinking the font until it fits.
 *
 * `measure(text, { size, italic })` returns a width in the same unit as the box.
 * The result is fully positioned (x/y of every run) so the canvas layer only
 * paints, and tests can assert the layout without a browser.
 */
export function layoutRulesText({
  rulesText,
  flavorText = "",
  box,
  measure,
  maxSize = 32,
  minSize = 15,
  lineHeightRatio = 1.17,
  paragraphGapRatio = 0.42,
  symbolScale = 0.86,
  avoidRects = [],
  verticalCenter = true,
}) {
  const rules = tokenizeRulesText(rulesText);
  const flavor = applyFrenchNonBreakingSpaces(flavorText).trim();
  const flavorParagraphs = flavor
    ? flavor.split(/\r?\n/).map((line) => [{ kind: "text", value: line.trim(), italic: true }])
    : [];

  for (let size = maxSize; size >= minSize; size -= 0.5) {
    const placed = placeAtSize(size);
    if (placed) return placed;
  }
  return { ...attemptLayout(minSize, 0), offsetY: 0 };

  /**
   * Lays the text out at one size, vertically centred when it is short (as on
   * printed cards). Avoid rects are checked at the final, centred position.
   */
  function placeAtSize(size) {
    const top = attemptLayout(size, 0);
    if (!top.fits) return null;
    if (!verticalCenter) return { ...top, offsetY: 0 };
    let offset = Math.max(0, (box.h - top.height) / 2);
    for (let pass = 0; pass < 3; pass++) {
      const centred = attemptLayout(size, offset);
      if (centred.fits && centred.height + offset <= box.h + 0.01) {
        return { ...centred, offsetY: offset };
      }
      offset = Math.max(0, (box.h - centred.height) / 2) * (pass === 1 ? 0.5 : 1);
    }
    return { ...top, offsetY: 0 };
  }

  /**
   * Horizontal span available to a line whose top is `y` (box-relative, before
   * centring by `yOffset`). Rects on the left edge push the start right; others
   * (P/T box) pull the end left. Rect coordinates are absolute.
   */
  function lineSpanAt(y, lineHeight, yOffset) {
    let start = 0;
    let end = box.w;
    for (const rect of avoidRects) {
      const top = rect.y - box.y - yOffset;
      if (y + lineHeight > top && y < top + rect.h) {
        if (rect.x <= box.x + 1) start = Math.max(start, rect.x + rect.w - box.x + 6);
        else end = Math.min(end, rect.x - box.x - 6);
      }
    }
    if (end - start < box.w * 0.35) return { start: 0, end: box.w, blocked: true };
    return { start, end, blocked: false };
  }

  function attemptLayout(size, yOffset) {
    const lineHeight = size * lineHeightRatio;
    const symbolSize = size * symbolScale;
    const spaceWidth = measure(" ", { size, italic: false });
    const lines = [];
    let y = 0;

    let overflowsAvoid = false;
    const flowParagraph = (tokens, isFlavor) => {
      let current = [];
      let width = 0;
      let span = lineSpanAt(y, lineHeight, yOffset);
      const pushLine = () => {
        while (current.length && current[current.length - 1].kind === "space") current.pop();
        if (span.blocked) overflowsAvoid = true;
        lines.push({ y, x0: span.start, runs: current, isFlavor });
        y += lineHeight;
        current = [];
        width = 0;
        span = lineSpanAt(y, lineHeight, yOffset);
      };
      const runWidth = (token) =>
        token.kind === "symbol"
          ? symbolSize + size * 0.05
          : token.kind === "space"
            ? spaceWidth
            : measure(token.value, { size, italic: token.italic });
      // Lines only break at spaces: a symbol and the punctuation glued to it
      // ("{T} :", "{G}.") always travel together.
      for (const group of groupWords(splitFlavorWords(tokens, isFlavor))) {
        if (group.space) {
          if (current.length === 0) continue;
          const w = runWidth(group.space);
          current.push({ ...group.space, x: width, width: w });
          width += w;
          continue;
        }
        const widths = group.tokens.map(runWidth);
        const groupWidth = widths.reduce((sum, w) => sum + w, 0);
        if (width + groupWidth > span.end - span.start && current.length > 0) pushLine();
        group.tokens.forEach((token, index) => {
          current.push({ ...token, x: width, width: widths[index] });
          width += widths[index];
        });
      }
      if (current.length) pushLine();
    };

    rules.forEach((paragraph, index) => {
      if (index > 0) y += lineHeight * paragraphGapRatio;
      flowParagraph(paragraph, false);
    });

    let separatorY = null;
    if (flavorParagraphs.length) {
      if (lines.length) {
        y += lineHeight * 0.28;
        separatorY = y;
        y += lineHeight * 0.34;
      }
      for (const paragraph of flavorParagraphs) flowParagraph(paragraph, true);
    }

    const height = y;
    return {
      size,
      lineHeight,
      symbolSize,
      lines,
      separatorY,
      height,
      fits: height <= box.h && !overflowsAvoid,
    };
  }
}

/** Groups consecutive non-space tokens into unbreakable words, keeping spaces apart. */
function groupWords(tokens) {
  const groups = [];
  let word = null;
  for (const token of tokens) {
    if (token.kind === "space") {
      word = null;
      groups.push({ space: token });
      continue;
    }
    if (!word) {
      word = { tokens: [] };
      groups.push(word);
    }
    word.tokens.push(token);
  }
  return groups;
}

function splitFlavorWords(tokens, isFlavor) {
  if (!isFlavor) return tokens;
  const words = [];
  for (const token of tokens) {
    const parts = token.value.split(/([ \t]+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^[ \t]+$/.test(part)) words.push({ kind: "space", value: " ", italic: true });
      else words.push({ kind: "text", value: part, italic: true });
    }
  }
  return words;
}

/**
 * Picks the largest font size (down to `minSize`) at which a single line fits
 * `maxWidth`, then horizontally condenses it if it still overflows.
 */
export function fitSingleLine(text, maxWidth, measure, { maxSize, minSize }) {
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    const width = measure(text, { size });
    if (width <= maxWidth) return { size, scaleX: 1, width };
  }
  const width = measure(text, { size: minSize });
  return { size: minSize, scaleX: Math.max(0.6, maxWidth / width), width: maxWidth };
}

/**
 * Modal double-faced cards print a hint strip for the other face (its type and
 * a short line, e.g. "Terrain" / "{T} : Ajoutez {W}."). Scryfall appends that
 * hint as the last two lines of the printed text; this splits it back out.
 */
export function splitMdfcHint(rulesText) {
  const source = String(rulesText || "");
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 3) return { rulesText: source, hint: null };
  const type = lines[lines.length - 2];
  const text = lines[lines.length - 1];
  // The hint line is a mana cost ("{3}{W}") or a mana ability ("{T} : Ajoutez {B}.").
  if (type.length > 40 || /[{}.:]/.test(type) || text.length > 60 || !text.includes("{")) {
    return { rulesText: source, hint: null };
  }
  return { rulesText: lines.slice(0, -2).join("\n"), hint: { type, text } };
}

/**
 * Clamps a detected right-hand cluster start (mana cost or expansion symbol)
 * into the band where such a cluster can physically sit, so art showing
 * through translucent bars cannot swallow the whole bar.
 */
export function clampClusterStart(detected, width, { minWidth, maxWidth }) {
  const earliest = width - maxWidth;
  const latest = width - minWidth;
  return Math.round(Math.min(latest, Math.max(earliest, detected)));
}

/** Counts the mana symbols of a cost such as `{2}{U}{U}`. */
export function countManaSymbols(manaCost) {
  return (String(manaCost || "").match(/\{[^}]+\}/g) || []).length;
}

/** Horizontal frame edges (reference y) every M15 card shows: name bar, type bar, rules box. */
export const M15_LAYOUT_EDGES = Object.freeze([50, 100, 589, 638, 656]);
const M15_EDGE_MIN_RATIO = 2.5;

/**
 * Tells whether an arbitrary card render (e.g. a community MPC render) uses
 * the M15 text-box layout, by checking for strong horizontal edges exactly
 * where the M15 bars start and end. Extended/borderless templates move the
 * type line and fail the check, so their text is never overwritten blindly.
 */
export function scoreM15Layout(data, width, height) {
  const sy = height / M15_REFERENCE_HEIGHT;
  const sx = width / M15_REFERENCE_WIDTH;
  const x0 = Math.round(80 * sx);
  const x1 = Math.round(660 * sx);
  const step = Math.max(1, Math.round(2 * sx));
  const lum = (x, y) => {
    const p = (y * width + x) * 4;
    return 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  };
  const profile = new Float32Array(height);
  for (let y = 1; y < height - 1; y++) {
    let total = 0;
    let count = 0;
    for (let x = x0; x < x1; x += step) {
      total += Math.abs(lum(x, y + 1) - lum(x, y - 1));
      count++;
    }
    profile[y] = total / Math.max(1, count);
  }
  const sorted = Array.from(profile.subarray(1, height - 1)).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const window = Math.max(2, Math.round(4 * sy));
  const ratios = M15_LAYOUT_EDGES.map((edge) => {
    const center = Math.round(edge * sy);
    let peak = 0;
    for (let y = center - window; y <= center + window; y++) {
      if (y > 0 && y < height - 1 && profile[y] > peak) peak = profile[y];
    }
    return Math.round((peak / (median + 1)) * 10) / 10;
  });
  return { ratios, compatible: ratios.every((ratio) => ratio >= M15_EDGE_MIN_RATIO) };
}
