@echo off
echo Iniciando aplicacion de pronosticos de inventarios...
echo.

echo [1/2] Iniciando Backend (Flask)...
start "Backend - Flask" cmd /k "cd backend && python app.py"

echo [2/2] Esperando 5 segundos antes de iniciar Frontend...
timeout /t 5 /nobreak >nul

echo Iniciando Frontend (React)...
start "Frontend - React" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo   APLICACION INICIADA CORRECTAMENTE
echo ========================================
echo.
echo Backend (API): http://localhost:5000
echo Frontend (Web): http://localhost:3000
echo.
echo Presiona cualquier tecla para continuar...
pause >nul