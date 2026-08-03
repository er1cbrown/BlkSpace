#!/usr/bin/env node
/**
 * Cross-platform Vite launcher (Windows / macOS / Linux).
 * Avoids Unix-only `ENV=val cmd` syntax that breaks Yard CI on Windows.
 *
 * Usage:
 *   node scripts/vite-with-env.mjs dev [--tier0]
 *   node scripts/vite-with-env.mjs build [--tier0]
 *   node scripts/vite-with-env.mjs preview
 */
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const mode = args[0] === "build" || args[0] === "preview" || args[0] === "dev"
  ? args[0]
  : "build";
const tier0 = args.includes("--tier0") || process.env.VITE_TIER0_LITE === "1";

const env = {
  ...process.env,
  PORT: process.env.PORT ?? "24442",
  BASE_PATH: process.env.BASE_PATH ?? "/",
};
if (tier0) {
  env.VITE_TIER0_LITE = "1";
}

const viteArgs =
  mode === "dev"
    ? ["vite", "--config", "vite.config.ts", "--host", "0.0.0.0"]
    : mode === "preview"
      ? ["vite", "preview", "--config", "vite.config.ts", "--host", "0.0.0.0"]
      : ["vite", "build", "--config", "vite.config.ts"];

const child = spawn("pnpm", ["exec", ...viteArgs], {
  env,
  stdio: "inherit",
  shell: true,
  cwd: root,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
