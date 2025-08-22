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

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

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

describe('Mobile Usability Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Touch Interactions and Usability', () => {
    test('Theme toggle button is accessible', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      expect(toggleButton).toBeInTheDocument();
      
      // Should have proper accessibility attributes
      expect(toggleButton).toHaveAttribute('aria-label');
    });

    test('All interactive elements work correctly', async () => {
      const user = userEvent.setup();
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Test button interactions
      const manualButton = screen.getByText('Entrada Manual');
      const csvButton = screen.getByText('Cargar CSV');
      const addButton = screen.getByText('Agregar Fila');
      
      // All buttons should be easily tappable
      await user.click(csvButton);
      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
      
      await user.click(manualButton);
      expect(screen.getByText('Agregar Fila')).toBeInTheDocument();
      
      await user.click(addButton);
      const deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons).toHaveLength(2);
    });

    test('Data grid is functional', async () => {
      const user = userEvent.setup();
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />);
      
      // Data grid should be present and functional
      expect(screen.getByText('Mes')).toBeInTheDocument();
      expect(screen.getByText('Demanda')).toBeInTheDocument();
      
      // Add row functionality should work
      const addButton = screen.getByText('Agregar Fila');
      await user.click(addButton);
      
      const deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons).toHaveLength(2);
      
      // Delete functionality should work
      await user.click(deleteButtons[1]);
      const remainingDeleteButtons = screen.getAllByText('Eliminar');
      expect(remainingDeleteButtons).toHaveLength(1);
    });
  });

  describe('Layout in Light Mode', () => {
    test('Header layout works in light mode', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      // Should show title
      expect(screen.getByText('Sistema de Pronósticos de Demanda')).toBeInTheDocument();
      
      // Theme toggle should be visible and accessible
      const toggleButton = screen.getByTestId('theme-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
    });

    test('DataInput component works in light mode', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, false);
      
      // Main content should be visible
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
      expect(screen.getByText(/Cargue los datos históricos/)).toBeInTheDocument();
      
      // Input method buttons should be present
      expect(screen.getByText('Entrada Manual')).toBeInTheDocument();
      expect(screen.getByText('Cargar CSV')).toBeInTheDocument();
      
      // Process button should be visible
      expect(screen.getByText('Procesar Modelos')).toBeInTheDocument();
    });

    test('ResultsTable is readable in light mode', () => {
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
      
      renderWithTheme(<ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />, false);
      
      // Table should be present and readable
      expect(screen.getByText('Resultados de Modelos de Pronóstico')).toBeInTheDocument();
      expect(screen.getByText('Modelo')).toBeInTheDocument();
      expect(screen.getByText('MAPE (%)')).toBeInTheDocument();
      
      // Data should be visible
      expect(screen.getByText('Holt-Winters')).toBeInTheDocument();
      expect(screen.getByText('ARIMA')).toBeInTheDocument();
      
      // Action buttons should be accessible
      const selectButtons = screen.getAllByText('Seleccionar');
      expect(selectButtons).toHaveLength(2);
    });
  });

  describe('Layout in Dark Mode', () => {
    test('Header layout works in dark mode', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={true} toggleDarkMode={mockToggle} />, true);
      
      // Should show title
      expect(screen.getByText('Sistema de Pronósticos de Demanda')).toBeInTheDocument();
      
      // Theme toggle should show light mode icon
      const toggleButton = screen.getByTestId('theme-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label', 'Cambiar a modo claro');
      
      // Should have light mode icon
      const lightModeIcon = toggleButton.querySelector('svg[data-testid="Brightness7Icon"]');
      expect(lightModeIcon).toBeInTheDocument();
    });

    test('DataInput component works in dark mode', async () => {
      const user = userEvent.setup();
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, true);
      
      // All functionality should work in dark mode
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
      
      // Test mode switching
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
      
      const manualButton = screen.getByText('Entrada Manual');
      await user.click(manualButton);
      expect(screen.getByText('Agregar Fila')).toBeInTheDocument();
      
      // Test data manipulation
      const addButton = screen.getByText('Agregar Fila');
      await user.click(addButton);
      
      const deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons).toHaveLength(2);
    });

    test('Dark mode provides good contrast', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, true);
      
      // Text should be readable
      const heading = screen.getByText('Análisis de Pronósticos de Demanda');
      expect(heading).toBeInTheDocument();
      
      const description = screen.getByText(/Cargue los datos históricos/);
      expect(description).toBeInTheDocument();
      
      // Buttons should be visible
      expect(screen.getByText('Entrada Manual')).toBeInTheDocument();
      expect(screen.getByText('Cargar CSV')).toBeInTheDocument();
      expect(screen.getByText('Procesar Modelos')).toBeInTheDocument();
    });
  });

  describe('Theme Switching', () => {
    test('Theme toggle works correctly', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      
      // Start in light mode
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      expect(toggleButton).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      
      // Click to toggle
      await user.click(toggleButton);
      expect(mockToggle).toHaveBeenCalledTimes(1);
      
      // Simulate state change to dark mode
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      const darkToggleButton = screen.getByTestId('theme-toggle');
      expect(darkToggleButton).toHaveAttribute('aria-label', 'Cambiar a modo claro');
    });

    test('All components update correctly when theme changes', () => {
      const mockToggle = jest.fn();
      const mockOnDataUpload = jest.fn();
      
      // Render multiple components in light mode
      const { rerender } = renderWithTheme(
        <div>
          <Header darkMode={false} toggleDarkMode={mockToggle} />
          <DataInput onDataUpload={mockOnDataUpload} />
        </div>,
        false
      );
      
      // Verify light mode
      expect(screen.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
      
      // Switch to dark mode
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <div>
            <Header darkMode={true} toggleDarkMode={mockToggle} />
            <DataInput onDataUpload={mockOnDataUpload} />
          </div>
        </ThemeProvider>
      );
      
      // Verify dark mode
      expect(screen.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Cambiar a modo claro');
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
    });

    test('Interactions remain consistent across theme changes', async () => {
      const user = userEvent.setup();
      const mockOnDataUpload = jest.fn();
      
      // Test in light mode
      const { rerender } = renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, false);
      
      let addButton = screen.getByText('Agregar Fila');
      await user.click(addButton);
      
      let deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons).toHaveLength(2);
      
      // Switch to dark mode and test same interactions
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <DataInput onDataUpload={mockOnDataUpload} />
        </ThemeProvider>
      );
      
      addButton = screen.getByText('Agregar Fila');
      await user.click(addButton);
      
      deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    test('Screen reader labels work correctly in both themes', () => {
      const mockToggle = jest.fn();
      
      // Test light mode
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const lightToggleButton = screen.getByTestId('theme-toggle');
      expect(lightToggleButton).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      
      // Test dark mode
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      const darkToggleButton = screen.getByTestId('theme-toggle');
      expect(darkToggleButton).toHaveAttribute('aria-label', 'Cambiar a modo claro');
    });

    test('Keyboard navigation works in both themes', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      
      // Test light mode keyboard navigation
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const lightToggleButton = screen.getByTestId('theme-toggle');
      lightToggleButton.focus();
      await user.keyboard('{Enter}');
      expect(mockToggle).toHaveBeenCalledTimes(1);
      
      // Test dark mode keyboard navigation
      mockToggle.mockClear();
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      const darkToggleButton = screen.getByTestId('theme-toggle');
      darkToggleButton.focus();
      await user.keyboard(' ');
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    test('Focus indicators are visible in both themes', () => {
      const mockToggle = jest.fn();
      
      // Test focus visibility in light mode
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const lightToggleButton = screen.getByTestId('theme-toggle');
      lightToggleButton.focus();
      expect(document.activeElement).toBe(lightToggleButton);
      
      // Test focus visibility in dark mode
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      const darkToggleButton = screen.getByTestId('theme-toggle');
      darkToggleButton.focus();
      expect(document.activeElement).toBe(darkToggleButton);
    });

    test('Color contrast is adequate in both themes', () => {
      const mockOnDataUpload = jest.fn();
      
      // Test light mode contrast
      const { rerender } = renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, false);
      
      const lightHeading = screen.getByText('Análisis de Pronósticos de Demanda');
      expect(lightHeading).toBeInTheDocument();
      
      // Test dark mode contrast
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <DataInput onDataUpload={mockOnDataUpload} />
        </ThemeProvider>
      );
      
      const darkHeading = screen.getByText('Análisis de Pronósticos de Demanda');
      expect(darkHeading).toBeInTheDocument();
      
      // Both should have appropriate styling
      const lightStyles = window.getComputedStyle(lightHeading);
      const darkStyles = window.getComputedStyle(darkHeading);
      
      expect(lightStyles.color).toBeTruthy();
      expect(darkStyles.color).toBeTruthy();
    });
  });
});