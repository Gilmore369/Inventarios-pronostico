@echo off
echo ========================================
echo  VALIDACION DE ESTRUCTURA DEL PROYECTO
echo ========================================
echo.

REM Verificar si Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no está instalado o no está en el PATH
    echo Por favor instale Python 3.7+ y agregue al PATH
    pause
    exit /b 1
)

REM Verificar si PyYAML está instalado
python -c "import yaml" >nul 2>&1
if errorlevel 1 (
    echo Instalando PyYAML...
    pip install PyYAML
    if errorlevel 1 (
        echo ERROR: No se pudo instalar PyYAML
        pause
        exit /b 1
    )
)

echo Ejecutando validación de estructura del proyecto...
echo.

REM Ejecutar el script de validación
python validate_project_structure.py

REM Mostrar el código de salida
if errorlevel 1 (
    echo.
    echo ❌ VALIDACION FALLIDA - Se encontraron errores
    echo Revise el reporte para más detalles
) else (
    echo.
    echo ✅ VALIDACION EXITOSA - Proyecto tiene estructura correcta
)

echo.
echo Presione cualquier tecla para continuar...
pause >nul