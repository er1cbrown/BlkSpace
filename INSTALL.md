# Installing BlkSpace

**For HBCU students, alumni, and community members.**

No technical knowledge required. If you can install Spotify or Discord, you can install BlkSpace.

> **Using an older Windows laptop (4–8 GB RAM)?** Read **[`TIER0_USER.md`](TIER0_USER.md)** first — download the installer only; do not build from source.

---

## Option 1: Download & Run (Recommended — Easiest)

### For Windows (Tier 0 Laptops)
1. Go to **https://github.com/er1cbrown/BlkSpace/releases**
2. Download **`BlkSpace-Yard-Windows-x64.msi`** (from [Releases](https://github.com/er1cbrown/BlkSpace/releases) or CI artifact `BlkSpace-Yard-windows-latest`)
3. Double-click the file
4. Click "Install" (no admin rights needed)
5. BlkSpace opens automatically

### For Mac (M1/M2/M3 or Intel)
1. Go to **https://github.com/er1cbrown/BlkSpace/releases**
2. Download `BlkSpace-Setup-Mac.dmg`
3. Double-click the file
4. Drag the BlkSpace icon into your Applications folder
5. Open from Applications (right-click → Open the first time)

### For Linux (Ubuntu, Debian, etc.)
1. Go to **https://github.com/er1cbrown/BlkSpace/releases**
2. Download `BlkSpace-Setup-Linux.AppImage`
3. Right-click → Properties → Permissions → Allow executing
4. Double-click to run

---

## Option 2: Build From Source (For Testers & Developers)

**Only do this if you want to help test BlkSpace on your device.**

### What You Need
- A computer with Windows 10+, macOS 12+, or Linux
- About 2GB of free space (more for Rust build cache)
- Internet connection

### How It Works
BlkSpace uses **Tauri 2** (Rust backend + React frontend). GitHub Actions CI builds the desktop app for all platforms. You only need to build locally if you're modifying Rust code or testing changes before pushing.

**To just work on the UI**: `bun run dev` starts a web preview (no Rust build needed).
**To build the full desktop app**: `bun run tauri build` (requires Rust).

### Step 1: Install Prerequisites

**Windows:**
1. Install **Git** from https://git-scm.com/download/win
2. Download the complete repository ZIP, or clone it with HTTPS:
   `git clone https://github.com/er1cbrown/BlkSpace.git`
3. Run `setup.bat` from the repository top-level folder. It installs Bun and runs `bun install --frozen-lockfile`.
4. For desktop development, install **Rust** from https://rustup.rs
5. Install **Visual Studio Build Tools**:
   - Download from https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Select **"Desktop development with C++"** workload
6. Restart your terminal (not necessarily the computer)

**Mac:**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Rust (if needed for Tauri)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# or: brew install rust
```

**Linux (Ubuntu/Debian):**
```bash
# Bun
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Tauri system deps
sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev libsecret-1-dev

# Build tools
sudo apt install -y build-essential git
```

**Linux (Arch / Omarchy):**
```bash
sudo pacman -S rustup base-devel git webkit2gtk-4.1 libappindicator-gtk3 librsvg
rustup default stable
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Step 2: Get the Code
```bash
git clone https://github.com/er1cbrown/BlkSpace.git
cd BlkSpace/Code-Companion
bun install --frozen-lockfile
```

Windows users should use [`WINDOWS_FIRST_TIME.md`](WINDOWS_FIRST_TIME.md) and `setup.bat` instead of copying these shell commands.

### Step 3: Run BlkSpace
**Web preview (UI only, no Rust backend):**
```bash
bun run dev
```
Open your browser to `http://localhost:24442`

**Desktop app (full Rust backend):**
```bash
cd artifacts/blkspace
bun run tauri:dev
```

---

## Option 3: Automated Setup (For Power Users)

**Mac/Linux** — one command:
```bash
curl -fsSL https://raw.githubusercontent.com/er1cbrown/BlkSpace/main/setup.sh | bash
```

**Windows** — download the complete repository and run `setup.bat` from its top-level folder. No Docker or Administrator rights are required for the web preview.

---

## For Windows / Low-End Machine Users

**End users:** See **[`TIER0_USER.md`](TIER0_USER.md)** — install from [Releases](https://github.com/er1cbrown/BlkSpace/releases) only.

**Developers** on Tier 0 hardware: see **[`docs/TIER0_DEV.md`](docs/TIER0_DEV.md)** (use CI for `.msi` builds; avoid local `tauri build` unless necessary).

---

## What Happens After Install?

When you first open BlkSpace, you'll see a **Welcome Wizard** that:
1. Creates your account (your handle, your keys)
2. Shows you a **recovery phrase** (12 words)
3. Asks you to write it down and verify it
4. Explains what BlkSpace is in plain language

**Never skip the recovery phrase step.** If you lose your device, those 12 words are the only way to get your account back.

---

## Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4GB (Tier 0) | 8GB |
| Storage | 500MB (installed app) | 1GB free for comfortable use |
| OS | Windows 10+, macOS 12+, Ubuntu 22.04 | Latest version |
| CPU | Any 64-bit | Intel i3 / AMD equivalent |
| Internet | 1 Mbps | 5 Mbps |

BlkSpace is designed for **the computers students already own** — old laptops, lab machines, even Chromebooks.

---

## Troubleshooting

### "This app is from an unknown developer" (Mac)
Right-click the app → Open → Click "Open" in the dialog.

### "Windows protected your PC"
Click "More info" → "Run anyway".

### "bun not found"
Close the terminal, open a new PowerShell window, and run `setup.bat` again. Bun is the project package manager; Node.js is not required for the normal setup path.

### "Tauri build fails"
- Make sure you installed Rust and restarted your terminal.
- On Windows, verify you installed "Desktop development with C++" in Visual Studio Build Tools.
- On Linux, make sure all `libwebkit2gtk` dev packages are installed.

### "Out of memory" during build (Tier 0)
```bash
export CARGO_BUILD_JOBS=1    # Linux/Mac
$env:CARGO_BUILD_JOBS=1      # Windows PowerShell
```

### "cargo not found" after rustup
```bash
source $HOME/.cargo/env
# Add to your shell profile:
echo 'source $HOME/.cargo/env' >> ~/.bashrc  # or ~/.zshrc
```

### Still stuck?
Ask in the TSU Yard community or open an issue at https://github.com/er1cbrown/BlkSpace/issues

---

## Security Note

**BlkSpace is different from other apps.**
- Your account is **yours** — no company owns it
- Your **recovery phrase** is your only backup
- Your **keys** are stored on your device, not on our servers
- If you lose your recovery phrase, **nobody can help you recover it** — not even us

Read `FIRST_RUN.md` for a complete security guide.
