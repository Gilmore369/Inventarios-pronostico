import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Forecast from '../Forecast';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Recharts components - simple approach
jest.mock('recharts', () => ({
  LineChart: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => children,
}));

// Mock URL.createObjectURL and document.createElement for CSV export
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock for CSV download testing
const mockClick = jest.fn();

describe('Forecast Component', () => {
  const mockSessionId = 'test-session-123';
  const mockResults = [
    {
      name: 'SMA',
      metrics: { mape: 15.2, mae: 10.5, mse: 150.3, rmse: 12.3 },
      predictions: [100, 105, 110, 108, 112, 115, 118, 120, 122, 125, 128, 130],
      actuals: [98, 107, 109, 110, 111, 116, 119, 121, 123, 124, 129, 131],
      description: {
        equation: 'SMA(n) = (X₁ + X₂ + ... + Xₙ) / n',
        description: 'Promedio móvil simple que suaviza fluctuaciones',
        best_for: 'Datos con poca variabilidad y sin tendencia clara',
        limitations: 'No captura tendencias ni estacionalidad',
        parameters: 'Ventana: 3 meses'
      }
    },
    {
      name: 'Holt-Winters',
      metrics: { mape: 12.8, mae: 8.2, mse: 120.1, rmse: 11.0 },
      predictions: [95, 102, 108, 105, 115, 118, 122, 125, 128, 130, 135, 138],
      actuals: [98, 107, 109, 110, 111, 116, 119, 121, 123, 124, 129, 131],
      description: {
        equation: 'Holt-Winters con componentes de tendencia y estacionalidad',
        description: 'Modelo que captura tendencia y patrones estacionales',
        best_for: 'Datos con tendencia y estacionalidad clara',
        limitations: 'Requiere al menos 2 ciclos estacionales completos',
        parameters: 'Alpha: 0.3, Beta: 0.1, Gamma: 0.2'
      }
    }
  ];

  const mockForecastResponse = {
    forecast: [135, 138, 142, 145, 148, 152, 155, 158, 162, 165, 168, 172],
    model_info: {
      name: 'SMA',
      parameters: { window: 3 }
    }
  };

  beforeEach(() => {
    fetch.mockClear();
    mockClick.mockClear();
    global.URL.createObjectURL.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders main title', () => {
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      expect(screen.getByRole('heading', { name: 'Generar Pronóstico' })).toBeInTheDocument();
    });

    test('renders model selection section', () => {
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      expect(screen.getByText('Seleccionar Modelo')).toBeInTheDocument();
      expect(screen.getByLabelText('Modelo de Pronóstico')).toBeInTheDocument();
    });

    test('renders periods input field', () => {
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      expect(screen.getByLabelText('Meses a pronosticar')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12')).toBeInTheDocument();
    });

    test('renders generate forecast button', () => {
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      expect(screen.getByRole('button', { name: 'Generar Pronóstico' })).toBeInTheDocument();
    });

    test('displays model information section', () => {
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      expect(screen.getByText('Información del Modelo')).toBeInTheDocument();
      expect(screen.getByText('SMA(n) = (X₁ + X₂ + ... + Xₙ) / n')).toBeInTheDocument();
    });
  });

  describe('Model Selection', () => {
    test('selects first model by default', () => {
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      const modelSelect = screen.getByLabelText('Modelo de Pronóstico');
      expect(modelSelect.value).toBe('SMA');
    });

    test('displays all available models in dropdown', () => {
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      const modelSelect = screen.getByLabelText('Modelo de Pronóstico');
      const options = modelSelect.querySelectorAll('option');
      
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent('SMA (MAPE: 15.2%)');
      expect(options[1]).toHaveTextContent('Holt-Winters (MAPE: 12.8%)');
    });

    test('changes selected model when dropdown value changes', async () => {
      const user = userEvent.setup();
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      const modelSelect = screen.getByLabelText('Modelo de Pronóstico');
      await user.selectOptions(modelSelect, 'Holt-Winters');
      
      expect(modelSelect.value).toBe('Holt-Winters');
    });

    test('updates model information when selection changes', async () => {
      const user = userEvent.setup();
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      const modelSelect = screen.getByLabelText('Modelo de Pronóstico');
      await user.selectOptions(modelSelect, 'Holt-Winters');
      
      expect(screen.getByText('Holt-Winters con componentes de tendencia y estacionalidad')).toBeInTheDocument();
      expect(screen.getByText('Alpha: 0.3, Beta: 0.1, Gamma: 0.2')).toBeInTheDocument();
    });
  });

  describe('Periods Configuration', () => {
    test('allows changing forecast periods', async () => {
      const user = userEvent.setup();
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      const periodsInput = screen.getByLabelText('Meses a pronosticar');
      await user.clear(periodsInput);
      await user.type(periodsInput, '24');
      
      expect(periodsInput.value).toBe('24');
    });

    test('has correct input constraints for periods', () => {
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      const periodsInput = screen.getByLabelText('Meses a pronosticar');
      expect(periodsInput).toHaveAttribute('min', '1');
      expect(periodsInput).toHaveAttribute('max', '36');
      expect(periodsInput).toHaveAttribute('type', 'number');
    });
  });

  describe('Forecast Generation - 12 Month Default', () => {
    test('generates 12-month forecast by default', async () => {
      const user = userEvent.setup();
      
      fetch.mockResolvedValueOnce({
        json: async () => mockForecastResponse
      });
      
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      const generateButton = screen.getByRole('button', { name: 'Generar Pronóstico' });
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:5000/api/forecast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: mockSessionId,
            model_name: 'SMA',
            periods: 12
          }),
        });
      });
    });
  });

  describe('CSV Export Functionality', () => {
    test('displays CSV download button after forecast generation', async () => {
      const user = userEvent.setup();
      
      fetch.mockResolvedValueOnce({
        json: async () => mockForecastResponse
      });
      
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      const generateButton = screen.getByRole('button', { name: 'Generar Pronóstico' });
      await user.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });
    });

    test('exports forecast data to CSV when download button is clicked', async () => {
      const user = userEvent.setup();
      
      fetch.mockResolvedValueOnce({
        json: async () => mockForecastResponse
      });
      
      render(<Forecast sessionId={mockSessionId} results={mockResults} />);
      
      const generateButton = screen.getByRole('button', { name: 'Generar Pronóstico' });
      await user.click(generateButton);
      
      await waitFor(() => {
        const downloadButton = screen.getByText('Descargar CSV');
        return user.click(downloadButton);
      });
      
      // Just verify that URL.createObjectURL was called, which indicates CSV export functionality
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });
});