/**
 * Canvas layer of the "retexturage FR" engine: keeps a real HD scan, erases
 * its English text with {@link eraseInkInRegion} and typesets French text with
 * card-like fonts and Scryfall vector mana symbols, at 300 or 600 DPI.
 */
import {
  M15_GEOMETRY,
  M15_REFERENCE_HEIGHT,
  M15_REFERENCE_WIDTH,
  detectInkPolarity,
  eraseInkInRegion,
  estimatePaperBackground,
  buildInkMask,
  clampClusterStart,
  countManaSymbols,
  findInkColumnRuns,
  splitMdfcHint,
  fitSingleLine,
  layoutRulesText,
  manaSymbolFileCode,
  scaleRect,
} from "./proxy-retext-core.js";

/** Font stacks: user-supplied real card fonts first, then bundled open look-alikes. */
export const TITLE_FONT_STACK = '"DM Card Title", "Alegreya", Georgia, serif';
export const RULES_FONT_STACK = '"DM Card Rules", "Source Serif 4", Georgia, serif';
export const RULES_ITALIC_FONT_STACK =
  '"DM Card Rules Italic", "DM Card Rules", "Source Serif 4", Georgia, serif';

const USER_FONT_FACES = [
  { family: "DM Card Title", stem: "beleren-bold", local: ["Beleren Bold", "Beleren2016-Bold"] },
  { family: "DM Card Rules", stem: "mplantin", local: ["MPlantin", "Plantin MT Pro"] },
  {
    family: "DM Card Rules Italic",
    stem: "mplantin-italic",
    local: ["MPlantin-Italic", "MPlantin Italic"],
  },
];

let fontsReadyPromise = null;
const symbolImageCache = new Map();

/** Registers optional user fonts (data/fonts/ or locally installed) and waits for every face. */
export function ensureProxyFonts() {
  if (fontsReadyPromise) return fontsReadyPromise;
  fontsReadyPromise = (async () => {
    let files = [];
    try {
      const res = await fetch("/api/proxy-scans/fonts");
      if (res.ok) files = (await res.json()).files ?? [];
    } catch {
      files = [];
    }
    if (typeof FontFace === "function" && document.fonts) {
      for (const face of USER_FONT_FACES) {
        const sources = face.local.map((name) => `local("${name}")`);
        for (const ext of ["woff2", "woff", "otf", "ttf"]) {
          const file = `${face.stem}.${ext}`;
          if (files.includes(file)) sources.push(`url("/api/proxy-scans/fonts/${file}")`);
        }
        try {
          const fontFace = new FontFace(face.family, sources.join(", "));
          await fontFace.load();
          document.fonts.add(fontFace);
        } catch {
          // Font not installed nor supplied: the open fallback in the stack is used.
        }
      }
    }
    if (document.fonts?.load) {
      await Promise.allSettled([
        document.fonts.load(`700 32px ${TITLE_FONT_STACK}`),
        document.fonts.load(`450 30px ${RULES_FONT_STACK}`),
        document.fonts.load(`italic 450 30px ${RULES_ITALIC_FONT_STACK}`),
      ]);
    }
  })();
  return fontsReadyPromise;
}

/** Loads (once) the Scryfall SVG for a mana token, or resolves `null` when offline. */
export function loadManaSymbolImage(token) {
  const code = manaSymbolFileCode(token);
  if (!code) return Promise.resolve(null);
  if (symbolImageCache.has(code)) return symbolImageCache.get(code);
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `/api/proxy-scans/symbol/${code}.svg`;
  });
  symbolImageCache.set(code, promise);
  return promise;
}

function collectSymbolTokens(text) {
  const tokens = new Set();
  for (const match of String(text || "").matchAll(/\{([^}]+)\}/g)) tokens.add(match[1]);
  return [...tokens];
}

function hasPowerToughness(card) {
  return (
    card?.power !== undefined &&
    card?.power !== null &&
    card?.power !== "" &&
    card?.toughness !== undefined &&
    card?.toughness !== ""
  );
}

