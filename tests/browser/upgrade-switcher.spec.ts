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

test.describe("Card Upgrade Advisor and Bidirectional Switcher", () => {
  test("switches fluidly back and forth between cube card and proposed replacement in modal", async ({
    page,
  }) => {
    await emulateCleanDeploymentImages(page);
    await page.goto("/cards");
    await expect(page.locator("#view-cards")).toBeVisible();

    // Select Titou Tribal cube
    await page.selectOption("#cube-select", "titou_tribal");

    // Activate upgrade filter
    await page.locator("#upgrade-filter-btn").click();
    await expect(page.locator("#upgrade-filter-btn")).toHaveClass(/active/);

    // Search for Battle Cry Goblin
    await page.locator("#card-search-input").fill("Battle Cry Goblin");
    const goblinCard = page.locator(".card-matrix-item", { hasText: "Battle Cry Goblin" }).first();
    await expect(goblinCard).toBeVisible();

    // Open detail modal
    await goblinCard.click();
    await expect(page.locator("#card-modal-backdrop")).toBeVisible();
    await expect(page.locator("#modal-upgrade-section")).toBeVisible();

    // 1. Initial State: Battle Cry Goblin is inspected
    await expect(page.locator("#modal-card-title")).toContainText("Battle Cry Goblin");
    await expect(page.locator("#modal-upgrade-curr-pane")).toHaveClass(/is-inspected/);
    await expect(page.locator("#modal-upgrade-curr-status")).toContainText("Affichée");
    await expect(page.locator("#modal-upgrade-sugg-status")).toContainText("Voir fiche");
    await expect(page.locator("#modal-upgrade-sugg-name")).toContainText("Gut, True Soul Zealot");
    await expect(page.locator("#modal-btn-inspect-upgrade")).toContainText(
      "Consulter la fiche de la remplaçante",
    );

    // 2. Click the suggested replacement pane to switch to Gut
    await page.locator("#modal-upgrade-sugg-pane").click();

    // Modal is now showing Gut, True Soul Zealot
    await expect(page.locator("#modal-card-title")).toContainText("Gut, True Soul Zealot");
    await expect(page.locator("#modal-upgrade-sugg-pane")).toHaveClass(/is-inspected/);
    await expect(page.locator("#modal-upgrade-sugg-status")).toContainText("Affichée");
    await expect(page.locator("#modal-upgrade-curr-status")).toContainText("Voir fiche");
    await expect(page.locator("#modal-btn-inspect-upgrade")).toContainText(
      "Revenir à la carte en place",
    );

    // 3. Click the center swap arrow button to swap back
    await page.locator("#modal-btn-swap-arrow").click();

    // Modal is now back to Battle Cry Goblin
    await expect(page.locator("#modal-card-title")).toContainText("Battle Cry Goblin");
    await expect(page.locator("#modal-upgrade-curr-pane")).toHaveClass(/is-inspected/);
    await expect(page.locator("#modal-upgrade-curr-status")).toContainText("Affichée");

    // Close modal
    await page.locator("#modal-close-btn").click();
    await expect(page.locator("#card-modal-backdrop")).toBeHidden();

    // 4. Switch to Maybeboard view
    await page.locator("#btn-view-maybeboard").click();
    await expect(page.locator("#btn-view-maybeboard")).toHaveClass(/active/);

    // Search a curated direct replacement in Maybeboard
    await page.locator("#card-search-input").fill("Fiery Confluence");
    const maybeCard = page.locator(".card-matrix-item", { hasText: "Fiery Confluence" }).first();
    await expect(maybeCard).toBeVisible();

    // Open Fiery Confluence directly from Maybeboard
    await maybeCard.click();
    await expect(page.locator("#card-modal-backdrop")).toBeVisible();
    await expect(page.locator("#modal-upgrade-section")).toBeVisible();

    // Fiery Confluence is inspected, with Act of Treason linked in left pane
    await expect(page.locator("#modal-card-title")).toContainText("Fiery Confluence");
    await expect(page.locator("#modal-upgrade-sugg-pane")).toHaveClass(/is-inspected/);
    await expect(page.locator("#modal-upgrade-sugg-status")).toContainText("Affichée");
    await expect(page.locator("#modal-upgrade-curr-pane")).not.toHaveClass(/is-inspected/);
    await expect(page.locator("#modal-upgrade-curr-name")).toContainText("Act of Treason");

    // Check multi-targets chips container is visible
    await expect(page.locator("#modal-upgrade-multi-targets-wrap")).toBeVisible();
    const alternateTargetChip = page
      .locator("#modal-upgrade-multi-targets-chips .btn-target-chip", {
        hasText: "Brimstone Volley",
      })
      .first();
    await expect(alternateTargetChip).toBeVisible();

    // Click the alternate target chip to change comparison target
    await alternateTargetChip.click();
    await expect(page.locator("#modal-upgrade-curr-name")).toContainText("Brimstone Volley");

    // Click bottom button to navigate directly to Brimstone Volley
    await page.locator("#modal-btn-inspect-upgrade").click();

    // Now viewing Brimstone Volley
    await expect(page.locator("#modal-card-title")).toContainText("Brimstone Volley");
    await expect(page.locator("#modal-upgrade-curr-pane")).toHaveClass(/is-inspected/);
    await expect(page.locator("#modal-upgrade-curr-status")).toContainText("Affichée");
  });

  test("guarantees cards in AI maybeboard are strictly absent from main cube view and vice-versa", async ({
    page,
  }) => {
    await emulateCleanDeploymentImages(page);
    await page.goto("/cards");
    await expect(page.locator("#view-cards")).toBeVisible();

    await page.selectOption("#cube-select", "titou_tribal");

    // 1. In Cube Mode: Fiery Confluence (an AI maybeboard card) must NOT be found in main cube list
    await page.locator("#btn-view-cube-cards").click();
    await expect(page.locator("#btn-view-cube-cards")).toHaveClass(/active/);
    await page.locator("#card-search-input").fill("Fiery Confluence");
    await expect(page.locator(".card-matrix-item")).toHaveCount(0);
    await expect(page.locator("#results-stats")).toContainText("0 carte");

    // 2. In Maybeboard Mode: Act of Treason (a main cube card) must NOT be found in AI maybeboard
    await page.locator("#btn-view-maybeboard").click();
    await expect(page.locator("#btn-view-maybeboard")).toHaveClass(/active/);
    await page.locator("#card-search-input").fill("Act of Treason");
    await expect(page.locator(".card-matrix-item")).toHaveCount(0);
    await expect(page.locator("#results-stats")).toContainText("0 carte");

    // 3. And Fiery Confluence IS found in Maybeboard Mode
    await page.locator("#card-search-input").fill("Fiery Confluence");
    await expect(page.locator(".card-matrix-item")).toHaveCount(1);
    await expect(page.locator(".card-matrix-item", { hasText: "Fiery Confluence" })).toBeVisible();

    // 4. And Act of Treason IS found in Cube Mode
    await page.locator("#btn-view-cube-cards").click();
    await page.locator("#card-search-input").fill("Act of Treason");
    await expect(page.locator(".card-matrix-item")).toHaveCount(1);
    await expect(page.locator(".card-matrix-item", { hasText: "Act of Treason" })).toBeVisible();
  });

  test("renders Malevolent Rumble in the A+ row in Huge's Pauper Cube maybeboard view", async ({
    page,
  }) => {
    await emulateCleanDeploymentImages(page);
    await page.goto("/cards");
    await expect(page.locator("#view-cards")).toBeVisible();

    await page.selectOption("#cube-select", "hugues_pauper");

    // Switch to Maybeboard Mode
    await page.locator("#btn-view-maybeboard").click();
    await expect(page.locator("#btn-view-maybeboard")).toHaveClass(/active/);
    await expect(page.locator("#results-stats .stats-filter-tag")).toHaveCount(0);
    await expect(page.locator("#results-stats")).toHaveText(/\d+ cartes suggérées/);

    // In the desktop table, find the A+ tier row
    const aPlusRow = page.getByRole("row", { name: /A\+/ });
    await expect(aPlusRow).toBeVisible();

    // Verify Malevolent Rumble is present inside the A+ tier row
    const rumbleCard = aPlusRow.locator(".card-matrix-item", { hasText: "Malevolent Rumble" });
    await expect(rumbleCard).toBeVisible();

    // Also verify Troll of Khazad-dûm is inside the A+ tier row
    const trollCard = aPlusRow.locator(".card-matrix-item", { hasText: "Troll of Khazad-dûm" });
    await expect(trollCard).toBeVisible();
  });

  test("keeps the desktop card preview anchored while the pointer crosses card text", async ({
    page,
  }) => {
    await emulateCleanDeploymentImages(page);
    await page.goto("/cards");
    await page.selectOption("#cube-select", "hugues_pauper");

    const cardName = page.locator(".card-matrix-item .card-item-name").first();
    await cardName.scrollIntoViewIfNeeded();
    const nameBox = await cardName.boundingBox();
    expect(nameBox).not.toBeNull();
    if (!nameBox) return;

    await page.mouse.move(nameBox.x + 2, nameBox.y + nameBox.height / 2);
    const popover = page.locator("#card-hover-popover");
    await expect(popover).toBeVisible();
    await page.waitForTimeout(100);
    const initialPosition = await popover.evaluate((element) => ({
      left: element.style.left,
      top: element.style.top,
    }));

    await page.mouse.move(nameBox.x + nameBox.width - 2, nameBox.y + nameBox.height / 2, {
      steps: 4,
    });
    await page.waitForTimeout(100);

    await expect(popover).toBeVisible();
    await expect
      .poll(() =>
        popover.evaluate((element) => ({ left: element.style.left, top: element.style.top })),
      )
      .toEqual(initialPosition);
    await expect
      .poll(() => popover.evaluate((element) => getComputedStyle(element).pointerEvents))
      .toBe("none");
  });
});

