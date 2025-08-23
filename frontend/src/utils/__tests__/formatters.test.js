import {
  formatDataForAPI,
  formatDataForGrid,
  formatGridDataToStandard,
  createEmptyRows,
  formatForPreview,
  formatValidationErrors,
  formatMonth,
  formatDemand,
  convertProcessingResultToStandard,
  cleanAndValidateData
} from '../formatters';

describe('formatters', () => {
  describe('formatDataForAPI', () => {
    test('formats valid data correctly', () => {
      const input = [
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120.5 }
      ];
      
      const result = formatDataForAPI(input);
      
      expect(result).toEqual([
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120.5 }
      ]);
    });

    test('converts string numbers to numbers', () => {
      const input = [
        { month: 202301, demand: '100' }
      ];
      
      const result = formatDataForAPI(input);
      
      expect(result).toEqual([
        { month: '202301', demand: 100 }
      ]);
    });

    test('handles empty array', () => {
      expect(formatDataForAPI([])).toEqual([]);
    });

    test('handles null input', () => {
      expect(formatDataForAPI(null)).toEqual([]);
    });

    test('handles undefined input', () => {
      expect(formatDataForAPI(undefined)).toEqual([]);
    });

    test('handles non-array input', () => {
      expect(formatDataForAPI('invalid')).toEqual([]);
    });
  });

  describe('formatDataForGrid', () => {
    test('formats data with id field for DataGrid', () => {
      const input = [
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120 }
      ];
      
      const result = formatDataForGrid(input);
      
      expect(result).toEqual([
        { id: 1, month: '2023-01', demand: 100 },
        { id: 2, month: '2023-02', demand: 120 }
      ]);
    });

    test('handles missing values', () => {
      const input = [
        { month: null, demand: undefined }
      ];
      
      const result = formatDataForGrid(input);
      
      expect(result).toEqual([
        { id: 1, month: '', demand: '' }
      ]);
    });

    test('handles empty array', () => {
      expect(formatDataForGrid([])).toEqual([]);
    });

    test('handles null input', () => {
      expect(formatDataForGrid(null)).toEqual([]);
    });
  });

  describe('formatGridDataToStandard', () => {
    test('converts grid data back to standard format', () => {
      const input = [
        { id: 1, month: '2023-01', demand: 100 },
        { id: 2, month: '2023-02', demand: 120 }
      ];
      
      const result = formatGridDataToStandard(input);
      
      expect(result).toEqual([
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120 }
      ]);
    });

    test('filters out empty rows', () => {
      const input = [
        { id: 1, month: '2023-01', demand: 100 },
        { id: 2, month: '', demand: '' },
        { id: 3, month: '2023-02', demand: 120 }
      ];
      
      const result = formatGridDataToStandard(input);
      
      expect(result).toEqual([
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120 }
      ]);
    });

    test('filters out rows with missing month', () => {
      const input = [
        { id: 1, month: '', demand: 100 },
        { id: 2, month: '2023-01', demand: 120 }
      ];
      
      const result = formatGridDataToStandard(input);
      
      expect(result).toEqual([
        { month: '2023-01', demand: 120 }
      ]);
    });

    test('handles null input', () => {
      expect(formatGridDataToStandard(null)).toEqual([]);
    });
  });

  describe('createEmptyRows', () => {
    test('creates default 12 empty rows', () => {
      const result = createEmptyRows();
      
      expect(result).toHaveLength(12);
      expect(result[0]).toEqual({ id: 1, month: '', demand: '' });
      expect(result[11]).toEqual({ id: 12, month: '', demand: '' });
    });

    test('creates specified number of empty rows', () => {
      const result = createEmptyRows(5);
      
      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ id: 1, month: '', demand: '' });
      expect(result[4]).toEqual({ id: 5, month: '', demand: '' });
    });

    test('handles zero count', () => {
      const result = createEmptyRows(0);
      expect(result).toHaveLength(0);
    });
  });

  describe('formatForPreview', () => {
    test('formats processing result for preview', () => {
      const processingResult = {
        data: [
          { month: '2023-01', demand: 100 },
          { month: '2023-02', demand: 120 },
          { month: '2023-03', demand: 110 },
          { month: '2023-04', demand: 130 },
          { month: '2023-05', demand: 140 },
          { month: '2023-06', demand: 150 }
        ],
        metadata: {
          dateRange: { start: '2023-01', end: '2023-06' },
          columnFound: 'demanda',
          monthColumnFound: 'mes'
        },
        errors: []
      };
      
      const result = formatForPreview(processingResult);
      
      expect(result.previewData).toHaveLength(5);
      expect(result.previewData[0]).toEqual({ id: 1, month: '2023-01', demand: 100 });
      expect(result.metadata.totalRows).toBe(6);
      expect(result.metadata.columnFound).toBe('demanda');
      expect(result.hasErrors).toBe(false);
    });

    test('handles processing result with errors', () => {
      const processingResult = {
        data: [{ month: '2023-01', demand: 100 }],
        metadata: {},
        errors: [{ message: 'Test error' }]
      };
      
      const result = formatForPreview(processingResult);
      
      expect(result.hasErrors).toBe(true);
      expect(result.errors).toHaveLength(1);
    });

    test('handles null processing result', () => {
      const result = formatForPreview(null);
      
      expect(result.previewData).toEqual([]);
      expect(result.hasErrors).toBe(true);
    });

    test('handles processing result without data', () => {
      const result = formatForPreview({ metadata: {} });
      
      expect(result.previewData).toEqual([]);
      expect(result.hasErrors).toBe(true);
    });
  });

  describe('formatValidationErrors', () => {
    test('formats validation errors for display', () => {
      const errors = [
        { row: 1, field: 'demand', message: 'Invalid value', severity: 'error' },
        { row: 2, field: 'month', message: 'Missing month', severity: 'warning' }
      ];
      
      const result = formatValidationErrors(errors);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        row: 1,
        field: 'demand',
        displayMessage: 'Invalid value',
        type: 'error'
      });
      expect(result[0]).toHaveProperty('id');
    });

    test('handles errors without severity', () => {
      const errors = [
        { row: 1, field: 'demand', message: 'Invalid value' }
      ];
      
      const result = formatValidationErrors(errors);
      
      expect(result[0].type).toBe('error');
    });

    test('handles null input', () => {
      expect(formatValidationErrors(null)).toEqual([]);
    });

    test('handles non-array input', () => {
      expect(formatValidationErrors('invalid')).toEqual([]);
    });
  });

  describe('formatMonth', () => {
    test('returns YYYY-MM format as is', () => {
      expect(formatMonth('2023-01')).toBe('2023-01');
      expect(formatMonth('2024-12')).toBe('2024-12');
    });

    test('formats numeric month with current year', () => {
      const currentYear = new Date().getFullYear();
      expect(formatMonth('1')).toBe(`${currentYear}-01`);
      expect(formatMonth('12')).toBe(`${currentYear}-12`);
    });

    test('handles invalid numeric months', () => {
      expect(formatMonth('13')).toBe('13');
      expect(formatMonth('0')).toBe('0');
    });

    test('handles empty input', () => {
      expect(formatMonth('')).toBe('');
      expect(formatMonth(null)).toBe('');
      expect(formatMonth(undefined)).toBe('');
    });

    test('handles non-standard formats', () => {
      expect(formatMonth('January 2023')).toBe('January 2023');
      expect(formatMonth('2023/01')).toBe('2023/01');
    });

    test('trims whitespace', () => {
      expect(formatMonth('  2023-01  ')).toBe('2023-01');
    });
  });

  describe('formatDemand', () => {
    test('formats numeric values correctly', () => {
      expect(formatDemand(100)).toBe(100);
      expect(formatDemand(100.5)).toBe(100.5);
      expect(formatDemand(100.123)).toBe(100.12);
    });

    test('converts string numbers', () => {
      expect(formatDemand('100')).toBe(100);
      expect(formatDemand('100.5')).toBe(100.5);
    });

    test('handles empty values', () => {
      expect(formatDemand('')).toBe('');
      expect(formatDemand(null)).toBe('');
      expect(formatDemand(undefined)).toBe('');
    });

    test('returns original value for non-numeric strings', () => {
      expect(formatDemand('abc')).toBe('abc');
      expect(formatDemand('not a number')).toBe('not a number');
    });

    test('removes trailing zeros', () => {
      expect(formatDemand(100.00)).toBe(100);
      expect(formatDemand(100.10)).toBe(100.1);
    });
  });

  describe('convertProcessingResultToStandard', () => {
    test('converts processing result to standard format', () => {
      const processingResult = {
        data: [
          { month: '1', demand: '100' },
          { month: '2023-02', demand: 120.5 }
        ]
      };
      
      const result = convertProcessingResultToStandard(processingResult);
      
      expect(result).toHaveLength(2);
      expect(result[0].month).toMatch(/^\d{4}-01$/);
      expect(result[0].demand).toBe(100);
      expect(result[1].month).toBe('2023-02');
      expect(result[1].demand).toBe(120.5);
    });

    test('handles null processing result', () => {
      expect(convertProcessingResultToStandard(null)).toEqual([]);
    });

    test('handles processing result without data', () => {
      expect(convertProcessingResultToStandard({})).toEqual([]);
    });
  });

  describe('cleanAndValidateData', () => {
    test('cleans and validates good data', () => {
      const input = [
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: '120' }
      ];
      
      const result = cleanAndValidateData(input);
      
      expect(result).toEqual([
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120 }
      ]);
    });

    test('filters out invalid entries', () => {
      const input = [
        { month: '2023-01', demand: 100 },
        null,
        { month: '', demand: 120 },
        { month: '2023-02', demand: 'invalid' },
        { month: '2023-03', demand: 130 }
      ];
      
      const result = cleanAndValidateData(input);
      
      expect(result).toEqual([
        { month: '2023-01', demand: 100 },
        { month: '2023-03', demand: 130 }
      ]);
    });

    test('handles null input', () => {
      expect(cleanAndValidateData(null)).toEqual([]);
    });

    test('handles non-array input', () => {
      expect(cleanAndValidateData('invalid')).toEqual([]);
    });

    test('filters out entries with missing required fields', () => {
      const input = [
        { month: '2023-01' }, // missing demand
        { demand: 100 }, // missing month
        { month: '2023-02', demand: 120 } // valid
      ];
      
      const result = cleanAndValidateData(input);
      
      expect(result).toEqual([
        { month: '2023-02', demand: 120 }
      ]);
    });
  });
});