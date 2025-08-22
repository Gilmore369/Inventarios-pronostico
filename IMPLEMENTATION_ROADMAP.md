# Roadmap de Implementación de Correcciones

## Guía Técnica Detallada para Corrección de Problemas

### FASE 1: CORRECCIONES CRÍTICAS (Día 1)

#### 1.1 Instalar PyYAML (15 minutos)

**Problema:** ModuleNotFoundError: No module named 'yaml'

**Pasos Técnicos:**

```bash
# 1. Activar entorno virtual
cd Inventarios-pronostico
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# 2. Instalar PyYAML
pip install PyYAML==6.0.1

# 3. Actualizar requirements.txt
echo PyYAML==6.0.1 >> backend/requirements.txt

# 4. Verificar instalación
python -c "import yaml; print('PyYAML instalado correctamente')"

# 5. Probar script de validación
python validate_project_structure.py
```

**Verificación:**

- Script de validación ejecuta sin errores
- Archivo requirements.txt contiene PyYAML==6.0.1

#### 1.2 Corregir Pruebas Backend (2-4 horas)

**Problema:** Backend Unit Tests fallaron

**Diagnóstico Inicial:**

```bash
cd Inventarios-pronostico/backend
python -m pytest tests/ -v --tb=short --no-header
```

**Pasos de Corrección:**

1. **Verificar Estructura de Tests:**

```bash
# Listar archivos de test
find tests/ -name "*.py" -type f

# Verificar imports
python -c "
import sys
sys.path.append('.')
try:
    from models import *
    print('✅ Imports de models OK')
except Exception as e:
    print(f'❌ Error en imports: {e}')
"
```

2. **Corregir Tests de Modelos Individuales:**

```bash
# Test cada modelo por separado
python -m pytest tests/test_sma_model.py -v
python -m pytest tests/test_ses_model.py -v
python -m pytest tests/test_holt_winters_model.py -v
python -m pytest tests/test_arima_model.py -v
python -m pytest tests/test_linear_regression_model.py -v
python -m pytest tests/test_random_forest_model.py -v
```

3. **Revisar Configuración de Test Data:**

```python
# Verificar generador de datos de prueba
python -c "
from test_data_generator import TestDatasetGenerator
gen = TestDatasetGenerator()
data = gen.generate_trend_data(24, 'linear')
print(f'✅ Datos generados: {len(data)} puntos')
"
```

4. **Corregir Problemas Comunes:**

**Si hay errores de importación:**

```python
# En cada archivo de test, verificar:
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
```

**Si hay errores de datos:**

```python
# Verificar que los datos de prueba son válidos
def validate_test_data(data):
    assert len(data) >= 12, "Datos insuficientes"
    assert all(isinstance(x, (int, float)) for x in data), "Datos no numéricos"
    assert not any(math.isnan(x) for x in data), "Datos contienen NaN"
```

**Verificación:**

```bash
python -m pytest tests/ -v --tb=short
# Debe mostrar: "120 passed, 0 failed"
```

#### 1.3 Reparar Endpoints API (3-6 horas)

**Problema:** Backend API Tests fallaron

**Diagnóstico:**

```bash
# 1. Verificar que Flask inicia correctamente
cd Inventarios-pronostico/backend
python app.py
# Debe mostrar: "Running on http://127.0.0.1:5000"
```

**Pasos de Corrección:**

1. **Verificar Configuración Básica:**

```python
# En app.py, verificar:
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Verificar que todos los endpoints están definidos
@app.route('/api/upload', methods=['POST'])
@app.route('/api/process', methods=['POST'])
@app.route('/api/results/<session_id>', methods=['GET'])
@app.route('/api/forecast', methods=['POST'])
```

2. **Test Manual de Endpoints:**

```bash
# Terminal 1: Iniciar servidor
python app.py

# Terminal 2: Test endpoints
curl -X POST http://localhost:5000/api/upload \
  -H "Content-Type: application/json" \
  -d '{"data": [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210]}'

curl -X GET http://localhost:5000/api/health  # Si existe endpoint de health
```

3. **Corregir Problemas Comunes:**

**Error de CORS:**

```python
# Verificar configuración CORS
from flask_cors import CORS
CORS(app, origins=['http://localhost:3000'])
```

