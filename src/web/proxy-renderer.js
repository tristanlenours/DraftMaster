/**
 * High-resolution (745x1040, 300 DPI @ 63x88mm) MTG Proxy Renderer.
 *
 * Hybrid FR workflow:
 * - Official French high-res scan -> served directly via same-origin image proxy.
 * - English-only scan / alt-art / custom French text -> composited onto an HD 745x1040 Canvas
 *   with crisp French title, type line, rules text, vector mana symbols, and P/T or Loyalty box.
 */

import { computeCardCrop, toFrenchText, toRenderCard } from "./proxy-custom-cards.js";
import { cropMpcRender, isM15CompatibleRender, isMpcVariant } from "./proxy-mpc.js";
import { canRetextVariant } from "./proxy-retext-core.js";
import { renderRetextedCanvas } from "./proxy-retext.js";

export const PROXY_CANVAS_WIDTH = 745;
export const PROXY_CANVAS_HEIGHT = 1040;

/**
 * French rendering engines:
 * - "retext": keeps the real HD scan and replaces its English text in place
 *   (M15 frames); other layouts fall back to "frame".
 * - "frame": synthesized DraftMaster frame around the artwork.
 */
export const PROXY_FR_ENGINES = Object.freeze(["retext", "frame"]);

/** Tells which engine will actually draw a card for the requested preference. */
export function resolveFrenchEngine(variant, card, preferredEngine = "retext") {
  if (preferredEngine === "retext" && canRetextVariant(variant, card)) return "retext";
  return "frame";
}

const FRAME_PALETTES = {
  W: {
    frameTop: "#f3eee2",
    frameBottom: "#ded5be",
    trim: "#c9b98f",
    barBg: "#f9f6ee",
    boxBg: "#fbf9f2",
    ink: "#151412",
    accent: "#b59b5c",
  },
  U: {
    frameTop: "#27669b",
    frameBottom: "#17426b",
    trim: "#6fb3e0",
    barBg: "#dcebf6",
    boxBg: "#eef5fb",
    ink: "#0f1821",
    accent: "#3b8bc4",
  },
  B: {
    frameTop: "#38353b",
    frameBottom: "#1f1d22",
    trim: "#726878",
    barBg: "#dad6de",
    boxBg: "#ece9ef",
    ink: "#131116",
    accent: "#6d5d7a",
  },
  R: {
    frameTop: "#b8442a",
    frameBottom: "#7f2716",
    trim: "#e38c6d",
    barBg: "#f6dfd7",
    boxBg: "#fbf0ec",
    ink: "#1c0f0c",
    accent: "#d45a3a",
  },
  G: {
    frameTop: "#276b43",
    frameBottom: "#17452a",
    trim: "#6eb587",
    barBg: "#dceee2",
    boxBg: "#eef7f1",
    ink: "#0f1c14",
    accent: "#368a56",
  },
  MULTI: {
    frameTop: "#caa24d",
    frameBottom: "#977127",
    trim: "#ecd087",
    barBg: "#f7edd3",
    boxBg: "#fbf6e8",
    ink: "#1a1408",
    accent: "#d1a646",
  },
  ARTIFACT: {
    frameTop: "#9aa8b4",
    frameBottom: "#677582",
    trim: "#c7d3dd",
    barBg: "#e6ecf0",
    boxBg: "#f2f5f7",
    ink: "#13171b",
    accent: "#8394a3",
  },
  LAND: {
    frameTop: "#9b876a",
    frameBottom: "#6e5d45",
    trim: "#ccb99c",
    barBg: "#efe8dc",
    boxBg: "#f7f3ec",
    ink: "#19150f",
    accent: "#a38d6d",
  },
};

const MANA_COLORS = {
  W: { bg: "#f8f4dc", border: "#b8a66e", text: "#1f1c14" },
  U: { bg: "#9fd4f5", border: "#2a76ad", text: "#09253a" },
  B: { bg: "#aba3b0", border: "#3d3542", text: "#141017" },
  R: { bg: "#f2a488", border: "#b83f21", text: "#2e0d05" },
  G: { bg: "#99d4ad", border: "#257042", text: "#092615" },
  C: { bg: "#d2d7dc", border: "#66717d", text: "#1a1f24" },
  T: { bg: "#d4d0c8", border: "#575249", text: "#1a1814" },
};

const imageElementCache = new Map();
const renderedDataUrlCache = new Map();

export function toProxiedImageUrl(remoteOrLocalUrl) {
  if (!remoteOrLocalUrl) return "";
  if (
    remoteOrLocalUrl.startsWith("/") ||
    remoteOrLocalUrl.startsWith("data:") ||
    remoteOrLocalUrl.startsWith("blob:")
  ) {
    return remoteOrLocalUrl;
  }
  return `/api/proxy-scans/image?url=${encodeURIComponent(remoteOrLocalUrl)}`;
}

