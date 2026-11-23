/**
 * Browser side of the MPC Autofill source: turns search results into studio
 * variants, renders them (bleed trimmed, French text when the template allows
 * it) and checks template compatibility on thumbnails.
 */
import { computeCardCrop } from "./proxy-custom-cards.js";
import { M15_REFERENCE_HEIGHT, M15_REFERENCE_WIDTH, scoreM15Layout } from "./proxy-retext-core.js";

const MPC_ID_PATTERN = /^[A-Za-z0-9_-]{20,100}$/u;

export function mpcImagePath(identifier, size) {
  return `/api/proxy-scans/mpc/image/${identifier}?size=${size === "full" ? "full" : "thumb"}`;
}

/** Maps an MPC Autofill search result onto the studio's variant shape. */
export function mpcCandidateToVariant(candidate) {
  if (!MPC_ID_PATTERN.test(String(candidate?.identifier ?? ""))) {
    throw new Error("Identifiant MPC invalide.");
  }
  const language = String(candidate.language || "EN").toUpperCase();
  const isFrench = language === "FR";
  const dpi = Number(candidate.dpi) || 0;
  return {
    scryfallId: `mpc:${candidate.identifier}`,
    source: "mpc",
    mpcId: candidate.identifier,
    mpcDpi: dpi,
    lang: language.toLowerCase(),
    setCode: "MPC",
    setName: `MPC Autofill — ${candidate.sourceName || "communauté"}`,
    collectorNumber: "",
    releasedAt: "",
    artist: candidate.sourceName || "MPC Autofill",
    frame: "mpc",
    frameEffects: [],
    borderColor: "black",
    promoTypes: [],
    fullArt: false,
    borderless: false,
    highresImage: true,
    imageStatus: "mpc_render",
    treatmentLabel: `MPC ${String(dpi)} DPI${isFrench ? " (FR)" : ""}`,
    pngUrl: mpcImagePath(candidate.identifier, "full"),
    largeUrl: mpcImagePath(candidate.identifier, "thumb"),
    hasBleed: true,
    isOfficialFrenchScan: isFrench,
    needsFrenchProxyRender: !isFrench,
    score: dpi,
  };
}

export function isMpcVariant(variant) {
  return variant?.source === "mpc";
}

/**
 * Draws the card area of an MPC render (1/8" bleed trimmed) onto a canvas no
 * wider than `maxWidth`.
 */
export function cropMpcRender(image, maxWidth) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const crop = computeCardCrop(width, height, { hasBleed: true });
  const ratio = Math.min(1, maxWidth / crop.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.width * ratio);
  canvas.height = Math.round(crop.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Runs the M15 layout check on any card-area canvas or image. */
export function isM15CompatibleRender(cardArea) {
  const probe = document.createElement("canvas");
  probe.width = M15_REFERENCE_WIDTH;
  probe.height = M15_REFERENCE_HEIGHT;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(cardArea, 0, 0, probe.width, probe.height);
  const { data } = ctx.getImageData(0, 0, probe.width, probe.height);
  return scoreM15Layout(data, probe.width, probe.height).compatible;
}

const thumbCompatibilityCache = new Map();

/** Checks (once per render) whether a thumbnail's template accepts French text. */
export function checkMpcThumbnailCompatibility(identifier) {
  if (thumbCompatibilityCache.has(identifier)) return thumbCompatibilityCache.get(identifier);
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(isM15CompatibleRender(cropMpcRender(img, M15_REFERENCE_WIDTH)));
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = mpcImagePath(identifier, "thumb");
  });
  thumbCompatibilityCache.set(identifier, promise);
  return promise;
}
