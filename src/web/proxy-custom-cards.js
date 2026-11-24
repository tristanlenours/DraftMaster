/**
 * Pure model of user-made ("inédites") proxy cards: validation, mana-cost
 * parsing and image cropping maths. DOM-free so it is unit-tested directly.
 *
 * Two modes:
 * - "scan": the uploaded image is a complete card visual (e.g. an English HD
 *   scan or an MPC 1200 DPI render); its text is replaced in place by the
 *   French text (retexturing engine, M15 frames).
 * - "art": the uploaded image is an illustration only; the card is drawn in
 *   the DraftMaster frame around it.
 */

export const CUSTOM_CARD_MODES = Object.freeze(["scan", "art"]);
export const MAX_CUSTOM_QUANTITY = 20;
/** MPC-style renders carry 1/8 inch (3.175 mm) of bleed around the 63x88 mm card. */
export const MPC_BLEED_MM = 3.175;

const TRIM_WIDTH_MM = 63;
const TRIM_HEIGHT_MM = 88;
const MANA_LETTERS = new Set(["W", "U", "B", "R", "G", "C", "X", "Y", "Z", "S", "T", "Q", "E"]);
const COLOR_ORDER = ["W", "U", "B", "R", "G"];

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

/**
 * Accepts "{2}{U}{U}", "2UU", "2 U U", "{W/U}{W/U}" or "x r r" and returns the
 * canonical brace form. Unknown characters are dropped.
 */
export function parseManaCostInput(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  if (text.includes("{")) {
    const symbols = text.match(/\{[^}]{1,6}\}/g) ?? [];
    return symbols.map((symbol) => symbol.toUpperCase()).join("");
  }
  const tokens = text.toUpperCase().match(/\d+|[A-Z]/g) ?? [];
  return tokens
    .filter((token) => /^\d+$/.test(token) || MANA_LETTERS.has(token))
    .map((token) => `{${token}}`)
    .join("");
}

/** Colours of a mana cost in WUBRG order, hybrid symbols counting for both sides. */
export function deriveColorsFromManaCost(manaCost) {
  const colors = new Set();
  for (const symbol of String(manaCost ?? "").match(/\{[^}]+\}/g) ?? []) {
    for (const part of symbol.slice(1, -1).toUpperCase().split("/")) {
      if (COLOR_ORDER.includes(part)) colors.add(part);
    }
  }
  return COLOR_ORDER.filter((color) => colors.has(color));
}

function cleanStat(value) {
  const text = String(value ?? "").trim();
  return /^[0-9*+\-Xx½∞]{1,4}$/u.test(text) ? text.toUpperCase() : "";
}

let idCounter = 0;
/** Short, collision-resistant local id (not security sensitive). */
export function createCustomCardId(now = Date.now(), random = Math.random) {
  idCounter = (idCounter + 1) % 1296;
  return `custom-${now.toString(36)}-${idCounter.toString(36)}${Math.floor(random() * 1e6).toString(36)}`;
}

/** A fresh, empty custom card. */
export function createCustomCardDraft(id = createCustomCardId()) {
  return {
    id,
    mode: "scan",
    name: "",
    manaCost: "",
    typeLine: "",
    rulesText: "",
    flavorText: "",
    power: "",
    toughness: "",
    artist: "",
    imageHasBleed: false,
    quantity: 1,
    updatedAt: "",
  };
}

/**
 * Validates and canonicalizes a custom card. Returns `{ ok, card, errors }`;
 * `errors` lists French messages for the editor.
 */
export function normalizeCustomCard(input, now = new Date()) {
  const draft = createCustomCardDraft(String(input?.id ?? "") || createCustomCardId());
  const mode = CUSTOM_CARD_MODES.includes(input?.mode) ? input.mode : "scan";
  const quantity = Math.trunc(Number(input?.quantity));
  const card = {
    ...draft,
    mode,
    name: cleanText(input?.name, 80),
    manaCost: parseManaCostInput(input?.manaCost),
    typeLine: cleanText(input?.typeLine, 90),
    rulesText: cleanText(input?.rulesText, 1200),
    flavorText: cleanText(input?.flavorText, 400),
    power: cleanStat(input?.power),
    toughness: cleanStat(input?.toughness),
    artist: cleanText(input?.artist, 60),
    imageHasBleed: Boolean(input?.imageHasBleed),
    quantity: Number.isFinite(quantity) ? Math.min(MAX_CUSTOM_QUANTITY, Math.max(0, quantity)) : 1,
    updatedAt: now.toISOString(),
  };

  const errors = [];
  if (!card.name) errors.push("Le nom de la carte est obligatoire.");
  if (!card.typeLine) errors.push("La ligne de type est obligatoire.");
  if (Boolean(card.power) !== Boolean(card.toughness)) {
    errors.push("Renseignez la force et l'endurance ensemble (ou aucune des deux).");
  }
  return { ok: errors.length === 0, card, errors };
}

