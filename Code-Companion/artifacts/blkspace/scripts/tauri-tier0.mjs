#!/usr/bin/env node
/**
 * Single-lane Tier 0 (Yard) Tauri launcher — avoids the boot thrash we hit on
 * Desktop/iCloud + low disk + overlapping cargo/vite.
 *
 * - Yard SKU only: --no-default-features (no Iroh graph)
 * - CARGO_TARGET_DIR → $HOME/.cache/blkspace-target (off Desktop clone)
 * - CARGO_BUILD_JOBS=1 (cap peak RAM)
 * - PORT/BASE_PATH/VITE_TIER0_LITE fixed for tauri.conf devUrl
 * - Preflight: lockfile readable, disk headroom, esbuild binary present
 *
 * Usage:
 *   bun scripts/tauri-tier0.mjs dev
 *   bun scripts/tauri-tier0.mjs build
 *   bun scripts/tauri-tier0.mjs preflight
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modeArg = process.argv[2];
const mode =
  modeArg === "build" || modeArg === "preflight" || modeArg === "dev"
    ? modeArg
    : "dev";

const home = os.homedir();
const defaultTarget = path.join(home, ".cache", "blkspace-target");

function log(msg) {
  console.log(`[tauri-tier0] ${msg}`);
}

function fail(msg) {
  console.error(`[tauri-tier0] ERROR: ${msg}`);
  process.exit(1);
}

function workspaceRoot() {
  // artifacts/blkspace → Code-Companion
  return path.resolve(root, "../..");
}

function findEsbuild() {
  const plat =
    process.platform === "darwin"
      ? process.arch === "arm64"
        ? "darwin-arm64"
        : "darwin-x64"
      : process.platform === "win32"
        ? process.arch === "arm64"
          ? "win32-arm64"
          : "win32-x64"
        : process.arch === "arm64"
          ? "linux-arm64"
          : "linux-x64";
  const candidates = [
    path.join(workspaceRoot(), "node_modules", "@esbuild", plat, "bin", "esbuild"),
    path.join(root, "node_modules", "@esbuild", plat, "bin", "esbuild"),
  ];
  if (process.platform === "win32") {
    return candidates.map((c) => c + ".exe").concat(candidates);
  }
  return candidates;
}

function preflight() {
  const lock = path.join(root, "src-tauri", "Cargo.lock");
  const cargoToml = path.join(root, "src-tauri", "Cargo.toml");

  if (!fs.existsSync(cargoToml)) {
    fail(`missing ${cargoToml}`);
  }

  // Materialize / prove Cargo.lock is readable (iCloud Desktop cancels → os error 89)
  try {
    const fd = fs.openSync(lock, "r");
    const buf = Buffer.alloc(64);
    fs.readSync(fd, buf, 0, 64, 0);
    fs.closeSync(fd);
    const st = fs.statSync(lock);
    log(`Cargo.lock OK (${st.size} bytes)`);
  } catch (e) {
    fail(
      `cannot read Cargo.lock (${e.message}). ` +
        `If the repo is on Desktop/iCloud, move it to ~/dev/BlkSpace or wait for sync, then retry.`,
    );
  }

  const targetDir = process.env.CARGO_TARGET_DIR || defaultTarget;
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    log(`CARGO_TARGET_DIR=${targetDir}`);
  } catch (e) {
    fail(`cannot create CARGO_TARGET_DIR ${targetDir}: ${e.message}`);
  }

  // Disk headroom (Unix): need breathing room for link + vite
  if (process.platform !== "win32") {
    try {
      const df = spawnSync("df", ["-k", targetDir], { encoding: "utf8" });
      if (df.status === 0) {
        const lines = df.stdout.trim().split("\n");
        const parts = lines[lines.length - 1].split(/\s+/);
        const availKb = Number(parts[3]);
        if (Number.isFinite(availKb)) {
          const availGb = availKb / 1024 / 1024;
          log(`disk free (target volume) ≈ ${availGb.toFixed(1)} GiB`);
          if (availGb < 5) {
            console.warn(
              `[tauri-tier0] WARN: low disk (<5 GiB free). Link/compile may thrash or cancel.`,
            );
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  // SPA-mode Tier 0 does not need esbuild at runtime (static dist/public).
  // On low-disk machines the binary often fails to exec (signal kill / thrash).
  // Only hard-fail when Vite HMR is requested or dist is missing.
  const distIndexForEsbuild = path.join(root, "dist", "public", "index.html");
  const spaReady = fs.existsSync(distIndexForEsbuild);
  const needEsbuild = process.env.BLKSPACE_USE_VITE === "1" || !spaReady;
  const esbuildPath = findEsbuild().find((p) => fs.existsSync(p));
  if (!esbuildPath) {
    if (needEsbuild) {
      fail(
        `esbuild native binary missing. From Code-Companion run: bun install`,
      );
    }
    console.warn(
      "[tauri-tier0] WARN: esbuild binary missing — continuing SPA mode with existing dist/public",
    );
  } else {
    const ver = spawnSync(esbuildPath, ["--version"], { encoding: "utf8" });
    if (ver.status !== 0) {
      if (needEsbuild) {
        fail(
          `esbuild failed to run at ${esbuildPath}: ${ver.stderr || ver.stdout}`,
        );
      }
      console.warn(
        `[tauri-tier0] WARN: esbuild failed (${(ver.stderr || ver.stdout || "").trim() || "exit " + ver.status}) — continuing SPA mode`,
      );
    } else {
      log(`esbuild OK (${(ver.stdout || "").trim()}) at ${esbuildPath}`);
    }
  }

  // Desktop warning
  if (root.includes(`${path.sep}Desktop${path.sep}`) || root.includes("/Desktop/")) {
    console.warn(
      "[tauri-tier0] WARN: project is under Desktop (often iCloud). Prefer ~/dev/BlkSpace for reliable Cargo.lock reads.",
    );
  }

  // Stale SPA dist = outdated UI (e.g. missing ProjectConnect)
  const distIndex = path.join(root, "dist", "public", "index.html");
  const distJs = path.join(root, "dist", "public", "main.emergency.js");
  const connectSrc = path.join(root, "src", "pages", "connect.tsx");
  if (fs.existsSync(distIndex) && fs.existsSync(connectSrc)) {
    const distM = Math.max(
      fs.statSync(distIndex).mtimeMs,
      fs.existsSync(distJs) ? fs.statSync(distJs).mtimeMs : 0,
    );
    const srcM = fs.statSync(connectSrc).mtimeMs;
    let hasConnect = false;
    try {
      if (fs.existsSync(distJs)) {
        const head = fs.readFileSync(distJs, "utf8");
        hasConnect = head.includes("ProjectConnect") || head.includes("/connect");
      } else {
        // Vite-built assets may use hashed names; index.html is enough signal
        hasConnect = fs.readFileSync(distIndex, "utf8").includes("main.emergency")
          ? false
          : true;
      }
    } catch {
      /* ignore */
    }
    if (srcM > distM + 60_000 || (fs.existsSync(distJs) && !hasConnect)) {
      const d = new Date(distM).toISOString().slice(0, 10);
      const s = new Date(srcM).toISOString().slice(0, 10);
      console.warn(
        `[tauri-tier0] WARN: dist/public is STALE or missing ProjectConnect (dist ${d}, connect.tsx ${s}).`,
      );
      console.warn(
        "[tauri-tier0] WARN: SPA mode will look outdated without a rebuild.",
      );
      console.warn(
        "[tauri-tier0] Fix (Desktop/iCloud): bun run build:emergency",
      );
      console.warn(
        "[tauri-tier0] Fix (full Vite): PATH=\"/opt/homebrew/opt/node@22/bin:$PATH\" bun run build:tier0",
      );
      console.warn(
        "[tauri-tier0] Then restart: bun run tauri:dev:tier0",
      );
    } else {
      log(
        hasConnect || !fs.existsSync(distJs)
          ? "dist/public looks current vs connect.tsx"
          : "dist/public looks current vs connect.tsx",
      );
    }
  } else if (!fs.existsSync(distIndex)) {
    console.warn(
      "[tauri-tier0] WARN: no dist/public — SPA boot needs: bun run build:emergency  (or build:tier0)",
    );
  }

  log("preflight passed");
}