**Error de JSON parsing:**

```python
@app.route('/api/upload', methods=['POST'])
def upload_data():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        # ... resto del código
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

**Error de session management:**

```python
import uuid
import redis

# Verificar conexión Redis
try:
    r = redis.Redis(host='localhost', port=6379, db=0)
    r.ping()
except:
    print("⚠️ Redis no disponible, usando almacenamiento en memoria")
```

4. **Ejecutar Tests de API:**

```bash
python -m pytest tests/test_api.py -v -s
```

**Verificación:**

- Servidor Flask inicia sin errores
- Todos los endpoints responden correctamente
- Tests de API pasan al 100%

---

### FASE 2: CORRECCIONES DE ALTA PRIORIDAD (Días 2-3)

#### 2.1 Optimizar Rendimiento Backend (4-8 horas)

**Problema:** Backend Performance Tests fallaron

**Diagnóstico de Rendimiento:**

```python
# Script de profiling
import cProfile
import time
from models import *

def profile_models():
    # Generar datos de prueba
    data = list(range(1, 121))  # 120 meses

    models = [
        ('SMA', SimpleMovingAverage()),
        ('SES', SimpleExponentialSmoothing()),
        ('HoltWinters', HoltWinters()),
        ('ARIMA', ARIMAModel()),
        ('LinearRegression', LinearRegressionModel()),
        ('RandomForest', RandomForestModel())
    ]

    for name, model in models:
        start_time = time.time()
        try:
            result = model.fit_predict(data, forecast_periods=12)
            execution_time = time.time() - start_time
            print(f"{name}: {execution_time:.2f}s")
            if execution_time > 30:
                print(f"⚠️ {name} excede límite de 30s")
        except Exception as e:
            print(f"❌ {name} falló: {e}")

if __name__ == "__main__":
    cProfile.run('profile_models()')
```

**Optimizaciones Específicas:**

1. **ARIMA Model Optimization:**

```python
# En models.py, optimizar ARIMA
class ARIMAModel:
    def __init__(self):
        self.max_p = 3  # Reducir de 5 a 3
        self.max_d = 2  # Reducir de 3 a 2
        self.max_q = 3  # Reducir de 5 a 3

    def _find_best_order(self, data):
        # Usar información criteria más eficiente
        best_aic = float('inf')
        best_order = (1, 1, 1)

        # Búsqueda más eficiente
        for p in range(self.max_p + 1):
            for d in range(self.max_d + 1):
                for q in range(self.max_q + 1):
                    try:
                        model = ARIMA(data, order=(p, d, q))
                        fitted = model.fit(method='lbfgs', maxiter=50)  # Limitar iteraciones
                        if fitted.aic < best_aic:
                            best_aic = fitted.aic
                            best_order = (p, d, q)
                    except:
                        continue
        return best_order
```

2. **Random Forest Optimization:**

```python
class RandomForestModel:
    def __init__(self):
        # Reducir parámetros para mejor rendimiento
        self.n_estimators_options = [50, 100]  # Reducir de [50, 100, 200]
        self.max_depth_options = [5, 10]       # Reducir de [5, 10, 15, None]
```

3. **Holt-Winters Optimization:**

```python
class HoltWinters:
    def fit_predict(self, data, forecast_periods=12):
        # Usar optimización más rápida
        try:
            # Intentar modelo aditivo primero (más rápido)
            model = ExponentialSmoothing(
                data,
                trend='add',
                seasonal='add',
                seasonal_periods=min(12, len(data)//2)
            )
            fitted = model.fit(optimized=True, use_brute=False)  # Desactivar brute force
            return fitted.forecast(forecast_periods)
        except:
            # Fallback a modelo más simple
            return self._simple_forecast(data, forecast_periods)
```

**Verificación:**

```bash
python -m pytest tests/test_performance.py -v
# Verificar que todos los modelos completan en < 30s
```

#### 2.2 Corregir Componentes Frontend (3-5 horas)

**Problema:** Frontend Component Tests fallaron

**Diagnóstico:**

```bash
cd Inventarios-pronostico/frontend
npm test -- --verbose --no-coverage --watchAll=false
```

**Pasos de Corrección:**

1. **Verificar Configuración de Testing:**

```javascript
// En setupTests.js
import "@testing-library/jest-dom";

// Mock para Recharts
jest.mock("recharts", () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Mock para MUI DataGrid
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows, columns }) => (
    <div data-testid="data-grid">
      {rows.map((row, index) => (
        <div key={index} data-testid={`row-${index}`}>
          {columns.map((col) => row[col.field]).join(" | ")}
        </div>
      ))}
    </div>
  ),
}));
```

2. **Corregir Tests de DataInput:**

```javascript
// En DataInput.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DataInput from "../DataInput";

