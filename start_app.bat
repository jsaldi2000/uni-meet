@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo  Starting Meetings App (Templates-Ting)
echo ==========================================

:: Cleanup port 3000 (server)
echo [1/3] Limpiando puertos...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000 " ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Cleanup port 5173 (client)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173 " ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Start Backend
echo [2/3] Iniciando servidor...
start "Meetings-Server" /min cmd /c "cd server && node index.js"

:: Wait for server to be ready before starting client
timeout /t 2 /nobreak >nul

:: Start Frontend
echo [3/3] Iniciando cliente...
start "Meetings-Client" /min cmd /c "cd client && npm run dev"

:: Open browser after a short delay
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo ==========================================
echo  Aplicacion iniciada correctamente!
echo  - Servidor: http://localhost:3000
echo  - Cliente:  http://localhost:5173
echo ==========================================
pause
