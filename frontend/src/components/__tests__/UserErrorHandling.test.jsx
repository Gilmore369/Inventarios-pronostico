import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataInput from '../DataInput';
import ResultsTable from '../ResultsTable';
import Forecast from '../Forecast';

// Mock fetch para simular respuestas del servidor
global.fetch = jest.fn();

// Mock IntersectionObserver para DataGrid
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver para DataGrid
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('User Error Handling Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Mock console.error para evitar logs durante tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('DataInput Error Handling', () => {
    test('should show clear error message for insufficient data', async () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Simular datos insuficientes (menos de 12 meses)
      const submitButton = screen.getByText('Procesar Modelos');
      
      // Mock window.alert
      window.alert = jest.fn();
      
      fireEvent.click(submitButton);
      
      expect(window.alert).toHaveBeenCalledWith('Se requieren al menos 12 meses de datos');
    });

    test('should show actionable error message for server connection failure', async () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Simular error de conexión
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Agregar suficientes datos
      const addRowButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 12; i++) {
        fireEvent.click(addRowButton);
      }

      window.alert = jest.fn();
      
      const submitButton = screen.getByText('Procesar Modelos');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error al subir datos');
      });
    });

    test('should show specific error message from server response', async () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Simular respuesta de error del servidor
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ error: 'Formato de datos inválido' })
      });
      
      // Agregar suficientes datos
      const addRowButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 12; i++) {
        fireEvent.click(addRowButton);
      }

      window.alert = jest.fn();
      
      const submitButton = screen.getByText('Procesar Modelos');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error: Formato de datos inválido');
      });
    });

    test('should provide clear guidance for CSV file format', () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Cambiar a modo de carga de archivo
      const csvButton = screen.getByText('Cargar CSV');
      fireEvent.click(csvButton);

      // Verificar que se muestra la guía de formato
      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
    });

    test('should disable submit button when no file is selected in CSV mode', () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Cambiar a modo de carga de archivo
      const csvButton = screen.getByText('Cargar CSV');
      fireEvent.click(csvButton);

      const submitButton = screen.getByText('Procesar Modelos');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Loading States and Progress Feedback', () => {
    test('should show processing state during model execution', async () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Simular respuesta exitosa pero lenta
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            json: () => Promise.resolve({ session_id: 'test-session' })
          }), 100)
        )
      );

      // Agregar suficientes datos
      const addRowButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 12; i++) {
        fireEvent.click(addRowButton);
      }

      const submitButton = screen.getByText('Procesar Modelos');
      fireEvent.click(submitButton);

      // Durante el procesamiento, el botón debería estar deshabilitado
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(mockOnDataUpload).toHaveBeenCalledWith('test-session');
      });
    });
  });

  describe('Forecast Component Error Handling', () => {
    const mockResults = [
      {
        name: 'SMA',
        metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
        predictions: [100, 105, 110],
        actuals: [98, 107, 108]
      }
    ];

    test('should show loading state during forecast generation', async () => {
      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Simular respuesta lenta del servidor
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            json: () => Promise.resolve({ forecast: [115, 120, 125] })
          }), 100)
        )
      );

      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      // Verificar estado de carga
      expect(screen.getByText('Generando...')).toBeInTheDocument();
      expect(generateButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Generar Pronóstico')).toBeInTheDocument();
      });
    });

    test('should handle forecast generation errors gracefully', async () => {
      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Simular error en la generación de pronóstico
      fetch.mockRejectedValueOnce(new Error('Forecast generation failed'));

      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        // El botón debería volver a estar habilitado después del error
        expect(generateButton).not.toBeDisabled();
        expect(screen.getByText('Generar Pronóstico')).toBeInTheDocument();
      });
    });
  });

  describe('ResultsTable Error States', () => {
    test('should handle empty results gracefully', () => {
      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={[]} onModelSelect={mockOnModelSelect} />);

      expect(screen.getByText(/Se han evaluado 0 modelos/)).toBeInTheDocument();
    });

    test('should show appropriate message when no models are available', () => {
      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={[]} onModelSelect={mockOnModelSelect} />);

      // Verificar que la tabla se muestra pero sin filas de datos
      expect(screen.getByRole('table')).toBeInTheDocument();
      const tableBody = screen.getByRole('table').querySelector('tbody');
      expect(tableBody.children.length).toBe(0);
    });
  });

  describe('User Guidance and Help Messages', () => {
    test('should provide clear instructions in DataInput component', () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Verificar instrucciones claras
      expect(screen.getByText(/Cargue los datos históricos de demanda/)).toBeInTheDocument();
      expect(screen.getByText(/mínimo 12 meses, máximo 120 meses/)).toBeInTheDocument();
    });

    test('should provide model recommendations in ResultsTable', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
          parameters: { window: 3 }
        },
        {
          name: 'SES',
          metrics: { mape: 18.2, rmse: 12.1, mae: 9.5 },
          parameters: { alpha: 0.3 }
        }
      ];

      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);

      // Verificar recomendación clara
      expect(screen.getByText(/Se recomienda utilizar este modelo/)).toBeInTheDocument();
      expect(screen.getAllByText('SMA')[0]).toBeInTheDocument();
    });

    test('should show helpful parameter information', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
          parameters: { window: 3 }
        }
      ];

      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);

      // Verificar que se muestran los parámetros
      expect(screen.getByText('Parámetros: {"window":3}')).toBeInTheDocument();
    });
  });

  describe('Error Recovery Guidance', () => {
    test('should provide actionable error messages for data validation', () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      window.alert = jest.fn();
      
      const submitButton = screen.getByText('Procesar Modelos');
      fireEvent.click(submitButton);

      // El mensaje de error debe ser específico y accionable
      expect(window.alert).toHaveBeenCalledWith('Se requieren al menos 12 meses de datos');
    });

    test('should maintain form state after errors', async () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Simular error de red
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Agregar datos
      const addRowButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 12; i++) {
        fireEvent.click(addRowButton);
      }

      window.alert = jest.fn();
      
      const submitButton = screen.getByText('Procesar Modelos');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalled();
      });

      // Los datos deberían mantenerse después del error
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(12); // Header + data rows
    });
  });
});