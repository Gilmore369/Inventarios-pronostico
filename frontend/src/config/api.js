// Configuración de API para desarrollo y producción
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // En producción usa rutas relativas
  : 'http://localhost:5000'; // En desarrollo usa localhost

export const API_ENDPOINTS = {
  upload: `${API_BASE_URL}/api/upload`,
  process: `${API_BASE_URL}/api/process`,
  results: `${API_BASE_URL}/api/results`,
  forecast: `${API_BASE_URL}/api/forecast`,
  health: `${API_BASE_URL}/api/health`
};

export default API_BASE_URL;