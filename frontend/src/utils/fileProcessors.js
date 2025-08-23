import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Processes CSV files and extracts demand data
 * @param {File} file - The CSV file to process
 * @returns {Promise<Object>} - Processing result with data, errors, and metadata
 */
export const processCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const processedResult = extractDemandData(results.data, results.meta);
          resolve(processedResult);
        } catch (error) {
          reject(new Error(`Error processing CSV: ${error.message}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
};

/**
 * Processes Excel files (.xls, .xlsx) and extracts demand data
 * @param {File} file - The Excel file to process
 * @returns {Promise<Object>} - Processing result with data, errors, and metadata
 */
export const processExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío'));
          return;
        }
        
        // Convert array format to object format with headers
        const headers = jsonData[0];
        const rows = jsonData.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
        
        const processedResult = extractDemandData(rows, { fields: headers });
        resolve(processedResult);
      } catch (error) {
        reject(new Error(`Error processing Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Extracts demand data from parsed file data
 * @param {Array} data - Parsed file data
 * @param {Object} meta - File metadata
 * @returns {Object} - Processed result with demand data
 */
const extractDemandData = (data, meta) => {
  const errors = [];
  const demandData = [];
  
  // Find the demand column (case-insensitive)
  const headers = meta.fields || Object.keys(data[0] || {});
  const demandColumn = headers.find(header => 
    header && header.toLowerCase().includes('demanda')
  );
  
  if (!demandColumn) {
    throw new Error('No se encontró una columna llamada "demanda" en el archivo');
  }
  
  // Find month/date column (case-insensitive)
  const monthColumn = headers.find(header => 
    header && (
      header.toLowerCase().includes('mes') ||
      header.toLowerCase().includes('month') ||
      header.toLowerCase().includes('fecha') ||
      header.toLowerCase().includes('date') ||
      header.toLowerCase().includes('periodo')
    )
  );
  
  if (!monthColumn) {
    throw new Error('No se encontró una columna de fecha/mes en el archivo');
  }
  
  // Process each row
  data.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;
    
    const demandValue = row[demandColumn];
    const monthValue = row[monthColumn];
    
    // Skip empty rows
    if (demandValue === undefined && monthValue === undefined) return;
    
    // Validate demand value
    const numericDemand = parseFloat(demandValue);
    if (isNaN(numericDemand)) {
      errors.push({
        row: index + 1,
        field: 'demand',
        message: `Valor de demanda inválido: "${demandValue}"`,
        severity: 'error'
      });
      return;
    }
    
    // Validate month value
    if (!monthValue) {
      errors.push({
        row: index + 1,
        field: 'month',
        message: 'Valor de mes/fecha faltante',
        severity: 'error'
      });
      return;
    }
    
    demandData.push({
      month: String(monthValue),
      demand: numericDemand
    });
  });
  
  // Calculate metadata
  const metadata = {
    totalRows: demandData.length,
    dateRange: calculateDateRange(demandData),
    columnFound: demandColumn,
    monthColumnFound: monthColumn
  };
  
  return {
    data: demandData,
    errors,
    metadata
  };
};

/**
 * Calculates the date range from demand data
 * @param {Array} demandData - Array of demand data objects
 * @returns {Object} - Date range with start and end
 */
const calculateDateRange = (demandData) => {
  if (demandData.length === 0) {
    return { start: null, end: null };
  }
  
  const months = demandData.map(item => item.month).sort();
  return {
    start: months[0],
    end: months[months.length - 1]
  };
};

/**
 * Validates file type before processing
 * @param {File} file - File to validate
 * @returns {boolean} - True if file type is supported
 */
export const validateFileType = (file) => {
  const supportedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const supportedExtensions = ['.csv', '.xls', '.xlsx'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  return supportedTypes.includes(file.type) || supportedExtensions.includes(fileExtension);
};