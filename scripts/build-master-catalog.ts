// Rebuilds data/cards/master-cards.json (a build artifact, not versioned) from the
// source of truth, data/cards/items/*.json. Runs on install, build and start.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { writeMasterCatalog } from "../src/cards/master-catalog-build.ts";

const projectRoot = process.cwd();

if (!existsSync(resolve(projectRoot, "data", "cards", "items"))) {
  // e.g. a dependency-only install layer: the build or start step will generate it.
  console.log("[cards:build] data/cards/items not present yet, skipped.");
} else {
  const { cardCount } = await writeMasterCatalog(projectRoot);
  console.log(
    `[cards:build] data/cards/master-cards.json rebuilt from ${String(cardCount)} items.`,
  );
}
