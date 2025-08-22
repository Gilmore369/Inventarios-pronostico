@echo off
echo ========================================
echo   VERIFICANDO ESTADO DE SERVICIOS
echo ========================================
echo.

echo [1/3] Verificando Backend (Puerto 5000)...
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend funcionando en puerto 5000
    curl http://localhost:5000/api/health
) else (
    echo ❌ Backend NO responde en puerto 5000
    echo Iniciando backend...
    start "Backend" cmd /k "cd backend && python app.py"
    timeout /t 5 /nobreak >nul
)

echo.
echo [2/3] Verificando Frontend (Puerto 3000)...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend funcionando en puerto 3000
) else (
    echo ❌ Frontend NO responde en puerto 3000
    echo Iniciando frontend...
    start "Frontend" cmd /k "cd frontend && npm start"
)

echo.
echo [3/3] Abriendo navegador en modo de prueba...
echo 🔍 Modo de prueba activado en index.js
echo 📱 Abriendo: http://localhost:3000
start http://localhost:3000

echo.
echo ========================================
echo   VERIFICACION COMPLETADA
echo ========================================
echo.
echo Si ves una página de prueba simple, React funciona.
echo Si sigue en blanco, hay un problema más profundo.
echo.
pause