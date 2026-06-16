import { test, expect } from "./fixtures";
import { navigateTo } from "./tauri-helpers";

// TauriPage getByRole matches [role][aria-label], not implicit ARIA roles.
test.describe.configure({ mode: "serial" });

test.describe("tauri native smoke", () => {
  test("search page renders in native webview", async ({ tauriPage }) => {
    await navigateTo(tauriPage, "/search");
    await expect(
      tauriPage.getByPlaceholder("Search users, posts, communities..."),
    ).toBeVisible();
    await expect(tauriPage.getByText("Search")).toBeVisible();
  });

  test("search hits seeded SQLite users via real Tauri IPC", async ({
    tauriPage,
  }) => {
    await navigateTo(tauriPage, "/search");
    const input = tauriPage.getByPlaceholder(
      "Search users, posts, communities...",
    );
    await input.fill("jane");
    await expect(tauriPage.getByText("Jane Doe")).toBeVisible();
    await expect(tauriPage.getByText("Users (1)")).toBeVisible();
  });

  test("feed tab is reachable in native webview", async ({ tauriPage }) => {
    await navigateTo(tauriPage, "/feed");
    await expect(tauriPage.getByText("Watch")).toBeVisible();
    await expect(tauriPage.getByText("Read")).toBeVisible();
    await expect(tauriPage.getByText("Following")).toBeVisible();
  });
});