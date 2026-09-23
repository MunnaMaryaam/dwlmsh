@echo off
setlocal
cd /d "%~dp0"
if not exist package.json (
  echo [ERROR] package.json not found.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install Node.js 20+ first, then run this file again.
  pause
  exit /b 1
)
echo.
echo ================================================
echo   DIAMOND WORLD - UNIVERSAL JEWELRY STOCK ERP
echo ================================================
echo.
echo Installing/checking dependencies...
npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed. Check your internet connection and try again.
  pause
  exit /b 1
)
echo.
echo Starting application...
echo Browser: http://localhost:3000
start "Diamond World ERP" cmd /k "npm run dev"
timeout /t 3 >nul
start "" http://localhost:3000
endlocal
