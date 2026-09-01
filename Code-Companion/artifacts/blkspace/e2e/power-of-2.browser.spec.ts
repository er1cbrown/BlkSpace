import { test, expect } from "@playwright/test";

/**
 * Live copy: BI9 ERC-20 on HyperEVM is the canonical on-chain token.
 */
test.describe("Canonical ERC-20 live copy", () => {
  test("landing: BI9 ERC-20 is the on-chain token", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("blkspace_first_run_complete", "true");
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /how the economy works/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /BI9 \(ERC-20\)/i })).toBeVisible();
    await expect(page.getByText(/Canonical on-chain token on HyperEVM/i)).toBeVisible();
    await expect(page.getByText(/WeixBucks do not auto-convert/i).first()).toBeVisible();
    await expect(page.getByText(/optional student micro-settlement/i)).toHaveCount(0);
  });

  test("wallet: on-chain pillar is HyperEVM BI9", async ({ page }) => {
    const handle = `p2_${Date.now().toString(36)}`;
    await page.goto("/welcome");
    await expect
      .poll(async () => page.evaluate(() => typeof window.Buffer === "function"))
      .toBe(true);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByRole("button", { name: /student · social home/i }).click();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.getByPlaceholder(/your name/i).fill("Power of Two");
    await page.getByPlaceholder("your_handle").fill(handle);
    await page.getByRole("button", { name: /join the yard/i }).click();
    await expect(page.getByText(/get back in/i)).toBeVisible({ timeout: 20_000 });
    await page.getByLabel(/^recovery password$/i).fill("power-of-2-ok");
    await page.getByLabel(/confirm password/i).fill("power-of-2-ok");
    await page.getByRole("button", { name: /save recovery password/i }).click();
    await expect(page).toHaveURL(/\/feed/, { timeout: 20_000 });

    await page.goto("/wallet");
    await expect(page.getByText("HyperEVM · BI9")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Solana · BKSPC")).toHaveCount(0);
    await expect(page.getByText(/not the canonical mint/i).first()).toBeVisible();
    await expect(page.getByText(/Canonical on-chain token is BI9/i).first()).toBeVisible();
  });
});
