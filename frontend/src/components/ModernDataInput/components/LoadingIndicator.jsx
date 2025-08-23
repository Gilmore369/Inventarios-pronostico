import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Backdrop,
  Paper
} from '@mui/material';

/**
 * LoadingIndicator component for showing loading states and progress
 * Implements CircularProgress for file processing and API communication
 * Requirements: 3.4
 */
export default function LoadingIndicator({
  loading = false,
  type = 'circular', // 'circular', 'linear', 'backdrop', 'inline'
  message = 'Cargando...',
  progress = null, // 0-100 for determinate progress
  size = 40,
  color = 'primary',
  backdrop = false,
  overlay = false
}) {
  if (!loading) {
    return null;
  }

  const renderProgress = () => {
    switch (type) {
      case 'linear':
        return (
          <Box sx={{ width: '100%' }}>
            <LinearProgress 
              variant={progress !== null ? 'determinate' : 'indeterminate'}
              value={progress}
              color={color}
            />
            {message && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                {message}
                {progress !== null && ` (${Math.round(progress)}%)`}
              </Typography>
            )}
          </Box>
        );
      
      case 'backdrop':
        return (
          <Backdrop
            sx={{ 
              color: '#fff', 
              zIndex: (theme) => theme.zIndex.drawer + 1,
              flexDirection: 'column',
              gap: 2
            }}
            open={loading}
          >
            <CircularProgress color="inherit" size={size} />
            {message && (
              <Typography variant="h6" color="inherit">
                {message}
              </Typography>
            )}
          </Backdrop>
        );
      
      case 'inline':
        return (
          <Box 
            sx={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 1 
            }}
          >
            <CircularProgress size={size} color={color} />
            {message && (
              <Typography variant="body2" color="text.secondary">
                {message}
              </Typography>
            )}
          </Box>
        );
      
      case 'circular':
      default:
        return (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: 2,
              p: 2
            }}
          >
            <CircularProgress 
              variant={progress !== null ? 'determinate' : 'indeterminate'}
              value={progress}
              size={size}
              color={color}
            />
            {message && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {message}
                {progress !== null && ` (${Math.round(progress)}%)`}
              </Typography>
            )}
          </Box>
        );
    }
  };

  if (backdrop) {
    return renderProgress();
  }

  if (overlay) {
    return (
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
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1
        }}
      >
        <Paper elevation={2} sx={{ p: 2 }}>
          {renderProgress()}
        </Paper>
      </Box>
    );
  }

  return renderProgress();
}

/**
 * Specialized loading indicators for common use cases
 */

// File processing loader
export const FileProcessingLoader = ({ loading, fileName = '', progress = null }) => (
  <LoadingIndicator
    loading={loading}
    type="circular"
    message={fileName ? `Procesando "${fileName}"...` : 'Procesando archivo...'}
    progress={progress}
    size={48}
  />
);

// API upload loader
export const ApiUploadLoader = ({ loading, message = 'Enviando datos al servidor...' }) => (
  <LoadingIndicator
    loading={loading}
    type="inline"
    message={message}
    size={20}
  />
);

// Data validation loader
export const DataValidationLoader = ({ loading, recordCount = 0 }) => (
  <LoadingIndicator
    loading={loading}
    type="linear"
    message={recordCount > 0 ? `Validando ${recordCount} registros...` : 'Validando datos...'}
  />
);

// Full screen loader
export const FullScreenLoader = ({ loading, message = 'Procesando...' }) => (
  <LoadingIndicator
    loading={loading}
    type="backdrop"
    message={message}
    size={60}
  />
);