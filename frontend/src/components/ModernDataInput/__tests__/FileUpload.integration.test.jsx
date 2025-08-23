import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FileUpload from '../FileUpload';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Mock dependencies
jest.mock('papaparse');
jest.mock('xlsx');

describe('FileUpload Integration Tests', () => {
  const mockOnFileProcessed = jest.fn();
  const mockOnError = jest.fn();
  const mockOnDataProcessed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    Papa.parse.mockClear();
    XLSX.read.mockClear();
    XLSX.utils.sheet_to_json.mockClear();

    // Mock FileReader
    global.FileReader = jest.fn().mockImplementation(() => ({
      readAsArrayBuffer: jest.fn(),
      onload: null,
      onerror: null
    }));
  });

  describe('Complete File Upload Workflow', () => {
    test('handles complete CSV upload workflow from selection to processing', async () => {
      const user = userEvent.setup();

      // Mock successful CSV parsing
      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: [
              { mes: '2023-01', demanda: 100 },
              { mes: '2023-02', demanda: 120 },
              { mes: '2023-03', demanda: 110 }
            ],
            meta: { fields: ['mes', 'demanda'] },
            errors: []
          });
        }, 100);
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      // Verify initial state
      expect(screen.getByText(/arrastra y suelta/i)).toBeInTheDocument();
      expect(screen.getByText(/seleccionar archivo/i)).toBeInTheDocument();

      // Create and select a CSV file
      const csvFile = new File(
        ['mes,demanda\n2023-01,100\n2023-02,120'], 
        'test.csv', 
        { type: 'text/csv' }
      );

      const fileInput = document.querySelector('input[type="file"]');
      await user.upload(fileInput, csvFile);

      // Should show file selected
      await waitFor(() => {
        expect(screen.getByText(/archivo seleccionado/i)).toBeInTheDocument();
        expect(screen.getByText('test.csv')).toBeInTheDocument();
      });

      // Should show loading state during processing
      expect(screen.getByText(/procesando|loading/i) || 
             document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();

      // Wait for processing to complete
      await waitFor(() => {
        expect(mockOnFileProcessed).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              demand: 100
            })
          ]),
          errors: [],
          metadata: expect.objectContaining({
            columnFound: 'demanda'
          })
        });
      }, { timeout: 5000 });

      // Should not call error callback
      expect(mockOnError).not.toHaveBeenCalled();
    });

    test('handles complete Excel upload workflow', async () => {
      const user = userEvent.setup();

      // Mock Excel processing
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

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      // Create and select an Excel file
      const excelFile = new File([''], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const fileInput = document.querySelector('input[type="file"]');
      await user.upload(fileInput, excelFile);

      // Mock FileReader behavior
      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      // Simulate successful file read
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });
        }
      }, 100);

      // Wait for processing
      await waitFor(() => {
        expect(mockOnFileProcessed).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                month: '2023-01',
                demand: 100
              })
            ])
          })
        );
      }, { timeout: 5000 });
    });
  });

  describe('Drag and Drop Integration', () => {
    test('handles drag and drop file selection', async () => {
      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: [{ mes: '2023-01', demanda: 100 }],
          meta: { fields: ['mes', 'demanda'] },
          errors: []
        });
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const dropZone = screen.getByText(/arrastra y suelta/i).closest('div');

      // Create a file and simulate drag events
      const csvFile = new File(['mes,demanda\n2023-01,100'], 'test.csv', { type: 'text/csv' });

      // Simulate dragenter
      fireEvent.dragEnter(dropZone, {
        dataTransfer: {
          files: [csvFile],
          types: ['Files']
        }
      });

      // Should show drag active state
      expect(dropZone).toHaveClass(/drag.*active/i) || 
      expect(screen.getByText(/suelta.*aquí/i)).toBeInTheDocument();

      // Simulate drop
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [csvFile]
        }
      });

      // Should process the dropped file
      await waitFor(() => {
        expect(mockOnFileProcessed).toHaveBeenCalled();
      });
    });

    test('provides visual feedback during drag operations', async () => {
      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const dropZone = screen.getByText(/arrastra y suelta/i).closest('div');

      // Simulate dragover
      fireEvent.dragOver(dropZone, {
        dataTransfer: {
          types: ['Files']
        }
      });

      // Should show visual feedback
      expect(dropZone).toHaveStyle(/border.*dashed|background.*color/i) ||
      expect(screen.getByText(/suelta.*archivo/i)).toBeInTheDocument();

      // Simulate dragleave
      fireEvent.dragLeave(dropZone);

      // Should return to normal state
      expect(screen.getByText(/arrastra y suelta/i)).toBeInTheDocument();
    });
  });

  describe('File Validation Integration', () => {
    test('validates file types before processing', async () => {
      const user = userEvent.setup();

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      // Try to upload invalid file type
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]');

      await user.upload(fileInput, invalidFile);

      // Should show validation error
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringMatching(/tipo.*archivo.*válido|invalid.*file.*type/i)
        );
      });

      // Should not process the file
      expect(mockOnFileProcessed).not.toHaveBeenCalled();
    });

    test('validates file size limits', async () => {
      const user = userEvent.setup();

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      // Create a large file (>10MB)
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const largeFile = new File([largeContent], 'large.csv', { type: 'text/csv' });

      const fileInput = document.querySelector('input[type="file"]');
      await user.upload(fileInput, largeFile);

      // Should show size validation error
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringMatching(/archivo.*grande|file.*large|tamaño.*máximo/i)
        );
      });
    });

    test('accepts files by extension when MIME type is missing', async () => {
      const user = userEvent.setup();

      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: [{ mes: '2023-01', demanda: 100 }],
          meta: { fields: ['mes', 'demanda'] },
          errors: []
        });
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      // File with correct extension but no MIME type
      const csvFile = new File(['mes,demanda\n2023-01,100'], 'test.csv', { type: '' });
      const fileInput = document.querySelector('input[type="file"]');

      await user.upload(fileInput, csvFile);

      // Should accept and process the file
      await waitFor(() => {
        expect(mockOnFileProcessed).toHaveBeenCalled();
      });

      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    test('handles CSV parsing errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock Papa Parse error
      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.error({ message: 'Parse error: Invalid CSV format' });
        }, 100);
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const csvFile = new File(['invalid,csv,content'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');

      await user.upload(fileInput, csvFile);

      // Should handle the error
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringMatching(/parse error|csv.*error/i)
        );
      });

      expect(mockOnFileProcessed).not.toHaveBeenCalled();
    });

    test('handles missing demanda column error', async () => {
      const user = userEvent.setup();

      // Mock CSV data without demanda column
      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: [{ mes: '2023-01', ventas: 100 }],
            meta: { fields: ['mes', 'ventas'] },
            errors: []
          });
        }, 100);
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const csvFile = new File(['mes,ventas\n2023-01,100'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');

      await user.upload(fileInput, csvFile);

      // Should show error about missing demanda column
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringMatching(/no.*encontró.*demanda|demanda.*column.*not.*found/i)
        );
      });
    });

    test('handles Excel processing errors', async () => {
      const user = userEvent.setup();

      // Mock XLSX error
      XLSX.read.mockImplementation(() => {
        throw new Error('Invalid Excel format');
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const excelFile = new File([''], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const fileInput = document.querySelector('input[type="file"]');

      await user.upload(fileInput, excelFile);

      // Mock FileReader behavior
      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });
        }
      }, 100);

      // Should handle Excel processing error
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringMatching(/excel.*error|invalid.*excel/i)
        );
      });
    });

    test('handles FileReader errors', async () => {
      const user = userEvent.setup();

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const excelFile = new File([''], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const fileInput = document.querySelector('input[type="file"]');

      await user.upload(fileInput, excelFile);

      // Mock FileReader error
      const mockFileReader = new FileReader();
      global.FileReader.mockImplementation(() => mockFileReader);

      setTimeout(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror(new Error('File read error'));
        }
      }, 100);

      // Should handle file read error
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringMatching(/error.*leer|read.*error/i)
        );
      });
    });
  });

  describe('Data Processing Integration', () => {
    test('processes and validates data correctly', async () => {
      const user = userEvent.setup();

      // Mock CSV with mixed valid and invalid data
      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: [
              { mes: '2023-01', demanda: 100 },
              { mes: '2023-02', demanda: 'invalid' },
              { mes: '2023-03', demanda: 120 },
              { mes: '', demanda: 130 }
            ],
            meta: { fields: ['mes', 'demanda'] },
            errors: []
          });
        }, 100);
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const csvFile = new File(['mes,demanda\n2023-01,100'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');

      await user.upload(fileInput, csvFile);

      // Should process valid data and report errors
      await waitFor(() => {
        expect(mockOnFileProcessed).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.arrayContaining([
              expect.objectContaining({
                month: '2023-01',
                demand: 100
              }),
              expect.objectContaining({
                month: '2023-03',
                demand: 120
              })
            ]),
            errors: expect.arrayContaining([
              expect.objectContaining({
                message: expect.stringMatching(/inválido|invalid/i)
              })
            ])
          })
        );
      });
    });

    test('finds demanda column case-insensitively', async () => {
      const user = userEvent.setup();

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: [{ mes: '2023-01', DEMANDA: 100 }],
            meta: { fields: ['mes', 'DEMANDA'] },
            errors: []
          });
        }, 100);
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const csvFile = new File(['mes,DEMANDA\n2023-01,100'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');

      await user.upload(fileInput, csvFile);

      await waitFor(() => {
        expect(mockOnFileProcessed).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              columnFound: 'DEMANDA'
            })
          })
        );
      });
    });
  });

  describe('User Experience Integration', () => {
    test('provides clear feedback throughout the process', async () => {
      const user = userEvent.setup();

      Papa.parse.mockImplementation((file, options) => {
        setTimeout(() => {
          options.complete({
            data: [{ mes: '2023-01', demanda: 100 }],
            meta: { fields: ['mes', 'demanda'] },
            errors: []
          });
        }, 200);
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const csvFile = new File(['mes,demanda\n2023-01,100'], 'test.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]');

      // 1. Initial state
      expect(screen.getByText(/arrastra y suelta/i)).toBeInTheDocument();

      // 2. File selected
      await user.upload(fileInput, csvFile);
      expect(screen.getByText(/archivo seleccionado/i)).toBeInTheDocument();

      // 3. Processing state
      expect(screen.getByText(/procesando|loading/i) || 
             document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();

      // 4. Completion
      await waitFor(() => {
        expect(mockOnFileProcessed).toHaveBeenCalled();
      });
    });

    test('allows file replacement', async () => {
      const user = userEvent.setup();

      Papa.parse.mockImplementation((file, options) => {
        options.complete({
          data: [{ mes: '2023-01', demanda: 100 }],
          meta: { fields: ['mes', 'demanda'] },
          errors: []
        });
      });

      render(
        <FileUpload 
          onFileProcessed={mockOnFileProcessed}
          onError={mockOnError}
          onDataProcessed={mockOnDataProcessed}
        />
      );

      const fileInput = document.querySelector('input[type="file"]');

      // Upload first file
      const firstFile = new File(['mes,demanda\n2023-01,100'], 'first.csv', { type: 'text/csv' });
      await user.upload(fileInput, firstFile);

      await waitFor(() => {
        expect(screen.getByText('first.csv')).toBeInTheDocument();
      });

      // Upload second file
      const secondFile = new File(['mes,demanda\n2023-02,120'], 'second.csv', { type: 'text/csv' });
      await user.upload(fileInput, secondFile);

      await waitFor(() => {
        expect(screen.getByText('second.csv')).toBeInTheDocument();
        expect(screen.queryByText('first.csv')).not.toBeInTheDocument();
      });

      // Should process the new file
      expect(mockOnFileProcessed).toHaveBeenCalledTimes(2);
    });
  });
});