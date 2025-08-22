"""
Tests unitarios para el generador de datos de prueba sintéticos.
"""

import unittest
import numpy as np
import sys
import os

# Añadir el directorio actual al path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from test_data_generator import TestDataGenerator, create_known_pattern_data


class TestTestDataGenerator(unittest.TestCase):
    """Tests para la clase TestDataGenerator."""
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.generator = TestDataGenerator(random_seed=42)
    
    def test_generate_trend_data_linear(self):
        """Test para generación de datos con tendencia lineal."""
        data = self.generator.generate_trend_data(
            length=24, 
            trend_type='linear', 
            trend_slope=2.0, 
            base_value=100.0, 
            noise_level=0.0
        )
        
        # Verificar longitud
        self.assertEqual(len(data), 24)
        
        # Verificar que todos los valores son positivos
        self.assertTrue(all(x > 0 for x in data))
        
        # Verificar tendencia lineal (sin ruido debería ser perfecta)
        expected_slope = 2.0
        actual_slope = (data[-1] - data[0]) / (len(data) - 1)
        self.assertAlmostEqual(actual_slope, expected_slope, places=1)
        
        # Verificar valor inicial aproximado
        self.assertAlmostEqual(data[0], 100.0, places=0)
    
    def test_generate_trend_data_exponential(self):
        """Test para generación de datos con tendencia exponencial."""
        data = self.generator.generate_trend_data(
            length=20, 
            trend_type='exponential', 
            trend_slope=0.1, 
            base_value=50.0, 
            noise_level=0.0
        )
        
        # Verificar longitud
        self.assertEqual(len(data), 20)
        
        # Verificar que todos los valores son positivos
        self.assertTrue(all(x > 0 for x in data))
        
        # Verificar que es creciente (tendencia exponencial positiva)
        self.assertTrue(data[-1] > data[0])
        
        # Verificar que el crecimiento es exponencial (acelerado)
        # Para tendencia exponencial, la diferencia entre puntos consecutivos debería aumentar
        differences = [data[i+1] - data[i] for i in range(len(data)-1)]
        # Las diferencias deberían tender a aumentar en una función exponencial
        self.assertGreater(differences[-1], differences[0])
    
    def test_generate_trend_data_invalid_type(self):
        """Test para tipo de tendencia inválido."""
        with self.assertRaises(ValueError):
            self.generator.generate_trend_data(24, trend_type='invalid')
    
    def test_generate_trend_data_minimum_length(self):
        """Test para longitud mínima de datos."""
        with self.assertRaises(ValueError):
            self.generator.generate_trend_data(11)  # Menos de 12 meses
    
    def test_generate_seasonal_data(self):
        """Test para generación de datos estacionales."""
        data = self.generator.generate_seasonal_data(
            length=36,
            seasonal_period=12,
            seasonal_amplitude=20.0,
            base_value=100.0,
            noise_level=0.0
        )
        
        # Verificar longitud
        self.assertEqual(len(data), 36)
        
        # Verificar que todos los valores son positivos
        self.assertTrue(all(x > 0 for x in data))
        
        # Verificar periodicidad (valores en posiciones equivalentes deberían ser similares)
        # Sin ruido, los valores cada 12 posiciones deberían ser idénticos
        for i in range(12):
            self.assertAlmostEqual(data[i], data[i + 12], places=1)
            self.assertAlmostEqual(data[i + 12], data[i + 24], places=1)
    
    def test_generate_seasonal_data_insufficient_length(self):
        """Test para longitud insuficiente para capturar estacionalidad."""
        with self.assertRaises(ValueError):
            self.generator.generate_seasonal_data(20, seasonal_period=12)  # Menos de 2 ciclos
    
    def test_generate_stationary_data(self):
        """Test para generación de datos estacionarios."""
        data = self.generator.generate_stationary_data(
            length=50,
            mean_value=80.0,
            noise_level=0.1,
            ar_coefficient=0.0
        )
        
        # Verificar longitud
        self.assertEqual(len(data), 50)
        
        # Verificar que todos los valores son positivos
        self.assertTrue(all(x > 0 for x in data))
        
        # Verificar que la media está cerca del valor esperado
        mean_data = np.mean(data)
        self.assertAlmostEqual(mean_data, 80.0, delta=20.0)  # Tolerancia amplia por ruido
    
    def test_generate_stationary_data_minimum_length(self):
        """Test para longitud mínima de datos estacionarios."""
        with self.assertRaises(ValueError):
            self.generator.generate_stationary_data(10)  # Menos de 12 meses
    
    def test_generate_outlier_data(self):
        """Test para generación de outliers."""
        base_data = [100.0] * 20  # Serie constante
        data_with_outliers = self.generator.generate_outlier_data(
            base_data, 
            outlier_percentage=0.2,  # 20% outliers
            outlier_magnitude=3.0
        )
        
        # Verificar longitud
        self.assertEqual(len(data_with_outliers), 20)
        
        # Verificar que hay outliers (algunos valores diferentes de 100)
        outliers_count = sum(1 for x in data_with_outliers if abs(x - 100.0) > 1.0)
        expected_outliers = int(20 * 0.2)
        self.assertGreaterEqual(outliers_count, expected_outliers - 1)  # Tolerancia de ±1
        
        # Verificar que todos los valores siguen siendo positivos
        self.assertTrue(all(x > 0 for x in data_with_outliers))
    
    def test_generate_outlier_data_zero_percentage(self):
        """Test para 0% de outliers."""
        base_data = [50.0] * 15
        data_with_outliers = self.generator.generate_outlier_data(base_data, 0.0)
        
        # Debería ser idéntico a los datos originales
        self.assertEqual(data_with_outliers, base_data)
    
    def test_generate_missing_values_data(self):
        """Test para generación de valores faltantes."""
        base_data = list(range(1, 21))  # [1, 2, 3, ..., 20]
        data_with_missing, missing_indices = self.generator.generate_missing_values_data(
            base_data, 
            missing_percentage=0.25  # 25% valores faltantes
        )
        
        # Verificar longitud
        self.assertEqual(len(data_with_missing), 20)
        
        # Verificar número de valores faltantes
        nan_count = sum(1 for x in data_with_missing if np.isnan(x))
        expected_missing = int(20 * 0.25)
        self.assertEqual(nan_count, expected_missing)
        
        # Verificar que los índices reportados coinciden
        self.assertEqual(len(missing_indices), expected_missing)
        
        # Verificar que los índices reportados efectivamente contienen NaN
        for idx in missing_indices:
            self.assertTrue(np.isnan(data_with_missing[idx]))
    
    def test_generate_missing_values_data_zero_percentage(self):
        """Test para 0% de valores faltantes."""
        base_data = [10.0, 20.0, 30.0]
        data_with_missing, missing_indices = self.generator.generate_missing_values_data(base_data, 0.0)
        
        # No debería haber cambios
        self.assertEqual(data_with_missing, base_data)
        self.assertEqual(missing_indices, [])
    
    def test_generate_complex_pattern_data(self):
        """Test para generación de patrones complejos."""
        result = self.generator.generate_complex_pattern_data(
            length=48,
            base_value=100.0,
            trend_slope=1.0,
            seasonal_amplitude=15.0,
            seasonal_period=12,
            noise_level=0.05,
            outlier_percentage=0.02
        )
        
        # Verificar estructura del resultado
        self.assertIn('data', result)
        self.assertIn('components', result)
        self.assertIn('parameters', result)
        
        # Verificar longitud
        self.assertEqual(len(result['data']), 48)
        
        # Verificar componentes
        components = result['components']
        self.assertIn('trend', components)
        self.assertIn('seasonal', components)
        self.assertIn('noise', components)
        
        # Verificar que todos los valores son positivos
        self.assertTrue(all(x > 0 for x in result['data']))
        
        # Verificar parámetros
        params = result['parameters']
        self.assertEqual(params['length'], 48)
        self.assertEqual(params['base_value'], 100.0)
    
    def test_generate_complex_pattern_data_insufficient_length(self):
        """Test para longitud insuficiente en patrones complejos."""
        with self.assertRaises(ValueError):
            self.generator.generate_complex_pattern_data(20, seasonal_period=12)
    
    def test_generate_test_datasets(self):
        """Test para generación del conjunto completo de datasets."""
        datasets = self.generator.generate_test_datasets()
        
        # Verificar que se generaron todos los datasets esperados
        expected_datasets = [
            'linear_trend_up', 'exponential_trend', 'monthly_seasonal',
            'quarterly_seasonal', 'stationary', 'high_noise',
            'complex_pattern', 'with_outliers', 'with_missing_values',
            'minimum_length', 'maximum_length'
        ]
        
        for dataset_name in expected_datasets:
            self.assertIn(dataset_name, datasets)
        
        # Verificar estructura de cada dataset
        for name, dataset in datasets.items():
            self.assertIn('data', dataset)
            self.assertIn('type', dataset)
            self.assertIn('description', dataset)
            self.assertIn('expected_best_models', dataset)
            
            # Verificar que los datos son válidos
            self.assertIsInstance(dataset['data'], list)
            self.assertGreater(len(dataset['data']), 0)
        
        # Verificar longitudes específicas
        self.assertEqual(len(datasets['minimum_length']['data']), 12)
        self.assertEqual(len(datasets['maximum_length']['data']), 120)
    
    def test_validate_dataset(self):
        """Test para validación de datasets."""
        # Dataset válido
        valid_data = [10.0, 15.0, 12.0, 18.0, 14.0, 16.0, 13.0, 17.0, 11.0, 19.0, 15.0, 20.0]
        validation = self.generator.validate_dataset(valid_data)
        
        # Verificar estructura
        self.assertIn('length', validation)
        self.assertIn('valid_values', validation)
        self.assertIn('statistics', validation)
        self.assertIn('validation_checks', validation)
        
        # Verificar valores
        self.assertEqual(validation['length'], 12)
        self.assertEqual(validation['valid_values'], 12)
        self.assertEqual(validation['missing_values'], 0)
        
        # Verificar checks de validación
        checks = validation['validation_checks']
        self.assertTrue(checks['length_valid'])
        self.assertTrue(checks['has_positive_values'])
        self.assertTrue(checks['no_infinite_values'])
        self.assertTrue(checks['sufficient_data'])
    
    def test_validate_dataset_with_missing_values(self):
        """Test para validación de dataset con valores faltantes."""
        data_with_nan = [10.0, np.nan, 12.0, 18.0, np.nan, 16.0, 13.0, 17.0, 11.0, 19.0, 15.0, 20.0]
        validation = self.generator.validate_dataset(data_with_nan)
        
        # Verificar conteo de valores faltantes
        self.assertEqual(validation['length'], 12)
        self.assertEqual(validation['valid_values'], 10)
        self.assertEqual(validation['missing_values'], 2)
        self.assertAlmostEqual(validation['missing_percentage'], 16.67, places=1)
    
    def test_validate_dataset_invalid_length(self):
        """Test para validación de dataset con longitud inválida."""
        short_data = [10.0, 15.0, 12.0]  # Solo 3 valores
        validation = self.generator.validate_dataset(short_data)
        
        # Debería fallar la validación de longitud
        self.assertFalse(validation['validation_checks']['length_valid'])
        self.assertFalse(validation['validation_checks']['sufficient_data'])


