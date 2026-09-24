import fs from "node:fs";
import path from "node:path";
import { GeminiDeckPhotoRecognizer } from "../src/tournaments/deck-photo-recognition.ts";
import { loadActiveCubeSnapshot } from "../src/cubes/load-active-snapshot.ts";

try {
  process.loadEnvFile?.();
} catch {}
try {
  process.loadEnvFile?.(".env.local");
} catch {}

const rootDir = process.cwd();
const imagePath = path.resolve(rootDir, "data/deck/1000018826.jpg");

if (!fs.existsSync(imagePath)) {
  console.error("Fichier introuvable:", imagePath);
  process.exit(1);
}

const imageBuffer = fs.readFileSync(imagePath);
console.log(`Image chargée: ${imagePath} (${(imageBuffer.length / 1024 / 1024).toFixed(2)} Mo)`);

let candidateCardNames = [];
try {
  const cubeRes = await loadActiveCubeSnapshot(rootDir, "titou_tribal");
  if (cubeRes.ok) {
    candidateCardNames = cubeRes.value.cards.map((c) => c.name);
    console.log(`Candidats Cube Titou Tribal chargés: ${candidateCardNames.length} cartes.`);
  }
} catch (e) {
  console.log("Impossible de charger les cartes du cube:", e.message);
}

const recognizer = new GeminiDeckPhotoRecognizer({
  projectRoot: rootDir,
  model: "gemini-3.5-flash",
});

console.log("Lancement de la reconnaissance visuelle avec Gemini...");
const startTime = Date.now();
const result = await recognizer.recognizeDeck(imageBuffer, "image/jpeg", {
  cubeKey: "titou_tribal",
  cubeName: "Titou Tribal",
  candidateCardNames,
});

const duration = Date.now() - startTime;
console.log(`Reconnaissance terminée en ${duration} ms.`);

if (!result.ok) {
  console.error("Échec de la reconnaissance:", result.error);
  process.exit(1);
}

const recognized = result.value;
console.log("\n========================================");
console.log("       RÉSULTAT DE LA RECONNAISSANCE     ");
console.log("========================================");
console.log(`Archétype détecté : ${recognized.archetype}`);
console.log(`Confiance         : ${recognized.confidence ?? 0}`);
console.log(`Nombre de cartes  : ${recognized.totalCount}`);
console.log(`Terrains de base  :`, recognized.basicLands);
console.log("\nCartes reconnues :");
for (const card of recognized.cards) {
  const frPart = card.frenchName ? ` [FR: ${card.frenchName}]` : "";
  console.log(`  - (${card.count}x) ${card.name}${frPart} | CMC: ${card.cmc} | Type: ${card.typeLine}`);
}

// Vérification par rapport aux cartes physiques présentes sur la photo
const EXPECTED_CARDS = [
  "Karakas",
  "Paradise Mantle",
  "Tranquil Cove",
  "Vivid Creek",
  "Vivid Meadow",
  "Dauntless Bodyguard",
  "Giant Killer",
  "Path to Exile",
  "Soul Warden",
  "Swords to Plowshares",
  "Kabira Takedown",
  "Rona, Herald of Invasion",
  "Unsettled Mariner",
  "Watcher for Tomorrow",
  "Adeline, Resplendent Cathar",
  "Cosmogrand Zenith",
  "Detention Sphere",
  "Dragon's Hoard",
  "Maul of the Skyclaves",
  "Teferi, Time Raveler",
  "Angelic Destiny",
  "Day of Judgment",
  "Elite Guardmage",
  "Archangel Avacyn",
  "Dragonlord Ojutai",
  "Sanctuary Warden",
];

const recognizedNames = new Set(recognized.cards.map((c) => c.name.toLowerCase()));
const matched = [];
const missing = [];

for (const exp of EXPECTED_CARDS) {
  if (recognizedNames.has(exp.toLowerCase())) {
    matched.push(exp);
  } else {
    missing.push(exp);
  }
}

const accuracy = ((matched.length / EXPECTED_CARDS.length) * 100).toFixed(1);
console.log("\n========================================");
console.log(`  RAPPORT DE PRÉCISION : ${matched.length}/${EXPECTED_CARDS.length} (${accuracy}%)`);
console.log("========================================");
console.log("Cartes confirmées :");
for (const card of matched) {
  console.log(`  ✅ ${card}`);
}
if (missing.length > 0) {
  console.log("\nCartes non détectées :");
  for (const card of missing) {
    console.log(`  ⚠️  ${card}`);
  }
}
console.log("========================================\n");
