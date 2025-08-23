import { 
  processCSVFile, 
  processExcelFile, 
  validateFileType 
} from '../fileProcessors';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Mock dependencies
jest.mock('papaparse');
jest.mock('xlsx');

describe('fileProcessors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFileType', () => {
    test('accepts CSV files by MIME type', () => {
      const file = new File([''], 'test.csv', { type: 'text/csv' });
      expect(validateFileType(file)).toBe(true);
    });

    test('accepts Excel files by MIME type', () => {
      const xlsFile = new File([''], 'test.xls', { type: 'application/vnd.ms-excel' });
      const xlsxFile = new File([''], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      expect(validateFileType(xlsFile)).toBe(true);
      expect(validateFileType(xlsxFile)).toBe(true);
    });

    test('accepts files by extension when MIME type is not set', () => {
      const csvFile = new File([''], 'test.csv', { type: '' });
      const xlsFile = new File([''], 'test.xls', { type: '' });
      const xlsxFile = new File([''], 'test.xlsx', { type: '' });
      
      expect(validateFileType(csvFile)).toBe(true);
      expect(validateFileType(xlsFile)).toBe(true);
      expect(validateFileType(xlsxFile)).toBe(true);
    });

    test('rejects unsupported file types', () => {
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      
      expect(validateFileType(txtFile)).toBe(false);
      expect(validateFileType(pdfFile)).toBe(false);
    });

    test('handles case-insensitive extensions', () => {
      const csvFile = new File([''], 'test.CSV', { type: '' });
      const xlsxFile = new File([''], 'test.XLSX', { type: '' });
      
      expect(validateFileType(csvFile)).toBe(true);
      expect(validateFileType(xlsxFile)).toBe(true);
    });
  });

  describe('processCSVFile', () => {
    const mockFile = new File(['month,demanda\n2023-01,100\n2023-02,120'], 'test.csv');

    test('successfully processes valid CSV with demanda column', async () => {
      const mockData = [
        { month: '2023-01', demanda: '100' },
        { month: '2023-02', demanda: '120' }
      ];
      
      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: { fields: ['month', 'demanda'] }
        });
      });

      const result = await processCSVFile(mockFile);

      expect(result.data).toEqual([
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120 }
      ]);
      expect(result.errors).toEqual([]);
      expect(result.metadata.totalRows).toBe(2);
      expect(result.metadata.columnFound).toBe('demanda');
    });

    test('finds demanda column case-insensitively', async () => {
      const mockData = [
        { mes: '2023-01', DEMANDA: '100' }
      ];
      
      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: { fields: ['mes', 'DEMANDA'] }
        });
      });

      const result = await processCSVFile(mockFile);

      expect(result.metadata.columnFound).toBe('DEMANDA');
      expect(result.data[0].demand).toBe(100);
    });

    test('throws error when demanda column is not found', async () => {
      const mockData = [
        { month: '2023-01', sales: '100' }
      ];
      
      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: { fields: ['month', 'sales'] }
        });
      });

      await expect(processCSVFile(mockFile)).rejects.toThrow(
        'No se encontró una columna llamada "demanda" en el archivo'
      );
    });

    test('handles invalid numeric values', async () => {
      const mockData = [
        { month: '2023-01', demanda: 'invalid' },
        { month: '2023-02', demanda: '120' }
      ];
      
      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: { fields: ['month', 'demanda'] }
        });
      });

      const result = await processCSVFile(mockFile);

      expect(result.data).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'demand',
        message: 'Valor de demanda inválido: "invalid"',
        severity: 'error'
      });
    });

    test('handles missing month values', async () => {
      const mockData = [
        { month: '', demanda: '100' },
        { month: '2023-02', demanda: '120' }
      ];
      
      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: { fields: ['month', 'demanda'] }
        });
      });

      const result = await processCSVFile(mockFile);

      expect(result.data).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        row: 1,
        field: 'month',
        message: 'Valor de mes/fecha faltante',
        severity: 'error'
      });
    });

    test('calculates date range correctly', async () => {
      const mockData = [
        { month: '2023-03', demanda: '100' },
        { month: '2023-01', demanda: '120' },
        { month: '2023-02', demanda: '110' }
      ];
      
      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: { fields: ['month', 'demanda'] }
        });
      });

      const result = await processCSVFile(mockFile);

      expect(result.metadata.dateRange).toEqual({
        start: '2023-01',
        end: '2023-03'
      });
    });

    test('handles Papa Parse errors', async () => {
      Papa.parse.mockImplementation((file, options) => {
        options.error({ message: 'Parse error' });
      });

      await expect(processCSVFile(mockFile)).rejects.toThrow(
        'CSV parsing error: Parse error'
      );
    });

    test('skips empty rows', async () => {
      const mockData = [
        { month: '2023-01', demanda: '100' },
        {},
        { month: '2023-02', demanda: '120' }
      ];
      
      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: mockData,
          meta: { fields: ['month', 'demanda'] }
        });
      });

      const result = await processCSVFile(mockFile);

      expect(result.data).toHaveLength(2);
      expect(result.metadata.totalRows).toBe(2);
    });
  });

  describe('processExcelFile', () => {
    const mockFile = new File([''], 'test.xlsx');

    beforeEach(() => {
      // Mock FileReader
      global.FileReader = jest.fn().mockImplementation(() => ({
        readAsArrayBuffer: jest.fn(),
        onload: null,
        onerror: null
      }));
    });

    test('successfully processes valid Excel file', async () => {
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

      // Mock FileReader behavior
      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      const promise = processExcelFile(mockFile);

      // Simulate successful file read
      mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

      const result = await promise;

      expect(result.data).toEqual([
        { month: '2023-01', demand: 100 },
        { month: '2023-02', demand: 120 }
      ]);
      expect(result.metadata.columnFound).toBe('demanda');
    });

    test('throws error when Excel file is empty', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };

      XLSX.read.mockReturnValue(mockWorkbook);
      XLSX.utils.sheet_to_json.mockReturnValue([]);

      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      const promise = processExcelFile(mockFile);

      // Simulate successful file read
      mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

      await expect(promise).rejects.toThrow('El archivo Excel está vacío');
    });

    test('throws error when demanda column is not found in Excel', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {}
        }
      };

      const mockJsonData = [
        ['mes', 'ventas'],
        ['2023-01', 100]
      ];

      XLSX.read.mockReturnValue(mockWorkbook);
      XLSX.utils.sheet_to_json.mockReturnValue(mockJsonData);

      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      const promise = processExcelFile(mockFile);

      // Simulate successful file read
      mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

      await expect(promise).rejects.toThrow(
        'No se encontró una columna llamada "demanda" en el archivo'
      );
    });

    test('handles FileReader errors', async () => {
      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      const promise = processExcelFile(mockFile);

      // Simulate file read error
      mockFileReader.onerror();

      await expect(promise).rejects.toThrow('Error reading Excel file');
    });

    test('handles XLSX processing errors', async () => {
      XLSX.read.mockImplementation(() => {
        throw new Error('Invalid Excel format');
      });

      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      const promise = processExcelFile(mockFile);

      // Simulate successful file read
      mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

      await expect(promise).rejects.toThrow(
        'Error processing Excel file: Invalid Excel format'
      );
    });
  });
});