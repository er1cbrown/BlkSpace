import { test, expect } from "@playwright/test";

/**
 * Live Power of 2 copy: Solana = student micro-settlement, HyperEVM = governance.
 * Neither chain is presented as the single primary settlement layer.
 */
test.describe("Power of 2 live copy", () => {
  test("landing: BKSPC is micro-settlement, not governance", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("blkspace_first_run_complete", "true");
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /how the economy works/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/optional student micro-settlement/i)).toBeVisible();
    await expect(page.getByText(/1,000:1/)).toBeVisible();
    await expect(
      page.getByText(/BI9 on HyperEVM is a separate institutional token/i),
    ).toBeVisible();
    await expect(page.getByText(/never touches WeixBucks/i)).toBeVisible();
    await expect(
      page.getByText(/Use for events,\s*NFTs, governance/i),
    ).toHaveCount(0);
  });

  test("wallet: settlement pillar is Solana BKSPC", async ({ page }) => {
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
    await expect(page.getByText("Solana · BKSPC")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("HyperEVM · BI9")).toHaveCount(0);
    await expect(
      page.getByText(/optional Solana micro-settlement of earned value/i),
    ).toBeVisible();
    await expect(
      page.getByText(/BI9 on HyperEVM is a different rail/i),
    ).toBeVisible();

    const gov = page.getByText("Governance (HyperEVM)");
    if (await gov.count()) {
      await gov.click();
      await expect(
        page.getByText(/not student settlement/i).first(),
      ).toBeVisible();
      await expect(page.getByText(/no conversion button/i)).toBeVisible();
    }
  });
});
