@echo off
rem Uebernimmt die Website in Git und laedt sie als eigenen Branch auf GitHub hoch.
rem Aendert main nicht, loescht nichts aus der Datenbank und macht keinen Force-Push.
cd /d "%~dp0\.."

where git >nul 2>nul || (echo Git ist nicht installiert. & pause & exit /b 1)
if not exist .git (echo Dieser Ordner ist kein Git-Repository. & pause & exit /b 1)

echo [1/5] Workflow-Datei nach .github\workflows\ kopieren
if not exist .github\workflows mkdir .github\workflows
copy /Y scripts\pages.yml .github\workflows\pages.yml >nul || goto :failed

echo [2/5] Alte Platzhalterdatei entfernen
if exist web\src\components\ComingSoon.tsx del web\src\components\ComingSoon.tsx

echo [3/5] Neuesten Stand von GitHub holen
git fetch origin || goto :failed

echo [4/5] Branch feature/web-platform anlegen und Dateien festhalten
git rev-parse --verify feature/web-platform >nul 2>nul && (git checkout feature/web-platform || goto :failed) || (git checkout -b feature/web-platform origin/main || goto :failed)
git add web curation scripts .github/workflows/pages.yml || goto :failed
git commit -F scripts\commit-nachricht.txt || echo Nichts Neues zu committen.

echo [5/5] Branch auf GitHub hochladen
git push -u origin feature/web-platform || goto :failed

echo.
echo Fertig. Der Branch "feature/web-platform" liegt jetzt auf GitHub.
echo Pull Request anlegen: https://github.com/buggernaut0/gflstats/compare/main...feature/web-platform
start "" https://github.com/buggernaut0/gflstats/compare/main...feature/web-platform
pause
exit /b 0

:failed
echo.
echo Abgebrochen, siehe Meldung oben. Es wurde nichts auf main geaendert.
pause
exit /b 1
