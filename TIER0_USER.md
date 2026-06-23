# BlkSpace on Your Laptop (Tier 0 Guide)

**For HBCU students using an everyday Windows laptop — no coding, no builds.**

If you can install Spotify or Discord, you can use BlkSpace. Developers build the app on their machines and in CI; **you only download and run the installer.**

---

## What is Tier 0?

Tier 0 is the computer you already have: a low-end or older Windows laptop with **4–8 GB RAM**, integrated graphics, and limited disk space. BlkSpace is built for that hardware first. You are not expected to install Rust, Node, or clone the repo.

| You need | You do **not** need |
|----------|---------------------|
| Windows 10 or newer | Rust, Node.js, or pnpm |
| ~500 MB free disk (app) | Git or the source code |
| Internet (Wi‑Fi is fine) | Visual Studio or build tools |
| 4 GB RAM minimum | Admin rights (install works without) |

---

## Install in 3 steps

1. **Download** from [GitHub Releases](https://github.com/er1cbrown/BlkSpace/releases) or CI artifacts  
   - Windows: **`BlkSpace-Yard-Windows-x64.msi`** (Tier 0 build — no heavy mesh)  
   - Mac: **`BlkSpace-Yard-macOS.dmg`**  
   - Linux: **`BlkSpace-Yard-Linux.AppImage`**

2. **Install** like any other app (double-click → Install).

3. **Open** BlkSpace and follow the Welcome Wizard.

Platform-specific screenshots and troubleshooting: [`INSTALL.md`](INSTALL.md).

---

## First run (5 minutes)

1. **Read** [`FIRST_RUN.md`](FIRST_RUN.md) — especially the recovery phrase section.
2. **Create your profile** (handle, display name, your Yard / HBCU).
3. **Write down your 12-word recovery phrase on paper.** No screenshots, no notes app.
4. **Verify** the phrase when prompted.

**Not ready to sign up?** On the welcome screen, choose **“Just browse the yard as a guest.”** You can read the feed and explore; likes, posts, and rewards ask you to create a free account later.

---

## What to expect on a slow laptop

BlkSpace is lighter than running the dev tools, but it still does more than Instagram (local database, your Yard relay, optional wallet features). On Tier 0 hardware:

| Moment | Typical experience |
|--------|-------------------|
| **First open after install** | A few seconds while the app sets up — normal on old disks |
| **Feed** | Local Yard posts load first; more posts load as you scroll (**Load more**) |
| **Photos / video** | Large files may take longer on slow Wi‑Fi — the app caps size to protect your machine |
| **Wallet / marketplace** | Optional; only open when you need it |

**Yard build (recommended on Tier 0):** Release installers are tuned for everyday laptops — your home Yard first, heavy mesh features in the background or on stronger machines. You get the full social loop: browse, post, earn WeixBucks, join your campus Yard.

If the app feels stuck for more than ~30 seconds on first launch, close it once and reopen. After that, startup should be faster (the app skips repeat database migrations and loads your Yard feed first).

**Developers on slow laptops:** use `pnpm tauri:dev:tier0` or `pnpm dev:tier0` — not plain `pnpm dev`. See [`docs/TIER0_DEV.md`](docs/TIER0_DEV.md).

---

## Daily use tips

- **Close other heavy apps** (Chrome with 50 tabs, games) when posting video.
- **Stay on Wi‑Fi** for first sync; offline reading improves after your feed has loaded once.
- **Keep ~1 GB free** on your drive so Windows and BlkSpace do not fight for swap space.
- **One Yard at a time** — pick your campus; cross-town features are for later / stronger devices.

---

## Do not do this (common mistakes)

These steps are for **developers only**. They will fill your disk, freeze your laptop, and are not required to use BlkSpace:

- `git clone` the repo
- `pnpm install` / `pnpm dev`
- `pnpm tauri build` or installing Rust
- Running `setup.bat` / `setup.sh` unless you are actively contributing code

If you are helping build BlkSpace, use [`docs/TIER0_DEV.md`](docs/TIER0_DEV.md) and [`INSTALL.md`](INSTALL.md) Option 2 — not this file.

---

## Troubleshooting (users)

| Problem | What to try |
|---------|-------------|
| **“Windows protected your PC”** | More info → Run anyway (unsigned beta; see [`INSTALL.md`](INSTALL.md)) |
| **App won’t open** | Reboot once; reinstall from Releases |
| **Feed empty** | Check Wi‑Fi; wait 10–20 s; pull to refresh or switch Local / Following tab |
| **Very slow** | Free disk space; close other apps; use guest browse first to test |
| **Lost recovery phrase** | There is no password reset — see [`FIRST_RUN.md`](FIRST_RUN.md) |

Still stuck? TSU Yard community or [GitHub Issues](https://github.com/er1cbrown/BlkSpace/issues).

---

## Quick links

| Doc | Who it’s for |
|-----|----------------|
| **This file** | Students — install and use |
| [`INSTALL.md`](INSTALL.md) | Step-by-step install per OS |
| [`FIRST_RUN.md`](FIRST_RUN.md) | Recovery phrase and security |
| [`STARTUP.md`](STARTUP.md) | 3-minute overview |
| [`docs/TIER0_DEV.md`](docs/TIER0_DEV.md) | Developers on slow machines |
| [`docs/tier0-load-optimization.md`](docs/tier0-load-optimization.md) | Engineering performance notes |

**Bottom line:** Download the installer, run it, write down your 12 words, join your Yard. The dev team handles the rest.