# BlkSpace — Quick Start

**Getting started in 3 minutes.**  
**Full doc map:** [`docs/README.md`](docs/README.md) · **What's next:** [`docs/ROADMAP.md`](docs/ROADMAP.md)

---

## For End Users (The Simple Way)

**Tier 0 laptop?** Full guide: [`TIER0_USER.md`](TIER0_USER.md)

1. **Download** BlkSpace from the [Releases page](https://github.com/er1cbrown/BlkSpace/releases)
2. **Install** it like any other app (double-click, drag to Applications, etc.)
3. **Open** it and follow the Welcome Wizard
4. **Write down** your 12-word recovery phrase on paper
5. **Start posting** on the Yard

See `INSTALL.md` for detailed platform instructions (includes Arch, Omarchy, Ubuntu, Debian, Fedora, macOS, Windows).

---

## For Developers & Testers

**Prerequisites:**
- Git
- Bun (the setup script installs it)
- Rust and Visual Studio C++ Build Tools only for the desktop preview

**One-command setup (macOS / Linux):**
```bash
curl -fsSL https://raw.githubusercontent.com/er1cbrown/BlkSpace/main/setup.sh | bash
```

**Arch / Omarchy:** Use `pacman` and `yay` — see `INSTALL.md` for exact commands.

**Windows:**
1. Download the complete repository ZIP, or clone it with HTTPS
2. Run `setup.bat` from the top-level repository folder
3. Follow the prompts; do not use Docker or Administrator mode

See [`WINDOWS_FIRST_TIME.md`](WINDOWS_FIRST_TIME.md) for the full first-time flow.

**Manual setup:**
```bash
# 1. Clone
git clone https://github.com/er1cbrown/BlkSpace.git
cd BlkSpace

# 2. Install dependencies
cd Code-Companion
bun install

# 3. Run web preview
bun run dev

# 4. Or run desktop preview
cd artifacts/blkspace
bun run tauri:dev
```

---

## Before You Start

**Read `FIRST_RUN.md`** — it explains:
- How your recovery phrase works
- Why there's no "Forgot Password"
- How to keep your account secure
- What to do if you get a new computer

**This is required reading.** Your account security depends on it.

---

## Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Web preview (fastest) |
| `bun run tauri:dev` | Desktop preview (full features) |
| `bun run lint` | Check code style |
| `bun run typecheck` | Check TypeScript |
| `bun run test` | Run tests |
| `bun run build` | Build for production |
| `bun run tauri build` | Build desktop app |

---

## Project Structure

```
BlkSpoof/
├── BlkSpace/          # Documentation & theory
│   ├── docs/          # Architecture, security, features
│   ├── FIRST_RUN.md   # Security guide (READ THIS)
│   └── ...
├── Code-Companion/    # Code
│   ├── artifacts/
│   │   ├── blkspace/  # Main app (React + Tauri)
│   │   ├── api-server/# Mock API
│   │   └── ...
│   └── lib/           # Shared libraries
├── setup.sh           # Mac/Linux setup
├── setup.bat          # Windows setup
└── INSTALL.md         # Full install guide
```

---

## Connecting to Other Devices

Read `BlkSpace/docs/federated-college-towns.md` for:
- How to connect to a town relay
- How to run your own relay
- How to sync between devices
- How the mesh network works

---

## Getting Help

- **Stuck?** Open an issue: https://github.com/er1cbrown/BlkSpace/issues
- **Want to contribute?** Read `BlkSpace/AGENTS.md`
- **Security questions?** Read `BlkSpace/FIRST_RUN.md`
- **Architecture questions?** Read `BlkSpace/docs/architecture-blueprint.md`

---

**Welcome to the Yard. Your keys, your voice, your community.**
