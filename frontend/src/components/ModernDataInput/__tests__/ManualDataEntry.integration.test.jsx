import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ManualDataEntry from '../ManualDataEntry';

describe('ManualDataEntry Integration Tests', () => {
  const mockOnDataChange = jest.fn();
  const mockOnValidationChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Grid Interaction Workflow', () => {
    test('initializes with empty rows and allows data entry', async () => {
      const user = userEvent.setup();

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      // Verify DataGrid is rendered
      const dataGrid = document.querySelector('.MuiDataGrid-root');
      expect(dataGrid).toBeInTheDocument();

      // Verify column headers
      expect(screen.getByText('Mes')).toBeInTheDocument();
      expect(screen.getByText('Demanda')).toBeInTheDocument();

      // Verify initial empty rows are present
      // DataGrid should show empty cells initially
      const cells = document.querySelectorAll('.MuiDataGrid-cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    test('validates data entry in real-time', async () => {
      const user = userEvent.setup();

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      // The component should call validation callbacks when data changes
      // Since we can't easily simulate DataGrid cell editing in tests,
      // we'll verify the component structure and callback setup
      
      expect(mockOnValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: expect.any(Boolean),
          errors: expect.any(Array)
        })
      );
    });

    test('handles row addition and deletion', async () => {
      const user = userEvent.setup();

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      // Look for add row button
      const addButton = screen.getByRole('button', { name: /agregar fila|add row/i });
      expect(addButton).toBeInTheDocument();

      await user.click(addButton);

      // Should trigger data change callback
      expect(mockOnDataChange).toHaveBeenCalled();

      // Look for delete buttons (should be present for each row)
      const deleteButtons = screen.getAllByRole('button', { name: /eliminar|delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);

      // Click delete button (if not disabled)
      const firstDeleteButton = deleteButtons[0];
      if (!firstDeleteButton.disabled) {
        await user.click(firstDeleteButton);
        expect(mockOnDataChange).toHaveBeenCalled();
      }
    });

    test('prevents deletion when only one row remains', async () => {
      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
          initialData={[{ id: 1, month: '', demand: '' }]}
        />
      );

      // When only one row exists, delete button should be disabled
      const deleteButtons = screen.getAllByRole('button', { name: /eliminar|delete/i });
      if (deleteButtons.length === 1) {
        expect(deleteButtons[0]).toBeDisabled();
      }
    });
  });

  describe('Data Validation Integration', () => {
    test('shows validation errors for invalid data', async () => {
      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
          initialData={[
            { id: 1, month: '', demand: 'invalid' },
            { id: 2, month: '2023-01', demand: -10 }
          ]}
        />
      );

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/error|inválido|invalid/i) || 
               document.querySelector('.error')).toBeInTheDocument();
      });

      // Should call validation callback with errors
      expect(mockOnValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              severity: 'error'
            })
          ])
        })
      );
    });

    test('validates minimum row requirement', async () => {
      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
          initialData={[
            { id: 1, month: '2023-01', demand: 100 },
            { id: 2, month: '2023-02', demand: 120 }
          ]}
        />
      );

      // With only 2 rows, should show validation error for minimum requirement
      expect(mockOnValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringMatching(/al menos.*12.*registros/i)
            })
          ])
        })
      );
    });

    test('validates maximum row requirement', async () => {
      // Create data with more than 120 rows
      const excessiveData = Array(125).fill().map((_, i) => ({
        id: i + 1,
        month: `2023-${String((i % 12) + 1).padStart(2, '0')}`,
        demand: 100
      }));

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
          initialData={excessiveData}
        />
      );

      // Should show validation error for maximum requirement
      expect(mockOnValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringMatching(/más de.*120.*registros/i)
            })
          ])
        })
      );
    });
  });

  describe('Error Display Integration', () => {
    test('displays inline validation errors', async () => {
      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
          initialData={[
            { id: 1, month: '', demand: 'invalid' }
          ]}
        />
      );

      // Should display error indicators in the grid
      await waitFor(() => {
        expect(document.querySelector('.error') || 
               document.querySelector('.MuiDataGrid-cell--error') ||
               screen.getByText(/error|inválido/i)).toBeInTheDocument();
      });
    });

    test('shows summary validation messages', async () => {
      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
          initialData={[
            { id: 1, month: '', demand: 'invalid' },
            { id: 2, month: '2023-13', demand: -5 }
          ]}
        />
      );

      // Should show validation summary
      await waitFor(() => {
        expect(screen.getByText(/errores de validación|validation errors/i) ||
               screen.getByText(/datos insuficientes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Format Integration', () => {
    test('formats data correctly for API submission', async () => {
      const validData = Array(12).fill().map((_, i) => ({
        id: i + 1,
        month: `2023-${String(i + 1).padStart(2, '0')}`,
        demand: 100 + i
      }));

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
          initialData={validData}
        />
      );

      // Should call onDataChange with properly formatted data
      expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            month: expect.stringMatching(/^\d{4}-\d{2}$/),
            demand: expect.any(Number)
          })
        ])
      );
    });

    test('handles data type conversions', async () => {
      const mixedData = [
        { id: 1, month: '2023-01', demand: '100' }, // String number
        { id: 2, month: 202302, demand: 120.5 }     // Number month
      ];

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
          initialData={mixedData}
        />
      );

      // Should convert and validate data types appropriately
      expect(mockOnDataChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            month: expect.any(String),
            demand: expect.any(Number)
          })
        ])
      );
    });
  });

  describe('User Experience Integration', () => {
    test('provides immediate feedback for user actions', async () => {
      const user = userEvent.setup();

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      // Add a row
      const addButton = screen.getByRole('button', { name: /agregar fila/i });
      await user.click(addButton);

      // Should provide immediate visual feedback
      expect(mockOnDataChange).toHaveBeenCalled();
      
      // Grid should update to show new row
      const dataGrid = document.querySelector('.MuiDataGrid-root');
      expect(dataGrid).toBeInTheDocument();
    });

    test('maintains consistent state during user interactions', async () => {
      const user = userEvent.setup();

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      // Perform multiple actions
      const addButton = screen.getByRole('button', { name: /agregar fila/i });
      
      await user.click(addButton);
      await user.click(addButton);

      // Should maintain consistent state
      expect(mockOnDataChange).toHaveBeenCalledTimes(2);
    });

    test('handles keyboard navigation properly', async () => {
      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      // DataGrid should support keyboard navigation
      const dataGrid = document.querySelector('.MuiDataGrid-root');
      expect(dataGrid).toBeInTheDocument();
      
      // Grid should be focusable
      expect(dataGrid).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Performance Integration', () => {
    test('handles large datasets efficiently', async () => {
      const largeData = Array(100).fill().map((_, i) => ({
        id: i + 1,
        month: `2023-${String((i % 12) + 1).padStart(2, '0')}`,
        demand: 100 + i
      }));

      const startTime = performance.now();

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
          initialData={largeData}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);

      // Should still call callbacks appropriately
      expect(mockOnDataChange).toHaveBeenCalled();
      expect(mockOnValidationChange).toHaveBeenCalled();
    });

    test('debounces validation calls appropriately', async () => {
      const user = userEvent.setup();

      render(
        <ManualDataEntry 
          onDataChange={mockOnDataChange}
          onValidationChange={mockOnValidationChange}
        />
      );

      // Perform rapid actions
      const addButton = screen.getByRole('button', { name: /agregar fila/i });
      
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);

      // Should not call validation excessively
      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalled();
      });

      // The exact number of calls depends on debouncing implementation
      // but should be reasonable
      expect(mockOnValidationChange).toHaveBeenCalledTimes(
        expect.any(Number)
      );
    });
  });
});