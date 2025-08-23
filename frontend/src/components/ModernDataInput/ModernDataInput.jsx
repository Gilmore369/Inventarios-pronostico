import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon,
  PlayArrow as ProcessIcon
} from '@mui/icons-material';

import ManualDataEntry from './ManualDataEntry';
import FileUpload from './FileUpload';
import DataPreview from './DataPreview';
import { useDataValidation } from './hooks/useDataValidation';
import { useApiUpload } from './hooks/useApiUpload';
import { useToastNotification } from './hooks/useToastNotification';
import { ErrorDisplay, ToastNotification, ApiUploadLoader, FileProcessingLoader } from './components';

/**
 * Main ModernDataInput component with tab system
 * Implements requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
export default function ModernDataInput({ 
  onDataUpload,
  initialData = [],
  maxRows = 120,
  minRows = 12 
}) {
  // Tab state management (requirement 3.1, 3.2)
  const [activeTab, setActiveTab] = useState(0);
  
  // Data state for both input methods
  const [manualData, setManualData] = useState(initialData);
  const [fileData, setFileData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [fileMetadata, setFileMetadata] = useState({});
  
  // Loading and error states (requirement 3.4, 3.5)
  const [processingFile, setProcessingFile] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  
  // Hooks
  const { validateData, hasErrors, validationErrors } = useDataValidation();
  const { upload, loading: uploadLoading, error: uploadError } = useApiUpload();
  const {
    notifications,
    showFileProcessingSuccess,
    showFileProcessingError,
    showValidationError,
    showUploadSuccess,
    showUploadError,
    hideNotification
  } = useToastNotification();

  // Tab change handler (requirement 3.2)
  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
    setGeneralError(null); // Clear errors when switching tabs
  }, []);

  // Manual data change handler
  const handleManualDataChange = useCallback((data) => {
    setManualData(data);
    setPreviewData(null); // Clear file preview when manual data changes
  }, []);

  // File processing handler
  const handleFileProcessed = useCallback((file, result) => {
    setProcessingFile(false);
    setFileData(result.data);
    setFileMetadata(result.metadata || {});
    setPreviewData(result.data);
    setGeneralError(null);
    
    // Show success notification
    showFileProcessingSuccess(file.name, result.data.length);
  }, [showFileProcessingSuccess]);

  // File processing error handler
  const handleFileError = useCallback((error) => {
    setProcessingFile(false);
    setGeneralError(error);
    setFileData(null);
    setPreviewData(null);
    
    // Show error notification
    showFileProcessingError('archivo seleccionado', error);
  }, [showFileProcessingError]);

  // File processing start handler
  const handleFileProcessingStart = useCallback(() => {
    setProcessingFile(true);
    setGeneralError(null);
  }, []);

  // Preview confirmation handler
  const handlePreviewConfirm = useCallback(() => {
    setPreviewData(null);
    // Data is already set in fileData, so we can proceed to process
  }, []);

  // Preview cancellation handler
  const handlePreviewCancel = useCallback(() => {
    setPreviewData(null);
    setFileData(null);
    setFileMetadata({});
  }, []);

  // Get current data based on active tab
  const currentData = useMemo(() => {
    if (activeTab === 0) {
      return manualData;
    } else {
      return fileData || [];
    }
  }, [activeTab, manualData, fileData]);

  // Validate current data and determine if processing is enabled (requirement 3.6, 3.7)
  const canProcess = useMemo(() => {
    if (currentData.length === 0) return false;
    
    const validation = validateData(currentData);
    return validation.isValid;
  }, [currentData, validateData]);

  // Data processing handler (requirement 3.6, 3.7)
  const handleProcessData = useCallback(async () => {
    if (!canProcess) {
      const errorCount = validationErrors.filter(e => e.severity === 'error').length;
      setGeneralError('Los datos no son válidos para procesar');
      showValidationError(errorCount);
      return;
    }

    try {
      setGeneralError(null);
      
      // Upload data to backend
      const result = await upload(currentData);
      
      if (result.success) {
        // Show success notification
        showUploadSuccess(result.sessionId);
        
        // Call the parent callback with session ID (requirement 5.1, 5.5)
        if (onDataUpload) {
          onDataUpload(result.sessionId);
        }
      } else {
        const errorMessage = result.error || 'Error al procesar los datos';
        setGeneralError(errorMessage);
        showUploadError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Error inesperado al procesar los datos';
      setGeneralError(errorMessage);
      showUploadError(errorMessage);
    }
  }, [canProcess, currentData, upload, onDataUpload, validationErrors, showValidationError, showUploadSuccess, showUploadError]);

  return (
    <Paper elevation={2} sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Cargar Datos de Demanda
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Seleccione el método de entrada de datos que prefiera utilizar
        </Typography>
      </Box>

      {/* Tab Navigation (requirement 3.1, 3.2, 3.3) */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          aria-label="Métodos de entrada de datos"
          variant="fullWidth"
        >
          <Tab 
            icon={<EditIcon />} 
            label="Entrada Manual" 
            id="tab-manual"
            aria-controls="tabpanel-manual"
          />
          <Tab 
            icon={<CloudUploadIcon />} 
            label="Subir Archivo" 
            id="tab-file"
            aria-controls="tabpanel-file"
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ minHeight: 400, position: 'relative' }}>
        {/* Manual Data Entry Tab */}
        <Box
          role="tabpanel"
          hidden={activeTab !== 0}
          id="tabpanel-manual"
          aria-labelledby="tab-manual"
        >
          {activeTab === 0 && (
            <ManualDataEntry
              data={manualData}
              onChange={handleManualDataChange}
              disabled={uploadLoading || processingFile}
            />
          )}
        </Box>

        {/* File Upload Tab */}
        <Box
          role="tabpanel"
          hidden={activeTab !== 1}
          id="tabpanel-file"
          aria-labelledby="tab-file"
        >
          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              {!previewData ? (
                <FileUpload
                  onFileProcessed={handleFileProcessed}
                  onError={handleFileError}
                  onDataProcessed={handleFileProcessingStart}
                />
              ) : (
                <DataPreview
                  data={previewData}
                  metadata={fileMetadata}
                  onConfirm={handlePreviewConfirm}
                  onCancel={handlePreviewCancel}
                  loading={uploadLoading}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Processing overlay */}
        {processingFile && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              zIndex: 1
            }}
          >
            <FileProcessingLoader 
              loading={processingFile}
              message="Procesando archivo..."
            />
          </Box>
        )}
      </Box>

      {/* General Error Display (requirement 3.5) */}
      {(generalError || uploadError) && (
        <Box sx={{ p: 3, pt: 0 }}>
          <ErrorDisplay 
            errors={[{
              row: -1,
              field: 'general',
              message: generalError || uploadError,
              severity: 'error'
            }]}
            title="Error del Sistema"
            collapsible={false}
          />
        </Box>
      )}

      {/* Processing Controls */}
      <Box sx={{ 
        p: 3, 
        borderTop: 1, 
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: 'grey.50'
      }}>
        {/* Data Summary */}
        <Box>
          <Typography variant="body2" color="text.secondary">
            {currentData.length > 0 ? (
              <>
                {currentData.length} registro{currentData.length !== 1 ? 's' : ''} cargado{currentData.length !== 1 ? 's' : ''}
                {hasErrors && (
                  <Typography component="span" color="error" sx={{ ml: 1 }}>
                    • {validationErrors.filter(e => e.severity === 'error').length} error{validationErrors.filter(e => e.severity === 'error').length !== 1 ? 'es' : ''}
                  </Typography>
                )}
              </>
            ) : (
              'No hay datos cargados'
            )}
          </Typography>
        </Box>

        {/* Process Button (requirement 3.6, 3.7) */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {uploadLoading && (
            <ApiUploadLoader 
              loading={uploadLoading}
              message="Enviando datos..."
            />
          )}
          <Button
            variant="contained"
            size="large"
            startIcon={uploadLoading ? null : <ProcessIcon />}
            onClick={handleProcessData}
            disabled={!canProcess || uploadLoading || processingFile}
            sx={{ minWidth: 160 }}
          >
            {uploadLoading ? 'Procesando...' : 'Procesar Datos'}
          </Button>
        </Box>
      </Box>

      {/* Toast Notifications */}
      {notifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          open={notification.open}
          message={notification.message}
          severity={notification.severity}
          title={notification.title}
          duration={notification.duration}
          onClose={() => hideNotification(notification.id)}
        />
      ))}
    </Paper>
  );
}