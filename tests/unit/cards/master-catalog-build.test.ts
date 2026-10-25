import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildMasterCatalog, readCatalogMeta } from "../../../src/cards/master-catalog-build.ts";

const rootDir = process.cwd();
const itemsDir = resolve(rootDir, "data/cards/items");

describe("buildMasterCatalog", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  });

  it("keeps master-cards.json on disk identical to a fresh build from data/cards/items (npm run cards:build)", async () => {
    const meta = await readCatalogMeta(resolve(rootDir, "data/cards/catalog-meta.json"));
    const { serialized, catalog } = await buildMasterCatalog(itemsDir, meta);
    const committed = await readFile(resolve(rootDir, "data/cards/master-cards.json"), "utf8");

    expect(catalog.cardCount).toBe(Object.keys(catalog.cards).length);
    expect(serialized).toBe(committed);
  });

  it("orders cards by item file name and keys them by Oracle ID", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "master-build-"));
    const source = JSON.parse(
      await readFile(resolve(itemsDir, "lightning-bolt.json"), "utf8"),
    ) as Record<string, unknown>;
    await writeFile(
      join(tempDir, "zz-last.json"),
      JSON.stringify({
        ...source,
        oracleId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        slug: "zz-last",
      }),
    );
    await writeFile(
      join(tempDir, "aa-first.json"),
      JSON.stringify({
        ...source,
        oracleId: "00000000-0000-4000-8000-000000000000",
        slug: "aa-first",
      }),
    );

    const { catalog } = await buildMasterCatalog(tempDir, {
      schemaVersion: 1,
      generatedAt: "2026-10-25T00:00:00.000Z",
    });
    expect(Object.keys(catalog.cards)).toEqual([
      "00000000-0000-4000-8000-000000000000",
      "ffffffff-ffff-4fff-8fff-ffffffffffff",
    ]);
    expect(catalog.cardCount).toBe(2);
  });

  it("rejects two items that share an Oracle ID", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "master-build-"));
    await mkdir(tempDir, { recursive: true });
    const source = await readFile(resolve(itemsDir, "lightning-bolt.json"), "utf8");
    await writeFile(join(tempDir, "a.json"), source);
    await writeFile(join(tempDir, "b.json"), source);

    await expect(
      buildMasterCatalog(tempDir, { schemaVersion: 1, generatedAt: "2026-10-25T00:00:00.000Z" }),
    ).rejects.toThrow(/Duplicate Oracle ID/u);
  });
});
