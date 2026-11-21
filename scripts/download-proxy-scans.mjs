import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const rootDir = process.cwd();
const catalogPath = resolve(rootDir, "data", "cards", "proxy-scans.json");
const proxyDir = resolve(rootDir, "data", "cards", "images", "proxy");
const classicDir = join(proxyDir, "classic");
const originalDir = join(proxyDir, "original");

mkdirSync(classicDir, { recursive: true });
mkdirSync(originalDir, { recursive: true });

const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}

const limitArg = getArg("--limit", null);
const limit = limitArg ? Number.parseInt(limitArg, 10) : null;
const concurrency = Math.max(1, Math.min(8, Number.parseInt(getArg("--concurrency", "4"), 10)));
const isForce = args.includes("--force");

if (!existsSync(catalogPath)) {
  console.error("❌ data/cards/proxy-scans.json introuvable. Lancez d'abord : npm run proxy:curate");
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const entries = Object.values(catalog.entries || {});
const toProcess = limit !== null ? entries.slice(0, limit) : entries;

console.log(`📦 Téléchargement local des scans HD PNG (${toProcess.length} fiches)...`);

let downloaded = 0;
let skipped = 0;
let errors = 0;
let cursor = 0;

async function downloadFile(url, destPath) {
  if (!url) return false;
  if (!isForce && existsSync(destPath)) {
    skipped += 1;
    return false;
  }
  const res = await fetch(url, {
    headers: {
      "User-Agent": "DraftMaster/1.0 (proxy-scans-downloader)",
      Accept: "image/png,image/jpeg,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buf);
  downloaded += 1;
  return true;
}

async function worker() {
  while (cursor < toProcess.length) {
    const idx = cursor++;
    const entry = toProcess[idx];
    try {
      if (entry.classic?.pngUrl) {
        await downloadFile(entry.classic.pngUrl, join(classicDir, `${entry.slug}.png`));
      }
      if (entry.original?.pngUrl) {
        await downloadFile(entry.original.pngUrl, join(originalDir, `${entry.slug}.png`));
      }
    } catch (err) {
      errors += 1;
      console.error(`   ❌ ${entry.name}: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
console.log(`✅ Terminé : ${downloaded} téléchargés, ${skipped} déjà en cache, ${errors} erreurs.`);
