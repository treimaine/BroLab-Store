@echo off
echo ============================================
echo BroLab Entertainment - Windows Setup
echo ============================================

echo.
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 24+ from nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js found

echo.
echo [2/5] Copying local configuration files...
copy package.local.json package.json >nul
copy tsconfig.local.json tsconfig.json >nul
copy vite.config.local.ts vite.config.ts >nul
copy .env.local.example .env >nul
copy .gitignore.local .gitignore >nul
echo ✅ Configuration files copied

echo.
echo [3/5] Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

echo.
echo [4/5] Checking TypeScript compilation...
npx tsc --noEmit
if %errorlevel% neq 0 (
    echo ⚠️  TypeScript errors found, but continuing...
) else (
    echo ✅ TypeScript compilation successful
)

echo.
echo [5/5] Setup completed!
echo.
echo ============================================
echo Next steps:
echo 1. Edit .env file with your API keys
echo 2. Run 'npm run dev' to start development
echo 3. Open http://localhost:3000 in your browser
echo ============================================
echo.
pause