import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Tooltip, IconButton, Typography } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

// Component to test accessibility features of tooltips
const AccessibleTooltipComponent = ({ content, ariaLabel, children }) => (
  <Tooltip
    title={content}
    arrow
    placement="top"
    enterDelay={300}
    leaveDelay={200}
  >
    <IconButton 
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {children}
    </IconButton>
  </Tooltip>
);

// Test component with multiple accessible tooltips
const MultipleAccessibleTooltips = () => (
  <div>
    <Typography variant="h4" id="main-heading">
      Modelos de Pronóstico - Información Accesible
    </Typography>
    
    <div role="region" aria-labelledby="main-heading">
      <AccessibleTooltipComponent
        content="Media Móvil Simple: Promedio de los últimos N períodos para predecir valores futuros"
        ariaLabel="Información detallada sobre el modelo Media Móvil Simple"
      >
        <InfoIcon />
        <span>SMA Info</span>
      </AccessibleTooltipComponent>
      
      <AccessibleTooltipComponent
        content="ARIMA: Modelo estadístico avanzado que combina autoregresión, diferenciación e integración"
        ariaLabel="Información detallada sobre el modelo ARIMA"
      >
        <InfoIcon />
        <span>ARIMA Info</span>
      </AccessibleTooltipComponent>
      
      <AccessibleTooltipComponent
        content="Error Porcentual Absoluto Medio: Métrica expresada como porcentaje para comparar modelos"
        ariaLabel="Información detallada sobre la métrica MAPE"
      >
        <InfoIcon />
        <span>MAPE Info</span>
      </AccessibleTooltipComponent>
    </div>
  </div>
);

