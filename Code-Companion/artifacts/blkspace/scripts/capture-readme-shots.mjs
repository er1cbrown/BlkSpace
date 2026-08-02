/**
 * Capture live UI screenshots for the GitHub README.
 * Prerequisite: `pnpm dev` (or Vite) on http://127.0.0.1:24442
 *
 *   node scripts/capture-readme-shots.mjs
 */
import { chromium } from "@playwright/test";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import fs from "fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const out = process.env.OUT || path.join(root, "docs/assets/screenshots");
fs.mkdirSync(out, { recursive: true });

const base = process.env.BASE_URL || "http://127.0.0.1:24442";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(out, "01-welcome.png") });

const guest = page.locator("text=/browse the yard as a guest/i").first();
if (await guest.isVisible().catch(() => false)) {
  await guest.click();
  await page.waitForTimeout(2500);
}

for (const [file, route] of [
  ["03-feed.png", "/feed"],
  ["05-wallet.png", "/wallet"],
  ["07-search.png", "/search"],
]) {
  await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, file) });
}

await browser.close();
console.log("Wrote screenshots to", out);