// Mock fetch
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
});

test("should handle manual data input", async () => {
  render(<DataInput onDataSubmit={jest.fn()} />);

  // Verificar elementos básicos
  expect(screen.getByText(/entrada de datos/i)).toBeInTheDocument();

  // Test agregar fila
  const addButton = screen.getByText(/agregar fila/i);
  fireEvent.click(addButton);

  // Verificar que se agregó una fila
  await waitFor(() => {
    expect(screen.getAllByRole("textbox")).toHaveLength(2); // Mes y Demanda
  });
});
```

3. **Corregir Tests de ResultsTable:**

```javascript
// En ResultsTable.test.jsx
test("should display top 10 models sorted by MAPE", () => {
  const mockResults = [
    {
      model: "SMA",
      mae: 10,
      mse: 100,
      rmse: 10,
      mape: 5.5,
      parameters: { window: 3 },
    },
    {
      model: "SES",
      mae: 12,
      mse: 144,
      rmse: 12,
      mape: 6.2,
      parameters: { alpha: 0.3 },
    },
  ];

  render(<ResultsTable results={mockResults} onModelSelect={jest.fn()} />);

  // Verificar que los resultados se muestran
  expect(screen.getByText("SMA")).toBeInTheDocument();
  expect(screen.getByText("5.5")).toBeInTheDocument(); // MAPE
});
```

4. **Corregir Tests de Forecast:**

```javascript
// En Forecast.test.jsx
test("should generate 12-month forecast", async () => {
  const mockForecastData = {
    forecast: [100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155],
    model_info: { name: "SMA", parameters: { window: 3 } },
  };

  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => mockForecastData,
  });

  render(<Forecast selectedModel="SMA" sessionId="test-session" />);

  // Verificar que el gráfico se renderiza
  await waitFor(() => {
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});
```

**Verificación:**

```bash
npm test -- --watchAll=false --coverage
# Verificar que todos los tests pasan
```

#### 2.3 Reparar Pruebas de Usabilidad (2-4 horas)

**Problema:** Usability and UX Tests fallaron

**Pasos de Corrección:**

1. **Verificar Tests de Error Handling:**

```javascript
// En UserErrorHandling.test.jsx
test("should show clear error messages for invalid data", async () => {
  render(<DataInput onDataSubmit={jest.fn()} />);

  // Simular datos inválidos (menos de 12 meses)
  const submitButton = screen.getByText(/procesar/i);
  fireEvent.click(submitButton);

  // Verificar mensaje de error
  await waitFor(() => {
    expect(screen.getByText(/mínimo 12 meses/i)).toBeInTheDocument();
  });
});
```

2. **Corregir Tests de Navegación:**

```javascript
// En UserFlowNavigation.test.jsx
test("should navigate intuitively between components", () => {
  const { rerender } = render(<DataInput onDataSubmit={jest.fn()} />);

  // Verificar navegación lógica
  expect(screen.getByText(/entrada de datos/i)).toBeInTheDocument();

  // Simular progresión a resultados
  rerender(<ResultsTable results={[]} onModelSelect={jest.fn()} />);
  expect(screen.getByText(/resultados/i)).toBeInTheDocument();
});
```

3. **Verificar Tests de Accesibilidad:**

```javascript
test("should support keyboard navigation", () => {
  render(<DataInput onDataSubmit={jest.fn()} />);

  const firstInput = screen.getAllByRole("textbox")[0];
  firstInput.focus();

  // Simular navegación con Tab
  fireEvent.keyDown(firstInput, { key: "Tab" });

  // Verificar que el foco se mueve correctamente
  expect(document.activeElement).not.toBe(firstInput);
});
```

#### 2.4 Corregir Integración E2E (4-6 horas)

**Problema:** End-to-End Integration Tests fallaron

**Pasos de Corrección:**

1. **Verificar Configuración de Servicios:**

```bash
# Terminal 1: Backend
cd Inventarios-pronostico/backend
python app.py

