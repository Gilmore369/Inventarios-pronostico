import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for validating demand data
 * Implements validation rules for minimum/maximum row requirements (12-120),
 * numeric validation for demand values, and date format validation
 */
export const useDataValidation = () => {
  const [validationErrors, setValidationErrors] = useState([]);

  // Validation rules configuration
  const validationRules = useMemo(() => ({
    minRows: 12,
    maxRows: 120,
    demandMin: 0,
    demandMax: Number.MAX_SAFE_INTEGER
  }), []);

  /**
   * Validates a single demand value
   * @param {any} value - The value to validate
   * @param {number} rowIndex - The row index for error reporting
   * @returns {object|null} - Validation error object or null if valid
   */
  const validateDemandValue = useCallback((value, rowIndex) => {
    // Check if value is empty
    if (value === null || value === undefined || value === '') {
      return {
        row: rowIndex,
        field: 'demand',
        message: 'El valor de demanda es requerido',
        severity: 'error'
      };
    }

    // Convert to number and check if it's valid
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return {
        row: rowIndex,
        field: 'demand',
        message: 'El valor de demanda debe ser un número válido',
        severity: 'error'
      };
    }

    // Check if it's negative
    if (numValue < validationRules.demandMin) {
      return {
        row: rowIndex,
        field: 'demand',
        message: 'El valor de demanda no puede ser negativo',
        severity: 'error'
      };
    }

    // Check if it's too large
    if (numValue > validationRules.demandMax) {
      return {
        row: rowIndex,
        field: 'demand',
        message: 'El valor de demanda es demasiado grande',
        severity: 'error'
      };
    }

    return null;
  }, [validationRules]);

  /**
   * Validates a month field value
   * @param {any} value - The month value to validate
   * @param {number} rowIndex - The row index for error reporting
   * @returns {object|null} - Validation error object or null if valid
   */
  const validateMonthValue = useCallback((value, rowIndex) => {
    // Check if value is empty
    if (value === null || value === undefined || value === '') {
      return {
        row: rowIndex,
        field: 'month',
        message: 'El mes es requerido',
        severity: 'error'
      };
    }

    // Convert to string for validation
    const strValue = String(value).trim();
    
    // Check for YYYY-MM format
    const dateRegex = /^\d{4}-\d{2}$/;
    if (!dateRegex.test(strValue)) {
      return {
        row: rowIndex,
        field: 'month',
        message: 'El formato del mes debe ser YYYY-MM (ej: 2024-01)',
        severity: 'error'
      };
    }

    // Validate that it's a real date
    const [year, month] = strValue.split('-').map(Number);
    if (month < 1 || month > 12) {
      return {
        row: rowIndex,
        field: 'month',
        message: 'El mes debe estar entre 01 y 12',
        severity: 'error'
      };
    }

    if (year < 1900 || year > 2100) {
      return {
        row: rowIndex,
        field: 'month',
        message: 'El año debe estar entre 1900 y 2100',
        severity: 'warning'
      };
    }

    return null;
  }, []);

  /**
   * Validates an array of demand data
   * @param {Array} data - Array of data objects with month and demand properties
   * @returns {object} - Validation result with isValid flag and errors array
   */
  const validateData = useCallback((data) => {
    const errors = [];

    // Check if data exists and is an array
    if (!Array.isArray(data)) {
      errors.push({
        row: -1,
        field: 'general',
        message: 'Los datos deben ser un array válido',
        severity: 'error'
      });
      setValidationErrors(errors);
      return { isValid: false, errors };
    }

    // Check minimum row requirement
    if (data.length < validationRules.minRows) {
      errors.push({
        row: -1,
        field: 'general',
        message: `Se requieren al menos ${validationRules.minRows} registros de demanda`,
        severity: 'error'
      });
    }

    // Check maximum row requirement
    if (data.length > validationRules.maxRows) {
      errors.push({
        row: -1,
        field: 'general',
        message: `No se pueden procesar más de ${validationRules.maxRows} registros de demanda`,
        severity: 'error'
      });
    }

    // Validate each row
    data.forEach((row, index) => {
      // Validate month field
      const monthError = validateMonthValue(row.month, index);
      if (monthError) {
        errors.push(monthError);
      }

      // Validate demand field
      const demandError = validateDemandValue(row.demand, index);
      if (demandError) {
        errors.push(demandError);
      }
    });

    // Check for duplicate months
    const months = data.map(row => row.month).filter(month => month);
    const uniqueMonths = new Set(months);
    if (months.length !== uniqueMonths.size) {
      errors.push({
        row: -1,
        field: 'general',
        message: 'No se permiten meses duplicados',
        severity: 'error'
      });
    }

    setValidationErrors(errors);
    const isValid = errors.filter(error => error.severity === 'error').length === 0;
    
    return { isValid, errors };
  }, [validationRules, validateMonthValue, validateDemandValue]);

  /**
   * Validates a single row of data
   * @param {object} row - Data row with month and demand properties
   * @param {number} rowIndex - The row index for error reporting
   * @returns {object} - Validation result with isValid flag and errors array
   */
  const validateRow = useCallback((row, rowIndex) => {
    const errors = [];

    // Validate month field
    const monthError = validateMonthValue(row.month, rowIndex);
    if (monthError) {
      errors.push(monthError);
    }

    // Validate demand field
    const demandError = validateDemandValue(row.demand, rowIndex);
    if (demandError) {
      errors.push(demandError);
    }

    const isValid = errors.filter(error => error.severity === 'error').length === 0;
    return { isValid, errors };
  }, [validateMonthValue, validateDemandValue]);

  /**
   * Clears all validation errors
   */
  const clearValidationErrors = useCallback(() => {
    setValidationErrors([]);
  }, []);

  /**
   * Gets validation errors for a specific row
   * @param {number} rowIndex - The row index to get errors for
   * @returns {Array} - Array of validation errors for the specified row
   */
  const getRowErrors = useCallback((rowIndex) => {
    return validationErrors.filter(error => error.row === rowIndex);
  }, [validationErrors]);

  /**
   * Gets validation errors for a specific field
   * @param {string} field - The field name to get errors for
   * @returns {Array} - Array of validation errors for the specified field
   */
  const getFieldErrors = useCallback((field) => {
    return validationErrors.filter(error => error.field === field);
  }, [validationErrors]);

  /**
   * Checks if the current validation state has any errors
   * @returns {boolean} - True if there are validation errors
   */
  const hasErrors = useMemo(() => {
    return validationErrors.filter(error => error.severity === 'error').length > 0;
  }, [validationErrors]);

  /**
   * Checks if the current validation state has any warnings
   * @returns {boolean} - True if there are validation warnings
   */
  const hasWarnings = useMemo(() => {
    return validationErrors.filter(error => error.severity === 'warning').length > 0;
  }, [validationErrors]);

  return {
    // Validation functions
    validateData,
    validateRow,
    validateDemandValue,
    validateMonthValue,
    
    // State and utilities
    validationErrors,
    clearValidationErrors,
    getRowErrors,
    getFieldErrors,
    hasErrors,
    hasWarnings,
    
    // Configuration
    validationRules
  };
};