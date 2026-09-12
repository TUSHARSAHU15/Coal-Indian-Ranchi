@echo off
title CCL DVMS Enterprise Starter
echo ===================================================
echo   Starting CCL DVMS Enterprise v2.0
echo ===================================================
echo.
echo [1/3] Starting Backend API & WebSocket Server (Port 5000)...
start "CCL Backend (5000)" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 2 >nul

echo [2/3] Starting Frontend React UI (Port 5173)...
start "CCL Frontend (5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul

echo.
echo ===================================================
echo   System is active!
echo   - Local Frontend: http://localhost:5173
echo   - Local Backend:  http://localhost:5000
echo ===================================================
echo.
echo [3/3] Launching Cloudflare Tunnel for Public URL...
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
  "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173
) else if exist "C:\Program Files\cloudflared\cloudflared.exe" (
  "C:\Program Files\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173
) else (
  echo Cloudflare tunnel executable not found. Running npx localtunnel instead...
  npx localtunnel --port 5173
)
pause
