@echo off
rem Laedt die offiziellen Teamlogos nach web\public\logos\ (Quellen: curation\teams.json).
cd /d "%~dp0\.."
set PY=py
if exist .venv\Scripts\python.exe set PY=.venv\Scripts\python.exe
%PY% scripts\download_logos.py %*
pause
