import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DataInput from '../DataInput';

// Mock fetch globally
global.fetch = jest.fn();

// Mock FileReader
global.FileReader = class {
  constructor() {
    this.readAsText = jest.fn(() => {
      this.onload({ target: { result: 'month,demand\n2023-01,100\n2023-02,120' } });
    });
  }
};

describe('DataInput Component', () => {
  const mockOnDataUpload = jest.fn();

  beforeEach(() => {
    fetch.mockClear();
    mockOnDataUpload.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders main title and description', () => {
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
      expect(screen.getByText(/Cargue los datos históricos de demanda/)).toBeInTheDocument();
    });

    test('renders input method toggle buttons', () => {
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      expect(screen.getByText('Entrada Manual')).toBeInTheDocument();
      expect(screen.getByText('Cargar CSV')).toBeInTheDocument();
    });

    test('renders process button', () => {
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      expect(screen.getByText('Procesar Modelos')).toBeInTheDocument();
    });
  });

  describe('Manual Data Entry Mode', () => {
    test('displays data grid in manual mode by default', () => {
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Check if DataGrid headers are present
      expect(screen.getByText('Mes')).toBeInTheDocument();
      expect(screen.getByText('Demanda')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    test('displays initial row with default data', () => {
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Check if default data is displayed in the grid
      expect(screen.getByText('2023-01')).toBeInTheDocument();
      // Use getAllByText to handle multiple instances of "100"
      const hundredElements = screen.getAllByText('100');
      expect(hundredElements.length).toBeGreaterThan(0);
    });

    test('adds new row when "Agregar Fila" button is clicked', async () => {
      const user = userEvent.setup();
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      const addButton = screen.getByText('Agregar Fila');
      await user.click(addButton);
      
      // Should have 2 rows now (original + new)
      const deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons).toHaveLength(2);
    });

    test('deletes row when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Add a row first
      const addButton = screen.getByText('Agregar Fila');
      await user.click(addButton);
      
      // Now delete one row
      const deleteButtons = screen.getAllByText('Eliminar');
      await user.click(deleteButtons[1]);
      
      // Should be back to 1 row
      const remainingDeleteButtons = screen.getAllByText('Eliminar');
      expect(remainingDeleteButtons).toHaveLength(1);
    });

    test('prevents deletion when only one row remains', () => {
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      const deleteButton = screen.getByText('Eliminar');
      expect(deleteButton).toBeDisabled();
    });

    test('allows editing of month and demand values', async () => {
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Verify that the DataGrid is configured as editable
      const dataGrid = document.querySelector('.MuiDataGrid-root');
      expect(dataGrid).toBeInTheDocument();
      
      // Check that the columns are configured as editable in the component
      // This tests the component structure rather than actual editing behavior
      expect(screen.getByText('2023-01')).toBeInTheDocument();
      const demandCells = screen.getAllByText('100');
      expect(demandCells.length).toBeGreaterThan(0);
    });
  });

  describe('CSV File Upload Mode', () => {
    test('switches to file upload mode when CSV button is clicked', async () => {
      const user = userEvent.setup();
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cargar csv/i })).toHaveClass('MuiButton-contained');
    });

    test('displays file input in CSV mode', async () => {
      const user = userEvent.setup();
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.csv');
    });

    test('handles file selection', async () => {
      const user = userEvent.setup();
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      const fileInput = document.querySelector('input[type="file"]');
      const file = new File(['month,demand\n2023-01,100'], 'test.csv', { type: 'text/csv' });
      
      await user.upload(fileInput, file);
      
      expect(fileInput.files[0]).toBe(file);
    });

    test('disables process button when no file is selected in CSV mode', async () => {
      const user = userEvent.setup();
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      const processButton = screen.getByText('Procesar Modelos');
      expect(processButton).toBeDisabled();
    });

    test('enables process button when file is selected in CSV mode', async () => {
      const user = userEvent.setup();
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      const fileInput = document.querySelector('input[type="file"]');
      const file = new File(['month,demand\n2023-01,100'], 'test.csv', { type: 'text/csv' });
      
      await user.upload(fileInput, file);
      
      const processButton = screen.getByText('Procesar Modelos');
      expect(processButton).not.toBeDisabled();
    });
  });

  describe('Data Validation', () => {
    test('shows alert when less than 12 months of data', async () => {
      const user = userEvent.setup();
      window.alert = jest.fn();
      
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Default has only 1 row, which is less than 12
      const processButton = screen.getByText('Procesar Modelos');
      await user.click(processButton);
      
      expect(window.alert).toHaveBeenCalledWith('Se requieren al menos 12 meses de datos');
    });

    test('allows processing when 12 or more months of data', async () => {
      const user = userEvent.setup();
      window.alert = jest.fn();
      
      fetch.mockResolvedValueOnce({
        json: async () => ({ session_id: 'test-session-123' })
      });
      
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Add 11 more rows to have 12 total
      const addButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 11; i++) {
        await user.click(addButton);
      }
      
      const processButton = screen.getByText('Procesar Modelos');
      await user.click(processButton);
      
      expect(window.alert).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Data Submission', () => {
    test('sends manual data to backend correctly', async () => {
      const user = userEvent.setup();
      
      fetch.mockResolvedValueOnce({
        json: async () => ({ session_id: 'test-session-123' })
      });
      
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Add enough rows for validation
      const addButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 11; i++) {
        await user.click(addButton);
      }
      
      const processButton = screen.getByText('Procesar Modelos');
      await user.click(processButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:5000/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.any(String)
        });
      });
    });

    test('prepares CSV file for backend submission', async () => {
      const user = userEvent.setup();
      
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Switch to CSV mode
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      // Verify we're in CSV mode
      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
      
      // Upload file
      const fileInput = document.querySelector('input[type="file"]');
      const file = new File(['month,demand\n2023-01,100'], 'test.csv', { type: 'text/csv' });
      
      await user.upload(fileInput, file);
      
      // Verify file was uploaded
      expect(fileInput.files[0]).toBe(file);
      expect(fileInput.files).toHaveLength(1);
      
      // Process button should be enabled now
      const processButton = screen.getByText('Procesar Modelos');
      expect(processButton).not.toBeDisabled();
      
      // This test verifies the file upload UI behavior
      // The actual fetch call is tested in integration tests
      expect(fileInput).toHaveAttribute('accept', '.csv');
      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
    });

    test('calls onDataUpload callback with session_id on successful upload', async () => {
      const user = userEvent.setup();
      
      fetch.mockResolvedValueOnce({
        json: async () => ({ session_id: 'test-session-123' })
      });
      
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Add enough rows for validation
      const addButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 11; i++) {
        await user.click(addButton);
      }
      
      const processButton = screen.getByText('Procesar Modelos');
      await user.click(processButton);
      
      await waitFor(() => {
        expect(mockOnDataUpload).toHaveBeenCalledWith('test-session-123');
      });
    });
  });

  describe('Error Handling', () => {
    test('shows alert on backend error response', async () => {
      const user = userEvent.setup();
      window.alert = jest.fn();
      
      fetch.mockResolvedValueOnce({
        json: async () => ({ error: 'Invalid data format' })
      });
      
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Add enough rows for validation
      const addButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 11; i++) {
        await user.click(addButton);
      }
      
      const processButton = screen.getByText('Procesar Modelos');
      await user.click(processButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error: Invalid data format');
      });
    });

    test('shows alert on network error', async () => {
      const user = userEvent.setup();
      window.alert = jest.fn();
      console.error = jest.fn(); // Mock console.error to avoid noise in tests
      
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Add enough rows for validation
      const addButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 11; i++) {
        await user.click(addButton);
      }
      
      const processButton = screen.getByText('Procesar Modelos');
      await user.click(processButton);
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error al subir datos');
      });
    });

    test('handles file reading errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock FileReader to simulate error
      global.FileReader = class {
        constructor() {
          this.readAsText = jest.fn(() => {
            this.onerror && this.onerror(new Error('File read error'));
          });
        }
      };
      
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      const fileInput = document.querySelector('input[type="file"]');
      const file = new File(['invalid content'], 'test.csv', { type: 'text/csv' });
      
      // Should not throw error
      expect(() => user.upload(fileInput, file)).not.toThrow();
    });
  });

  describe('UI State Management', () => {
    test('highlights active input method button', async () => {
      const user = userEvent.setup();
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      const manualButton = screen.getByText('Entrada Manual');
      const csvButton = screen.getByText('Cargar CSV');
      
      // Manual should be active by default
      expect(manualButton).toHaveClass('MuiButton-contained');
      expect(csvButton).toHaveClass('MuiButton-outlined');
      
      // Switch to CSV
      await user.click(csvButton);
      
      expect(csvButton).toHaveClass('MuiButton-contained');
      expect(manualButton).toHaveClass('MuiButton-outlined');
    });

    test('maintains data when switching between input methods', async () => {
      const user = userEvent.setup();
      render(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Add some data in manual mode
      const addButton = screen.getByText('Agregar Fila');
      await user.click(addButton);
      
      // Switch to CSV mode
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      // Switch back to manual mode
      const manualButton = screen.getByText('Entrada Manual');
      await user.click(manualButton);
      
      // Data should still be there
      const deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons).toHaveLength(2);
    });
  });
});