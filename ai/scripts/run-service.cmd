@echo off
setlocal
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"
if not exist ".venv\Scripts\python.exe" (
  echo Virtual environment not found. Run scripts\setup.ps1 first.>>"server-service.log"
  exit /b 1
)
".venv\Scripts\python.exe" -m app.main >>"server-service.log" 2>&1