function buildEnv() {
  const targetDir = process.env.CARGO_TARGET_DIR || defaultTarget;
  fs.mkdirSync(targetDir, { recursive: true });
  // Always 24442 — must match tauri.conf.json devUrl. Shell PORT=8080 (etc.)
  // was causing Vite to bind the wrong port while Tauri waited forever.
  const port = "24442";
  if (process.env.PORT && process.env.PORT !== port) {
    console.warn(
      `[tauri-tier0] WARN: ignoring shell PORT=${process.env.PORT}; forcing ${port} for Tauri`,
    );
  }
  return {
    ...process.env,
    VITE_TIER0_LITE: "1",
    PORT: port,
    BASE_PATH: process.env.BASE_PATH ?? "/",
    CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS ?? "1",
    CARGO_TARGET_DIR: targetDir,
    // Smaller SQLite page cache on weak hosts (see db.rs)
    BLKSPACE_DB_CACHE_KIB:
      process.env.BLKSPACE_DB_CACHE_KIB ?? String(8 * 1024),
  };
}

if (mode === "preflight") {
  preflight();
  process.exit(0);
}

preflight();

const env = buildEnv();
log(
  mode === "dev"
    ? "starting tauri dev (Yard / no Iroh)…"
    : "starting tauri build (Yard / no Iroh)…",
);
log(`PORT=${env.PORT} CARGO_BUILD_JOBS=${env.CARGO_BUILD_JOBS}`);

// Dev: prefer static SPA server over Vite HMR. Vite (Node 25 + Desktop/iCloud)
// was hanging with empty logs while Tauri waited forever on :24442.
// Override: BLKSPACE_USE_VITE=1 restores vite-with-env beforeDevCommand.
const distIndex = path.join(root, "dist", "public", "index.html");
const useVite = process.env.BLKSPACE_USE_VITE === "1";
const args = ["run", "tauri", mode];

if (mode === "dev") {
  if (!useVite) {
    if (!fs.existsSync(distIndex)) {
      fail(
        `missing ${distIndex}. Run: bun run build:tier0  (or BLKSPACE_USE_VITE=1 if Vite works)`,
      );
    }
    log("frontend: SPA static server (dist/public) — set BLKSPACE_USE_VITE=1 for HMR");
    // Write merge config to a file — shell:true mangles JSON strings with spaces/braces.
    const mergePath = path.join(os.tmpdir(), "blkspace-tauri-tier0-dev.json");
    fs.writeFileSync(
      mergePath,
      JSON.stringify({
        build: {
          beforeDevCommand: "bun scripts/spa-server.mjs",
          devUrl: "http://127.0.0.1:24442",
        },
      }),
    );
    args.push("--no-watch", "--config", mergePath);
  } else {
    log("frontend: Vite HMR (BLKSPACE_USE_VITE=1)");
  }
  args.push("--", "--no-default-features");
} else {
  // build
  args.push("--", "--no-default-features");
}

// Avoid shell:true so --config paths / args stay intact
const child = spawn("bun", args, {
  env: {
    ...env,
    HOST: "127.0.0.1",
  },
  stdio: "inherit",
  shell: false,
  cwd: root,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
