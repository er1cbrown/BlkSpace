import { test, expect } from "@playwright/test";

test.describe("password-first sign in", () => {
  test("login is handle + password, not a secret key", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel(/^handle$/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByText(/24 words \(advanced\)/i)).toBeVisible();
    await expect(
      page.getByLabel(/recovery phrase or secret key/i),
    ).toHaveCount(0);
    await page.getByText(/24 words \(advanced\)/i).click();
    await expect(page.getByLabel(/recovery phrase/i)).toBeVisible();
    await page.getByText(/back to password/i).click();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
  });
});
