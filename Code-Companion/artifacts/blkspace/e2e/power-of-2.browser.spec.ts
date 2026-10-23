import { test, expect } from "@playwright/test";

/**
 * Live copy: BKSPC on Solana settles. BI9 is an Ethereum ERC-20 and is not deployed.
 */
test.describe("Canonical on-chain copy", () => {
  test("landing: BKSPC settles and BI9 is Ethereum", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("blkspace_first_run_complete", "true");
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /BK markets/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/ERC-20 on Ethereum/i)).toBeVisible();
    await expect(page.getByText(/not paid from WeixBucks/i)).toBeVisible();
    await expect(page.getByText(/not a paycheck/i).first()).toBeVisible();
    await expect(
      page.getByText(/optional student micro-settlement/i),
    ).toHaveCount(0);
  });

  test("wallet: on-chain pillar is Solana BKSPC", async ({ page }) => {
    const handle = `p2_${Date.now().toString(36)}`;
    await page.goto("/welcome");
    await expect
      .poll(async () =>
        page.evaluate(() => typeof window.Buffer === "function"),
      )
      .toBe(true);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /student · social home/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByPlaceholder(/your name/i).fill("Power of Two");
    await page.getByPlaceholder("your_handle").fill(handle);
    await page.getByRole("button", { name: /join the yard/i }).click();
    await expect(page.getByText(/get back in/i)).toBeVisible({
      timeout: 20_000,
    });
    await page.getByLabel(/^recovery password$/i).fill("power-of-2-ok");
    await page.getByLabel(/confirm password/i).fill("power-of-2-ok");
    await page.getByRole("button", { name: /save recovery password/i }).click();
    await expect(page).toHaveURL(/\/feed/, { timeout: 20_000 });

    await page.goto("/wallet");
    await expect(page.getByText("Solana · BKSPC")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/ERC-20 on Ethereum/i).first()).toBeVisible();
    await expect(page.getByText(/never automatically/i).first()).toBeVisible();
  });
});
