import { test, expect, devices } from "@playwright/test";

/**
 * Aggregate amalgamation rooms — guest walk so nothing 500s before
 * mobile / boots-on-the-ground. Complements Device B smoke (write path).
 * Complexity: each visit is O(1) page load + local seed, not global N_u².
 */
test.describe.configure({ timeout: 45_000 });

const BROKEN = /Something went wrong|Page didn’t load|Page didn't load/;

async function enterGuest(page: import("@playwright/test").Page) {
  await page.goto("/welcome");
  const browse = page.getByRole("button", {
    name: /just browse the yard as a guest/i,
  });
  if (await browse.isVisible().catch(() => false)) {
    await browse.click();
    await expect(page).toHaveURL(/\/feed/);
    return;
  }
  await page.goto("/feed");
}

async function assertAlive(page: import("@playwright/test").Page) {
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toHaveText(BROKEN);
}

const ROOMS: { path: string; see: RegExp | string; guestGate?: boolean }[] = [
  { path: "/feed", see: /yard|tennessee state|home/i },
  { path: "/communities", see: /yards/i },
  { path: "/connect", see: /research first|projectconnect|cred/i },
  { path: "/search", see: /^search$/i },
  { path: "/hub", see: /content hub/i },
  { path: "/arcade", see: /yard arcade/i },
  { path: "/play", see: /arcade|playable/i },
  { path: "/focus", see: /meharry|focus/i },
  { path: "/clinyard", see: /clinyard/i },
  { path: "/faculty", see: /faculty|meet students/i },
  { path: "/leaderboard", see: /karma leaderboard/i },
  { path: "/wallet", see: /create a free account/i, guestGate: true },
  { path: "/messages", see: /create a free account/i, guestGate: true },
  { path: "/create", see: /create a free account/i, guestGate: true },
];

test.describe("amalgamation rooms (desktop guest)", () => {
  test("guest can open every campus room without a crash", async ({ page }) => {
    await enterGuest(page);
    await assertAlive(page);

    for (const room of ROOMS) {
      await page.goto(room.path);
      await assertAlive(page);
      if (room.guestGate) {
        await expect(
          page.getByRole("button", { name: /create free account/i }).first(),
        ).toBeVisible({ timeout: 15_000 });
      } else {
        await expect(page.getByText(room.see).first()).toBeVisible({
          timeout: 15_000,
        });
      }
    }
  });
});

test.describe("amalgamation rooms (phone guest)", () => {
  // Viewport only — spreading devices["iPhone 13"] sets defaultBrowserType and
  // Playwright forbids that inside a describe (forces a new worker).
  test.use({
    viewport: devices["iPhone 13"].viewport,
    userAgent: devices["iPhone 13"].userAgent,
    isMobile: true,
    hasTouch: true,
  });

  test("phone shell: Home Yards Connect stay tappable", async ({ page }) => {
    await enterGuest(page);
    await assertAlive(page);

    const home = page.getByRole("link", { name: /^home$/i }).first();
    const yards = page.getByRole("link", { name: /^yards$/i }).first();
    const connect = page.getByRole("link", { name: /^connect$/i }).first();
    await expect(home).toBeVisible({ timeout: 15_000 });
    await expect(yards).toBeVisible();
    await expect(connect).toBeVisible();

    await yards.click();
    await expect(page).toHaveURL(/\/communities/);
    await assertAlive(page);
    await expect(page.getByRole("heading", { name: /yards/i })).toBeVisible();

    await connect.click();
    await expect(page).toHaveURL(/\/connect/);
    await assertAlive(page);
  });

  test("phone: arcade + hub load (rooms off the yard)", async ({ page }) => {
    await enterGuest(page);
    await page.goto("/arcade");
    await assertAlive(page);
    await expect(page.getByText(/yard arcade/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.goto("/hub");
    await assertAlive(page);
    await expect(page.getByText(/content hub/i).first()).toBeVisible();
  });
});
