import { expect, test } from "@playwright/test";

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const BOLT_ORACLE_ID = "4457ed35-7c10-48c8-9776-456485fdf070";
const MPC_ID = "1AA85Rfe_Rg5hozPMOcHBJLxpwSgO4xUA";

test("an MPC Autofill render can be searched and assigned to a card", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const mpcSearches: string[] = [];
  const overrides: unknown[] = [];

  await page.route("**/api/proxy-scans/image**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG }),
  );
  await page.route("**/api/proxy-scans/mpc/image/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: ONE_PIXEL_PNG }),
  );
  await page.route("**/api/proxy-scans/mpc/search**", async (route) => {
    mpcSearches.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        query: "lightning bolt",
        candidates: [
          {
            identifier: MPC_ID,
            name: "Lightning Bolt (Borderless)",
            dpi: 1200,
            sizeBytes: 2000000,
            sourceName: "JohnPrime",
            language: "EN",
            tags: [],
            extension: "jpg",
          },
        ],
      }),
    });
  });
  await page.route("**/api/proxy-scans/override", async (route) => {
    overrides.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
  });
  await page.route("**/api/proxy-scans/prints**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, candidates: [] }),
    }),
  );
  await page.route("**/api/proxy-scans/catalog", (route) =>
    route.fulfill({
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
                isOfficialFrenchScan: true,
                needsFrenchProxyRender: false,
                score: 210,
              },
              original: null,
              curatedAt: "2026-11-21T17:00:00.000Z",
            },
          },
        },
      }),
    }),
  );

  await page.goto("/proxies");
  await page.locator("#proxy-search-input").fill("Lightning Bolt");
  const boltTile = page.locator(`.proxy-card-tile[data-oracle-id="${BOLT_ORACLE_ID}"]`);
  await expect(boltTile).toBeVisible();

  await boltTile.locator('button[data-action="picker"]').click();
  await expect(page.locator("#proxy-picker-modal")).toBeVisible();
  await page.locator("#proxy-picker-filter-select").selectOption("mpc");

  const option = page.locator(".proxy-mpc-option");
  await expect(option).toHaveCount(1);
  await expect(option).toContainText("1200 DPI");
  await expect(option).toContainText("JohnPrime");
  // A 1-pixel thumbnail has no M15 frame: the render is flagged as staying in English.
  await expect(option.locator(".proxy-mpc-fr-status")).toHaveText(/VO/u);
  expect(mpcSearches[0]).toContain("q=Lightning+Bolt");

  await option.locator('button[data-assign="original"]').click();
  await expect(page.locator("#proxy-picker-preview-meta")).toContainText("MPC 1200 DPI");
  await expect(page.locator("#proxy-picker-preview-meta")).toContainText("fond perdu MPC retiré");
  expect(overrides).toHaveLength(1);
  expect(overrides[0]).toMatchObject({
    oracleId: BOLT_ORACLE_ID,
    original: {
      source: "mpc",
      pngUrl: `/api/proxy-scans/mpc/image/${MPC_ID}?size=full`,
    },
  });

  await page.locator("#proxy-picker-close-btn").click();
  await expect(boltTile).toContainText("MPC HD");
  expect(browserErrors).toEqual([]);
});
