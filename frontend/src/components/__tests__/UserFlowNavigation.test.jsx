import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
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

describe('User Flow and Navigation Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('Intuitive Navigation Between Components', () => {
    test('should provide clear navigation flow from data input to results', async () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Verificar que el flujo es claro desde el inicio
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
      expect(screen.getByText('Procesar Modelos')).toBeInTheDocument();

      // Simular carga exitosa de datos
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ session_id: 'test-session' })
      });

      // Agregar datos suficientes
      const addRowButton = screen.getByText('Agregar Fila');
      for (let i = 0; i < 12; i++) {
        fireEvent.click(addRowButton);
      }

      const submitButton = screen.getByText('Procesar Modelos');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnDataUpload).toHaveBeenCalledWith('test-session');
      });
    });

    test('should show clear progression from results to forecast generation', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
          parameters: { window: 3 }
        }
      ];

      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);

      // Verificar elementos de navegación claros
      expect(screen.getByText('Resultados de Modelos de Pronóstico')).toBeInTheDocument();
      expect(screen.getByText('Seleccionar')).toBeInTheDocument();

      // Simular selección de modelo
      const selectButton = screen.getByText('Seleccionar');
      fireEvent.click(selectButton);

      expect(mockOnModelSelect).toHaveBeenCalledWith('SMA');
    });

    test('should provide clear model selection interface in forecast component', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 }
        },
        {
          name: 'SES',
          metrics: { mape: 18.2, rmse: 12.1, mae: 9.5 }
        }
      ];

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Verificar interfaz clara de selección
      expect(screen.getByText('Generar Pronóstico')).toBeInTheDocument();
      expect(screen.getByText('Seleccionar Modelo')).toBeInTheDocument();
      expect(screen.getByLabelText('Modelo de Pronóstico')).toBeInTheDocument();
    });
  });

  describe('Clear Instructions and Labels', () => {
    test('should have descriptive and clear labels in DataInput', () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Verificar labels descriptivos
      expect(screen.getByText('Entrada Manual')).toBeInTheDocument();
      expect(screen.getByText('Cargar CSV')).toBeInTheDocument();
      expect(screen.getByText('Mes')).toBeInTheDocument();
      expect(screen.getByText('Demanda')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    test('should provide clear column headers in ResultsTable', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
          parameters: { window: 3 }
        }
      ];

      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);

      // Verificar headers claros
      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Modelo')).toBeInTheDocument();
      expect(screen.getByText('MAPE (%)')).toBeInTheDocument();
      expect(screen.getByText('RMSE')).toBeInTheDocument();
      expect(screen.getByText('MAE')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    test('should have clear form labels in Forecast component', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 }
        }
      ];

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Verificar labels de formulario claros
      expect(screen.getByLabelText('Modelo de Pronóstico')).toBeInTheDocument();
      expect(screen.getByLabelText('Meses a pronosticar')).toBeInTheDocument();
    });

    test('should provide helpful descriptions and context', () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Verificar descripciones útiles
      expect(screen.getByText(/Cargue los datos históricos de demanda/)).toBeInTheDocument();
      expect(screen.getByText(/mínimo 12 meses, máximo 120 meses/)).toBeInTheDocument();
      expect(screen.getByText(/analizar múltiples modelos de pronóstico/)).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation Accessibility', () => {
    test('should support keyboard navigation in DataInput form', async () => {
      const user = userEvent.setup();
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Verificar que los botones son accesibles por teclado
      const manualButton = screen.getByText('Entrada Manual');
      const csvButton = screen.getByText('Cargar CSV');

      await user.tab();
      expect(manualButton).toHaveFocus();

      await user.tab();
      expect(csvButton).toHaveFocus();

      // Verificar navegación con Enter
      await user.keyboard('{Enter}');
      expect(csvButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should support keyboard navigation in ResultsTable', async () => {
      const user = userEvent.setup();
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
          parameters: { window: 3 }
        }
      ];

      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);

      const selectButton = screen.getByText('Seleccionar');
      
      // Navegar con Tab hasta el botón
      await user.tab();
      expect(selectButton).toHaveFocus();

      // Activar con Enter
      await user.keyboard('{Enter}');
      expect(mockOnModelSelect).toHaveBeenCalledWith('SMA');
    });

    test('should support keyboard navigation in Forecast form', async () => {
      const user = userEvent.setup();
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 }
        }
      ];

      render(<Forecast sessionId="test-session" results={mockResults} />);

      const modelSelect = screen.getByLabelText('Modelo de Pronóstico');
      const periodsInput = screen.getByLabelText('Meses a pronosticar');
      const generateButton = screen.getByText('Generar Pronóstico');

      // Navegar entre elementos del formulario
      await user.tab();
      expect(modelSelect).toHaveFocus();

      await user.tab();
      expect(periodsInput).toHaveFocus();

      await user.tab();
      expect(generateButton).toHaveFocus();
    });
  });

  describe('Screen Reader Accessibility', () => {
    test('should have proper ARIA labels and roles in DataInput', () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Verificar elementos accesibles para lectores de pantalla
      const table = screen.getByRole('grid');
      expect(table).toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Verificar que los botones tienen texto descriptivo
      expect(screen.getByText('Entrada Manual')).toBeInTheDocument();
      expect(screen.getByText('Cargar CSV')).toBeInTheDocument();
      expect(screen.getByText('Procesar Modelos')).toBeInTheDocument();
    });

    test('should have proper table structure for screen readers in ResultsTable', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
          parameters: { window: 3 }
        }
      ];

      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);

      // Verificar estructura de tabla accesible
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBe(6); // #, Modelo, MAPE, RMSE, MAE, Acciones

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(2); // Header + 1 data row
    });

    test('should have proper form labels for screen readers in Forecast', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 }
        }
      ];

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Verificar labels asociados correctamente
      const modelSelect = screen.getByLabelText('Modelo de Pronóstico');
      expect(modelSelect).toBeInTheDocument();

      const periodsInput = screen.getByLabelText('Meses a pronosticar');
      expect(periodsInput).toBeInTheDocument();
    });

    test('should provide meaningful text alternatives for visual elements', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
          parameters: { window: 3 }
        }
      ];

      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);

      // Verificar que los chips tienen texto descriptivo
      expect(screen.getByText('15.5%')).toBeInTheDocument();
      expect(screen.getByText('10.2')).toBeInTheDocument();
      expect(screen.getByText('8.1')).toBeInTheDocument();
    });
  });

  describe('Intuitive User Interface Flow', () => {
    test('should guide user through logical data entry process', () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Verificar flujo lógico: instrucciones -> método -> datos -> procesamiento
      expect(screen.getByText(/Cargue los datos históricos/)).toBeInTheDocument();
      expect(screen.getByText('Entrada Manual')).toBeInTheDocument();
      expect(screen.getByText('Cargar CSV')).toBeInTheDocument();
      expect(screen.getByText('Procesar Modelos')).toBeInTheDocument();
    });

    test('should show progressive disclosure of information in ResultsTable', () => {
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

      // Verificar información progresiva: resumen -> detalles -> recomendación
      expect(screen.getByText('Se han evaluado 2 modelos.')).toBeInTheDocument();
      expect(screen.getByText('Recomendación')).toBeInTheDocument();
      expect(screen.getByText(/Se recomienda utilizar este modelo/)).toBeInTheDocument();
    });

    test('should provide clear workflow in Forecast component', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 }
        }
      ];

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Verificar flujo: selección -> configuración -> generación -> visualización
      expect(screen.getByText('Seleccionar Modelo')).toBeInTheDocument();
      expect(screen.getByLabelText('Meses a pronosticar')).toBeInTheDocument();
      expect(screen.getByText('Generar Pronóstico')).toBeInTheDocument();
    });
  });

  describe('Contextual Help and Guidance', () => {
    test('should provide contextual information about data requirements', () => {
      const mockOnDataUpload = jest.fn();
      render(<DataInput onDataUpload={mockOnDataUpload} />);

      // Cambiar a modo CSV para ver ayuda contextual
      const csvButton = screen.getByText('Cargar CSV');
      fireEvent.click(csvButton);

      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
    });

    test('should show model performance context in ResultsTable', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
          parameters: { window: 3 }
        }
      ];

      const mockOnModelSelect = jest.fn();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);

      // Verificar contexto de rendimiento
      expect(screen.getByText(/ordenados de mejor a peor según el error porcentual/)).toBeInTheDocument();
      expect(screen.getByText('Parámetros: {"window":3}')).toBeInTheDocument();
    });

    test('should provide forecast configuration guidance', () => {
      const mockResults = [
        {
          name: 'SMA',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 }
        }
      ];

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Verificar guía de configuración
      const periodsInput = screen.getByLabelText('Meses a pronosticar');
      expect(periodsInput).toHaveAttribute('min', '1');
      expect(periodsInput).toHaveAttribute('max', '36');
    });
  });
});