export function shouldUseFrenchCanvasRender(variant, french, renderMode = "hybrid") {
  if (!variant) return false;
  if (renderMode === "raw") return false;
  if (renderMode === "force_fr") return true;
  if (french?.source === "custom") return true;
  return !variant.isOfficialFrenchScan;
}

export function isFullArtStyleVariant(variant) {
  if (!variant) return false;
  const effects = Array.isArray(variant.frameEffects) ? variant.frameEffects : [];
  return Boolean(
    variant.borderless ||
    variant.fullArt ||
    variant.setCode === "sld" ||
    variant.setCode === "slc" ||
    variant.setCode === "spg" ||
    effects.includes("borderless") ||
    effects.includes("showcase") ||
    effects.includes("fullart") ||
    effects.includes("extendedart"),
  );
}

function loadCanvasImage(url) {
  if (!url) return Promise.resolve(null);
  if (imageElementCache.has(url)) {
    return imageElementCache.get(url);
  }
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  imageElementCache.set(url, promise);
  return promise;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawImageCover(ctx, img, dx, dy, dw, dh, focalY = 0.5) {
  // Works for <img> (naturalWidth) and canvas/ImageBitmap sources (width).
  const imgWidth = img?.naturalWidth || img?.width || 0;
  const imgHeight = img?.naturalHeight || img?.height || 0;
  if (!imgWidth || !imgHeight) return;
  const srcRatio = imgWidth / imgHeight;
  const dstRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = imgWidth;
  let sh = imgHeight;

  if (srcRatio > dstRatio) {
    sw = imgHeight * dstRatio;
    sx = (imgWidth - sw) / 2;
  } else {
    sh = imgWidth / dstRatio;
    sy = (imgHeight - sh) * focalY;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function parseManaTokens(manaCost) {
  if (!manaCost) return [];
  const matches = String(manaCost).match(/\{[^}]+\}/g);
  return matches ? matches.map((token) => token.slice(1, -1).toUpperCase()) : [];
}

function drawManaSymbol(ctx, symbol, cx, cy, radius) {
  const clean = String(symbol || "").toUpperCase();
  const isHybrid = clean.includes("/");
  const [firstPart = clean, secondPart = ""] = clean.split("/");
  const primarySpec = MANA_COLORS[firstPart] || MANA_COLORS.C;
  const secondarySpec = secondPart ? MANA_COLORS[secondPart] || MANA_COLORS.C : null;

  ctx.save();
  // Subtle drop shadow for print legibility
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = -1;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = primarySpec.bg;
  ctx.fill();

  if (isHybrid && secondarySpec) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 4, (3 * Math.PI) / 4);
    ctx.closePath();
    ctx.fillStyle = secondarySpec.bg;
    ctx.fill();
    ctx.restore();
  }

  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1.5, radius * 0.12);
  ctx.strokeStyle = primarySpec.border;
  ctx.stroke();

  // Inner symbol glyph
  ctx.fillStyle = primarySpec.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (clean === "T") {
    // Crisp vector Tap arrow
    ctx.strokeStyle = primarySpec.text;
    ctx.lineWidth = Math.max(2, radius * 0.16);
    ctx.beginPath();
    ctx.arc(cx, cy + radius * 0.05, radius * 0.48, -Math.PI * 0.85, Math.PI * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + radius * 0.56, cy + radius * 0.12);
    ctx.lineTo(cx + radius * 0.18, cy + radius * 0.25);
    ctx.lineTo(cx + radius * 0.34, cy - radius * 0.14);
    ctx.closePath();
    ctx.fill();
  } else if (clean === "C") {
    // Colorless diamond
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius * 0.58);
    ctx.lineTo(cx + radius * 0.48, cy);
    ctx.lineTo(cx, cy + radius * 0.58);
    ctx.lineTo(cx - radius * 0.48, cy);
    ctx.closePath();
    ctx.fill();
  } else {
    const label = isHybrid ? clean : clean;
    const fontSize =
      label.length >= 3 ? radius * 0.92 : label.length === 2 ? radius * 1.05 : radius * 1.28;
    ctx.font = `800 ${Math.round(fontSize)}px Inter, "Segoe UI", Arial, sans-serif`;
    ctx.fillText(label, cx, cy + 1);
  }
  ctx.restore();
}

function getCardPalette(card) {
  if (card.isLand) return FRAME_PALETTES.LAND;
  const colors = Array.isArray(card.colors) ? card.colors : [];
  if (colors.length === 0) {
    return card.types?.includes("Artifact") ? FRAME_PALETTES.ARTIFACT : FRAME_PALETTES.ARTIFACT;
  }
  if (colors.length === 1) {
    return FRAME_PALETTES[colors[0]] || FRAME_PALETTES.ARTIFACT;
  }
  return FRAME_PALETTES.MULTI;
}

