"""
Tests unitarios para el modelo de Suavizado Exponencial Simple (SES).

Valida la optimización automática del parámetro alpha, comportamiento con diferentes
valores de alpha, convergencia del algoritmo y cálculo de métricas.
"""

import unittest
import numpy as np
import sys
import os

# Añadir el directorio actual al path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import ForecastModels
from test_data_generator import TestDataGenerator, create_known_pattern_data


class TestSESModel(unittest.TestCase):
    """Tests para el modelo de Suavizado Exponencial Simple (SES)."""
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.forecast_models = ForecastModels()
        self.test_generator = TestDataGenerator(random_seed=42)
    
    def test_ses_basic_functionality(self):
        """Test básico de funcionalidad del modelo SES."""
        # Datos de prueba simples
        data = [100.0, 105.0, 110.0, 108.0, 112.0, 115.0, 113.0, 118.0, 120.0, 122.0, 125.0, 123.0]
        
        result = self.forecast_models.ses_model(data)
        
        # Verificar estructura del resultado
        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'Suavizado Exponencial Simple (SES)')
        self.assertIn('predictions', result)
        self.assertIn('metrics', result)
        self.assertIn('parameters', result)
        self.assertIn('description', result)
        
        # Verificar longitud de predicciones
        self.assertEqual(len(result['predictions']), len(data))
        
        # Verificar que se encontró un parámetro alpha
        self.assertIn('alpha', result['parameters'])
        alpha = result['parameters']['alpha']
        self.assertGreaterEqual(alpha, 0.1)
        self.assertLessEqual(alpha, 0.9)
        
        # Verificar que las métricas son válidas
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
    
    def test_ses_alpha_optimization(self):
        """Test para validar optimización automática del parámetro alpha."""
        # Generar datos estacionarios donde SES debería funcionar bien
        data = self.test_generator.generate_stationary_data(
            length=30,
            mean_value=100.0,
            noise_level=0.15,
            ar_coefficient=0.2
        )
        
        result = self.forecast_models.ses_model(data)
        
        # Verificar que se optimizó alpha
        self.assertIsNotNone(result)
        self.assertIn('alpha', result['parameters'])
        
        alpha = result['parameters']['alpha']
        
        # Alpha debería estar en el rango válido
        self.assertGreaterEqual(alpha, 0.1)
        self.assertLessEqual(alpha, 0.9)
        
        # Verificar que las métricas son razonables
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
        self.assertLess(metrics['mape'], 100)  # No debería ser terrible
    
    def test_ses_different_alpha_values(self):
        """Test para verificar comportamiento con diferentes valores de alpha."""
        # Datos con patrón suave
        data = [50.0, 52.0, 51.0, 53.0, 52.5, 54.0, 53.5, 55.0, 54.5, 56.0, 55.5, 57.0]
        
        # El modelo debería probar diferentes alphas y elegir el mejor
        result = self.forecast_models.ses_model(data)
        
        self.assertIsNotNone(result)
        
        # Verificar que se seleccionó un alpha válido
        alpha = result['parameters']['alpha']
        self.assertIn(alpha, [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
        
        # Verificar que las predicciones son razonables
        predictions = result['predictions']
        self.assertEqual(len(predictions), len(data))
        
        # Las predicciones deberían estar en un rango razonable
        valid_predictions = [p for p in predictions if not np.isnan(p)]
        if valid_predictions:
            min_pred = min(valid_predictions)
            max_pred = max(valid_predictions)
            min_data = min(data)
            max_data = max(data)
            
            # Las predicciones deberían estar cerca del rango de los datos originales
            self.assertGreaterEqual(min_pred, min_data * 0.8)
            self.assertLessEqual(max_pred, max_data * 1.2)
    
    def test_ses_convergence_algorithm(self):
        """Test para verificar convergencia del algoritmo de optimización."""
        # Datos con patrón claro donde la optimización debería converger
        data = self.test_generator.generate_trend_data(
            length=25,
            trend_type='linear',
            trend_slope=0.5,
            base_value=80.0,
            noise_level=0.1
        )
        
        # Ejecutar múltiples veces para verificar consistencia
        results = []
        for _ in range(3):
            result = self.forecast_models.ses_model(data)
            self.assertIsNotNone(result)
            results.append(result)
        
        # Todos los resultados deberían tener el mismo alpha óptimo
        alphas = [r['parameters']['alpha'] for r in results]
        self.assertTrue(all(alpha == alphas[0] for alpha in alphas))
        
        # Las métricas deberían ser idénticas
        mapes = [r['metrics']['mape'] for r in results]
        self.assertTrue(all(abs(mape - mapes[0]) < 0.01 for mape in mapes))
    
    def test_ses_metrics_calculation(self):
        """Test para validar cálculo correcto de métricas para el modelo SES."""
        # Datos conocidos para verificar métricas
        data = [100.0, 102.0, 104.0, 103.0, 105.0, 107.0, 106.0, 108.0, 110.0, 109.0, 111.0, 113.0]
        
        result = self.forecast_models.ses_model(data)
        self.assertIsNotNone(result)
        
        # Verificar que todas las métricas están presentes y son válidas
        metrics = result['metrics']
        
        self.assertIn('mae', metrics)
        self.assertIn('mse', metrics)
        self.assertIn('rmse', metrics)
        self.assertIn('mape', metrics)
        
        # Verificar que las métricas son números válidos
        self.assertFalse(np.isnan(metrics['mae']))
        self.assertFalse(np.isnan(metrics['mse']))
        self.assertFalse(np.isnan(metrics['rmse']))
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Verificar relaciones matemáticas entre métricas
        self.assertAlmostEqual(metrics['rmse'], np.sqrt(metrics['mse']), places=2)
        
        # Todas las métricas deberían ser positivas
        self.assertGreater(metrics['mae'], 0)
        self.assertGreater(metrics['mse'], 0)
        self.assertGreater(metrics['rmse'], 0)
        self.assertGreater(metrics['mape'], 0)
    
    def test_ses_with_stationary_data(self):
        """Test con datos estacionarios (ideal para SES)."""
        # SES debería funcionar muy bien con datos estacionarios
        stationary_data = self.test_generator.generate_stationary_data(
            length=40,
            mean_value=150.0,
            noise_level=0.1,
            ar_coefficient=0.3
        )
        
        result = self.forecast_models.ses_model(stationary_data)
        
        self.assertIsNotNone(result)
        
        # Con datos estacionarios, SES debería tener un buen rendimiento
        metrics = result['metrics']
        self.assertLess(metrics['mape'], 50)  # Debería ser razonablemente bueno
        
        # El alpha óptimo para datos estacionarios suele ser moderado
        alpha = result['parameters']['alpha']
        self.assertGreaterEqual(alpha, 0.1)
        self.assertLessEqual(alpha, 0.9)
    
    def test_ses_with_trending_data(self):
        """Test con datos con tendencia (no ideal para SES básico)."""
        # SES simple no maneja bien las tendencias, pero debería funcionar
        trending_data = self.test_generator.generate_trend_data(
            length=30,
            trend_type='linear',
            trend_slope=2.0,
            base_value=100.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.ses_model(trending_data)
        
        self.assertIsNotNone(result)
        
        # Con tendencia, SES podría no ser el mejor pero debería funcionar
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
        
        # Para datos con tendencia, alpha podría ser más alto para adaptarse rápido
        alpha = result['parameters']['alpha']
        self.assertGreaterEqual(alpha, 0.1)
        self.assertLessEqual(alpha, 0.9)
    
    def test_ses_with_noisy_data(self):
        """Test con datos ruidosos."""
        # SES debería ser bueno para suavizar ruido
        noisy_data = self.test_generator.generate_stationary_data(
            length=35,
            mean_value=75.0,
            noise_level=0.4,  # Alto nivel de ruido
            ar_coefficient=0.1
        )
        
        result = self.forecast_models.ses_model(noisy_data)
        
        self.assertIsNotNone(result)
        
        # Con datos ruidosos, SES debería usar un alpha más bajo para suavizar
        alpha = result['parameters']['alpha']
        self.assertGreaterEqual(alpha, 0.1)
        self.assertLessEqual(alpha, 0.9)
        
        # Las métricas deberían ser calculables
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
    
    def test_ses_with_constant_data(self):
        """Test con datos constantes."""
        # Con datos constantes, SES debería predecir el mismo valor
        constant_data = [85.0] * 20
        
        result = self.forecast_models.ses_model(constant_data)
        
        self.assertIsNotNone(result)
        
        # Con datos constantes, cualquier alpha debería funcionar bien
        alpha = result['parameters']['alpha']
        self.assertGreaterEqual(alpha, 0.1)
        self.assertLessEqual(alpha, 0.9)
        
        # Las predicciones deberían estar cerca del valor constante
        predictions = result['predictions']
        valid_predictions = [p for p in predictions if not np.isnan(p)]
        
        if valid_predictions:
            for pred in valid_predictions:
                self.assertAlmostEqual(pred, 85.0, delta=5.0)
        
        # MAPE debería ser muy bajo con datos constantes
        metrics = result['metrics']
        if not np.isnan(metrics['mape']):
            self.assertLess(metrics['mape'], 10.0)
    
    def test_ses_with_outliers(self):
        """Test con datos que contienen outliers."""
        base_data = self.test_generator.generate_stationary_data(
            length=25,
            mean_value=60.0,
            noise_level=0.1,
            ar_coefficient=0.2
        )
        
        # Añadir outliers
        outlier_data = self.test_generator.generate_outlier_data(
            base_data,
            outlier_percentage=0.12,
            outlier_magnitude=4.0
        )
        
        result = self.forecast_models.ses_model(outlier_data)
        
        self.assertIsNotNone(result)
        
        # SES debería manejar outliers razonablemente bien
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
        
        # El alpha podría ajustarse para manejar outliers
        alpha = result['parameters']['alpha']
        self.assertGreaterEqual(alpha, 0.1)
        self.assertLessEqual(alpha, 0.9)
    
    def test_ses_edge_cases(self):
        """Test para casos extremos."""
        # Caso 1: Datos muy pequeños
        small_data = [0.001 * (i + 1) for i in range(15)]
        result_small = self.forecast_models.ses_model(small_data)
        self.assertIsNotNone(result_small)
        
        # Caso 2: Datos muy grandes
        large_data = [1000000.0 + i * 1000 for i in range(18)]
        result_large = self.forecast_models.ses_model(large_data)
        self.assertIsNotNone(result_large)
        
        # Caso 3: Datos con variación mínima
        minimal_variation = [100.0 + 0.01 * i for i in range(12)]
        result_minimal = self.forecast_models.ses_model(minimal_variation)
        self.assertIsNotNone(result_minimal)
        
        # Todos los casos deberían producir resultados válidos
        for result in [result_small, result_large, result_minimal]:
            self.assertIn('alpha', result['parameters'])
            self.assertFalse(np.isnan(result['metrics']['mape']))
    
    def test_ses_reproducibility(self):
        """Test para verificar reproducibilidad de resultados."""
        data = self.test_generator.generate_stationary_data(30, 90.0, 0.2, 0.25)
        
        # Ejecutar múltiples veces
        result1 = self.forecast_models.ses_model(data)
        result2 = self.forecast_models.ses_model(data)
        
        # Los resultados deberían ser idénticos
        self.assertEqual(result1['parameters']['alpha'], result2['parameters']['alpha'])
        self.assertEqual(result1['predictions'], result2['predictions'])
        self.assertEqual(result1['metrics'], result2['metrics'])
    
    def test_ses_performance_requirements(self):
        """Test para verificar que SES cumple con requisitos de rendimiento."""
        import time
        
        # Generar dataset grande (120 meses - máximo permitido)
        large_data = self.test_generator.generate_stationary_data(120, 200.0, 0.15, 0.3)
        
        # Medir tiempo de ejecución
        start_time = time.time()
        result = self.forecast_models.ses_model(large_data)
        execution_time = time.time() - start_time
        
        # Verificar que se ejecuta en tiempo razonable (< 5 segundos)
        self.assertLess(execution_time, 5.0)
        
        # Verificar que el resultado es válido
        self.assertIsNotNone(result)
        self.assertFalse(np.isnan(result['metrics']['mape']))
    
    def test_ses_alpha_range_validation(self):
        """Test para verificar que alpha está siempre en el rango válido."""
        # Probar con diferentes tipos de datos
        test_datasets = [
            self.test_generator.generate_trend_data(20, 'linear', 1.0, 50.0, 0.1),
            self.test_generator.generate_seasonal_data(24, 12, 10.0, 100.0, 0.1),
            self.test_generator.generate_stationary_data(30, 80.0, 0.2, 0.4),
            [100.0] * 15,  # Datos constantes
            self.test_generator.generate_stationary_data(25, 150.0, 0.5, 0.1)  # Muy ruidoso
        ]
        
        for i, data in enumerate(test_datasets):
            with self.subTest(dataset=i):
                result = self.forecast_models.ses_model(data)
                self.assertIsNotNone(result, f"Dataset {i} failed")
                
                alpha = result['parameters']['alpha']
                self.assertGreaterEqual(alpha, 0.1, f"Alpha too low for dataset {i}")
                self.assertLessEqual(alpha, 0.9, f"Alpha too high for dataset {i}")
    
    def test_ses_minimum_data_length(self):
        """Test con longitud mínima de datos."""
        # Datos mínimos (12 puntos)
        min_data = list(range(100, 112))  # [100, 101, 102, ..., 111]
        
        result = self.forecast_models.ses_model(min_data)
        
        self.assertIsNotNone(result)
        self.assertEqual(len(result['predictions']), 12)
        
        # Debería funcionar incluso con datos mínimos
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        
        alpha = result['parameters']['alpha']
        self.assertGreaterEqual(alpha, 0.1)
        self.assertLessEqual(alpha, 0.9)


if __name__ == '__main__':
    # Ejecutar todos los tests
    unittest.main(verbosity=2)