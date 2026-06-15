@echo off
REM BlkSpace Setup Script for Windows
REM Run this as Administrator for best results

echo ========================================
echo  BlkSpace Setup for Windows
echo ========================================
echo.

REM Check if running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Not running as Administrator.
    echo [WARNING] Some installs may fail. Right-click this file and choose "Run as administrator".
    echo.
)

REM ============================================================================
REM Step 1: Check Node.js
REM ============================================================================
echo [Step 1/6] Checking Node.js...

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Node.js not found. Please install it first:
    echo.
    echo   1. Open https://nodejs.org in your browser
    echo   2. Click the big green "LTS" button
    echo   3. Run the installer (keep all defaults)
    echo   4. Restart your computer
    echo   5. Run this script again
    echo.
    pause
    exit /b 1
)

for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
if %NODE_MAJOR% lss 22 (
    echo [WARNING] Node.js version is too old. Need 22+.
    echo [INFO] Please update Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js is installed.

REM ============================================================================
REM Step 2: Check pnpm
REM ============================================================================
echo [Step 2/6] Checking pnpm...

pnpm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing pnpm...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install pnpm. Make sure Node.js is installed correctly.
        pause
        exit /b 1
    )
)

echo [OK] pnpm is installed.

REM ============================================================================
REM Step 3: Check Rust
REM ============================================================================
echo [Step 3/6] Checking Rust...

rustc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Rust not found. Downloading installer...
    echo.
    echo [INFO] Please run the Rust installer manually:
    echo   1. Go to https://rustup.rs
    echo   2. Download rustup-init.exe
    echo   3. Run it and choose "Default Installation" (option 1)
    echo   4. Restart your computer
    echo   5. Run this script again
    echo.
    pause
    exit /b 1
)

echo [OK] Rust is installed.

REM ============================================================================
REM Step 4: Check Tauri CLI
REM ============================================================================
echo [Step 4/6] Checking Tauri CLI...

cargo tauri --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing Tauri CLI...
    cargo install tauri-cli
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Tauri CLI.
        pause
        exit /b 1
    )
)

echo [OK] Tauri CLI is installed.

REM ============================================================================
REM Step 5: Install Dependencies
REM ============================================================================
echo [Step 5/6] Installing project dependencies...
echo [INFO] This may take 5-10 minutes on older computers.
echo [INFO] Please be patient...
echo.

if not exist "Code-Companion\package.json" (
    if not exist "BlkSpace" (
        echo [INFO] Cloning BlkSpace repository...
        git clone git@github.com:er1cbrown/BlkSpace.git
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to clone repository.
            echo [INFO] Make sure you have Git installed or download the ZIP from GitHub.
            pause
            exit /b 1
        )
        cd BlkSpace
    ) else (
        echo [INFO] Using existing BlkSpace directory.
    )
)

cd Code-Companion
pnpm install

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    echo [INFO] Try running: pnpm install
    pause
    exit /b 1
)

REM ============================================================================
REM Step 6: Verify
REM ============================================================================
echo [Step 6/6] Verifying build...

pnpm typecheck >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] TypeScript check found issues.
    echo [INFO] This is normal for development. You can still run the app.
)

REM ============================================================================
REM Done
REM ============================================================================
echo.
echo ========================================
echo  SETUP COMPLETE!
echo ========================================
echo.
echo Next steps:
echo.
echo   1. Web preview (fastest):
echo      cd Code-Companion
echo      pnpm dev
echo.
echo   2. Desktop preview (full features):
echo      cd Code-Companion\artifacts\blkspace
echo      pnpm tauri dev
echo.
echo   3. Read FIRST_RUN.md for security tips:
echo      type BlkSpace\FIRST_RUN.md
echo.
echo   4. Connect to other devices:
echo      Read BlkSpace\docs\federated-college-towns.md
echo.
echo ========================================
echo  Welcome to the Yard.
echo ========================================
pause
