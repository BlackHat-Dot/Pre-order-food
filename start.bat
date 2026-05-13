@echo off
REM Windows-compatible startup script for testing
REM This is for local testing only. For Railway, use start.sh

setlocal enabledelayedexpansion

echo ==================================
echo Pre-Order Food: Local Development
echo ==================================
echo Frontend port: 5000
echo Backend port: 8000
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found in PATH
    echo Please install Python or add it to PATH
    exit /b 1
)

REM Check if Node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found in PATH
    echo Please install Node.js or add it to PATH
    exit /b 1
)

echo Installing Python dependencies...
python -m pip install -q -r requirements-production.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    exit /b 1
)

echo.
echo Installing Node dependencies...
cd order-delight-main
call npm ci --omit=dev
if errorlevel 1 (
    echo ERROR: Failed to install Node dependencies
    cd ..
    exit /b 1
)

echo.
echo Building frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build frontend
    cd ..
    exit /b 1
)

cd ..

echo.
echo Starting services...
echo  - Frontend: http://localhost:5000
echo  - Backend: http://localhost:8000
echo.

REM Start backend in background
start "Pre-Order Food Backend" python main.py

REM Start frontend server
cd order-delight-main
call npm run start

pause
