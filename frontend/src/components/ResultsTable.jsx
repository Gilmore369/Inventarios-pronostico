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

const ResultsTable = ({ results, onModelSelect }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Resultados de Modelos de Pronóstico
      </Typography>
      
      <Typography variant="body1" paragraph>
        Se han evaluado {results.length} modelos. A continuación se muestran ordenados 
        de mejor a peor según el error porcentual (MAPE).
      </Typography>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>MAPE (%)</TableCell>
              <TableCell>RMSE</TableCell>
              <TableCell>MAE</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((model, index) => (
              <TableRow key={index}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body1">{model.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Parámetros: {JSON.stringify(model.parameters)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`${model.metrics.mape}%`} 
                    color={index === 0 ? 'success' : 'default'}
                    variant={index === 0 ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>{model.metrics.rmse}</TableCell>
                <TableCell>{model.metrics.mae}</TableCell>
                <TableCell>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => onModelSelect(model.name)}
                  >
                    Seleccionar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6">Recomendación</Typography>
        <Typography variant="body2">
          El modelo <strong>{results[0]?.name}</strong> tiene el menor error porcentual (MAPE: {results[0]?.metrics.mape}%).
          Se recomienda utilizar este modelo para generar pronósticos futuros.
        </Typography>
      </Box>
    </Paper>
  );
};

export default ResultsTable;