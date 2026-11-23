/**
 * Print bleed for proxy images (browser canvas).
 *
 * Scryfall scans have transparent rounded corners; printed as-is they leave
 * white notches. This fills the corners with the card's own border colour,
 * then extends every edge outward by `bleedMm` (edge-clamp), so a slightly
 * off cut still shows border instead of paper.
 */
import { CARD_TRIM_WIDTH_MM } from "./proxy-print-layout.js";

const bleedCache = new Map();

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image de carte illisible pour le fond perdu."));
    img.src = url;
  });
}

/** Samples the border colour on the card's left edge, half-way down. */
function sampleBorderColor(ctx, width, height) {
  const x = Math.max(1, Math.round(width * 0.02));
  const y0 = Math.round(height * 0.45);
  const { data } = ctx.getImageData(x, y0, 2, Math.max(4, Math.round(height * 0.1)));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] < 200) continue;
    r += data[p];
    g += data[p + 1];
    b += data[p + 2];
    n++;
  }
  if (n === 0) return "rgb(12,12,14)";
  return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
}

/**
 * Returns a blob URL of the card image with corners filled and `bleedMm` of
 * bleed on each side. With `bleedMm = 0` only the corners are filled.
 */
export async function createBleedImageUrl(sourceUrl, bleedMm) {
  const key = `${sourceUrl}|${bleedMm}`;
  if (bleedCache.has(key)) return bleedCache.get(key);
  const promise = (async () => {
    const img = await loadImage(sourceUrl);
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const pxPerMm = width / CARD_TRIM_WIDTH_MM;
    const bleed = Math.round(Math.max(0, bleedMm) * pxPerMm);

    // 1. Card on its own border colour: fills the transparent rounded corners.
    const card = document.createElement("canvas");
    card.width = width;
    card.height = height;
    const cctx = card.getContext("2d", { willReadFrequently: true });
    cctx.drawImage(img, 0, 0);
    const border = sampleBorderColor(cctx, width, height);
    cctx.globalCompositeOperation = "destination-over";
    cctx.fillStyle = border;
    cctx.fillRect(0, 0, width, height);
    cctx.globalCompositeOperation = "source-over";

    // 2. Edge-clamp extension into the bleed.
    const out = document.createElement("canvas");
    out.width = width + bleed * 2;
    out.height = height + bleed * 2;
    const ctx = out.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(card, bleed, bleed);
    if (bleed > 0) {
      ctx.drawImage(card, 0, 0, width, 1, bleed, 0, width, bleed);
      ctx.drawImage(card, 0, height - 1, width, 1, bleed, height + bleed, width, bleed);
      ctx.drawImage(card, 0, 0, 1, height, 0, bleed, bleed, height);
      ctx.drawImage(card, width - 1, 0, 1, height, width + bleed, bleed, bleed, height);
      ctx.drawImage(card, 0, 0, 1, 1, 0, 0, bleed, bleed);
      ctx.drawImage(card, width - 1, 0, 1, 1, width + bleed, 0, bleed, bleed);
      ctx.drawImage(card, 0, height - 1, 1, 1, 0, height + bleed, bleed, bleed);
      ctx.drawImage(card, width - 1, height - 1, 1, 1, width + bleed, height + bleed, bleed, bleed);
    }
    const blob = await new Promise((resolve) => out.toBlob(resolve, "image/png"));
    return blob ? URL.createObjectURL(blob) : out.toDataURL("image/png");
  })();
  bleedCache.set(key, promise);
  promise.catch(() => bleedCache.delete(key));
  return promise;
}

export function clearBleedCache() {
  for (const promise of bleedCache.values()) {
    promise
      .then((url) => {
        if (typeof url === "string" && url.startsWith("blob:")) URL.revokeObjectURL(url);
      })
      .catch(() => {});
  }
  bleedCache.clear();
}
