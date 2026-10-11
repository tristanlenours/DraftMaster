import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GeminiDeckPhotoRecognizer } from "../../src/tournaments/deck-photo-recognition.ts";
import {
  nicoPhotoCorpus,
  readableNicoTitles,
} from "../fixtures/deck-photos/nico-candyshop/manifest.ts";

// Optional provider check: unlike offline title replay this sends the actual six crops.
describe.skipIf(process.env.TEST_LIVE_NICO_OCR !== "true")("Nico photos — live vision", () => {
  it.each(nicoPhotoCorpus.photos)(
    "reads French anchors from $file",
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
      console.info(
        JSON.stringify({
          photo: photo.file,
          matched: matched.length,
          expectedReadableSubset: expectedTitles.length,
          cards: names,
          unverifiedTitles: result.value.unverifiedTitles,
          basicLands: result.value.basicLands,
        }),
      );
      expect(names).toEqual(
        expect.arrayContaining(["Serum Visions", "Mind Twist", "Vampiric Tutor", "Hullbreacher"]),
      );
    },
    180_000,
  );
});
