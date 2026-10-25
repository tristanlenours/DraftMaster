import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GeminiDeckPhotoRecognizer } from "../../src/tournaments/deck-photo-recognition.ts";
import {
  nicoPhotoCorpus,
  readableNicoTitles,
} from "../fixtures/deck-photos/nico-candyshop/manifest.ts";
import { loadLocalEnvFiles } from "../../src/config/env-files.ts";

// The live check needs real provider keys; libraries no longer read .env files themselves.
if (process.env.TEST_LIVE_NICO_OCR === "true") loadLocalEnvFiles();

// Optional provider check: unlike offline title replay this sends the actual six crops.
describe.skipIf(process.env.TEST_LIVE_NICO_OCR !== "true")("Nico photos — live vision", () => {
  it.each(nicoPhotoCorpus.photos)(
    "reads every independently verified title from $file",
    async (photo) => {
      const { chromium } = await import("@playwright/test");
      const browser = await chromium.launch();
      let images: string[];
      try {
        const page = await browser.newPage();
        await page.setContent('<input type="file" id="photo">');
        await page
          .locator("#photo")
          .setInputFiles(`tests/fixtures/deck-photos/nico-candyshop/${photo.file}`);
        await page.addScriptTag({
          type: "module",
          content: `${readFileSync("src/web/deck-photo-upload.js", "utf8")}\nwindow.prepareDeckPhotoRegions = prepareDeckPhotoRegions;`,
        });
        images = await page.evaluate(async () => {
          const input = document.querySelector<HTMLInputElement>("#photo");
          const file = input?.files?.[0];
          if (!file) throw new Error("Photo fixture missing.");
          const prepare = Reflect.get(window, "prepareDeckPhotoRegions") as (
            image: File,
          ) => Promise<string[]>;
          return prepare(file);
        });
      } finally {
        await browser.close();
      }
      const recognizer = new GeminiDeckPhotoRecognizer();
      const result = await recognizer.recognizeDeck(
        images.map((image) => Buffer.from(image.split(",")[1] ?? "", "base64")),
        "image/jpeg",
        { cubeKey: nicoPhotoCorpus.cubeKey },
      );
      expect(result.ok, result.ok ? "" : result.error.message).toBe(true);
      if (!result.ok) return;
      const names = result.value.cards.map((card) => card.name);
      const expectedTitles = readableNicoTitles(photo.file);
      const matched = expectedTitles.filter(([, name]) => names.includes(name));
      const companionCount = result.value.cards
        .filter((card) => card.name === nicoPhotoCorpus.deckAudit.companion)
        .reduce((sum, card) => sum + (card.count ?? 1), 0);
      const mainDeckCount = result.value.totalCount - companionCount;
      const observation = {
        observedAt: new Date().toISOString(),
        photo: photo.file,
        sha256: photo.sha256,
        matched: matched.length,
        expectedReadableSubset: expectedTitles.length,
        cards: result.value.cards.map(({ name, count }) => ({ name, count: count ?? 1 })),
        totalCount: result.value.totalCount,
        companionCount,
        mainDeckCount,
        reference: nicoPhotoCorpus.deckAudit,
        missingReadableTitles: expectedTitles.filter(([, name]) => !names.includes(name)),
        additionalNames: names.filter(
          (name) => !expectedTitles.some(([, expected]) => name === expected),
        ),
        unverifiedTitles: result.value.unverifiedTitles,
        basicLands: result.value.basicLands,
      };
      console.info(JSON.stringify(observation));
      expect.soft(names).toEqual(expect.arrayContaining(expectedTitles.map(([, name]) => name)));
      // A full identity reference is still needed; the readable subset is incomplete.
      // This opt-in audit persists sanitized results even when the assertions fail.
      if (process.env.TEST_NICO_REQUIRE_40 === "true") {
        writeFileSync(
          `specs/013-multilingual-deck-photos/evidence/nico-live-${photo.file}.json`,
          `${JSON.stringify(observation, null, 2)}\n`,
        );
        expect.soft(companionCount).toBe(1);
        expect.soft(mainDeckCount).toBe(nicoPhotoCorpus.deckAudit.expectedMainDeckCount);
      }
    },
    180_000,
  );
});
