# DevOps Overview — BlkSpace

## Product artifacts (what to ship)

| Artifact | Audience | Iroh | When |
|----------|----------|------|------|
| **BlkSpace-Yard-*** | Students, campus beta, Tier 0 (4–8 GB) | **Off** | Every CI on `main` + every `v*` release |
| **Web preview (Pages)** | Demos without MSI | N/A | Deploy on `main` (frontend) |
| **BlkSpace-Full-*** | Lab / mesh R&D only | **On** | Manual **CI Full Lab** or release tag containing `full` |

**Default student path = Yard.** Full mesh is never required for campus installs.

---

## CI/CD map

| Workflow | File | Trigger | Role |
|----------|------|---------|------|
| **CI** | `.github/workflows/ci.yml` | Push/PR `main` | Lint, test, web build, **Yard** multi-OS installers |
| **CI Full Lab** | `.github/workflows/ci-full-lab.yml` | **Manual only** | Full + Iroh (heavy) |
| **Release** | `.github/workflows/release.yml` | Tag `v*` | GitHub Release + **Yard** assets; Full only if tag has `full` or dispatch `include_full` |
| **Pages** | `.github/workflows/pages.yml` | Push `main` (Code-Companion) or manual | Campus web demo |

### CI (default) flow

```
Push/PR → lint → typecheck → unit tests → web build → e2e web
        → Bundle budget Tier 0
        → Build Yard Windows / Ubuntu / macOS  (--no-default-features)
```

### Full Lab flow

```
Actions → CI Full Lab → Run workflow → pick OS → Full installers as artifacts (14d)
```

### Release flow

```
git tag v0.1.1-yard && git push origin v0.1.1-yard
  → Yard MSIs/DMGs/AppImages on GitHub Release

git tag v0.1.0-full && git push   # or dispatch Release with include_full=true
  → Yard + Full assets
```

---

## Campus demo without MSI

1. Repo **Settings → Pages → Source: GitHub Actions**
2. Merge to `main` (or run **Deploy Web Preview** workflow)
3. Open: `https://er1cbrown.github.io/BlkSpace/`

Notes:

- Web preview is **browse + account demo**; heavy uploads/Tauri mesh need **Yard MSI**
- `BASE_PATH=/BlkSpace/` is set in the Pages workflow for project sites

---

## Local commands

```powershell
cd Code-Companion
pnpm install

# Student default (Yard / Tier 0 — no Iroh)
cd artifacts/blkspace
pnpm tauri:dev:tier0
pnpm tauri:build:tier0

# Lab Full mesh (Iroh) — optional, heavy
pnpm tauri:dev:full
pnpm tauri:build:full

# Web only
pnpm dev
pnpm build
```

---

## Faster release ops (`gh` CLI)

```powershell
# Install / reinstall
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements

# Ensure PATH (new shells)
$gh = "$env:ProgramFiles\GitHub CLI"
if (Test-Path "$gh\gh.exe") { $env:Path = "$gh;$env:Path" }

gh auth login
gh run list --limit 8
gh run watch
gh release list
gh release download <tag> -p "BlkSpace-Yard-Windows*"
```

---

## Architecture (runtime)

```
┌─────────────────────────────────────────────────┐
│                    Users                         │
├─────────────────────────────────────────────────┤
│  Desktop Yard MSI  │  Web Pages preview          │
│  (Tier 0 default)  │  Full MSI (lab only)        │
├─────────────────────────────────────────────────┤
│               Frontend (React + TS)              │
├─────────────────────────────────────────────────┤
│          Tauri Bridge (Rust Commands)            │
│     Yard: no Iroh   │   Full: Iroh feature       │
└─────────────────────────────────────────────────┘
```

---

## Checklist — continue DevOps this week

```
[ ] Commit + push app fixes + these workflow changes
[ ] Confirm CI green: Yard Windows MSI artifact
[ ] Enable GitHub Pages (Actions source)
[ ] Open web preview URL for campus demo
[ ] Smoke MSI: guest → account → post → Yards
[ ] Tag v0.1.x-yard when smoke passes
[ ] Use CI Full Lab only when mesh/Iroh is intentional
```

---

## Related docs

- [YARD_RELEASE_CHECKLIST.md](docs/YARD_RELEASE_CHECKLIST.md)
- [TIER0_USER.md](TIER0_USER.md)
- [FIRST_RUN.md](FIRST_RUN.md)
- [releases/v0.1.0-yard.md](docs/releases/v0.1.0-yard.md)
