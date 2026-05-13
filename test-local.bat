@echo off
REM Simple test runner for Windows - requires dependencies already installed
REM For local testing only

setlocal enabledelayedexpansion

echo.
echo ==================================
echo Pre-Order Food: Local Test
echo ==================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found in PATH
    exit /b 1
)

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH
    exit /b 1
)

REM Check if npm modules exist
if not exist "order-delight-main\node_modules" (
    echo [INFO] Installing Node packages...
    cd order-delight-main
    call npm install --legacy-peer-deps
    cd ..
)

REM Build frontend
echo.
echo [1] Building frontend...
cd order-delight-main
call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed
    cd ..
    exit /b 1
)
cd ..

echo.
echo [2] Frontend built successfully
echo.
echo Next steps to test locally:
echo.
echo In Terminal 1 (Backend):
echo   python main.py
echo.
echo In Terminal 2 (Frontend):
echo   cd order-delight-main
echo   npm run start
echo.
echo Then visit: http://localhost:5000
echo.
