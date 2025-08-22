@echo off
echo ========================================
echo   REINICIANDO FRONTEND COMPLETAMENTE
echo ========================================
echo.

echo [1/4] Deteniendo procesos existentes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im npm.exe >nul 2>&1
echo ✅ Procesos detenidos

echo.
echo [2/4] Limpiando cache y dependencias...
cd frontend
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
if exist .cache rmdir /s /q .cache
echo ✅ Cache limpiado

echo.
echo [3/4] Reinstalando dependencias...
npm install
echo ✅ Dependencias instaladas

echo.
echo [4/4] Iniciando aplicación simple...
echo 🚀 Aplicación simple sin MUI activada
echo 📱 Abriendo: http://localhost:3000
start http://localhost:3000
npm start

pause