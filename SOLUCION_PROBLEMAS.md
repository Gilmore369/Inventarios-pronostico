# 🔧 Solución de Problemas - Aplicación de Pronósticos

## 🚨 Problema: Pantalla en Blanco

### Diagnóstico Rápido

1. **Abrir Herramientas de Desarrollador:**
   - Presiona `F12` en tu navegador
   - Ve a la pestaña "Console"
   - Busca errores en rojo

2. **Errores Comunes y Soluciones:**

#### Error: "Module not found" o dependencias faltantes
```bash
cd frontend
npm install
```

#### Error: "Cannot connect to backend"
```bash
cd backend
python app.py
```

#### Error: "CORS policy" 
- El proxy ya está configurado en package.json
- Verifica que el backend esté en puerto 5000

### 🔄 Solución Paso a Paso

#### Paso 1: Reiniciar Completamente
```bash
# Cerrar todas las ventanas de terminal
# Ejecutar el script mejorado:
.\start-app-fixed.bat
```

#### Paso 2: Verificar Backend
1. Ve a: http://localhost:5000/api/health
2. Deberías ver: `{"status": "healthy", ...}`

#### Paso 3: Verificar Frontend
1. Ve a: http://localhost:3000
2. Si aparece en blanco, espera 2 minutos y recarga

#### Paso 4: Modo de Prueba (Si sigue en blanco)
1. Edita `frontend/src/index.js`
2. Cambia `const USE_TEST_APP = false;` por `const USE_TEST_APP = true;`
3. Guarda y recarga el navegador
4. Deberías ver una página de prueba simple

### 🛠️ Comandos de Diagnóstico

#### Verificar Dependencias Backend:
```bash
cd backend
python -c "import flask, pandas, numpy, sklearn; print('OK')"
```

#### Verificar Dependencias Frontend:
```bash
cd frontend
npm list --depth=0
```

#### Reinstalar Dependencias Frontend:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### Limpiar Cache de React:
```bash
cd frontend
npm start -- --reset-cache
```

### 📋 Lista de Verificación

- [ ] ✅ Backend ejecutándose en puerto 5000
- [ ] ✅ Frontend ejecutándose en puerto 3000  
- [ ] ✅ No hay errores en la consola del navegador
- [ ] ✅ http://localhost:5000/api/health responde OK
- [ ] ✅ Dependencias instaladas correctamente

### 🔍 Logs Útiles

#### Ver logs del Backend:
- Revisa la ventana de terminal del backend
- Busca errores o warnings

#### Ver logs del Frontend:
- Abre F12 → Console en el navegador
- Busca errores en rojo

### 🚀 Alternativa: Ejecutar Manualmente

Si el script automático falla:

#### Terminal 1 (Backend):
```bash
cd backend
python app.py
```

#### Terminal 2 (Frontend):
```bash
cd frontend
npm start
```

### 📞 Última Opción: Modo Simplificado

Si nada funciona, usa los componentes simplificados:

1. Los componentes `*Simple.jsx` están creados como respaldo
2. No usan librerías complejas como DataGrid
3. Funcionalidad básica garantizada

### 🎯 Verificación Final

Una vez que funcione:
1. ✅ Puedes ver la interfaz principal
2. ✅ Puedes cargar datos JSON
3. ✅ El botón "Procesar Datos" responde
4. ✅ No hay errores en la consola

## 🔄 Para Subir a GitHub

Una vez que la aplicación funcione correctamente:

```bash
# Inicializar repositorio (si no existe)
git init

# Agregar archivos
git add .

# Commit inicial
git commit -m "Aplicación de pronósticos de inventarios funcionando"

# Conectar con GitHub
git remote add origin https://github.com/tu-usuario/inventarios-pronostico.git

# Subir código
git push -u origin main
```

### 📁 Archivos a Incluir en GitHub:
- ✅ Todo el código fuente
- ✅ README.md con instrucciones
- ✅ requirements.txt (backend)
- ✅ package.json (frontend)
- ✅ Scripts de inicio (.bat)
- ❌ node_modules/ (excluir)
- ❌ .venv/ (excluir)
- ❌ __pycache__/ (excluir)

¡La aplicación debería funcionar perfectamente siguiendo estos pasos! 🚀