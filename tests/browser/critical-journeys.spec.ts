import { expect, test, type Page } from "@playwright/test";

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function emulateCleanDeploymentImages(page: Page): Promise<void> {
  await page.route("**/data/cards/images/**", async (route) => {
    await route.fulfill({ status: 404, body: "missing from deployment" });
  });
  await page.route("https://cards.scryfall.io/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "image/png", body: onePixelPng });
  });
}

const moduleRoutes = [
  ["Accueil", "/", "#view-home"],
  ["Cubes", "/cubes", "#view-cubes"],
  ["Card Explorer", "/cards", "#view-cards"],
  ["Bots", "/bots", "#view-bots"],
  ["Draft Solo", "/draft", "#view-draft"],
  ["Records", "/records", "#view-records"],
  ["Administration", "/admin", "#view-admin"],
  ["Draft Multi", "/multi", "#view-multi"],
  ["Tournois", "/tournaments", "#view-tournaments"],
] as const;

for (const [moduleName, route, viewSelector] of moduleRoutes) {
  test(`${moduleName} boots without a browser error`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await page.goto(route);

    await expect(page.locator(viewSelector)).toBeVisible();
    expect(browserErrors).toEqual([]);
  });
}

test("Records opens the selected deck without exposing report shortcuts", async ({ page }) => {
  await page.route("**/api/leaderboard", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        entries: [
          {
            id: "record-browser-test",
            rank: 1,
            playerName: "Joueur",
            isHomologated: true,
            overallScore: 74,
            archetype: { label: "Golgari Splash U/R Control" },
            totalDurationSeconds: 306,
            occurredAt: "2026-09-08T00:00:00.000Z",
            reports: {
              walkthroughUrl: "/reports/test.html",
              boostersUrl: "/reports/test-boosters.html",
            },
            maindeckCards: [],
          },
        ],
      }),
    });
  });

  await page.goto("/records");

  await expect(page.locator(".btn-review-deck")).toHaveCount(1);
  await page.locator(".btn-review-deck").click();
  await expect(page.locator("#deck-review-backdrop")).toBeVisible();
  await expect(page.locator("#deck-review-modal-title")).toHaveText("Deck de Joueur");
  await expect(page.locator(".record-actions-group a")).toHaveCount(0);
  await page.locator("#deck-review-close-btn").click();
  await expect(page.locator("#deck-review-backdrop")).toBeHidden();
});

test("Card Explorer filters cards and opens a loadable card image", async ({ page }) => {
  await emulateCleanDeploymentImages(page);
  await page.goto("/cards");

  await expect(page.locator("#view-cards")).toBeVisible();
  await page.locator("#lang-chip-en").click();
  await page.locator("#card-search-input").fill("Ancient Tomb");

  const result = page.locator(".card-matrix-item");
  await expect(result).toHaveCount(1);
  await expect(result).toContainText("Ancient Tomb");
  await expect(result.locator(".card-item-score")).toHaveText("31");

  await result.press("Enter");
  await expect(page.locator("#card-modal-backdrop")).toBeVisible();
  await expect(page.locator("#modal-card-title")).toHaveText("Ancient Tomb");
  await expect
    .poll(() =>
      page.locator("#modal-card-image").evaluate((image: HTMLImageElement) => ({
        naturalWidth: image.naturalWidth,
        src: image.currentSrc.length > 0 ? image.currentSrc : image.src,
      })),
    )
    .toMatchObject({ naturalWidth: 1, src: /cards\.scryfall\.io/ });
});

