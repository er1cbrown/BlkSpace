import { test, expect } from "./fixtures";

test.describe("web preview smoke", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("search page renders", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expect(
      page.getByPlaceholder("Search users, posts, communities..."),
    ).toBeVisible();
  });

  test("search shows mock users in web preview", async ({ page }) => {
    await page.goto("/search");
    await page
      .getByPlaceholder("Search users, posts, communities...")
      .fill("jane");
    await expect(page.getByText("Jane Doe")).toBeVisible();
    await expect(page.getByText("Users (1)")).toBeVisible();
  });
});