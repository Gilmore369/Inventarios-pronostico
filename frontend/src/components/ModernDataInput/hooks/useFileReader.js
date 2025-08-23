import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const useFileReader = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Find column that contains "demanda" (case-insensitive)
  const findDemandColumn = (headers) => {
    const demandColumn = headers.find(header => 
      header && header.toLowerCase().includes('demanda')
    );
    return demandColumn;
  };

  // Validate and format data
  const validateAndFormatData = (rawData, demandColumnName) => {
    const validData = [];
    const errors = [];

    rawData.forEach((row, index) => {
      // Skip empty rows
      if (!row || Object.keys(row).length === 0) {
        return;
      }

      const demandValue = row[demandColumnName];
      
      // Check if demand value exists and is valid
      if (demandValue === undefined || demandValue === null || demandValue === '') {
        errors.push({
          row: index + 1,
          field: 'demanda',
          message: 'Valor de demanda faltante',
          severity: 'error'
        });
        return;
      }

      // Convert to number and validate
      const numericDemand = parseFloat(demandValue);
      if (isNaN(numericDemand)) {
        errors.push({
          row: index + 1,
          field: 'demanda',
          message: 'Valor de demanda no es numérico',
          severity: 'error'
        });
        return;
      }

      if (numericDemand < 0) {
        errors.push({
          row: index + 1,
          field: 'demanda',
          message: 'Valor de demanda no puede ser negativo',
          severity: 'warning'
        });
      }

      // Try to find a month/date column
      let monthValue = null;
      const possibleMonthColumns = ['mes', 'month', 'periodo', 'period', 'fecha', 'date'];
      
      for (const colName of possibleMonthColumns) {
        const foundCol = Object.keys(row).find(key => 
          key.toLowerCase().includes(colName.toLowerCase())
        );
        if (foundCol && row[foundCol]) {
          monthValue = row[foundCol];
          break;
        }
      }

      // If no month column found, generate sequential months
      if (!monthValue) {
        const currentDate = new Date();
        currentDate.setMonth(currentDate.getMonth() + index);
        monthValue = currentDate.toISOString().slice(0, 7); // YYYY-MM format
      }

      validData.push({
        month: monthValue,
        demand: numericDemand
      });
    });

    return { validData, errors };
  };

  // Process CSV file
  const processCSV = useCallback((file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              reject(new Error(`Error al procesar CSV: ${results.errors[0].message}`));
              return;
            }

            const headers = results.meta.fields;
            const demandColumn = findDemandColumn(headers);

            if (!demandColumn) {
              reject(new Error('No se encontró una columna llamada "demanda" en el archivo CSV'));
              return;
            }

            const { validData, errors } = validateAndFormatData(results.data, demandColumn);

            resolve({
              data: validData,
              errors,
              metadata: {
                totalRows: validData.length,
                dateRange: validData.length > 0 ? {
                  start: validData[0].month,
                  end: validData[validData.length - 1].month
                } : null,
                columnFound: demandColumn
              }
            });
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`Error al leer archivo CSV: ${error.message}`));
        }
      });
    });
  }, []);

  // Process Excel file
  const processExcel = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            reject(new Error('El archivo Excel debe contener al menos una fila de encabezados y una fila de datos'));
            return;
          }

          // First row as headers
          const headers = jsonData[0];
          const demandColumn = findDemandColumn(headers);

          if (!demandColumn) {
            reject(new Error('No se encontró una columna llamada "demanda" en el archivo Excel'));
            return;
          }

          // Convert to object format
          const demandColumnIndex = headers.indexOf(demandColumn);
          const objectData = jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });

          const { validData, errors } = validateAndFormatData(objectData, demandColumn);

          resolve({
            data: validData,
            errors,
            metadata: {
              totalRows: validData.length,
              dateRange: validData.length > 0 ? {
                start: validData[0].month,
                end: validData[validData.length - 1].month
              } : null,
              columnFound: demandColumn
            }
          });
        } catch (error) {
          reject(new Error(`Error al procesar archivo Excel: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo Excel'));
      };

      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Main function to process any supported file
  const processFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);

    try {
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      let result;

      if (fileExtension === '.csv') {
        result = await processCSV(file);
      } else if (fileExtension === '.xls' || fileExtension === '.xlsx') {
        result = await processExcel(file);
      } else {
        throw new Error('Tipo de archivo no soportado');
      }

      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [processCSV, processExcel]);

  return {
    processFile,
    loading,
    error,
    clearError: () => setError(null)
  };
};