test.describe("AI Maybeboard on mobile", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });

  test("keeps navigation compact and localizes visible suggestions from the global preference", async ({
    page,
  }) => {
    await emulateCleanDeploymentImages(page);
    await page.route("https://api.scryfall.com/cards/search?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              name: "Fiery Confluence",
              printed_name: "Confluence ardente",
              printed_text:
                "Choisissez trois modes. Vous pouvez choisir le même mode plusieurs fois.",
              image_uris: {
                normal: "https://cards.scryfall.io/normal/ajani-fr.png",
                large: "https://cards.scryfall.io/large/ajani-fr.png",
              },
            },
          ],
        }),
      });
    });

    await page.goto("/cards");
    await page.selectOption("#cube-select", "titou_tribal");
    await page.locator("#btn-view-maybeboard").tap();
    await page.locator("#card-search-input").fill("Fiery Confluence");
    await page.locator("#global-lang-fr").tap();

    const mobileCard = page.locator(".lg-card-row").first();
    await expect(mobileCard).toContainText("Confluence ardente");
    await expect
      .poll(() => mobileCard.evaluate((element) => element instanceof HTMLButtonElement))
      .toBe(true);
    const mobileCardBox = await mobileCard.boundingBox();
    expect(mobileCardBox).not.toBeNull();
    expect(mobileCardBox?.height).toBeGreaterThanOrEqual(44);
    await mobileCard.locator(".lg-card-name").tap();

    await expect(page.locator("#card-modal-backdrop")).toBeVisible();
    await expect(page.locator("#modal-card-title")).toContainText("Confluence ardente");
    await expect(page.locator("#modal-hero-tier-card")).toHaveClass(/tier-a/);
    await expect(page.locator("#modal-upgrade-curr-name")).toContainText("Acte de trahison");
    await expect(page.locator("#modal-upgrade-sugg-name")).toContainText("Confluence ardente");

    await page.locator("#lang-btn-en").tap();
    await expect(page.locator("#modal-upgrade-curr-name")).toContainText("Act of Treason");
    await expect(page.locator("#modal-upgrade-sugg-name")).toContainText("Fiery Confluence");
    await page.locator("#lang-btn-fr").tap();
    await expect(page.locator("#modal-upgrade-sugg-name")).toContainText("Confluence ardente");

    const imageBox = await page.locator(".card-image-container").boundingBox();
    expect(imageBox).not.toBeNull();
    expect(imageBox?.width).toBeLessThanOrEqual(220);

    const currentPane = await page.locator("#modal-upgrade-curr-pane").boundingBox();
    const targetPane = await page.locator("#modal-upgrade-sugg-pane").boundingBox();
    expect(currentPane).not.toBeNull();
    expect(targetPane).not.toBeNull();
    if (currentPane && targetPane) {
      expect(Math.abs(currentPane.x - targetPane.x)).toBeLessThanOrEqual(1);
      expect(targetPane.y).toBeGreaterThan(currentPane.y + currentPane.height);
    }

    const tierBorderColor = await page
      .locator("#modal-hero-tier-card")
      .evaluate((element) => getComputedStyle(element).borderColor);
    expect(tierBorderColor).toBe("rgb(168, 85, 247)");

    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(360);
  });
});
