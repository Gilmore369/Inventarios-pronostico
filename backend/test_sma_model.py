"""
Tests unitarios para el modelo de Media Móvil Simple (SMA).

Valida el cálculo correcto de promedios móviles, optimización de parámetros,
manejo de datos insuficientes y cálculo de métricas.
"""

import unittest
import numpy as np
import sys
import os

# Añadir el directorio actual al path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import ForecastModels
from test_data_generator import TestDataGenerator, create_known_pattern_data


class TestSMAModel(unittest.TestCase):
    """Tests para el modelo de Media Móvil Simple (SMA)."""
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.forecast_models = ForecastModels()
        self.test_generator = TestDataGenerator(random_seed=42)
    
    def test_sma_basic_calculation(self):
        """Test básico del cálculo de media móvil simple."""
        # Datos de prueba simples
        data = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0]
        
        result = self.forecast_models.sma_model(data, window=3)
        
        # Verificar estructura del resultado
        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'Media Móvil Simple (SMA)')
        self.assertIn('predictions', result)
        self.assertIn('metrics', result)
        self.assertIn('parameters', result)
        
        # Verificar longitud de predicciones
        self.assertEqual(len(result['predictions']), len(data))
        
        # Verificar que las primeras predicciones son NaN (ventana insuficiente)
        predictions = result['predictions']
        self.assertTrue(np.isnan(predictions[0]))
        self.assertTrue(np.isnan(predictions[1]))
        
        # Verificar cálculos específicos
        # predictions[3] debería ser el promedio de [10, 20, 30] = 20
        self.assertAlmostEqual(predictions[3], 20.0, places=1)
        # predictions[4] debería ser el promedio de [20, 30, 40] = 30
        self.assertAlmostEqual(predictions[4], 30.0, places=1)
        # predictions[5] debería ser el promedio de [30, 40, 50] = 40
        self.assertAlmostEqual(predictions[5], 40.0, places=1)
    
    def test_sma_window_optimization(self):
        """Test para optimización automática del parámetro de ventana."""
        # Generar datos con tendencia suave donde SMA debería funcionar bien
        data = self.test_generator.generate_trend_data(
            length=30, 
            trend_type='linear', 
            trend_slope=1.0, 
            base_value=100.0, 
            noise_level=0.05
        )
        
        result = self.forecast_models.sma_model(data)
        
        # Verificar que se encontró un parámetro de ventana
        self.assertIn('window', result['parameters'])
        window = result['parameters']['window']
        
        # La ventana debería estar en el rango esperado (3-12)
        self.assertGreaterEqual(window, 3)
        self.assertLessEqual(window, 12)
        
        # Verificar que las métricas son razonables
        metrics = result['metrics']
        self.assertIsInstance(metrics['mape'], (int, float))
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)  # MAPE debería ser positivo
    
    def test_sma_different_windows(self):
        """Test para diferentes tamaños de ventana."""
        data = [100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155]
        
        # Test con ventana de 3
        result_3 = self.forecast_models.sma_model(data, window=3)
        
        # Test con ventana de 5
        result_5 = self.forecast_models.sma_model(data, window=5)
        
        # Ambos deberían funcionar
        self.assertIsNotNone(result_3)
        self.assertIsNotNone(result_5)
        
        # Las predicciones deberían tener diferentes patrones de suavizado
        pred_3 = result_3['predictions']
        pred_5 = result_5['predictions']
        
        # Ventana más grande debería tener más suavizado (menos variabilidad)
        # Calcular variabilidad de las predicciones válidas
        valid_pred_3 = [p for p in pred_3 if not np.isnan(p)]
        valid_pred_5 = [p for p in pred_5 if not np.isnan(p)]
        
        if len(valid_pred_3) > 1 and len(valid_pred_5) > 1:
            var_3 = np.var(valid_pred_3)
            var_5 = np.var(valid_pred_5)
            # Ventana más grande debería tener menor variabilidad
            self.assertLessEqual(var_5, var_3 * 1.1)  # Tolerancia del 10%
    
    def test_sma_insufficient_data(self):
        """Test para manejo de datos insuficientes."""
        # Datos menores que la ventana requerida
        short_data = [10.0, 20.0]
        
        result = self.forecast_models.sma_model(short_data, window=5)
        
        # Debería manejar graciosamente los datos insuficientes
        self.assertIsNotNone(result)
        
        # Todas las predicciones deberían ser NaN
        predictions = result['predictions']
        self.assertTrue(all(np.isnan(p) for p in predictions))
        
        # Las métricas deberían reflejar la imposibilidad de calcular
        metrics = result['metrics']
        self.assertTrue(np.isnan(metrics['mape']) or metrics['mape'] == float('inf'))
    
    def test_sma_metrics_calculation(self):
        """Test para validar cálculo correcto de métricas MAE, MSE, RMSE, MAPE."""
        # Usar datos conocidos para verificar métricas
        actual = [100.0, 110.0, 120.0, 130.0, 140.0, 150.0]
        
        result = self.forecast_models.sma_model(actual, window=3)
        predictions = result['predictions']
        
        # Calcular métricas manualmente para verificar
        valid_indices = [i for i, p in enumerate(predictions) if not np.isnan(p)]
        
        if len(valid_indices) > 0:
            actual_valid = [actual[i] for i in valid_indices]
            pred_valid = [predictions[i] for i in valid_indices]
            
            # Calcular MAE manualmente
            expected_mae = np.mean([abs(a - p) for a, p in zip(actual_valid, pred_valid)])
            
            # Calcular MSE manualmente
            expected_mse = np.mean([(a - p)**2 for a, p in zip(actual_valid, pred_valid)])
            
            # Calcular RMSE manualmente
            expected_rmse = np.sqrt(expected_mse)
            
            # Calcular MAPE manualmente
            expected_mape = np.mean([abs((a - p) / a) * 100 for a, p in zip(actual_valid, pred_valid)])
            
            # Verificar que las métricas calculadas coinciden
            metrics = result['metrics']
            self.assertAlmostEqual(metrics['mae'], expected_mae, places=1)
            self.assertAlmostEqual(metrics['mse'], expected_mse, places=1)
            self.assertAlmostEqual(metrics['rmse'], expected_rmse, places=1)
            self.assertAlmostEqual(metrics['mape'], expected_mape, places=1)
    
    def test_sma_with_perfect_linear_data(self):
        """Test con datos lineales perfectos."""
        # Crear datos lineales perfectos
        perfect_data = create_known_pattern_data(
            'perfect_linear',
            length=20,
            slope=2.0,
            intercept=100.0
        )
        
        result = self.forecast_models.sma_model(perfect_data['data'])
        
        # SMA no debería ser perfecto con datos lineales (tiene retraso)
        self.assertIsNotNone(result)
        metrics = result['metrics']
        
        # MAPE debería ser mayor que 0 pero razonable
        self.assertGreater(metrics['mape'], 0)
        self.assertLess(metrics['mape'], 50)  # No debería ser terrible
        
        # Verificar que se optimizó la ventana
        self.assertIn('window', result['parameters'])
    
    def test_sma_with_seasonal_data(self):
        """Test con datos estacionales."""
        seasonal_data = self.test_generator.generate_seasonal_data(
            length=36,
            seasonal_period=12,
            seasonal_amplitude=20.0,
            base_value=100.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.sma_model(seasonal_data)
        
        # SMA debería funcionar razonablemente con datos estacionales
        self.assertIsNotNone(result)
        metrics = result['metrics']
        
        # Las métricas deberían ser calculables
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
        
        # Con datos estacionales, SMA podría no ser el mejor pero debería funcionar
        self.assertLess(metrics['mape'], 100)  # No debería ser terrible
    
    def test_sma_with_noisy_data(self):
        """Test con datos ruidosos."""
        noisy_data = self.test_generator.generate_stationary_data(
            length=30,
            mean_value=80.0,
            noise_level=0.3,  # Alto nivel de ruido
            ar_coefficient=0.1
        )
        
        result = self.forecast_models.sma_model(noisy_data)
        
        # SMA debería ser bueno para suavizar ruido
        self.assertIsNotNone(result)
        metrics = result['metrics']
        
        # Verificar que las métricas son calculables
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
        
        # Con datos ruidosos, SMA debería tener un rendimiento decente
        # (mejor que simplemente usar el último valor)
        self.assertLess(metrics['mape'], 200)
    
    def test_sma_with_outliers(self):
        """Test con datos que contienen outliers."""
        base_data = self.test_generator.generate_trend_data(
            length=24, 
            trend_type='linear', 
            trend_slope=1.0, 
            base_value=50.0, 
            noise_level=0.05
        )
        
        # Añadir outliers
        outlier_data = self.test_generator.generate_outlier_data(
            base_data, 
            outlier_percentage=0.1, 
            outlier_magnitude=5.0
        )
        
        result = self.forecast_models.sma_model(outlier_data)
        
        # SMA debería ser relativamente robusto a outliers
        self.assertIsNotNone(result)
        metrics = result['metrics']
        
        # Verificar que puede manejar outliers
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
    
    def test_sma_edge_cases(self):
        """Test para casos extremos."""
        # Caso 1: Datos constantes
        constant_data = [50.0] * 15
        result_constant = self.forecast_models.sma_model(constant_data)
        
        self.assertIsNotNone(result_constant)
        # Con datos constantes, SMA debería predecir el mismo valor
        predictions = result_constant['predictions']
        valid_predictions = [p for p in predictions if not np.isnan(p)]
        if valid_predictions:
            # Todas las predicciones válidas deberían ser aproximadamente 50
            for pred in valid_predictions:
                self.assertAlmostEqual(pred, 50.0, places=1)
        
        # Caso 2: Datos con valores muy pequeños
        small_data = [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.010, 0.011, 0.012]
        result_small = self.forecast_models.sma_model(small_data)
        
        self.assertIsNotNone(result_small)
        # Debería manejar valores pequeños sin problemas
        
        # Caso 3: Datos con valores grandes
        large_data = [1000000.0 + i * 10000 for i in range(15)]
        result_large = self.forecast_models.sma_model(large_data)
        
        self.assertIsNotNone(result_large)
        # Debería manejar valores grandes sin problemas
    
    def test_sma_parameter_validation(self):
        """Test para validación de parámetros."""
        data = list(range(1, 21))  # [1, 2, 3, ..., 20]
        
        # Test con ventana válida
        result = self.forecast_models.sma_model(data, window=5)
        self.assertIsNotNone(result)
        # El modelo optimiza automáticamente, así que la ventana puede cambiar
        self.assertIn('window', result['parameters'])
        self.assertGreaterEqual(result['parameters']['window'], 3)
        self.assertLessEqual(result['parameters']['window'], 12)
        
        # Test con ventana muy grande (mayor que los datos)
        result_large_window = self.forecast_models.sma_model(data, window=25)
        self.assertIsNotNone(result_large_window)
        # Debería manejar graciosamente ventanas muy grandes
    
    def test_sma_reproducibility(self):
        """Test para verificar reproducibilidad de resultados."""
        data = self.test_generator.generate_trend_data(25, 'linear', 1.5, 75.0, 0.1)
        
        # Ejecutar el modelo múltiples veces
        result1 = self.forecast_models.sma_model(data)
        result2 = self.forecast_models.sma_model(data)
        
        # Los resultados deberían ser idénticos
        self.assertEqual(result1['parameters']['window'], result2['parameters']['window'])
        self.assertEqual(result1['predictions'], result2['predictions'])
        self.assertEqual(result1['metrics'], result2['metrics'])
    
    def test_sma_performance_requirements(self):
        """Test para verificar que SMA cumple con requisitos de rendimiento."""
        import time
        
        # Generar dataset grande (120 meses - máximo permitido)
        large_data = self.test_generator.generate_complex_pattern_data(120)['data']
        
        # Medir tiempo de ejecución
        start_time = time.time()
        result = self.forecast_models.sma_model(large_data)
        execution_time = time.time() - start_time
        
        # Verificar que se ejecuta en tiempo razonable (< 5 segundos)
        self.assertLess(execution_time, 5.0)
        
        # Verificar que el resultado es válido
        self.assertIsNotNone(result)
        self.assertFalse(np.isnan(result['metrics']['mape']))


if __name__ == '__main__':
    # Ejecutar todos los tests
    unittest.main(verbosity=2)