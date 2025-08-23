/**
 * Formats demand data for API submission (maintains backend compatibility)
 * @param {Array} demandData - Array of demand data objects
 * @returns {Array} - Formatted data for API
 */
export const formatDataForAPI = (demandData) => {
  if (!demandData || !Array.isArray(demandData)) {
    return [];
  }
  
  return demandData.map(item => ({
    month: String(item.month),
    demand: Number(item.demand)
  }));
};

/**
 * Formats data for display in DataGrid component
 * @param {Array} demandData - Array of demand data objects
 * @returns {Array} - Formatted data for DataGrid with id field
 */
export const formatDataForGrid = (demandData) => {
  if (!demandData || !Array.isArray(demandData)) {
    return [];
  }
  
  return demandData.map((item, index) => ({
    id: index + 1,
    month: item.month || '',
    demand: item.demand || ''
  }));
};

/**
 * Formats grid data back to standard demand data format
 * @param {Array} gridData - Data from DataGrid component
 * @returns {Array} - Standard demand data format
 */
export const formatGridDataToStandard = (gridData) => {
  if (!gridData || !Array.isArray(gridData)) {
    return [];
  }
  
  return gridData
    .filter(item => item.month && item.demand !== undefined && item.demand !== '')
    .map(item => ({
      month: String(item.month),
      demand: Number(item.demand)
    }));
};

/**
 * Creates empty rows for manual data entry
 * @param {number} count - Number of empty rows to create
 * @returns {Array} - Array of empty demand data objects
 */
export const createEmptyRows = (count = 12) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    month: '',
    demand: ''
  }));
};

/**
 * Formats file processing result for preview display
 * @param {Object} processingResult - Result from file processing
 * @returns {Object} - Formatted result for preview
 */
export const formatForPreview = (processingResult) => {
  if (!processingResult || !processingResult.data) {
    return {
      previewData: [],
      metadata: {},
      hasErrors: true
    };
  }
  
  const { data, metadata, errors } = processingResult;
  
  // Get first 5 rows for preview
  const previewData = data.slice(0, 5).map((item, index) => ({
    id: index + 1,
    month: item.month,
    demand: item.demand
  }));
  
  return {
    previewData,
    metadata: {
      totalRows: data.length,
      dateRange: metadata.dateRange,
      columnFound: metadata.columnFound,
      monthColumnFound: metadata.monthColumnFound
    },
    hasErrors: errors && errors.length > 0,
    errors: errors || []
  };
};

/**
 * Formats validation errors for display
 * @param {Array} errors - Array of validation error objects
 * @returns {Array} - Formatted errors for UI display
 */
export const formatValidationErrors = (errors) => {
  if (!errors || !Array.isArray(errors)) {
    return [];
  }
  
  return errors.map(error => ({
    ...error,
    displayMessage: error.message,
    type: error.severity || 'error',
    id: `${error.row || 'general'}-${error.field || 'unknown'}-${Date.now()}`
  }));
};

/**
 * Formats month value for consistent display
 * @param {string|number} month - Month value
 * @returns {string} - Formatted month string
 */
export const formatMonth = (month) => {
  if (!month) return '';
  
  const monthStr = String(month).trim();
  
  // If it looks like a date (YYYY-MM format), return as is
  if (/^\d{4}-\d{2}$/.test(monthStr)) {
    return monthStr;
  }
  
  // If it's just a number, try to format it
  if (/^\d+$/.test(monthStr)) {
    const num = parseInt(monthStr);
    if (num >= 1 && num <= 12) {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${num.toString().padStart(2, '0')}`;
    }
  }
  
  return monthStr;
};

/**
 * Formats demand value for consistent display
 * @param {string|number} demand - Demand value
 * @returns {number|string} - Formatted demand value
 */
export const formatDemand = (demand) => {
  if (demand === undefined || demand === null || demand === '') {
    return '';
  }
  
  const numericDemand = Number(demand);
  if (isNaN(numericDemand)) {
    return demand; // Return original if not numeric
  }
  
  // Round to 2 decimal places and remove trailing zeros
  return parseFloat(numericDemand.toFixed(2));
};

/**
 * Converts file processing result to standard format
 * @param {Object} processingResult - Result from file processing
 * @returns {Array} - Standard demand data array
 */
export const convertProcessingResultToStandard = (processingResult) => {
  if (!processingResult || !processingResult.data) {
    return [];
  }
  
  return processingResult.data.map(item => ({
    month: formatMonth(item.month),
    demand: formatDemand(item.demand)
  }));
};

/**
 * Validates and cleans data before formatting
 * @param {Array} data - Raw data array
 * @returns {Array} - Cleaned and validated data
 */
export const cleanAndValidateData = (data) => {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  return data
    .filter(item => item && typeof item === 'object')
    .filter(item => item.month && item.demand !== undefined)
    .map(item => ({
      month: formatMonth(item.month),
      demand: formatDemand(item.demand)
    }))
    .filter(item => item.month && !isNaN(Number(item.demand)));
};