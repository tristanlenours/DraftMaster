import { expect, test, type Page } from "@playwright/test";

const LOBBY = {
  lobbyId: "global",
  generation: 0,
  revision: 0,
  status: "open",
  cubeKey: null,
  cubeLocked: false,
  activeSessionId: null,
  participants: [],
  seats: Array.from({ length: 8 }, () => null),
};

/** Serves a stub lobby and counts every lobby poll, optionally slowing each answer. */
async function countLobbyPolls(page: Page, delayMs = 0): Promise<{ count: () => number }> {
  let polls = 0;
  await page.route("**/api/multiplayer/lobby", async (route) => {
    polls++;
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ json: { ok: true, state: LOBBY } });
  });
  return { count: () => polls };
}

test("stops polling the multiplayer lobby once the view is left", async ({ page }) => {
  const polls = await countLobbyPolls(page);
  await page.goto("/multi");
  await expect.poll(() => polls.count()).toBeGreaterThanOrEqual(2);

  await page.locator("#nav-btn-cards").click();
  await expect(page.locator("#view-cards")).toBeVisible();
  const afterLeaving = polls.count();
  await page.waitForTimeout(2_500);
  expect(polls.count()).toBe(afterLeaving);

  // Coming back resumes polling.
  await page.locator("#nav-btn-multi").click();
  await expect.poll(() => polls.count()).toBeGreaterThan(afterLeaving + 1);
});

test("never stacks lobby requests when the server is slower than the poll interval", async ({
  page,
}) => {
  let inFlight = 0;
  let maxInFlight = 0;
  await page.route("**/api/multiplayer/lobby", async (route) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    inFlight--;
    await route.fulfill({ json: { ok: true, state: LOBBY } });
  });
  await page.goto("/multi");
  await page.waitForTimeout(4_000);
  expect(maxInFlight).toBe(1);
});
