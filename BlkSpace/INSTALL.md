# BlkSpace — Install Guide

**Platform:** macOS, Windows, Linux (Ubuntu, Debian, Arch, Omarchy, Fedora)  
**Target hardware:** Tier 0 (2GB RAM, any 64-bit CPU) and up  
**Last updated:** 2026-06-15

---

## Table of Contents

1. [End Users (Pre-built Binaries)](#end-users)
2. [Linux — Arch / Omarchy](#arch-omarchy)
3. [Linux — Ubuntu / Debian](#ubuntu-debian)
4. [Linux — Fedora](#fedora)
5. [macOS](#macos)
6. [Windows](#windows)
7. [Tier 0 Hardware Notes](#tier-0)
8. [Troubleshooting](#troubleshooting)

---

## End Users (Pre-built Binaries)

**The easiest way — no terminal required.**

1. Go to [GitHub Releases](https://github.com/er1cbrown/BlkSpace/releases)
2. Download for your platform:
   - **macOS:** `.dmg` (Intel or Apple Silicon)
   - **Windows:** `.msi` (x64)
   - **Linux:** `.AppImage` (universal) or `.deb` (Ubuntu/Debian)
3. Install and open
4. Follow the Welcome Wizard
5. **Write down your 12-word recovery phrase on paper**

---

## Linux — Arch / Omarchy

### Prerequisites

Arch and Omarchy use `pacman` as the package manager. Omarchy is an Arch-based distribution with a pre-configured desktop environment, so all Arch commands work identically.

```bash
# Update system
sudo pacman -Syu

# Install Rust (via rustup — official Arch method)
sudo pacman -S rustup
rustup default stable

# Install Node.js (22.x is in official repos)
sudo pacman -S nodejs npm

# Install pnpm
sudo npm install -g pnpm
# Or use corepack (bundled with Node 22+)
corepack enable
corepack prepare pnpm@latest --activate

# Install Tauri system dependencies
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 librsvg

# Install build tools
sudo pacman -S base-devel git
```

### Build from Source

```bash
# Clone the repository
git clone git@github.com:er1cbrown/BlkSpace.git
cd BlkSpace/Code-Companion

# Install dependencies
pnpm install

# Build the desktop app
cd artifacts/blkspace
pnpm tauri build

# The binary is now in:
# src-tauri/target/release/bundle/
# For Arch: you can install the .tar.gz or create a PKGBUILD
```

### Alternative: Install via AUR (Community Package)

If a community member creates an AUR package:

```bash
# Using yay (AUR helper)
yay -S blkspace

# Using paru (alternative AUR helper)
paru -S blkspace

# Manual AUR install
git clone https://aur.archlinux.org/blkspace.git
cd blkspace
makepkg -si
```

> **Note:** AUR package is not yet created. If you want to maintain it, open an issue.

### Omarchy-Specific Notes

Omarchy comes with a pre-configured desktop environment (typically KDE or Sway). No additional desktop dependencies are needed beyond the Tauri system libraries listed above.

- **Omarchy is Arch:** Every `pacman` and `yay` command works identically.
- **No Docker required:** Tauri builds natively on Omarchy without containers.
- **Tier 0 hardware:** Omarchy runs well on low-end laptops. BlkSpace is designed for 2GB RAM.

---

## Linux — Ubuntu / Debian

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install Tauri dependencies
sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

# Install build tools
sudo apt install -y build-essential git

# Build
git clone git@github.com:er1cbrown/BlkSpace.git
cd BlkSpace/Code-Companion
pnpm install
cd artifacts/blkspace
pnpm tauri build
```

---

## Linux — Fedora

```bash
# Update system
sudo dnf upgrade --refresh

# Install Rust
sudo dnf install rustup
rustup default stable

# Install Node.js 22
sudo dnf install nodejs npm

# Install pnpm
sudo npm install -g pnpm

# Install Tauri dependencies
sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel

# Install build tools
sudo dnf install gcc gcc-c++ git

# Build
git clone git@github.com:er1cbrown/BlkSpace.git
cd BlkSpace/Code-Companion
pnpm install
cd artifacts/blkspace
pnpm tauri build
```

---

## macOS

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install rust node pnpm

# Build
git clone git@github.com:er1cbrown/BlkSpace.git
cd BlkSpace/Code-Companion
pnpm install
cd artifacts/blkspace
pnpm tauri build
```

---

## Windows

### Prerequisites

1. **Install Rust:** https://rustup.rs/
2. **Install Node.js:** https://nodejs.org/ (LTS version)
3. **Install pnpm:**
   ```powershell
   npm install -g pnpm
   ```
4. **Install Visual Studio Build Tools** (C++ workload)
   - Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Select: "Desktop development with C++"

### Build

```powershell
# Clone
git clone git@github.com:er1cbrown/BlkSpace.git
cd BlkSpace\Code-Companion

# Install
pnpm install

cd artifacts\blkspace
pnpm tauri build
```

---

## Tier 0 Hardware Notes

BlkSpace is designed to run on **the computers students actually own** — old laptops, lab machines, Chromebooks.

| Spec | Minimum | Recommended |
|------|---------|-------------|
| **RAM** | 2GB | 4GB+ |
| **Storage** | 500MB free | 1GB+ free |
| **CPU** | Any 64-bit | Intel i3 / AMD equivalent |
| **OS** | Windows 10+, macOS 12+, Linux 64-bit | Any modern OS |
| **Network** | Wi-Fi (1 Mbps) | Broadband (5 Mbps+) |

**Linux on Tier 0:**
- Arch/Omarchy with lightweight desktop (Sway, i3, Openbox) runs well on 2GB RAM.
- Tauri apps are lightweight compared to Electron (no bundled Chromium).
- SQLite is zero-config and uses minimal memory.
- Iroh content-addressed sharing means popular content is cached locally, reducing bandwidth.

---

## Troubleshooting

### "Cannot find webkit2gtk" (Arch)

```bash
# The package name changed in Arch repos. Use the 4.1 version:
sudo pacman -S webkit2gtk-4.1

# If you have older projects needing 4.0:
sudo pacman -S webkit2gtk-4.1
```

### "pnpm command not found" (Arch)

```bash
# Option 1: Use corepack (recommended for Node 22+)
corepack enable
corepack prepare pnpm@latest --activate

# Option 2: Install via npm
sudo npm install -g pnpm

# Option 3: Install via AUR
yay -S pnpm
```

### "Failed to build Tauri" (Arch)

```bash
# Ensure all GTK development libraries are installed
sudo pacman -S gtk3 libappindicator-gtk3 webkit2gtk-4.1

# If you see "librsvg" errors:
sudo pacman -S librsvg
```

### "Out of memory" during build (Tier 0)

```bash
# Reduce Rust parallel compilation jobs
export CARGO_BUILD_JOBS=1

# Or use swap to increase available memory
sudo swapon /swapfile  # if you have a swapfile

# Build with release optimizations disabled (slower but less RAM)
pnpm tauri build --debug
```

### "cargo not found" after rustup install

```bash
# Add cargo to PATH
source $HOME/.cargo/env

# Or add to your shell profile
echo 'source $HOME/.cargo/env' >> ~/.bashrc
# or for zsh:
echo 'source $HOME/.cargo/env' >> ~/.zshrc
```

---

## After Install

**Read `FIRST_RUN.md`** before using BlkSpace. It explains:
- How your 12-word recovery phrase works
- Why there is no "Forgot Password"
- How to keep your account secure
- What to do if you get a new computer

---

## Contributing

If you maintain an AUR package or create a distribution-specific installer, open a PR to update this document.

---

*Last updated: 2026-06-15*  
*Maintained as part of BlkSpace documentation.*
