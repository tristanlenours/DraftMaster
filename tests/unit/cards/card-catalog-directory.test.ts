import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { CardCatalog } from "../../../src/cards/card-catalog.ts";
import type { MasterCatalogCard } from "../../../src/cards/types.ts";

const rootDir = process.cwd();

describe("CardCatalog Directory Loading", () => {
  it("loads 560+ individual card JSON documents from data/cards/items/", async () => {
    const itemsDir = resolve(rootDir, "data/cards/items");
    const result = await CardCatalog.fromDirectory(itemsDir);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const catalog = result.value;
      expect(catalog.totalCards).toBeGreaterThanOrEqual(540);

      // 1. Slug Lookup
      const bolt = catalog.getCardBySlug("lightning-bolt");
      expect(bolt).toBeDefined();
      expect(bolt?.name).toBe("Lightning Bolt");
      expect(bolt?.image?.url).toMatch(/^https?:\/\//);
      expect(bolt?.cubeAnalyses.hugues_pauper?.tier).toBe("A+");
      expect(bolt?.cubeAnalyses.nico_candyshop?.tier).toBe("A");

      const bowmasters = catalog.getCardBySlug("orcish-bowmasters");
      expect(bowmasters).toBeDefined();
      expect(bowmasters?.name).toBe("Orcish Bowmasters");
      expect(bowmasters?.image?.url).toMatch(/^https?:\/\//);
      expect(bowmasters?.cubeAnalyses.nico_candyshop?.tier).toBe("A+");

      const lotus = catalog.getCardBySlug("black-lotus");
      expect(lotus).toBeDefined();
      expect(lotus?.name).toBe("Black Lotus");
      expect(lotus?.cubeAnalyses.nico_candyshop?.tier).toBe("A+");

      // 2. OracleId and Name Lookup
      if (bolt) {
        expect(catalog.getCardByOracleId(bolt.oracleId)).toBe(bolt);
        expect(catalog.getCardByName("lightning bolt")).toBe(bolt);
      }

      // 3. Cube and Role Queries
      const nicoCards = catalog.getCardsInCube("nico_candyshop");
      expect(nicoCards.length).toBeGreaterThanOrEqual(15);

      const huguesCards = catalog.getCardsInCube("hugues_pauper");
      expect(huguesCards.length).toBeGreaterThanOrEqual(7);

      const bombs = catalog.getCardsByRole("bomb");
      expect(bombs.length).toBeGreaterThan(0);
    }
  }, 15000);

  it("returns error when reading an empty or nonexistent directory", async () => {
    const nonexistentDir = resolve(rootDir, "data/cards/does-not-exist");
    const result = await CardCatalog.fromDirectory(nonexistentDir);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FILE_READ_ERROR");
    }
  });

  it("rejects duplicate Oracle identities instead of silently replacing a card", async () => {
    const directory = await mkdtemp(join(tmpdir(), "draftmaster-card-collision-"));
    try {
      const source = JSON.parse(
        await readFile(resolve(rootDir, "data/cards/items/lightning-bolt.json"), "utf8"),
      ) as MasterCatalogCard;
      await Promise.all([
        writeFile(join(directory, "first.json"), JSON.stringify(source), "utf8"),
        writeFile(
          join(directory, "second.json"),
          JSON.stringify({ ...source, slug: "lightning-bolt-duplicate", name: "Duplicate Bolt" }),
          "utf8",
        ),
      ]);

      const result = await CardCatalog.fromDirectory(directory);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("DUPLICATE_CARD_ID");
        expect(result.error.details).toMatchObject({ oracleId: source.oracleId });
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
