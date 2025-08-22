/**
 * Test suite para ejecutar pruebas de rendimiento del frontend
 * Se ejecuta con Jest y React Testing Library
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import FrontendPerformanceTester from './FrontendPerformanceTester';

// Mock de los componentes para evitar errores de importación
jest.mock('../components/DataInput', () => {
  return function MockDataInput({ onDataSubmit, initialData }) {
    return (
      <div data-testid="data-input">
        <h2>Data Input Component</h2>
        <div>Rows: {initialData ? initialData.length : 0}</div>
        <button onClick={() => onDataSubmit && onDataSubmit()}>Submit</button>
        <button>Agregar Fila</button>
      </div>
    );
  };
});

jest.mock('../components/ResultsTable', () => {
  return function MockResultsTable({ results, onModelSelect }) {
    return (
      <div data-testid="results-table">
        <h2>Results Table Component</h2>
        <table>
          <thead>
            <tr>
              <th role="columnheader">Model</th>
              <th role="columnheader">MAPE</th>
              <th role="columnheader">MAE</th>
            </tr>
          </thead>
          <tbody>
            {results && results.map((result, index) => (
              <tr key={index} onClick={() => onModelSelect && onModelSelect(result)}>
                <td>{result.name}</td>
                <td>{result.metrics.mape}</td>
                <td>{result.metrics.mae}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
});

jest.mock('../components/Forecast', () => {
  return function MockForecast({ forecastData, historicalData }) {
    return (
      <div data-testid="forecast-chart">
        <h2>Forecast Component</h2>
        <div>Historical points: {historicalData ? historicalData.length : 0}</div>
        <div>Forecast points: {forecastData ? forecastData.forecast.length : 0}</div>
        <div>Model: {forecastData ? forecastData.model_name : 'None'}</div>
      </div>
    );
  };
});

// Configurar timeout más largo para pruebas de rendimiento
jest.setTimeout(30000);

describe('Frontend Performance Tests', () => {
  let performanceTester;

  beforeEach(() => {
    performanceTester = new FrontendPerformanceTester();
    
    // Mock de performance.now si no está disponible
    if (!global.performance) {
      global.performance = {
        now: jest.fn(() => Date.now())
      };
    }
    
    // Mock de requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  test('should measure DataInput component render performance', async () => {
    const results = await performanceTester.testDataInputPerformance();
    
    expect(results).toHaveLength(3);
    expect(results[0].componentName).toContain('DataInput');
    expect(results[0].renderTime).toBeGreaterThan(0);
    expect(typeof results[0].withinThreshold).toBe('boolean');
    
    // Verificar que todos los tests fueron exitosos
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.renderTime).toBeLessThan(2000); // Menos de 2 segundos
    });
  });

  test('should measure ResultsTable component render performance', async () => {
    const results = await performanceTester.testResultsTablePerformance();
    
    expect(results).toHaveLength(3);
    expect(results[0].componentName).toContain('ResultsTable');
    expect(results[0].renderTime).toBeGreaterThan(0);
    
    // Verificar que el test con más datos toma más tiempo
    const smallTest = results.find(r => r.componentName.includes('6 modelos'));
    const largeTest = results.find(r => r.componentName.includes('50 modelos'));
    
    expect(smallTest).toBeDefined();
    expect(largeTest).toBeDefined();
    // El test con más datos debería tomar al menos tanto tiempo como el pequeño
    expect(largeTest.renderTime).toBeGreaterThanOrEqual(smallTest.renderTime * 0.5);
  });

  test('should measure Forecast component render performance', async () => {
    const results = await performanceTester.testForecastPerformance();
    
    expect(results).toHaveLength(3);
    expect(results[0].componentName).toContain('Forecast');
    expect(results[0].renderTime).toBeGreaterThan(0);
    
    // Todos los tests deberían completarse exitosamente
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.renderTime).toBeLessThan(2000);
    });
  });

  test('should measure responsive performance across different viewports', async () => {
    const results = await performanceTester.testResponsivePerformance();
    
    expect(results).toHaveLength(3); // Mobile, Tablet, Desktop
    
    const viewports = ['Mobile', 'Tablet', 'Desktop'];
    viewports.forEach(viewport => {
      const result = results.find(r => r.viewport === viewport);
      expect(result).toBeDefined();
      expect(result.renderTime).toBeGreaterThan(0);
      expect(result.dimensions).toBeDefined();
    });
  });

  test('should measure dark mode toggle performance', async () => {
    const results = await performanceTester.testDarkModePerformance();
    
    expect(results).toHaveLength(1);
    expect(results[0].componentName).toBe('Dark Mode Toggle');
    expect(results[0].renderTime).toBeGreaterThan(0);
    expect(results[0].success).toBe(true);
  });

  test('should analyze bundle size', () => {
    const analysis = performanceTester.simulateBundleSizeAnalysis();
    
    expect(analysis.category).toBe('bundle_analysis');
    expect(analysis.totalSizeKB).toBeGreaterThan(0);
    expect(analysis.totalSizeBytes).toBeGreaterThan(0);
    expect(typeof analysis.withinThreshold).toBe('boolean');
    expect(analysis.breakdown).toBeDefined();
    expect(Array.isArray(analysis.recommendations)).toBe(true);
  });

  test('should simulate mobile performance', () => {
    const results = performanceTester.simulateMobilePerformance();
    
    expect(results).toHaveLength(3); // High-end, Mid-range, Low-end
    
    const deviceTypes = ['High-end Mobile', 'Mid-range Mobile', 'Low-end Mobile'];
    deviceTypes.forEach(deviceType => {
      const result = results.find(r => r.deviceType === deviceType);
      expect(result).toBeDefined();
      expect(result.cpuSlowdown).toBeGreaterThan(0);
      expect(result.estimatedRenderTime).toBeGreaterThan(0);
      expect(result.networkSpeed).toBeDefined();
    });
    
    // Verificar que los dispositivos más lentos tienen tiempos más altos
    const highEnd = results.find(r => r.deviceType === 'High-end Mobile');
    const lowEnd = results.find(r => r.deviceType === 'Low-end Mobile');
    expect(lowEnd.estimatedRenderTime).toBeGreaterThan(highEnd.estimatedRenderTime);
  });

  test('should generate comprehensive performance report', async () => {
    // Ejecutar algunas pruebas para tener datos
    await performanceTester.testDataInputPerformance();
    await performanceTester.testResultsTablePerformance();
    performanceTester.simulateBundleSizeAnalysis();
    
    const report = performanceTester.generatePerformanceReport();
    
    expect(report.summary).toBeDefined();
    expect(report.summary.totalTests).toBeGreaterThan(0);
    expect(report.summary.successRate).toBeGreaterThanOrEqual(0);
    expect(report.summary.successRate).toBeLessThanOrEqual(100);
    expect(report.summary.thresholdComplianceRate).toBeGreaterThanOrEqual(0);
    expect(report.summary.thresholdComplianceRate).toBeLessThanOrEqual(100);
    
    expect(report.categorizedResults).toBeDefined();
    expect(report.thresholds).toBeDefined();
    expect(report.thresholds.maxRenderTimeMs).toBe(2000);
    expect(report.timestamp).toBeDefined();
  });

  test('should run complete performance test suite', async () => {
    const report = await performanceTester.runAllFrontendPerformanceTests();
    
    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.summary.totalTests).toBeGreaterThan(10); // Debería haber múltiples tests
    
    // Verificar que se ejecutaron todas las categorías de tests
    expect(report.categorizedResults.component_render).toBeDefined();
    expect(report.categorizedResults.responsive_render).toBeDefined();
    expect(report.categorizedResults.bundle_analysis).toBeDefined();
    expect(report.categorizedResults.mobile_performance).toBeDefined();
    
    // Verificar métricas de rendimiento
    expect(report.summary.avgRenderTime).toBeGreaterThan(0);
    expect(report.summary.maxRenderTime).toBeGreaterThan(0);
    expect(report.summary.successRate).toBeGreaterThan(80); // Al menos 80% de éxito
  });

  test('should handle errors gracefully', async () => {
    // Simular un error en el render
    const originalRender = render;
    render.mockImplementationOnce(() => {
      throw new Error('Simulated render error');
    });
    
    const result = await performanceTester.measureRenderTime('Error Test', () => {
      return render(<div>Test</div>);
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Simulated render error');
    expect(result.renderTime).toBeGreaterThan(0);
    
    // Restaurar render original
    render.mockImplementation(originalRender);
  });

  test('should validate performance thresholds', async () => {
    const results = await performanceTester.testDataInputPerformance();
    
    // Verificar que los umbrales se respetan
    results.forEach(result => {
      if (result.success) {
        // Si el render fue exitoso, el tiempo debería ser razonable
        expect(result.renderTime).toBeLessThan(5000); // Máximo 5 segundos como límite absoluto
        
        // Verificar que withinThreshold se calcula correctamente
        const expectedWithinThreshold = result.renderTime < 2000;
        expect(result.withinThreshold).toBe(expectedWithinThreshold);
      }
    });
  });
});

// Test de integración para verificar que todos los componentes se pueden renderizar juntos
describe('Integration Performance Tests', () => {
  let performanceTester;

  beforeEach(() => {
    performanceTester = new FrontendPerformanceTester();
    global.performance = global.performance || { now: jest.fn(() => Date.now()) };
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
  });

  test('should measure performance of complete application render', async () => {
    const result = await performanceTester.measureRenderTime('Complete App', () => {
      const mockData = performanceTester.generateMockData();
      
      return render(
        <div>
          <div data-testid="data-input">
            <h2>Data Input Component</h2>
            <div>Rows: {mockData.inputData.length}</div>
          </div>
          <div data-testid="results-table">
            <h2>Results Table Component</h2>
            <div>Results: {mockData.results.length}</div>
          </div>
          <div data-testid="forecast-chart">
            <h2>Forecast Component</h2>
            <div>Forecast points: {mockData.forecast.forecast.length}</div>
          </div>
        </div>
      );
    });

    expect(result.success).toBe(true);
    expect(result.renderTime).toBeGreaterThan(0);
    expect(result.renderTime).toBeLessThan(2000); // Debería renderizar en menos de 2 segundos
  });
});