import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const apply = process.argv.includes("--apply");
const check = process.argv.includes("--check");

function formatManaCost(parsedCost) {
  if (!Array.isArray(parsedCost) || parsedCost.length === 0) return "";
  const frontFace = parsedCost.includes("split")
    ? parsedCost.slice(parsedCost.lastIndexOf("split") + 1)
    : parsedCost;
  return [...frontFace]
    .reverse()
    .map((symbol) => `{${String(symbol).toUpperCase()}}`)
    .join("");
}

const cubeDirectories = await readdir(resolve(rootDir, "data", "cubes"), {
  withFileTypes: true,
});
const factsByOracleId = new Map();
for (const directory of cubeDirectories.filter((entry) => entry.isDirectory())) {
  const rawPath = resolve(rootDir, "data", "cubes", directory.name, "cubecobra-raw.json");
  const raw = JSON.parse(await readFile(rawPath, "utf8"));
  for (const entry of raw.cards?.mainboard ?? []) {
    const details = entry.details;
    if (!details?.oracle_id) continue;
    const existing = factsByOracleId.get(details.oracle_id);
    if (!existing || (!existing.oracle_text && details.oracle_text)) {
      factsByOracleId.set(details.oracle_id, details);
    }
  }
}

const itemDirectory = resolve(rootDir, "data", "cards", "items");
const itemFiles = (await readdir(itemDirectory)).filter((name) => name.endsWith(".json")).sort();
const repairs = [];

for (const fileName of itemFiles) {
  const path = resolve(itemDirectory, fileName);
  const card = JSON.parse(await readFile(path, "utf8"));
  const facts = factsByOracleId.get(card.oracleId);
  if (!facts) continue;

  const next = { ...card };
  const fields = [];
  if (next.oracleText === "" && typeof facts.oracle_text === "string" && facts.oracle_text !== "") {
    next.oracleText = facts.oracle_text;
    fields.push("oracleText");
  }
  if (!next.isLand && !next.manaCost) {
    const manaCost = formatManaCost(facts.parsed_cost);
    if (manaCost) {
      next.manaCost = manaCost;
      fields.push("manaCost");
    }
  }
  if ((!Number.isFinite(next.cmc) || next.cmc > 25) && Number.isFinite(facts.cmc)) {
    next.cmc = facts.cmc;
    fields.push("cmc");
  }
  if (fields.length > 0 && !next.scryfallId && facts.scryfall_id) {
    next.scryfallId = facts.scryfall_id;
    fields.push("scryfallId");
  }
  if (fields.length === 0) continue;

  repairs.push({ fileName, fields });
  if (apply) await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : check ? "check" : "dry-run",
      repairCount: repairs.length,
      repairs,
    },
    null,
    2,
  ),
);

if (check && repairs.length > 0) process.exitCode = 1;
