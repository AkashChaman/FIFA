@echo off
title FIFA App - Local Setup and Runner
echo ============================================
echo   FIFA App - Setup and Local Development
echo ============================================
echo.
echo This script will install all necessary dependencies
echo and start both the Backend and Frontend servers.
echo.

:: ── Backend ─────────────────────────────────
echo [1/2] Setting up and Starting Backend (FastAPI + Uvicorn)...
start "FIFA Backend" cmd /k "cd /d "%~dp0backend" && echo Installing Backend Dependencies... && pip install -r requirements.txt && echo. && echo Backend starting at http://localhost:8000 && echo. && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Small delay so the backend window opens first
timeout /t 5 /nobreak >nul

:: ── Frontend ────────────────────────────────
echo [2/2] Setting up and Starting Frontend (Next.js)...
start "FIFA Frontend" cmd /k "cd /d "%~dp0frontend" && echo Installing Frontend Dependencies... && npm install && echo. && echo Frontend starting at http://localhost:3000 && echo. && npm run dev"

echo.
echo ============================================
echo   Both servers are installing dependencies and launching in new windows.
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:3000
echo ============================================
echo.
echo Close this window or press any key to exit.
pause >nul
