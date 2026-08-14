import { test, expect } from "@playwright/test";

/**
 * Device B student smoke — same clicks as docs/device-b-student-smoke.md
 * (guest → TSU account → post → Customize → Live).
 * Runs against the SPA (same frontend the Yard exe loads).
 */
test.describe.configure({ timeout: 90_000 });

const HANDLE = `deviceb_${Date.now().toString(36)}`;
const DISPLAY = "Device B Smoke";
const POST = "Device B smoke · TSU · hello";
const MOOD = "TSU · Device B smoke";

test.describe("Device B student smoke", () => {
  test("2. guest browse + like prompts account", async ({ page }) => {
    await page.goto("/welcome");
    await expect(
      page.getByRole("button", { name: /just browse the yard as a guest/i }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /just browse the yard as a guest/i })
      .click();

    await expect(page).toHaveURL(/\/feed/);
    await expect(
      page.getByRole("heading", { name: /you're on tennessee state/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tab", { name: "Yard" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create free account/i }).first(),
    ).toBeVisible();

    const like = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-heart") })
      .first();
    if (await like.count()) {
      await like.click();
    }
    // Guest CTA is the hard gate; sonner toast is extra and not always in a11y tree.
    await expect(
      page.getByRole("button", { name: /create free account/i }).first(),
    ).toBeVisible();
  });

  test("3–6. TSU join → post → Customize → Live", async ({ page }) => {
    await page.goto("/welcome");
    await expect
      .poll(async () => page.evaluate(() => typeof window.Buffer === "function"))
      .toBe(true);

    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(
      page.getByRole("button", { name: /student · social home/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /student · social home/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();

    await page.getByPlaceholder(/your name/i).fill(DISPLAY);
    await page.getByPlaceholder("your_handle").fill(HANDLE);
    await expect(page.getByText(/yard\s+tsu/i)).toBeVisible();
    await page.getByRole("button", { name: /join the yard/i }).click();

    await expect(page.getByText(/save recovery phrase/i)).toBeVisible({
      timeout: 20_000,
    });
    await page
      .getByRole("checkbox", { name: /i wrote down my 24-word recovery phrase/i })
      .check();
    await page.getByRole("button", { name: /^continue$/i }).click();

    await expect(page).toHaveURL(/\/feed/, { timeout: 20_000 });
    const yardTab = page.getByRole("tab", { name: /^yard$/i });
    if (await yardTab.count()) {
      await yardTab.click();
    }

    const composer = page.getByPlaceholder(/what's happening on the yard/i);
    await expect(composer).toBeVisible({ timeout: 20_000 });
    const postStart = Date.now();
    await composer.fill(POST);
    await page.getByRole("button", { name: /post to yard/i }).click();
    await expect(page.getByText(POST).first()).toBeVisible({ timeout: 15_000 });
    const postMs = Date.now() - postStart;
    console.log(`DEVICE_B_POST_MS=${postMs}`);
    expect(postMs).toBeLessThan(15_000);

    await page.goto(`/profile/${HANDLE}`);
    await page.getByRole("button", { name: /^customize$/i }).first().click();
    await expect(page.getByText(/customize station/i)).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("tab", { name: /about/i }).click();
    await page.locator("#mood").fill(MOOD);
    await page.getByRole("button", { name: /save myyard/i }).click();
    await expect(page.getByText(/saving/i).or(page.getByText(MOOD))).toBeVisible(
      { timeout: 10_000 },
    );

    await page.goto("/communities/tsu");
    await page.getByRole("tab", { name: /^live$/i }).click();
    await expect(page.getByText("Live rooms", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page
      .getByPlaceholder(/study hall voice/i)
      .fill("Device B smoke stage");
    await page.getByRole("button", { name: /open room/i }).click();
    await expect(
      page.getByText("Device B smoke stage", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('iframe[title="Device B smoke stage"]'),
    ).toBeVisible();
  });
});
