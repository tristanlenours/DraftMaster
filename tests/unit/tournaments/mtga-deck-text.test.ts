import { describe, expect, it } from "vitest";

import { formatMtgaDeckText, parseMtgaDeckText } from "../../../src/web/mtga-deck-text.js";

describe("MTGA text for a tournament Deck déclaré", () => {
  it("lets a photo-derived list gain a missed card by editing one line", () => {
    const text = formatMtgaDeckText({
      deckName: "Azorius Tempo",
      cards: [{ name: "Karakas", count: 1 }],
      basicLands: { Plains: 8, Island: 7 },
    });

    const corrected = parseMtgaDeckText(`${text}1 Maul of the Skyclaves\n`);

    expect(corrected.cards).toEqual([
      { name: "Karakas", count: 1 },
      { name: "Maul of the Skyclaves", count: 1 },
    ]);
    expect(corrected.totalCount).toBe(17);
    expect(corrected.deckName).toBe("Azorius Tempo");
  });

  it("reads Arena sections, edition suffixes, duplicate lines and French basics", () => {
    const parsed = parseMtgaDeckText(
      "About\nName Azorius Draft\n\nDeck\n" +
        "1 Teferi, Time Raveler (WAR) 221\n" +
        "2 Teferi, Time Raveler\n" +
        "7 Île\n8 Plaine\n" +
        "\nSideboard\n2 Disdainful Stroke (KHM) 54\n",
    );

    expect(parsed.deckName).toBe("Azorius Draft");
    expect(parsed.cards).toEqual([{ name: "Teferi, Time Raveler", count: 3 }]);
    expect(parsed.basicLands).toMatchObject({ Plains: 8, Island: 7 });
    expect(parsed.sideboardCount).toBe(2);
    expect(parsed.totalCount).toBe(18);
  });

  it("rejects partial, malformed and empty lists without inventing cards", () => {
    expect(() =>
      parseMtgaDeckText("# Export MTGA partiel non importable\nDeck\n1 Karakas"),
    ).toThrow(/partiel/iu);
    expect(() => parseMtgaDeckText("Deck\n0 Karakas")).toThrow(/ligne 2/iu);
    expect(() => parseMtgaDeckText("Deck\nKarakas")).toThrow(/ligne 2/iu);
    expect(() => parseMtgaDeckText("Deck\n1 Karakas\nCommander\n1 Plains")).toThrow(/ligne 3/iu);
    expect(() => parseMtgaDeckText("Deck\n\nSideboard\n1 Karakas")).toThrow(/vide/iu);
  });

  it("preserves names and counts through export then import", () => {
    const input = {
      deckName: "Boros",
      cards: [
        { name: "Adeline, Resplendent Cathar", count: 2 },
        { name: "Dragon's Hoard", count: 1 },
      ],
      basicLands: { Plains: 8, Mountain: 7 },
    };
    const parsed = parseMtgaDeckText(formatMtgaDeckText(input));

    expect(parsed.cards).toEqual(input.cards);
    expect(parsed.basicLands.Plains).toBe(8);
    expect(parsed.basicLands.Mountain).toBe(7);
    expect(parsed.totalCount).toBe(18);
  });
});
