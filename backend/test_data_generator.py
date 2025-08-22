"""
Generador de datos de prueba sintéticos para validación de modelos de pronóstico.

Este módulo proporciona funciones para generar diferentes tipos de datos sintéticos
que permiten probar los modelos de pronóstico bajo condiciones controladas.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')


class TestDataGenerator:
    """
    Generador de datos de prueba sintéticos para modelos de pronóstico.
    
    Proporciona métodos para generar datos con diferentes características:
    - Tendencias lineales y exponenciales
    - Patrones estacionales (mensual, trimestral, anual)
    - Datos estacionarios con ruido
    - Datos con outliers y valores faltantes
    """
    
    def __init__(self, random_seed: int = 42):
        """
        Inicializa el generador con una semilla aleatoria para reproducibilidad.
        
        Args:
            random_seed: Semilla para el generador de números aleatorios
        """
        self.random_seed = random_seed
        np.random.seed(random_seed)
    
    def generate_trend_data(self, 
                          length: int, 
                          trend_type: str = 'linear',
                          trend_slope: float = 1.0,
                          base_value: float = 100.0,
                          noise_level: float = 0.1) -> List[float]:
        """
        Genera datos con tendencia lineal o exponencial.
        
        Args:
            length: Número de puntos de datos a generar
            trend_type: Tipo de tendencia ('linear' o 'exponential')
            trend_slope: Pendiente de la tendencia
            base_value: Valor base de la serie
            noise_level: Nivel de ruido (0.0 = sin ruido, 1.0 = mucho ruido)
            
        Returns:
            Lista de valores con tendencia
        """
        if length < 12:
            raise ValueError("La longitud mínima debe ser 12 meses")
        
        t = np.arange(length)
        
        if trend_type == 'linear':
            # Tendencia lineal: y = base + slope * t
            trend = base_value + trend_slope * t
        elif trend_type == 'exponential':
            # Tendencia exponencial: y = base * exp(slope * t / length)
            trend = base_value * np.exp(trend_slope * t / length)
        else:
            raise ValueError("trend_type debe ser 'linear' o 'exponential'")
        
        # Añadir ruido
        if noise_level > 0:
            noise = np.random.normal(0, noise_level * np.mean(trend), length)
            trend += noise
        
        # Asegurar valores positivos
        trend = np.maximum(trend, 0.1)
        
        return trend.tolist()
    
    def generate_seasonal_data(self,
                             length: int,
                             seasonal_period: int = 12,
                             seasonal_amplitude: float = 20.0,
                             base_value: float = 100.0,
                             noise_level: float = 0.1) -> List[float]:
        """
        Genera datos con patrones estacionales.
        
        Args:
            length: Número de puntos de datos a generar
            seasonal_period: Período estacional (12=mensual, 4=trimestral, etc.)
            seasonal_amplitude: Amplitud de la variación estacional
            base_value: Valor base de la serie
            noise_level: Nivel de ruido
            
        Returns:
            Lista de valores con estacionalidad
        """
        if length < seasonal_period * 2:
            raise ValueError(f"La longitud debe ser al menos {seasonal_period * 2} para capturar estacionalidad")
        
        t = np.arange(length)
        
        # Componente estacional sinusoidal
        seasonal = seasonal_amplitude * np.sin(2 * np.pi * t / seasonal_period)
        
        # Serie base con estacionalidad
        data = base_value + seasonal
        
        # Añadir ruido
        if noise_level > 0:
            noise = np.random.normal(0, noise_level * base_value, length)
            data += noise
        
        # Asegurar valores positivos
        data = np.maximum(data, 0.1)
        
        return data.tolist()
    
    def generate_stationary_data(self,
                               length: int,
                               mean_value: float = 100.0,
                               noise_level: float = 0.2,
                               ar_coefficient: float = 0.0) -> List[float]:
        """
        Genera datos estacionarios con diferentes niveles de ruido.
        
        Args:
            length: Número de puntos de datos a generar
            mean_value: Valor medio de la serie
            noise_level: Nivel de ruido (desviación estándar relativa)
            ar_coefficient: Coeficiente autoregresivo (0.0 = ruido blanco, 0.9 = alta correlación)
            
        Returns:
            Lista de valores estacionarios
        """
        if length < 12:
            raise ValueError("La longitud mínima debe ser 12 meses")
        
        # Generar ruido blanco
        noise = np.random.normal(0, noise_level * mean_value, length)
        
        # Inicializar serie
        data = np.zeros(length)
        data[0] = mean_value + noise[0]
        
        # Generar proceso AR(1) si se especifica coeficiente
        for i in range(1, length):
            data[i] = mean_value + ar_coefficient * (data[i-1] - mean_value) + noise[i]
        
        # Asegurar valores positivos
        data = np.maximum(data, 0.1)
        
        return data.tolist()
    
    def generate_outlier_data(self,
                            base_data: List[float],
                            outlier_percentage: float = 0.05,
                            outlier_magnitude: float = 3.0) -> List[float]:
        """
        Añade outliers a una serie de datos existente.
        
        Args:
            base_data: Serie de datos base
            outlier_percentage: Porcentaje de puntos que serán outliers (0.0-1.0)
            outlier_magnitude: Magnitud de los outliers (múltiplo de la desviación estándar)
            
        Returns:
            Lista de valores con outliers añadidos
        """
        data = np.array(base_data.copy())
        n_outliers = int(len(data) * outlier_percentage)
        
        if n_outliers == 0:
            return data.tolist()
        
        # Seleccionar posiciones aleatorias para outliers
        outlier_positions = np.random.choice(len(data), n_outliers, replace=False)
        
        # Calcular estadísticas de la serie
        mean_val = np.mean(data)
        std_val = np.std(data)
        
        # Si la desviación estándar es 0 (datos constantes), usar un valor por defecto
        if std_val == 0:
            std_val = mean_val * 0.1  # 10% del valor medio como desviación por defecto
        
        # Añadir outliers (tanto positivos como negativos)
        for pos in outlier_positions:
            # Usar la semilla para hacer determinístico el comportamiento
            np.random.seed(self.random_seed + pos)
            if np.random.random() > 0.5:
                # Outlier positivo
                data[pos] = mean_val + outlier_magnitude * std_val
            else:
                # Outlier negativo (pero manteniendo valores positivos)
                data[pos] = max(0.1, mean_val - outlier_magnitude * std_val)
        
        # Restaurar la semilla original
        np.random.seed(self.random_seed)
        
        return data.tolist()
    
    def generate_missing_values_data(self,
                                   base_data: List[float],
                                   missing_percentage: float = 0.1) -> Tuple[List[float], List[int]]:
        """
        Introduce valores faltantes en una serie de datos.
        
        Args:
            base_data: Serie de datos base
            missing_percentage: Porcentaje de valores faltantes (0.0-1.0)
            
        Returns:
            Tupla con (datos con NaN, índices de valores faltantes)
        """
        data = np.array(base_data.copy(), dtype=float)
        n_missing = int(len(data) * missing_percentage)
        
        if n_missing == 0:
            return data.tolist(), []
        
        # Seleccionar posiciones aleatorias para valores faltantes
        missing_positions = np.random.choice(len(data), n_missing, replace=False)
        
        # Introducir NaN en las posiciones seleccionadas
        data[missing_positions] = np.nan
        
        return data.tolist(), missing_positions.tolist()
    
    def generate_complex_pattern_data(self,
                                    length: int,
                                    base_value: float = 100.0,
                                    trend_slope: float = 0.5,
                                    seasonal_amplitude: float = 15.0,
                                    seasonal_period: int = 12,
                                    noise_level: float = 0.1,
                                    outlier_percentage: float = 0.02) -> Dict[str, any]:
        """
        Genera datos con patrones complejos combinando tendencia, estacionalidad, ruido y outliers.
        
        Args:
            length: Número de puntos de datos a generar
            base_value: Valor base de la serie
            trend_slope: Pendiente de la tendencia
            seasonal_amplitude: Amplitud de la variación estacional
            seasonal_period: Período estacional
            noise_level: Nivel de ruido
            outlier_percentage: Porcentaje de outliers
            
        Returns:
            Diccionario con datos y componentes separados
        """
        if length < seasonal_period * 2:
            raise ValueError(f"La longitud debe ser al menos {seasonal_period * 2}")
        
        t = np.arange(length)
        
        # Componente de tendencia
        trend = trend_slope * t
        
        # Componente estacional
        seasonal = seasonal_amplitude * np.sin(2 * np.pi * t / seasonal_period)
        
        # Componente de ruido
        noise = np.random.normal(0, noise_level * base_value, length)
        
        # Combinar componentes
        data = base_value + trend + seasonal + noise
        
        # Añadir outliers
        if outlier_percentage > 0:
            data = self.generate_outlier_data(data.tolist(), outlier_percentage)
        
        # Asegurar valores positivos
        data = np.maximum(data, 0.1)
        
        return {
            'data': data.tolist(),
            'components': {
                'base': base_value,
                'trend': trend.tolist(),
                'seasonal': seasonal.tolist(),
                'noise': noise.tolist()
            },
            'parameters': {
                'length': length,
                'base_value': base_value,
                'trend_slope': trend_slope,
                'seasonal_amplitude': seasonal_amplitude,
                'seasonal_period': seasonal_period,
                'noise_level': noise_level,
                'outlier_percentage': outlier_percentage
            }
        }
    
    def generate_test_datasets(self) -> Dict[str, Dict[str, any]]:
        """
        Genera un conjunto completo de datasets de prueba para validación.
        
        Returns:
            Diccionario con diferentes tipos de datasets de prueba
        """
        datasets = {}
        
        # Dataset con tendencia lineal creciente
        datasets['linear_trend_up'] = {
            'data': self.generate_trend_data(36, 'linear', 2.0, 100.0, 0.05),
            'type': 'linear_trend',
            'description': 'Tendencia lineal creciente con poco ruido',
            'expected_best_models': ['Regresión Lineal', 'ARIMA']
        }
        
        # Dataset con tendencia exponencial
        datasets['exponential_trend'] = {
            'data': self.generate_trend_data(24, 'exponential', 0.1, 50.0, 0.1),
            'type': 'exponential_trend',
            'description': 'Tendencia exponencial con ruido moderado',
            'expected_best_models': ['Random Forest', 'ARIMA']
        }
        
        # Dataset estacional mensual
        datasets['monthly_seasonal'] = {
            'data': self.generate_seasonal_data(48, 12, 25.0, 150.0, 0.08),
            'type': 'seasonal',
            'description': 'Patrón estacional mensual claro',
            'expected_best_models': ['Holt-Winters', 'ARIMA']
        }
        
        # Dataset estacional trimestral
        datasets['quarterly_seasonal'] = {
            'data': self.generate_seasonal_data(32, 4, 30.0, 120.0, 0.1),
            'type': 'seasonal',
            'description': 'Patrón estacional trimestral',
            'expected_best_models': ['Holt-Winters', 'SES']
        }
        
        # Dataset estacionario
        datasets['stationary'] = {
            'data': self.generate_stationary_data(60, 80.0, 0.15, 0.3),
            'type': 'stationary',
            'description': 'Serie estacionaria con correlación moderada',
            'expected_best_models': ['SMA', 'SES', 'ARIMA']
        }
        
        # Dataset con ruido alto
        datasets['high_noise'] = {
            'data': self.generate_stationary_data(36, 100.0, 0.4, 0.1),
            'type': 'noisy',
            'description': 'Serie con alto nivel de ruido',
            'expected_best_models': ['SMA', 'Random Forest']
        }
        
        # Dataset complejo (tendencia + estacionalidad)
        complex_data = self.generate_complex_pattern_data(60, 100.0, 1.5, 20.0, 12, 0.1, 0.03)
        datasets['complex_pattern'] = {
            'data': complex_data['data'],
            'type': 'complex',
            'description': 'Patrón complejo con tendencia, estacionalidad y outliers',
            'expected_best_models': ['Holt-Winters', 'Random Forest'],
            'components': complex_data['components']
        }
        
        # Dataset con outliers
        base_seasonal = self.generate_seasonal_data(36, 12, 15.0, 90.0, 0.05)
        datasets['with_outliers'] = {
            'data': self.generate_outlier_data(base_seasonal, 0.08, 4.0),
            'type': 'outliers',
            'description': 'Serie estacional con outliers significativos',
            'expected_best_models': ['Random Forest', 'SMA']
        }
        
        # Dataset con valores faltantes
        base_trend = self.generate_trend_data(30, 'linear', 1.0, 75.0, 0.1)
        missing_data, missing_indices = self.generate_missing_values_data(base_trend, 0.1)
        datasets['with_missing_values'] = {
            'data': missing_data,
            'type': 'missing_values',
            'description': 'Serie con valores faltantes',
            'missing_indices': missing_indices,
            'expected_best_models': ['SMA', 'SES']  # Modelos robustos a valores faltantes
        }
        
        # Dataset mínimo (12 meses)
        datasets['minimum_length'] = {
            'data': self.generate_trend_data(12, 'linear', 0.5, 60.0, 0.1),
            'type': 'minimum',
            'description': 'Dataset con longitud mínima (12 meses)',
            'expected_best_models': ['SMA', 'SES']
        }
        
        # Dataset máximo (120 meses)
        datasets['maximum_length'] = {
            'data': self.generate_complex_pattern_data(120, 200.0, 0.8, 30.0, 12, 0.12, 0.02)['data'],
            'type': 'maximum',
            'description': 'Dataset con longitud máxima (120 meses)',
            'expected_best_models': ['Holt-Winters', 'ARIMA', 'Random Forest']
        }
        
        return datasets
    
    def validate_dataset(self, data: List[float]) -> Dict[str, any]:
        """
        Valida un dataset y proporciona estadísticas descriptivas.
        
        Args:
            data: Lista de valores a validar
            
        Returns:
            Diccionario con estadísticas y validaciones
        """
        data_array = np.array(data)
        
        # Filtrar valores no NaN para estadísticas
        valid_data = data_array[~np.isnan(data_array)]
        
        validation = {
            'length': len(data),
            'valid_values': len(valid_data),
            'missing_values': len(data) - len(valid_data),
            'missing_percentage': (len(data) - len(valid_data)) / len(data) * 100,
            'statistics': {
                'mean': float(np.mean(valid_data)) if len(valid_data) > 0 else np.nan,
                'std': float(np.std(valid_data)) if len(valid_data) > 0 else np.nan,
                'min': float(np.min(valid_data)) if len(valid_data) > 0 else np.nan,
                'max': float(np.max(valid_data)) if len(valid_data) > 0 else np.nan,
                'median': float(np.median(valid_data)) if len(valid_data) > 0 else np.nan
            },
            'validation_checks': {
                'length_valid': 12 <= len(data) <= 120,
                'has_positive_values': np.all(valid_data > 0) if len(valid_data) > 0 else False,
                'no_infinite_values': np.all(np.isfinite(valid_data)) if len(valid_data) > 0 else False,
                'sufficient_data': len(valid_data) >= 12
            }
        }
        
        # Detectar patrones básicos
        if len(valid_data) >= 12:
            # Test de tendencia simple (correlación con tiempo)
            t = np.arange(len(valid_data))
            trend_correlation = np.corrcoef(t, valid_data)[0, 1] if len(valid_data) > 1 else 0
            
            validation['pattern_detection'] = {
                'trend_correlation': float(trend_correlation),
                'has_trend': abs(trend_correlation) > 0.5,
                'coefficient_of_variation': float(np.std(valid_data) / np.mean(valid_data)) if np.mean(valid_data) != 0 else np.nan
            }
        
        return validation


# Funciones de utilidad para testing
def create_known_pattern_data(pattern_type: str, **kwargs) -> Dict[str, any]:
    """
    Crea datos con patrones conocidos para testing específico.
    
    Args:
        pattern_type: Tipo de patrón ('perfect_linear', 'perfect_seasonal', etc.)
        **kwargs: Parámetros específicos del patrón
        
    Returns:
        Diccionario con datos y metadatos del patrón
    """
    generator = TestDataGenerator()
    
    if pattern_type == 'perfect_linear':
        # Tendencia lineal perfecta sin ruido
        length = kwargs.get('length', 24)
        slope = kwargs.get('slope', 1.0)
        intercept = kwargs.get('intercept', 100.0)
        
        data = [intercept + slope * i for i in range(length)]
        
        return {
            'data': data,
            'type': 'perfect_linear',
            'parameters': {'slope': slope, 'intercept': intercept, 'length': length},
            'expected_metrics': {
                'linear_regression_mape': 0.0,  # Debería ser perfecto
                'sma_mape_range': (5.0, 15.0)  # SMA no debería ser tan bueno
            }
        }
    
    elif pattern_type == 'perfect_seasonal':
        # Patrón estacional perfecto
        length = kwargs.get('length', 36)
        period = kwargs.get('period', 12)
        amplitude = kwargs.get('amplitude', 20.0)
        base = kwargs.get('base', 100.0)
        
        t = np.arange(length)
        data = base + amplitude * np.sin(2 * np.pi * t / period)
        
        return {
            'data': data.tolist(),
            'type': 'perfect_seasonal',
            'parameters': {'period': period, 'amplitude': amplitude, 'base': base, 'length': length},
            'expected_metrics': {
                'holt_winters_mape_max': 5.0,  # Debería ser muy bueno
                'sma_mape_min': 10.0  # SMA debería ser peor
            }
        }
    
    else:
        raise ValueError(f"Tipo de patrón no reconocido: {pattern_type}")


if __name__ == "__main__":
    # Ejemplo de uso
    generator = TestDataGenerator()
    
    # Generar datasets de prueba
    test_datasets = generator.generate_test_datasets()
    
    print("Datasets de prueba generados:")
    for name, dataset in test_datasets.items():
        validation = generator.validate_dataset(dataset['data'])
        print(f"\n{name}:")
        print(f"  - Tipo: {dataset['type']}")
        print(f"  - Descripción: {dataset['description']}")
        print(f"  - Longitud: {validation['length']}")
        print(f"  - Media: {validation['statistics']['mean']:.2f}")
        print(f"  - Modelos esperados: {dataset['expected_best_models']}")