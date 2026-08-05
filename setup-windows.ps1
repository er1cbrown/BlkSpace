$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Confirm-Install([string]$Name) {
    $answer = Read-Host "$Name is missing. Install it now? [Y/n]"
    return [string]::IsNullOrWhiteSpace($answer) -or $answer -match "^[Yy]"
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspace = Join-Path $repoRoot "Code-Companion"

Write-Host "BlkSpace Windows first-time setup" -ForegroundColor Magenta
Write-Host "This installs project dependencies directly on Windows. Docker is not used."
Write-Host "Administrator rights are not required for the web preview."

Write-Step "Check repository"
if (-not (Test-Path (Join-Path $workspace "package.json"))) {
    throw "Code-Companion/package.json was not found. Download the complete repository ZIP and run setup.bat from its top-level folder."
}
Write-Ok "Repository found at $repoRoot"

Write-Step "Install Bun"
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    if (-not (Confirm-Install "Bun")) {
        throw "Bun is required. Install it from https://bun.sh/docs/installation and run setup.bat again."
    }
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
    $env:Path = "$env:USERPROFILE\.bun\bin;$env:Path"
}
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    throw "Bun is not available in this terminal. Open a new PowerShell window and run setup.bat again."
}
Write-Ok "Bun $(bun --version)"

Write-Step "Install JavaScript packages"
Push-Location $workspace
try {
    bun install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
        throw "bun install failed. Check your internet connection and retry."
    }
}
finally {
    Pop-Location
}
Write-Ok "JavaScript packages installed from bun.lock"

Write-Step "Choose your first run"
Write-Host "1. Web preview (recommended first; Bun only)"
Write-Host "2. Desktop preview (requires Rust and Visual Studio C++ Build Tools)"
$choice = Read-Host "Choose 1 or 2 [1]"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

if ($choice -eq "2") {
    if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
        Write-Host "Install Rust from https://rustup.rs, choose the default installation, then rerun setup.bat."
        throw "Rust is required for the Tauri desktop preview."
    }
    Write-Ok "Rust $(rustc --version)"
    Write-Host "Desktop builds also need Visual Studio Build Tools with 'Desktop development with C++'."
    Write-Host "Install it from https://visualstudio.microsoft.com/visual-cpp-build-tools/ if needed."
    Write-Host "`nRun the desktop preview with:"
    Write-Host "  cd Code-Companion\artifacts\blkspace"
    Write-Host "  bun run tauri:dev:tier0"
}
else {
    Write-Host "`nRun the web preview with:"
    Write-Host "  cd Code-Companion"
    Write-Host "  bun run dev"
    Write-Host "Then open http://localhost:24442"
}

Write-Host "`nSetup complete. Read WINDOWS_FIRST_TIME.md and FIRST_RUN.md before creating an account." -ForegroundColor Green