class TestCreateKnownPatternData(unittest.TestCase):
    """Tests para la función create_known_pattern_data."""
    
    def test_create_perfect_linear_pattern(self):
        """Test para creación de patrón lineal perfecto."""
        result = create_known_pattern_data(
            'perfect_linear',
            length=20,
            slope=2.0,
            intercept=50.0
        )
        
        # Verificar estructura
        self.assertIn('data', result)
        self.assertIn('type', result)
        self.assertIn('parameters', result)
        self.assertIn('expected_metrics', result)
        
        # Verificar datos
        data = result['data']
        self.assertEqual(len(data), 20)
        
        # Verificar linealidad perfecta
        for i, value in enumerate(data):
            expected = 50.0 + 2.0 * i
            self.assertAlmostEqual(value, expected, places=10)
        
        # Verificar parámetros
        params = result['parameters']
        self.assertEqual(params['slope'], 2.0)
        self.assertEqual(params['intercept'], 50.0)
        self.assertEqual(params['length'], 20)
    
    def test_create_perfect_seasonal_pattern(self):
        """Test para creación de patrón estacional perfecto."""
        result = create_known_pattern_data(
            'perfect_seasonal',
            length=24,
            period=6,
            amplitude=10.0,
            base=100.0
        )
        
        # Verificar estructura
        self.assertIn('data', result)
        self.assertIn('type', result)
        self.assertIn('parameters', result)
        
        # Verificar datos
        data = result['data']
        self.assertEqual(len(data), 24)
        
        # Verificar periodicidad perfecta
        for i in range(6):
            # Valores en posiciones equivalentes deberían ser idénticos
            self.assertAlmostEqual(data[i], data[i + 6], places=10)
            self.assertAlmostEqual(data[i], data[i + 12], places=10)
            self.assertAlmostEqual(data[i], data[i + 18], places=10)
    
    def test_create_invalid_pattern_type(self):
        """Test para tipo de patrón inválido."""
        with self.assertRaises(ValueError):
            create_known_pattern_data('invalid_pattern')


if __name__ == '__main__':
    # Ejecutar todos los tests
    unittest.main(verbosity=2)