import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { useFileReader } from './hooks/useFileReader';
import { ErrorDisplay, FileProcessingLoader } from './components';

export default function FileUpload({ onFileProcessed, onError, onDataProcessed }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const { processFile, loading, error, clearError } = useFileReader();

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // Validate file before processing
  const validateFile = (file) => {
    const validTypes = ['.csv', '.xls', '.xlsx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    const maxSizeInMB = 10;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    // Check file type
    if (!validTypes.includes(fileExtension)) {
      return {
        isValid: false,
        error: `Tipo de archivo no válido. Solo se permiten archivos ${validTypes.join(', ')}`
      };
    }

    // Check file size
    if (file.size > maxSizeInBytes) {
      return {
        isValid: false,
        error: `El archivo es demasiado grande. Tamaño máximo permitido: ${maxSizeInMB}MB`
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        isValid: false,
        error: 'El archivo está vacío'
      };
    }

    return { isValid: true };
  };

  // Handle file selection from input or drag-drop
  const handleFileSelection = async (file) => {
    const validation = validateFile(file);
    
    if (!validation.isValid) {
      onError && onError(validation.error);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    clearError();

    try {
      // Process the file using the useFileReader hook
      const result = await processFile(file);
      
      // Call the callback with processed data
      if (onDataProcessed) {
        onDataProcessed(result);
      }
      
      if (onFileProcessed) {
        onFileProcessed(file, result);
      }
    } catch (err) {
      onError && onError(err.message);
      setSelectedFile(null);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  // Open file selector
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xls,.xlsx"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Drag and drop area */}
      <Paper
        elevation={dragActive ? 8 : 2}
        sx={{
          p: 4,
          textAlign: 'center',
          border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
          backgroundColor: dragActive ? '#f3f8ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: '#f5f5f5',
            borderColor: '#1976d2'
          }
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        {loading ? (
          <FileProcessingLoader 
            loading={loading}
            fileName={selectedFile?.name}
          />
        ) : (
          <>
            <CloudUploadIcon 
              sx={{ 
                fontSize: 48, 
                color: dragActive ? '#1976d2' : '#666',
                mb: 2 
              }} 
            />
            
            <Typography variant="h6" gutterBottom>
              {dragActive 
                ? 'Suelta el archivo aquí' 
                : 'Arrastra y suelta tu archivo aquí'
              }
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              o
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<FileIcon />}
              onClick={(e) => {
                e.stopPropagation();
                openFileSelector();
              }}
            >
              Seleccionar Archivo
            </Button>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Formatos soportados: CSV, XLS, XLSX
            </Typography>
          </>
        )}
      </Paper>

      {/* Selected file info */}
      {selectedFile && !loading && (
        <Alert 
          severity="success" 
          sx={{ mt: 2 }}
          icon={<FileIcon />}
        >
          <Typography variant="body2">
            <strong>Archivo seleccionado:</strong> {selectedFile.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Tipo: {selectedFile.name.split('.').pop().toUpperCase()}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Tamaño: {selectedFile.size < 1024 * 1024 
              ? `${(selectedFile.size / 1024).toFixed(1)} KB`
              : `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
            }
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Última modificación: {new Date(selectedFile.lastModified).toLocaleDateString()}
          </Typography>
        </Alert>
      )}

      {/* File processing error */}
      {error && (
        <ErrorDisplay 
          errors={[{
            row: -1,
            field: 'file',
            message: error,
            severity: 'error'
          }]}
          title="Error al Procesar Archivo"
          collapsible={false}
        />
      )}
    </Box>
  );
}