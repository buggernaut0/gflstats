@echo off
rem Zeigt die fertig gebaute Website lokal an - ohne Node.js, nur mit Python.
rem Erwartet vorschau\website.zip (fertiger Build). Oeffnet http://localhost:8765
cd /d "%~dp0"

if not exist vorschau\website.zip (
    echo vorschau\website.zip fehlt.
    echo Mit Node.js kann die Seite stattdessen ueber start-web.bat gestartet werden.
    pause
    exit /b 1
)

if exist vorschau\site rmdir /s /q vorschau\site
echo Entpacke die Website...
powershell -NoProfile -Command "Expand-Archive -Path 'vorschau\website.zip' -DestinationPath 'vorschau\site' -Force" || goto :failed

set PY=py
if exist ..\.venv\Scripts\python.exe set PY=..\.venv\Scripts\python.exe

echo Oeffne http://localhost:8765 - dieses Fenster schliessen zum Beenden.
start "" http://localhost:8765
%PY% -m http.server 8765 --directory vorschau\site
exit /b 0

:failed
echo Fehlgeschlagen, siehe Meldungen oben.
pause
exit /b 1