# Terminal 2: Redis (si es necesario)
redis-server

# Terminal 3: Frontend
cd Inventarios-pronostico/frontend
npm start

# Terminal 4: Tests
cd Inventarios-pronostico/backend
python run_integration_tests.py
```

2. **Corregir Tests de Flujo Completo:**

```python
# En test_e2e_integration.py
def test_complete_flow_with_synthetic_data(self):
    # 1. Upload data
    upload_data = {
        "data": [100 + i*5 for i in range(24)],  # 24 meses de datos
        "input_type": "manual"
    }

    response = requests.post(f"{self.base_url}/api/upload", json=upload_data)
    self.assertEqual(response.status_code, 200)

    session_id = response.json()['session_id']

    # 2. Process data
    process_response = requests.post(f"{self.base_url}/api/process",
                                   json={"session_id": session_id})
    self.assertEqual(process_response.status_code, 200)

    # 3. Wait for results and get them
    time.sleep(5)  # Esperar procesamiento
    results_response = requests.get(f"{self.base_url}/api/results/{session_id}")
    self.assertEqual(results_response.status_code, 200)

    results = results_response.json()
    self.assertIn('results', results)
    self.assertGreater(len(results['results']), 0)

    # 4. Generate forecast
    best_model = results['results'][0]['model']
    forecast_data = {
        "session_id": session_id,
        "model": best_model,
        "periods": 12
    }

    forecast_response = requests.post(f"{self.base_url}/api/forecast",
                                    json=forecast_data)
    self.assertEqual(forecast_response.status_code, 200)

    forecast = forecast_response.json()
    self.assertIn('forecast', forecast)
    self.assertEqual(len(forecast['forecast']), 12)
```

3. **Verificar Manejo de Errores:**

```python
def test_api_error_handling(self):
    # Test con session_id inválido
    response = requests.get(f"{self.base_url}/api/results/invalid-session")
    self.assertEqual(response.status_code, 404)

    # Test con datos insuficientes
    upload_data = {"data": [100, 110]}  # Solo 2 meses
    response = requests.post(f"{self.base_url}/api/upload", json=upload_data)
    self.assertEqual(response.status_code, 400)
```

---

### FASE 3: VALIDACIÓN FINAL (Día 4)

#### 3.1 Ejecutar Suite Completa (2-3 horas)

```bash
# 1. Validación de estructura
cd Inventarios-pronostico
python validate_project_structure.py

# 2. Tests unitarios backend
cd backend
python -m pytest tests/ -v --cov=. --cov-report=html

# 3. Tests de API
python -m pytest tests/test_api.py -v

# 4. Tests de rendimiento
python -m pytest tests/test_performance.py -v

# 5. Tests frontend
cd ../frontend
npm test -- --coverage --watchAll=false

# 6. Tests de integración E2E
cd ../backend
python run_integration_tests.py

# 7. Validación completa final
cd ..
python run_complete_validation.py
```

#### 3.2 Generar Reporte Final

```bash
# Ejecutar validación completa y generar reporte
python run_complete_validation.py --generate-report
```

**Criterios de Éxito Final:**

- ✅ Tasa de éxito de validación: > 95%
- ✅ Todos los tests críticos pasan
- ✅ Rendimiento dentro de límites establecidos
- ✅ Funcionalidad E2E verificada

---

### HERRAMIENTAS DE DEBUGGING

#### Logs Detallados

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# En cada test fallido, agregar:
print(f"DEBUG: Estado actual = {variable}")
```

#### Profiling de Rendimiento

```bash
# Para identificar cuellos de botella
python -m cProfile -o profile_output.prof script.py
python -c "import pstats; pstats.Stats('profile_output.prof').sort_stats('cumulative').print_stats(10)"
```

#### Verificación de Dependencias

```bash
# Verificar todas las dependencias
pip list
npm list

# Verificar conflictos
pip check
npm audit
```

---

_Roadmap técnico detallado para implementación de correcciones - 2025-08-22_
