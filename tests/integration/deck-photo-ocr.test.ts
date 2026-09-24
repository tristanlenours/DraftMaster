import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GeminiDeckPhotoRecognizer } from "../../src/tournaments/deck-photo-recognition.ts";
import { loadActiveCubeSnapshot } from "../../src/cubes/load-active-snapshot.ts";

try {
  process.loadEnvFile();
} catch {}
try {
  process.loadEnvFile(".env.local");
} catch {}

const isLiveOcrEnabled =
  process.env.TEST_LIVE_OCR === "true" || process.env.TEST_LIVE_GEMINI === "true";
const hasSampleDeck = fs.existsSync(path.resolve(process.cwd(), "data/deck/1000018826.jpg"));
const rawKeys = process.env.GEMINI_API_KEYS ?? process.env.GEMINI_API_KEY ?? "";
const hasKeys = rawKeys.trim().length > 0;

describe("Test OCR Gemini - Reconnaissance deck physique d'exemple", () => {
  it("valide la structure enrichie et la résolution multilingue FR/EN des cartes de l'exemple", () => {
    const recognizer = new GeminiDeckPhotoRecognizer({
      projectRoot: process.cwd(),
      geminiKeys: ["mock-key"],
    });

    const enriched = recognizer.enrichDeckResult({
      archetype: "Azorius Tempo",
      cards: [
        { name: "Karakas", count: 1 },
        { name: "Teferi, Time Raveler", count: 1 },
        { name: "Retour au pays", count: 1 },
        { name: "Prairie éclatante", count: 1 },
        { name: "Plains", count: 8 },
      ],
      basicLands: { Plains: 0, Island: 7 },
      confidence: 0.95,
    });

    expect(enriched.archetype).toBe("Azorius Tempo");
    expect(enriched.basicLands.Plains).toBe(8);
    expect(enriched.basicLands.Island).toBe(7);
    expect(enriched.cards.some((c) => c.name === "Karakas")).toBe(true);
    expect(enriched.cards.some((c) => c.name === "Swords to Plowshares")).toBe(true);
    expect(enriched.cards.some((c) => c.name === "Vivid Meadow")).toBe(true);
  });

  it.runIf(isLiveOcrEnabled && hasSampleDeck && hasKeys)(
    "reconnaît avec précision les cartes du deck Azorius dans data/deck/1000018826.jpg",
    async () => {
      const rootDir = process.cwd();
      const imagePath = path.resolve(rootDir, "data/deck/1000018826.jpg");
      const imageBuffer = fs.readFileSync(imagePath);

      let candidateCardNames: string[] = [];
      const cubeRes = await loadActiveCubeSnapshot(rootDir, "titou_tribal");
      if (cubeRes.ok) {
        candidateCardNames = cubeRes.value.cards.map((c) => c.name);
      }

      const recognizer = new GeminiDeckPhotoRecognizer({
        projectRoot: rootDir,
        model: "gemini-3.5-flash",
      });

      const result = await recognizer.recognizeDeck(imageBuffer, "image/jpeg", {
        cubeKey: "titou_tribal",
        cubeName: "Titou Tribal",
        candidateCardNames,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const recognized = result.value;

      // 1. Archétype / Couleurs Azorius
      expect(recognized.archetype.toLowerCase()).toMatch(
        /azorius|blanc|bleu|white|blue|tempo|control|midrange/i,
      );

      // 2. Terrains de base : aucune couleur hors Azorius
      expect(recognized.basicLands.Mountain ?? 0).toBe(0);
      expect(recognized.basicLands.Swamp ?? 0).toBe(0);
      expect(recognized.basicLands.Forest ?? 0).toBe(0);

      // 3. Cartes clés attendues visibles sur la photo
      const recognizedNames = new Set(recognized.cards.map((c) => c.name.toLowerCase()));
      const keyStaples = [
        "karakas",
        "teferi, time raveler",
        "swords to plowshares",
        "path to exile",
        "soul warden",
        "archangel avacyn",
        "adeline, resplendent cathar",
        "day of judgment",
        "detention sphere",
        "paradise mantle",
        "tranquil cove",
        "vivid creek",
        "vivid meadow",
        "giant killer",
        "unsettled mariner",
        "elite guardmage",
        "maul of the skyclaves",
        "angelic destiny",
      ];

      let matchCount = 0;
      for (const staple of keyStaples) {
        if (recognizedNames.has(staple.toLowerCase())) {
          matchCount++;
        }
      }

      // Au moins 80% des cartes clés visibles doivent être identifiées
      const matchRate = matchCount / keyStaples.length;
      expect(matchRate).toBeGreaterThanOrEqual(0.8);

      // 4. Structure de chaque carte
      for (const card of recognized.cards) {
        expect(card.name).toBeTruthy();
        expect(typeof card.cmc).toBe("number");
        expect(card.count).toBeGreaterThanOrEqual(1);
        expect(card.imageUrl).toContain("http");
      }
    },
    60_000,
  );
});
