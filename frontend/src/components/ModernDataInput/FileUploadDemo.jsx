import React, { useState } from 'react';
import { Box, Typography, Alert, Paper } from '@mui/material';
import FileUpload from './FileUpload';

/**
 * Demo component to showcase FileUpload functionality
 * This can be used for testing and development purposes
 */
export default function FileUploadDemo() {
  const [processedData, setProcessedData] = useState(null);
  const [error, setError] = useState(null);

  const handleFileProcessed = (file, result) => {
    console.log('File processed:', file.name, result);
    setProcessedData(result);
    setError(null);
  };

  const handleError = (errorMessage) => {
    console.error('File upload error:', errorMessage);
    setError(errorMessage);
    setProcessedData(null);
  };

  const handleDataProcessed = (result) => {
    console.log('Data processed:', result);
    setProcessedData(result);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        FileUpload Component Demo
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        This demo shows the FileUpload component functionality. 
        Try uploading a CSV or Excel file with a "demanda" column.
      </Typography>

      <FileUpload
        onFileProcessed={handleFileProcessed}
        onError={handleError}
        onDataProcessed={handleDataProcessed}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {processedData && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Processed Data Results
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Total Records:</strong> {processedData.metadata.totalRows}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Column Found:</strong> {processedData.metadata.columnFound}
          </Typography>
          
          {processedData.metadata.dateRange && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Date Range:</strong> {processedData.metadata.dateRange.start} to {processedData.metadata.dateRange.end}
            </Typography>
          )}

          {processedData.errors.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="error">
                Validation Errors:
              </Typography>
              {processedData.errors.slice(0, 5).map((error, index) => (
                <Typography key={index} variant="caption" color="error" sx={{ display: 'block' }}>
                  Row {error.row}: {error.message}
                </Typography>
              ))}
              {processedData.errors.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  ... and {processedData.errors.length - 5} more errors
                </Typography>
              )}
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              Sample Data (first 5 rows):
            </Typography>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>
              {JSON.stringify(processedData.data.slice(0, 5), null, 2)}
            </pre>
          </Box>
        </Paper>
      )}
    </Box>
  );
}