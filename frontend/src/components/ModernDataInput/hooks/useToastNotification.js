import { useState, useCallback } from 'react';

/**
 * Custom hook for managing toast notifications
 * Provides centralized toast notification management
 * Requirements: 3.5, 4.4
 */
export const useToastNotification = () => {
  const [notifications, setNotifications] = useState([]);

  /**
   * Shows a new toast notification
   * @param {object} notification - Notification configuration
   * @param {string} notification.message - The message to display
   * @param {string} notification.severity - The severity level (error, warning, info, success)
   * @param {string} notification.title - Optional title for the notification
   * @param {number} notification.duration - Duration in milliseconds (default: 6000)
   * @param {string} notification.id - Optional custom ID (auto-generated if not provided)
   */
  const showNotification = useCallback((notification) => {
    const id = notification.id || Date.now().toString();
    const newNotification = {
      id,
      message: notification.message || '',
      severity: notification.severity || 'info',
      title: notification.title || '',
      duration: notification.duration || 6000,
      open: true
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  /**
   * Hides a specific notification
   * @param {string} id - The ID of the notification to hide
   */
  const hideNotification = useCallback((id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, open: false }
          : notification
      )
    );

    // Remove from array after animation completes
    setTimeout(() => {
      setNotifications(prev => 
        prev.filter(notification => notification.id !== id)
      );
    }, 300);
  }, []);

  /**
   * Clears all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Shows a success notification
   * @param {string} message - The success message
   * @param {string} title - Optional title
   * @param {number} duration - Optional duration
   */
  const showSuccess = useCallback((message, title = '', duration = 4000) => {
    return showNotification({
      message,
      title,
      severity: 'success',
      duration
    });
  }, [showNotification]);

  /**
   * Shows an error notification
   * @param {string} message - The error message
   * @param {string} title - Optional title
   * @param {number} duration - Optional duration (0 = no auto-hide)
   */
  const showError = useCallback((message, title = 'Error', duration = 0) => {
    return showNotification({
      message,
      title,
      severity: 'error',
      duration
    });
  }, [showNotification]);

  /**
   * Shows a warning notification
   * @param {string} message - The warning message
   * @param {string} title - Optional title
   * @param {number} duration - Optional duration
   */
  const showWarning = useCallback((message, title = 'Advertencia', duration = 6000) => {
    return showNotification({
      message,
      title,
      severity: 'warning',
      duration
    });
  }, [showNotification]);

  /**
   * Shows an info notification
   * @param {string} message - The info message
   * @param {string} title - Optional title
   * @param {number} duration - Optional duration
   */
  const showInfo = useCallback((message, title = '', duration = 4000) => {
    return showNotification({
      message,
      title,
      severity: 'info',
      duration
    });
  }, [showNotification]);

  /**
   * Shows a file processing success notification
   * @param {string} fileName - The name of the processed file
   * @param {number} recordCount - Number of records processed
   */
  const showFileProcessingSuccess = useCallback((fileName, recordCount) => {
    return showSuccess(
      `Archivo "${fileName}" procesado exitosamente. ${recordCount} registros cargados.`,
      'Archivo Procesado',
      5000
    );
  }, [showSuccess]);

  /**
   * Shows a file processing error notification
   * @param {string} fileName - The name of the file that failed
   * @param {string} error - The error message
   */
  const showFileProcessingError = useCallback((fileName, error) => {
    return showError(
      `Error al procesar "${fileName}": ${error}`,
      'Error de Procesamiento'
    );
  }, [showError]);

  /**
   * Shows a data validation error notification
   * @param {number} errorCount - Number of validation errors
   */
  const showValidationError = useCallback((errorCount) => {
    return showError(
      `Se encontraron ${errorCount} error${errorCount !== 1 ? 'es' : ''} de validación. Por favor, corrija los datos antes de continuar.`,
      'Errores de Validación'
    );
  }, [showError]);

  /**
   * Shows an API upload success notification
   * @param {string} sessionId - The session ID returned by the API
   */
  const showUploadSuccess = useCallback((sessionId) => {
    return showSuccess(
      `Datos enviados exitosamente. ID de sesión: ${sessionId}`,
      'Datos Procesados',
      4000
    );
  }, [showSuccess]);

  /**
   * Shows an API upload error notification
   * @param {string} error - The error message from the API
   */
  const showUploadError = useCallback((error) => {
    return showError(
      `Error al enviar datos al servidor: ${error}`,
      'Error de Comunicación'
    );
  }, [showError]);

  return {
    // State
    notifications,
    
    // Generic functions
    showNotification,
    hideNotification,
    clearAllNotifications,
    
    // Convenience functions
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Specific use case functions
    showFileProcessingSuccess,
    showFileProcessingError,
    showValidationError,
    showUploadSuccess,
    showUploadError
  };
};