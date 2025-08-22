# 📊 Sistema de Pronósticos de Inventarios

Una aplicación web completa para generar pronósticos de demanda utilizando múltiples modelos de inteligencia artificial y machine learning.

## 🚀 Características Principales

- **6 Modelos de IA:** SMA, SES, Holt-Winters, ARIMA, Regresión Lineal, Random Forest
- **Interfaz Intuitiva:** React con Material-UI
- **API RESTful:** Flask backend con procesamiento paralelo
- **Visualización Interactiva:** Gráficos dinámicos con Recharts
- **Evaluación Automática:** Selección del mejor modelo basada en métricas de precisión

## 🛠️ Tecnologías Utilizadas

### Backend
- **Python 3.8+**
- **Flask** - Framework web
- **Pandas** - Manipulación de datos
- **NumPy** - Operaciones numéricas
- **Scikit-learn** - Machine Learning
- **Statsmodels** - Modelos estadísticos (ARIMA, Holt-Winters)

### Frontend
- **React 18** - Framework de UI
- **Material-UI (MUI)** - Componentes de interfaz
- **Recharts** - Visualización de datos
- **JavaScript ES6+**

## 📋 Requisitos Previos

- **Python 3.8 o superior**
- **Node.js 16 o superior**
- **npm** (incluido con Node.js)

## ⚡ Instalación Rápida

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/inventarios-pronostico.git
cd inventarios-pronostico
```

### 2. Configurar Backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configurar Frontend
```bash
cd ../frontend
npm install
```

### 4. Iniciar Aplicación
```bash
# Desde la carpeta raíz:
.\start-app-fixed.bat
```

## 🌐 Uso de la Aplicación

### 1. Acceder a la Aplicación
- Abre tu navegador en: **http://localhost:3000**

### 2. Cargar Datos
Formato JSON requerido:
```json
[
  {"month": "2023-01", "demand": 100},
  {"month": "2023-02", "demand": 120},
  {"month": "2023-03", "demand": 95}
]
```

**Requisitos:**
- Mínimo: 12 meses de datos
- Máximo: 120 meses de datos
- Columna requerida: "demand"

### 3. Procesar Modelos
- Haz clic en "Procesar Datos"
- La aplicación evaluará 6 modelos automáticamente
- Los resultados se ordenan por precisión (MAPE)

### 4. Generar Pronósticos
- Selecciona el mejor modelo
- Especifica períodos futuros (1-24 meses)
- Visualiza resultados con intervalos de confianza

## 📊 Modelos Disponibles

| Modelo | Ideal Para | Ventaja Principal |
|--------|------------|-------------------|
| **SMA** | Datos estables | Simplicidad y rapidez |
| **SES** | Sin tendencia clara | Adaptativo a cambios |
| **Holt-Winters** | Datos estacionales | Maneja tendencias y estacionalidad |
| **ARIMA** | Series complejas | Alta precisión para datos estacionarios |
| **Regresión Lineal** | Tendencias lineales | Interpretable y eficiente |
| **Random Forest** | Patrones no lineales | Robusto ante outliers |

## 🔧 API Endpoints

### Backend (Puerto 5000)

- `GET /api/health` - Estado del servidor
- `POST /api/upload` - Cargar datos
- `POST /api/process` - Procesar modelos
- `GET /api/results` - Obtener resultados
- `POST /api/forecast` - Generar pronósticos

### Ejemplo de Uso de API

```javascript
// Cargar datos
const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// Procesar modelos
await fetch('/api/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_id: sessionId })
});
```

## 🧪 Ejecutar Pruebas

### Backend
```bash
cd backend
python -m pytest
# o
python run_all_tests.py
```

### Frontend
```bash
cd frontend
npm test
```

### Validación Completa
```bash
python run_complete_validation.py
```

## 📁 Estructura del Proyecto

```
inventarios-pronostico/
├── backend/                 # API Flask
│   ├── app.py              # Servidor principal
│   ├── models.py           # Modelos de pronóstico
│   ├── requirements.txt    # Dependencias Python
│   └── tests/              # Pruebas unitarias
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── App.js         # Componente principal
│   │   └── index.js       # Punto de entrada
│   ├── package.json       # Dependencias Node.js
│   └── public/            # Archivos estáticos
├── start-app-fixed.bat    # Script de inicio
├── README.md              # Este archivo
└── .gitignore            # Archivos a ignorar
```

## 🔍 Solución de Problemas

### Pantalla en Blanco
1. Verifica que ambos servicios estén ejecutándose
2. Revisa la consola del navegador (F12)
3. Consulta `SOLUCION_PROBLEMAS.md` para diagnóstico detallado

### Errores Comunes
- **Puerto ocupado:** Cambia los puertos en la configuración
- **Dependencias faltantes:** Ejecuta `npm install` y `pip install -r requirements.txt`
- **CORS errors:** Verifica que el proxy esté configurado en package.json

## 📈 Métricas de Evaluación

- **MAPE:** Error Porcentual Absoluto Medio (menor es mejor)
- **MAE:** Error Absoluto Medio
- **MSE:** Error Cuadrático Medio
- **RMSE:** Raíz del Error Cuadrático Medio

### Interpretación de MAPE:
- **< 10%:** Excelente precisión
- **10-20%:** Buena precisión
- **20-50%:** Precisión aceptable
- **> 50%:** Revisar datos o modelo

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 👥 Autores

- **Tu Nombre** - *Desarrollo inicial* - [TuGitHub](https://github.com/tu-usuario)

## 🙏 Agradecimientos

- Material-UI por los componentes de interfaz
- Scikit-learn por los algoritmos de ML
- Statsmodels por los modelos estadísticos
- React por el framework de frontend

---

**¡Disfruta pronosticando! 📊🚀**