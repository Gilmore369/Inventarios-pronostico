#!/bin/bash

echo "========================================"
echo " VALIDACION DE ESTRUCTURA DEL PROYECTO"
echo "========================================"
echo

# Verificar si Python está instalado
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "❌ ERROR: Python no está instalado"
        echo "Por favor instale Python 3.7+ antes de continuar"
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

echo "🐍 Usando: $($PYTHON_CMD --version)"

# Verificar si PyYAML está instalado
$PYTHON_CMD -c "import yaml" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 Instalando PyYAML..."
    $PYTHON_CMD -m pip install PyYAML
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: No se pudo instalar PyYAML"
        exit 1
    fi
fi

echo "🔍 Ejecutando validación de estructura del proyecto..."
echo

# Ejecutar el script de validación
$PYTHON_CMD validate_project_structure.py

# Verificar el código de salida
if [ $? -eq 0 ]; then
    echo
    echo "✅ VALIDACION EXITOSA - Proyecto tiene estructura correcta"
else
    echo
    echo "❌ VALIDACION FALLIDA - Se encontraron errores"
    echo "Revise el reporte para más detalles"
fi

echo
echo "📄 Reporte detallado guardado en: validation_report.json"