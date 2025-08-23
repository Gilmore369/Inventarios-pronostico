/**
 * Validation constants
 */
export const VALIDATION_CONSTANTS = {
  MIN_ROWS: 12,
  MAX_ROWS: 120,
  MIN_DEMAND_VALUE: 0,
  MAX_DEMAND_VALUE: Number.MAX_SAFE_INTEGER
};

/**
 * Validates demand data array according to business rules
 * @param {Array} demandData - Array of demand data objects
 * @returns {Object} - Validation result with isValid flag and errors array
 */
export const validateDemandData = (demandData) => {
  const errors = [];
  
  // Check if data exists
  if (!demandData || !Array.isArray(demandData)) {
    errors.push({
      field: 'data',
      message: 'Los datos de demanda son requeridos',
      severity: 'error'
    });
    return { isValid: false, errors };
  }
  
  // Validate row count
  const rowCountValidation = validateRowCount(demandData.length);
  if (!rowCountValidation.isValid) {
    errors.push(...rowCountValidation.errors);
  }
  
  // Validate each row
  demandData.forEach((row, index) => {
    const rowValidation = validateDemandRow(row, index);
    if (!rowValidation.isValid) {
      errors.push(...rowValidation.errors);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates the number of rows in demand data
 * @param {number} rowCount - Number of rows
 * @returns {Object} - Validation result
 */
export const validateRowCount = (rowCount) => {
  const errors = [];
  
  if (rowCount < VALIDATION_CONSTANTS.MIN_ROWS) {
    errors.push({
      field: 'rowCount',
      message: `Se requieren al menos ${VALIDATION_CONSTANTS.MIN_ROWS} registros de demanda. Actualmente hay ${rowCount}`,
      severity: 'error'
    });
  }
  
  if (rowCount > VALIDATION_CONSTANTS.MAX_ROWS) {
    errors.push({
      field: 'rowCount',
      message: `No se pueden procesar más de ${VALIDATION_CONSTANTS.MAX_ROWS} registros de demanda. Actualmente hay ${rowCount}`,
      severity: 'error'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a single demand data row
 * @param {Object} row - Demand data row
 * @param {number} index - Row index for error reporting
 * @returns {Object} - Validation result
 */
export const validateDemandRow = (row, index) => {
  const errors = [];
  const rowNumber = index + 1;
  
  // Validate row structure
  if (!row || typeof row !== 'object') {
    errors.push({
      row: rowNumber,
      field: 'structure',
      message: `Fila ${rowNumber}: Estructura de datos inválida`,
      severity: 'error'
    });
    return { isValid: false, errors };
  }
  
  // Validate month field
  const monthValidation = validateMonth(row.month, rowNumber);
  if (!monthValidation.isValid) {
    errors.push(...monthValidation.errors);
  }
  
  // Validate demand field
  const demandValidation = validateDemandValue(row.demand, rowNumber);
  if (!demandValidation.isValid) {
    errors.push(...demandValidation.errors);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates month/date field
 * @param {string} month - Month value
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object} - Validation result
 */
export const validateMonth = (month, rowNumber) => {
  const errors = [];
  
  if (!month) {
    errors.push({
      row: rowNumber,
      field: 'month',
      message: `Fila ${rowNumber}: El campo de mes/fecha es requerido`,
      severity: 'error'
    });
    return { isValid: false, errors };
  }
  
  // Convert to string if not already
  const monthStr = String(month).trim();
  
  if (monthStr.length === 0) {
    errors.push({
      row: rowNumber,
      field: 'month',
      message: `Fila ${rowNumber}: El campo de mes/fecha no puede estar vacío`,
      severity: 'error'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates demand value
 * @param {number} demand - Demand value
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object} - Validation result
 */
export const validateDemandValue = (demand, rowNumber) => {
  const errors = [];
  
  // Check if demand exists
  if (demand === undefined || demand === null) {
    errors.push({
      row: rowNumber,
      field: 'demand',
      message: `Fila ${rowNumber}: El valor de demanda es requerido`,
      severity: 'error'
    });
    return { isValid: false, errors };
  }
  
  // Check if demand is numeric
  const numericDemand = Number(demand);
  if (isNaN(numericDemand)) {
    errors.push({
      row: rowNumber,
      field: 'demand',
      message: `Fila ${rowNumber}: El valor de demanda debe ser numérico. Valor actual: "${demand}"`,
      severity: 'error'
    });
    return { isValid: false, errors };
  }
  
  // Check demand value range
  if (numericDemand < VALIDATION_CONSTANTS.MIN_DEMAND_VALUE) {
    errors.push({
      row: rowNumber,
      field: 'demand',
      message: `Fila ${rowNumber}: El valor de demanda no puede ser negativo. Valor actual: ${numericDemand}`,
      severity: 'error'
    });
  }
  
  if (numericDemand > VALIDATION_CONSTANTS.MAX_DEMAND_VALUE) {
    errors.push({
      row: rowNumber,
      field: 'demand',
      message: `Fila ${rowNumber}: El valor de demanda es demasiado grande. Valor actual: ${numericDemand}`,
      severity: 'error'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates if demand data is ready for processing
 * @param {Array} demandData - Array of demand data objects
 * @returns {boolean} - True if data is ready for processing
 */
export const isDataReadyForProcessing = (demandData) => {
  const validation = validateDemandData(demandData);
  return validation.isValid;
};

/**
 * Gets validation summary for display purposes
 * @param {Array} demandData - Array of demand data objects
 * @returns {Object} - Validation summary with counts and status
 */
export const getValidationSummary = (demandData) => {
  const validation = validateDemandData(demandData);
  
  const errorCount = validation.errors.filter(error => error.severity === 'error').length;
  const warningCount = validation.errors.filter(error => error.severity === 'warning').length;
  
  return {
    isValid: validation.isValid,
    totalRows: demandData ? demandData.length : 0,
    errorCount,
    warningCount,
    errors: validation.errors,
    status: validation.isValid ? 'valid' : 'invalid'
  };
};