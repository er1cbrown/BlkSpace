@echo off
setlocal
REM BlkSpace Windows setup launcher. No Administrator rights or Docker required.
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%setup-windows.ps1"
if errorlevel 1 (
  echo.
  echo Setup did not finish. Read the message above and see WINDOWS_FIRST_TIME.md.
  pause
  exit /b 1
)
endlocal
