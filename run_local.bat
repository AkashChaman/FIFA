@echo off
title FIFA App - Local Runner
echo ============================================
echo   FIFA App - Starting Local Development
echo ============================================
echo.

:: ── Backend ─────────────────────────────────
echo [1/2] Starting Backend (FastAPI + Uvicorn)...
start "FIFA Backend" cmd /k "cd /d "%~dp0backend" && echo Backend starting at http://localhost:8000 && echo. && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Small delay so the backend window opens first
timeout /t 2 /nobreak >nul

:: ── Frontend ────────────────────────────────
echo [2/2] Starting Frontend (Next.js)...
start "FIFA Frontend" cmd /k "cd /d "%~dp0frontend" && echo Frontend starting at http://localhost:3000 && echo. && npm run dev"

echo.
echo ============================================
echo   Both servers are launching in new windows
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:3000
echo ============================================
echo.
echo Close this window or press any key to exit.
pause >nul
