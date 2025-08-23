import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Card,
  CardContent,
  Divider,
  Chip,
  Stack,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';

/**
 * DataPreview component for displaying file data confirmation
 * Shows first 5 rows of processed data with statistics and confirmation flow
 */
export default function DataPreview({ 
  data = [], 
  metadata = {}, 
  onConfirm, 
  onCancel,
  loading = false 
}) {
  // Calculate comprehensive statistics from data
  const statistics = React.useMemo(() => {
    if (data.length === 0) return null;
    
    const totalRecords = data.length;
    const validDemandValues = data.filter(item => 
      item.demand !== null && 
      item.demand !== undefined && 
      !isNaN(item.demand)
    );
    
    // Calculate date range
    const dates = data.map(item => item.month).filter(Boolean).sort();
    const dateRange = dates.length > 0 ? {
      start: dates[0],
      end: dates[dates.length - 1]
    } : null;
    
    // Calculate demand statistics
    const demandValues = validDemandValues.map(item => Number(item.demand));
    const demandStats = demandValues.length > 0 ? {
      min: Math.min(...demandValues),
      max: Math.max(...demandValues),
      avg: demandValues.reduce((sum, val) => sum + val, 0) / demandValues.length,
      validCount: demandValues.length
    } : null;
    
    return {
      totalRecords,
      dateRange,
      demandStats,
      columnFound: metadata.columnFound || 'demanda',
      validRecords: validDemandValues.length,
      invalidRecords: totalRecords - validDemandValues.length
    };
  }, [data, metadata.columnFound]);
  
  const previewData = data.slice(0, 5);

  // Format month for display
  const formatMonth = (month) => {
    if (!month) return 'N/A';
    // If it's already formatted as YYYY-MM, return as is
    if (typeof month === 'string' && month.match(/^\d{4}-\d{2}$/)) {
      return month;
    }
    // Otherwise, try to format it
    return month.toString();
  };

  // Format demand value for display
  const formatDemand = (demand) => {
    if (demand === null || demand === undefined) return 'N/A';
    return typeof demand === 'number' ? demand.toLocaleString() : demand.toString();
  };

  if (!data || data.length === 0) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Vista Previa de Datos
          </Typography>
          <Typography color="text.secondary">
            No hay datos para mostrar
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" />
          Vista Previa de Datos
        </Typography>
        
        {/* Data Statistics */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Estadísticas de los Datos
          </Typography>
          
          {statistics && (
            <>
              {/* Basic Statistics */}
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                <Chip 
                  label={`Total de registros: ${statistics.totalRecords}`}
                  color="primary"
                  variant="outlined"
                />
                <Chip 
                  label={`Registros válidos: ${statistics.validRecords}`}
                  color="success"
                  variant="outlined"
                />
                {statistics.invalidRecords > 0 && (
                  <Chip 
                    label={`Registros inválidos: ${statistics.invalidRecords}`}
                    color="warning"
                    variant="outlined"
                  />
                )}
                <Chip 
                  label={`Columna detectada: "${statistics.columnFound}"`}
                  color="info"
                  variant="outlined"
                />
              </Stack>

              {/* Date Range */}
              {statistics.dateRange && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  <Chip 
                    label={`Período: ${statistics.dateRange.start} - ${statistics.dateRange.end}`}
                    color="secondary"
                    variant="outlined"
                  />
                </Stack>
              )}

              {/* Demand Statistics */}
              {statistics.demandStats && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip 
                    label={`Demanda mín: ${statistics.demandStats.min.toLocaleString()}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip 
                    label={`Demanda máx: ${statistics.demandStats.max.toLocaleString()}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip 
                    label={`Promedio: ${Math.round(statistics.demandStats.avg).toLocaleString()}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              )}
            </>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Preview Table */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Primeras 5 filas de datos
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Mes</strong></TableCell>
                  <TableCell align="right"><strong>Demanda</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatMonth(row.month)}</TableCell>
                    <TableCell align="right">{formatDemand(row.demand)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {statistics && statistics.totalRecords > 5 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              ... y {statistics.totalRecords - 5} registros más
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Confirmation Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={onCancel}
            disabled={loading}
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onConfirm}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {loading ? 'Procesando...' : 'Confirmar y Procesar'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}