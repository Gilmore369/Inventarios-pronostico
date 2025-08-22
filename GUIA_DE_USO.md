# 🚀 Guía de Uso - Aplicación de Pronósticos de Inventarios

## ✅ Aplicación Iniciada Correctamente

### 🌐 URLs de Acceso
- **Frontend (Interfaz Web):** http://localhost:3000
- **Backend (API):** http://localhost:5000

## 📋 Cómo Usar la Aplicación

### Paso 1: Acceder a la Aplicación
1. Abre tu navegador web
2. Ve a: **http://localhost:3000**
3. Verás la interfaz principal de la aplicación

### Paso 2: Cargar Datos de Demanda
La aplicación acepta dos formatos de datos:

#### Opción A: Datos Manuales (JSON)
```json
[
  {"month": "2023-01", "demand": 100},
  {"month": "2023-02", "demand": 120},
  {"month": "2023-03", "demand": 95},
  ...
]
```

#### Opción B: Archivo CSV
Formato del archivo CSV:
```csv
month,demand
2023-01,100
2023-02,120
2023-03,95
...
```

**Requisitos de datos:**
- Mínimo: 12 meses de datos
- Máximo: 120 meses de datos
- Columna requerida: "demand"

### Paso 3: Procesar Modelos
1. Después de cargar los datos, haz clic en "Procesar Modelos"
2. La aplicación ejecutará 6 modelos de pronóstico:
   - SMA (Simple Moving Average)
   - SES (Simple Exponential Smoothing)
   - Holt-Winters
   - ARIMA
   - Regresión Lineal
   - Random Forest

### Paso 4: Ver Resultados
- Los resultados se mostrarán ordenados por precisión (MAPE)
- Verás métricas de rendimiento para cada modelo:
  - **MAPE:** Error Porcentual Absoluto Medio
  - **MAE:** Error Absoluto Medio
  - **MSE:** Error Cuadrático Medio
  - **RMSE:** Raíz del Error Cuadrático Medio

### Paso 5: Generar Pronósticos
1. Selecciona el mejor modelo de la tabla de resultados
2. Especifica el número de períodos a pronosticar (1-24 meses)
3. Haz clic en "Generar Pronóstico"
4. Visualiza los resultados en gráficos interactivos

## 🔧 Funcionalidades Principales

### ✨ Características Destacadas
- **6 Modelos de Pronóstico:** Diferentes algoritmos para máxima precisión
- **Evaluación Automática:** Selección del mejor modelo basada en métricas
- **Visualización Interactiva:** Gráficos dinámicos con Recharts
- **Interfaz Intuitiva:** Diseño Material-UI responsive
- **Procesamiento Paralelo:** Ejecución simultánea de modelos para mayor velocidad

### 📊 Modelos Disponibles

1. **SMA (Simple Moving Average)**
   - Ideal para: Datos con poca variabilidad
   - Ventaja: Simple y rápido

2. **SES (Simple Exponential Smoothing)**
   - Ideal para: Datos sin tendencia clara
   - Ventaja: Adaptativo a cambios recientes

3. **Holt-Winters**
   - Ideal para: Datos con estacionalidad
   - Ventaja: Maneja tendencias y patrones estacionales

4. **ARIMA**
   - Ideal para: Series temporales complejas
   - Ventaja: Muy preciso para datos estacionarios

5. **Regresión Lineal**
   - Ideal para: Datos con tendencia lineal clara
   - Ventaja: Interpretable y eficiente

6. **Random Forest**
   - Ideal para: Patrones complejos no lineales
   - Ventaja: Robusto ante outliers

## 🛠️ Solución de Problemas

### Problema: No se puede acceder a la aplicación
**Solución:**
1. Verifica que ambos servicios estén ejecutándose
2. Revisa que los puertos 3000 y 5000 estén disponibles
3. Reinicia la aplicación ejecutando `start-app.bat`

### Problema: Error al cargar datos
**Solución:**
1. Verifica que el archivo CSV tenga la columna "demand"
2. Asegúrate de tener entre 12 y 120 filas de datos
3. Revisa que no haya valores faltantes o inválidos

### Problema: Modelos no procesan
**Solución:**
1. Verifica la conexión entre frontend y backend
2. Revisa la consola del navegador para errores
3. Asegúrate de que los datos estén en el formato correcto

## 📁 Estructura de Archivos

```
Inventarios-pronostico/
├── backend/           # API Flask
│   ├── app.py        # Servidor principal
│   ├── models.py     # Modelos de pronóstico
│   └── requirements.txt
├── frontend/         # Aplicación React
│   ├── src/
│   │   ├── components/
│   │   └── App.js
│   └── package.json
└── start-app.bat     # Script de inicio
```

## 🎯 Consejos de Uso

### Para Mejores Resultados:
1. **Usa datos históricos consistentes** (mismo período, misma unidad)
2. **Incluye datos estacionales** si tu negocio tiene patrones estacionales
3. **Revisa outliers** antes de cargar los datos
4. **Compara múltiples modelos** para validar resultados

### Interpretación de Métricas:
- **MAPE < 10%:** Excelente precisión
- **MAPE 10-20%:** Buena precisión
- **MAPE 20-50%:** Precisión aceptable
- **MAPE > 50%:** Revisar datos o modelo

## 🚀 ¡Listo para Usar!

Tu aplicación de pronósticos de inventarios está completamente funcional y lista para generar predicciones precisas para tu negocio.

**¡Disfruta pronosticando! 📈**