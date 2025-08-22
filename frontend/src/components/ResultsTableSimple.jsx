import React from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box
} from '@mui/material';

const ResultsTableSimple = ({ results, onModelSelect }) => {
  if (!results || results.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5">No hay resultados disponibles</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📈 Resultados de Modelos de Pronóstico
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Los modelos están ordenados por precisión (menor MAPE = mejor).
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Ranking</strong></TableCell>
              <TableCell><strong>Modelo</strong></TableCell>
              <TableCell><strong>MAPE (%)</strong></TableCell>
              <TableCell><strong>MAE</strong></TableCell>
              <TableCell><strong>RMSE</strong></TableCell>
              <TableCell><strong>Acción</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((model, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Chip 
                    label={`#${index + 1}`}
                    color={index === 0 ? 'success' : 'default'}
                    variant={index === 0 ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {model.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${model.metrics?.mape?.toFixed(2) || 'N/A'}%`}
                    color={index === 0 ? 'success' : 'default'}
                    variant={index === 0 ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>{model.metrics?.mae?.toFixed(2) || 'N/A'}</TableCell>
                <TableCell>{model.metrics?.rmse?.toFixed(2) || 'N/A'}</TableCell>
                <TableCell>
                  <Button
                    variant={index === 0 ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => onModelSelect(model.name)}
                  >
                    {index === 0 ? 'Usar Mejor Modelo' : 'Seleccionar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          💡 <strong>MAPE:</strong> Error Porcentual Absoluto Medio (menor es mejor)<br/>
          💡 <strong>MAE:</strong> Error Absoluto Medio<br/>
          💡 <strong>RMSE:</strong> Raíz del Error Cuadrático Medio
        </Typography>
      </Box>
    </Paper>
  );
};

export default ResultsTableSimple;