import { expect, test } from "@playwright/test";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const BOLT_ORACLE_ID = "4457ed35-7c10-48c8-9776-456485fdf070";

test("Studio Scans & Proxies renders dual variants, print picker, FR editor, and A4 sheets without errors", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.route("**/api/proxy-scans/image**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: ONE_PIXEL_PNG,
    });
  });

  await page.route("**/api/proxy-scans/catalog", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        catalog: {
          schemaVersion: 1,
          generatedAt: "2026-11-21T17:00:00.000Z",
          cardCount: 1,
          entries: {
            [BOLT_ORACLE_ID]: {
              oracleId: BOLT_ORACLE_ID,
              slug: "lightning-bolt",
              name: "Lightning Bolt",
              french: {
                name: "Foudre",
                typeLine: "Éphémère",
                rulesText: "La Foudre inflige 3 blessures à n'importe quelle cible.",
                source: "official_scryfall_fr",
                officialFrenchPrintExists: true,
              },
              classic: {
                scryfallId: "bolt-fr-classic",
                lang: "fr",
                setCode: "2x2",
                setName: "Double Masters 2022",
                collectorNumber: "117",
                releasedAt: "2022-07-08",
                artist: "Christopher Moeller",
                frame: "2015",
                frameEffects: [],
                borderColor: "black",
                promoTypes: [],
                fullArt: false,
                borderless: false,
                highresImage: true,
                imageStatus: "highres_scan",
                treatmentLabel: "Classique FR HD",
                pngUrl: "https://cards.scryfall.io/png/front/f/r/bolt-fr-classic.png",
                largeUrl: "https://cards.scryfall.io/large/front/f/r/bolt-fr-classic.jpg",
                artCropUrl: "https://cards.scryfall.io/art_crop/front/f/r/bolt-fr-classic.jpg",
                isOfficialFrenchScan: true,
                needsFrenchProxyRender: false,
                score: 210,
              },
              original: {
                scryfallId: "bolt-en-sld",
                lang: "en",
                setCode: "sld",
                setName: "Secret Lair Drop",
                collectorNumber: "86",
                releasedAt: "2020-07-15",
                artist: "Noah Bradley",
                frame: "2015",
                frameEffects: ["borderless"],
                borderColor: "borderless",
                fullArt: true,
                borderless: true,
                highresImage: true,
                imageStatus: "highres_scan",
                treatmentLabel: "Secret Lair (EN)",
                pngUrl: "https://cards.scryfall.io/png/front/s/l/bolt-en-sld.png",
                largeUrl: "https://cards.scryfall.io/large/front/s/l/bolt-en-sld.jpg",
                artCropUrl: "https://cards.scryfall.io/art_crop/front/s/l/bolt-en-sld.jpg",
                isOfficialFrenchScan: false,
                needsFrenchProxyRender: true,
                score: 280,
              },
              curatedAt: "2026-11-21T17:00:00.000Z",
            },
          },
        },
      }),
    });
  });

  await page.route("**/api/proxy-scans/prints**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        candidates: [
          {
            scryfallId: "bolt-en-sld",
            lang: "en",
            setCode: "sld",
            setName: "Secret Lair Drop",
            collectorNumber: "86",
            releasedAt: "2020-07-15",
            artist: "Noah Bradley",
            frame: "2015",
            frameEffects: ["borderless"],
            borderColor: "borderless",
            promoTypes: [],
            fullArt: true,
            borderless: true,
            highresImage: true,
            imageStatus: "highres_scan",
            treatmentLabel: "Secret Lair (EN)",
            pngUrl: "https://cards.scryfall.io/png/front/s/l/bolt-en-sld.png",
            largeUrl: "https://cards.scryfall.io/large/front/s/l/bolt-en-sld.jpg",
            isOfficialFrenchScan: false,
            needsFrenchProxyRender: true,
            score: 280,
          },
        ],
      }),
    });
  });

  await page.goto("/proxies");
  await expect(page.locator("#view-proxies")).toBeVisible();

  // Filter to Lightning Bolt
  await page.locator("#proxy-search-input").fill("Lightning Bolt");
  const boltTile = page.locator(`.proxy-card-tile[data-oracle-id="${BOLT_ORACLE_ID}"]`);
  await expect(boltTile).toBeVisible();
  await expect(boltTile).toContainText("Foudre");
  await expect(boltTile).toContainText("Scan FR Officiel");

  // Switch tile to Popular Original -> automatically activates Hybrid Proxy FR HD
  await boltTile.locator('button[data-variant="original"]').click();
  await expect(boltTile).toContainText("Secret Lair (EN)");
  await expect(boltTile).toContainText("Proxy FR HD");

  // Add to print tray and open A4 sheet preview
  await boltTile.locator('button[data-action="select"]').click();
  await expect(page.locator("#proxy-tray-count")).toContainText("1 carte sélectionnée");
  await page.locator("#proxy-btn-print-sheets").click();
  await expect(page.locator("#proxy-print-modal")).toBeVisible();
  await expect(page.locator(".proxy-a4-sheet")).toHaveCount(1);
  await expect(page.locator(".proxy-a4-cell")).toHaveCount(1);
  await page.locator("#proxy-print-close-btn").click();
  await expect(page.locator("#proxy-print-modal")).toBeHidden();

  // Open Print Picker & French Text Editor modal
  await boltTile.locator('button[data-action="picker"]').click();
  await expect(page.locator("#proxy-picker-modal")).toBeVisible();
  await expect(page.locator(".proxy-print-option")).toHaveCount(1);
  await page.locator("#proxy-picker-tab-french").click();
  await expect(page.locator("#proxy-fr-name-input")).toHaveValue("Foudre");
  await page.locator("#proxy-picker-close-btn").click();

  expect(browserErrors).toEqual([]);
});
