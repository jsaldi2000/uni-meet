@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo Starting Meetings App (Templates-Ting)
echo ==========================================

:: Cleanup ports 3000 and 5173 if they are stuck
echo [1/3] Cleaning up ports...
npx kill-port 3000 5173 2>nul

:: Start Backend
echo [2/3] Starting Server...
start "Meetings-Server" /min cmd /c "cd server && node index.js"

:: Start Frontend
echo [3/3] Starting Client...
start "Meetings-Client" /min cmd /c "cd client && npm run dev"

echo.
echo ==========================================
echo Apps are starting in the background!
echo - Server: http://localhost:3000
echo - Client: http://localhost:5173
echo ==========================================
pause
