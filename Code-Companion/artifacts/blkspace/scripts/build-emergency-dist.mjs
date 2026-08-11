#!/usr/bin/env node
/**
 * Emergency frontend bundle for Desktop/iCloud thrash.
 *
 * When Vite hangs on lucide/tailwind under iCloud Desktop, build JS with Bun
 * from a cache tree (or local src) and pair it with the last good Tailwind
 * theme CSS under dist/public/assets/.
 *
 * Usage (from artifacts/blkspace):
 *   bun scripts/build-emergency-dist.mjs
 *
 * Env:
 *   BLKSPACE_FE_CACHE  — workspace cache root (default: ~/.cache/blkspace-fe3)
 *   BLKSPACE_THEME_CSS — path to full theme CSS relative to dist/public
 *                        (default: assets/index-eaQM3w_6.css)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = os.homedir();
const cacheRoot =
  process.env.BLKSPACE_FE_CACHE ||
  path.join(home, ".cache", "blkspace-fe3", "Code-Companion", "artifacts", "blkspace");
// Prefer newest theme CSS under dist/public/assets if default hash is stale.
const defaultThemeCandidates = [
  process.env.BLKSPACE_THEME_CSS,
  "assets/index-BtjIDUkO.css",
  "assets/index-eaQM3w_6.css",
].filter(Boolean);
const liveDist = path.join(root, "dist", "public");
function resolveThemeCss() {
  for (const rel of defaultThemeCandidates) {
    if (fs.existsSync(path.join(liveDist, rel))) return rel;
  }
  // Last resort: any assets/index-*.css
  const assetsDir = path.join(liveDist, "assets");
  if (fs.existsSync(assetsDir)) {
    const hit = fs
      .readdirSync(assetsDir)
      .filter((f) => /^index-.*\.css$/.test(f))
      .sort()
      .pop();
    if (hit) return `assets/${hit}`;
  }
  return defaultThemeCandidates[defaultThemeCandidates.length - 1] || "assets/index-BtjIDUkO.css";
}
const themeCss = resolveThemeCss();

function log(msg) {
  console.log(`[emergency-dist] ${msg}`);
}

function fail(msg) {
  console.error(`[emergency-dist] ERROR: ${msg}`);
  process.exit(1);
}

function rsyncSrc(from, to) {
  fs.mkdirSync(to, { recursive: true });
  const r = spawnSync(
    "rsync",
    ["-a", "--delete", "--exclude", "node_modules", "--exclude", "dist", `${from}/`, `${to}/`],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    fail(`rsync failed: ${r.stderr || r.stdout}`);
  }
}

// Prefer building in cache (off Desktop) if it has node_modules
const buildRoot =
  fs.existsSync(path.join(cacheRoot, "node_modules")) &&
  fs.existsSync(path.join(cacheRoot, "package.json"))
    ? cacheRoot
    : root;

if (buildRoot === cacheRoot) {
  log(`syncing src → ${cacheRoot}`);
  rsyncSrc(path.join(root, "src"), path.join(cacheRoot, "src"));
  for (const f of ["vite.config.ts", "tsconfig.json", "package.json"]) {
    const src = path.join(root, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(cacheRoot, f));
  }
}

log(`bun build from ${buildRoot}`);
const outDir = path.join(buildRoot, "dist", "public");
fs.mkdirSync(outDir, { recursive: true });
// Vite injects import.meta.env.*; without these, Tauri WebView throws on
// import.meta.env.BASE_URL.replace(...) and paints a blank white/black screen.
const build = spawnSync(
  "bun",
  [
    "build",
    "./src/main.tsx",
    `--outdir=${outDir}`,
    "--entry-naming=main.emergency.[ext]",
    "--asset-naming=[name]-[hash].[ext]",
    "--minify",
    "--target=browser",
    "--sourcemap=none",
    "--define:process.env.NODE_ENV=\"production\"",
    "--define:import.meta.env.MODE=\"production\"",
    "--define:import.meta.env.PROD=true",
    "--define:import.meta.env.DEV=false",
    '--define:import.meta.env.BASE_URL="/"',
    '--define:import.meta.env.VITE_TIER0_LITE="1"',
    '--define:import.meta.env.VITE_SOLANA_CLUSTER="devnet"',
    '--define:import.meta.env.VITE_BKSPC_MINT=""',
    '--define:import.meta.env.VITE_BKSPC_PUMPFUN=""',
  ],
  { cwd: buildRoot, encoding: "utf8", env: { ...process.env, NODE_ENV: "production" } },
);
if (build.status !== 0) {
  fail(`bun build failed:\n${build.stderr || build.stdout}`);
}
log((build.stdout || "").trim() || "build ok");

const jsSrc = path.join(outDir, "main.emergency.js");
const cssSrc = path.join(outDir, "main.emergency.css");
if (!fs.existsSync(jsSrc)) fail(`missing ${jsSrc}`);

// Post-process emergency bundle for Tauri WebView:
// 1) Vite injects import.meta.env.*; Bun leaves them — crash on BASE_URL.replace
// 2) Bun sometimes emits `Q=void 0` for the automatic JSX factory — TypeError: Q is not a function
let js = fs.readFileSync(jsSrc, "utf8");
const envReplacements = {
  // Optional-chaining forms first (longer / more specific).
  "import.meta.env?.BASE_URL": '"/"',
  "import.meta.env?.MODE": '"production"',
  "import.meta.env?.PROD": "true",
  "import.meta.env?.DEV": "false",
  "import.meta.env?.SSR": "false",
  "import.meta.env?.VITE_TIER0_LITE": '"1"',
  "import.meta.env.BASE_URL": '"/"',
  "import.meta.env.MODE": '"production"',
  "import.meta.env.PROD": "true",
  "import.meta.env.DEV": "false",
  "import.meta.env.SSR": "false",
  "import.meta.env.VITE_TIER0_LITE": '"1"',
  "import.meta.env.VITE_SOLANA_CLUSTER": '"devnet"',
  "import.meta.env.VITE_BKSPC_MINT": '""',
  "import.meta.env.VITE_BKSPC_PUMPFUN": '""',
};
for (const key of Object.keys(envReplacements).sort((a, b) => b.length - a.length)) {
  js = js.split(key).join(envReplacements[key]);
}
if (js.includes("import.meta.env")) {
  console.warn(
    "[emergency-dist] WARN: leftover import.meta.env after rewrite — blank screen possible",
  );
}

// ── JSX factory holes (blank white screen in Tauri WebView) ─────────────────
// Bun often emits `Y=void 0` (or Q=void 0) for the automatic JSX runtime while
// still calling Y(type, props, key, …) thousands of times. createRoot runs, then
// TypeError: Y is not a function → empty #root.
//
// Pattern A (current): var yS0,B1,Y=void 0;var n=T(()=>{…fragment only…})
// Patch n() to install a self-contained jsx factory (same shape as bun's `ll`).
const jsxVoidInit =
  /var yS0,B1,Y=void 0;var n=T\(\(\)=>\{yS0=Symbol\.for\("react\.fragment"\);B1=yS0\}\)/;
// NOTE: String.replace treats $$ as a single $ — never put $$typeof in a
// replacement *string*; use a function replacer so $$typeof stays intact.
const jsxFactoryBody =
  'Y=function(J,X,Z){var $=null;if(X==null)X={};if(Z!==void 0&&Z!==null)$=""+Z;if(X.key!==void 0)$=""+X.key;var props;if("key"in X){props={};for(var z in X)z!=="key"&&(props[z]=X[z])}else props=X;var ref=props.ref;return{$$typeof:__el,type:J,key:$,ref:ref!==void 0?ref:null,props:props}}';
if (jsxVoidInit.test(js)) {
  js = js.replace(jsxVoidInit, () => {
    return (
      'var yS0,B1,Y=void 0;var n=T(()=>{yS0=Symbol.for("react.fragment");B1=yS0;var __el=Symbol.for("react.transitional.element");' +
      jsxFactoryBody +
      "})"
    );
  });
  log("patched JSX factory Y=void 0 → inline jsx (radix/useId hole)");
} else if (js.includes("Y=void 0") && (js.match(/\bY\(/g) || []).length > 100) {
  // Fallback: assign Y once before createRoot if still void
  if (js.includes('mB0.createRoot(document.getElementById("root"))')) {
    js = js.replace('mB0.createRoot(document.getElementById("root"))', () => {
      return (
        'if(typeof Y!=="function"){var __el=Symbol.for("react.transitional.element");' +
        jsxFactoryBody +
        '}mB0.createRoot(document.getElementById("root"))'
      );
    });
    log("patched JSX factory Y before createRoot (fallback)");
  } else {
    console.warn(
      "[emergency-dist] WARN: Y=void 0 with many Y( calls but no known patch site",
    );
  }
}
// Guard: if our factory ever got $$ collapsed to single $
if (js.includes("return{$typeof:__el")) {
  js = js.split("return{$typeof:__el").join("return{$$typeof:__el");
  log("fixed collapsed $typeof → $$typeof in jsx factory");
}

// Harden createRoot path: prefer bun's real `ll` jsx factory (needs m8() for JI0).
const createRootBoot =
  'var gB0=EU1;n();mB0.createRoot(document.getElementById("root")).render(Y(gB0,{},void 0,!1,void 0,this));';
if (js.includes(createRootBoot)) {
  js = js.split(createRootBoot).join(
    'var gB0=EU1;n();try{if(typeof m8==="function")m8()}catch(__e){}if(typeof ll==="function")Y=ll;if(typeof TZ!=="undefined")B1=TZ;if(typeof Y!=="function"){var __el=Symbol.for("react.transitional.element");' +
      jsxFactoryBody +
      '}mB0.createRoot(document.getElementById("root")).render(Y(gB0,{},void 0,!1,void 0,this));',
  );
  log("hardened createRoot boot: m8()+Y=ll fallback");
}

// Legacy Q=void 0 patterns (older bun/react minification)
if (js.includes("function mp(J,X,Z)") && /ER0,N8,Q=void 0;/.test(js)) {
  js = js.replace("ER0,N8,Q=void 0;", "ER0,N8,Q=mp;");
  log("patched JSX factory Q=void 0 → Q=mp");
} else if (js.includes("Q=void 0;var s=C(()=>{ER0=Symbol.for(\"react.fragment\")")) {
  js = js.replace(
    "Q=void 0;var s=C(()=>{ER0=Symbol.for(\"react.fragment\")",
    "Q=mp;var s=C(()=>{ER0=Symbol.for(\"react.fragment\")",
  );
  log("patched JSX factory Q=void 0 → Q=mp (alt pattern)");
} else if (/\bQ=void 0;var s=C\(\(\)=>\{ER0=Symbol\.for\("react\.fragment"\)/.test(js)) {
  js = js.replace(
    /Q=void 0;(var s=C\(\(\)=>\{ER0=Symbol\.for\("react\.fragment"\))/,
    "Q=mp;$1",
  );
  log("patched JSX factory Q=void 0 → Q=mp (regex)");
}
if (
  /var yS0,B1,Y=void 0;var n=T\(\(\)=>\{yS0=Symbol\.for\("react\.fragment"\);B1=yS0\}\)/.test(
    js,
  )
) {
  console.warn(
    "[emergency-dist] WARN: JSX factory Y still void after patch — expect blank white screen",
  );
}
fs.writeFileSync(jsSrc, js);

fs.mkdirSync(liveDist, { recursive: true });
fs.copyFileSync(jsSrc, path.join(liveDist, "main.emergency.js"));
if (fs.existsSync(cssSrc)) {
  fs.copyFileSync(cssSrc, path.join(liveDist, "main.emergency.css"));
}

const themePath = path.join(liveDist, themeCss);
const themeLink = fs.existsSync(themePath)
  ? `<link rel="stylesheet" href="/${themeCss.replace(/\\/g, "/")}" />`
  : "<!-- WARN: full theme CSS missing; UI will be understyled -->";

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BlkSpace</title>
    ${themeLink}
    <link rel="stylesheet" href="/main.emergency.css" />
    <style>
      html,body{margin:0;min-height:100%;background:#0c0a09;color:#fafaf9}
      #boot-splash{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
        font-family:system-ui,sans-serif;background:#0c0a09;transition:opacity .3s}
      #boot-splash.is-hidden{opacity:0;pointer-events:none}
      #boot-splash .b{font-size:3.5rem;font-weight:800;color:#f97316;letter-spacing:-.06em}
      #boot-splash .msg{margin-top:.75rem;font-size:.85rem;opacity:.55;text-align:center}
      #boot-error{display:none;position:fixed;inset:0;z-index:10000;padding:24px;background:#1c0a0a;color:#fecaca;
        font-family:ui-monospace,monospace;font-size:12px;overflow:auto;white-space:pre-wrap}
    </style>
  </head>
  <body>
    <div id="boot-splash" aria-busy="true"><div><div class="b">B</div><div class="msg">BlkSpace</div></div></div>
    <div id="boot-error"></div>
    <div id="root"></div>
    <script type="module" src="/main.emergency.js?v=${Date.now()}"></script>
    <script>
      (function () {
        var splash = document.getElementById("boot-splash");
        var errBox = document.getElementById("boot-error");
        var root = document.getElementById("root");
        function hide() {
          if (splash) splash.classList.add("is-hidden");
        }
        function showErr(msg) {
          if (splash) splash.style.display = "none";
          if (errBox) {
            errBox.style.display = "block";
            errBox.textContent = "BlkSpace boot error\\n\\n" + msg +
              "\\n\\nFix: bun run build:emergency && bun run tauri:dev:tier0";
          }
        }
        window.addEventListener("error", function (e) {
          showErr((e && e.message) || String(e));
        });
        window.addEventListener("unhandledrejection", function (e) {
          showErr((e.reason && (e.reason.stack || e.reason.message)) || String(e.reason));
        });
        var n = 0;
        var t = setInterval(function () {
          n++;
          if (root && root.childNodes.length > 0) {
            hide();
            clearInterval(t);
          } else if (n > 80) {
            clearInterval(t);
            if (!root || root.childNodes.length === 0) {
              showErr("UI never mounted (#root empty after ~20s). Usually a broken emergency JSX factory.");
            }
          }
        }, 250);
      })();
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(liveDist, "index.html"), indexHtml);

const liveJs = fs.readFileSync(path.join(liveDist, "main.emergency.js"), "utf8");
const hasConnect =
  liveJs.includes("ProjectConnect") || liveJs.includes('"/connect"');
const hasPrimary =
  liveJs.includes('sub:"ProjectConnect"') ||
  liveJs.includes('sub:"ProjectConnect"');
const hasClinyard =
  liveJs.includes("clinyard") ||
  liveJs.includes("ClinYard") ||
  liveJs.includes("/clinyard");
log(`live dist → ${liveDist}`);
log(
  `js size ${(fs.statSync(path.join(liveDist, "main.emergency.js")).size / 1024 / 1024).toFixed(2)} MiB`,
);
log(`ProjectConnect in bundle: ${hasConnect}`);
log(`Connect primary nav: ${hasPrimary}`);
log(`ClinYard in bundle: ${hasClinyard}`);
if (!hasConnect) {
  fail("bundle missing ProjectConnect — abort");
}
if (!fs.existsSync(themePath)) {
  console.warn(
    `[emergency-dist] WARN: ${themePath} missing. Run a full Vite build once to populate assets/.`,
  );
}
log("done — hard-refresh the app window (or restart: bun run tauri:dev:tier0)");
