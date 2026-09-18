import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();

// Paths
const backupPath = resolve(rootDir, "data/untapped_history/drafts_backup.json");
const metaPath = resolve(rootDir, "data/untapped_history/card-metadata-v1.json");
const outputPath = resolve(rootDir, "data/power-rankings/untapped-reference-v2.json");

const appDataUntappedPath = process.env.APPDATA
  ? resolve(process.env.APPDATA, "untapped-companion/drafts.json")
  : null;

// Load backup drafts
const backupDrafts = existsSync(backupPath)
  ? JSON.parse(readFileSync(backupPath, "utf8"))
  : {};

// Load live drafts from untapped-companion if available
let liveDrafts = {};
if (appDataUntappedPath && existsSync(appDataUntappedPath)) {
  try {
    liveDrafts = JSON.parse(readFileSync(appDataUntappedPath, "utf8"));
    console.log(`[Untapped v2] Charge ${Object.keys(liveDrafts).length} drafts depuis ${appDataUntappedPath}`);
  } catch (err) {
    console.warn(`[Untapped v2] Impossible de lire ${appDataUntappedPath}:`, err.message);
  }
}

// Merge drafts, preferring live drafts if collision (more up-to-date)
const mergedDrafts = { ...backupDrafts, ...liveDrafts };
const totalDrafts = Object.keys(mergedDrafts).length;
console.log(`[Untapped v2] Total de drafts consolides : ${totalDrafts} (backup: ${Object.keys(backupDrafts).length}, nouveaux ajoutes: ${totalDrafts - Object.keys(backupDrafts).length})`);

// Also save back the merged drafts to drafts_backup.json so it is permanently preserved in the repo
writeFileSync(backupPath, JSON.stringify(mergedDrafts, null, 2), "utf8");
console.log(`[Untapped v2] drafts_backup.json mis a jour avec succes.`);

// Load metadata
const metadata = existsSync(metaPath)
  ? JSON.parse(readFileSync(metaPath, "utf8"))
  : {};

// Aggregate observations by normalized card name
const observationsByName = new Map();

for (const [draftId, draft] of Object.entries(mergedDrafts)) {
  const startTime = draft.startTime || 0;
  const isoDate = startTime ? new Date(startTime).toISOString() : null;

  for (const pick of draft.picks ?? []) {
    for (const [grpId, scorePair] of Object.entries(pick.PackScores ?? {})) {
      const staticScore = scorePair?.staticScore;
      if (typeof staticScore !== "number" || !Number.isFinite(staticScore)) continue;

      const cardMeta = metadata[grpId];
      const rawName = cardMeta?.name?.trim();
      if (!rawName) continue;
      const cardName = rawName.replace(/<\/?nobr>/gi, "").trim();

      const key = cardName.toLowerCase();
      const list = observationsByName.get(key) ?? [];
      list.push({
        name: cardName,
        rawScore: staticScore,
        roundedScore: Math.max(0, Math.min(55, Math.round(staticScore))),
        observedAt: isoDate,
        startTime,
        draftId,
      });
      observationsByName.set(key, list);
    }
  }
}

console.log(`[Untapped v2] Cartes distinctes observees : ${observationsByName.size}`);

// Process each card: sort by date ascending, take most recent
const scoresMap = {};
const cardDetails = [];

const sortedKeys = Array.from(observationsByName.keys()).sort();

for (const key of sortedKeys) {
  const obs = observationsByName.get(key);
  // Sort chronologically ascending
  obs.sort((a, b) => a.startTime - b.startTime);

  const canonicalName = obs[obs.length - 1].name;
  const latest = obs[obs.length - 1];

  const uniqueScores = new Set(obs.map((o) => o.roundedScore));
  const minRaw = Math.min(...obs.map((o) => o.rawScore));
  const maxRaw = Math.max(...obs.map((o) => o.rawScore));

  scoresMap[canonicalName] = latest.roundedScore;

  cardDetails.push({
    name: canonicalName,
    score: latest.roundedScore,
    rawScore: latest.rawScore,
    latestObservedAt: latest.observedAt,
    evidenceCount: obs.length,
    minScore: Math.max(0, Math.min(55, Math.round(minRaw))),
    maxScore: Math.max(0, Math.min(55, Math.round(maxRaw))),
    hasScoreDelta: uniqueScores.size > 1,
    history:
      uniqueScores.size > 1
        ? obs.map((o) => ({
            score: o.roundedScore,
            rawScore: o.rawScore,
            observedAt: o.observedAt,
            draftId: o.draftId,
          }))
        : undefined,
  });
}

const v2Payload = {
  schemaVersion: 2,
  referenceId: "untapped-reference-v2",
  generatedAt: new Date().toISOString(),
  description:
    "Referentiel Untapped v2 : scores statiques entiers (0 a 55) extraits directement des drafts MTG Arena. En cas de variation, le score chronologiquement le plus recent est retenu.",
  totalCards: cardDetails.length,
  totalDrafts,
  scores: scoresMap,
  cards: cardDetails,
};

writeFileSync(outputPath, JSON.stringify(v2Payload, null, 2), "utf8");
console.log(`[Untapped v2] Referentiel ecrit dans ${outputPath} (${cardDetails.length} cartes).`);
