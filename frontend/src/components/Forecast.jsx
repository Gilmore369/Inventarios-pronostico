import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Forecast = ({ sessionId, results }) => {
  const [selectedModel, setSelectedModel] = useState(results[0]?.name || '');
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState(12);

  useEffect(() => {
    if (results.length > 0 && !selectedModel) {
      setSelectedModel(results[0].name);
    }
  }, [results, selectedModel]);

  const handleGenerateForecast = async () => {
    if (!selectedModel) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          model_name: selectedModel,
          periods: periods
        }),
      });
      
      const data = await response.json();
      setForecastData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = () => {
    if (!forecastData || !results) return [];
    
    const selectedResult = results.find(r => r.name === selectedModel);
    if (!selectedResult) return [];
    
    const historicalData = selectedResult.predictions.map((value, index) => ({
      period: `M${index + 1}`,
      historical: value,
      actual: selectedResult.actuals ? selectedResult.actuals[index] : null
    }));
    
    const forecastPoints = forecastData.forecast.map((value, index) => ({
      period: `F${index + 1}`,
      forecast: value
    }));
    
    return [...historicalData, ...forecastPoints];
  };

  const getModelDescription = () => {
    const selectedResult = results.find(r => r.name === selectedModel);
    return selectedResult?.description || {};
  };

  const chartData = prepareChartData();
  const modelDescription = getModelDescription();

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Generar Pronóstico
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Seleccionar Modelo
              </Typography>
              
              <TextField
                select
                fullWidth
                label="Modelo de Pronóstico"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                SelectProps={{
                  native: true,
                }}
                sx={{ mb: 2 }}
              >
                {results.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} (MAPE: {model.metrics.mape}%)
                  </option>
                ))}
              </TextField>
              
              <TextField
                fullWidth
                label="Meses a pronosticar"
                type="number"
                value={periods}
                onChange={(e) => setPeriods(parseInt(e.target.value))}
                inputProps={{ min: 1, max: 36 }}
                sx={{ mb: 2 }}
              />
              
              <Button 
                variant="contained" 
                onClick={handleGenerateForecast}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Generando...' : 'Generar Pronóstico'}
              </Button>
            </CardContent>
          </Card>
          
          {modelDescription && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información del Modelo
                </Typography>
                
                <Typography variant="body2" paragraph>
                  <strong>Ecuación:</strong> {modelDescription.equation}
                </Typography>
                
                <Typography variant="body2" paragraph>
                  <strong>Descripción:</strong> {modelDescription.description}
                </Typography>
                
                <Typography variant="body2" paragraph>
                  <strong>Mejor para:</strong> {modelDescription.best_for}
                </Typography>
                
                <Typography variant="body2" paragraph>
                  <strong>Limitaciones:</strong> {modelDescription.limitations}
                </Typography>
                
                <Typography variant="body2">
                  <strong>Parámetros:</strong> {modelDescription.parameters}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
        
        <Grid item xs={12} md={6}>
          {forecastData && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pronóstico Generado
                </Typography>
                
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {chartData.some(d => d.historical !== null) && (
                        <Line 
                          type="monotone" 
                          dataKey="historical" 
                          stroke="#8884d8" 
                          name="Historical" 
                          strokeWidth={2}
                        />
                      )}
                      {chartData.some(d => d.actual !== null) && (
                        <Line 
                          type="monotone" 
                          dataKey="actual" 
                          stroke="#82ca9d" 
                          name="Actual" 
                          strokeWidth={2}
                        />
                      )}
                      <Line 
                        type="monotone" 
                        dataKey="forecast" 
                        stroke="#ff7300" 
                        name="Forecast" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Pronóstico para los próximos {periods} meses usando {selectedModel}
                </Typography>
                
                <TableContainer sx={{ maxHeight: 200, mt: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Mes</TableCell>
                        <TableCell>Pronóstico</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {forecastData.forecast.map((value, index) => (
                        <TableRow key={index}>
                          <TableCell>M{index + 1}</TableCell>
                          <TableCell>{value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Button 
                  variant="outlined" 
                  sx={{ mt: 2 }}
                  onClick={() => {
                    const csvContent = forecastData.forecast.map((value, index) => 
                      `M${index + 1},${value.toFixed(2)}`
                    ).join('\n');
                    
                    const blob = new Blob([`Mes,Pronóstico\n${csvContent}`], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pronostico_${selectedModel.replace(/\s+/g, '_')}.csv`;
                    a.click();
                  }}
                >
                  Descargar CSV
                </Button>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default Forecast;