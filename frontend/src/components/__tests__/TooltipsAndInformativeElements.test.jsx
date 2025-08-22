import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// Mock components with tooltips for testing
const ModelTooltip = ({ modelName, children }) => {
  const getModelInfo = (name) => {
    const modelDescriptions = {
      'SMA': {
        title: 'Media Móvil Simple (SMA)',
        description: 'Calcula el promedio de los últimos N períodos para predecir el siguiente valor.',
        bestFor: 'Datos con poca variabilidad y sin tendencias marcadas.',
        limitations: 'No captura tendencias ni estacionalidad.',
        equation: 'SMA(n) = (X₁ + X₂ + ... + Xₙ) / n'
      },
      'SES': {
        title: 'Suavizado Exponencial Simple (SES)',
        description: 'Asigna mayor peso a observaciones recientes usando un factor de suavizado alpha.',
        bestFor: 'Datos estacionarios sin tendencia ni estacionalidad.',
        limitations: 'No maneja tendencias ni patrones estacionales.',
        equation: 'S₁ = X₁, Sₜ = αXₜ + (1-α)Sₜ₋₁'
      },
      'Holt-Winters': {
        title: 'Holt-Winters',
        description: 'Método de suavizado exponencial que captura tendencia y estacionalidad.',
        bestFor: 'Datos con tendencia y patrones estacionales claros.',
        limitations: 'Requiere al menos 2 ciclos estacionales completos.',
        equation: 'Lₜ = α(Xₜ/Sₜ₋ₘ) + (1-α)(Lₜ₋₁ + bₜ₋₁)'
      },
      'ARIMA': {
        title: 'ARIMA (AutoRegressive Integrated Moving Average)',
        description: 'Modelo estadístico que combina autoregresión, diferenciación e integración.',
        bestFor: 'Datos con patrones complejos y correlaciones temporales.',
        limitations: 'Requiere datos estacionarios y puede ser computacionalmente intensivo.',
        equation: 'ARIMA(p,d,q): (1-φ₁L-...-φₚLᵖ)(1-L)ᵈXₜ = (1+θ₁L+...+θₑLᵠ)εₜ'
      },
      'Linear Regression': {
        title: 'Regresión Lineal',
        description: 'Ajusta una línea recta a los datos históricos para proyectar tendencias.',
        bestFor: 'Datos con tendencias lineales claras y consistentes.',
        limitations: 'Asume relación lineal y no captura estacionalidad.',
        equation: 'y = β₀ + β₁x + ε'
      },
      'Random Forest': {
        title: 'Random Forest',
        description: 'Ensemble de árboles de decisión que usa características temporales.',
        bestFor: 'Datos complejos con patrones no lineales y múltiples variables.',
        limitations: 'Puede sobreajustar y es menos interpretable.',
        equation: 'ŷ = (1/B) Σᵦ₌₁ᴮ Tᵦ(x)'
      }
    };
    return modelDescriptions[name] || {
      title: name,
      description: 'Información no disponible',
      bestFor: 'No especificado',
      limitations: 'No especificado',
      equation: 'No disponible'
    };
  };

  const modelInfo = getModelInfo(modelName);

  return (
    <Tooltip
      title={
        <div style={{ padding: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {modelInfo.title}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Descripción:</strong> {modelInfo.description}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Mejor para:</strong> {modelInfo.bestFor}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Limitaciones:</strong> {modelInfo.limitations}
          </div>
          <div>
            <strong>Ecuación:</strong> {modelInfo.equation}
          </div>
        </div>
      }
      arrow
      placement="top"
      enterDelay={500}
      leaveDelay={200}
    >
      {children}
    </Tooltip>
  );
};

const MetricTooltip = ({ metricName, children }) => {
  const getMetricInfo = (name) => {
    const metricDescriptions = {
      'MAE': {
        title: 'Error Absoluto Medio (MAE)',
        description: 'Promedio de las diferencias absolutas entre valores reales y predichos.',
        interpretation: 'Valores menores indican mejor precisión. Se expresa en las mismas unidades que los datos.',
        formula: 'MAE = (1/n) Σ|yᵢ - ŷᵢ|'
      },
      'MSE': {
        title: 'Error Cuadrático Medio (MSE)',
        description: 'Promedio de los cuadrados de las diferencias entre valores reales y predichos.',
        interpretation: 'Penaliza más los errores grandes. Valores menores indican mejor ajuste.',
        formula: 'MSE = (1/n) Σ(yᵢ - ŷᵢ)²'
      },
      'RMSE': {
        title: 'Raíz del Error Cuadrático Medio (RMSE)',
        description: 'Raíz cuadrada del MSE, expresada en las mismas unidades que los datos.',
        interpretation: 'Combina la interpretabilidad del MAE con la sensibilidad del MSE a errores grandes.',
        formula: 'RMSE = √MSE = √[(1/n) Σ(yᵢ - ŷᵢ)²]'
      },
      'MAPE': {
        title: 'Error Porcentual Absoluto Medio (MAPE)',
        description: 'Promedio de los errores porcentuales absolutos.',
        interpretation: 'Expresado como porcentaje. Permite comparar modelos independientemente de la escala.',
        formula: 'MAPE = (100/n) Σ|(yᵢ - ŷᵢ)/yᵢ|'
      }
    };
    return metricDescriptions[name] || {
      title: name,
      description: 'Información no disponible',
      interpretation: 'No especificado',
      formula: 'No disponible'
    };
  };

  const metricInfo = getMetricInfo(metricName);

  return (
    <Tooltip
      title={
        <div style={{ padding: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {metricInfo.title}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Descripción:</strong> {metricInfo.description}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <strong>Interpretación:</strong> {metricInfo.interpretation}
          </div>
          <div>
            <strong>Fórmula:</strong> {metricInfo.formula}
          </div>
        </div>
      }
      arrow
      placement="top"
      enterDelay={300}
      leaveDelay={200}
    >
      {children}
    </Tooltip>
  );
};

// Test component that uses the tooltips
const TestComponentWithTooltips = () => {
  const models = ['SMA', 'SES', 'Holt-Winters', 'ARIMA', 'Linear Regression', 'Random Forest'];
  const metrics = ['MAE', 'MSE', 'RMSE', 'MAPE'];

  return (
    <div>
      <h2>Modelos de Pronóstico</h2>
      {models.map(model => (
        <div key={model} style={{ margin: '10px' }}>
          <ModelTooltip modelName={model}>
            <IconButton aria-label={`Información sobre ${model}`}>
              <InfoIcon />
              <span>{model}</span>
            </IconButton>
          </ModelTooltip>
        </div>
      ))}
      
      <h2>Métricas de Evaluación</h2>
      {metrics.map(metric => (
        <div key={metric} style={{ margin: '10px' }}>
          <MetricTooltip metricName={metric}>
            <IconButton aria-label={`Información sobre ${metric}`}>
              <HelpOutlineIcon />
              <span>{metric}</span>
            </IconButton>
          </MetricTooltip>
        </div>
      ))}
    </div>
  );
};

describe('Tooltips and Informative Elements', () => {
  describe('Model Information Tooltips', () => {
    test('displays tooltip for SMA model on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const smaButton = screen.getByLabelText('Información sobre SMA');
      
      await user.hover(smaButton);
      
      await waitFor(() => {
        expect(screen.getByText('Media Móvil Simple (SMA)')).toBeInTheDocument();
        expect(screen.getByText(/Calcula el promedio de los últimos N períodos/)).toBeInTheDocument();
        expect(screen.getByText(/Datos con poca variabilidad/)).toBeInTheDocument();
        expect(screen.getByText(/No captura tendencias ni estacionalidad/)).toBeInTheDocument();
        expect(screen.getByText(/SMA\(n\) = \(X₁ \+ X₂ \+ \.\.\. \+ Xₙ\) \/ n/)).toBeInTheDocument();
      });
    });

    test('displays tooltip for SES model on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const sesButton = screen.getByLabelText('Información sobre SES');
      
      await user.hover(sesButton);
      
      await waitFor(() => {
        expect(screen.getByText('Suavizado Exponencial Simple (SES)')).toBeInTheDocument();
        expect(screen.getByText(/Asigna mayor peso a observaciones recientes/)).toBeInTheDocument();
        expect(screen.getByText(/Datos estacionarios sin tendencia/)).toBeInTheDocument();
        expect(screen.getByText(/No maneja tendencias ni patrones estacionales/)).toBeInTheDocument();
      });
    });

    test('displays tooltip for Holt-Winters model on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const holtButton = screen.getByLabelText('Información sobre Holt-Winters');
      
      await user.hover(holtButton);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText(/Método de suavizado exponencial que captura tendencia/)).toBeInTheDocument();
        expect(screen.getByText(/Datos con tendencia y patrones estacionales/)).toBeInTheDocument();
        expect(screen.getByText(/Requiere al menos 2 ciclos estacionales/)).toBeInTheDocument();
      });
    });

    test('displays tooltip for ARIMA model on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const arimaButton = screen.getByLabelText('Información sobre ARIMA');
      
      await user.hover(arimaButton);
      
      await waitFor(() => {
        expect(screen.getByText('ARIMA (AutoRegressive Integrated Moving Average)')).toBeInTheDocument();
        expect(screen.getByText(/Modelo estadístico que combina autoregresión/)).toBeInTheDocument();
        expect(screen.getByText(/Datos con patrones complejos/)).toBeInTheDocument();
        expect(screen.getByText(/Requiere datos estacionarios/)).toBeInTheDocument();
      });
    });

    test('displays tooltip for Linear Regression model on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const lrButton = screen.getByLabelText('Información sobre Linear Regression');
      
      await user.hover(lrButton);
      
      await waitFor(() => {
        expect(screen.getByText('Regresión Lineal')).toBeInTheDocument();
        expect(screen.getByText(/Ajusta una línea recta a los datos históricos/)).toBeInTheDocument();
        expect(screen.getByText(/Datos con tendencias lineales claras/)).toBeInTheDocument();
        expect(screen.getByText(/Asume relación lineal/)).toBeInTheDocument();
      });
    });

    test('displays tooltip for Random Forest model on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const rfButton = screen.getByLabelText('Información sobre Random Forest');
      
      await user.hover(rfButton);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText(/Ensemble de árboles de decisión/)).toBeInTheDocument();
        expect(screen.getByText(/Datos complejos con patrones no lineales/)).toBeInTheDocument();
        expect(screen.getByText(/Puede sobreajustar/)).toBeInTheDocument();
      });
    });

    test('tooltip disappears when mouse leaves element', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const smaButton = screen.getByLabelText('Información sobre SMA');
      
      await user.hover(smaButton);
      
      await waitFor(() => {
        expect(screen.getByText('Media Móvil Simple (SMA)')).toBeInTheDocument();
      });
      
      await user.unhover(smaButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Media Móvil Simple (SMA)')).not.toBeInTheDocument();
      });
    });

    test('handles unknown model names gracefully', async () => {
      const UnknownModelTooltip = () => (
        <ModelTooltip modelName="Unknown Model">
          <IconButton aria-label="Información sobre Unknown Model">
            <InfoIcon />
            <span>Unknown Model</span>
          </IconButton>
        </ModelTooltip>
      );

      const user = userEvent.setup();
      render(<UnknownModelTooltip />);
      
      const unknownButton = screen.getByLabelText('Información sobre Unknown Model');
      
      await user.hover(unknownButton);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('Información no disponible')).toBeInTheDocument();
        expect(screen.getAllByText('No especificado')).toHaveLength(2); // Appears twice in tooltip
      });
    });
  });

  describe('Metric Information Tooltips', () => {
    test('displays tooltip for MAE metric on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const maeButton = screen.getByLabelText('Información sobre MAE');
      
      await user.hover(maeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error Absoluto Medio (MAE)')).toBeInTheDocument();
        expect(screen.getByText(/Promedio de las diferencias absolutas/)).toBeInTheDocument();
        expect(screen.getByText(/Valores menores indican mejor precisión/)).toBeInTheDocument();
        expect(screen.getByText(/MAE = \(1\/n\) Σ\|yᵢ - ŷᵢ\|/)).toBeInTheDocument();
      });
    });

    test('displays tooltip for MSE metric on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const mseButton = screen.getByLabelText('Información sobre MSE');
      
      await user.hover(mseButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error Cuadrático Medio (MSE)')).toBeInTheDocument();
        expect(screen.getByText(/Promedio de los cuadrados de las diferencias/)).toBeInTheDocument();
        expect(screen.getByText(/Penaliza más los errores grandes/)).toBeInTheDocument();
        expect(screen.getByText(/MSE = \(1\/n\) Σ\(yᵢ - ŷᵢ\)²/)).toBeInTheDocument();
      });
    });

    test('displays tooltip for RMSE metric on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const rmseButton = screen.getByLabelText('Información sobre RMSE');
      
      await user.hover(rmseButton);
      
      await waitFor(() => {
        expect(screen.getByText('Raíz del Error Cuadrático Medio (RMSE)')).toBeInTheDocument();
        expect(screen.getByText(/Raíz cuadrada del MSE/)).toBeInTheDocument();
        expect(screen.getByText(/Combina la interpretabilidad del MAE/)).toBeInTheDocument();
        expect(screen.getByText(/RMSE = √MSE/)).toBeInTheDocument();
      });
    });

    test('displays tooltip for MAPE metric on hover', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const mapeButton = screen.getByLabelText('Información sobre MAPE');
      
      await user.hover(mapeButton);
      
      await waitFor(() => {
        expect(screen.getByText('Error Porcentual Absoluto Medio (MAPE)')).toBeInTheDocument();
        expect(screen.getByText(/Promedio de los errores porcentuales absolutos/)).toBeInTheDocument();
        expect(screen.getByText(/Expresado como porcentaje/)).toBeInTheDocument();
        expect(screen.getByText(/MAPE = \(100\/n\) Σ\|\(yᵢ - ŷᵢ\)\/yᵢ\|/)).toBeInTheDocument();
      });
    });

    test('handles unknown metric names gracefully', async () => {
      const UnknownMetricTooltip = () => (
        <MetricTooltip metricName="Unknown Metric">
          <IconButton aria-label="Información sobre Unknown Metric">
            <HelpOutlineIcon />
            <span>Unknown Metric</span>
          </IconButton>
        </MetricTooltip>
      );

      const user = userEvent.setup();
      render(<UnknownMetricTooltip />);
      
      const unknownButton = screen.getByLabelText('Información sobre Unknown Metric');
      
      await user.hover(unknownButton);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('Información no disponible')).toBeInTheDocument();
        expect(screen.getByText('No especificado')).toBeInTheDocument();
        expect(screen.getByText('No disponible')).toBeInTheDocument();
      });
    });
  });

  describe('Tooltip Accessibility', () => {
    test('tooltips have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const smaButton = screen.getByLabelText('Información sobre SMA');
      
      expect(smaButton).toHaveAttribute('aria-label', 'Información sobre SMA');
      
      await user.hover(smaButton);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveAttribute('role', 'tooltip');
      });
    });

    test('tooltips are keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const smaButton = screen.getByLabelText('Información sobre SMA');
      
      // Focus the button using keyboard
      await user.tab();
      expect(smaButton).toHaveFocus();
      
      // Tooltip should appear on focus
      await waitFor(() => {
        expect(screen.getByText('Media Móvil Simple (SMA)')).toBeInTheDocument();
      });
      
      // Tooltip should disappear when focus is lost
      await user.tab();
      
      await waitFor(() => {
        expect(screen.queryByText('Media Móvil Simple (SMA)')).not.toBeInTheDocument();
      });
    });

    test('tooltips work with screen readers', async () => {
      render(<TestComponentWithTooltips />);
      
      const smaButton = screen.getByLabelText('Información sobre SMA');
      
      // Check that the button has proper labeling for screen readers
      expect(smaButton).toHaveAttribute('aria-label', 'Información sobre SMA');
      
      // The tooltip content should be accessible when triggered
      fireEvent.mouseEnter(smaButton);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent('Media Móvil Simple (SMA)');
      });
    });

    test('tooltips have appropriate timing delays', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const smaButton = screen.getByLabelText('Información sobre SMA');
      
      // Hover and check that tooltip appears after delay
      await user.hover(smaButton);
      
      // Should appear after delay
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText(/Calcula el promedio de los últimos N períodos/)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Unhover and check that tooltip disappears
      await user.unhover(smaButton);
      
      // Should disappear after delay
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Tooltip Content Validation', () => {
    test('all model tooltips contain required information sections', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const models = ['SMA', 'SES', 'Holt-Winters', 'ARIMA', 'Linear Regression', 'Random Forest'];
      
      for (const model of models) {
        const button = screen.getByLabelText(`Información sobre ${model}`);
        
        await user.hover(button);
        
        await waitFor(() => {
          // Check that all required sections are present
          expect(screen.getByText(/Descripción:/)).toBeInTheDocument();
          expect(screen.getByText(/Mejor para:/)).toBeInTheDocument();
          expect(screen.getByText(/Limitaciones:/)).toBeInTheDocument();
          expect(screen.getByText(/Ecuación:/)).toBeInTheDocument();
        });
        
        await user.unhover(button);
        
        // Wait for tooltip to disappear before testing next model
        await waitFor(() => {
          expect(screen.queryByText(/Descripción:/)).not.toBeInTheDocument();
        });
      }
    });

    test('all metric tooltips contain required information sections', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const metrics = ['MAE', 'MSE', 'RMSE', 'MAPE'];
      
      for (const metric of metrics) {
        const button = screen.getByLabelText(`Información sobre ${metric}`);
        
        await user.hover(button);
        
        await waitFor(() => {
          // Check that all required sections are present
          expect(screen.getByText(/Descripción:/)).toBeInTheDocument();
          expect(screen.getByText(/Interpretación:/)).toBeInTheDocument();
          expect(screen.getByText(/Fórmula:/)).toBeInTheDocument();
        });
        
        await user.unhover(button);
        
        // Wait for tooltip to disappear before testing next metric
        await waitFor(() => {
          expect(screen.queryByText(/Descripción:/)).not.toBeInTheDocument();
        });
      }
    });

    test('tooltip content is informative and educational', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const arimaButton = screen.getByLabelText('Información sobre ARIMA');
      
      await user.hover(arimaButton);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        const tooltipText = tooltip.textContent;
        
        // Check that the content is substantial and informative
        expect(tooltipText.length).toBeGreaterThan(100);
        expect(tooltipText).toMatch(/autoregresión|diferenciación|integración/i);
        expect(tooltipText).toMatch(/estacionarios/i);
        expect(tooltipText).toMatch(/computacionalmente/i);
      });
    });

    test('mathematical equations are properly formatted', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const mapeButton = screen.getByLabelText('Información sobre MAPE');
      
      await user.hover(mapeButton);
      
      await waitFor(() => {
        // Check that mathematical notation is present and properly formatted
        expect(screen.getByText(/MAPE = \(100\/n\) Σ\|\(yᵢ - ŷᵢ\)\/yᵢ\|/)).toBeInTheDocument();
      });
    });
  });

  describe('Tooltip Performance and UX', () => {
    test('multiple tooltips can be displayed sequentially without conflicts', async () => {
      const user = userEvent.setup();
      render(<TestComponentWithTooltips />);
      
      const smaButton = screen.getByLabelText('Información sobre SMA');
      const sesButton = screen.getByLabelText('Información sobre SES');
      
      // Show first tooltip
      await user.hover(smaButton);
      await waitFor(() => {
        expect(screen.getByText('Media Móvil Simple (SMA)')).toBeInTheDocument();
      });
      
      // Hide first and show second
      await user.unhover(smaButton);
      await user.hover(sesButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Media Móvil Simple (SMA)')).not.toBeInTheDocument();
        expect(screen.getByText('Suavizado Exponencial Simple (SES)')).toBeInTheDocument();
      });
    });

    test('tooltips do not interfere with button click functionality', async () => {
      const mockClick = jest.fn();
      
      const ClickableTooltipButton = () => (
        <ModelTooltip modelName="SMA">
          <IconButton 
            aria-label="Información sobre SMA"
            onClick={mockClick}
          >
            <InfoIcon />
            <span>SMA</span>
          </IconButton>
        </ModelTooltip>
      );
      
      const user = userEvent.setup();
      render(<ClickableTooltipButton />);
      
      const button = screen.getByLabelText('Información sobre SMA');
      
      // Hover to show tooltip
      await user.hover(button);
      await waitFor(() => {
        expect(screen.getByText('Media Móvil Simple (SMA)')).toBeInTheDocument();
      });
      
      // Click should still work
      await user.click(button);
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    test('tooltips are responsive and work on different screen sizes', () => {
      // Mock different viewport sizes
      const originalInnerWidth = window.innerWidth;
      const originalInnerHeight = window.innerHeight;
      
      // Test mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      
      render(<TestComponentWithTooltips />);
      
      const smaButton = screen.getByLabelText('Información sobre SMA');
      expect(smaButton).toBeInTheDocument();
      
      // Test desktop viewport
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      
      expect(smaButton).toBeInTheDocument();
      
      // Restore original values
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true });
    });
  });

  describe('Tooltip Integration with Existing Components', () => {
    test('tooltips can be integrated into ResultsTable component structure', () => {
      const ResultsTableWithTooltips = () => (
        <div>
          <h4>Resultados de Modelos de Pronóstico</h4>
          <table>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>
                  <MetricTooltip metricName="MAPE">
                    <span style={{ borderBottom: '1px dotted', cursor: 'help' }}>
                      MAPE (%)
                    </span>
                  </MetricTooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <ModelTooltip modelName="SMA">
                    <span style={{ borderBottom: '1px dotted', cursor: 'help' }}>
                      SMA
                    </span>
                  </ModelTooltip>
                </td>
                <td>12.5%</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
      
      render(<ResultsTableWithTooltips />);
      
      expect(screen.getByText('SMA')).toBeInTheDocument();
      expect(screen.getByText('MAPE (%)')).toBeInTheDocument();
      expect(screen.getByText('12.5%')).toBeInTheDocument();
    });

    test('tooltips can be integrated into Forecast component structure', () => {
      const ForecastWithTooltips = () => (
        <div>
          <h4>Información del Modelo</h4>
          <ModelTooltip modelName="Holt-Winters">
            <div style={{ cursor: 'help', padding: '8px', border: '1px solid #ccc' }}>
              <strong>Holt-Winters</strong>
              <InfoIcon style={{ marginLeft: '8px', fontSize: '16px' }} />
            </div>
          </ModelTooltip>
        </div>
      );
      
      render(<ForecastWithTooltips />);
      
      expect(screen.getByText('Holt-Winters')).toBeInTheDocument();
      expect(screen.getByText('Información del Modelo')).toBeInTheDocument();
    });
  });
});