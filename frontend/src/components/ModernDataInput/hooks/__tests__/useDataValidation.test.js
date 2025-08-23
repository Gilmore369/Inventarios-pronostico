import { renderHook, act } from '@testing-library/react';
import { useDataValidation } from '../useDataValidation';

describe('useDataValidation', () => {
  test('initializes with empty validation errors', () => {
    const { result } = renderHook(() => useDataValidation());
    
    expect(result.current.validationErrors).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.hasWarnings).toBe(false);
  });

  test('provides correct validation rules', () => {
    const { result } = renderHook(() => useDataValidation());
    
    expect(result.current.validationRules).toEqual({
      minRows: 12,
      maxRows: 120,
      demandMin: 0,
      demandMax: Number.MAX_SAFE_INTEGER
    });
  });

  describe('validateDemandValue', () => {
    test('validates correct demand values', () => {
      const { result } = renderHook(() => useDataValidation());
      
      expect(result.current.validateDemandValue(100, 0)).toBeNull();
      expect(result.current.validateDemandValue(0, 0)).toBeNull();
      expect(result.current.validateDemandValue('100.5', 0)).toBeNull();
    });

    test('rejects empty demand values', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const error = result.current.validateDemandValue('', 0);
      expect(error).toEqual({
        row: 0,
        field: 'demand',
        message: 'El valor de demanda es requerido',
        severity: 'error'
      });
    });

    test('rejects null demand values', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const error = result.current.validateDemandValue(null, 1);
      expect(error).toEqual({
        row: 1,
        field: 'demand',
        message: 'El valor de demanda es requerido',
        severity: 'error'
      });
    });

    test('rejects non-numeric demand values', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const error = result.current.validateDemandValue('abc', 2);
      expect(error).toEqual({
        row: 2,
        field: 'demand',
        message: 'El valor de demanda debe ser un número válido',
        severity: 'error'
      });
    });

    test('rejects negative demand values', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const error = result.current.validateDemandValue(-10, 3);
      expect(error).toEqual({
        row: 3,
        field: 'demand',
        message: 'El valor de demanda no puede ser negativo',
        severity: 'error'
      });
    });

    test('rejects extremely large demand values', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const error = result.current.validateDemandValue(Number.MAX_SAFE_INTEGER + 1, 4);
      expect(error).toEqual({
        row: 4,
        field: 'demand',
        message: 'El valor de demanda es demasiado grande',
        severity: 'error'
      });
    });
  });

  describe('validateMonthValue', () => {
    test('validates correct YYYY-MM format', () => {
      const { result } = renderHook(() => useDataValidation());
      
      expect(result.current.validateMonthValue('2023-01', 0)).toBeNull();
      expect(result.current.validateMonthValue('2024-12', 0)).toBeNull();
    });

    test('rejects empty month values', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const error = result.current.validateMonthValue('', 0);
      expect(error).toEqual({
        row: 0,
        field: 'month',
        message: 'El mes es requerido',
        severity: 'error'
      });
    });

    test('rejects invalid month format', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const error = result.current.validateMonthValue('2023/01', 1);
      expect(error).toEqual({
        row: 1,
        field: 'month',
        message: 'El formato del mes debe ser YYYY-MM (ej: 2024-01)',
        severity: 'error'
      });
    });

    test('rejects invalid month numbers', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const error = result.current.validateMonthValue('2023-13', 2);
      expect(error).toEqual({
        row: 2,
        field: 'month',
        message: 'El mes debe estar entre 01 y 12',
        severity: 'error'
      });
    });

    test('warns about unusual years', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const error = result.current.validateMonthValue('1800-01', 3);
      expect(error).toEqual({
        row: 3,
        field: 'month',
        message: 'El año debe estar entre 1900 y 2100',
        severity: 'warning'
      });
    });
  });

  describe('validateRow', () => {
    test('validates correct row', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const row = { month: '2023-01', demand: 100 };
      const validation = result.current.validateRow(row, 0);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('accumulates multiple errors', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const row = { month: '', demand: 'invalid' };
      const validation = result.current.validateRow(row, 0);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(2);
    });
  });

  describe('validateData', () => {
    const validData = Array(12).fill().map((_, i) => ({
      month: `2023-${String(i + 1).padStart(2, '0')}`,
      demand: 100 + i
    }));

    test('validates correct data array', () => {
      const { result } = renderHook(() => useDataValidation());
      
      act(() => {
        const validation = result.current.validateData(validData);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
      
      expect(result.current.validationErrors).toHaveLength(0);
      expect(result.current.hasErrors).toBe(false);
    });

    test('rejects non-array data', () => {
      const { result } = renderHook(() => useDataValidation());
      
      act(() => {
        const validation = result.current.validateData('invalid');
        expect(validation.isValid).toBe(false);
        expect(validation.errors[0]).toEqual({
          row: -1,
          field: 'general',
          message: 'Los datos deben ser un array válido',
          severity: 'error'
        });
      });
    });

    test('rejects insufficient data', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const shortData = validData.slice(0, 5);
      
      act(() => {
        const validation = result.current.validateData(shortData);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(e => e.message.includes('al menos 12 registros'))).toBe(true);
      });
    });

    test('rejects excessive data', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const longData = Array(150).fill().map((_, i) => ({
        month: `2023-${String((i % 12) + 1).padStart(2, '0')}`,
        demand: 100
      }));
      
      act(() => {
        const validation = result.current.validateData(longData);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(e => e.message.includes('más de 120 registros'))).toBe(true);
      });
    });

    test('detects duplicate months', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const duplicateData = [
        ...validData,
        { month: '2023-01', demand: 200 } // Duplicate month
      ];
      
      act(() => {
        const validation = result.current.validateData(duplicateData);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(e => e.message.includes('meses duplicados'))).toBe(true);
      });
    });

    test('updates validation errors state', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const invalidData = [
        { month: '', demand: 'invalid' }
      ];
      
      act(() => {
        result.current.validateData(invalidData);
      });
      
      expect(result.current.validationErrors.length).toBeGreaterThan(0);
      expect(result.current.hasErrors).toBe(true);
    });
  });

  describe('clearValidationErrors', () => {
    test('clears validation errors', () => {
      const { result } = renderHook(() => useDataValidation());
      
      // First add some errors
      act(() => {
        result.current.validateData([{ month: '', demand: 'invalid' }]);
      });
      
      expect(result.current.validationErrors.length).toBeGreaterThan(0);
      
      // Then clear them
      act(() => {
        result.current.clearValidationErrors();
      });
      
      expect(result.current.validationErrors).toHaveLength(0);
      expect(result.current.hasErrors).toBe(false);
    });
  });

  describe('getRowErrors', () => {
    test('returns errors for specific row', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const invalidData = [
        { month: '2023-01', demand: 100 }, // Valid row 0
        { month: '', demand: 'invalid' }   // Invalid row 1
      ];
      
      act(() => {
        result.current.validateData(invalidData);
      });
      
      const row0Errors = result.current.getRowErrors(0);
      const row1Errors = result.current.getRowErrors(1);
      
      expect(row0Errors).toHaveLength(0);
      expect(row1Errors.length).toBeGreaterThan(0);
    });
  });

  describe('getFieldErrors', () => {
    test('returns errors for specific field', () => {
      const { result } = renderHook(() => useDataValidation());
      
      const invalidData = [
        { month: '', demand: 'invalid' }
      ];
      
      act(() => {
        result.current.validateData(invalidData);
      });
      
      const monthErrors = result.current.getFieldErrors('month');
      const demandErrors = result.current.getFieldErrors('demand');
      
      expect(monthErrors.length).toBeGreaterThan(0);
      expect(demandErrors.length).toBeGreaterThan(0);
    });
  });

  describe('hasErrors and hasWarnings', () => {
    test('correctly identifies errors vs warnings', () => {
      const { result } = renderHook(() => useDataValidation());
      
      // Test with data that has errors
      act(() => {
        result.current.validateData([{ month: '', demand: 'invalid' }]);
      });
      
      expect(result.current.hasErrors).toBe(true);
      
      // Test with data that might have warnings (year out of range)
      act(() => {
        result.current.validateData([
          ...Array(12).fill().map((_, i) => ({
            month: `1800-${String(i + 1).padStart(2, '0')}`,
            demand: 100
          }))
        ]);
      });
      
      // This should have warnings but might still be valid depending on implementation
      expect(result.current.hasWarnings).toBe(true);
    });
  });
});