#!/usr/bin/env node
/**
 * Cross-platform Tier 0 Tauri launcher (Windows / macOS / Linux).
 * Sets low-RAM env defaults and always builds with --no-default-features (no Iroh).
 *
 * Usage:
 *   node scripts/tauri-tier0.mjs dev
 *   node scripts/tauri-tier0.mjs build
 */
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] === "build" ? "build" : "dev";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const env = {
  ...process.env,
  VITE_TIER0_LITE: process.env.VITE_TIER0_LITE ?? "1",
  PORT: process.env.PORT ?? "24442",
  BASE_PATH: process.env.BASE_PATH ?? "/",
  // One cargo job by default on Tier 0 (avoid OOM); override: CARGO_BUILD_JOBS=2
  CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS ?? "1",
  // 8 MiB DB page cache (see db.rs apply_tier0_pragmas)
  BLKSPACE_DB_CACHE_KIB: process.env.BLKSPACE_DB_CACHE_KIB ?? String(8 * 1024),
};

const args = ["run", "tauri", mode, "--", "--no-default-features"];
const child = spawn("bun", args, {
  env,
  stdio: "inherit",
  shell: true,
  cwd: root,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
