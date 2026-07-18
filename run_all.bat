@echo off
title PulseOps AI Runner
echo ===================================================
echo   PulseOps AI - Autonomous Incident Resolution
echo ===================================================
echo.

echo [1/3] Starting FastAPI Backend on port 8000...
start "PulseOps Backend" /min python -m uvicorn backend.main:app --port 8000

echo [2/3] Starting Static Web Server on port 8080...
start "PulseOps Frontend" /min python -m http.server 8080

echo [3/3] Waiting for servers to initialize...
timeout /t 3 >nul

echo Opening browser at http://localhost:8080...
start http://localhost:8080

echo ===================================================
echo   PulseOps AI is running! 
echo   Keep this window open or press Ctrl+C to stop.
echo ===================================================
pause
