@echo off
rem One-time setup: creates the Python environment and installs what's needed.
cd /d "%~dp0"

where py >nul 2>nul
if errorlevel 1 (
    echo Python is not installed.
    echo Install it from https://www.python.org/downloads/
    echo and tick "Add python.exe to PATH" in the installer, then run this again.
    pause
    exit /b 1
)

echo Setting up, this takes a minute...
py -m venv .venv || goto :failed
.venv\Scripts\python -m pip install --quiet -r requirements.txt || goto :failed
echo.
echo Setup done. Double-click start.bat to browse the stats.
pause
exit /b 0

:failed
echo.
echo Setup failed, see the messages above.
pause
exit /b 1
