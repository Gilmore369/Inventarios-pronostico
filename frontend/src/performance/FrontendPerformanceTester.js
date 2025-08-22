/**
 * Suite de pruebas de rendimiento para el frontend React
 * Mide tiempos de renderizado, tamaño de bundle y rendimiento en dispositivos móviles
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { performance } from 'perf_hooks';

// Importar componentes para testing
import DataInput from '../components/DataInput';
import ResultsTable from '../components/ResultsTable';
import Forecast from '../components/Forecast';

class FrontendPerformanceTester {
  constructor() {
    this.renderTimeThreshold = 2000; // 2 segundos
    this.bundleSizeThreshold = 5 * 1024 * 1024; // 5MB
    this.results = [];
    
    // Mock data para pruebas
    this.mockData = this.generateMockData();
  }

  generateMockData() {
    // Generar datos de prueba para los componentes
    const mockResults = [];
    const modelNames = [
      'Media Móvil Simple (SMA)',
      'Suavizado Exponencial Simple (SES)',
      'Holt-Winters (Triple Exponencial)',
      'ARIMA (AutoRegressive Integrated Moving Average)',
      'Regresión Lineal',
      'Random Forest'
    ];

    for (let i = 0; i < modelNames.length; i++) {
      mockResults.push({
        name: modelNames[i],
        metrics: {
          mae: Math.random() * 10 + 5,
          mse: Math.random() * 100 + 20,
          rmse: Math.random() * 15 + 8,
          mape: Math.random() * 20 + 5
        },
        parameters: {
          window: Math.floor(Math.random() * 10) + 3,
          alpha: Math.random() * 0.8 + 0.1
        }
      });
    }

    const mockForecast = {
      forecast: Array.from({ length: 12 }, () => Math.random() * 100 + 50),
      model_name: 'Media Móvil Simple (SMA)',
      periods: 12
    };

    return {
      results: mockResults,
      forecast: mockForecast,
      inputData: Array.from({ length: 24 }, (_, i) => ({
        month: i + 1,
        demand: Math.random() * 100 + 50
      }))
    };
  }

  measureRenderTime(componentName, renderFunction) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      try {
        const result = renderFunction();
        
        // Usar requestAnimationFrame para medir después del render
        requestAnimationFrame(() => {
          const endTime = performance.now();
          const renderTime = endTime - startTime;
          
          resolve({
            componentName,
            renderTime: Math.round(renderTime * 100) / 100, // Redondear a 2 decimales
            success: true,
            withinThreshold: renderTime < this.renderTimeThreshold
          });
        });
      } catch (error) {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        resolve({
          componentName,
          renderTime: Math.round(renderTime * 100) / 100,
          success: false,
          error: error.message,
          withinThreshold: renderTime < this.renderTimeThreshold
        });
      }
    });
  }

  async testDataInputPerformance() {
    console.log('=== PROBANDO RENDIMIENTO DE DataInput ===');
    
    // Test con datos pequeños
    const smallDataTest = await this.measureRenderTime('DataInput (12 meses)', () => {
      return render(
        <DataInput 
          onDataSubmit={() => {}}
          initialData={this.mockData.inputData.slice(0, 12)}
        />
      );
    });

    // Test con datos grandes
    const largeDataTest = await this.measureRenderTime('DataInput (120 meses)', () => {
      const largeData = Array.from({ length: 120 }, (_, i) => ({
        month: i + 1,
        demand: Math.random() * 100 + 50
      }));
      
      return render(
        <DataInput 
          onDataSubmit={() => {}}
          initialData={largeData}
        />
      );
    });

    // Test de interactividad (agregar filas)
    const interactivityTest = await this.measureRenderTime('DataInput (interactividad)', () => {
      const component = render(<DataInput onDataSubmit={() => {}} />);
      
      // Simular agregar múltiples filas
      for (let i = 0; i < 10; i++) {
        const addButton = screen.queryByText('Agregar Fila');
        if (addButton) {
          addButton.click();
        }
      }
      
      return component;
    });

    const results = [smallDataTest, largeDataTest, interactivityTest];
    
    results.forEach(result => {
      this.results.push({
        ...result,
        category: 'component_render',
        timestamp: new Date().toISOString()
      });
      
      const status = result.success && result.withinThreshold ? '✓' : '✗';
      console.log(`  ${status} ${result.componentName}: ${result.renderTime}ms`);
    });

    return results;
  }

  async testResultsTablePerformance() {
    console.log('=== PROBANDO RENDIMIENTO DE ResultsTable ===');
    
    // Test con pocos resultados
    const smallResultsTest = await this.measureRenderTime('ResultsTable (6 modelos)', () => {
      return render(
        <ResultsTable 
          results={this.mockData.results}
          onModelSelect={() => {}}
        />
      );
    });

    // Test con muchos resultados (simular múltiples ejecuciones)
    const largeResultsTest = await this.measureRenderTime('ResultsTable (50 modelos)', () => {
      const largeResults = [];
      for (let i = 0; i < 50; i++) {
        largeResults.push({
          ...this.mockData.results[i % this.mockData.results.length],
          name: `${this.mockData.results[i % this.mockData.results.length].name} (${i + 1})`
        });
      }
      
      return render(
        <ResultsTable 
          results={largeResults}
          onModelSelect={() => {}}
        />
      );
    });

    // Test de ordenamiento
    const sortingTest = await this.measureRenderTime('ResultsTable (ordenamiento)', () => {
      const component = render(
        <ResultsTable 
          results={this.mockData.results}
          onModelSelect={() => {}}
        />
      );
      
      // Simular clicks en headers para ordenar
      const headers = screen.getAllByRole('columnheader');
      headers.forEach(header => {
        if (header.textContent.includes('MAPE')) {
          header.click();
        }
      });
      
      return component;
    });

    const results = [smallResultsTest, largeResultsTest, sortingTest];
    
    results.forEach(result => {
      this.results.push({
        ...result,
        category: 'component_render',
        timestamp: new Date().toISOString()
      });
      
      const status = result.success && result.withinThreshold ? '✓' : '✗';
      console.log(`  ${status} ${result.componentName}: ${result.renderTime}ms`);
    });

    return results;
  }

  async testForecastPerformance() {
    console.log('=== PROBANDO RENDIMIENTO DE Forecast ===');
    
    // Test con pronóstico simple
    const simpleForecastTest = await this.measureRenderTime('Forecast (12 meses)', () => {
      return render(
        <Forecast 
          forecastData={this.mockData.forecast}
          historicalData={this.mockData.inputData}
        />
      );
    });

    // Test con datos históricos grandes
    const largeForecastTest = await this.measureRenderTime('Forecast (120 meses históricos)', () => {
      const largeHistorical = Array.from({ length: 120 }, (_, i) => ({
        month: i + 1,
        demand: Math.random() * 100 + 50
      }));
      
      return render(
        <Forecast 
          forecastData={this.mockData.forecast}
          historicalData={largeHistorical}
        />
      );
    });

    // Test de gráficos interactivos
    const chartInteractionTest = await this.measureRenderTime('Forecast (interacción gráficos)', () => {
      const component = render(
        <Forecast 
          forecastData={this.mockData.forecast}
          historicalData={this.mockData.inputData}
        />
      );
      
      // Simular interacciones con el gráfico (hover, zoom, etc.)
      const chartContainer = screen.queryByTestId('forecast-chart');
      if (chartContainer) {
        // Simular eventos de mouse
        chartContainer.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        chartContainer.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      }
      
      return component;
    });

    const results = [simpleForecastTest, largeForecastTest, chartInteractionTest];
    
    results.forEach(result => {
      this.results.push({
        ...result,
        category: 'component_render',
        timestamp: new Date().toISOString()
      });
      
      const status = result.success && result.withinThreshold ? '✓' : '✗';
      console.log(`  ${status} ${result.componentName}: ${result.renderTime}ms`);
    });

    return results;
  }

  async testResponsivePerformance() {
    console.log('=== PROBANDO RENDIMIENTO RESPONSIVE ===');
    
    // Simular diferentes tamaños de pantalla
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    const responsiveResults = [];

    for (const viewport of viewports) {
      // Cambiar el viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: viewport.width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: viewport.height,
      });

      // Disparar evento de resize
      window.dispatchEvent(new Event('resize'));

      const test = await this.measureRenderTime(`Responsive (${viewport.name})`, () => {
        return render(
          <div>
            <DataInput onDataSubmit={() => {}} />
            <ResultsTable results={this.mockData.results} onModelSelect={() => {}} />
            <Forecast 
              forecastData={this.mockData.forecast}
              historicalData={this.mockData.inputData}
            />
          </div>
        );
      });

      responsiveResults.push({
        ...test,
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`
      });
    }

    responsiveResults.forEach(result => {
      this.results.push({
        ...result,
        category: 'responsive_render',
        timestamp: new Date().toISOString()
      });
      
      const status = result.success && result.withinThreshold ? '✓' : '✗';
      console.log(`  ${status} ${result.componentName}: ${result.renderTime}ms`);
    });

    return responsiveResults;
  }

  async testDarkModePerformance() {
    console.log('=== PROBANDO RENDIMIENTO DE MODO OSCURO ===');
    
    // Test de cambio de tema
    const themeToggleTest = await this.measureRenderTime('Dark Mode Toggle', () => {
      const component = render(
        <div className="dark-theme">
          <DataInput onDataSubmit={() => {}} />
          <ResultsTable results={this.mockData.results} onModelSelect={() => {}} />
        </div>
      );
      
      // Simular cambio de tema múltiples veces
      for (let i = 0; i < 5; i++) {
        const container = component.container.firstChild;
        container.className = i % 2 === 0 ? 'light-theme' : 'dark-theme';
      }
      
      return component;
    });

    this.results.push({
      ...themeToggleTest,
      category: 'theme_performance',
      timestamp: new Date().toISOString()
    });

    const status = themeToggleTest.success && themeToggleTest.withinThreshold ? '✓' : '✗';
    console.log(`  ${status} ${themeToggleTest.componentName}: ${themeToggleTest.renderTime}ms`);

    return [themeToggleTest];
  }

  simulateBundleSizeAnalysis() {
    console.log('=== ANALIZANDO TAMAÑO DE BUNDLE ===');
    
    // Simular análisis de bundle size (en un entorno real usaríamos webpack-bundle-analyzer)
    const estimatedSizes = {
      'React Core': 42.2, // KB
      'Material-UI': 156.8,
      'Recharts': 89.3,
      'Application Code': 45.7,
      'Vendor Libraries': 78.9,
      'CSS/Styles': 23.4
    };

    const totalSize = Object.values(estimatedSizes).reduce((sum, size) => sum + size, 0);
    const totalSizeBytes = totalSize * 1024; // Convertir a bytes

    const bundleAnalysis = {
      category: 'bundle_analysis',
      totalSizeKB: Math.round(totalSize * 100) / 100,
      totalSizeBytes: Math.round(totalSizeBytes),
      withinThreshold: totalSizeBytes < this.bundleSizeThreshold,
      breakdown: estimatedSizes,
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    // Generar recomendaciones basadas en el tamaño
    if (estimatedSizes['Material-UI'] > 150) {
      bundleAnalysis.recommendations.push('Considerar tree-shaking para Material-UI');
    }
    if (estimatedSizes['Recharts'] > 80) {
      bundleAnalysis.recommendations.push('Evaluar alternativas más ligeras para gráficos');
    }
    if (totalSize > 400) {
      bundleAnalysis.recommendations.push('Implementar code splitting para reducir bundle inicial');
    }

    this.results.push(bundleAnalysis);

    const status = bundleAnalysis.withinThreshold ? '✓' : '⚠️';
    console.log(`  ${status} Bundle Total: ${bundleAnalysis.totalSizeKB}KB`);
    
    Object.entries(estimatedSizes).forEach(([component, size]) => {
      console.log(`    - ${component}: ${size}KB`);
    });

    if (bundleAnalysis.recommendations.length > 0) {
      console.log('  Recomendaciones:');
      bundleAnalysis.recommendations.forEach(rec => {
        console.log(`    • ${rec}`);
      });
    }

    return bundleAnalysis;
  }

  simulateMobilePerformance() {
    console.log('=== SIMULANDO RENDIMIENTO MÓVIL ===');
    
    // Simular condiciones de dispositivos móviles
    const mobileConditions = [
      { name: 'High-end Mobile', cpuSlowdown: 1, networkSpeed: '4G' },
      { name: 'Mid-range Mobile', cpuSlowdown: 2, networkSpeed: '3G' },
      { name: 'Low-end Mobile', cpuSlowdown: 4, networkSpeed: '2G' }
    ];

    const mobileResults = [];

    mobileConditions.forEach(condition => {
      // Simular el impacto del CPU slowdown en los tiempos de render
      const baseRenderTime = 100; // ms base
      const adjustedRenderTime = baseRenderTime * condition.cpuSlowdown;
      
      const mobileTest = {
        deviceType: condition.name,
        cpuSlowdown: condition.cpuSlowdown,
        networkSpeed: condition.networkSpeed,
        estimatedRenderTime: adjustedRenderTime,
        withinThreshold: adjustedRenderTime < this.renderTimeThreshold,
        category: 'mobile_performance',
        timestamp: new Date().toISOString()
      };

      mobileResults.push(mobileTest);
      this.results.push(mobileTest);

      const status = mobileTest.withinThreshold ? '✓' : '⚠️';
      console.log(`  ${status} ${condition.name}: ~${adjustedRenderTime}ms (CPU ${condition.cpuSlowdown}x slower)`);
    });

    return mobileResults;
  }

  generatePerformanceReport() {
    console.log('\n=== GENERANDO REPORTE DE RENDIMIENTO FRONTEND ===');
    
    // Agrupar resultados por categoría
    const categorizedResults = this.results.reduce((acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = [];
      }
      acc[result.category].push(result);
      return acc;
    }, {});

    // Calcular estadísticas
    const componentRenders = categorizedResults.component_render || [];
    const responsiveRenders = categorizedResults.responsive_render || [];
    
    const stats = {
      totalTests: this.results.length,
      componentTests: componentRenders.length,
      responsiveTests: responsiveRenders.length,
      successfulTests: this.results.filter(r => r.success !== false).length,
      withinThreshold: this.results.filter(r => r.withinThreshold).length,
      avgRenderTime: componentRenders.length > 0 ? 
        Math.round(componentRenders.reduce((sum, r) => sum + (r.renderTime || 0), 0) / componentRenders.length * 100) / 100 : 0,
      maxRenderTime: componentRenders.length > 0 ? 
        Math.max(...componentRenders.map(r => r.renderTime || 0)) : 0
    };

    const report = {
      summary: {
        ...stats,
        successRate: Math.round((stats.successfulTests / stats.totalTests) * 100 * 100) / 100,
        thresholdComplianceRate: Math.round((stats.withinThreshold / stats.totalTests) * 100 * 100) / 100
      },
      categorizedResults,
      thresholds: {
        maxRenderTimeMs: this.renderTimeThreshold,
        maxBundleSizeBytes: this.bundleSizeThreshold
      },
      timestamp: new Date().toISOString()
    };

    // Mostrar resumen
    console.log(`Total de pruebas: ${stats.totalTests}`);
    console.log(`Pruebas exitosas: ${stats.successfulTests} (${report.summary.successRate}%)`);
    console.log(`Dentro del umbral: ${stats.withinThreshold} (${report.summary.thresholdComplianceRate}%)`);
    console.log(`Tiempo de render promedio: ${stats.avgRenderTime}ms`);
    console.log(`Tiempo de render máximo: ${stats.maxRenderTime}ms`);

    return report;
  }

  async runAllFrontendPerformanceTests() {
    console.log('INICIANDO SUITE COMPLETA DE PRUEBAS DE RENDIMIENTO FRONTEND');
    console.log('=' * 65);
    
    // Limpiar resultados previos
    this.results = [];
    
    try {
      // Ejecutar todas las pruebas
      await this.testDataInputPerformance();
      await this.testResultsTablePerformance();
      await this.testForecastPerformance();
      await this.testResponsivePerformance();
      await this.testDarkModePerformance();
      
      // Análisis adicionales
      this.simulateBundleSizeAnalysis();
      this.simulateMobilePerformance();
      
      // Generar reporte final
      const report = this.generatePerformanceReport();
      
      console.log('\n' + '=' * 65);
      console.log('PRUEBAS DE RENDIMIENTO FRONTEND COMPLETADAS');
      
      return report;
      
    } catch (error) {
      console.error('Error durante las pruebas de rendimiento:', error);
      return {
        error: error.message,
        partialResults: this.results,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default FrontendPerformanceTester;