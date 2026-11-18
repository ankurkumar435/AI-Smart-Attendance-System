@echo off
TITLE AI Smart Attendance System Launcher
COLOR 0B

echo =====================================================================
echo       AI SMART ATTENDANCE SYSTEM - LOCAL BIOMETRIC PLATFORM
echo =====================================================================
echo.
echo Initializing Local-First Attendance Node...
echo.

:: Ensure data, backups, logs directories exist
if not exist "data" mkdir data
if not exist "backups" mkdir backups
if not exist "logs" mkdir logs

:: Check Python environment
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

:: Create and prepare an isolated backend environment
if not exist "backend\.venv\Scripts\python.exe" (
    echo Creating backend virtual environment...
    python -m venv backend\.venv
    if errorlevel 1 goto setup_error
)

echo Installing/verifying backend dependencies...
"backend\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 goto setup_error

:: Run database initialization
echo [1/3] Initializing clean local database schema and AES-256 biometric encryption...
"backend\.venv\Scripts\python.exe" backend/app/seed.py
if errorlevel 1 goto setup_error

:: Launch Backend in a separate window
echo [2/3] Launching FastAPI Backend on http://127.0.0.1:8000...
start "AI Attendance Backend (FastAPI)" cmd /k "cd /d backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Launch Frontend in a separate window
echo [3/3] Launching Vite React Frontend on http://localhost:5173...
start "AI Attendance Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo  System Successfully Launched!
echo =====================================================================
echo.
echo  - Frontend Portal:  http://localhost:5173
echo  - Backend API:      http://127.0.0.1:8000
echo  - Swagger Docs:     http://127.0.0.1:8000/docs
echo.
echo  Account Access:
echo    Open http://localhost:5173 and use "Create Account" to register
echo    as a Student, Faculty / Teacher, or Administrator.
echo    All session tokens and user data are encrypted in local storage.
echo.
echo  Press any key to close this launcher window (servers will remain running).
echo =====================================================================
pause >nul
exit /b 0

:setup_error
echo.
echo [ERROR] Backend setup failed. Review the error above, then try again.
pause
exit /b 1