function tokenizeRulesParagraph(paragraph) {
  const tokens = [];
  const regex = /(\{[^}]+\}|\S+|\s+)/g;
  let match;
  while ((match = regex.exec(paragraph)) !== null) {
    const text = match[0];
    if (text.startsWith("{") && text.endsWith("}")) {
      tokens.push({ kind: "symbol", value: text.slice(1, -1) });
    } else {
      tokens.push({ kind: "text", value: text });
    }
  }
  return tokens;
}

function layoutRichLines(ctx, text, maxWidth, fontSize) {
  const paragraphs = String(text || "").split(/\r?\n/);
  const lines = [];
  const symbolWidth = fontSize * 1.08;

  for (let pIndex = 0; pIndex < paragraphs.length; pIndex++) {
    const para = paragraphs[pIndex].trim();
    if (!para) {
      if (pIndex > 0) lines.push({ tokens: [], isSpacer: true });
      continue;
    }
    const tokens = tokenizeRulesParagraph(para);
    let currentLine = [];
    let currentWidth = 0;

    for (const token of tokens) {
      const tokenWidth = token.kind === "symbol" ? symbolWidth : ctx.measureText(token.value).width;

      if (token.kind === "text" && /^\s+$/.test(token.value) && currentLine.length === 0) {
        continue;
      }

      if (currentWidth + tokenWidth > maxWidth && currentLine.length > 0) {
        lines.push({ tokens: currentLine, isSpacer: false });
        currentLine = [];
        currentWidth = 0;
        if (token.kind === "text" && /^\s+$/.test(token.value)) continue;
      }

      currentLine.push({ ...token, width: tokenWidth });
      currentWidth += tokenWidth;
    }

    if (currentLine.length > 0) {
      lines.push({ tokens: currentLine, isSpacer: false });
    }
    if (pIndex < paragraphs.length - 1) {
      lines.push({ tokens: [], isSpacer: true });
    }
  }

  return lines;
}

