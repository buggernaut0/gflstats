@echo off
rem Opens the stats in the browser. Close this window to stop.
cd /d "%~dp0"

if not exist .venv\Scripts\datasette.exe (
    echo Running first-time setup...
    call setup.bat || exit /b 1
)

echo Opening http://localhost:8001 - close this window to stop.
.venv\Scripts\datasette gflstats.db --open
pause
