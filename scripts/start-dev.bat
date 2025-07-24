@echo off
echo ============================================
echo BroLab Entertainment - Development Server
echo ============================================

echo.
echo Checking environment...
if not exist .env (
    echo ❌ .env file not found
    echo Please copy .env.local.example to .env and configure it
    pause
    exit /b 1
)

echo ✅ Environment configured
echo.
echo Starting development server...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev