import { copyFile, mkdtemp, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { CardCatalog } from "../../../src/cards/card-catalog.ts";

const masterCatalogPath = resolve(process.cwd(), "data/cards/master-cards.json");

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
    await copyFile(masterCatalogPath, copyPath);

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

    await copyFile(masterCatalogPath, copyPath);
    const loaded = await CardCatalog.fromFileCached(copyPath);
    expect(loaded.ok).toBe(true);
  });
});
