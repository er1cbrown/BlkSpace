#!/bin/bash
# BlkSpace Setup Script
# macOS & Linux — One-command install

set -e

BLKS_G='[32m'
BLKS_Y='[33m'
BLKS_R='[31m'
BLKS_N='[0m'

blks_info() { echo "${BLKS_G}[BlkSpace]${BLKS_N} $1"; }
blks_warn() { echo "${BLKS_Y}[BlkSpace]${BLKS_N} $1"; }
blks_err() { echo "${BLKS_R}[BlkSpace]${BLKS_N} $1"; }

blks_info "Welcome to BlkSpace Setup"
blks_info "This script will install everything needed to run BlkSpace"
echo ""

# Detect OS
OS=$(uname -s)
ARCH=$(uname -m)
blks_info "Detected: $OS ($ARCH)"

# Check disk space
FREE_SPACE=$(df -h . | tail -1 | awk '{print $4}')
blks_info "Available space: $FREE_SPACE"

# ============================================================================
# Step 1: Check / Install Node.js 22+
# ============================================================================
blks_info "Checking Node.js..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 22 ]; then
        blks_info "Node.js $(node -v) — OK"
    else
        blks_warn "Node.js $(node -v) found, but need 22+. Updating..."
        if [ "$OS" = "Darwin" ]; then
            if command -v brew &> /dev/null; then
                brew install node@22
            else
                blks_err "Homebrew not found. Install from https://brew.sh"
                exit 1
            fi
        else
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
    fi
else
    blks_warn "Node.js not found. Installing..."
    if [ "$OS" = "Darwin" ]; then
        if command -v brew &> /dev/null; then
            brew install node
        else
            blks_err "Homebrew not found. Install from https://brew.sh"
            exit 1
        fi
    else
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
fi

# ============================================================================
# Step 2: Check / Install pnpm
# ============================================================================
blks_info "Checking pnpm..."

if command -v pnpm &> /dev/null; then
    blks_info "pnpm $(pnpm -v) — OK"
else
    blks_warn "pnpm not found. Installing..."
    npm install -g pnpm
    blks_info "pnpm installed"
fi

# ============================================================================
# Step 3: Check / Install Rust
# ============================================================================
blks_info "Checking Rust..."

if command -v rustc &> /dev/null; then
    blks_info "Rust $(rustc --version) — OK"
else
    blks_warn "Rust not found. Installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    blks_info "Rust installed"
fi

# ============================================================================
# Step 4: Check / Install Tauri CLI
# ============================================================================
blks_info "Checking Tauri CLI..."

if command -v cargo-tauri &> /dev/null || cargo install --list | grep -q "tauri-cli"; then
    blks_info "Tauri CLI — OK"
else
    blks_warn "Tauri CLI not found. Installing..."
    cargo install tauri-cli
    blks_info "Tauri CLI installed"
fi

# ============================================================================
# Step 5: Linux Dependencies
# ============================================================================
if [ "$OS" = "Linux" ]; then
    blks_info "Checking Linux system dependencies..."
    
    if command -v apt-get &> /dev/null; then
        blks_info "Installing required packages via apt..."
        sudo apt-get update
        sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            patchelf \
            libssl-dev \
            libgtk-3-dev \
            libayatana-appindicator3-dev
    elif command -v dnf &> /dev/null; then
        blks_info "Installing required packages via dnf..."
        sudo dnf install -y \
            webkit2gtk4.1-devel \
            libappindicator-gtk3-devel \
            librsvg2-devel \
            openssl-devel
    else
        blks_warn "Unknown package manager. You may need to install Tauri dependencies manually."
        blks_warn "See: https://tauri.app/start/prerequisites/"
    fi
fi

# ============================================================================
# Step 6: Clone Repository (if not already in it)
# ============================================================================
if [ ! -f "Code-Companion/package.json" ]; then
    if [ ! -d "BlkSpace" ]; then
        blks_info "Cloning BlkSpace repository..."
        git clone git@github.com:er1cbrown/BlkSpace.git
        cd BlkSpace
    else
        blks_info "Using existing BlkSpace directory"
    fi
fi

# ============================================================================
# Step 7: Install Dependencies
# ============================================================================
blks_info "Installing project dependencies..."
blks_info "This may take 5-10 minutes on older computers."
blks_info "Grab some water — you're almost there."
echo ""

cd Code-Companion
pnpm install

# ============================================================================
# Step 8: Verify Build
# ============================================================================
blks_info "Verifying TypeScript compilation..."
pnpm typecheck || {
    blks_warn "TypeScript check found issues. This is normal for development."
    blks_warn "You can still run the app."
}

# ============================================================================
# Done
# ============================================================================
echo ""
echo "========================================"
blks_info "SETUP COMPLETE!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Web preview (fastest):"
echo "     cd Code-Companion && pnpm dev"
echo ""
echo "  2. Desktop preview (full features):"
echo "     cd Code-Companion/artifacts/blkspace && pnpm tauri dev"
echo ""
echo "  3. Read FIRST_RUN.md for security tips:"
echo "     cat BlkSpace/FIRST_RUN.md"
echo ""
echo "  4. Connect to other devices:"
echo "     Read BlkSpace/docs/federated-college-towns.md"
echo ""
echo "========================================"
blks_info "Welcome to the Yard."
echo "========================================"
