import React, { useState } from 'react';
import { 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Box, 
  Grid,
  Alert
} from '@mui/material';

const DataInputSimple = ({ onDataUpload }) => {
  const [jsonData, setJsonData] = useState(`[
  {"month": "2023-01", "demand": 100},
  {"month": "2023-02", "demand": 120},
  {"month": "2023-03", "demand": 95},
  {"month": "2023-04", "demand": 110},
  {"month": "2023-05", "demand": 130},
  {"month": "2023-06", "demand": 125},
  {"month": "2023-07", "demand": 140},
  {"month": "2023-08", "demand": 135},
  {"month": "2023-09", "demand": 115},
  {"month": "2023-10", "demand": 105},
  {"month": "2023-11", "demand": 125},
  {"month": "2023-12", "demand": 150}
]`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Validar JSON
      const data = JSON.parse(jsonData);
      
      if (!Array.isArray(data) || data.length < 12) {
        throw new Error('Se requieren al menos 12 meses de datos');
      }

      // Enviar datos al backend
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (response.ok) {
        onDataUpload(result.session_id);
      } else {
        throw new Error(result.error || 'Error al procesar datos');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 Carga de Datos de Demanda
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Ingresa los datos de demanda histórica en formato JSON. Se requieren entre 12 y 120 meses de datos.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={15}
            label="Datos JSON"
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            variant="outlined"
            helperText="Formato: [{'month': 'YYYY-MM', 'demand': número}, ...]"
          />
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={loading}
              sx={{ minWidth: 200 }}
            >
              {loading ? 'Procesando...' : 'Procesar Datos'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          💡 Ejemplo de datos:
        </Typography>
        <Typography variant="body2" component="pre" sx={{ 
          backgroundColor: '#f5f5f5', 
          p: 2, 
          borderRadius: 1,
          fontSize: '0.8rem',
          overflow: 'auto'
        }}>
{`[
  {"month": "2023-01", "demand": 100},
  {"month": "2023-02", "demand": 120},
  {"month": "2023-03", "demand": 95}
]`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default DataInputSimple;