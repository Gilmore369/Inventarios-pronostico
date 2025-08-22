import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Forecast from '../Forecast';

// Mock fetch para simular respuestas del servidor
global.fetch = jest.fn();

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
}));

// Mock URL.createObjectURL y URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'mock-url');
const mockRevokeObjectURL = jest.fn();

global.URL = {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL
};

// Mock para createElement y click
const mockClick = jest.fn();
const mockCreateElement = jest.fn(() => ({
  href: '',
  download: '',
  click: mockClick
}));

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement
});

describe('Export Functionality Tests', () => {
  const mockResults = [
    {
      name: 'SMA',
      metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
      predictions: [100, 105, 110],
      actuals: [98, 107, 108]
    },
    {
      name: 'SES',
      metrics: { mape: 18.2, rmse: 12.1, mae: 9.5 },
      predictions: [95, 100, 105],
      actuals: [98, 107, 108]
    }
  ];

  beforeEach(() => {
    fetch.mockClear();
    mockClick.mockClear();
    mockCreateElement.mockClear();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('CSV Export Functionality', () => {
    test('should generate and download CSV file with correct forecast data', async () => {
      // Mock de respuesta del servidor con datos de pronóstico
      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8, 130.1, 135.4, 140.7, 145.9, 151.2, 156.5, 161.8, 167.1, 172.4]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Generar pronóstico primero
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });

      // Hacer clic en descargar CSV
      const downloadButton = screen.getByText('Descargar CSV');
      fireEvent.click(downloadButton);

      // Verificar que se creó el elemento de descarga
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    test('should generate CSV with correct format and headers', async () => {
      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      // Mock Blob constructor para capturar el contenido
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });

      // Descargar CSV
      const downloadButton = screen.getByText('Descargar CSV');
      fireEvent.click(downloadButton);

      // Verificar formato del CSV
      expect(mockBlob).toHaveBeenCalledWith(
        ['Mes,Pronóstico\nM1,115.50\nM2,120.20\nM3,125.80'],
        { type: 'text/csv' }
      );
    });

    test('should generate filename based on selected model', async () => {
      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Cambiar modelo seleccionado
      const modelSelect = screen.getByLabelText('Modelo de Pronóstico');
      fireEvent.change(modelSelect, { target: { value: 'SES' } });

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });

      // Descargar CSV
      const downloadButton = screen.getByText('Descargar CSV');
      fireEvent.click(downloadButton);

      // Verificar que el nombre del archivo incluye el modelo
      const createdElement = mockCreateElement.mock.results[0].value;
      expect(createdElement.download).toBe('pronostico_SES.csv');
    });

    test('should handle model names with spaces in filename', async () => {
      const mockResultsWithSpaces = [
        {
          name: 'Random Forest',
          metrics: { mape: 15.5, rmse: 10.2, mae: 8.1 },
          predictions: [100, 105, 110],
          actuals: [98, 107, 108]
        }
      ];

      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      render(<Forecast sessionId="test-session" results={mockResultsWithSpaces} />);

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });

      // Descargar CSV
      const downloadButton = screen.getByText('Descargar CSV');
      fireEvent.click(downloadButton);

      // Verificar que los espacios se reemplazan con guiones bajos
      const createdElement = mockCreateElement.mock.results[0].value;
      expect(createdElement.download).toBe('pronostico_Random_Forest.csv');
    });
  });

  describe('Export Data Validation', () => {
    test('should export correct number of forecast periods', async () => {
      const mockForecastData = {
        forecast: Array.from({ length: 24 }, (_, i) => 100 + i * 5) // 24 meses
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Cambiar a 24 meses
      const periodsInput = screen.getByLabelText('Meses a pronosticar');
      fireEvent.change(periodsInput, { target: { value: '24' } });

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });

      // Descargar CSV
      const downloadButton = screen.getByText('Descargar CSV');
      fireEvent.click(downloadButton);

      // Verificar que se exportaron 24 períodos
      const csvContent = mockBlob.mock.calls[0][0][0];
      const lines = csvContent.split('\n');
      expect(lines.length).toBe(25); // Header + 24 data lines
    });

    test('should format decimal numbers correctly in CSV', async () => {
      const mockForecastData = {
        forecast: [115.123456, 120.987654, 125.555555]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });

      // Descargar CSV
      const downloadButton = screen.getByText('Descargar CSV');
      fireEvent.click(downloadButton);

      // Verificar formato decimal (2 decimales)
      const csvContent = mockBlob.mock.calls[0][0][0];
      expect(csvContent).toContain('115.12');
      expect(csvContent).toContain('120.99');
      expect(csvContent).toContain('125.56');
    });

    test('should include proper CSV headers', async () => {
      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });

      // Descargar CSV
      const downloadButton = screen.getByText('Descargar CSV');
      fireEvent.click(downloadButton);

      // Verificar headers del CSV
      const csvContent = mockBlob.mock.calls[0][0][0];
      expect(csvContent).toStartWith('Mes,Pronóstico\n');
    });
  });

  describe('Cross-Browser Compatibility', () => {
    test('should work with different blob implementations', async () => {
      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      // Simular diferentes implementaciones de Blob
      const originalBlob = global.Blob;
      global.Blob = function(content, options) {
        this.content = content;
        this.type = options.type;
      };

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });

      // Descargar CSV
      const downloadButton = screen.getByText('Descargar CSV');
      fireEvent.click(downloadButton);

      // Verificar que funciona con implementación personalizada
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();

      // Restaurar Blob original
      global.Blob = originalBlob;
    });

    test('should handle URL.createObjectURL unavailability gracefully', async () => {
      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      // Simular ausencia de URL.createObjectURL
      const originalCreateObjectURL = global.URL.createObjectURL;
      global.URL.createObjectURL = undefined;

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });

      // Intentar descargar CSV (no debería fallar)
      const downloadButton = screen.getByText('Descargar CSV');
      expect(() => fireEvent.click(downloadButton)).not.toThrow();

      // Restaurar función original
      global.URL.createObjectURL = originalCreateObjectURL;
    });
  });

  describe('Export Button States and Feedback', () => {
    test('should only show download button after forecast is generated', () => {
      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Inicialmente no debería estar el botón de descarga
      expect(screen.queryByText('Descargar CSV')).not.toBeInTheDocument();
    });

    test('should show download button after successful forecast generation', async () => {
      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Descargar CSV')).toBeInTheDocument();
      });
    });

    test('should not show download button if forecast generation fails', async () => {
      // Simular error en la generación de pronóstico
      fetch.mockRejectedValueOnce(new Error('Forecast generation failed'));

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Intentar generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Generar Pronóstico')).toBeInTheDocument();
      });

      // No debería aparecer el botón de descarga
      expect(screen.queryByText('Descargar CSV')).not.toBeInTheDocument();
    });
  });

  describe('Additional Export Features', () => {
    test('should display forecast data in table before export', async () => {
      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('115.50')).toBeInTheDocument();
        expect(screen.getByText('120.20')).toBeInTheDocument();
        expect(screen.getByText('125.80')).toBeInTheDocument();
      });
    });

    test('should show forecast summary information', async () => {
      const mockForecastData = {
        forecast: [115.5, 120.2, 125.8]
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockForecastData)
      });

      render(<Forecast sessionId="test-session" results={mockResults} />);

      // Cambiar períodos a 3
      const periodsInput = screen.getByLabelText('Meses a pronosticar');
      fireEvent.change(periodsInput, { target: { value: '3' } });

      // Generar pronóstico
      const generateButton = screen.getByText('Generar Pronóstico');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Pronóstico para los próximos 3 meses usando SMA')).toBeInTheDocument();
      });
    });
  });
});