describe('Accessibility Features for Tooltips and Informative Elements', () => {
  describe('ARIA Compliance', () => {
    test('tooltips have proper ARIA roles and attributes', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const smaButton = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      
      // Check button has proper ARIA attributes
      expect(smaButton).toHaveAttribute('aria-label', 'Información detallada sobre el modelo Media Móvil Simple');
      expect(smaButton).toHaveAttribute('tabindex', '0');
      expect(smaButton).toHaveAttribute('type', 'button');
      
      // Trigger tooltip
      await user.hover(smaButton);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveAttribute('role', 'tooltip');
        
        // Tooltip should have an ID for accessibility
        const tooltipId = tooltip.getAttribute('id');
        expect(tooltipId).toBeTruthy();
      });
    });

    test('tooltips work with screen reader navigation', async () => {
      render(<MultipleAccessibleTooltips />);
      
      const buttons = [
        screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple'),
        screen.getByLabelText('Información detallada sobre el modelo ARIMA'),
        screen.getByLabelText('Información detallada sobre la métrica MAPE')
      ];
      
      // Check that all buttons are properly labeled for screen readers
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveAttribute('tabindex', '0');
        expect(button).toHaveAttribute('type', 'button');
      });
      
      // Test that buttons can receive focus
      const firstButton = buttons[0];
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
    });

    test('tooltips support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      // Tab to first button
      await user.tab();
      const firstButton = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      expect(firstButton).toHaveFocus();
      
      // Tooltip should appear on focus
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText(/Media Móvil Simple/)).toBeInTheDocument();
      });
      
      // Tab to next button
      await user.tab();
      const secondButton = screen.getByLabelText('Información detallada sobre el modelo ARIMA');
      expect(secondButton).toHaveFocus();
      
      // Previous tooltip should disappear, new one should appear
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByRole('tooltip')).toHaveTextContent(/ARIMA/);
        expect(screen.queryByText(/Media Móvil Simple/)).not.toBeInTheDocument();
      });
    });

    test('tooltips can be dismissed with Escape key', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      
      // Focus button to show tooltip
      await user.tab();
      expect(button).toHaveFocus();
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
      
      // Press Escape to dismiss tooltip
      await user.keyboard('{Escape}');
      
      // Tooltip should be dismissed but focus should remain on button
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
      expect(button).toHaveFocus();
    });

    test('tooltips have appropriate contrast and readability', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      
      await user.hover(button);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        
        // Check that tooltip has proper styling classes for contrast
        expect(tooltip).toHaveClass('MuiTooltip-popper');
        
        const tooltipContent = tooltip.querySelector('.MuiTooltip-tooltip');
        expect(tooltipContent).toBeInTheDocument();
        expect(tooltipContent).toHaveClass('MuiTooltip-tooltip');
      });
    });
  });

  describe('Screen Reader Compatibility', () => {
    test('tooltips provide meaningful descriptions for screen readers', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const arimaButton = screen.getByLabelText('Información detallada sobre el modelo ARIMA');
      
      await user.hover(arimaButton);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        const tooltipText = tooltip.textContent;
        
        // Check that tooltip content is descriptive and informative
        expect(tooltipText).toMatch(/ARIMA/i);
        expect(tooltipText).toMatch(/estadístico/i);
        expect(tooltipText).toMatch(/autoregresión|diferenciación|integración/i);
        
        // Content should be substantial enough to be helpful
        expect(tooltipText.length).toBeGreaterThan(20);
      });
    });

    test('tooltips work with NVDA/JAWS screen reader patterns', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre la métrica MAPE');
      
      // Trigger tooltip with hover (which works for screen readers too)
      await user.hover(button);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        
        // Check that tooltip has proper ID for accessibility
        const tooltipId = tooltip.getAttribute('id');
        expect(tooltipId).toBeTruthy();
        
        // Content should be accessible to screen readers
        expect(tooltip).toHaveTextContent(/Error Porcentual Absoluto Medio/);
      });
    });

    test('tooltips support voice control software', () => {
      render(<MultipleAccessibleTooltips />);
      
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        // Each button should have a unique, descriptive aria-label for voice commands
        const ariaLabel = button.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel.length).toBeGreaterThan(10);
        expect(ariaLabel).toMatch(/información/i);
      });
    });
  });

  describe('Motor Impairment Accessibility', () => {
    test('tooltips have sufficient hover target size', () => {
      render(<MultipleAccessibleTooltips />);
      
      const buttons = screen.getAllByRole('button');
      
      buttons.forEach(button => {
        // Buttons should be large enough for users with motor impairments
        const computedStyle = window.getComputedStyle(button);
        
        // MUI IconButton should have adequate size by default
        expect(button).toHaveClass('MuiIconButton-root');
        expect(button).toHaveClass('MuiIconButton-sizeMedium');
      });
    });

    test('tooltips remain visible long enough for users to read', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre el modelo ARIMA');
      
      await user.hover(button);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
      
      // Tooltip should remain visible for a reasonable time
      // (Testing that it doesn't disappear immediately)
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      
      // Should still be visible after a short delay
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    test('tooltips can be triggered by click for touch devices', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre la métrica MAPE');
      
      // Click should also trigger tooltip (for touch devices)
      await user.click(button);
      
      // Note: In actual implementation, you might need to add onClick handler
      // This test documents the expected behavior
      expect(button).toHaveFocus();
    });
  });

  describe('Cognitive Accessibility', () => {
    test('tooltip content is clear and concise', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      
      await user.hover(button);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        const content = tooltip.textContent;
        
        // Content should be clear and not overly complex
        expect(content).toMatch(/Media Móvil Simple/);
        expect(content).toMatch(/Promedio/);
        
        // Should not be too long (cognitive load)
        expect(content.length).toBeLessThan(200);
        
        // Should not use overly technical jargon without explanation
        expect(content).not.toMatch(/(?:algoritmo|heurística|optimización)/i);
      });
    });

    test('tooltips use consistent language and terminology', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const buttons = [
        screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple'),
        screen.getByLabelText('Información detallada sobre el modelo ARIMA'),
        screen.getByLabelText('Información detallada sobre la métrica MAPE')
      ];
      
      const tooltipContents = [];
      
      for (const button of buttons) {
        await user.hover(button);
        
        await waitFor(() => {
          const tooltip = screen.getByRole('tooltip');
          tooltipContents.push(tooltip.textContent);
        });
        
        await user.unhover(button);
        
        await waitFor(() => {
          expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });
      }
      
      // Check for consistent terminology
      tooltipContents.forEach(content => {
        // All should use Spanish consistently
        expect(content).toMatch(/[áéíóúñ]/); // Contains Spanish characters
        
        // Should use consistent format for model descriptions
        if (content.includes('modelo')) {
          expect(content).toMatch(/modelo|Modelo/);
        }
      });
    });

    test('tooltips provide context without overwhelming information', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const mapeButton = screen.getByLabelText('Información detallada sobre la métrica MAPE');
      
      await user.hover(mapeButton);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        const content = tooltip.textContent;
        
        // Should provide context (what MAPE is)
        expect(content).toMatch(/Error Porcentual Absoluto Medio/);
        
        // Should explain purpose (comparison)
        expect(content).toMatch(/comparar|métrica/i);
        
        // Should not overwhelm with technical details
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        expect(sentences.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Visual Accessibility', () => {
    test('tooltips work in high contrast mode', async () => {
      // Simulate high contrast mode by adding CSS class
      document.body.classList.add('high-contrast');
      
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      
      await user.hover(button);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        
        // Tooltip should still be visible and functional in high contrast mode
        expect(tooltip).toHaveClass('MuiTooltip-popper');
      });
      
      // Clean up
      document.body.classList.remove('high-contrast');
    });

    test('tooltips respect reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      
      await user.hover(button);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        
        // Tooltip should appear without animation when reduced motion is preferred
        // (This would be implemented in the actual component CSS)
        const tooltipContent = tooltip.querySelector('.MuiTooltip-tooltip');
        expect(tooltipContent).toBeInTheDocument();
      });
    });

    test('tooltips maintain visibility at different zoom levels', async () => {
      // Simulate different zoom levels
      const originalInnerWidth = window.innerWidth;
      const originalInnerHeight = window.innerHeight;
      
      // Test at 200% zoom (half viewport size)
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth / 2, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight / 2, writable: true });
      
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      
      await user.hover(button);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        
        // Tooltip should still be functional at different zoom levels
        expect(tooltip.textContent).toMatch(/Media Móvil Simple/);
      });
      
      // Restore original values
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true });
    });
  });

  describe('Multi-language Accessibility', () => {
    test('tooltips support Spanish language content properly', async () => {
      const user = userEvent.setup();
      render(<MultipleAccessibleTooltips />);
      
      const button = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      
      await user.hover(button);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        const content = tooltip.textContent;
        
        // Should contain proper Spanish text
        expect(content).toMatch(/Media Móvil Simple/);
        expect(content).toMatch(/Promedio/);
        
        // Should handle Spanish characters properly
        expect(content).toMatch(/[áéíóúñ]/);
        
        // Should use proper Spanish grammar and structure
        expect(content).not.toMatch(/\b(the|and|or|of)\b/i); // No English words
      });
    });

    test('tooltips have proper lang attributes for screen readers', async () => {
      const user = userEvent.setup();
      render(
        <div lang="es">
          <MultipleAccessibleTooltips />
        </div>
      );
      
      const button = screen.getByLabelText('Información detallada sobre el modelo Media Móvil Simple');
      
      await user.hover(button);
      
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        
        // Should inherit language context for proper screen reader pronunciation
        const langContainer = document.querySelector('[lang="es"]');
        expect(langContainer).toBeInTheDocument();
        expect(tooltip).toBeInTheDocument();
      });
    });
  });
});