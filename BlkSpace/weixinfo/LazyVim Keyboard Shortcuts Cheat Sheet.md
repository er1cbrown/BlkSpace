# LazyVim Keyboard Shortcuts Cheat Sheet

**Created:** 6/3/2026, 7:58:11 PM
**Updated:** 6/3/2026, 8:18:44 PM
**Exported:** 6/13/2026, 4:04:57 AM
**Link:** [https://chat.deepseek.com/a/chat/s/6d725425-3c04-4b33-bb24-50829150e54f](https://chat.deepseek.com/a/chat/s/6d725425-3c04-4b33-bb24-50829150e54f)

---

## User
**2026-06-04T00:58:21.393Z**

Lazyvim cheat sheet

## DeepSeek
**2026-06-04T00:58:21.386Z**

Here's a practical cheat sheet for **LazyVim** (leader key is `<Space>`). It groups shortcuts by function for quick reference.

### 🧭 Core & Essentials
*   **File Explorer**: `<leader>fe` (Neo-tree)[citation:1].
*   **Find Files**: `<leader>ff`[citation:1][citation:10].
*   **Grep Search**: `<leader>fg`[citation:1][citation:10].
*   **Recent Files**: `<leader>fr`.
*   **Save File**: `:w` or `<C-s>`[citation:1].
*   **Quit**: `:q` or `<C-q>`[citation:1].
*   **Buffer (Next/Prev/Close)**: `]b` / `[b` / `<leader>bd`[citation:1][citation:6].
*   **Global Search (Telescope)**: `<leader>fw` (word under cursor) or `<leader>fs` (string)[citation:1].

### 🪟 Windows & Splits
*   **Split Vertically/Horizontally**: `<leader>wv` / `<leader>ws`[citation:1][citation:6].
*   **Navigate**: `<C-h>` (Left), `<C-l>` (Right), `<C-k>` (Up), `<C-j>` (Down)[citation:6].
*   **Resize**: `<C-Up>` / `<C-Down>` / `<C-Left>` / `<C-Right>`[citation:6].

### 💻 Coding & LSP
*   **Go To**: `gd` (Definition), `gr` (References), `K` (Hover Doc)[citation:1].
*   **Rename**: `<leader>rn`[citation:1].
*   **Code Action**: `<leader>ca`[citation:1].
*   **Diagnostics**: `[d` / `]d` (Next/Prev), `<leader>ld` (Line)[citation:1][citation:6].
*   **Toggle Terminal**: `<leader>t` or `<C-/ >`[citation:1][citation:4].

### 🔧 Handy Utilities
*   **Git (Lazygit)**: `<leader>gg`[citation:6].
*   **Toggle UI**: `<leader>uD` (Dim), `<leader>ul` (Line Numbers), `<leader>us` (Spelling)[citation:6].
*   **Markdown Preview**: `<leader>mp`[citation:10].
*   **Harpoon (Quick Marks)**: `<leader>a` (Add), `<leader>1` (Jump to 1)[citation:1].

---

### 💡 Pro Tips
*   **"Which-key" Help**: Press `<leader>` or wait a second—a popup will list all available shortcuts[citation:6].
*   **View the Cheatsheet**: Use a plugin to see bindings: `<leader>ch`[citation:3].
*   **Customize**: Add your own maps in `~/.config/nvim/lua/config/keymaps.lua`[citation:9].

Need help with a specific LazyVim plugin like Telescope or Treesitter? Just ask!

## User
**2026-06-04T00:59:38.534Z**

Took complicated explain in macbokm terms plus how do install lazyvim with opencode and openclaw on mac so solo dev on robust project. Repeat the same process for windows

## DeepSeek
**2026-06-04T00:59:38.528Z**

Here is the straightforward guide for setting up LazyVim and OpenClaw on Mac and Windows for solo development. We will skip the technical jargon.

---

### 🤔 The Big Picture (Mac Terms)

Think of your Mac as your workshop.

*   **LazyVim** is your **supercharged workbench**. It's a pre-configured version of Neovim (a text editor) that makes coding faster, but you need to set it up first [citation:1].
*   **OpenClaw** is your **robot assistant**. It runs locally (privately) and can browse the web, manage files, or use AI models to help you code [citation:2][citation:5].
*   **The Goal**: You install the workbench (LazyVim) and the robot (OpenClaw) on your Mac so you have a powerful, private setup for your big project.

---

### 🖥️ Mac Installation (Detailed Steps)

Open your **Terminal** (Finder > Utilities > Terminal). Paste these commands one by one, pressing Enter after each.

#### Part 1: Install LazyVim (The Editor)
*Note: This will backup your old Neovim configs if they exist.* [citation:1]

```bash
# 1. Backup old files
mv ~/.config/nvim{,.bak}
mv ~/.local/share/nvim{,.bak}
mv ~/.local/state/nvim{,.bak}
mv ~/.cache/nvim{,.bak}

# 2. Download LazyVim
git clone https://github.com/LazyVim/starter ~/.config/nvim

# 3. Remove git files (so you can save your own changes later)
rm -rf ~/.config/nvim/.git

# 4. Launch Neovim
nvim
```

> **⚠️ First Launch**: The first time you run `nvim`, it will automatically install all plugins. This takes 2-5 minutes. **Wait for it to finish** and say "LazyVim ready". Type `:q` to quit.

#### Part 2: Install OpenClaw (The Robot Assistant)
First, install Homebrew (the Mac app store for developers) if you don't have it [citation:2][citation:5]:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then, install OpenClaw [citation:2][citation:10]:

```bash
# 1. Install dependencies
brew install node@22 git

# 2. Configure Node (adds it to your path)
echo 'export PATH="/usr/local/opt/node@22/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 3. Verify Node is installed (should show v22...)
node --version

# 4. Install OpenClaw globally
npm install -g openclaw@latest

# 5. Start the setup wizard (follow the prompts)
openclaw onboard --install-daemon
```

> **💡 During Setup**: When the wizard asks about AI models, you can skip for now. Just choose "Skip for now" or "QuickStart" to finish [citation:6].

---

### 🪟 Windows Installation (Detailed Steps)

Open **PowerShell as Administrator** (Right-click Start button > "Windows PowerShell (Admin)").

#### Part 1: Install LazyVim (The Editor)
*Note: This moves your old config to a backup folder.* [citation:1]

```powershell
# 1. Backup old files
Move-Item $env:LOCALAPPDATA\nvim $env:LOCALAPPDATA\nvim.bak
Move-Item $env:LOCALAPPDATA\nvim-data $env:LOCALAPPDATA\nvim-data.bak

# 2. Download LazyVim
git clone https://github.com/LazyVim/starter $env:LOCALAPPDATA\nvim

# 3. Remove git files
Remove-Item $env:LOCALAPPDATA\nvim\.git -Recurse -Force

# 4. Launch Neovim
nvim
```

> **⚠️ First Launch**: Same as Mac—wait 2-5 minutes for plugins to install on the first run.

#### Part 2: Install OpenClaw (The Robot Assistant)
In the same **Administrator PowerShell** window [citation:2][citation:3]:

```powershell
# 1. Set execution policy (allows scripts to run)
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force

# 2. Install Node.js and Git
winget install OpenJS.NodeJS.LTS --version 22.2.0
winget install Git.Git

# 3. Close and reopen PowerShell (Admin) for changes to apply
# After restarting PowerShell, verify Node is installed:
node --version

# 4. Configure npm for faster downloads (Chinese mirror)
npm config set registry https://registry.npmmirror.com

# 5. Install OpenClaw
npm install -g openclaw@latest

# 6. Start the setup wizard
openclaw onboard --install-daemon
```

> **💡 Pro Tip**: Windows Defender might block OpenClaw. Go to **Settings > Privacy & Security > Virus & threat protection > Manage settings > Exclusions**, and add the folder: `%USERPROFILE%\.openclaw` [citation:2].

---

### ✅ Verification Checklist

After finishing both installations, run these checks:

1.  **LazyVim**: Type `nvim` in the terminal. It should open a colorful interface with a dashboard.
2.  **OpenClaw**:
    *   In your browser, go to `http://localhost:18789`. You should see the OpenClaw interface [citation:5].
    *   In the terminal, run `openclaw doctor`. It should say "✓" (checkmark) next to all requirements [citation:10].

### ❓ Troubleshooting (Quick Fixes)

*   **`command not found: nvim`**: You need to install Neovim first. Download it from [neovim.io](https://neovim.io).
*   **`openclaw: command not found`**: Close and reopen your terminal, or restart your computer.
*   **LazyVim looks weird/empty**: You didn't wait long enough on the first launch. Run `nvim` and let it sit for 5 minutes to finish downloading plugins.
*   **Port 18789 already in use (OpenClaw)**: Something else is using the port. Run `lsof -i:18789` (Mac) or `netstat -ano | findstr 18789` (Windows) to find the process and kill it [citation:2][citation:4].

These steps give you a professional coding environment ready for your solo project.

## User
**2026-06-04T01:11:21.879Z**

How do i watch videos on omarchy

## DeepSeek
**2026-06-04T01:11:21.875Z**

Here's how to play videos on Omarchy, based on your setup:

## 🎬 Quick Start Guide

### Default Video Player
Omarchy uses **mpv** as its default video player, not VLC [citation:2]. You can open videos by:
- **Double-clicking** video files in the file manager
- **Right-click** a video file → "Open with" → "mpv"
- **Terminal**: `mpv /path/to/video.mp4`

### Browser Playback (YouTube, Netflix, etc.)
Omarchy comes with **Chromium** pre-installed [citation:5]. Just:
1. Press `Super + Alt + Space` to open the app launcher
2. Type "Chromium" and press Enter
3. Navigate to your video site as usual

---

## ⚠️ Important: Fix for Chromium Video Freezing

**If videos with logos/overlays freeze or flicker** [citation:6]:

1. Open terminal ( `Super + Return` )
2. Create the flags config file:
   ```bash
   echo '--use-angle=vulkan' >> ~/.config/chromium-flags.conf
   echo '--use-cmd-decoder=passthrough' >> ~/.config/chromium-flags.conf
   ```
3. Restart Chromium completely:
   ```bash
   pkill chromium
   ```
4. Launch Chromium again from the app launcher

This fixes issues with **YouTube sponsor logos**, **floating icons**, and **transparent overlays** that cause the player to hang while audio continues playing [citation:6].

### Alternative Fix (if above doesn't work)
Force Chromium to run under X11 instead of Wayland [citation:6]:
```bash
chromium --ozone-platform=x11
```
Make it permanent with: `echo '--ozone-platform=x11' >> ~/.config/chromium-flags.conf`

---

## 🎮 System-Wide Shortcuts for Media

Omarchy 3.1.0+ includes [citation:7]:
- **`Super + F`** - Fullscreen mode (instead of F11)
- **`Super + T`** - Toggle tiling/floating mode for video players
- **`PrtScr`** - Smart screenshot (select window/region/display)
- **`Shift + PrtScr`** - Screenshot straight to clipboard

---

## 🔧 Alternative Video Players

If mpv isn't working or you prefer something else:

### Install VLC
```bash
omarchy install vlc
```

### Install Celluloid (GTK mpv frontend)
```bash
omarchy install celluloid
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Video stutters/tears | Add `--use-gl=desktop` to chromium-flags.conf [citation:6] |
| No sound in browser | Check `Super + V` for volume mixer |
| Video in wrong monitor | `Super + Shift + Arrow` to move window |
| mpv won't play certain codecs | `omarchy install mpv-full` |

---

## 💡 Pro Tips

- **Screencast with webcam**: `Alt + PrtScrn` for unified screen recording [citation:7]
- **Media keys**: Most keyboards work out of the box for play/pause/next
- **Hardware acceleration**: NVIDIA works automatically on Omarchy 3.1.0+ [citation:2][citation:7]

The video freezing fix above should solve the most common issue people face with Chromium on Omarchy. If you're still having trouble, run `omarchy doctor` to check your system status.

## User
**2026-06-04T01:11:52.230Z**

How do i open mpv to open videos from pictures file

## DeepSeek
**2026-06-04T01:11:52.225Z**

Here is how to open videos with **mpv** from your "Pictures" folder in Omarchy.

### 🖱️ Method 1: Using the File Manager (Right-Click)
This is the standard GUI method, though note that Omarchy's default file manager currently lacks full "Open With" functionality [citation:1].
1.  Open the **Files** app from the dock.
2.  Navigate to your **Pictures** folder (usually in the left sidebar).
3.  **Right-click** the video file.
4.  Look for **"Open With"** in the menu. If you see it, select **mpv** from the list.

### ⌨️ Method 2: Using the Terminal (Fastest & Most Reliable)
Since "Open With" can be buggy in Omarchy [citation:1], using the terminal is the most reliable way.
1.  Press `Super` (Windows key) + `Return` to open a terminal window.
2.  Type the following command and press **Enter** to open the Pictures folder:
    ```bash
    cd ~/Pictures
    ```
3.  Type `ls` to see the list of files in that folder so you can confirm the exact filename.
4.  Open a specific video with mpv:
    ```bash
    mpv your-video-file-name.mp4
    ```
    *(Replace `your-video-file-name.mp4` with the actual file name)*

### 💡 Pro Tips for mpv
- **Keep it open:** By default, mpv closes when the video ends. To change this, create a config file: `~/.config/mpv/mpv.conf` and add the line `keep-open=yes` [citation:3].
- **Keyboard Controls:** While playing:
    - **`Space` / `Click`:** Pause/Play
    - **`←` / `→`:** Seek backward/forward 5 seconds
    - **`9` / `0`:** Volume down/up
- **Drag & Drop:** You can also simply drag a video file from the file manager and drop it onto an open terminal window—the file path will appear, ready for `mpv`.

Let me know if you need more help with mpv settings!

## User
**2026-06-04T01:15:14.363Z**

Low latency video player for low end computer running omatchy. Need to edit can i use capcut or is there a better alternative

## DeepSeek
**2026-06-04T01:15:14.357Z**

## 🎬 Low-Latency Video Player for Omarchy on Low-End Computer

For a low-end computer running Omarchy (Arch Linux + Hyprland), you need something extremely lightweight. **mpv** (which you already have) is actually your best bet[citation:3]. Here's how to optimize it:

### Optimize mpv for Low-End Hardware

Create or edit `~/.config/mpv/mpv.conf` and add these lines:

```bash
# Low-end hardware optimizations
vo=gpu                     # GPU acceleration if available
hwdec=auto-safe           # Hardware decoding if supported
profile=fast              # Fast decoding settings
cache=no                  # Disable cache to save RAM
demuxer-max-bytes=50M     # Limit memory usage
demuxer-max-back-bytes=50M
video-sync=display-resample  # Smoother playback
```

If your computer is *really* struggling, use the software renderer:
```bash
vo=x11                    # Fallback for very old hardware
profile=fast
```

To play a video from the terminal with low-latency optimizations:
```bash
mpv --profile=fast --cache=no /path/to/video.mp4
```


## ✂️ Video Editing on Low-End Omarchy

**No, you cannot use CapCut** — it's Windows/macOS/Android/iOS only with no Linux version. Here are the best **lightweight alternatives** for low-end hardware:

### 🥇 Best Lightweight Option: GoZen
This is exactly what you're looking for — a **minimalistic, performant video editor** built for Linux[citation:4][citation:7].
- ✅ Very lightweight (built with Godot game engine)
- ✅ Smooth playback and fast rendering
- ✅ Runs on low-spec hardware
- ✅ Support for all FFmpeg codecs
- ⚠️ **Currently in Alpha** (Beta planned for mid-2026)[citation:7]

**Install on Omarchy:**
```bash
# From AUR (since Omarchy is Arch-based)
yay -S gozen-git
# Or use the AppImage from their GitHub releases
```

### 🥈 Balanced Option: OpenShot
More features but still reasonable for modest hardware[citation:5].
- ✅ Cross-platform, open-source
- ✅ Intuitive interface for beginners
- ✅ Supports unlimited tracks and 3D animations
- ⚠️ May struggle with GPU acceleration on NVIDIA without configuration[citation:5]

**Install:**
```bash
sudo pacman -S openshot
# or AppImage from official site
```

### 🥉 For Ultra-Low Specs: LosslessCut
If you're just **cutting/trimming** videos without re-encoding:
```bash
sudo pacman -S losslesscut
```
It's extremely fast because it doesn't re-render — just cuts at keyframes.

### Additional Options Tested on Omarchy
- **LiVES** - Very lightweight, runs on old hardware, but has a steeper learning curve[citation:10]
- **MediaEditor** - Lightweight, cross-platform, supports 4K but requires Vulkan SDK[citation:8]


## 📋 Quick Comparison

| Editor | RAM Usage | Best For | Install on Omarchy |
|--------|-----------|----------|-------------------|
| **mpv** (player only) | ~50MB | Watching videos | Already installed |
| **GoZen** | ~200MB | Basic editing, low-end systems | AUR or AppImage |
| **OpenShot** | ~400MB | Feature editing with modest hardware | `sudo pacman -S openshot` |
| **LosslessCut** | ~100MB | Quick cuts/trims | `sudo pacman -S losslesscut` |
| **LiVES** | ~150MB | Very old hardware | AUR available |

## 💡 Pro Tips for Low-End Omarchy

1. **Close Chromium/other browsers** before editing — they're RAM hogs on Omarchy[citation:6]
2. Use **terminal-based tools** when possible — Omarchy is keyboard-first[citation:2]
3. If using OpenShot with NVIDIA, you may need to troubleshoot GPU access[citation:5]
4. For the absolute lightest setup, stick with **mpv for playback + LosslessCut for simple edits**

Start with **GoZen** — it was literally made for your use case (lightweight Linux video editing on modest hardware). The alpha is stable enough for basic projects[citation:7].

## User
**2026-06-04T01:18:35.889Z**

How to install gozen with pacman

## DeepSeek
**2026-06-04T01:18:35.886Z**

You cannot install GoZen directly with `pacman`, but installing it on Omarchy (Arch Linux) is still very straightforward using the **AUR** (Arch User Repository), which is designed for software not in the official repositories [citation:1].

Here are the two best ways to get it running:

### Option 1: Use an AUR Helper (Recommended)
Since you're on Omarchy (Arch-based), using `yay` or `paru` is the simplest method.

*   **Stable Release (`gozen-bin`):** This compiles from a fixed release. It is generally more stable and less likely to break [citation:1].
    ```bash
    yay -S gozen-bin
    ```
*   **Bleeding-Edge (`gozen-git`):** This builds from the very latest source code. It includes the most recent features, but may be unstable or occasionally break [citation:1].
    ```bash
    yay -S gozen-git
    ```

### Option 2: AppImage (No Installation Required)
If you prefer not to use the AUR or run into issues, the developer provides an AppImage [citation:1]:
1.  Go to the [GoZen Releases page on GitHub](https://github.com/VoylinsGamedevJourney/gozen/releases).
2.  Download the `.AppImage` file.
3.  Right-click the file -> Properties -> Permissions -> Check "Allow executing as program".
4.  Double-click to run.

### ⚠️ Important Notes for Your Setup
*   **Alpha Status:** Keep in mind that GoZen is currently in **Alpha** (with a Beta planned for mid-2026) [citation:1]. While it is designed to be performant on low-end systems, you should expect some bugs.
*   **Low-End Performance:** GoZen is built with Godot and specifically aims to be "lightweight" and "performant," making it a good fit for your low-end Omarchy machine [citation:1][citation:2][citation:3].
*   **Dependencies:** Using the AUR method (`yay`) will automatically handle pulling in required dependencies like FFmpeg for you [citation:1].

**Recommendation:** Start with `yay -S gozen-bin`. If you run into dependency conflicts on Omarchy, fall back to the AppImage version.

