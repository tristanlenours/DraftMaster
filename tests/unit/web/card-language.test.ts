import { describe, expect, it } from "vitest";
import {
  CARD_LANGUAGE_STORAGE_KEY,
  DEFAULT_CARD_LANGUAGE,
  getCardDisplayName,
  getCardImageFallbackUrl,
  getCardImageUrl,
  readCardLanguage,
  writeCardLanguage,
} from "../../../src/web/card-language.js";

const card = {
  name: "Swords to Plowshares",
  frenchName: "Retour au pays",
  imageUrl: "https://cards.scryfall.io/en.jpg",
  frenchImageUrl: "https://cards.scryfall.io/fr.jpg",
  frenchLargeImageUrl: "https://cards.scryfall.io/fr-large.jpg",
  image: {
    localPath: "data/cards/images/cards/swords.jpg",
    localFrenchPath: "data/cards/images/fr/cards/swords.jpg",
  },
};

describe("global card language", () => {
  it("defaults to English when no preference exists", () => {
    const storage = { getItem: () => null };

    expect(readCardLanguage(storage)).toBe(DEFAULT_CARD_LANGUAGE);
    expect(DEFAULT_CARD_LANGUAGE).toBe("EN");
  });

  it("persists a normalized French preference", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    expect(writeCardLanguage("fr", storage)).toBe("FR");
    expect(values.get(CARD_LANGUAGE_STORAGE_KEY)).toBe("FR");
    expect(readCardLanguage(storage)).toBe("FR");
  });

  it("uses English names and scans by default", () => {
    expect(getCardDisplayName(card, "EN")).toBe("Swords to Plowshares");
    expect(getCardImageUrl(card, "EN")).toBe("/data/cards/images/cards/swords.jpg");
    expect(getCardImageFallbackUrl(card, "EN")).toBe("https://cards.scryfall.io/en.jpg");
  });

  it("switches names and scans to French, including large previews", () => {
    expect(getCardDisplayName(card, "FR")).toBe("Retour au pays");
    expect(getCardImageUrl(card, "FR")).toBe("https://cards.scryfall.io/fr.jpg");
    expect(getCardImageUrl(card, "FR", true)).toBe("https://cards.scryfall.io/fr-large.jpg");
    expect(getCardImageFallbackUrl(card, "FR")).toBe("https://cards.scryfall.io/fr.jpg");
  });
});
