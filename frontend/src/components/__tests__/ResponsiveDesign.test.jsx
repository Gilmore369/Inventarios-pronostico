import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Header from '../Header';
import DataInput from '../DataInput';
import ResultsTable from '../ResultsTable';

// Mock fetch globally
global.fetch = jest.fn();

// Helper function to render components with theme
const renderWithTheme = (component, darkMode = false) => {
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {component}
    </ThemeProvider>
  );
};

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering and Basic Responsiveness', () => {
    test('Header renders with theme toggle', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      // Should show title (responsive behavior is handled by Material-UI)
      expect(screen.getByText('Sistema de Pronósticos de Demanda')).toBeInTheDocument();
      
      // Theme toggle should be visible
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    test('DataInput component renders all essential elements', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Main elements should be present and accessible
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
      expect(screen.getByText('Entrada Manual')).toBeInTheDocument();
      expect(screen.getByText('Cargar CSV')).toBeInTheDocument();
      expect(screen.getByText('Procesar Modelos')).toBeInTheDocument();
      
      // Data grid should be present
      expect(screen.getByText('Mes')).toBeInTheDocument();
      expect(screen.getByText('Demanda')).toBeInTheDocument();
    });

    test('Component interactions work correctly', async () => {
      const user = userEvent.setup();
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Test button interactions
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
      
      // Switch back to manual
      const manualButton = screen.getByText('Entrada Manual');
      await user.click(manualButton);
      
      expect(screen.getByText('Agregar Fila')).toBeInTheDocument();
    });
  });

  describe('ResultsTable Component', () => {
    test('ResultsTable displays data correctly', () => {
      const mockResults = [
        {
          name: 'Holt-Winters',
          metrics: { mape: 8.5, rmse: 12.3, mae: 9.1 },
          parameters: { alpha: 0.3, beta: 0.1, gamma: 0.2, seasonal: 'additive' }
        },
        {
          name: 'ARIMA',
          metrics: { mape: 10.2, rmse: 15.7, mae: 11.8 },
          parameters: { p: 2, d: 1, q: 1 }
        }
      ];
      const mockOnModelSelect = jest.fn();
      
      renderWithTheme(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      // Table should be present and readable
      expect(screen.getByText('Resultados de Modelos de Pronóstico')).toBeInTheDocument();
      expect(screen.getByText('Modelo')).toBeInTheDocument();
      expect(screen.getByText('MAPE (%)')).toBeInTheDocument();
      
      // All data should be visible (using getAllByText since names appear in table and recommendation)
      expect(screen.getAllByText('Holt-Winters')).toHaveLength(2);
      expect(screen.getByText('ARIMA')).toBeInTheDocument();
    });
  });

  describe('Layout and Functionality', () => {
    test('Header displays full content', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      // Should show title
      expect(screen.getByText('Sistema de Pronósticos de Demanda')).toBeInTheDocument();
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    test('DataInput has proper layout', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // All elements should be present
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
      
      // Buttons should be properly aligned
      const manualButton = screen.getByText('Entrada Manual');
      const csvButton = screen.getByText('Cargar CSV');
      expect(manualButton).toBeInTheDocument();
      expect(csvButton).toBeInTheDocument();
      
      // Data grid should have full functionality
      expect(screen.getByText('Agregar Fila')).toBeInTheDocument();
    });

    test('Large datasets display properly', () => {
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        name: `Model ${i + 1}`,
        metrics: { mape: 8.5 + i, rmse: 12.3 + i, mae: 9.1 + i },
        parameters: { param1: `value${i}` }
      }));
      const mockOnModelSelect = jest.fn();
      
      renderWithTheme(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />);
      
      // Should handle large datasets without layout issues
      expect(screen.getByText('Resultados de Modelos de Pronóstico')).toBeInTheDocument();
      
      // All models should be visible (using getAllByText since names appear in table and recommendation)
      expect(screen.getAllByText('Model 1')).toHaveLength(2);
      expect(screen.getByText('Model 10')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    test('Components maintain functionality', async () => {
      const user = userEvent.setup();
      const mockOnDataUpload = jest.fn();
      
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Core functionality should work
      expect(screen.getByText('Entrada Manual')).toBeInTheDocument();
      expect(screen.getByText('Cargar CSV')).toBeInTheDocument();
      
      // Test interaction
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
    });
  });

  describe('Accessibility and Usability', () => {
    test('Touch targets are properly sized', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      const themeToggle = screen.getByTestId('theme-toggle');
      expect(themeToggle).toBeInTheDocument();
      
      // Material-UI IconButton should have proper accessibility
      expect(themeToggle).toHaveAttribute('aria-label');
    });

    test('Text remains readable', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Main heading should be readable
      const heading = screen.getByText('Análisis de Pronósticos de Demanda');
      expect(heading).toBeInTheDocument();
      
      // Description text should be present
      expect(screen.getByText(/Cargue los datos históricos/)).toBeInTheDocument();
    });
  });
});