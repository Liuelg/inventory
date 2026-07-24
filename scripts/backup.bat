@echo off
:: MongoDB Backup Wrapper — runs the PowerShell script
:: Usage: Just double-click or run from Command Prompt/PowerShell

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "backup.ps1" %*

if errorlevel 1 (
    echo.
    echo BACKUP FAILED — see errors above.
    pause
    exit /b 1
)

echo.
pause
