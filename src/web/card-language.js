export const CARD_LANGUAGE_STORAGE_KEY = "draftmaster_card_language";
export const DEFAULT_CARD_LANGUAGE = "EN";

export function normalizeCardLanguage(value) {
  return String(value || "").toUpperCase() === "FR" ? "FR" : "EN";
}

export function readCardLanguage(storage = globalThis.localStorage) {
  try {
    return normalizeCardLanguage(storage?.getItem(CARD_LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_CARD_LANGUAGE;
  }
}

export function writeCardLanguage(language, storage = globalThis.localStorage) {
  const normalized = normalizeCardLanguage(language);
  try {
    storage?.setItem(CARD_LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // The preference still applies for this session when storage is unavailable.
  }
  return normalized;
}

export function getCardDisplayName(card, language) {
  if (!card) return "Carte";
  return normalizeCardLanguage(language) === "FR" && card.frenchName
    ? card.frenchName
    : card.name || "Carte";
}

export function getCardImageUrl(card, language, isLarge = false) {
  if (!card) return "/data/cards/images/default.jpg";

  if (normalizeCardLanguage(language) === "FR") {
    if (isLarge && card.frenchLargeImageUrl) return card.frenchLargeImageUrl;
    if (card.frenchImageUrl) return card.frenchImageUrl;
    if (card.image?.localFrenchPath) return `/${card.image.localFrenchPath}`;
    if (card.localFrenchImagePath) return `/${card.localFrenchImagePath}`;
    if (card.localFrenchPath) return `/${card.localFrenchPath}`;
  }

  if (card.image?.localPath) return `/${card.image.localPath}`;
  if (card.localImagePath) return `/${card.localImagePath}`;
  return (
    card.imageUrl ||
    card.image?.url ||
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name || "")}&format=image`
  );
}

export function getCardImageFallbackUrl(card, language) {
  if (normalizeCardLanguage(language) === "FR" && card?.frenchImageUrl) {
    return card.frenchImageUrl;
  }
  return (
    card?.imageUrl ||
    card?.image?.url ||
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card?.name || "")}&format=image`
  );
}
