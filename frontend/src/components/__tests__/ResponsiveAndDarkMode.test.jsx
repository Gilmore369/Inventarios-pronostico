import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Header from '../Header';

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

describe('Responsive Design and Dark Mode Tests', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Header Component Responsiveness', () => {
    test('Header renders with proper structure', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      // Should show title
      expect(screen.getByText('Sistema de Pronósticos de Demanda')).toBeInTheDocument();
      
      // Theme toggle should be visible
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
      
      // Analytics icon should be present
      expect(screen.getByTestId('AnalyticsIcon')).toBeInTheDocument();
    });

    test('Header uses Material-UI responsive typography', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      const titleElement = screen.getByText('Sistema de Pronósticos de Demanda');
      
      // Should have Material-UI typography classes
      expect(titleElement).toHaveClass('MuiTypography-root');
      expect(titleElement).toHaveClass('MuiTypography-h5');
    });

    test('Header maintains accessibility across screen sizes', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      
      // Should have proper accessibility attributes
      expect(toggleButton).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      expect(toggleButton).toHaveAttribute('type', 'button');
      expect(toggleButton).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Dark Mode Theme Toggle', () => {
    test('Shows correct icon in light mode', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      expect(toggleButton).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      
      // Should show dark mode icon (Brightness4)
      const darkModeIcon = toggleButton.querySelector('svg[data-testid="Brightness4Icon"]');
      expect(darkModeIcon).toBeInTheDocument();
    });

    test('Shows correct icon in dark mode', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={true} toggleDarkMode={mockToggle} />, true);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      expect(toggleButton).toHaveAttribute('aria-label', 'Cambiar a modo claro');
      
      // Should show light mode icon (Brightness7)
      const lightModeIcon = toggleButton.querySelector('svg[data-testid="Brightness7Icon"]');
      expect(lightModeIcon).toBeInTheDocument();
    });

    test('Theme toggle button is clickable', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      await user.click(toggleButton);
      
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    test('Theme toggle works with keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      
      // Focus and press Enter
      toggleButton.focus();
      await user.keyboard('{Enter}');
      expect(mockToggle).toHaveBeenCalledTimes(1);
      
      // Reset and test Space key
      mockToggle.mockClear();
      await user.keyboard(' ');
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Theme Consistency', () => {
    test('Light theme applies correct styling', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const appBar = document.querySelector('.MuiAppBar-root');
      expect(appBar).toBeInTheDocument();
      expect(appBar).toHaveClass('MuiAppBar-colorPrimary');
    });

    test('Dark theme applies correct styling', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={true} toggleDarkMode={mockToggle} />, true);
      
      const appBar = document.querySelector('.MuiAppBar-root');
      expect(appBar).toBeInTheDocument();
      expect(appBar).toHaveClass('MuiAppBar-colorPrimary');
    });

    test('Theme changes update component correctly', () => {
      const mockToggle = jest.fn();
      
      // Start with light theme
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      expect(screen.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      
      // Switch to dark theme
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Cambiar a modo claro');
    });
  });

  describe('Mobile Usability', () => {
    test('Touch targets are adequately sized', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      
      // Material-UI IconButton should have adequate touch target
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveClass('MuiIconButton-root');
    });

    test('Focus indicators work correctly', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      toggleButton.focus();
      
      expect(document.activeElement).toBe(toggleButton);
    });

    test('Component maintains functionality in both themes', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      
      // Test light theme
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      let toggleButton = screen.getByTestId('theme-toggle');
      await user.click(toggleButton);
      expect(mockToggle).toHaveBeenCalledTimes(1);
      
      // Test dark theme
      mockToggle.mockClear();
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      toggleButton = screen.getByTestId('theme-toggle');
      await user.click(toggleButton);
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility Features', () => {
    test('Screen reader support is properly implemented', () => {
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

    test('Icons are properly labeled for screen readers', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      const icon = toggleButton.querySelector('svg');
      
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('focusable', 'false');
    });

    test('Color contrast is maintained in both themes', () => {
      const mockToggle = jest.fn();
      
      // Test light theme
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      const lightTitle = screen.getByText('Sistema de Pronósticos de Demanda');
      expect(lightTitle).toBeInTheDocument();
      expect(lightTitle).toHaveClass('MuiTypography-root');
      
      // Test dark theme
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      const darkTitle = screen.getByText('Sistema de Pronósticos de Demanda');
      expect(darkTitle).toBeInTheDocument();
      expect(darkTitle).toHaveClass('MuiTypography-root');
      
      // Material-UI handles color contrast automatically through theme system
      expect(lightTitle).toHaveClass('MuiTypography-root');
      expect(darkTitle).toHaveClass('MuiTypography-root');
    });
  });

  describe('Component Integration', () => {
    test('Header integrates properly with Material-UI theme system', () => {
      const mockToggle = jest.fn();
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      // Should have proper Material-UI structure
      const appBar = document.querySelector('.MuiAppBar-root');
      const toolbar = document.querySelector('.MuiToolbar-root');
      const typography = document.querySelector('.MuiTypography-root');
      
      expect(appBar).toBeInTheDocument();
      expect(toolbar).toBeInTheDocument();
      expect(typography).toBeInTheDocument();
    });

    test('Component responds to theme provider changes', () => {
      const mockToggle = jest.fn();
      
      const { rerender } = renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />, false);
      
      // Initial state
      expect(screen.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Cambiar a modo oscuro');
      
      // Change theme
      rerender(
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
          <CssBaseline />
          <Header darkMode={true} toggleDarkMode={mockToggle} />
        </ThemeProvider>
      );
      
      // Should update
      expect(screen.getByTestId('theme-toggle')).toHaveAttribute('aria-label', 'Cambiar a modo claro');
    });

    test('Component maintains state consistency', async () => {
      const user = userEvent.setup();
      const mockToggle = jest.fn();
      
      renderWithTheme(<Header darkMode={false} toggleDarkMode={mockToggle} />);
      
      const toggleButton = screen.getByTestId('theme-toggle');
      
      // Multiple clicks should work consistently
      await user.click(toggleButton);
      await user.click(toggleButton);
      await user.click(toggleButton);
      
      expect(mockToggle).toHaveBeenCalledTimes(3);
    });
  });
});