function drawFittedRulesText(ctx, rulesText, flavorText, box, inkColor) {
  const cleanRules = String(rulesText || "").trim();
  const cleanFlavor = String(flavorText || "").trim();
  const maxWidth = box.w - box.padX * 2;
  const maxHeight = box.h - box.padY * 2;

  let chosenFontSize = 27;
  let chosenLines = [];
  let chosenFlavorLines = [];
  let lineHeight = 33;

  for (let fontSize = 28; fontSize >= 15; fontSize -= 1) {
    ctx.font = `500 ${fontSize}px Georgia, "Times New Roman", serif`;
    lineHeight = Math.round(fontSize * 1.24);
    const rulesLines = layoutRichLines(ctx, cleanRules, maxWidth, fontSize);

    let flavorLines = [];
    if (cleanFlavor) {
      ctx.font = `italic ${Math.max(13, fontSize - 3)}px Georgia, "Times New Roman", serif`;
      flavorLines = layoutRichLines(ctx, cleanFlavor, maxWidth, Math.max(13, fontSize - 3));
    }

    const totalLinesHeight =
      rulesLines.reduce(
        (acc, line) => acc + (line.isSpacer ? Math.round(lineHeight * 0.45) : lineHeight),
        0,
      ) +
      (flavorLines.length > 0
        ? Math.round(lineHeight * 0.65) +
          flavorLines.reduce(
            (acc, line) =>
              acc + (line.isSpacer ? Math.round(lineHeight * 0.35) : Math.round(lineHeight * 0.92)),
            0,
          )
        : 0);

    chosenFontSize = fontSize;
    chosenLines = rulesLines;
    chosenFlavorLines = flavorLines;

    if (totalLinesHeight <= maxHeight) {
      break;
    }
  }

  const totalRenderedHeight =
    chosenLines.reduce(
      (acc, line) => acc + (line.isSpacer ? Math.round(lineHeight * 0.45) : lineHeight),
      0,
    ) +
    (chosenFlavorLines.length > 0
      ? Math.round(lineHeight * 0.65) +
        chosenFlavorLines.reduce(
          (acc, line) =>
            acc + (line.isSpacer ? Math.round(lineHeight * 0.35) : Math.round(lineHeight * 0.92)),
          0,
        )
      : 0);

  let y = box.y + box.padY + Math.max(0, (maxHeight - totalRenderedHeight) / 2);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.font = `500 ${chosenFontSize}px Georgia, "Times New Roman", serif`;
  for (const line of chosenLines) {
    if (line.isSpacer) {
      y += Math.round(lineHeight * 0.45);
      continue;
    }
    let x = box.x + box.padX;
    const cy = y + lineHeight / 2;
    for (const token of line.tokens) {
      if (token.kind === "symbol") {
        drawManaSymbol(ctx, token.value, x + chosenFontSize * 0.52, cy, chosenFontSize * 0.46);
        x += token.width;
      } else {
        ctx.fillStyle = inkColor;
        ctx.fillText(token.value, x, cy);
        x += token.width;
      }
    }
    y += lineHeight;
    if (y > box.y + box.h - box.padY) break;
  }

  if (chosenFlavorLines.length > 0 && y + 18 < box.y + box.h - box.padY) {
    y += Math.round(lineHeight * 0.25);
    ctx.strokeStyle = "rgba(120, 110, 95, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(box.x + box.padX + 20, y);
    ctx.lineTo(box.x + box.w - box.padX - 20, y);
    ctx.stroke();
    y += Math.round(lineHeight * 0.35);

    const flavorFont = Math.max(13, chosenFontSize - 3);
    const flavorLineHeight = Math.round(lineHeight * 0.92);
    ctx.font = `italic ${flavorFont}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = inkColor;
    ctx.globalAlpha = 0.84;

    for (const line of chosenFlavorLines) {
      if (line.isSpacer) {
        y += Math.round(flavorLineHeight * 0.35);
        continue;
      }
      let x = box.x + box.padX;
      const cy = y + flavorLineHeight / 2;
      for (const token of line.tokens) {
        ctx.fillText(token.value, x, cy);
        x += token.width;
      }
      y += flavorLineHeight;
      if (y > box.y + box.h - box.padY) break;
    }
    ctx.globalAlpha = 1;
  }
}

function drawFittedSingleLineText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  startSize,
  minSize,
  fontWeight,
  fontFamily,
  color,
) {
  let size = startSize;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  while (size >= minSize) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  ctx.fillText(text, x, y, maxWidth);
}

function drawPtOrLoyaltyBadge(ctx, card, palette, isDarkOverlay) {
  const hasPt =
    card.power !== undefined &&
    card.toughness !== undefined &&
    card.power !== "" &&
    card.toughness !== "";
  const hasLoyalty = card.loyalty !== undefined && card.loyalty !== "";
  if (!hasPt && !hasLoyalty) return;

  const badgeW = 114;
  const badgeH = 54;
  const badgeX = PROXY_CANVAS_WIDTH - 48 - badgeW;
  const badgeY = PROXY_CANVAS_HEIGHT - 64 - badgeH;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, hasLoyalty ? 16 : 12);
  ctx.fillStyle = hasLoyalty ? "#181a20" : isDarkOverlay ? "rgba(22, 24, 30, 0.9)" : palette.barBg;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = hasLoyalty ? "#d4af37" : palette.trim;
  ctx.stroke();

  ctx.fillStyle = hasLoyalty || isDarkOverlay ? "#f8fafc" : palette.ink;
  ctx.font = `800 32px Cinzel, Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const valueText = hasPt ? `${card.power}/${card.toughness}` : String(card.loyalty);
  ctx.fillText(valueText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
  ctx.restore();
}

function drawCollectorFooter(ctx, variant, isFullArt) {
  const y = PROXY_CANVAS_HEIGHT - 28;
  ctx.save();
  ctx.fillStyle = isFullArt ? "rgba(241, 245, 249, 0.9)" : "#cbd5e1";
  ctx.font = `600 15px Inter, "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const artistText = `Illus. ${variant?.artist || "Artiste MTG"}`;
  ctx.fillText(artistText, 44, y);

  ctx.textAlign = "right";
  const setLabel = `${String(variant?.setCode || "MTG").toUpperCase()} • PROXY FR • DRAFTMASTER`;
  ctx.fillText(setLabel, PROXY_CANVAS_WIDTH - 44, y);
  ctx.restore();
}

function drawClassicFramedProxy(ctx, card, variant, french, artImage, fullScanImage) {
  const W = PROXY_CANVAS_WIDTH;
  const H = PROXY_CANVAS_HEIGHT;
  const palette = getCardPalette(card);
  const colors = Array.isArray(card.colors) ? card.colors : [];

  // 1. Black outer MTG border
  ctx.fillStyle = "#0b0c0e";
  ctx.fillRect(0, 0, W, H);

  // 2. Inner colored card frame (with 2-color horizontal split when applicable)
  const frameX = 28;
  const frameY = 28;
  const frameW = W - 56;
  const frameH = H - 72;

  ctx.save();
  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 24);
  ctx.clip();

  if (
    !card.isLand &&
    colors.length === 2 &&
    FRAME_PALETTES[colors[0]] &&
    FRAME_PALETTES[colors[1]]
  ) {
    const leftP = FRAME_PALETTES[colors[0]];
    const rightP = FRAME_PALETTES[colors[1]];
    const splitGrad = ctx.createLinearGradient(frameX, 0, frameX + frameW, 0);
    splitGrad.addColorStop(0, leftP.frameTop);
    splitGrad.addColorStop(0.42, leftP.frameBottom);
    splitGrad.addColorStop(0.58, rightP.frameBottom);
    splitGrad.addColorStop(1, rightP.frameTop);
    ctx.fillStyle = splitGrad;
  } else {
    const grad = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
    grad.addColorStop(0, palette.frameTop);
    grad.addColorStop(1, palette.frameBottom);
    ctx.fillStyle = grad;
  }
  ctx.fillRect(frameX, frameY, frameW, frameH);

  // Subtle metallic highlight border inside frame
  ctx.lineWidth = 4;
  ctx.strokeStyle = palette.trim;
  drawRoundedRect(ctx, frameX + 2, frameY + 2, frameW - 4, frameH - 4, 22);
  ctx.stroke();
  ctx.restore();

  // 3. Title Bar (French Name + Mana Cost)
  const barX = 46;
  const barY = 48;
  const barW = W - 92;
  const barH = 62;
  drawRoundedRect(ctx, barX, barY, barW, barH, 16);
  ctx.fillStyle = palette.barBg;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = palette.trim;
  ctx.stroke();

  const manaTokens = parseManaTokens(card.manaCost);
  const manaRadius = 17;
  const manaSpacing = 38;
  const manaBlockWidth = manaTokens.length > 0 ? manaTokens.length * manaSpacing + 10 : 0;
  let manaX = barX + barW - 14 - manaRadius;
  for (let i = manaTokens.length - 1; i >= 0; i--) {
    drawManaSymbol(ctx, manaTokens[i], manaX, barY + barH / 2, manaRadius);
    manaX -= manaSpacing;
  }

  const displayName = french?.name || card.frenchName || card.name || "Carte";
  drawFittedSingleLineText(
    ctx,
    displayName,
    barX + 18,
    barY + barH / 2 + 1,
    barW - 34 - manaBlockWidth,
    31,
    18,
    "700",
    'Cinzel, Georgia, "Times New Roman", serif',
    palette.ink,
  );

  // 4. Artwork Window (High-Res art_crop preferred)
  const artX = 52;
  const artY = 118;
  const artW = W - 104;
  const artH = 468;

  ctx.save();
  ctx.fillStyle = "#111318";
  ctx.fillRect(artX, artY, artW, artH);
  if (artImage) {
    drawImageCover(ctx, artImage, artX, artY, artW, artH, 0.35);
  } else if (fullScanImage) {
    // Extract art window region from full scan if art_crop was unavailable
    const sx = fullScanImage.naturalWidth * 0.08;
    const sy = fullScanImage.naturalHeight * 0.115;
    const sw = fullScanImage.naturalWidth * 0.84;
    const sh = fullScanImage.naturalHeight * 0.445;
    ctx.drawImage(fullScanImage, sx, sy, sw, sh, artX, artY, artW, artH);
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = palette.trim;
  ctx.strokeRect(artX, artY, artW, artH);
  ctx.restore();

  // 5. Type Line Bar (French Type Line + Set Code Badge)
  const typeX = 46;
  const typeY = 594;
  const typeW = W - 92;
  const typeH = 54;
  drawRoundedRect(ctx, typeX, typeY, typeW, typeH, 14);
  ctx.fillStyle = palette.barBg;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = palette.trim;
  ctx.stroke();

  // Set code pill on the right of type bar
  const setBadge = String(variant?.setCode || "FR").toUpperCase();
  const badgeW = 64;
  const badgeH = 32;
  const badgeX = typeX + typeW - badgeW - 12;
  const badgeY = typeY + (typeH - badgeH) / 2;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fillStyle = "#1f242e";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#d4af37";
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.font = `800 16px Inter, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(setBadge, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);

  const displayType = french?.typeLine || card.typeLine || "";
  drawFittedSingleLineText(
    ctx,
    displayType,
    typeX + 18,
    typeY + typeH / 2 + 1,
    typeW - badgeW - 40,
    24,
    15,
    "700",
    'Georgia, "Times New Roman", serif',
    palette.ink,
  );

  // 6. French Rules Textbox
  const boxX = 52;
  const boxY = 656;
  const boxW = W - 104;
  const boxH = 302;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 10);
  ctx.fillStyle = palette.boxBg;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = palette.trim;
  ctx.stroke();

  drawFittedRulesText(
    ctx,
    french?.rulesText ?? card.frenchText ?? card.oracleText ?? "",
    french?.flavorText ?? "",
    { x: boxX, y: boxY, w: boxW, h: boxH, padX: 22, padY: 18 },
    palette.ink,
  );

  // 7. P/T or Loyalty & Footer
  drawPtOrLoyaltyBadge(ctx, card, palette, false);
  drawCollectorFooter(ctx, variant, false);
}

function drawFullArtFrenchProxy(ctx, card, variant, french, fullScanImage, artImage) {
  const W = PROXY_CANVAS_WIDTH;
  const H = PROXY_CANVAS_HEIGHT;
  const palette = getCardPalette(card);

  // 1. Full-bleed background artwork
  ctx.fillStyle = "#0b0c0e";
  ctx.fillRect(0, 0, W, H);

  const bgImage = fullScanImage || artImage;
  if (bgImage) {
    // Draw edge-to-edge preserving aspect ratio
    drawImageCover(ctx, bgImage, 0, 0, W, H, 0.25);
  }

  // Subtle dark vignette at top & bottom so translucent French bars pop crisply
  const topGrad = ctx.createLinearGradient(0, 0, 0, 150);
  topGrad.addColorStop(0, "rgba(8, 10, 14, 0.82)");
  topGrad.addColorStop(1, "rgba(8, 10, 14, 0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 150);

  const bottomGrad = ctx.createLinearGradient(0, 560, 0, H);
  bottomGrad.addColorStop(0, "rgba(8, 10, 14, 0)");
  bottomGrad.addColorStop(0.28, "rgba(8, 10, 14, 0.72)");
  bottomGrad.addColorStop(1, "rgba(8, 10, 14, 0.94)");
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, 560, W, H - 560);

  // Thin crisp black border edge for clean guillotine cutting
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#090a0d";
  ctx.strokeRect(7, 7, W - 14, H - 14);

  // 2. Translucent Title Bar (French Name + Mana Cost)
  const barX = 38;
  const barY = 38;
  const barW = W - 76;
  const barH = 62;
  drawRoundedRect(ctx, barX, barY, barW, barH, 16);
  ctx.fillStyle = "rgba(14, 17, 24, 0.84)";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = palette.trim;
  ctx.stroke();

  const manaTokens = parseManaTokens(card.manaCost);
  const manaRadius = 17;
  const manaSpacing = 38;
  const manaBlockWidth = manaTokens.length > 0 ? manaTokens.length * manaSpacing + 10 : 0;
  let manaX = barX + barW - 14 - manaRadius;
  for (let i = manaTokens.length - 1; i >= 0; i--) {
    drawManaSymbol(ctx, manaTokens[i], manaX, barY + barH / 2, manaRadius);
    manaX -= manaSpacing;
  }

  const displayName = french?.name || card.frenchName || card.name || "Carte";
  drawFittedSingleLineText(
    ctx,
    displayName,
    barX + 18,
    barY + barH / 2 + 1,
    barW - 34 - manaBlockWidth,
    31,
    18,
    "700",
    'Cinzel, Georgia, "Times New Roman", serif',
    "#f8fafc",
  );

  // 3. Translucent Type Bar
  const typeX = 38;
  const typeY = 602;
  const typeW = W - 76;
  const typeH = 50;
  drawRoundedRect(ctx, typeX, typeY, typeW, typeH, 14);
  ctx.fillStyle = "rgba(14, 17, 24, 0.85)";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = palette.trim;
  ctx.stroke();

  const setBadge = String(variant?.setCode || "FR").toUpperCase();
  const badgeW = 62;
  const badgeH = 30;
  const badgeX = typeX + typeW - badgeW - 10;
  const badgeY = typeY + (typeH - badgeH) / 2;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fillStyle = "rgba(212, 175, 55, 0.2)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#d4af37";
  ctx.stroke();
  ctx.fillStyle = "#fde68a";
  ctx.font = `800 15px Inter, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(setBadge, badgeX + badgeW / 2, badgeY + badgeH / 2 + 0.5);

  const displayType = french?.typeLine || card.typeLine || "";
  drawFittedSingleLineText(
    ctx,
    displayType,
    typeX + 18,
    typeY + typeH / 2 + 1,
    typeW - badgeW - 36,
    23,
    15,
    "700",
    'Georgia, "Times New Roman", serif',
    "#f8fafc",
  );

  // 4. Frosted Lower French Rules Panel
  const boxX = 38;
  const boxY = 660;
  const boxW = W - 76;
  const boxH = 300;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 14);
  ctx.fillStyle = "rgba(12, 15, 22, 0.84)";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = palette.trim;
  ctx.stroke();

  drawFittedRulesText(
    ctx,
    french?.rulesText ?? card.frenchText ?? card.oracleText ?? "",
    french?.flavorText ?? "",
    { x: boxX, y: boxY, w: boxW, h: boxH, padX: 22, padY: 18 },
    "#f8fafc",
  );

  // 5. P/T or Loyalty & Footer
  drawPtOrLoyaltyBadge(ctx, card, palette, true);
  drawCollectorFooter(ctx, variant, true);
}

/**
 * Renders the requested proxy card (official FR scan or synthesized HD FR proxy)
 * and returns a `{ dataUrl, width, height, renderedAsFrenchProxy }` payload.
 */
export async function renderProxyCardDataUrl({
  card,
  variant,
  french,
  renderMode = "hybrid",
  face = "front",
  engine = "retext",
  outputScale = 1,
}) {
  const effectiveVariant =
    face === "back" && variant?.backFace
      ? {
          ...variant,
          pngUrl: variant.backFace.pngUrl,
          largeUrl: variant.backFace.largeUrl,
          artCropUrl: variant.backFace.artCropUrl,
        }
      : variant;

  const effectiveCard =
    face === "back" && variant?.backFace
      ? {
          ...card,
          name: variant.backFace.name,
          manaCost: variant.backFace.manaCost || "",
          colors: card?.colors,
          typeLine: variant.backFace.typeLine,
          oracleText: variant.backFace.oracleText,
          power: variant.backFace.power,
          toughness: variant.backFace.toughness,
          loyalty: variant.backFace.loyalty,
        }
      : card;

  const effectiveFrench =
    face === "back" && variant?.backFace
      ? {
          ...french,
          name: french?.backFaceName || variant.backFace.printedName || variant.backFace.name,
          typeLine:
            french?.backFaceTypeLine ||
            variant.backFace.printedTypeLine ||
            variant.backFace.typeLine,
          rulesText:
            french?.backFaceRulesText ||
            variant.backFace.printedText ||
            variant.backFace.oracleText,
          flavorText: "",
        }
      : french;

  if (isMpcVariant(effectiveVariant)) {
    return renderMpcVariant({
      card: effectiveCard,
      variant: effectiveVariant,
      french: effectiveFrench,
      renderMode,
      outputScale,
    });
  }

  const useCanvas = shouldUseFrenchCanvasRender(effectiveVariant, effectiveFrench, renderMode);
  const rawScanUrl = toProxiedImageUrl(
    effectiveVariant?.pngUrl || effectiveVariant?.largeUrl || card?.imageUrl || "",
  );

  if (!useCanvas) {
    return {
      dataUrl: rawScanUrl,
      width: PROXY_CANVAS_WIDTH,
      height: PROXY_CANVAS_HEIGHT,
      renderedAsFrenchProxy: false,
    };
  }

  const resolvedEngine = resolveFrenchEngine(effectiveVariant, effectiveCard, engine);
  const scale = resolvedEngine === "retext" ? Math.max(1, Math.min(2, outputScale)) : 1;
  const cacheKey = JSON.stringify([
    effectiveVariant?.scryfallId || card?.slug,
    face,
    renderMode,
    resolvedEngine,
    scale,
    effectiveFrench?.name,
    effectiveFrench?.typeLine,
    effectiveFrench?.rulesText,
    effectiveFrench?.flavorText || "",
  ]);

  if (renderedDataUrlCache.has(cacheKey)) {
    return renderedDataUrlCache.get(cacheKey);
  }

  if (resolvedEngine === "retext") {
    const scanImage = await loadCanvasImage(rawScanUrl);
    if (scanImage?.naturalWidth) {
      try {
        const retextCanvas = await renderRetextedCanvas({
          scanImage,
          card: effectiveCard,
          french: effectiveFrench,
          hasFaceIcon: Boolean(variant?.backFace),
          outputScale: scale,
        });
        const result = {
          dataUrl: await canvasToUrl(retextCanvas),
          width: retextCanvas.width,
          height: retextCanvas.height,
          renderedAsFrenchProxy: true,
          engine: "retext",
        };
        renderedDataUrlCache.set(cacheKey, result);
        return result;
      } catch {
        // Fall through to the synthesized frame (e.g. tainted canvas, decode failure).
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = PROXY_CANVAS_WIDTH;
  canvas.height = PROXY_CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");

  const fullArtStyle = isFullArtStyleVariant(effectiveVariant);
  const [fullScanImage, artImage] = await Promise.all([
    loadCanvasImage(rawScanUrl),
    effectiveVariant?.artCropUrl
      ? loadCanvasImage(toProxiedImageUrl(effectiveVariant.artCropUrl))
      : Promise.resolve(null),
  ]);

  if (ctx) {
    if (fullArtStyle) {
      drawFullArtFrenchProxy(
        ctx,
        effectiveCard,
        effectiveVariant,
        effectiveFrench,
        fullScanImage,
        artImage,
      );
    } else {
      drawClassicFramedProxy(
        ctx,
        effectiveCard,
        effectiveVariant,
        effectiveFrench,
        artImage,
        fullScanImage,
      );
    }
  }

  const result = {
    dataUrl: canvas.toDataURL("image/png"),
    width: PROXY_CANVAS_WIDTH,
    height: PROXY_CANVAS_HEIGHT,
    renderedAsFrenchProxy: true,
    engine: "frame",
  };
  renderedDataUrlCache.set(cacheKey, result);
  return result;
}

/**
 * Screen-size renders stay data URLs; 600 DPI renders become blob URLs so a
 * full print run does not hold hundreds of megabytes of base64 strings.
 */
function canvasToUrl(canvas) {
  if (canvas.width <= PROXY_CANVAS_WIDTH || typeof canvas.toBlob !== "function") {
    return Promise.resolve(canvas.toDataURL("image/png"));
  }
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/png"));
    }, "image/png");
  });
}

/**
 * Fetches or renders a proxy card as raw PNG bytes (`Uint8Array`) for single download or ZIP bundling.
 */
export async function renderProxyCardPngBytes(params) {
  const rendered = await renderProxyCardDataUrl(params);
  if (rendered.dataUrl.startsWith("data:image/png;base64,")) {
    const base64 = rendered.dataUrl.slice("data:image/png;base64,".length);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const res = await fetch(rendered.dataUrl);
  if (!res.ok) {
    throw new Error(`Impossible de télécharger le scan (${res.status}).`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export function clearProxyRenderCache() {
  for (const rendered of renderedDataUrlCache.values()) {
    if (typeof rendered?.dataUrl === "string" && rendered.dataUrl.startsWith("blob:")) {
      URL.revokeObjectURL(rendered.dataUrl);
    }
  }
  renderedDataUrlCache.clear();
}

/**
 * Renders a user-made card ("carte inédite") from its uploaded image.
 * - mode "scan": the image is a full card visual; it is cropped to 63:88
 *   (minus MPC bleed if flagged) and its text is replaced by the French text.
 * - mode "art": the image is an illustration framed by the DraftMaster frame.
 *
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderCustomCardCanvas({ customCard, image, outputScale = 1 }) {
  const scale = Math.max(1, Math.min(2, outputScale));
  const card = toRenderCard(customCard);
  const french = toFrenchText(customCard);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (customCard.mode === "scan") {
    const crop = computeCardCrop(sourceWidth, sourceHeight, {
      hasBleed: customCard.imageHasBleed,
    });
    // Normalise very large uploads (MPC 1200 DPI) to 600 DPI before erasing.
    const maxWidth = PROXY_CANVAS_WIDTH * 2;
    const ratio = Math.min(1, maxWidth / crop.width);
    const cropped = document.createElement("canvas");
    cropped.width = Math.round(crop.width * ratio);
    cropped.height = Math.round(crop.height * ratio);
    const cctx = cropped.getContext("2d");
    cctx.imageSmoothingQuality = "high";
    cctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      cropped.width,
      cropped.height,
    );
    return renderRetextedCanvas({
      scanImage: cropped,
      card,
      french,
      hasFaceIcon: false,
      outputScale: scale,
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = PROXY_CANVAS_WIDTH * scale;
  canvas.height = PROXY_CANVAS_HEIGHT * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.imageSmoothingQuality = "high";
  const variant = { setCode: "DM", artist: customCard.artist || "Illustration perso" };
  drawClassicFramedProxy(ctx, card, variant, french, image, null);
  return canvas;
}

/** Canvas -> PNG bytes for downloads and ZIP archives. */
export async function canvasToPngBytes(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Impossible d'encoder la carte en PNG.");
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * MPC Autofill renders: the 1/8" bleed is always trimmed; English renders get
 * the French text only when their template matches the M15 layout, otherwise
 * the community render is kept as-is (VO) rather than damaged.
 */
async function renderMpcVariant({ card, variant, french, renderMode, outputScale }) {
  const scale = Math.max(1, Math.min(2, outputScale));
  const wantsFrench = renderMode !== "raw" && !variant.isOfficialFrenchScan;
  const cacheKey = JSON.stringify([
    variant.scryfallId,
    "mpc",
    scale,
    wantsFrench,
    wantsFrench ? french?.name : "",
    wantsFrench ? french?.typeLine : "",
    wantsFrench ? french?.rulesText : "",
    wantsFrench ? french?.flavorText || "" : "",
  ]);
  if (renderedDataUrlCache.has(cacheKey)) return renderedDataUrlCache.get(cacheKey);

  const image = await loadCanvasImage(variant.pngUrl);
  if (!image?.naturalWidth) {
    throw new Error("Rendu MPC indisponible (image non téléchargée).");
  }
  const cardArea = cropMpcRender(image, PROXY_CANVAS_WIDTH * scale);

  let output = cardArea;
  let engine = "mpc";
  let layoutCompatible = null;
  if (wantsFrench) {
    layoutCompatible = isM15CompatibleRender(cardArea);
    if (layoutCompatible) {
      output = await renderRetextedCanvas({
        scanImage: cardArea,
        card,
        french,
        hasFaceIcon: false,
        outputScale: scale,
      });
      engine = "retext";
    }
  }

  const result = {
    dataUrl: await canvasToUrl(output),
    width: output.width,
    height: output.height,
    renderedAsFrenchProxy: engine === "retext",
    engine,
    layoutCompatible,
  };
  renderedDataUrlCache.set(cacheKey, result);
  return result;
}