/** Finds the right-hand cluster (mana cost / expansion symbol) of a bar, in region pixels. */
function detectRightCluster(imageData, width, height, scale) {
  const polarity = detectInkPolarity(imageData.data, width, height);
  const background = estimatePaperBackground(imageData.data, width, height, { polarity });
  const mask = buildInkMask(imageData.data, background, width, height, { polarity, dilate: 0 });
  // Ignore the bar's own top/bottom outline rows.
  const top = Math.round(height * 0.12);
  const bottom = Math.round(height * 0.88);
  const inner = mask.subarray(top * width, bottom * width);
  const runs = findInkColumnRuns(inner, width, bottom - top, {
    minCoverage: 0.08,
    maxGap: Math.round(10 * scale),
  });
  const last = runs[runs.length - 1];
  if (last && last[1] >= width * 0.8 && last[1] - last[0] >= 16 * scale) {
    return { start: last[0], polarity };
  }
  return { start: width, polarity };
}

function eraseRect(ctx, rect) {
  if (rect.w < 4 || rect.h < 4) return "dark";
  const imageData = ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const result = eraseInkInRegion(imageData.data, rect.w, rect.h, {
    seed: (rect.x * 73856093) ^ (rect.y * 19349663),
  });
  ctx.putImageData(imageData, rect.x, rect.y);
  return result.polarity;
}

/**
 * Erases the English name, type line and rules text of a native-resolution
 * scan in place. Returns the measured layout (in reference 745x1040 units)
 * that the typesetting step needs.
 */
