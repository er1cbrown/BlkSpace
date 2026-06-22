const { defineConfig, devices } = require("@playwright/test");

// CJS config avoids Playwright's TypeScript transform, which deadlocks on some
// macOS setups (esbuild). Browser specs use .mjs for the same reason.
module.exports = defineConfig({
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
      testMatch: /.*\.browser\.spec\.mjs/,
      use: {
        ...devices["Desktop Chrome"],
        mode: "browser",
      },
    },
    {
      name: "tauri",
      testMatch: /.*\.tauri\.spec\.ts/,
      timeout: 60_000,
      use: {
        mode: "tauri",
        trace: "off",
        screenshot: "off",
      },
    },
  ],
  webServer: {
    command: "node scripts/spa-server.mjs",
    url: "http://127.0.0.1:24442",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});