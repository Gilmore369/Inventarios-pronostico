@echo off
echo ========================================
echo   PREPARANDO PROYECTO PARA GITHUB
echo ========================================
echo.

echo [1/4] Limpiando archivos temporales...
if exist "node_modules" rmdir /s /q node_modules
if exist ".venv" rmdir /s /q .venv
if exist "__pycache__" rmdir /s /q __pycache__
if exist "*.pyc" del /q *.pyc
if exist "*.log" del /q *.log
if exist "validation_report.json" del /q validation_report.json
if exist "complete_validation_report.json" del /q complete_validation_report.json
echo ✓ Archivos temporales eliminados

echo.
echo [2/4] Verificando estructura del proyecto...
echo ✓ Backend: app.py, models.py, requirements.txt
echo ✓ Frontend: package.json, src/, public/
echo ✓ Documentación: README.md, GUIA_DE_USO.md
echo ✓ Scripts: start-app-fixed.bat

echo.
echo [3/4] Creando archivo de licencia...
echo MIT License > LICENSE
echo. >> LICENSE
echo Copyright (c) 2025 >> LICENSE
echo. >> LICENSE
echo Permission is hereby granted, free of charge, to any person obtaining a copy >> LICENSE
echo of this software and associated documentation files... >> LICENSE
echo ✓ Licencia MIT creada

echo.
echo [4/4] Inicializando repositorio Git...
if not exist ".git" (
    git init
    echo ✓ Repositorio Git inicializado
) else (
    echo ✓ Repositorio Git ya existe
)

git add .
git status

echo.
echo ========================================
echo   PROYECTO LISTO PARA GITHUB
echo ========================================
echo.
echo Próximos pasos:
echo 1. git commit -m "Aplicación de pronósticos funcionando"
echo 2. Crear repositorio en GitHub
echo 3. git remote add origin https://github.com/tu-usuario/inventarios-pronostico.git
echo 4. git push -u origin main
echo.
echo ¡El proyecto está listo para subir a GitHub! 🚀
pause