/** Mean luminance of a rectangle, used to spot the dark MDFC hint strip. */
function meanLuminance(ctx, rect) {
  const { data } = ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  let total = 0;
  for (let p = 0; p < data.length; p += 4) {
    total += 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  return total / (data.length / 4);
}

/** True when the scan shows a modal DFC hint strip under a light rules box. */
export function detectMdfcStrip(ctx, width, height) {
  const strip = scaleRect(M15_GEOMETRY.mdfcStripText, width, height);
  const paper = scaleRect({ x: 70, y: 880, w: 240, h: 30 }, width, height);
  return meanLuminance(ctx, paper) - meanLuminance(ctx, strip) > 55;
}

export function eraseScanText(ctx, width, height, { hasPt, hasFaceIcon, manaSymbolCount }) {
  const s = width / M15_REFERENCE_WIDTH;
  const toRef = (px) => px / s;

  const name = scaleRect(M15_GEOMETRY.nameBar, width, height);
  const nameData = ctx.getImageData(name.x, name.y, name.w, name.h);
  const nameCluster = detectRightCluster(nameData, name.w, name.h, s);
  let manaStart = nameCluster.start;
  if (Number.isInteger(manaSymbolCount)) {
    manaStart =
      manaSymbolCount === 0
        ? name.w - Math.round(8 * s)
        : clampClusterStart(nameCluster.start, name.w, {
            minWidth: Math.round((manaSymbolCount * 33 + 6) * s),
            maxWidth: Math.round((manaSymbolCount * 44 + 22) * s),
          });
  }
  const nameStart = Math.round(
    ((hasFaceIcon ? M15_GEOMETRY.dfcNameTextX - 10 : M15_GEOMETRY.nameTextX - 6) -
      M15_GEOMETRY.nameBar.x) *
      s,
  );
  const nameEnd = Math.max(nameStart, manaStart - Math.round(5 * s));
  const namePolarity = eraseRect(ctx, {
    x: name.x + nameStart,
    y: name.y,
    w: nameEnd - nameStart,
    h: name.h,
  });

  const type = scaleRect(M15_GEOMETRY.typeBar, width, height);
  const typeData = ctx.getImageData(type.x, type.y, type.w, type.h);
  const typeCluster = detectRightCluster(typeData, type.w, type.h, s);
  const typeStart = Math.round((M15_GEOMETRY.typeTextX - 6 - M15_GEOMETRY.typeBar.x) * s);
  const setSymbolStart = clampClusterStart(typeCluster.start, type.w, {
    minWidth: Math.round(30 * s),
    maxWidth: Math.round(92 * s),
  });
  const typeEnd = Math.max(typeStart, setSymbolStart - Math.round(5 * s));
  const typePolarity = eraseRect(ctx, {
    x: type.x + typeStart,
    y: type.y,
    w: typeEnd - typeStart,
    h: type.h,
  });

  const rules = scaleRect(M15_GEOMETRY.rulesBox, width, height);
  const pt = scaleRect(M15_GEOMETRY.ptBox, width, height);
  // The holo-stamp housing must survive untouched: snapshot it, restore after erasing.
  const notch = scaleRect(M15_GEOMETRY.holoNotch, width, height);
  const notchPixels = ctx.getImageData(notch.x, notch.y, notch.w, notch.h);
  const hasMdfcStrip = detectMdfcStrip(ctx, width, height);
  const strip = scaleRect(M15_GEOMETRY.mdfcStrip, width, height);
  const stripPixels = hasMdfcStrip ? ctx.getImageData(strip.x, strip.y, strip.w, strip.h) : null;
  let rulesPolarity;
  if (hasPt) {
    rulesPolarity = eraseRect(ctx, { x: rules.x, y: rules.y, w: rules.w, h: pt.y - rules.y - 2 });
    eraseRect(ctx, {
      x: rules.x,
      y: pt.y - 2,
      w: pt.x - rules.x - Math.round(4 * s),
      h: rules.y + rules.h - pt.y + 2,
    });
  } else {
    rulesPolarity = eraseRect(ctx, rules);
  }
  ctx.putImageData(notchPixels, notch.x, notch.y);
  let stripPolarity = "light";
  if (stripPixels) {
    ctx.putImageData(stripPixels, strip.x, strip.y);
    stripPolarity = eraseRect(ctx, scaleRect(M15_GEOMETRY.mdfcStripText, width, height));
  }

  return {
    hasMdfcStrip,
    stripPolarity,
    nameTextX: hasFaceIcon ? M15_GEOMETRY.dfcNameTextX : M15_GEOMETRY.nameTextX,
    nameMaxRight: toRef(name.x + nameEnd) - 4,
    namePolarity,
    typeMaxRight: toRef(type.x + typeEnd) - 4,
    typePolarity,
    rulesPolarity,
  };
}

function inkColor(polarity) {
  return polarity === "light" ? "#f8f6f0" : "#0b0b0c";
}

function drawSingleLine(ctx, text, { x, baseline, maxRight, maxSize, minSize, polarity }) {
  const maxWidth = Math.max(40, maxRight - x);
  const measure = (value, { size }) => {
    ctx.font = `700 ${size}px ${TITLE_FONT_STACK}`;
    return ctx.measureText(value).width;
  };
  const fit = fitSingleLine(text, maxWidth, measure, { maxSize, minSize });
  ctx.save();
  ctx.font = `700 ${fit.size}px ${TITLE_FONT_STACK}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = inkColor(polarity);
  if (polarity === "light") {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 3;
  }
  ctx.translate(x, baseline);
  ctx.scale(fit.scaleX, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawSymbol(ctx, symbolImages, token, x, centerY, size) {
  const img = symbolImages.get(token);
  if (img) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = size * 0.04;
    ctx.shadowOffsetX = -size * 0.03;
    ctx.shadowOffsetY = size * 0.05;
    ctx.drawImage(img, x, centerY - size / 2, size, size);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, centerY, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#cac5c0";
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.font = `700 ${size * 0.7}px ${RULES_FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(token).toUpperCase(), x + size / 2, centerY + size * 0.04);
  ctx.restore();
}

function rulesFont(size, italic) {
  return italic
    ? `italic 450 ${size}px ${RULES_ITALIC_FONT_STACK}`
    : `450 ${size}px ${RULES_FONT_STACK}`;
}

/** Paints a line of runs (text + symbols) starting at `x`, baseline `baseline`. */
function paintRuns(ctx, runs, { x, baseline, size, symbolSize, symbolImages }) {
  for (const run of runs) {
    const runX = x + run.x;
    if (run.kind === "symbol") {
      drawSymbol(
        ctx,
        symbolImages,
        run.value,
        runX + size * 0.02,
        baseline - size * 0.33,
        symbolSize,
      );
      continue;
    }
    if (run.kind === "space") continue;
    ctx.font = rulesFont(size, run.italic);
    ctx.fillText(run.value, runX, baseline);
  }
}

function drawRulesBlock(
  ctx,
  { rulesText, flavorText, hasPt, hasMdfcStrip, polarity, symbolImages },
) {
  const box = M15_GEOMETRY.rulesBox;
  const padX = M15_GEOMETRY.rulesPadX;
  const padY = M15_GEOMETRY.rulesPadY;
  const inner = { x: box.x + padX, y: box.y + padY, w: box.w - padX * 2, h: box.h - padY * 2 };
  const avoidRects = [];
  if (hasPt) {
    const pt = M15_GEOMETRY.ptBox;
    avoidRects.push({ x: pt.x - 2, y: pt.y - 2, w: pt.w, h: pt.h });
  }
  if (hasMdfcStrip) {
    // The hint strip eats the bottom-left of the box: keep the text above it.
    inner.h = M15_GEOMETRY.mdfcStrip.y - 6 - inner.y;
  }

  const measure = (value, { size, italic }) => {
    ctx.font = rulesFont(size, italic);
    return ctx.measureText(value).width;
  };
  const layout = layoutRulesText({
    rulesText,
    flavorText,
    box: inner,
    measure,
    maxSize: 31,
    minSize: 15,
    avoidRects,
  });

  const color = inkColor(polarity);
  const offsetY = inner.y + layout.offsetY;
  ctx.save();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = color;
  if (polarity === "light") {
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 2;
  }
  for (const line of layout.lines) {
    paintRuns(ctx, line.runs, {
      x: inner.x + (line.x0 ?? 0),
      baseline: offsetY + line.y + layout.lineHeight * 0.78,
      size: layout.size,
      symbolSize: layout.symbolSize,
      symbolImages,
    });
  }
  if (layout.separatorY !== null) {
    const y = offsetY + layout.separatorY;
    const gradient = ctx.createLinearGradient(inner.x, 0, inner.x + inner.w, 0);
    const tint = polarity === "light" ? "248,246,240" : "20,18,16";
    gradient.addColorStop(0, `rgba(${tint},0)`);
    gradient.addColorStop(0.15, `rgba(${tint},0.55)`);
    gradient.addColorStop(0.85, `rgba(${tint},0.55)`);
    gradient.addColorStop(1, `rgba(${tint},0)`);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = gradient;
    ctx.fillRect(inner.x + inner.w * 0.04, y - 1, inner.w * 0.92, 2);
  }
  ctx.restore();
  return layout;
}

/** Writes the other face's French type (left) and short text (right) into the MDFC strip. */
function drawMdfcHint(ctx, hint, { polarity, symbolImages }) {
  const area = M15_GEOMETRY.mdfcStripText;
  const baseline = area.y + area.h * 0.74;
  ctx.save();
  ctx.fillStyle = inkColor(polarity);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const typeSize = 22;
  ctx.font = `700 ${typeSize}px ${TITLE_FONT_STACK}`;
  const typeWidth = Math.min(ctx.measureText(hint.type).width, area.w * 0.48);
  ctx.fillText(hint.type, area.x + 4, baseline, area.w * 0.48);

  const measure = (value, { size, italic }) => {
    ctx.font = rulesFont(size, italic);
    return ctx.measureText(value).width;
  };
  const available = area.w - typeWidth - 16;
  const layout = layoutRulesText({
    rulesText: hint.text,
    box: { x: 0, y: 0, w: available, h: area.h },
    measure,
    maxSize: 21,
    minSize: 12,
    lineHeightRatio: 1,
    verticalCenter: false,
  });
  const line = layout.lines[0];
  if (line) {
    const last = line.runs[line.runs.length - 1];
    const lineWidth = last ? last.x + last.width : 0;
    paintRuns(ctx, line.runs, {
      x: area.x + area.w - lineWidth,
      baseline,
      size: layout.size,
      symbolSize: layout.symbolSize,
      symbolImages,
    });
  }
  ctx.restore();
}

/**
 * Renders a retextured card: real scan + French text.
 *
 * @param {object} params
 * @param {HTMLImageElement} params.scanImage full card scan (Scryfall PNG)
 * @param {object} params.card effective face (name, manaCost, power/toughness...)
 * @param {object} params.french French name/type/rules/flavor
 * @param {boolean} [params.hasFaceIcon] transform/MDFC icon left of the name
 * @param {number} [params.outputScale] 1 = 745x1040 (300 DPI), 2 = 1490x2080 (600 DPI)
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderRetextedCanvas({
  scanImage,
  card,
  french,
  hasFaceIcon = false,
  outputScale = 2,
}) {
  await ensureProxyFonts();
  const width = scanImage.naturalWidth || scanImage.width || M15_REFERENCE_WIDTH;
  const height = scanImage.naturalHeight || scanImage.height || M15_REFERENCE_HEIGHT;

  const native = document.createElement("canvas");
  native.width = width;
  native.height = height;
  const nctx = native.getContext("2d", { willReadFrequently: true });
  nctx.drawImage(scanImage, 0, 0, width, height);

  const hasPt = hasPowerToughness(card);
  const measured = eraseScanText(nctx, width, height, {
    hasPt,
    hasFaceIcon,
    manaSymbolCount:
      typeof card?.manaCost === "string" ? countManaSymbols(card.manaCost) : undefined,
  });

  let rulesText = french?.rulesText ?? card?.oracleText ?? "";
  let hint = null;
  if (measured.hasMdfcStrip) {
    const split = splitMdfcHint(rulesText);
    rulesText = split.rulesText;
    hint = split.hint;
  }
  const flavorText = french?.flavorText ?? "";
  const tokens = collectSymbolTokens(`${rulesText}\n${hint?.text ?? ""}`);
  const symbolImages = new Map();
  await Promise.all(
    tokens.map(async (token) => symbolImages.set(token, await loadManaSymbolImage(token))),
  );

  const outW = Math.round(M15_REFERENCE_WIDTH * outputScale);
  const outH = Math.round(M15_REFERENCE_HEIGHT * outputScale);
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(native, 0, 0, outW, outH);

  ctx.save();
  ctx.scale(outW / M15_REFERENCE_WIDTH, outH / M15_REFERENCE_HEIGHT);
  const nameBar = M15_GEOMETRY.nameBar;
  drawSingleLine(ctx, french?.name || card?.name || "", {
    x: measured.nameTextX,
    baseline: nameBar.y + 37,
    maxRight: measured.nameMaxRight,
    maxSize: 34,
    minSize: 22,
    polarity: measured.namePolarity,
  });
  const typeBar = M15_GEOMETRY.typeBar;
  drawSingleLine(ctx, french?.typeLine || card?.typeLine || "", {
    x: M15_GEOMETRY.typeTextX,
    baseline: typeBar.y + 35,
    maxRight: measured.typeMaxRight,
    maxSize: 29,
    minSize: 18,
    polarity: measured.typePolarity,
  });
  drawRulesBlock(ctx, {
    rulesText,
    flavorText,
    hasPt,
    hasMdfcStrip: measured.hasMdfcStrip,
    polarity: measured.rulesPolarity,
    symbolImages,
  });
  if (hint) drawMdfcHint(ctx, hint, { polarity: measured.stripPolarity, symbolImages });
  ctx.restore();
  return out;
}
