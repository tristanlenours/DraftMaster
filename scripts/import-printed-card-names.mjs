import { createHash } from "node:crypto";
import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { BASIC_LAND_IDENTITIES, importPrintedNames } from "../src/cards/import-printed-names.ts";

const args = process.argv.slice(2);
const all = args.includes("--all");
const cubeOffset = args.indexOf("--cube");
const cubeKey = cubeOffset < 0 ? "nico_candyshop" : args[cubeOffset + 1];
if (!all && (!cubeKey || cubeKey.startsWith("--")))
  throw new Error("Provide a cube key after --cube.");
const raw = await readFile(resolve("data/cards/master-cards.json"), "utf8");
const catalog = JSON.parse(raw);
const cards = Object.values(catalog.cards).filter(
  (card) => all || card.presentInCubes?.includes(cubeKey),
);
if (cards.length === 0) throw new Error("No catalog cards for the requested cube.");
if (cards.some((card) => typeof card.oracleId !== "string" || !card.oracleId))
  throw new Error("Catalog card missing oracle identity.");
const basics = Object.entries(BASIC_LAND_IDENTITIES).map(([name, oracleId]) => ({
  name,
  oracleId,
}));
const aliases = await importPrintedNames([...cards, ...basics], {
  onProgress: (completed, total) =>
    console.log(`Printed names: ${completed}/${total} card identities.`),
});
const dataset = {
  schemaVersion: 1,
  generator: "DraftMaster/import-printed-card-names@2",
  generatedAt: new Date().toISOString(),
  source: {
    name: "Scryfall",
    url: "https://api.scryfall.com/cards/search",
    method:
      "Batches of ten oracle IDs; lang:fr unique:prints; include_multilingual=true; all pages; French top-level and face printed_name; deduplicate identity/language/title. English canonical names remain in the master catalog.",
    attribution:
      "Scryfall API data; Magic: The Gathering card names, translations and related intellectual property belong to Wizards of the Coast. https://scryfall.com/docs/api",
    usage: {
      termsUrl: "https://scryfall.com/docs/api",
      licenseStatus: "No open-content license grant is assumed for card names or translations.",
      conditions:
        "Use is subject to Scryfall API data-use guidance and underlying rights; source attribution is not a license grant.",
    },
  },
  catalogSha256: createHash("sha256").update(raw).digest("hex"),
  cubeKeys: all
    ? [...new Set(cards.flatMap((card) => card.presentInCubes ?? []))].sort()
    : [cubeKey],
  cardCount: cards.length,
  languages: [...new Set(aliases.map((alias) => alias.lang))].sort(),
  aliases,
};
const output = resolve("data/cards/printed-names.json");
const temporary = `${output}.${process.pid}.tmp`;
try {
  await writeFile(temporary, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  await rename(temporary, output);
} finally {
  await rm(temporary, { force: true });
}
console.log(
  `Saved ${aliases.length} aliases in ${dataset.languages.length} languages to ${output}.`,
);
