#!/usr/bin/env node
/**
 * Build BlkSpace with the Playwright plugin, start Vite + the native app,
 * wait for the control socket, then run the tauri Playwright project.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, unlinkSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const socketPath = "/tmp/blkspace-playwright.sock";
const binaryName = process.platform === "win32" ? "app.exe" : "app";
const binaryPath = join(rootDir, "src-tauri", "target", "debug", binaryName);

const env = {
  ...process.env,
  PORT: "24442",
  BASE_PATH: "/",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcess(child) {
  if (!child || child.killed) return;
  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }
}

async function waitForSocket(path, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (existsSync(path)) {
      console.log(`Playwright socket ready: ${path}`);
      return;
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for Playwright socket at ${path}`);
}

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
    ...options,
  });
}

if (existsSync(socketPath)) {
  try {
    unlinkSync(socketPath);
  } catch {
    // ignore stale socket cleanup failures
  }
}

const tauriConfPath = join(rootDir, "src-tauri", "tauri.conf.json");
const e2eCapabilityPath = join(
  rootDir,
  "src-tauri",
  "capabilities",
  "e2e-testing.json",
);
const e2eCapability = {
  $schema: "../gen/schemas/desktop-schema.json",
  identifier: "e2e-testing",
  description: "Playwright plugin permissions for native E2E runs",
  windows: ["main", "*"],
  permissions: ["playwright:default"],
};

const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
const originalCapabilities = tauriConf.app?.security?.capabilities;
tauriConf.app.security.capabilities = ["default", "e2e-testing"];
writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);
writeFileSync(e2eCapabilityPath, `${JSON.stringify(e2eCapability, null, 2)}\n`);

console.log("Building Tauri app with e2e-testing feature...");
try {
  execSync(
    "cargo build --manifest-path src-tauri/Cargo.toml --features e2e-testing",
    { cwd: rootDir, env, stdio: "inherit" },
  );
} finally {
  tauriConf.app.security.capabilities = originalCapabilities ?? ["default"];
  writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);
  if (existsSync(e2eCapabilityPath)) {
    unlinkSync(e2eCapabilityPath);
  }
}

if (!existsSync(binaryPath)) {
  throw new Error(`Tauri binary not found at ${binaryPath}`);
}

console.log("Starting Vite dev server...");
const vite = run("pnpm", ["dev"]);

await sleep(6000);

console.log(`Starting native app: ${binaryPath}`);
const tauriArgs =
  process.platform === "linux" ? ["-a", binaryPath] : [binaryPath];
const tauriCommand = process.platform === "linux" ? "xvfb-run" : binaryPath;
const tauri =
  process.platform === "linux"
    ? run("xvfb-run", tauriArgs)
    : run(binaryPath, []);

let exitCode = 1;

try {
  await waitForSocket(socketPath, 120_000);
  execSync("pnpm exec playwright test --project=tauri", {
    cwd: rootDir,
    env,
    stdio: "inherit",
  });
  exitCode = 0;
} finally {
  killProcess(tauri);
  killProcess(vite);
  if (existsSync(socketPath)) {
    try {
      unlinkSync(socketPath);
    } catch {
      // ignore
    }
  }
}

process.exit(exitCode);