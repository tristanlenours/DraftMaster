/**
 * Starts an image load with a single remote fallback.
 *
 * The error handler is installed before assigning src so fast local failures
 * (such as an asset omitted from a production build) cannot be missed.
 */
export function loadImageWithFallback(image, primarySrc, fallbackSrc) {
  image.onerror = () => {
    image.onerror = null;
    if (fallbackSrc && image.src !== fallbackSrc) {
      image.src = fallbackSrc;
    }
  };
  image.src = primarySrc;
}

/**
 * Strictly verifies whether a Scryfall print matches the requested card name.
 * Prevents split/adventure/prepare cards from erroneously hijacking iconic singles
 * (e.g. "Emeritus of Ideation // Ancestral Recall" must not hijack "Ancestral Recall").
 */
export function isMatchingScryfallPrint(print, cardName) {
  if (!print || !cardName) return false;
  const cn = cardName.trim().toLowerCase();
  const pn = (print.name || "").trim().toLowerCase();

  // 1. Exact full card name match (e.g. "Ancestral Recall", "Fire // Ice", "Swords to Plowshares")
  if (pn === cn) return true;

  // 2. Front face match for transform / adventure / split / MDFC cards where cardName is only the front face
  // (e.g. cardName is "Brazen Borrower" and print.name is "Brazen Borrower // Petty Theft")
  // IMPORTANT: Only match if cardName matches the FRONT face (face 0).
  // NEVER match if it only matches a secondary/adventure face (e.g. "Emeritus of Ideation // Ancestral Recall" must NOT match "Ancestral Recall").
  if (print.card_faces && print.card_faces.length > 0) {
    const frontFaceName = (print.card_faces[0].printed_name || print.card_faces[0].name || "").trim().toLowerCase();
    const frontFaceOracleName = (print.card_faces[0].name || "").trim().toLowerCase();
    if (frontFaceName === cn || frontFaceOracleName === cn) {
      return true;
    }
  }

  return false;
}

/**
 * Sanitizes local French translation cache entries by removing known corrupted keys.
 * Returns true if any corrupted entry was purged.
 */
export function sanitizeFrenchCache(cacheMap) {
  let mutated = false;
  for (const [k, v] of cacheMap.entries()) {
    const keyLower = String(k || "").toLowerCase();
    const frLower = String(v?.frenchName || "").toLowerCase();

    // 1. Ancestral Recall was never printed in French; purge any erroneous match
    if (keyLower === "ancestral recall") {
      cacheMap.delete(k);
      mutated = true;
      continue;
    }

    // 2. Purge any card where the French translation maps to an "Émérite" adventure face
    // unless the card itself is an Emeritus card
    if (
      frLower.includes("émérite") &&
      !keyLower.includes("emeritus") &&
      !keyLower.includes("émérite")
    ) {
      cacheMap.delete(k);
      mutated = true;
      continue;
    }
  }
  return mutated;
}
