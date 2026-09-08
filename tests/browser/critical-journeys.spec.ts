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
