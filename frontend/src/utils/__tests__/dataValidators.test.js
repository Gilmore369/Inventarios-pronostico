import {
  validateDemandData,
  validateRowCount,
  validateDemandRow,
  validateMonth,
  validateDemandValue,
  isDataReadyForProcessing,
  getValidationSummary,
  VALIDATION_CONSTANTS
} from '../dataValidators';

describe('dataValidators', () => {
  describe('VALIDATION_CONSTANTS', () => {
    test('has correct validation constants', () => {
      expect(VALIDATION_CONSTANTS.MIN_ROWS).toBe(12);
      expect(VALIDATION_CONSTANTS.MAX_ROWS).toBe(120);
      expect(VALIDATION_CONSTANTS.MIN_DEMAND_VALUE).toBe(0);
      expect(VALIDATION_CONSTANTS.MAX_DEMAND_VALUE).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('validateRowCount', () => {
    test('passes validation for valid row count', () => {
      const result = validateRowCount(12);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails validation for too few rows', () => {
      const result = validateRowCount(5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'rowCount',
        message: 'Se requieren al menos 12 registros de demanda. Actualmente hay 5',
        severity: 'error'
      });
    });

    test('fails validation for too many rows', () => {
      const result = validateRowCount(150);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'rowCount',
        message: 'No se pueden procesar más de 120 registros de demanda. Actualmente hay 150',
        severity: 'error'
      });
    });

    test('handles edge cases', () => {
      expect(validateRowCount(12).isValid).toBe(true);
      expect(validateRowCount(120).isValid).toBe(true);
      expect(validateRowCount(11).isValid).toBe(false);
      expect(validateRowCount(121).isValid).toBe(false);
    });
  });

  describe('validateMonth', () => {
    test('passes validation for valid month', () => {
      const result = validateMonth('2023-01', 1);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails validation for missing month', () => {
      const result = validateMonth(null, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'month',
        message: 'Fila 1: El campo de mes/fecha es requerido',
        severity: 'error'
      });
    });

    test('fails validation for empty month string', () => {
      const result = validateMonth('   ', 2);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        row: 2,
        field: 'month',
        message: 'Fila 2: El campo de mes/fecha no puede estar vacío',
        severity: 'error'
      });
    });

    test('handles undefined month', () => {
      const result = validateMonth(undefined, 3);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('El campo de mes/fecha es requerido');
    });

    test('converts non-string values to string', () => {
      const result = validateMonth(202301, 1);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDemandValue', () => {
    test('passes validation for valid numeric demand', () => {
      const result = validateDemandValue(100, 1);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('passes validation for zero demand', () => {
      const result = validateDemandValue(0, 1);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('passes validation for string numeric values', () => {
      const result = validateDemandValue('100.5', 1);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails validation for missing demand', () => {
      const result = validateDemandValue(null, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'demand',
        message: 'Fila 1: El valor de demanda es requerido',
        severity: 'error'
      });
    });

    test('fails validation for undefined demand', () => {
      const result = validateDemandValue(undefined, 2);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        row: 2,
        field: 'demand',
        message: 'Fila 2: El valor de demanda es requerido',
        severity: 'error'
      });
    });

    test('fails validation for non-numeric demand', () => {
      const result = validateDemandValue('abc', 3);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        row: 3,
        field: 'demand',
        message: 'Fila 3: El valor de demanda debe ser numérico. Valor actual: "abc"',
        severity: 'error'
      });
    });

    test('fails validation for negative demand', () => {
      const result = validateDemandValue(-10, 4);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        row: 4,
        field: 'demand',
        message: 'Fila 4: El valor de demanda no puede ser negativo. Valor actual: -10',
        severity: 'error'
      });
    });

    test('fails validation for extremely large demand', () => {
      const result = validateDemandValue(Number.MAX_SAFE_INTEGER + 1, 5);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        row: 5,
        field: 'demand',
        message: 'Fila 5: El valor de demanda es demasiado grande. Valor actual: ' + (Number.MAX_SAFE_INTEGER + 1),
        severity: 'error'
      });
    });
  });

  describe('validateDemandRow', () => {
    test('passes validation for valid row', () => {
      const row = { month: '2023-01', demand: 100 };
      const result = validateDemandRow(row, 0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails validation for invalid row structure', () => {
      const result = validateDemandRow(null, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'structure',
        message: 'Fila 1: Estructura de datos inválida',
        severity: 'error'
      });
    });

    test('fails validation for non-object row', () => {
      const result = validateDemandRow('invalid', 1);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('structure');
    });

    test('accumulates multiple validation errors', () => {
      const row = { month: '', demand: 'invalid' };
      const result = validateDemandRow(row, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.field === 'month')).toBe(true);
      expect(result.errors.some(e => e.field === 'demand')).toBe(true);
    });
  });

  describe('validateDemandData', () => {
    const validData = [
      { month: '2023-01', demand: 100 },
      { month: '2023-02', demand: 120 },
      { month: '2023-03', demand: 110 },
      { month: '2023-04', demand: 130 },
      { month: '2023-05', demand: 140 },
      { month: '2023-06', demand: 150 },
      { month: '2023-07', demand: 160 },
      { month: '2023-08', demand: 170 },
      { month: '2023-09', demand: 180 },
      { month: '2023-10', demand: 190 },
      { month: '2023-11', demand: 200 },
      { month: '2023-12', demand: 210 }
    ];

    test('passes validation for valid data array', () => {
      const result = validateDemandData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('fails validation for non-array data', () => {
      const result = validateDemandData('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toEqual({
        field: 'data',
        message: 'Los datos de demanda son requeridos',
        severity: 'error'
      });
    });

    test('fails validation for null data', () => {
      const result = validateDemandData(null);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('data');
    });

    test('fails validation for insufficient data', () => {
      const shortData = validData.slice(0, 5);
      const result = validateDemandData(shortData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'rowCount')).toBe(true);
    });

    test('fails validation for excessive data', () => {
      const longData = Array(150).fill().map((_, i) => ({
        month: `2023-${String(i + 1).padStart(2, '0')}`,
        demand: 100
      }));
      const result = validateDemandData(longData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'rowCount')).toBe(true);
    });

    test('accumulates validation errors from multiple rows', () => {
      const invalidData = [
        ...validData,
        { month: '', demand: 'invalid' },
        { month: '2024-01', demand: -10 }
      ];
      const result = validateDemandData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('isDataReadyForProcessing', () => {
    test('returns true for valid data', () => {
      const validData = Array(12).fill().map((_, i) => ({
        month: `2023-${String(i + 1).padStart(2, '0')}`,
        demand: 100 + i
      }));
      expect(isDataReadyForProcessing(validData)).toBe(true);
    });

    test('returns false for invalid data', () => {
      const invalidData = [
        { month: '2023-01', demand: 'invalid' }
      ];
      expect(isDataReadyForProcessing(invalidData)).toBe(false);
    });

    test('returns false for insufficient data', () => {
      const shortData = [
        { month: '2023-01', demand: 100 }
      ];
      expect(isDataReadyForProcessing(shortData)).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    test('returns correct summary for valid data', () => {
      const validData = Array(12).fill().map((_, i) => ({
        month: `2023-${String(i + 1).padStart(2, '0')}`,
        demand: 100 + i
      }));
      
      const summary = getValidationSummary(validData);
      
      expect(summary.isValid).toBe(true);
      expect(summary.totalRows).toBe(12);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
      expect(summary.status).toBe('valid');
    });

    test('returns correct summary for invalid data', () => {
      const invalidData = [
        { month: '2023-01', demand: 'invalid' },
        { month: '', demand: 100 }
      ];
      
      const summary = getValidationSummary(invalidData);
      
      expect(summary.isValid).toBe(false);
      expect(summary.totalRows).toBe(2);
      expect(summary.errorCount).toBeGreaterThan(0);
      expect(summary.status).toBe('invalid');
    });

    test('handles null data gracefully', () => {
      const summary = getValidationSummary(null);
      
      expect(summary.isValid).toBe(false);
      expect(summary.totalRows).toBe(0);
      expect(summary.errorCount).toBeGreaterThan(0);
    });

    test('distinguishes between errors and warnings', () => {
      // This test would need data that generates warnings
      // For now, we'll test the structure
      const data = [{ month: '2023-01', demand: 100 }];
      const summary = getValidationSummary(data);
      
      expect(summary).toHaveProperty('errorCount');
      expect(summary).toHaveProperty('warningCount');
      expect(summary).toHaveProperty('errors');
      expect(Array.isArray(summary.errors)).toBe(true);
    });
  });
});