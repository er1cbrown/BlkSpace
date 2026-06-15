# Installing BlkSpace

**For HBCU students, alumni, and community members.**

No technical knowledge required. If you can install Spotify or Discord, you can install BlkSpace.

---

## Option 1: Download & Run (Recommended — Easiest)

### For Windows (Tier 0 Laptops)
1. Go to **https://github.com/er1cbrown/BlkSpace/releases**
2. Download `BlkSpace-Setup-Windows.exe`
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
- About 2GB of free space
- Internet connection

### Step 1: Install Prerequisites
**Windows:**
1. Download Node.js from https://nodejs.org (click the big green button)
2. Install it (keep all default settings)
3. Open PowerShell (press Windows key, type "powershell", press Enter)
4. Run: `npm install -g pnpm`
5. Download Rust from https://rustup.rs
6. Run the installer (keep all defaults)
7. Restart your computer

**Mac:**
1. Open Terminal (press Cmd+Space, type "terminal", press Enter)
2. Run: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -`
3. Run: `sudo apt install -y nodejs`
4. Run: `npm install -g pnpm`
5. Run: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
6. Follow the prompts (press 1 for default)
7. Run: `source $HOME/.cargo/env`

**Linux (Ubuntu/Debian):**
1. Open Terminal
2. Run: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -`
3. Run: `sudo apt install -y nodejs`
4. Run: `npm install -g pnpm`
5. Run: `sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev`
6. Run: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
7. Follow the prompts (press 1 for default)
8. Run: `source $HOME/.cargo/env`

### Step 2: Get the Code
1. Open Terminal / PowerShell
2. Run: `git clone git@github.com:er1cbrown/BlkSpace.git`
3. Run: `cd BlkSpace/Code-Companion`
4. Run: `pnpm install` (this downloads all needed files — takes 5-10 minutes)

### Step 3: Run BlkSpace
**For testing the web version:**
- Run: `pnpm dev`
- Open your browser to `http://localhost:24442`

**For testing the desktop version:**
- Run: `cd artifacts/blkspace`
- Run: `pnpm tauri dev`
- The desktop app opens automatically

---

## Option 3: Automated Setup (For Power Users)

If you have a Mac or Linux, run this one command:
```bash
curl -fsSL https://raw.githubusercontent.com/er1cbrown/BlkSpace/main/setup.sh | bash
```

For Windows, download and run:
```
https://raw.githubusercontent.com/er1cbrown/BlkSpace/main/setup.bat
```

---

## What Happens After Install?

When you first open BlkSpace, you'll see a **Welcome Wizard** that:
1. Creates your account (your handle, your keys)
2. Shows you a **recovery phrase** (12 words)
3. Asks you to write it down and verify it
4. Explains what BlkSpace is in plain language

**Never skip the recovery phrase step.** If you lose your device, those 12 words are the only way to get your account back.

---

## Troubleshooting

### "This app is from an unknown developer" (Mac)
Right-click the app → Open → Click "Open" in the dialog.

### "Windows protected your PC"
Click "More info" → "Run anyway".

### "pnpm not found"
Restart your computer after installing Node.js.

### "Tauri build fails"
Make sure you installed Rust and restarted your terminal.

### Still stuck?
Ask in the TSU Yard community or open an issue at https://github.com/er1cbrown/BlkSpace/issues

---

## Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 2GB | 4GB |
| Storage | 500MB | 1GB |
| OS | Windows 10, macOS 12, Ubuntu 22.04 | Latest version |
| Internet | 1 Mbps | 5 Mbps |

BlkSpace is designed for **the computers students already own** — old laptops, lab machines, even Chromebooks.

---

## Security Note

**BlkSpace is different from other apps.**
- Your account is **yours** — no company owns it
- Your **recovery phrase** is your only backup
- Your **keys** are stored on your device, not on our servers
- If you lose your recovery phrase, **nobody can help you recover it** — not even us

Read `FIRST_RUN.md` for a complete security guide.
