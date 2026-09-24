import { describe, expect, it } from "vitest";

import {
  GeminiDeckPhotoRecognizer,
  MasterCardsIndex,
} from "../../../src/tournaments/deck-photo-recognition.ts";

describe("Deck photo recognition and card indexing", () => {
  it("resolves cards accurately from the master cards catalog", () => {
    const index = MasterCardsIndex.getInstance(process.cwd());

    const champion = index.resolveCard("Champion of the Parish");
    expect(champion.name).toBe("Champion of the Parish");
    expect(champion.cmc).toBe(1);
    expect(champion.isLand).toBe(false);
    expect(champion.oracleId).toBeDefined();

    // Case-insensitive
    const dauntless = index.resolveCard("dauntless bodyguard");
    expect(dauntless.name).toBe("Dauntless Bodyguard");
    expect(dauntless.cmc).toBe(1);

    // Fuzzy matching with slight typo or variation
    const fuzzyGiant = index.resolveCard("Giant Killer // Chop Down");
    expect(fuzzyGiant.name).toBe("Giant Killer");

    // Unknown card fallback
    const unknown = index.resolveCard("Some Custom Card");
    expect(unknown.name).toBe("Some Custom Card");
    expect(unknown.cmc).toBe(1);
    expect(unknown.isLand).toBe(false);
  });

  it("handles empty API keys gracefully", async () => {
    const recognizer = new GeminiDeckPhotoRecognizer({
      projectRoot: process.cwd(),
      geminiKeys: [],
    });

    const buffer = Buffer.from("fake-image-bytes");
    const result = await recognizer.recognizeDeck(buffer, "image/jpeg");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("STORE_UNAVAILABLE");
    }
  });

  it("enriches deck data by segregating basic lands and sorting by mana curve", () => {
    const recognizer = new GeminiDeckPhotoRecognizer({
      projectRoot: process.cwd(),
      geminiKeys: ["fake-key"],
    });

    // Test private enrichDeckResult via casting to any
    const rawResult = {
      archetype: "Aggro Boros",
      cards: [
        { name: "Champion of the Parish", count: 2 },
        { name: "Dauntless Bodyguard", count: 1 },
        { name: "Plains", count: 2 }, // Basic land accidentally in cards list
      ],
      basicLands: {
        Plains: 8,
        Mountain: 7,
      },
      confidence: 0.95,
    };

    const enriched = recognizer.enrichDeckResult(rawResult);
    expect(enriched.archetype).toBe("Aggro Boros");
    expect(enriched.basicLands.Plains).toBe(10); // 8 + 2
    expect(enriched.basicLands.Mountain).toBe(7);
    expect(enriched.cards.length).toBe(2); // Only non-basics
    expect(enriched.cards[0]?.name).toBe("Champion of the Parish");
    expect(enriched.cards[0]?.count).toBe(2);
    expect(enriched.cards[1]?.name).toBe("Dauntless Bodyguard");
    expect(enriched.totalCount).toBe(20); // 3 non-basics + 17 lands
  });
});