test("Solo Draft Coach starts, displays 15 cards, and accepts the first pick", async ({ page }) => {
  await emulateCleanDeploymentImages(page);
  await page.goto("/draft");

  await expect(page.locator("#draft-lobby-stage")).toBeVisible();
  const startResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/draft/start") && response.request().method() === "POST",
  );
  await page.locator("#start-solo-draft-btn").click();
  const startPayload = (await (await startResponsePromise).json()) as {
    session: {
      currentBooster: {
        frenchImageUrl?: string;
        imageUrl?: string;
        instanceId: string;
      }[];
    };
  };

  const cards = page.locator(".booster-card-item");
  await expect(cards).toHaveCount(15);
  await expect(page.locator(".booster-card-item .card-info-footer")).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator(".booster-card-img")
        .evaluateAll(
          (images: HTMLImageElement[]) =>
            images.filter((image) => image.complete && image.naturalWidth > 0).length,
        ),
    )
    .toBe(15);

  const localizedCard = startPayload.session.currentBooster.find(
    (card) => card.frenchImageUrl && card.frenchImageUrl !== card.imageUrl,
  );
  expect(localizedCard).toBeDefined();
  if (!localizedCard?.frenchImageUrl) throw new Error("No localized card in seeded booster");
  await expect
    .poll(() =>
      page
        .locator(`.booster-card-item[data-instance-id="${localizedCard.instanceId}"] img`)
        .getAttribute("src"),
    )
    .toBe(localizedCard.frenchImageUrl);
  await page
    .locator(`.booster-card-item[data-instance-id="${localizedCard.instanceId}"] .card-zoom-btn`)
    .click();
  await expect(
    page.locator(`.booster-card-item[data-instance-id="${localizedCard.instanceId}"]`),
  ).not.toHaveClass(/selected-pick/);
  await expect(page.locator("#draft-confirm-pick-btn")).toBeDisabled();
  await expect(page.locator("#card-hover-popover")).toBeVisible();
  await expect
    .poll(() => page.locator("#popover-img").getAttribute("src"))
    .toBe(localizedCard.frenchImageUrl);
  await page.locator("#card-hover-close-btn").evaluate((button: HTMLButtonElement) => {
    button.click();
  });
  await expect(page.locator("#hud-direction")).toContainText("Nourri au bon lait de : TitouBot");

  await cards.first().click();
  await expect(page.locator("#draft-confirm-pick-btn")).toBeEnabled();
  await page.locator("#draft-confirm-pick-btn").click();

  await expect(page.locator("#pool-count-badge")).toHaveText("1 / 45");
  await expect(page.locator("#hud-pick-num")).toHaveText("Pick 2 / 15");
});

test.describe("Solo Draft Coach on mobile", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("selects with one tap and only enlarges from the zoom control", async ({ page }) => {
    await emulateCleanDeploymentImages(page);
    await page.goto("/draft");
    await page.locator("#start-solo-draft-btn").click();

    const firstCard = page.locator(".booster-card-item").first();
    await firstCard.tap();
    await expect(firstCard).toHaveClass(/selected-pick/);
    await expect(page.locator("#card-hover-popover")).toBeHidden();

    await firstCard.locator(".card-zoom-btn").tap();
    await expect(page.locator("#card-hover-popover")).toBeVisible();
    await expect(page.locator("#card-hover-close-btn")).toBeVisible();

    await page.locator("#card-hover-close-btn").tap();
    await expect(page.locator("#card-hover-popover")).toBeHidden();
    await expect(page.locator(".booster-card-item").nth(3)).toBeVisible();
  });
});

test.describe("Cubes view on mobile", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("presents responsive synthetic cards, selector pills, and mode switcher without horizontal body overflow", async ({
    page,
  }) => {
    await page.goto("/cubes");
    await expect(page.locator("#view-cubes")).toBeVisible();

    // Mobile controls & default cards view
    await expect(page.locator("#cubes-mobile-controls")).toBeVisible();
    await expect(page.locator("#btn-cubes-mode-cards")).toHaveClass(/active/);
    await expect(page.locator("#cubes-mobile-cards-view")).toBeVisible();
    await expect(page.locator(".cubes-comparison-table-wrap")).toBeHidden();

    // First card (Titou) is active by default
    const titouCard = page.locator('.cube-mobile-synth-card[data-cube-key="titou_tribal"]');
    await expect(titouCard).toBeVisible();

    // Select Nico's Candyshop via pill
    const nicoPill = page.locator('.cube-pill[data-pill-cube="nico_candyshop"]');
    await nicoPill.tap();
    await expect(nicoPill).toHaveClass(/active/);

    const nicoCard = page.locator('.cube-mobile-synth-card[data-cube-key="nico_candyshop"]');
    await expect(nicoCard).toBeVisible();
    await expect(titouCard).toBeHidden();

    // Detail panel reflects selected cube
    await expect(page.locator("#cube-detail-panel .cube-detail-name")).toContainText(
      "Nico's Vintage Candyshop",
    );

    // Switch to comparison table mode
    await page.locator("#btn-cubes-mode-table").tap();
    await expect(page.locator("#btn-cubes-mode-table")).toHaveClass(/active/);
    await expect(page.locator(".cubes-comparison-table-wrap")).toBeVisible();
    await expect(page.locator("#cubes-table-scroll-hint")).toBeVisible();
    await expect(page.locator("#cubes-mobile-cards-view")).toBeHidden();

    // Body scroll width does not overflow mobile viewport
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(390);
  });
});
