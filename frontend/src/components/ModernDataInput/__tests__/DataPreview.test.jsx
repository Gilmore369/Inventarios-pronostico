import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataPreview from '../DataPreview';

describe('DataPreview Component', () => {
  const mockData = [
    { month: '2024-01', demand: 100 },
    { month: '2024-02', demand: 150 },
    { month: '2024-03', demand: 200 },
    { month: '2024-04', demand: 175 },
    { month: '2024-05', demand: 225 },
    { month: '2024-06', demand: 300 }
  ];

  const mockMetadata = {
    columnFound: 'demanda'
  };

  const mockProps = {
    data: mockData,
    metadata: mockMetadata,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders data preview with statistics', () => {
    render(<DataPreview {...mockProps} />);
    
    expect(screen.getByText('Vista Previa de Datos')).toBeInTheDocument();
    expect(screen.getByText('Total de registros: 6')).toBeInTheDocument();
    expect(screen.getByText('Registros válidos: 6')).toBeInTheDocument();
    expect(screen.getByText('Columna detectada: "demanda"')).toBeInTheDocument();
  });

  test('displays first 5 rows in preview table', () => {
    render(<DataPreview {...mockProps} />);
    
    expect(screen.getByText('2024-01')).toBeInTheDocument();
    expect(screen.getByText('2024-02')).toBeInTheDocument();
    expect(screen.getByText('2024-03')).toBeInTheDocument();
    expect(screen.getByText('2024-04')).toBeInTheDocument();
    expect(screen.getByText('2024-05')).toBeInTheDocument();
    expect(screen.queryByText('2024-06')).not.toBeInTheDocument(); // 6th row should not be visible
  });

  test('shows date range correctly', () => {
    render(<DataPreview {...mockProps} />);
    
    expect(screen.getByText('Período: 2024-01 - 2024-06')).toBeInTheDocument();
  });

  test('displays demand statistics', () => {
    render(<DataPreview {...mockProps} />);
    
    expect(screen.getByText('Demanda mín: 100')).toBeInTheDocument();
    expect(screen.getByText('Demanda máx: 300')).toBeInTheDocument();
    expect(screen.getByText('Promedio: 192')).toBeInTheDocument(); // (100+150+200+175+225+300)/6 = 191.67 -> 192
  });

  test('calls onConfirm when confirm button is clicked', () => {
    render(<DataPreview {...mockProps} />);
    
    const confirmButton = screen.getByText('Confirmar y Procesar');
    fireEvent.click(confirmButton);
    
    expect(mockProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when cancel button is clicked', () => {
    render(<DataPreview {...mockProps} />);
    
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onCancel).toHaveBeenCalledTimes(1);
  });

  test('handles empty data gracefully', () => {
    render(<DataPreview {...mockProps} data={[]} />);
    
    expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument();
  });

  test('handles invalid demand values', () => {
    const dataWithInvalidValues = [
      { month: '2024-01', demand: 100 },
      { month: '2024-02', demand: null },
      { month: '2024-03', demand: 'invalid' },
      { month: '2024-04', demand: 200 }
    ];

    render(<DataPreview {...mockProps} data={dataWithInvalidValues} />);
    
    expect(screen.getByText('Total de registros: 4')).toBeInTheDocument();
    expect(screen.getByText('Registros válidos: 2')).toBeInTheDocument();
    expect(screen.getByText('Registros inválidos: 2')).toBeInTheDocument();
  });

  test('disables buttons when loading', () => {
    render(<DataPreview {...mockProps} loading={true} />);
    
    const confirmButton = screen.getByText('Confirmar y Procesar');
    const cancelButton = screen.getByText('Cancelar');
    
    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});