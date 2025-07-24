@echo off
echo 🔨 Build Production Cross-Platform - BroLab Entertainment

rem Use Node.js script for cross-platform compatibility
node scripts/deploy-o2switch.js

if errorlevel 1 (
    echo ❌ Build failed. Check error messages above.
    pause
    exit /b 1
)

echo.
echo ✅ Build production terminé avec succès!
echo 📁 Fichiers prêts dans dist/
echo 🚀 Prêt pour déploiement o2switch
echo.
pause