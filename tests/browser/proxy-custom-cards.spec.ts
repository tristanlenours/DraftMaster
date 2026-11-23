import { expect, test } from "@playwright/test";

// 8x8 opaque PNG: big enough to decode everywhere, small enough to keep the test fast.
const ART_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR42mP8z8BQz0AEYBxVSF8AAD9pB/1tnJd/AAAAAElFTkSuQmCC",
  "base64",
);

test("a custom card can be created, validated, saved locally and printed", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.route("**/api/proxy-scans/catalog", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        catalog: { schemaVersion: 1, generatedAt: "", cardCount: 0, entries: {} },
      }),
    });
  });
  await page.route("**/api/proxy-scans/symbol/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>',
    });
  });

  await page.goto("/proxies");
  await expect(page.locator("#view-proxies")).toBeVisible();

  await page.locator("#proxy-btn-new-custom").click();
  await expect(page.locator("#proxy-custom-modal")).toBeVisible();

  // Saving without an image, a name or a type is refused with explanations.
  await page.locator("#proxy-custom-save-btn").click();
  await expect(page.locator("#proxy-custom-errors")).toBeVisible();
  await expect(page.locator("#proxy-custom-errors")).toContainText("nom");
  await expect(page.locator("#proxy-custom-errors")).toContainText("visuel");

  await page.locator("#proxy-custom-file").setInputFiles({
    name: "illustration.png",
    mimeType: "image/png",
    buffer: ART_PNG,
  });
  await page.locator('input[name="proxy-custom-mode"][value="art"]').check();
  await page.locator("#proxy-custom-name").fill("Rituel des cendres");
  await page.locator("#proxy-custom-mana").fill("1R");
  await page.locator("#proxy-custom-type").fill("Rituel");
  await page
    .locator("#proxy-custom-rules")
    .fill("Le Rituel des cendres inflige 3 blessures à chaque créature.");
  await expect(page.locator("#proxy-custom-preview")).toBeVisible();

  await page.locator("#proxy-custom-save-btn").click();
  await expect(page.locator("#proxy-custom-modal")).toBeHidden();
  await expect(page.locator(".proxy-custom-tile")).toHaveCount(1);
  await expect(page.locator(".proxy-custom-tile")).toContainText("Rituel des cendres");
  await expect(page.locator("#proxy-tray-count")).toContainText("1 carte sélectionnée");

  await page.locator("#proxy-btn-print-sheets").click();
  await expect(page.locator("#proxy-print-modal")).toBeVisible();
  await expect(page.locator(".proxy-a4-cell")).toHaveCount(1);
  await page.locator("#proxy-print-close-btn").click();

  // The library survives a reload (IndexedDB).
  await page.reload();
  await expect(page.locator(".proxy-custom-tile")).toHaveCount(1);

  expect(browserErrors).toEqual([]);
});
