import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  TextField,
  Box,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { API_ENDPOINTS } from '../config/api';

const ForecastSimple = ({ sessionId, results }) => {
  const [selectedModel, setSelectedModel] = useState(results[0]?.name || '');
  const [periods, setPeriods] = useState(12);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateForecast = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(API_ENDPOINTS.forecast, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          model: selectedModel,
          periods: periods
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setForecastData(data);
      } else {
        throw new Error(data.error || 'Error al generar pronóstico');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔮 Generar Pronóstico
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Modelo Seleccionado"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            helperText="Modelo a usar para el pronóstico"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Períodos a Pronosticar"
            value={periods}
            onChange={(e) => setPeriods(parseInt(e.target.value))}
            inputProps={{ min: 1, max: 24 }}
            helperText="Número de meses futuros (1-24)"
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGenerateForecast}
              disabled={loading}
              sx={{ minWidth: 200 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generar Pronóstico'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      {forecastData && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            📊 Resultados del Pronóstico
          </Typography>
          
          <Paper elevation={1} sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom>
              Modelo: {forecastData.model}
            </Typography>
            
            <Typography variant="body1" gutterBottom>
              Pronósticos para los próximos {periods} períodos:
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              {forecastData.forecast && forecastData.forecast.map((value, index) => (
                <Typography key={index} variant="body2">
                  Período {index + 1}: {value.toFixed(2)}
                </Typography>
              ))}
            </Box>

            {forecastData.confidence_intervals && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  * Intervalos de confianza disponibles en la respuesta completa
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default ForecastSimple;