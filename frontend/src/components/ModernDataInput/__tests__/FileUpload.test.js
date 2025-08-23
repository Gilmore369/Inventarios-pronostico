import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileUpload from '../FileUpload';

// Mock the useFileReader hook
jest.mock('../hooks/useFileReader', () => ({
  useFileReader: () => ({
    processFile: jest.fn().mockResolvedValue({
      data: [{ month: '2024-01', demand: 100 }],
      errors: [],
      metadata: { totalRows: 1, columnFound: 'demanda' }
    }),
    loading: false,
    error: null,
    clearError: jest.fn()
  })
}));

describe('FileUpload Component', () => {
  const mockOnFileProcessed = jest.fn();
  const mockOnError = jest.fn();
  const mockOnDataProcessed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders drag and drop area', () => {
    render(
      <FileUpload 
        onFileProcessed={mockOnFileProcessed}
        onError={mockOnError}
        onDataProcessed={mockOnDataProcessed}
      />
    );

    expect(screen.getByText('Arrastra y suelta tu archivo aquí')).toBeInTheDocument();
    expect(screen.getByText('Seleccionar Archivo')).toBeInTheDocument();
    expect(screen.getByText('Formatos soportados: CSV, XLS, XLSX')).toBeInTheDocument();
  });

  test('shows file selection button', () => {
    render(
      <FileUpload 
        onFileProcessed={mockOnFileProcessed}
        onError={mockOnError}
        onDataProcessed={mockOnDataProcessed}
      />
    );

    const selectButton = screen.getByText('Seleccionar Archivo');
    expect(selectButton).toBeInTheDocument();
  });

  test('validates file type correctly', async () => {
    render(
      <FileUpload 
        onFileProcessed={mockOnFileProcessed}
        onError={mockOnError}
        onDataProcessed={mockOnDataProcessed}
      />
    );

    // Create a mock file with invalid extension
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]');
    
    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('Tipo de archivo no válido')
      );
    });
  });

  test('accepts valid file types', async () => {
    render(
      <FileUpload 
        onFileProcessed={mockOnFileProcessed}
        onError={mockOnError}
        onDataProcessed={mockOnDataProcessed}
      />
    );

    // Create a mock CSV file
    const validFile = new File(['month,demanda\n2024-01,100'], 'test.csv', { 
      type: 'text/csv' 
    });
    
    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]');
    
    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('Archivo seleccionado:')).toBeInTheDocument();
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
  });
});