@echo off
rem Downloads the latest code and stats from GitHub.
cd /d "%~dp0"

if not exist .git (
    echo This folder was downloaded as a ZIP, so it can't be updated.
    echo Clone the repo instead, see README.md.
    pause
    exit /b 1
)

git pull
echo.
echo Up to date.
pause
