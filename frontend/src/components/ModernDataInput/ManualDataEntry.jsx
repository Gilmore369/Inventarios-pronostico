import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  DataGrid,
  GridActionsCellItem,
  GridRowModes,
  GridRowModesModel,
  GridRowEditStopReasons
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useDataValidation } from './hooks/useDataValidation';
import { ErrorDisplay, InlineValidationError, DataValidationLoader } from './components';

/**
 * ManualDataEntry component for manual data input using an editable table
 * Implements requirements 1.1-1.8 for manual data entry functionality
 */
export default function ManualDataEntry({ 
  data = [], 
  onChange, 
  disabled = false 
}) {
  // Initialize with 12 empty rows as per requirement 1.5
  const initialRows = useMemo(() => {
    if (data.length > 0) {
      return data.map((row, index) => ({
        id: index + 1,
        month: row.month || '',
        demand: row.demand || ''
      }));
    }
    
    // Create 12 empty rows by default
    return Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      month: '',
      demand: ''
    }));
  }, [data]);

  const [rows, setRows] = useState(initialRows);
  const [rowModesModel, setRowModesModel] = useState({});
  const [nextId, setNextId] = useState(initialRows.length + 1);
  const [validating, setValidating] = useState(false);

  // Use validation hook
  const {
    validateRow,
    validateData,
    validationErrors,
    getRowErrors,
    hasErrors
  } = useDataValidation();

  // Convert rows to data format and notify parent
  const notifyDataChange = useCallback(async (updatedRows) => {
    const formattedData = updatedRows
      .filter(row => row.month || row.demand) // Only include rows with some data
      .map(row => ({
        month: row.month || '',
        demand: row.demand === '' ? '' : Number(row.demand) || 0
      }));
    
    // Show validation loading for larger datasets
    if (formattedData.length > 20) {
      setValidating(true);
    }
    
    // Validate the complete dataset
    setTimeout(() => {
      validateData(formattedData);
      setValidating(false);
    }, formattedData.length > 20 ? 500 : 0);
    
    if (onChange) {
      onChange(formattedData);
    }
  }, [onChange, validateData]);

  // Handle adding new row (requirement 1.6)
  const handleAddRow = useCallback(() => {
    const newRow = {
      id: nextId,
      month: '',
      demand: '',
      isNew: true
    };
    
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    setNextId(nextId + 1);
    
    // Set the new row to edit mode
    setRowModesModel(prev => ({
      ...prev,
      [nextId]: { mode: GridRowModes.Edit }
    }));
    
    notifyDataChange(updatedRows);
  }, [rows, nextId, notifyDataChange]);

  // Handle deleting row (requirement 1.7)
  const handleDeleteRow = useCallback((id) => {
    const updatedRows = rows.filter(row => row.id !== id);
    setRows(updatedRows);
    notifyDataChange(updatedRows);
  }, [rows, notifyDataChange]);

  // Handle row edit stop
  const handleRowEditStop = useCallback((params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  }, []);

  // Handle row mode change
  const handleRowModesModelChange = useCallback((newRowModesModel) => {
    setRowModesModel(newRowModesModel);
  }, []);

  // Process row update with validation
  const processRowUpdate = useCallback((newRow, oldRow) => {
    // Validate the row
    const validation = validateRow(newRow, newRow.id - 1);
    
    // Update the row in state
    const updatedRows = rows.map(row => 
      row.id === newRow.id ? { ...newRow, isNew: false } : row
    );
    
    setRows(updatedRows);
    notifyDataChange(updatedRows);
    
    return newRow;
  }, [rows, validateRow, notifyDataChange]);

  // Handle process row update error
  const handleProcessRowUpdateError = useCallback((error) => {
    console.error('Row update error:', error);
  }, []);

  // Define columns for the DataGrid (requirements 1.2, 1.3)
  const columns = useMemo(() => [
    {
      field: 'month',
      headerName: 'Mes',
      width: 150,
      editable: true,
      type: 'string',
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rowErrors = getRowErrors(params.id - 1);
        const monthErrors = rowErrors.filter(error => error.field === 'month');
        const hasError = monthErrors.length > 0;
        
        return (
          <Box sx={{ 
            width: '100%', 
            color: hasError ? '#f44336' : 'inherit',
            fontWeight: hasError ? 'bold' : 'normal'
          }}>
            {params.value || ''}
          </Box>
        );
      },
      renderEditCell: (params) => {
        const rowErrors = getRowErrors(params.id - 1);
        const monthErrors = rowErrors.filter(error => error.field === 'month');
        const hasError = monthErrors.length > 0;
        
        return (
          <Box sx={{ width: '100%' }}>
            <input
              type="text"
              value={params.value || ''}
              onChange={(e) => {
                params.api.setEditCellValue({
                  id: params.id,
                  field: params.field,
                  value: e.target.value
                });
                // Trigger real-time validation
                const updatedRow = { ...params.row, month: e.target.value };
                validateRow(updatedRow, params.id - 1);
              }}
              placeholder="YYYY-MM"
              style={{
                width: '100%',
                padding: '8px',
                border: hasError ? '2px solid #f44336' : '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: hasError ? '#ffebee' : 'white'
              }}
              title={monthErrors.length > 0 ? monthErrors[0].message : ''}
            />
            {hasError && (
              <Typography variant="caption" color="error" sx={{ fontSize: '10px', display: 'block', mt: 0.5 }}>
                {monthErrors[0].message}
              </Typography>
            )}
          </Box>
        );
      }
    },
    {
      field: 'demand',
      headerName: 'Demanda',
      width: 150,
      editable: true,
      type: 'number',
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rowErrors = getRowErrors(params.id - 1);
        const demandErrors = rowErrors.filter(error => error.field === 'demand');
        const hasError = demandErrors.length > 0;
        
        return (
          <Box sx={{ 
            width: '100%', 
            color: hasError ? '#f44336' : 'inherit',
            fontWeight: hasError ? 'bold' : 'normal'
          }}>
            {params.value || ''}
          </Box>
        );
      },
      renderEditCell: (params) => {
        const rowErrors = getRowErrors(params.id - 1);
        const demandErrors = rowErrors.filter(error => error.field === 'demand');
        const hasError = demandErrors.length > 0;
        
        return (
          <Box sx={{ width: '100%' }}>
            <input
              type="number"
              value={params.value || ''}
              onChange={(e) => {
                params.api.setEditCellValue({
                  id: params.id,
                  field: params.field,
                  value: e.target.value
                });
                // Trigger real-time validation
                const updatedRow = { ...params.row, demand: e.target.value };
                validateRow(updatedRow, params.id - 1);
              }}
              placeholder="0"
              min="0"
              step="any"
              style={{
                width: '100%',
                padding: '8px',
                border: hasError ? '2px solid #f44336' : '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: hasError ? '#ffebee' : 'white'
              }}
              title={demandErrors.length > 0 ? demandErrors[0].message : ''}
            />
            {hasError && (
              <Typography variant="caption" color="error" sx={{ fontSize: '10px', display: 'block', mt: 0.5 }}>
                {demandErrors[0].message}
              </Typography>
            )}
          </Box>
        );
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        
        // Disable delete if only one row remains (requirement 1.8)
        const canDelete = rows.length > 1;
        
        if (isInEditMode) {
          return [];
        }

        return [
          <GridActionsCellItem
            key="delete"
            icon={
              <Tooltip title={canDelete ? "Eliminar fila" : "No se puede eliminar la última fila"}>
                <span>
                  <IconButton size="small" disabled={!canDelete}>
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            }
            label="Delete"
            onClick={() => handleDeleteRow(id)}
            disabled={!canDelete}
          />
        ];
      }
    }
  ], [rowModesModel, rows.length, getRowErrors, handleDeleteRow]);

  // Get general validation errors
  const generalErrors = validationErrors.filter(error => error.row === -1);

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Entrada Manual de Datos
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ingrese los datos de demanda manualmente. Use el formato YYYY-MM para los meses (ej: 2024-01).
      </Typography>

      {/* Add Row Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
          disabled={disabled}
        >
          Agregar Fila
        </Button>
      </Box>

      {/* Data Grid */}
      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          editMode="row"
          rowModesModel={rowModesModel}
          onRowModesModelChange={handleRowModesModelChange}
          onRowEditStop={handleRowEditStop}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={handleProcessRowUpdateError}
          slots={{
            toolbar: null
          }}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10
              }
            }
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          getRowClassName={(params) => {
            const rowErrors = getRowErrors(params.id - 1);
            const hasRowErrors = rowErrors.filter(error => error.severity === 'error').length > 0;
            return hasRowErrors ? 'error-row' : '';
          }}
          sx={{
            '& .MuiDataGrid-cell--editable': {
              cursor: 'pointer'
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)'
            },
            '& .error-row': {
              backgroundColor: '#ffebee',
              '&:hover': {
                backgroundColor: '#ffcdd2'
              }
            },
            '& .error-row .MuiDataGrid-cell': {
              borderBottom: '1px solid #f44336'
            }
          }}
        />
      </Box>

      {/* Data Validation Loading */}
      {validating && (
        <DataValidationLoader 
          loading={validating}
          recordCount={rows.length}
        />
      )}

      {/* Validation Error Display */}
      {validationErrors.length > 0 && !validating && (
        <ErrorDisplay 
          errors={validationErrors}
          title="Errores de Validación"
          collapsible={validationErrors.length > 5}
          defaultExpanded={validationErrors.length <= 5}
        />
      )}

      {/* Validation Summary */}
      <Box sx={{ mt: 2, p: 1, bgcolor: hasErrors ? '#ffebee' : '#e8f5e8', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Total de filas: {rows.length} | Mínimo requerido: 12 | Máximo permitido: 120
        </Typography>
        <Typography variant="caption" color={hasErrors ? 'error' : 'success'} sx={{ display: 'block', fontWeight: 'bold' }}>
          Estado: {hasErrors ? `${validationErrors.filter(e => e.severity === 'error').length} errores encontrados` : 'Datos válidos'}
        </Typography>
      </Box>
    </Box>
  );
}