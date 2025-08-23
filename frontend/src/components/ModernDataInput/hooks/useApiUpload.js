import { useState, useCallback } from 'react';

/**
 * Custom hook for handling API uploads to the backend
 * Maintains compatibility with existing backend response format
 * Handles both JSON data and file uploads
 */
export const useApiUpload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // API endpoint configuration
  const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';
  const UPLOAD_ENDPOINT = '/api/upload';

  /**
   * Uploads JSON data to the backend
   * @param {Array} data - Array of demand data objects with month and demand properties
   * @returns {Promise<object>} - Promise that resolves to the API response
   */
  const uploadJsonData = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Validate input data
      if (!Array.isArray(data)) {
        throw new Error('Los datos deben ser un array válido');
      }

      if (data.length === 0) {
        throw new Error('No se pueden enviar datos vacíos');
      }

      // Make API request
      const response = await fetch(`${API_BASE_URL}${UPLOAD_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // Parse response
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error del servidor: ${response.status}`);
      }

      // Check for session_id in response
      if (!result.session_id) {
        throw new Error('Respuesta del servidor inválida: falta session_id');
      }

      setSessionId(result.session_id);
      setLoading(false);

      return {
        success: true,
        sessionId: result.session_id,
        message: result.message || 'Datos procesados exitosamente',
        data: result
      };

    } catch (error) {
      const errorMessage = error.message || 'Error desconocido al subir datos';
      setError(errorMessage);
      setLoading(false);

      return {
        success: false,
        error: errorMessage,
        sessionId: null
      };
    }
  }, []);

  /**
   * Uploads a file to the backend
   * @param {File} file - The file to upload
   * @returns {Promise<object>} - Promise that resolves to the API response
   */
  const uploadFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);

    try {
      // Validate file
      if (!file) {
        throw new Error('No se ha seleccionado ningún archivo');
      }

      // Check file type
      const allowedTypes = ['.csv', '.xls', '.xlsx'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        throw new Error(`Tipo de archivo no válido. Se permiten: ${allowedTypes.join(', ')}`);
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('El archivo es demasiado grande. Tamaño máximo: 10MB');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Make API request
      const response = await fetch(`${API_BASE_URL}${UPLOAD_ENDPOINT}`, {
        method: 'POST',
        body: formData,
      });

      // Parse response
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Error del servidor: ${response.status}`);
      }

      // Check for session_id in response
      if (!result.session_id) {
        throw new Error('Respuesta del servidor inválida: falta session_id');
      }

      setSessionId(result.session_id);
      setLoading(false);

      return {
        success: true,
        sessionId: result.session_id,
        message: result.message || 'Archivo procesado exitosamente',
        data: result
      };

    } catch (error) {
      const errorMessage = error.message || 'Error desconocido al subir archivo';
      setError(errorMessage);
      setLoading(false);

      return {
        success: false,
        error: errorMessage,
        sessionId: null
      };
    }
  }, []);

  /**
   * Generic upload function that determines the upload method based on input type
   * @param {Array|File} dataOrFile - Either an array of data objects or a File object
   * @returns {Promise<object>} - Promise that resolves to the API response
   */
  const upload = useCallback(async (dataOrFile) => {
    if (dataOrFile instanceof File) {
      return uploadFile(dataOrFile);
    } else if (Array.isArray(dataOrFile)) {
      return uploadJsonData(dataOrFile);
    } else {
      setError('Tipo de datos no válido para upload');
      return {
        success: false,
        error: 'Tipo de datos no válido para upload',
        sessionId: null
      };
    }
  }, [uploadFile, uploadJsonData]);

  /**
   * Clears the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clears the current session ID
   */
  const clearSession = useCallback(() => {
    setSessionId(null);
  }, []);

  /**
   * Resets all state to initial values
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSessionId(null);
  }, []);

  /**
   * Checks if the API is available
   * @returns {Promise<boolean>} - Promise that resolves to true if API is available
   */
  const checkApiHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.warn('API health check failed:', error);
      return false;
    }
  }, []);

  return {
    // Upload functions
    upload,
    uploadJsonData,
    uploadFile,
    
    // State
    loading,
    error,
    sessionId,
    
    // Utilities
    clearError,
    clearSession,
    reset,
    checkApiHealth,
    
    // Configuration
    apiBaseUrl: API_BASE_URL,
    uploadEndpoint: UPLOAD_ENDPOINT
  };
};