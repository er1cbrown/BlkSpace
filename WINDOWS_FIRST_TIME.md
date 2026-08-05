# Windows First-Time Setup

This is the developer/tester path for downloading the repository and installing its packages directly on Windows. It does not use Docker.

## Choose The Right Path

- **Student or normal user:** download the Yard `.msi` from [GitHub Releases](https://github.com/er1cbrown/BlkSpace/releases). Do not clone the repository.
- **Developer or tester:** download the repository ZIP or clone it, then use `setup.bat`.

## Recommended Setup

1. Download the repository using **Code → Download ZIP**, or install Git from [git-scm.com/download/win](https://git-scm.com/download/win) and clone it with:

   ```powershell
   git clone https://github.com/er1cbrown/BlkSpace.git
   cd BlkSpace
   ```

2. Keep the complete top-level folder. `setup.bat` and `setup-windows.ps1` must be beside `Code-Companion`.
3. Double-click `setup.bat`. Do **not** run it as Administrator.
4. Approve Bun installation if prompted.
5. The setup script runs `bun install --frozen-lockfile` inside `Code-Companion`.
6. Choose the web preview first. It needs Bun and the JavaScript packages only:

   ```powershell
   cd Code-Companion
   bun run dev
   ```

7. Open `http://localhost:24442`.

## Desktop Preview

The Tauri desktop preview additionally requires Rust from [rustup.rs](https://rustup.rs) and Visual Studio Build Tools with **Desktop development with C++**.

```powershell
cd Code-Companion\artifacts\blkspace
bun run tauri:dev:tier0
```

Do not install Docker, pnpm, npm, or a global Tauri CLI for this project.

## Why Packages Are Not Bundled

The repository includes `Code-Companion/bun.lock`, which records exact dependency versions. It intentionally does not include `node_modules` or Rust `target` files because they are large, platform-specific, frequently regenerated, and unsafe to treat as source code. `bun install --frozen-lockfile` downloads the packages into the local machine and uses the lockfile to keep the install consistent.

## If Setup Fails

- `Bun is not available`: close the terminal after Bun installs, open a new PowerShell window, and rerun setup.
- `package.json was not found`: run `setup.bat` from the repository top-level folder, not from inside `Code-Companion`.
- Desktop build errors: install Rust and the Visual Studio C++ workload; web preview does not need either.
- Low-memory Windows laptop: use the released Yard `.msi` instead of building Tauri locally.
