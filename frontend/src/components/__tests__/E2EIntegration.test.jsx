/**
 * Pruebas de integración end-to-end para el frontend
 * Simula la interacción completa del usuario con la aplicación
 * 
 * Requirements: 6.3, 6.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from '../../App';

// Mock fetch para simular respuestas del backend
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Datos de prueba sintéticos
const generateTestData = (length = 24) => {
  return Array.from({ length }, (_, i) => ({
    demand: 100 + Math.sin(i * 0.5) * 20 + Math.random() * 10
  }));
};

describe('E2E Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Reset any localStorage or sessionStorage if used
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('complete user flow: data input → processing → results → forecast', async () => {
    const user = userEvent.setup();
    
    // Mock responses para simular el flujo completo
    const mockSessionId = 'test_session_123';
    const mockResults = [
      {
        name: 'Media Móvil Simple (SMA)',
        metrics: { mae: 15.2, mse: 245.8, rmse: 15.7, mape: 12.3 },
        parameters: { window: 3 },
        predictions: Array(24).fill(0).map((_, i) => 100 + i * 2)
      },
      {
        name: 'Suavizado Exponencial Simple (SES)',
        metrics: { mae: 18.1, mse: 289.4, rmse: 17.0, mape: 14.8 },
        parameters: { alpha: 0.3 },
        predictions: Array(24).fill(0).map((_, i) => 98 + i * 1.8)
      }
    ];
    
    const mockForecast = {
      forecast: [120, 122, 124, 126, 128, 130, 132, 134, 136, 138, 140, 142],
      model_name: 'Media Móvil Simple (SMA)',
      periods: 12
    };

    // Configurar mocks para cada endpoint
    mockFetch
      // Upload endpoint
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: mockSessionId,
          message: 'Datos cargados exitosamente'
        })
      })
      // Process endpoint
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Procesamiento iniciado',
          session_id: mockSessionId
        })
      })
      // Results endpoint (processing)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'processing'
        })
      })
      // Results endpoint (completed)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'completed',
          results: mockResults
        })
      })
      // Forecast endpoint
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecast
      });

    // Renderizar la aplicación
    render(<App />);

    // 1. FASE DE ENTRADA DE DATOS
    // Verificar que el componente de entrada de datos está presente
    expect(screen.getByText(/entrada de datos/i)).toBeInTheDocument();
    
    // Simular entrada manual de datos
    const addRowButton = screen.getByText(/agregar fila/i);
    
    // Agregar algunas filas de datos
    for (let i = 0; i < 15; i++) {
      await user.click(addRowButton);
    }

    // Llenar algunos campos de demanda
    const demandInputs = screen.getAllByLabelText(/demanda/i);
    for (let i = 0; i < Math.min(12, demandInputs.length); i++) {
      await user.clear(demandInputs[i]);
      await user.type(demandInputs[i], (100 + i * 5).toString());
    }

    // Enviar datos
    const submitButton = screen.getByText(/procesar datos/i);
    await user.click(submitButton);

    // Verificar que se llamó al endpoint de upload
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/upload'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    // 2. FASE DE PROCESAMIENTO
    // Verificar que se muestra el indicador de procesamiento
    await waitFor(() => {
      expect(screen.getByText(/procesando/i)).toBeInTheDocument();
    });

    // Verificar que se llamó al endpoint de process
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/process'),
      expect.objectContaining({
        method: 'POST'
      })
    );

    // 3. FASE DE RESULTADOS
    // Esperar a que aparezcan los resultados
    await waitFor(() => {
      expect(screen.getByText(/resultados/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verificar que se muestran los modelos
    expect(screen.getByText(/Media Móvil Simple/i)).toBeInTheDocument();
    expect(screen.getByText(/Suavizado Exponencial/i)).toBeInTheDocument();

    // Verificar que se muestran las métricas
    expect(screen.getByText('12.3')).toBeInTheDocument(); // MAPE del mejor modelo
    expect(screen.getByText('15.2')).toBeInTheDocument(); // MAE del mejor modelo

    // 4. FASE DE PRONÓSTICO
    // Seleccionar el mejor modelo para generar pronóstico
    const selectModelButton = screen.getAllByText(/generar pronóstico/i)[0];
    await user.click(selectModelButton);

    // Verificar que se llamó al endpoint de forecast
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/forecast'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    // Verificar que se muestra el pronóstico
    await waitFor(() => {
      expect(screen.getByText(/pronóstico/i)).toBeInTheDocument();
    });

    // Verificar que se muestran los valores del pronóstico
    expect(screen.getByText('120')).toBeInTheDocument(); // Primer valor del pronóstico
    expect(screen.getByText('142')).toBeInTheDocument(); // Último valor del pronóstico
  });

  test('error handling during complete flow', async () => {
    const user = userEvent.setup();

    // Mock error responses
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Se requieren entre 12 y 120 meses de datos'
        })
      });

    render(<App />);

    // Intentar enviar datos insuficientes
    const submitButton = screen.getByText(/procesar datos/i);
    await user.click(submitButton);

    // Verificar que se muestra el mensaje de error
    await waitFor(() => {
      expect(screen.getByText(/entre 12 y 120 meses/i)).toBeInTheDocument();
    });
  });

  test('CSV upload integration flow', async () => {
    const user = userEvent.setup();
    
    const mockSessionId = 'csv_session_456';
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: mockSessionId,
          message: 'Datos cargados exitosamente'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Procesamiento iniciado',
          session_id: mockSessionId
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'completed',
          results: [{
            name: 'Random Forest',
            metrics: { mae: 10.5, mse: 156.2, rmse: 12.5, mape: 8.7 },
            parameters: { n_estimators: 100, max_depth: 10 },
            predictions: Array(36).fill(0).map((_, i) => 150 + i * 1.5)
          }]
        })
      });

    render(<App />);

    // Simular carga de archivo CSV
    const fileInput = screen.getByLabelText(/cargar archivo csv/i);
    
    // Crear un archivo CSV simulado
    const csvContent = 'demand\n100\n105\n110\n115\n120\n125\n130\n135\n140\n145\n150\n155';
    const file = new File([csvContent], 'test_data.csv', { type: 'text/csv' });
    
    await user.upload(fileInput, file);

    // Verificar que se procesó el archivo
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/upload'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    // El resto del flujo debería continuar normalmente
    await waitFor(() => {
      expect(screen.getByText(/Random Forest/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  test('responsive design during integration flow', async () => {
    const user = userEvent.setup();
    
    // Mock successful responses
    mockFetch
      .mockResolvedValue({
        ok: true,
        json: async () => ({ session_id: 'responsive_test', message: 'OK' })
      });

    // Simular viewport móvil
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });

    render(<App />);

    // Verificar que los componentes son responsive
    const container = screen.getByRole('main') || screen.getByTestId('app-container');
    expect(container).toBeInTheDocument();

    // Simular cambio a desktop
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      window.dispatchEvent(new Event('resize'));
    });

    // Los componentes deberían seguir funcionando
    expect(container).toBeInTheDocument();
  });

  test('dark mode toggle during integration flow', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    // Buscar el toggle de modo oscuro
    const darkModeToggle = screen.getByRole('switch') || screen.getByLabelText(/modo oscuro/i);
    
    if (darkModeToggle) {
      // Alternar modo oscuro
      await user.click(darkModeToggle);
      
      // Verificar que se aplicó el modo oscuro
      // (esto dependerá de cómo esté implementado en la aplicación)
      const body = document.body;
      expect(body).toHaveClass(/dark|theme-dark/);
      
      // Alternar de vuelta a modo claro
      await user.click(darkModeToggle);
      expect(body).not.toHaveClass(/dark|theme-dark/);
    }
  });

  test('data persistence across component updates', async () => {
    const user = userEvent.setup();
    
    const mockSessionId = 'persistence_test_789';
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: mockSessionId,
          message: 'Datos cargados exitosamente'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'completed',
          results: [{
            name: 'ARIMA',
            metrics: { mae: 12.8, mse: 198.4, rmse: 14.1, mape: 10.2 },
            parameters: { order: [1, 1, 1] },
            predictions: Array(20).fill(0).map((_, i) => 200 + i * 2.5)
          }]
        })
      });

    render(<App />);

    // Ingresar datos
    const addRowButton = screen.getByText(/agregar fila/i);
    for (let i = 0; i < 12; i++) {
      await user.click(addRowButton);
    }

    // Llenar datos
    const demandInputs = screen.getAllByLabelText(/demanda/i);
    const testValues = [200, 205, 210, 215, 220, 225, 230, 235, 240, 245, 250, 255];
    
    for (let i = 0; i < Math.min(testValues.length, demandInputs.length); i++) {
      await user.clear(demandInputs[i]);
      await user.type(demandInputs[i], testValues[i].toString());
    }

    // Procesar datos
    const submitButton = screen.getByText(/procesar datos/i);
    await user.click(submitButton);

    // Verificar que los datos se mantienen durante el procesamiento
    await waitFor(() => {
      expect(screen.getByText(/ARIMA/i)).toBeInTheDocument();
    });

    // Los valores originales deberían seguir siendo accesibles
    // (esto se puede verificar a través del estado de la aplicación o localStorage)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/upload'),
      expect.objectContaining({
        body: expect.stringContaining('200') // Verificar que los datos originales se enviaron
      })
    );
  });
});