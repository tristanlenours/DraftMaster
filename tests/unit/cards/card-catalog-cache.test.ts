import { mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { CardCatalog } from "../../../src/cards/card-catalog.ts";

const masterCatalogPath = resolve(process.cwd(), "data/cards/master-cards.json");

/** A two-card copy of the real catalog: same schema, parsed in milliseconds. */
async function writeSmallCatalog(path: string): Promise<void> {
  const full = JSON.parse(await readFile(masterCatalogPath, "utf8")) as {
    cards: Record<string, unknown>;
  } & Record<string, unknown>;
  const cards = Object.fromEntries(Object.entries(full.cards).slice(0, 2));
  await writeFile(path, JSON.stringify({ ...full, cardCount: 2, cards }), "utf8");
}

describe("CardCatalog.fromFileCached", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  });

  it("shares one parsed catalog while the file is unchanged", async () => {
    const first = await CardCatalog.fromFileCached(masterCatalogPath);
    const second = await CardCatalog.fromFileCached(masterCatalogPath);

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.value).toBe(first.value);
  });

  it("reloads the catalog after the file changes on disk", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "catalog-cache-"));
    const copyPath = join(tempDir, "master-cards.json");
    await writeSmallCatalog(copyPath);

    const first = await CardCatalog.fromFileCached(copyPath);
    const later = new Date(Date.now() + 60_000);
    await utimes(copyPath, later, later);
    const second = await CardCatalog.fromFileCached(copyPath);

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.value).not.toBe(first.value);
  });

  it("does not cache a failed load", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "catalog-cache-"));
    const copyPath = join(tempDir, "master-cards.json");

    const missing = await CardCatalog.fromFileCached(copyPath);
    expect(missing.ok).toBe(false);

    await writeSmallCatalog(copyPath);
    const loaded = await CardCatalog.fromFileCached(copyPath);
    expect(loaded.ok).toBe(true);
  });
});
