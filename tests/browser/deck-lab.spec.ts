import { expect, test } from "@playwright/test";

test("rate and pimp a pasted pool on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 812 });
  await page.goto("/");
  await page.locator("#mobile-menu-btn").click();
  await page.locator("#mobile-nav-deck-lab").click();
  await expect(page).toHaveURL(/\/deck-lab$/u);
  await expect(page.getByRole("heading", { name: "Rate my deck · Pimp my deck" })).toBeVisible();
  await expect(page.locator("#deck-lab-cube option")).not.toHaveCount(1);
  await page.locator("#deck-lab-cube").selectOption("titou_tribal");
  await page
    .locator("#deck-lab-text")
    .fill("Deck\n23 Lightning Bolt\n17 Mountain\nSideboard\n5 Counterspell");

  await page.getByRole("button", { name: "Rate my deck", exact: true }).click();
  await expect(page.locator("#deck-lab-result .deck-lab-score")).toContainText("/100");
  await expect(page.locator("#deck-lab-result .deck-lab-axis")).toHaveCount(5);
  await expect(page.locator("#deck-lab-result .deck-lab-evidence")).toContainText("Lightning Bolt");
  await expect(page.locator("#deck-lab-result .deck-lab-audit")).toContainText("Détail du score");
  await expect(page.locator("#deck-lab-result .deck-lab-provenance")).toContainText(
    "coach-context@1",
  );

  await page.locator("#deck-lab-text").fill("Deck\n45 Lightning Bolt");
  await page.getByRole("button", { name: "Pimp my deck", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Cartes retenues/u })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Cartes écartées/u })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copier la liste (format MTGA)" })).toBeVisible();
  await page.locator("#global-lang-fr").click();
  await expect(page.locator(".deck-lab-basics")).toContainText("Montagne");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("the desktop navigation opens Rate and Pimp", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.locator("#nav-btn-deck-lab").click();
  await expect(page).toHaveURL(/\/deck-lab$/u);
  await expect(page.getByRole("heading", { name: "Rate my deck · Pimp my deck" })).toBeVisible();
});

test("pimp distinguishes additions, removals and the copied final deck", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/deck-lab");
  await page.locator("#deck-lab-cube").selectOption("titou_tribal");
  await page
    .locator("#deck-lab-text")
    .fill("Deck\n20 Lightning Bolt\n20 Mountain\nSideboard\n5 Black Lotus");
  await page.getByRole("button", { name: "Pimp my deck", exact: true }).click();
  const additions = page
    .locator(".deck-lab-card-list")
    .filter({ hasText: "À ajouter au maindeck" });
  const retained = page.locator(".deck-lab-card-list").filter({ hasText: "Cartes retenues" });
  const removals = page.locator(".deck-lab-card-list").filter({ hasText: "À retirer du maindeck" });
  await expect(additions).toContainText("5 × Black Lotus");
  await expect(retained).not.toContainText("Black Lotus");
  await expect(removals).toContainText("Mountain");
  await page.getByRole("button", { name: "Copier la liste (format MTGA)" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("5 Black Lotus");
});

test("a cube without a ready synergy profile gives a clearly limited rating", async ({
  request,
}) => {
  const response = await request.post("/api/deck-lab/analyze", {
    data: {
      cubeKey: "hugues_pauper",
      mode: "rate",
      text: "Deck\n23 Lightning Bolt\n17 Mountain",
    },
  });
  expect(response.status()).toBe(200);
  const result = (await response.json()) as {
    context: { coverage: string; provenance: { source: string; catalogCardCount: number } };
    warnings: string[];
  };
  expect(result.context.coverage).toBe("catalog_only");
  expect(result.context.provenance.source).toBe("catalog-only");
  expect(result.context.provenance.catalogCardCount).toBeGreaterThan(0);
  expect(result.warnings.join(" ")).toMatch(/pas de snapshot valide/iu);

  const arenaResponse = await request.post("/api/deck-lab/analyze", {
    data: {
      cubeKey: "titou_arena_peasant_plus",
      mode: "rate",
      text: "Deck\n23 Lightning Bolt\n17 Mountain",
    },
  });
  expect(arenaResponse.status()).toBe(200);
  const arenaResult = (await arenaResponse.json()) as {
    context: { coverage: string; provenance: { source: string; snapshotSha256: string } };
    warnings: string[];
  };
  expect(arenaResult.context.coverage).toBe("basic");
  expect(arenaResult.context.provenance.source).toBe("snapshot-catalog");
  expect(arenaResult.context.provenance.snapshotSha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(arenaResult.warnings.join(" ")).toMatch(/profil de synergie.*pas prêt/iu);
});

test("a photo populates editable MTGA text before rating", async ({ page }) => {
  await page.route("**/api/tournaments/recognize-deck", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        archetype: "Mono Red",
        cards: [{ name: "Lightning Bolt", count: 22 }],
        basicLands: { Mountain: 17 },
        totalCount: 39,
      },
    });
  });
  await page.goto("/deck-lab");
  await page.locator("#deck-lab-cube").selectOption("titou_tribal");
  await page.locator("#deck-lab-photo").setInputFiles({
    name: "deck.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.locator("#deck-lab-status")).toContainText("Vérifiez chaque carte");
  const text = page.locator("#deck-lab-text");
  await expect(text).toHaveValue(/22 Lightning Bolt/u);
  await text.fill(`${await text.inputValue()}1 Counterspell\n`);
  await page.getByRole("button", { name: "Rate my deck", exact: true }).click();
  await expect(page.locator("#deck-lab-result .deck-lab-score")).toContainText("/100");
});
