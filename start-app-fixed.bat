@echo off
echo ========================================
echo   INICIANDO APLICACION DE PRONOSTICOS
echo ========================================
echo.

echo [1/3] Verificando dependencias...
cd backend
python -c "import flask, pandas, numpy; print('✓ Dependencias del backend OK')" 2>nul
if errorlevel 1 (
    echo ❌ Error: Faltan dependencias del backend
    echo Ejecutando: pip install -r requirements.txt
    pip install -r requirements.txt
)

cd ..\frontend
call npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js/npm no está instalado
    pause
    exit /b 1
)
echo ✓ Node.js/npm OK

echo.
echo [2/3] Iniciando Backend (Puerto 5000)...
cd ..\backend
start "Backend - API Flask" cmd /k "python app.py"

echo Esperando que el backend inicie...
timeout /t 8 /nobreak >nul

echo.
echo [3/3] Iniciando Frontend (Puerto 3000)...
cd ..\frontend
start "Frontend - React App" cmd /k "npm start"

echo.
echo ========================================
echo   APLICACION INICIADA CORRECTAMENTE
echo ========================================
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:5000
echo 💚 Health:   http://localhost:5000/api/health
echo.
echo ⏳ El frontend puede tardar 1-2 minutos en cargar completamente
echo 🔄 Si aparece en blanco, espera un momento y recarga la página
echo.
echo Presiona cualquier tecla para abrir el navegador...
pause >nul

start http://localhost:3000