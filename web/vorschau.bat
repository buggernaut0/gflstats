@echo off
rem Zeigt die fertig gebaute Website lokal an - ohne Node.js, nur mit Python.
rem Erwartet vorschau\website.zip (fertiger Build). Nimmt den ersten freien Port ab 8765,
rem damit eine noch laufende alte Vorschau nicht versehentlich angezeigt wird.
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

set PORT=8765
:checkport
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo Port %PORT% ist belegt ^(vermutlich eine alte Vorschau^), versuche den naechsten...
    set /a PORT+=1
    goto :checkport
)

echo Oeffne http://localhost:%PORT% - dieses Fenster schliessen zum Beenden.
start "" http://localhost:%PORT%
%PY% -m http.server %PORT% --directory vorschau\site
exit /b 0

:failed
echo Fehlgeschlagen, siehe Meldungen oben.
pause
exit /b 1
