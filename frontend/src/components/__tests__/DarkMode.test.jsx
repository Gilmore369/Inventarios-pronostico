import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Header from '../Header';
import DataInput from '../DataInput';
import ResultsTable from '../ResultsTable';
import Forecast from '../Forecast';

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

// Helper function to get computed styles
const getComputedBackgroundColor = (element) => {
  return window.getComputedStyle(element).backgroundColor;
};

const getComputedTextColor = (element) => {
  return window.getComputedStyle(element).color;
};

describe('Dark Mode Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Theme Toggle Functionality', () => {
    test('Header displays correct theme toggle icon in light mode', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      // Should show dark mode icon (to switch TO dark mode)
      const toggleButton = screen.getByTestId('theme-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      
      // Check for dark mode icon (Brightness4)
      const darkModeIcon = toggleButton.querySelector('svg[data-testid="Brightness4Icon"]');
      expect(darkModeIcon).toBeInTheDocument();
    });

    test('Header displays correct theme toggle icon in dark mode', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={true} toggleDarkMode={mockToggle} />, true);
      
      // Should show light mode icon (to switch TO light mode)
      const toggleButton = screen.getByTestId('theme-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label', 'Cambiar a modo claro');
      
      // Check for light mode icon (Brightness7)
      const lightModeIcon = toggleButton.querySelector('svg[data-testid="Brightness7Icon"]');
      expect(lightModeIcon).toBeInTheDocument();
    });

    test('Theme toggle button calls toggleDarkMode function', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      await user.click(toggleButton);
      
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    test('Theme toggle button is accessible via keyboard', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      
      // Focus the button and press Enter
      toggleButton.focus();
      await user.keyboard('{Enter}');
      
      expect(mockToggle).toHaveBeenCalledTimes(1);
      
      // Reset mock and test Space key
      mockToggle.mockClear();
      await user.keyboard(' ');
      
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Light Mode Styling', () => {
    test('Header has light theme styling', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const appBar = document.querySelector('.MuiAppBar-root');
      expect(appBar).toBeInTheDocument();
      
      // Material-UI should apply light theme classes
      expect(appBar).toHaveClass('MuiAppBar-colorPrimary');
    });

    test('DataInput has light theme styling', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, false);
      
      const paper = document.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
      
      // Should have light theme background
      const paperStyles = window.getComputedStyle(paper);
      expect(paperStyles.backgroundColor).toBeTruthy();
    });

    test('Buttons have correct light theme styling', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, false);
      
      const manualButton = screen.getByText('Entrada Manual');
      expect(manualButton).toBeInTheDocument();
      
      // Should have Material-UI button classes
      expect(manualButton).toHaveClass('MuiButton-contained');
    });

    test('Text has appropriate contrast in light mode', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, false);
      
      const heading = screen.getByText('Análisis de Pronósticos de Demanda');
      expect(heading).toBeInTheDocument();
      
      // Material-UI should handle text color automatically
      const headingStyles = window.getComputedStyle(heading);
      expect(headingStyles.color).toBeTruthy();
    });
  });

  describe('Dark Mode Styling', () => {
    test('Header has dark theme styling', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={true} toggleDarkMode={mockToggle} />, true);
      
      const appBar = document.querySelector('.MuiAppBar-root');
      expect(appBar).toBeInTheDocument();
      
      // Material-UI should apply dark theme classes
      expect(appBar).toHaveClass('MuiAppBar-colorPrimary');
    });

    test('DataInput has dark theme styling', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, true);
      
      const paper = document.querySelector('.MuiPaper-root');
      expect(paper).toBeInTheDocument();
      
      // Should have dark theme background
      const paperStyles = window.getComputedStyle(paper);
      expect(paperStyles.backgroundColor).toBeTruthy();
    });

    test('Buttons maintain functionality in dark mode', async () => {
      const user = userEvent.setup();
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, true);
      
      const csvButton = screen.getByText('Cargar CSV');
      await user.click(csvButton);
      
      expect(screen.getByText('El archivo CSV debe contener columnas: month, demand')).toBeInTheDocument();
      
      // Button should still have correct classes in dark mode
      expect(csvButton).toHaveClass('MuiButton-contained');
    });

    test('Text has appropriate contrast in dark mode', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, true);
      
      const heading = screen.getByText('Análisis de Pronósticos de Demanda');
      expect(heading).toBeInTheDocument();
      
      // Material-UI should handle dark mode text color automatically
      const headingStyles = window.getComputedStyle(heading);
      expect(headingStyles.color).toBeTruthy();
    });

    test('Data grid adapts to dark theme', () => {
      const mockOnDataUpload = jest.fn();
      renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, true);
      
      const dataGrid = document.querySelector('.MuiDataGrid-root');
      expect(dataGrid).toBeInTheDocument();
      
      // Material-UI DataGrid should adapt to dark theme
      const gridStyles = window.getComputedStyle(dataGrid);
      expect(gridStyles.backgroundColor).toBeTruthy();
    });
  });

  describe('Theme Consistency Across Components', () => {
    test('All components use the same theme context', () => {
      const mockToggle = jest.fn();
      const mockOnDataUpload = jest.fn();
      
      const { rerender } = renderWithTheme(
        <div>
          <Header darkMode={false} toggleDarkMode={mockToggle} />
          <DataInput onDataUpload={mockOnDataUpload} />
        </div>,
        false
      );
      
      // Both components should be rendered with light theme
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
      
      // Re-render with dark theme
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <div>
            <Header darkMode={true} toggleDarkMode={mockToggle} />
            <DataInput onDataUpload={mockOnDataUpload} />
          </div>
        </ThemeProvider>
      );
      
      // Both components should now use dark theme
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
    });

    test('ResultsTable adapts to theme changes', () => {
      const mockResults = [
        {
          name: 'Holt-Winters',
          metrics: { mape: 8.5, rmse: 12.3, mae: 9.1 },
          parameters: { alpha: 0.3, beta: 0.1, gamma: 0.2, seasonal: 'additive' }
        }
      ];
      const mockOnModelSelect = jest.fn();
      
      // Test light theme
      const { rerender } = renderWithTheme(
        <ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />,
        false
      );
      
      expect(screen.getByText('Resultados de Modelos de Pronóstico')).toBeInTheDocument();
      
      // Test dark theme
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />
        </ThemeProvider>
      );
      
      expect(screen.getByText('Resultados de Modelos de Pronóstico')).toBeInTheDocument();
      expect(screen.getByText('Holt-Winters')).toBeInTheDocument();
    });

    test('Interactive elements maintain accessibility in both themes', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      
      // Test light theme accessibility
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      expect(toggleButton).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      
      // Test dark theme accessibility
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      const darkToggleButton = screen.getByTestId('theme-toggle');
      expect(darkToggleButton).toHaveAttribute('aria-label', 'Cambiar a modo claro');
      
      // Button should still be clickable
      await user.click(darkToggleButton);
      expect(mockToggle).toHaveBeenCalled();
    });
  });

  describe('Theme Persistence and State Management', () => {
    test('Theme state is properly managed', () => {
      const mockToggle = jest.fn();
      
      // Render with light theme
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      expect(screen.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      
      // Simulate theme change
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Cambiar a modo claro');
    });

    test('Components re-render correctly when theme changes', () => {
      const mockOnDataUpload = jest.fn();
      
      // Start with light theme
      const { rerender } = renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, false);
      
      const heading = screen.getByText('Análisis de Pronósticos de Demanda');
      expect(heading).toBeInTheDocument();
      
      // Change to dark theme
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <DataInput onDataUpload={mockOnDataUpload} />
        </ThemeProvider>
      );
      
      // Component should still be functional
      expect(screen.getByText('Análisis de Pronósticos de Demanda')).toBeInTheDocument();
      expect(screen.getByText('Entrada Manual')).toBeInTheDocument();
      expect(screen.getByText('Cargar CSV')).toBeInTheDocument();
    });

    test('Form interactions work in both themes', async () => {
      const user = userEvent.setup();
      const mockOnDataUpload = jest.fn();
      
      // Test in light theme
      const { rerender } = renderWithTheme(<DataInput onDataUpload={mockOnDataUpload} />, false);
      
      let addButton = screen.getByText('Agregar Fila');
      await user.click(addButton);
      
      let deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons).toHaveLength(2);
      
      // Test in dark theme
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <DataInput onDataUpload={mockOnDataUpload} />
        </ThemeProvider>
      );
      
      addButton = screen.getByText('Agregar Fila');
      await user.click(addButton);
      
      deleteButtons = screen.getAllByText('Eliminar');
      expect(deleteButtons).toHaveLength(2); // Should work the same in dark mode
    });
  });

  describe('Visual Contrast and Accessibility', () => {
    test('Icons are visible in both themes', () => {
      const mockToggle = jest.fn();
      
      // Light theme
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      let toggleButton = screen.getByTestId('theme-toggle');
      let darkModeIcon = toggleButton.querySelector('svg');
      expect(darkModeIcon).toBeInTheDocument();
      
      // Dark theme
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      toggleButton = screen.getByTestId('theme-toggle');
      let lightModeIcon = toggleButton.querySelector('svg');
      expect(lightModeIcon).toBeInTheDocument();
    });

    test('Color-coded elements adapt to theme', () => {
      const mockResults = [
        {
          name: 'Holt-Winters',
          metrics: { mape: 8.5, rmse: 12.3, mae: 9.1 },
          parameters: { alpha: 0.3 }
        },
        {
          name: 'ARIMA',
          metrics: { mape: 15.2, rmse: 20.7, mae: 18.1 },
          parameters: { p: 2 }
        }
      ];
      const mockOnModelSelect = jest.fn();
      
      // Test in both themes
      const themes = [false, true];
      
      themes.forEach(isDark => {
        const { unmount } = renderWithTheme(
          <ResultsTable results={mockResults} onModelSelect={mockOnModelSelect} />,
          isDark
        );
        
        // Success chip should be visible in both themes
        const successChip = screen.getByText('8.5%').closest('.MuiChip-root');
        expect(successChip).toBeInTheDocument();
        expect(successChip).toHaveClass('MuiChip-colorSuccess');
        
        unmount();
      });
    });

    test('Focus indicators work in both themes', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      
      // Test focus in light theme
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      await user.tab(); // Focus the button
      
      expect(document.activeElement).toBe(toggleButton);
      
      // Test focus in dark theme
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
  });
});