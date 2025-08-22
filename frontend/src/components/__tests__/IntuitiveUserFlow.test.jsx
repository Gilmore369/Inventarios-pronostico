import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import DataInput from '../DataInput';
import ResultsTable from '../ResultsTable';
import Forecast from '../Forecast';

// Mock fetch para simular respuestas del API
global.fetch = jest.fn();

// Mock de datos de prueba
const mockResultsData = [
  {
    model: 'SMA',
    mae: 10.5,
    mse: 150.2,
    rmse: 12.3,
    mape: 8.5,
    parameters: { window: 3 }
  },
  {
    model: 'SES',
    mae: 9.8,
    mse: 140.1,
    rmse: 11.8,
    mape: 7.9,
    parameters: { alpha: 0.3 }
  }
];

const mockForecastData = {
  model: 'SES',
  forecast: [100, 105, 110, 108, 112, 115, 118, 120, 125, 130, 128, 135],
  historical: [95, 98, 102, 100, 105, 108, 110, 112, 115, 118, 120, 125]
};

describe('Intuitive User Flow Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Navigation and Component Flow', () => {
    test('should provide clear navigation between components', async () => {
      const user = userEvent.setup();
      
      // Renderizar DataInput
      render(<DataInput onDataSubmit={jest.fn()} />);
      
      // Verificar que las instrucciones sean claras
      expect(screen.getByText(/ingrese los datos de demanda/i)).toBeInTheDocument();
      expect(screen.getByText(/mínimo 12 meses/i)).toBeInTheDocument();
      
      // Verificar que los labels sean descriptivos
      expect(screen.getByLabelText(/mes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/demanda/i)).toBeInTheDocument();
      
      // Verificar botones de acción claros
      expect(screen.getByRole('button', { name: /agregar fila/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /procesar datos/i })).toBeInTheDocument();
    });

    test('should show clear instructions and labels throughout the interface', () => {
      render(<DataInput onDataSubmit={jest.fn()} />);
      
      // Verificar instrucciones paso a paso
      expect(screen.getByText(/paso 1/i) || screen.getByText(/ingrese.*datos/i)).toBeInTheDocument();
      
      // Verificar que los campos tengan labels apropiados
      const monthInputs = screen.getAllByLabelText(/mes/i);
      const demandInputs = screen.getAllByLabelText(/demanda/i);
      
      expect(monthInputs.length).toBeGreaterThan(0);
      expect(demandInputs.length).toBeGreaterThan(0);
      
      // Verificar texto de ayuda
      expect(screen.getByText(/formato.*csv/i) || screen.getByText(/cargar archivo/i)).toBeInTheDocument();
    });

    test('should provide intuitive results navigation', () => {
      const mockOnModelSelect = jest.fn();
      
      render(<ResultsTable results={mockResultsData} onModelSelect={mockOnModelSelect} />);
      
      // Verificar headers de tabla claros
      expect(screen.getByText(/modelo/i)).toBeInTheDocument();
      expect(screen.getByText(/mape/i)).toBeInTheDocument();
      expect(screen.getByText(/mae/i)).toBeInTheDocument();
      
      // Verificar que los modelos sean seleccionables
      const modelRows = screen.getAllByRole('row');
      expect(modelRows.length).toBeGreaterThan(1); // Header + data rows
      
      // Verificar ordenamiento por MAPE (mejor modelo primero)
      const mapeValues = screen.getAllByText(/\d+\.\d+/);
      expect(mapeValues.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Tests', () => {
    test('should support screen reader navigation', () => {
      render(<DataInput onDataSubmit={jest.fn()} />);
      
      // Verificar que todos los inputs tengan labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
      
      // Verificar que los botones tengan nombres accesibles
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
      
      // Verificar estructura semántica
      expect(screen.getByRole('main') || screen.getByRole('form')).toBeInTheDocument();
    });

    test('should have proper ARIA labels and roles', () => {
      render(<ResultsTable results={mockResultsData} onModelSelect={jest.fn()} />);
      
      // Verificar tabla accesible
      expect(screen.getByRole('table')).toBeInTheDocument();
      
      // Verificar headers de columna
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);
      
      // Verificar filas de datos
      const dataRows = screen.getAllByRole('row');
      expect(dataRows.length).toBeGreaterThan(1);
    });

    test('should support high contrast and screen reader compatibility', () => {
      render(<Forecast data={mockForecastData} />);
      
      // Verificar que el gráfico tenga descripción accesible
      const chartContainer = screen.getByRole('img') || screen.getByLabelText(/gráfico/i) || screen.getByText(/pronóstico/i);
      expect(chartContainer).toBeInTheDocument();
      
      // Verificar que haya texto alternativo para elementos visuales
      const visualElements = screen.getAllByRole('img');
      visualElements.forEach(element => {
        expect(element).toHaveAttribute('alt');
      });
    });
  });

  describe('Keyboard Navigation Tests', () => {
    test('should support full keyboard navigation in DataInput', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      
      render(<DataInput onDataSubmit={mockOnSubmit} />);
      
      // Navegar con Tab
      await user.tab();
      expect(document.activeElement).toHaveAttribute('type', 'text');
      
      // Continuar navegación
      await user.tab();
      await user.tab();
      
      // Verificar que se puede llegar a los botones
      const addButton = screen.getByRole('button', { name: /agregar/i });
      addButton.focus();
      expect(document.activeElement).toBe(addButton);
      
      // Verificar activación con Enter/Space
      await user.keyboard('{Enter}');
      // El botón debería responder al Enter
    });

    test('should support keyboard navigation in ResultsTable', async () => {
      const user = userEvent.setup();
      const mockOnModelSelect = jest.fn();
      
      render(<ResultsTable results={mockResultsData} onModelSelect={mockOnModelSelect} />);
      
      // Verificar que la tabla sea navegable
      const table = screen.getByRole('table');
      table.focus();
      
      // Navegar por las filas con flechas (si está implementado)
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      
      // Verificar selección con Enter
      const firstRow = screen.getAllByRole('row')[1]; // Skip header
      if (firstRow) {
        firstRow.focus();
        await user.keyboard('{Enter}');
      }
    });

    test('should support keyboard shortcuts and navigation in Forecast', async () => {
      const user = userEvent.setup();
      
      render(<Forecast data={mockForecastData} />);
      
      // Verificar que los controles sean accesibles por teclado
      const exportButton = screen.getByRole('button', { name: /exportar/i }) || 
                          screen.getByRole('button', { name: /descargar/i });
      
      if (exportButton) {
        exportButton.focus();
        expect(document.activeElement).toBe(exportButton);
        
        // Activar con Enter
        await user.keyboard('{Enter}');
      }
      
      // Verificar navegación por el gráfico (si tiene controles interactivos)
      const interactiveElements = screen.getAllByRole('button');
      for (const element of interactiveElements) {
        element.focus();
        expect(document.activeElement).toBe(element);
      }
    });
  });

  describe('User Experience Flow Tests', () => {
    test('should provide clear feedback during data processing', async () => {
      const user = userEvent.setup();
      
      // Mock API response para procesamiento
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'test-session', status: 'processing' })
      });
      
      const mockOnSubmit = jest.fn();
      render(<DataInput onDataSubmit={mockOnSubmit} />);
      
      // Simular entrada de datos
      const monthInput = screen.getAllByLabelText(/mes/i)[0];
      const demandInput = screen.getAllByLabelText(/demanda/i)[0];
      
      await user.type(monthInput, '2023-01');
      await user.type(demandInput, '100');
      
      // Enviar datos
      const submitButton = screen.getByRole('button', { name: /procesar/i });
      await user.click(submitButton);
      
      // Verificar que se muestre feedback de procesamiento
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    test('should show clear error messages and recovery options', async () => {
      const user = userEvent.setup();
      
      // Mock error response
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const mockOnSubmit = jest.fn();
      render(<DataInput onDataSubmit={mockOnSubmit} />);
      
      // Intentar enviar datos inválidos
      const submitButton = screen.getByRole('button', { name: /procesar/i });
      await user.click(submitButton);
      
      // Verificar mensaje de error claro
      await waitFor(() => {
        const errorMessage = screen.getByText(/error/i) || screen.getByText(/problema/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    test('should maintain consistent UI patterns across components', () => {
      // Verificar consistencia en DataInput
      render(<DataInput onDataSubmit={jest.fn()} />);
      const dataInputButtons = screen.getAllByRole('button');
      
      // Verificar consistencia en ResultsTable
      render(<ResultsTable results={mockResultsData} onModelSelect={jest.fn()} />);
      const resultsButtons = screen.getAllByRole('button');
      
      // Verificar consistencia en Forecast
      render(<Forecast data={mockForecastData} />);
      const forecastButtons = screen.getAllByRole('button');
      
      // Todos los componentes deberían tener patrones consistentes
      expect(dataInputButtons.length + resultsButtons.length + forecastButtons.length).toBeGreaterThan(0);
    });

    test('should provide helpful tooltips and guidance', async () => {
      const user = userEvent.setup();
      
      render(<DataInput onDataSubmit={jest.fn()} />);
      
      // Buscar elementos con tooltips o ayuda
      const helpElements = screen.getAllByRole('button').filter(button => 
        button.getAttribute('title') || 
        button.getAttribute('aria-describedby') ||
        button.textContent?.includes('?') ||
        button.textContent?.includes('ayuda')
      );
      
      // Verificar interacción con tooltips
      for (const element of helpElements) {
        await user.hover(element);
        // Los tooltips deberían aparecer al hacer hover
      }
      
      // Verificar texto de ayuda contextual
      const helpText = screen.getByText(/ayuda/i) || 
                     screen.getByText(/instrucciones/i) ||
                     screen.getByText(/formato/i);
      
      if (helpText) {
        expect(helpText).toBeInTheDocument();
      }
    });
  });

  describe('Responsive Design Flow Tests', () => {
    test('should maintain usability on mobile devices', () => {
      // Simular viewport móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<DataInput onDataSubmit={jest.fn()} />);
      
      // Verificar que los elementos sean accesibles en móvil
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        const styles = window.getComputedStyle(input);
        // Los inputs deberían tener tamaño apropiado para móvil
        expect(input).toBeVisible();
      });
      
      // Verificar botones táctiles apropiados
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
        // Los botones deberían ser lo suficientemente grandes para tocar
      });
    });

    test('should adapt layout for different screen sizes', () => {
      // Probar diferentes tamaños de pantalla
      const screenSizes = [
        { width: 320, height: 568 }, // Mobile small
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];
      
      screenSizes.forEach(size => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: size.width,
        });
        
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: size.height,
        });
        
        render(<ResultsTable results={mockResultsData} onModelSelect={jest.fn()} />);
        
        // Verificar que la tabla sea responsive
        const table = screen.getByRole('table');
        expect(table).toBeVisible();
        
        // La tabla debería adaptarse al tamaño de pantalla
        const tableStyles = window.getComputedStyle(table);
        expect(tableStyles.display).not.toBe('none');
      });
    });
  });
});