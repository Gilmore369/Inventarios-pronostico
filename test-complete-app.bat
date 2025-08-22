@echo off
echo ========================================
echo   PROBANDO APLICACION COMPLETA
echo ========================================
echo.

echo [1/3] Verificando Backend...
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend funcionando en puerto 5000
) else (
    echo ❌ Backend NO responde - Iniciando...
    start "Backend" cmd /k "cd backend && python app.py"
    timeout /t 5 /nobreak >nul
)

echo.
echo [2/3] Verificando Frontend...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend funcionando en puerto 3000
) else (
    echo ❌ Frontend NO responde - Iniciando...
    start "Frontend" cmd /k "cd frontend && npm start"
    timeout /t 10 /nobreak >nul
)

echo.
echo [3/3] Abriendo aplicación...
echo 🌐 Abriendo: http://localhost:3000
echo.
echo ========================================
echo   APLICACION LISTA PARA PROBAR
echo ========================================
echo.
echo 📊 Funcionalidades disponibles:
echo   ✅ Cargar datos JSON
echo   ✅ Procesar 6 modelos de IA
echo   ✅ Ver resultados ordenados por precisión
echo   ✅ Interfaz simple y funcional
echo.
echo 💡 Datos de ejemplo incluidos automáticamente
echo 🚀 ¡Solo haz clic en "Procesar Datos"!
echo.

start http://localhost:3000
pause