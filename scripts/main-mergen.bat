@echo off
rem Fuehrt feature/web-platform mit einem Merge-Commit in main zusammen und pusht main.
rem Kein Force-Push, kein Rebase; bricht bei Konflikten oder unerwartetem Stand ab.
cd /d "%~dp0\.."

rem Nachricht sichern: scripts\ gehoert zum Branch und verschwindet beim Wechsel auf main kurz
copy /Y scripts\commit-nachricht.txt "%TEMP%\gfl-merge-nachricht.txt" >nul || goto :failed

echo [1/6] Stand von GitHub holen
git fetch origin || goto :failed

echo [2/6] Auf main wechseln
git checkout main || goto :failed

echo [3/6] main auf den Stand von GitHub bringen (nur Vorspulen)
git pull --ff-only origin main || goto :failed

echo [4/6] Aenderungen anderer pruefen
git log --oneline main..origin/feature/web-platform
git status --short --untracked-files=no

echo [5/6] feature/web-platform in main mergen (Merge-Commit mit ausfuehrlicher Nachricht)
git merge --no-ff origin/feature/web-platform -F "%TEMP%\gfl-merge-nachricht.txt" || goto :conflict

echo [6/6] main auf GitHub hochladen
git push origin main || goto :failed

echo.
echo Fertig. main enthaelt jetzt die Website.
git log --oneline -3
pause
exit /b 0

:conflict
echo.
echo Merge-Konflikt. Der Merge wird abgebrochen, main bleibt unveraendert.
git merge --abort
pause
exit /b 1

:failed
echo.
echo Abgebrochen, siehe Meldung oben. Auf GitHub wurde nichts geaendert.
pause
exit /b 1
