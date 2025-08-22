import React, { useState } from 'react';
import { Paper, Typography, Button, TextField, Box } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

const DataInput = ({ onDataUpload }) => {
  const [inputMethod, setInputMethod] = useState('manual');
  const [data, setData] = useState([{ month: '2023-01', demand: 100 }]);
  const [file, setFile] = useState(null);

  const handleAddRow = () => {
    setData([...data, { month: '', demand: '' }]);
  };

  const handleDeleteRow = (id) => {
    if (data.length > 1) {
      setData(data.filter((_, index) => index !== id));
    }
  };

  const handleInputChange = (index, field, value) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
    
    // Simular lectura de CSV
    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        // Procesar contenido CSV (simplificado)
        console.log('Contenido del archivo:', content);
      };
      reader.readAsText(uploadedFile);
    }
  };

  const handleSubmit = async () => {
    // Validar datos
    if (data.length < 12) {
      alert('Se requieren al menos 12 meses de datos');
      return;
    }
    
    try {
      let response;
      if (inputMethod === 'manual') {
        response = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        response = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData,
        });
      }
      
      const result = await response.json();
      if (result.session_id) {
        onDataUpload(result.session_id);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al subir datos');
    }
  };

  const columns = [
    { field: 'month', headerName: 'Mes', width: 150, editable: true },
    { field: 'demand', headerName: 'Demanda', width: 130, type: 'number', editable: true },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 120,
      renderCell: (params) => (
        <Button
          color="error"
          size="small"
          onClick={() => handleDeleteRow(params.id)}
          disabled={data.length <= 1}
        >
          Eliminar
        </Button>
      ),
    },
  ];

  const rows = data.map((item, index) => ({ id: index, ...item }));

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Análisis de Pronósticos de Demanda
      </Typography>
      
      <Typography variant="body1" paragraph>
        Cargue los datos históricos de demanda (mínimo 12 meses, máximo 120 meses) para analizar 
        múltiples modelos de pronóstico y encontrar el más adecuado para sus datos.
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button 
          variant={inputMethod === 'manual' ? 'contained' : 'outlined'} 
          onClick={() => setInputMethod('manual')}
          sx={{ mr: 1 }}
        >
          Entrada Manual
        </Button>
        <Button 
          variant={inputMethod === 'file' ? 'contained' : 'outlined'} 
          onClick={() => setInputMethod('file')}
        >
          Cargar CSV
        </Button>
      </Box>
      
      {inputMethod === 'manual' ? (
        <>
          <div style={{ height: 400, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={5}
              rowsPerPageOptions={[5]}
              disableSelectionOnClick
              experimentalFeatures={{ newEditingApi: true }}
              processRowUpdate={(updatedRow, originalRow) => {
                handleInputChange(updatedRow.id, 'month', updatedRow.month);
                handleInputChange(updatedRow.id, 'demand', updatedRow.demand);
                return updatedRow;
              }}
            />
          </div>
          <Button onClick={handleAddRow} sx={{ mt: 2, mr: 2 }}>
            Agregar Fila
          </Button>
        </>
      ) : (
        <Box sx={{ mt: 2 }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            El archivo CSV debe contener columnas: month, demand
          </Typography>
        </Box>
      )}
      
      <Button 
        variant="contained" 
        onClick={handleSubmit} 
        sx={{ mt: 3 }}
        disabled={inputMethod === 'file' && !file}
      >
        Procesar Modelos
      </Button>
    </Paper>
  );
};

export default DataInput;