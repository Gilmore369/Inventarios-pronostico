import { renderHook, act } from '@testing-library/react';
import { useFileReader } from '../useFileReader';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Mock dependencies
jest.mock('papaparse');
jest.mock('xlsx');

describe('useFileReader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock FileReader
    global.FileReader = jest.fn().mockImplementation(() => ({
      readAsArrayBuffer: jest.fn(),
      onload: null,
      onerror: null
    }));
  });

  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useFileReader());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('processFile', () => {
    test('processes CSV files correctly', async () => {
      const mockData = [
        { mes: '2023-01', demanda: 100 },
        { mes: '2023-02', demanda: 120 }
      ];

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: mockData,
            meta: { fields: ['mes', 'demanda'] },
            errors: []
          });
        }, 10);
      });

      const { result } = renderHook(() => useFileReader());
      
      const csvFile = new File(['month,demand\n2023-01,100'], 'test.csv', { type: 'text/csv' });

      let processResult;
      await act(async () => {
        processResult = await result.current.processFile(csvFile);
      });

      expect(processResult.data).toEqual([
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120 }
      ]);
      expect(processResult.metadata.columnFound).toBe('demanda');
      expect(result.current.loading).toBe(false);
    });

    test('processes Excel files correctly', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };

      const mockJsonData = [
        ['mes', 'demanda'],
        ['2023-01', 100],
        ['2023-02', 120]
      ];

      XLSX.read.mockReturnValue(mockWorkbook);
      XLSX.utils.sheet_to_json.mockReturnValue(mockJsonData);

      const { result } = renderHook(() => useFileReader());
      
      const excelFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Mock FileReader behavior
      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      let processResult;
      await act(async () => {
        const processPromise = result.current.processFile(excelFile);
        
        // Simulate successful file read
        setTimeout(() => {
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });
          }
        }, 10);
        
        processResult = await processPromise;
      });

      expect(processResult.data).toEqual([
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120 }
      ]);
      expect(processResult.metadata.columnFound).toBe('demanda');
    });

    test('throws error for unsupported file types', async () => {
      const { result } = renderHook(() => useFileReader());
      
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      await act(async () => {
        await expect(result.current.processFile(txtFile)).rejects.toThrow('Tipo de archivo no soportado');
      });

      expect(result.current.error).toBe('Tipo de archivo no soportado');
    });

    test('finds demanda column case-insensitively', async () => {
      const mockData = [
        { mes: '2023-01', DEMANDA: 100 }
      ];

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: mockData,
            meta: { fields: ['mes', 'DEMANDA'] },
            errors: []
          });
        }, 10);
      });

      const { result } = renderHook(() => useFileReader());
      
      const csvFile = new File(['content'], 'test.csv', { type: 'text/csv' });

      let processResult;
      await act(async () => {
        processResult = await result.current.processFile(csvFile);
      });

      expect(processResult.metadata.columnFound).toBe('DEMANDA');
    });

    test('throws error when demanda column is not found', async () => {
      const mockData = [
        { mes: '2023-01', ventas: 100 }
      ];

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: mockData,
            meta: { fields: ['mes', 'ventas'] },
            errors: []
          });
        }, 10);
      });

      const { result } = renderHook(() => useFileReader());
      
      const csvFile = new File(['content'], 'test.csv', { type: 'text/csv' });

      await act(async () => {
        await expect(result.current.processFile(csvFile)).rejects.toThrow(
          'No se encontró una columna llamada "demanda" en el archivo CSV'
        );
      });
    });

    test('validates numeric demand values', async () => {
      const mockData = [
        { mes: '2023-01', demanda: 100 },
        { mes: '2023-02', demanda: 'invalid' },
        { mes: '2023-03', demanda: 120 }
      ];

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: mockData,
            meta: { fields: ['mes', 'demanda'] },
            errors: []
          });
        }, 10);
      });

      const { result } = renderHook(() => useFileReader());
      
      const csvFile = new File(['content'], 'test.csv', { type: 'text/csv' });

      let processResult;
      await act(async () => {
        processResult = await result.current.processFile(csvFile);
      });

      expect(processResult.data).toHaveLength(2); // Only valid rows
      expect(processResult.errors).toHaveLength(1);
      expect(processResult.errors[0]).toEqual({
        row: 2,
        field: 'demanda',
        message: 'Valor de demanda no es numérico',
        severity: 'error'
      });
    });

    test('warns about negative demand values', async () => {
      const mockData = [
        { mes: '2023-01', demanda: -10 }
      ];

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: mockData,
            meta: { fields: ['mes', 'demanda'] },
            errors: []
          });
        }, 10);
      });

      const { result } = renderHook(() => useFileReader());
      
      const csvFile = new File(['content'], 'test.csv', { type: 'text/csv' });

      let processResult;
      await act(async () => {
        processResult = await result.current.processFile(csvFile);
      });

      expect(processResult.data).toHaveLength(1);
      expect(processResult.errors).toHaveLength(1);
      expect(processResult.errors[0]).toEqual({
        row: 1,
        field: 'demanda',
        message: 'Valor de demanda no puede ser negativo',
        severity: 'warning'
      });
    });

    test('skips empty rows', async () => {
      const mockData = [
        { mes: '2023-01', demanda: 100 },
        {}, // Empty row
        { mes: '2023-02', demanda: 120 }
      ];

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: mockData,
            meta: { fields: ['mes', 'demanda'] },
            errors: []
          });
        }, 10);
      });

      const { result } = renderHook(() => useFileReader());
      
      const csvFile = new File(['content'], 'test.csv', { type: 'text/csv' });

      let processResult;
      await act(async () => {
        processResult = await result.current.processFile(csvFile);
      });

      expect(processResult.data).toHaveLength(2);
      expect(processResult.metadata.totalRows).toBe(2);
    });

    test('generates sequential months when no month column found', async () => {
      const mockData = [
        { demanda: 100 },
        { demanda: 120 }
      ];

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: mockData,
            meta: { fields: ['demanda'] },
            errors: []
          });
        }, 10);
      });

      const { result } = renderHook(() => useFileReader());
      
      const csvFile = new File(['content'], 'test.csv', { type: 'text/csv' });

      let processResult;
      await act(async () => {
        processResult = await result.current.processFile(csvFile);
      });

      expect(processResult.data).toHaveLength(2);
      expect(processResult.data[0].month).toMatch(/^\d{4}-\d{2}$/);
      expect(processResult.data[1].month).toMatch(/^\d{4}-\d{2}$/);
    });

    test('calculates date range correctly', async () => {
      const mockData = [
        { mes: '2023-03', demanda: 100 },
        { mes: '2023-01', demanda: 120 },
        { mes: '2023-02', demanda: 110 }
      ];

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: mockData,
            meta: { fields: ['mes', 'demanda'] },
            errors: []
          });
        }, 10);
      });

      const { result } = renderHook(() => useFileReader());
      
      const csvFile = new File(['content'], 'test.csv', { type: 'text/csv' });

      let processResult;
      await act(async () => {
        processResult = await result.current.processFile(csvFile);
      });

      expect(processResult.metadata.dateRange).toEqual({
        start: '2023-03',
        end: '2023-02'
      });
    });
  });

  describe('Excel file processing', () => {
    test('handles Excel files with insufficient data', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };

      XLSX.read.mockReturnValue(mockWorkbook);
      XLSX.utils.sheet_to_json.mockReturnValue([['header']]);

      const { result } = renderHook(() => useFileReader());
      
      const excelFile = new File([''], 'test.xlsx');

      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      await act(async () => {
        const processPromise = result.current.processFile(excelFile);
        
        setTimeout(() => {
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });
          }
        }, 10);
        
        await expect(processPromise).rejects.toThrow(
          'El archivo Excel debe contener al menos una fila de encabezados y una fila de datos'
        );
      });
    });

    test('handles FileReader errors', async () => {
      const { result } = renderHook(() => useFileReader());
      
      const excelFile = new File([''], 'test.xlsx');

      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      await act(async () => {
        const processPromise = result.current.processFile(excelFile);
        
        setTimeout(() => {
          if (mockFileReader.onerror) {
            mockFileReader.onerror();
          }
        }, 10);
        
        await expect(processPromise).rejects.toThrow('Error al leer el archivo Excel');
      });
    });

    test('handles XLSX processing errors', async () => {
      XLSX.read.mockImplementation(() => {
        throw new Error('Invalid Excel format');
      });

      const { result } = renderHook(() => useFileReader());
      
      const excelFile = new File([''], 'test.xlsx');

      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      await act(async () => {
        const processPromise = result.current.processFile(excelFile);
        
        setTimeout(() => {
          if (mockFileReader.onload) {
            mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });
          }
        }, 10);
        
        await expect(processPromise).rejects.toThrow('Error al procesar archivo Excel: Invalid Excel format');
      });
    });
  });

  describe('clearError', () => {
    test('clears error state', async () => {
      const { result } = renderHook(() => useFileReader());
      
      // First cause an error
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      await act(async () => {
        try {
          await result.current.processFile(txtFile);
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});