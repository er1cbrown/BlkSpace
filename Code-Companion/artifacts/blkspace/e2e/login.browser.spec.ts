import { test, expect } from "@playwright/test";

test.describe("password-first sign in", () => {
  test("login is handle + password, not a secret key", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel(/^handle$/i)).toBeVisible();
    await expect(page.getByLabel(/^backup password$/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in with backup/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/recovery phrase or key/i)).toHaveCount(0);
    await page.getByText(/use a recovery phrase instead/i).click();
    await expect(page.getByLabel(/recovery phrase or key/i)).toBeVisible();
    await page.getByText(/back to backup sign-in/i).click();
    await expect(page.getByLabel(/^backup password$/i)).toBeVisible();
  });
});
