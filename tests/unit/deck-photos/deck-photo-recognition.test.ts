import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { MasterCardsIndex } from "../../../src/cards/master-cards-index.ts";
import { GeminiDeckPhotoRecognizer } from "../../../src/deck-photos/deck-photo-recognition.ts";

describe("Deck photo recognition and card indexing", () => {
  it("resolves a complete official title containing dots while rejecting unmatched truncated readings", () => {
    const index = new MasterCardsIndex(process.cwd());
    expect(index.findExactCard("Il était une fois...")?.name).toBe("Once Upon a Time");
    expect(index.findExactCard("Il était…")).toBeUndefined();
    expect(index.findExactCard("Réanimation...")).toBeUndefined();
    expect(index.findPhotoCard("Malcolm, navigateur attirant")?.name).toBe(
      "Malcolm, Alluring Scoundrel",
    );
    expect(index.findPhotoCard("Malcolm, séducteur attirant")?.name).toBe(
      "Malcolm, Alluring Scoundrel",
    );
    expect(index.findPhotoCard("Égouts de la Citerne")?.name).toBe("Undercity Sewers");
    expect(index.findPhotoCard("Persistence")?.name).toBe("Persist");
    expect(index.findPhotoCard("Malcolm, …")).toBeUndefined();
  });
  it("loads only French aliases and rejects ambiguous, empty, truncated or mismatched aliases", () => {
    const root = mkdtempSync(join(tmpdir(), "draftmaster-aliases-"));
    try {
      const directory = join(root, "data", "cards");
      mkdirSync(directory, { recursive: true });
      const cards = {
        one: { name: "Brainstorm", oracleId: "one", frenchName: "Remue-méninges", cmc: 1 },
        two: { name: "Omniscience", oracleId: "two", cmc: 10 },
      };
      writeFileSync(join(directory, "master-cards.json"), JSON.stringify({ cards }));
      const aliases = [
        {
          name: "Brainstorm",
          oracleId: "one",
          printedName: "Pensées tourbillonnantes",
          lang: "fr",
          scryfallId: "print-one",
        },
        {
          name: "Omniscience",
          oracleId: "two",
          printedName: "Science absolue",
          lang: "fr",
          scryfallId: "print-two",
        },
        {
          name: "Brainstorm",
          oracleId: "one",
          printedName: "渦まく知識",
          lang: "zhs",
          scryfallId: "print-three",
        },
        {
          name: "Brainstorm",
          oracleId: "one",
          printedName: "Titre partagé",
          lang: "fr",
          scryfallId: "print-four",
        },
        {
          name: "Omniscience",
          oracleId: "two",
          printedName: "Titre partagé",
          lang: "fr",
          scryfallId: "print-five",
        },
        {
          name: "Brainstorm",
          oracleId: "wrong",
          printedName: "Invalid identity",
          lang: "fr",
          scryfallId: "bad-print",
        },
        {
          name: "Not in catalog",
          oracleId: "one",
          printedName: "Unknown card",
          lang: "fr",
          scryfallId: "bad-print",
        },
      ];
      writeFileSync(
        join(directory, "printed-names.json"),
        JSON.stringify({ schemaVersion: 1, aliases }),
      );
      const index = new MasterCardsIndex(root);
      expect(index.findExactCard("Pensées tourbillonnantes")?.name).toBe("Brainstorm");
      expect(index.findExactCard("Science absolue")?.name).toBe("Omniscience");
      expect(index.findExactCard("渦まく知識")).toBeUndefined();
      expect(index.findExactCard("REMUE–MÉNINGES")?.name).toBe("Brainstorm");
      for (const title of [
        "Titre partagé",
        "別のカード",
        "???",
        "",
        "Remue-méninges…",
        "Île…",
        "Invalid identity",
        "Unknown card",
      ]) {
        expect(index.findExactCard(title), title).toBeUndefined();
      }
      expect(index.findExactCard("Île")?.name).toBe("Island");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses literal names but refuses a normalized collision between distinct cards", () => {
    const root = mkdtempSync(join(tmpdir(), "draftmaster-collisions-"));
    try {
      const directory = join(root, "data", "cards");
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(directory, "master-cards.json"),
        JSON.stringify({
          cards: { one: { name: "A-B", oracleId: "one" }, two: { name: "AB", oracleId: "two" } },
        }),
      );
      const index = new MasterCardsIndex(root);
      expect(index.findExactCard("A-B")?.oracleId).toBe("one");
      expect(index.findExactCard("AB")?.oracleId).toBe("two");
      expect(index.findExactCard("A B")).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
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
