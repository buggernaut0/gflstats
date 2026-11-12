@echo off
rem Startet die Website lokal: Daten erzeugen, Entwicklungsansicht oeffnen.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js ist nicht installiert.
    echo Bitte von https://nodejs.org/ installieren ^(Version 22 oder neuer^), dann erneut starten.
    pause
    exit /b 1
)

if not exist node_modules (
    echo Erster Start: installiere Pakete, das dauert eine Minute...
    call npm install || goto :failed
)

if exist ..\.venv\Scripts\python.exe (
    ..\.venv\Scripts\python ..\scripts\build_data.py || goto :failed
) else (
    py ..\scripts\build_data.py || goto :failed
)

echo Oeffne http://localhost:3000 - dieses Fenster schliessen zum Beenden.
start "" http://localhost:3000
call npm run dev
exit /b 0

:failed
echo.
echo Fehlgeschlagen, siehe Meldungen oben.
pause
exit /b 1
