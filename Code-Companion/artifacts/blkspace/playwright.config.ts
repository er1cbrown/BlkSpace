import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:24442",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "browser",
      testMatch: /.*\.browser\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        // @ts-expect-error custom fixture option from @srsholmes/tauri-playwright
        mode: "browser",
      },
    },
    {
      name: "tauri",
      testMatch: /.*\.tauri\.spec\.ts/,
      timeout: 60_000,
      use: {
        // @ts-expect-error custom fixture option from @srsholmes/tauri-playwright
        mode: "tauri",
        trace: "off",
        screenshot: "off",
      },
    },
  ],
  webServer: {
    command: "PORT=24442 BASE_PATH=/ pnpm dev",
    url: "http://127.0.0.1:24442",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});