/** Card facts as the renderers expect them. */
export function toRenderCard(customCard) {
  const typeLine = customCard.typeLine;
  const colors = deriveColorsFromManaCost(customCard.manaCost);
  return {
    oracleId: customCard.id,
    slug: customCard.id,
    name: customCard.name,
    manaCost: customCard.manaCost,
    typeLine,
    colors,
    types: [
      ...(/artefact|artifact/i.test(typeLine) ? ["Artifact"] : []),
      ...(/terrain|land/i.test(typeLine) ? ["Land"] : []),
    ],
    isLand: /terrain|land/i.test(typeLine),
    power: customCard.power || undefined,
    toughness: customCard.toughness || undefined,
  };
}

/** French text block for the renderers (always a user-authored text). */
export function toFrenchText(customCard) {
  return {
    name: customCard.name,
    typeLine: customCard.typeLine,
    rulesText: customCard.rulesText,
    flavorText: customCard.flavorText,
    source: "custom",
    officialFrenchPrintExists: false,
  };
}

/**
 * Crop rectangle (source pixels) that turns an uploaded image into a 63:88
 * card: optional MPC bleed is trimmed first, then the image is centre-cropped
 * to the exact card ratio.
 */
export function computeCardCrop(imageWidth, imageHeight, { hasBleed = false } = {}) {
  let x = 0;
  let y = 0;
  let width = imageWidth;
  let height = imageHeight;
  if (hasBleed) {
    const bleedX = (imageWidth * MPC_BLEED_MM) / (TRIM_WIDTH_MM + 2 * MPC_BLEED_MM);
    const bleedY = (imageHeight * MPC_BLEED_MM) / (TRIM_HEIGHT_MM + 2 * MPC_BLEED_MM);
    x += bleedX;
    y += bleedY;
    width -= 2 * bleedX;
    height -= 2 * bleedY;
  }
  const targetRatio = TRIM_WIDTH_MM / TRIM_HEIGHT_MM;
  if (width / height > targetRatio) {
    const croppedWidth = height * targetRatio;
    x += (width - croppedWidth) / 2;
    width = croppedWidth;
  } else {
    const croppedHeight = width / targetRatio;
    y += (height - croppedHeight) / 2;
    height = croppedHeight;
  }
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Effective DPI an image reaches once printed at 63 mm wide. */
export function estimatePrintDpi(cropWidthPx) {
  return Math.round((cropWidthPx / TRIM_WIDTH_MM) * 25.4);
}

/** Art window of the DraftMaster frame: 641x468 px on a 745 px wide card. */
const FRAME_ART_WINDOW = Object.freeze({ widthPx: 641, heightPx: 468, cardWidthPx: 745 });

/**
 * Print resolution an upload reaches: over the whole card for "scan" mode,
 * over the illustration window for "art" mode (the image is cover-cropped).
 */
export function estimateCustomCardDpi(imageWidth, imageHeight, { mode, hasBleed = false }) {
  if (mode === "art") {
    const windowRatio = FRAME_ART_WINDOW.widthPx / FRAME_ART_WINDOW.heightPx;
    const usedWidth = Math.min(imageWidth, imageHeight * windowRatio);
    const windowMm = (FRAME_ART_WINDOW.widthPx / FRAME_ART_WINDOW.cardWidthPx) * TRIM_WIDTH_MM;
    return Math.round((usedWidth / windowMm) * 25.4);
  }
  return estimatePrintDpi(computeCardCrop(imageWidth, imageHeight, { hasBleed }).width);
}
