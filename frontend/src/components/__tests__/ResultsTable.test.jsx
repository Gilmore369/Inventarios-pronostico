import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ResultsTable from '../ResultsTable';

describe('ResultsTable Component', () => {
  const mockOnModelSelect = jest.fn();

  // Mock data for testing
  const mockResults = [
    {
      name: 'Holt-Winters',
      metrics: {
        mape: 8.5,
        rmse: 12.3,
        mae: 9.1,
        mse: 151.29
      },
      parameters: {
        alpha: 0.3,
        beta: 0.1,
        gamma: 0.2,
        seasonal: 'additive'
      }
    },
    {
      name: 'ARIMA',
      metrics: {
        mape: 10.2,
        rmse: 15.7,
        mae: 11.8,
        mse: 246.49
      },
      parameters: {
        p: 2,
        d: 1,
        q: 1
      }
    },
    {
      name: 'SMA',
      metrics: {
        mape: 12.8,
        rmse: 18.4,
        mae: 14.2,
        mse: 338.56
      },
      parameters: {
        window: 6
      }
    },
    {
      name: 'SES',
      metrics: {
        mape: 15.3,
        rmse: 21.1,
        mae: 16.7,
        mse: 445.21
      },
      parameters: {
        alpha: 0.4
      }
    },
    {
      name: 'Linear Regression',
      metrics: {
        mape: 18.7,
        rmse: 24.9,
        mae: 19.3,
        mse: 620.01
      },
      parameters: {
        fit_intercept: true,
        normalize: false
      }
    },
    {
      name: 'Random Forest',
      metrics: {
        mape: 22.1,
        rmse: 28.6,
        mae: 22.8,
        mse: 817.96
      },
      parameters: {
        n_estimators: 100,
        max_depth: 10,
        random_state: 42
      }
    }
  ];

  const mockTop10Results = [
    ...mockResults,
    {
      name: 'Extra Model 1',
      metrics: { mape: 25.0, rmse: 30.0, mae: 25.0, mse: 900.0 },
      parameters: { param1: 'value1' }
    },
    {
      name: 'Extra Model 2',
      metrics: { mape: 27.5, rmse: 32.0, mae: 27.0, mse: 1024.0 },
      parameters: { param2: 'value2' }
    },
    {
      name: 'Extra Model 3',
      metrics: { mape: 30.0, rmse: 35.0, mae: 30.0, mse: 1225.0 },
      parameters: { param3: 'value3' }
    },
    {
      name: 'Extra Model 4',
      metrics: { mape: 32.5, rmse: 38.0, mae: 32.0, mse: 1444.0 },
      parameters: { param4: 'value4' }
    }
  ];

  beforeEach(() => {
    mockOnModelSelect.mockClear();
  });

  describe('Component Rendering', () => {
    test('renders main title and description', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getByText('Resultados de Modelos de Pronóstico')).toBeInTheDocument();
      expect(screen.getByText(/Se han evaluado 6 modelos/)).toBeInTheDocument();
    });

    test('renders table headers correctly', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Modelo')).toBeInTheDocument();
      expect(screen.getByText('MAPE (%)')).toBeInTheDocument();
      expect(screen.getByText('RMSE')).toBeInTheDocument();
      expect(screen.getByText('MAE')).toBeInTheDocument();
      expect(screen.getByText('Acciones')).toBeInTheDocument();
    });

    test('renders recommendation section', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getByText('Recomendación')).toBeInTheDocument();
      expect(screen.getByText(/Se recomienda utilizar este modelo/)).toBeInTheDocument();
      // Best model appears in both table and recommendation
      expect(screen.getAllByText('Holt-Winters')).toHaveLength(2);
    });
  });

  describe('Model Display', () => {
    test('displays all models provided in results', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      // Should show all 6 models in table cells
      const tableRows = screen.getAllByRole('row');
      // 1 header row + 6 data rows = 7 total
      expect(tableRows).toHaveLength(7);
      
      // Check model names appear in table
      expect(screen.getAllByText('Holt-Winters')).toHaveLength(2); // Table + recommendation
      expect(screen.getAllByText('ARIMA')).toHaveLength(1); // Only in table
      expect(screen.getAllByText('SMA')).toHaveLength(1);
      expect(screen.getAllByText('SES')).toHaveLength(1);
      expect(screen.getAllByText('Linear Regression')).toHaveLength(1);
      expect(screen.getAllByText('Random Forest')).toHaveLength(1);
    });

    test('displays all models when more than 10 results', () => {
      render(<ResultsTable results={mockTop10Results} onModelSelect={mockOnModelSelect} />);
      
      // Should show all 10 models (component doesn't limit to top 10)
      const tableRows = screen.getAllByRole('row');
      // 1 header row + 10 data rows = 11 total
      expect(tableRows).toHaveLength(11);
      
      // Check that all models are shown
      expect(screen.getByText('Extra Model 4')).toBeInTheDocument();
    });

    test('shows correct ranking numbers', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const tableRows = screen.getAllByRole('row');
      // Skip header row, check data rows
      for (let i = 1; i <= mockResults.length; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
    });
  });

  describe('MAPE Ascending Order Verification', () => {
    test('displays models in correct MAPE ascending order', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const tableRows = screen.getAllByRole('row');
      const dataRows = tableRows.slice(1); // Skip header
      
      // Verify the order by checking MAPE values
      expect(dataRows[0]).toHaveTextContent('8.5%'); // Holt-Winters
      expect(dataRows[1]).toHaveTextContent('10.2%'); // ARIMA
      expect(dataRows[2]).toHaveTextContent('12.8%'); // SMA
      expect(dataRows[3]).toHaveTextContent('15.3%'); // SES
      expect(dataRows[4]).toHaveTextContent('18.7%'); // Linear Regression
      expect(dataRows[5]).toHaveTextContent('22.1%'); // Random Forest
    });

    test('highlights best model with success chip', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      // First model should have success chip
      const successChip = screen.getByText('8.5%').closest('.MuiChip-root');
      expect(successChip).toHaveClass('MuiChip-colorSuccess');
      expect(successChip).toHaveClass('MuiChip-filled');
    });

    test('other models have default chip styling', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      // Second model should have default chip
      const defaultChip = screen.getByText('10.2%').closest('.MuiChip-root');
      expect(defaultChip).toHaveClass('MuiChip-colorDefault');
      expect(defaultChip).toHaveClass('MuiChip-outlined');
    });
  });

  describe('Metrics Visualization', () => {
    test('displays all metrics correctly (MAE, MSE, RMSE, MAPE)', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      // Check MAPE values
      expect(screen.getByText('8.5%')).toBeInTheDocument();
      expect(screen.getByText('10.2%')).toBeInTheDocument();
      
      // Check RMSE values
      expect(screen.getByText('12.3')).toBeInTheDocument();
      expect(screen.getByText('15.7')).toBeInTheDocument();
      
      // Check MAE values
      expect(screen.getByText('9.1')).toBeInTheDocument();
      expect(screen.getByText('11.8')).toBeInTheDocument();
    });

    test('formats MAPE values with percentage symbol', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      mockResults.forEach(result => {
        expect(screen.getByText(`${result.metrics.mape}%`)).toBeInTheDocument();
      });
    });

    test('displays numeric metrics without additional formatting', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      // RMSE and MAE should be displayed as plain numbers
      expect(screen.getByText('12.3')).toBeInTheDocument();
      expect(screen.getByText('9.1')).toBeInTheDocument();
      expect(screen.getByText('15.7')).toBeInTheDocument();
      expect(screen.getByText('11.8')).toBeInTheDocument();
    });
  });

  describe('Model Selection Functionality', () => {
    test('renders selection button for each model', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const selectButtons = screen.getAllByText('Seleccionar');
      expect(selectButtons).toHaveLength(mockResults.length);
    });

    test('calls onModelSelect with correct model name when button clicked', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const selectButtons = screen.getAllByText('Seleccionar');
      
      // Click first model (Holt-Winters)
      await user.click(selectButtons[0]);
      expect(mockOnModelSelect).toHaveBeenCalledWith('Holt-Winters');
      
      // Click second model (ARIMA)
      await user.click(selectButtons[1]);
      expect(mockOnModelSelect).toHaveBeenCalledWith('ARIMA');
    });

    test('selection buttons are properly styled', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const selectButtons = screen.getAllByText('Seleccionar');
      selectButtons.forEach(button => {
        expect(button).toHaveClass('MuiButton-outlined');
        expect(button).toHaveClass('MuiButton-sizeSmall');
      });
    });

    test('handles multiple rapid clicks correctly', async () => {
      const user = userEvent.setup();
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const selectButton = screen.getAllByText('Seleccionar')[0];
      
      // Rapid clicks
      await user.click(selectButton);
      await user.click(selectButton);
      await user.click(selectButton);
      
      expect(mockOnModelSelect).toHaveBeenCalledTimes(3);
      expect(mockOnModelSelect).toHaveBeenCalledWith('Holt-Winters');
    });
  });

  describe('Model Parameters Display', () => {
    test('displays model parameters as JSON string', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      // Check Holt-Winters parameters
      expect(screen.getByText(/alpha.*0\.3.*beta.*0\.1.*gamma.*0\.2.*seasonal.*additive/)).toBeInTheDocument();
      
      // Check ARIMA parameters
      expect(screen.getByText(/p.*2.*d.*1.*q.*1/)).toBeInTheDocument();
      
      // Check SMA parameters
      expect(screen.getByText(/window.*6/)).toBeInTheDocument();
    });

    test('parameters are displayed with secondary text styling', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const parameterElements = screen.getAllByText(/Parámetros:/);
      parameterElements.forEach(element => {
        expect(element.closest('.MuiTypography-caption')).toBeInTheDocument();
      });
    });

    test('handles complex parameter objects correctly', () => {
      const complexResult = [{
        name: 'Complex Model',
        metrics: { mape: 5.0, rmse: 10.0, mae: 8.0, mse: 100.0 },
        parameters: {
          nested: { param1: 'value1', param2: 2 },
          array: [1, 2, 3],
          boolean: true,
          null_value: null
        }
      }];
      
      render(<ResultsTable results={complexResult} onModelSelect={mockOnModelSelect} />);
      
      // Should display the JSON representation without errors
      expect(screen.getByText(/nested.*param1.*value1/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles empty results array', () => {
      render(<ResultsTable results={[]} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getByText('Resultados de Modelos de Pronóstico')).toBeInTheDocument();
      
      // Should not crash and should show empty table
      const tableRows = screen.getAllByRole('row');
      expect(tableRows).toHaveLength(1); // Only header row
      
      // Should show recommendation section even with empty results (though it may be empty)
      expect(screen.getByText('Recomendación')).toBeInTheDocument();
    });

    test('handles single result', () => {
      const singleResult = [mockResults[0]];
      render(<ResultsTable results={singleResult} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getAllByText('Holt-Winters')).toHaveLength(2); // Table + recommendation
      expect(screen.getByText('Seleccionar')).toBeInTheDocument();
      
      // Should show 1 model in the count
      const tableRows = screen.getAllByRole('row');
      expect(tableRows).toHaveLength(2); // Header + 1 data row
    });

    test('handles missing metrics gracefully', () => {
      const incompleteResult = [{
        name: 'Incomplete Model',
        metrics: {
          mape: 10.0,
          // Missing rmse, mae, mse
        },
        parameters: { param: 'value' }
      }];
      
      render(<ResultsTable results={incompleteResult} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getAllByText('Incomplete Model')).toHaveLength(2); // Table + recommendation
      expect(screen.getByText('10%')).toBeInTheDocument();
      // Should not crash even with missing metrics
    });

    test('handles missing parameters gracefully', () => {
      const noParamsResult = [{
        name: 'No Params Model',
        metrics: { mape: 10.0, rmse: 15.0, mae: 12.0, mse: 225.0 },
        // Missing parameters
      }];
      
      render(<ResultsTable results={noParamsResult} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getAllByText('No Params Model')).toHaveLength(2); // Table + recommendation
      // Should handle undefined parameters without crashing
    });

    test('handles very long model names', () => {
      const longNameResult = [{
        name: 'Very Long Model Name That Might Cause Layout Issues In The Table Display',
        metrics: { mape: 10.0, rmse: 15.0, mae: 12.0, mse: 225.0 },
        parameters: { param: 'value' }
      }];
      
      render(<ResultsTable results={longNameResult} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getAllByText('Very Long Model Name That Might Cause Layout Issues In The Table Display')).toHaveLength(2);
    });

    test('handles extreme metric values', () => {
      const extremeResult = [{
        name: 'Extreme Model',
        metrics: { 
          mape: 999.99, 
          rmse: 0.001, 
          mae: 1000000, 
          mse: 0.0000001 
        },
        parameters: { param: 'value' }
      }];
      
      render(<ResultsTable results={extremeResult} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getByText('999.99%')).toBeInTheDocument();
      expect(screen.getByText('0.001')).toBeInTheDocument();
      expect(screen.getByText('1000000')).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    test('table has proper accessibility attributes', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(6); // #, Modelo, MAPE, RMSE, MAE, Acciones
    });

    test('buttons have proper accessibility attributes', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const selectButtons = screen.getAllByRole('button', { name: 'Seleccionar' });
      expect(selectButtons).toHaveLength(mockResults.length);
      
      selectButtons.forEach(button => {
        expect(button).toBeEnabled();
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    test('recommendation section provides clear guidance', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      const recommendation = screen.getByText(/Se recomienda utilizar este modelo/);
      expect(recommendation).toBeInTheDocument();
      
      // Should mention the best model name (appears in both table and recommendation)
      expect(screen.getAllByText('Holt-Winters')).toHaveLength(2);
    });

    test('visual hierarchy is maintained with proper typography', () => {
      render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      // Main title should be h4
      const mainTitle = screen.getByRole('heading', { level: 4 });
      expect(mainTitle).toHaveTextContent('Resultados de Modelos de Pronóstico');
      
      // Recommendation should be h6
      const recTitle = screen.getByRole('heading', { level: 6 });
      expect(recTitle).toHaveTextContent('Recomendación');
    });
  });

  describe('Performance and Optimization', () => {
    test('handles large datasets efficiently', () => {
      // Create a large dataset
      const largeResults = Array.from({ length: 50 }, (_, index) => ({
        name: `Model ${index + 1}`,
        metrics: {
          mape: 10 + index * 0.5,
          rmse: 15 + index,
          mae: 12 + index * 0.8,
          mse: 225 + index * 10
        },
        parameters: { param: `value${index}` }
      }));
      
      const startTime = performance.now();
      render(<ResultsTable results={largeResults} onModelSelect={mockOnModelSelect} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 500ms for large dataset)
      expect(endTime - startTime).toBeLessThan(500);
      
      // Should show all results (component doesn't limit to top 10)
      const tableRows = screen.getAllByRole('row');
      expect(tableRows).toHaveLength(51); // 1 header + 50 data rows
    });

    test('component re-renders correctly when results change', () => {
      const { rerender } = render(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getAllByText('Holt-Winters')).toHaveLength(2); // Table + recommendation
      
      // Change results
      const newResults = [{
        name: 'New Best Model',
        metrics: { mape: 5.0, rmse: 8.0, mae: 6.0, mse: 64.0 },
        parameters: { new_param: 'new_value' }
      }];
      
      rerender(<ResultsTable results={newResults} onModelSelect={mockOnModelSelect} />);
      
      expect(screen.getAllByText('New Best Model')).toHaveLength(2); // Table + recommendation
      expect(screen.queryByText('Holt-Winters')).not.toBeInTheDocument();
    });
  });
});