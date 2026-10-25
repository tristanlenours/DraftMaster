import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateMasterCatalogJson } from "./card-catalog.ts";
import { cardNameToSlug, type MasterCardCatalog, type MasterCatalogCard } from "./types.ts";

/**
 * data/cards/items/*.json is the source of truth for card data; master-cards.json
 * is a build artifact derived from it. The only catalog-level fields that are not
 * derivable from the items live in this small versioned file.
 */
export interface CatalogMeta {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
}

export async function readCatalogMeta(path: string): Promise<CatalogMeta> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<CatalogMeta>;
  if (parsed.schemaVersion !== 1 || typeof parsed.generatedAt !== "string") {
    throw new Error(`Invalid catalog meta at ${path}`);
  }
  return { schemaVersion: 1, generatedAt: parsed.generatedAt };
}

/**
 * Builds the bundled catalog from the item files: cards keyed by Oracle ID, in item
 * file-name order, serialized exactly like the historical master-cards.json so the
 * output is deterministic and diff-identical.
 */
export async function buildMasterCatalog(
  itemsDir: string,
  meta: CatalogMeta,
): Promise<{ readonly catalog: MasterCardCatalog; readonly serialized: string }> {
  const files = (await readdir(itemsDir))
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

  const cards: Record<string, MasterCatalogCard> = {};
  const fileByOracleId = new Map<string, string>();
  for (const file of files) {
    const card = JSON.parse(await readFile(join(itemsDir, file), "utf8")) as MasterCatalogCard;
    const previous = fileByOracleId.get(card.oracleId);
    if (previous) {
      throw new Error(`Duplicate Oracle ID ${card.oracleId} in ${previous} and ${file}`);
    }
    fileByOracleId.set(card.oracleId, file);
    cards[card.oracleId] = card;
  }

  const document = {
    schemaVersion: meta.schemaVersion,
    generatedAt: meta.generatedAt,
    cardCount: files.length,
    cards,
  };
  const serialized = `${JSON.stringify(document, null, 2)}\n`;
  const validated = validateMasterCatalogJson(serialized);
  if (!validated.ok) {
    throw new Error(`${validated.error.message} ${JSON.stringify(validated.error.details)}`);
  }
  return { catalog: validated.value, serialized };
}

/**
 * For bulk generators: writes each card as its item file (the source of truth),
 * records `generatedAt` in catalog-meta.json, then rebuilds master-cards.json.
 */
export async function writeCardItems(
  projectRoot: string,
  cards: Iterable<MasterCatalogCard>,
  generatedAt: string,
): Promise<{ cardCount: number }> {
  const cardsDir = join(projectRoot, "data", "cards");
  await mkdir(join(cardsDir, "items"), { recursive: true });
  for (const card of cards) {
    const slug = card.slug ?? cardNameToSlug(card.name);
    await writeFile(
      join(cardsDir, "items", `${slug}.json`),
      `${JSON.stringify(card, null, 2)}\n`,
      "utf8",
    );
  }
  const meta: CatalogMeta = { schemaVersion: 1, generatedAt };
  await writeFile(
    join(cardsDir, "catalog-meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );
  return writeMasterCatalog(projectRoot);
}

/** Regenerates data/cards/master-cards.json under `projectRoot` (atomic write). */
export async function writeMasterCatalog(projectRoot: string): Promise<{ cardCount: number }> {
  const cardsDir = join(projectRoot, "data", "cards");
  const meta = await readCatalogMeta(join(cardsDir, "catalog-meta.json"));
  const { catalog, serialized } = await buildMasterCatalog(join(cardsDir, "items"), meta);
  const target = join(cardsDir, "master-cards.json");
  const temporary = `${target}.${String(process.pid)}.tmp`;
  await writeFile(temporary, serialized, "utf8");
  await rename(temporary, target);
  return { cardCount: catalog.cardCount };
}
