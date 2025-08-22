"""
Tests unitarios para el modelo de Regresión Lineal.

Valida el ajuste de tendencias lineales, cálculo correcto de coeficientes de regresión,
comportamiento con datos con tendencia clara vs datos sin tendencia, y métricas
de bondad de ajuste.
"""

import unittest
import numpy as np
import sys
import os

# Añadir el directorio actual al path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import ForecastModels
from test_data_generator import TestDataGenerator, create_known_pattern_data


class TestLinearRegressionModel(unittest.TestCase):
    """Tests para el modelo de Regresión Lineal."""
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.forecast_models = ForecastModels()
        self.test_generator = TestDataGenerator(random_seed=42)
    
    def test_linear_regression_basic_functionality(self):
        """Test básico de funcionalidad del modelo de Regresión Lineal."""
        # Generar datos con tendencia lineal clara
        linear_data = self.test_generator.generate_trend_data(
            length=25,
            trend_type='linear',
            trend_slope=2.5,
            base_value=100.0,
            noise_level=0.05
        )
        
        result = self.forecast_models.linear_regression_model(linear_data)
        
        # Verificar estructura del resultado
        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'Regresión Lineal')
        self.assertIn('predictions', result)
        self.assertIn('metrics', result)
        self.assertIn('parameters', result)
        self.assertIn('description', result)
        
        # Verificar longitud de predicciones
        self.assertEqual(len(result['predictions']), len(linear_data))
        
        # Verificar parámetros de regresión
        self.assertIn('intercept', result['parameters'])
        self.assertIn('coefficient', result['parameters'])
        
        intercept = result['parameters']['intercept']
        coefficient = result['parameters']['coefficient']
        
        # Con datos lineales claros, el coeficiente debería estar cerca de la pendiente real
        self.assertAlmostEqual(coefficient, 2.5, delta=0.5)
        
        # El intercepto debería estar cerca del valor base
        self.assertAlmostEqual(intercept, 100.0, delta=10.0)
        
        # Verificar métricas
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreaterEqual(metrics['mape'], 0)
    
    def test_linear_regression_perfect_linear_data(self):
        """Test con datos lineales perfectos."""
        # Crear datos lineales perfectos usando la función de utilidad
        perfect_linear = create_known_pattern_data(
            'perfect_linear',
            length=20,
            slope=3.0,
            intercept=50.0
        )
        
        result = self.forecast_models.linear_regression_model(perfect_linear['data'])
        
        self.assertIsNotNone(result)
        
        # Con datos perfectamente lineales, los coeficientes deberían ser exactos
        intercept = result['parameters']['intercept']
        coefficient = result['parameters']['coefficient']
        
        self.assertAlmostEqual(coefficient, 3.0, places=1)
        self.assertAlmostEqual(intercept, 50.0, places=1)
        
        # Las métricas deberían ser muy buenas (cerca de 0)
        metrics = result['metrics']
        self.assertLess(metrics['mape'], 1.0)  # Debería ser casi perfecto
        self.assertLess(metrics['mae'], 1.0)
    
    def test_linear_regression_coefficient_calculation(self):
        """Test para verificar cálculo correcto de coeficientes de regresión."""
        # Datos conocidos para verificar cálculos
        # y = 2x + 10 + ruido mínimo
        known_data = []
        for i in range(15):
            known_data.append(2.0 * i + 10.0 + np.random.normal(0, 0.1))
        
        result = self.forecast_models.linear_regression_model(known_data)
        
        self.assertIsNotNone(result)
        
        # Verificar que los coeficientes están cerca de los valores esperados
        intercept = result['parameters']['intercept']
        coefficient = result['parameters']['coefficient']
        
        self.assertAlmostEqual(coefficient, 2.0, delta=0.2)
        self.assertAlmostEqual(intercept, 10.0, delta=1.0)
        
        # Verificar que las predicciones siguen la línea de regresión
        predictions = result['predictions']
        
        # Calcular predicciones esperadas manualmente
        for i, pred in enumerate(predictions):
            expected = intercept + coefficient * i
            self.assertAlmostEqual(pred, expected, places=1)  # Reducir precisión por ruido numérico
    
    def test_linear_regression_with_clear_trend(self):
        """Test con datos que tienen tendencia clara."""
        # Datos con tendencia creciente fuerte
        strong_trend_data = self.test_generator.generate_trend_data(
            length=30,
            trend_type='linear',
            trend_slope=5.0,  # Tendencia fuerte
            base_value=75.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.linear_regression_model(strong_trend_data)
        
        self.assertIsNotNone(result)
        
        # Con tendencia clara, el coeficiente debería ser significativo
        coefficient = result['parameters']['coefficient']
        self.assertGreater(abs(coefficient), 3.0)  # Debería detectar la tendencia fuerte
        
        # Las métricas deberían ser buenas con tendencia clara
        metrics = result['metrics']
        self.assertLess(metrics['mape'], 20.0)  # Debería ajustar bien
        
        # Datos con tendencia decreciente
        declining_trend_data = self.test_generator.generate_trend_data(
            length=25,
            trend_type='linear',
            trend_slope=-3.0,  # Tendencia decreciente
            base_value=200.0,
            noise_level=0.1
        )
        
        result_declining = self.forecast_models.linear_regression_model(declining_trend_data)
        
        self.assertIsNotNone(result_declining)
        
        # Debería detectar tendencia negativa
        coefficient_declining = result_declining['parameters']['coefficient']
        self.assertLess(coefficient_declining, -2.0)
    
    def test_linear_regression_without_trend(self):
        """Test con datos sin tendencia clara (estacionarios)."""
        # Datos estacionarios (sin tendencia)
        stationary_data = self.test_generator.generate_stationary_data(
            length=35,
            mean_value=100.0,
            noise_level=0.2,
            ar_coefficient=0.3
        )
        
        result = self.forecast_models.linear_regression_model(stationary_data)
        
        self.assertIsNotNone(result)
        
        # Sin tendencia clara, el coeficiente debería ser cercano a 0
        coefficient = result['parameters']['coefficient']
        self.assertLess(abs(coefficient), 2.0)  # No debería haber tendencia fuerte
        
        # El intercepto debería estar cerca de la media de los datos
        intercept = result['parameters']['intercept']
        data_mean = np.mean(stationary_data)
        self.assertAlmostEqual(intercept, data_mean, delta=20.0)
        
        # Con datos sin tendencia, el ajuste puede no ser muy bueno
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        # No esperamos un ajuste perfecto con datos estacionarios
    
    def test_linear_regression_goodness_of_fit_metrics(self):
        """Test para validar métricas de bondad de ajuste."""
        # Datos con diferentes niveles de ajuste lineal
        
        # Caso 1: Ajuste perfecto
        perfect_fit_data = [10.0 + 2.0 * i for i in range(20)]  # Línea perfecta
        result_perfect = self.forecast_models.linear_regression_model(perfect_fit_data)
        
        # Caso 2: Buen ajuste con poco ruido
        good_fit_data = [10.0 + 2.0 * i + np.random.normal(0, 0.5) for i in range(20)]
        result_good = self.forecast_models.linear_regression_model(good_fit_data)
        
        # Caso 3: Ajuste pobre con mucho ruido
        poor_fit_data = [10.0 + 2.0 * i + np.random.normal(0, 10.0) for i in range(20)]
        result_poor = self.forecast_models.linear_regression_model(poor_fit_data)
        
        # Verificar que todos funcionan
        self.assertIsNotNone(result_perfect)
        self.assertIsNotNone(result_good)
        self.assertIsNotNone(result_poor)
        
        # Las métricas deberían reflejar la calidad del ajuste
        mape_perfect = result_perfect['metrics']['mape']
        mape_good = result_good['metrics']['mape']
        mape_poor = result_poor['metrics']['mape']
        
        # El ajuste perfecto debería tener MAPE muy bajo
        self.assertLess(mape_perfect, 1.0)
        
        # El orden de calidad debería reflejarse en las métricas
        # (aunque con ruido aleatorio puede haber variaciones)
        self.assertLess(mape_perfect, mape_good)
        # mape_good puede o no ser menor que mape_poor debido al ruido aleatorio
    
    def test_linear_regression_metrics_calculation(self):
        """Test para validar cálculo correcto de métricas."""
        # Datos conocidos para verificar métricas
        test_data = [5.0, 7.0, 9.0, 11.0, 13.0, 15.0, 17.0, 19.0, 21.0, 23.0]  # y = 2x + 5
        
        result = self.forecast_models.linear_regression_model(test_data)
        
        self.assertIsNotNone(result)
        
        # Verificar que todas las métricas están presentes
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
        
        # Verificar relaciones matemáticas
        self.assertAlmostEqual(metrics['rmse'], np.sqrt(metrics['mse']), places=2)
        
        # Todas las métricas deberían ser no negativas
        self.assertGreaterEqual(metrics['mae'], 0)
        self.assertGreaterEqual(metrics['mse'], 0)
        self.assertGreaterEqual(metrics['rmse'], 0)
        self.assertGreaterEqual(metrics['mape'], 0)
        
        # Con datos lineales perfectos, las métricas deberían ser muy bajas
        self.assertLess(metrics['mape'], 5.0)
    
    def test_linear_regression_with_seasonal_data(self):
        """Test con datos estacionales (no ideal para regresión lineal simple)."""
        # Datos con estacionalidad (regresión lineal simple no debería ajustar bien)
        seasonal_data = self.test_generator.generate_seasonal_data(
            length=36,
            seasonal_period=12,
            seasonal_amplitude=20.0,
            base_value=100.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.linear_regression_model(seasonal_data)
        
        self.assertIsNotNone(result)
        
        # Con datos estacionales, el ajuste lineal simple puede ser pobre
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        
        # El coeficiente puede ser cercano a 0 si no hay tendencia subyacente
        coefficient = result['parameters']['coefficient']
        # No hacemos aserciones estrictas porque depende del patrón específico
        self.assertIsInstance(coefficient, (int, float))
    
    def test_linear_regression_with_outliers(self):
        """Test con datos que contienen outliers."""
        base_linear_data = self.test_generator.generate_trend_data(
            length=25,
            trend_type='linear',
            trend_slope=1.5,
            base_value=80.0,
            noise_level=0.05
        )
        
        # Añadir outliers
        outlier_data = self.test_generator.generate_outlier_data(
            base_linear_data,
            outlier_percentage=0.12,
            outlier_magnitude=4.0
        )
        
        result = self.forecast_models.linear_regression_model(outlier_data)
        
        self.assertIsNotNone(result)
        
        # La regresión lineal puede ser sensible a outliers
        # pero debería seguir funcionando
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Los coeficientes pueden verse afectados por outliers
        coefficient = result['parameters']['coefficient']
        intercept = result['parameters']['intercept']
        
        # Deberían seguir siendo números válidos
        self.assertIsInstance(coefficient, (int, float))
        self.assertIsInstance(intercept, (int, float))
        self.assertFalse(np.isnan(coefficient))
        self.assertFalse(np.isnan(intercept))
    
    def test_linear_regression_edge_cases(self):
        """Test para casos extremos."""
        # Caso 1: Datos constantes (pendiente = 0)
        constant_data = [75.0] * 15
        result_constant = self.forecast_models.linear_regression_model(constant_data)
        
        self.assertIsNotNone(result_constant)
        
        # Con datos constantes, el coeficiente debería ser 0
        coefficient = result_constant['parameters']['coefficient']
        self.assertAlmostEqual(coefficient, 0.0, places=2)
        
        # El intercepto debería ser el valor constante
        intercept = result_constant['parameters']['intercept']
        self.assertAlmostEqual(intercept, 75.0, places=1)
        
        # Caso 2: Datos con valores muy pequeños
        small_data = [0.001 * (i + 1) for i in range(12)]
        result_small = self.forecast_models.linear_regression_model(small_data)
        
        self.assertIsNotNone(result_small)
        self.assertFalse(np.isnan(result_small['metrics']['mape']))
        
        # Caso 3: Datos con valores muy grandes
        large_data = [1000000.0 + i * 10000 for i in range(15)]
        result_large = self.forecast_models.linear_regression_model(large_data)
        
        self.assertIsNotNone(result_large)
        self.assertFalse(np.isnan(result_large['metrics']['mape']))
        
        # Caso 4: Solo dos puntos (mínimo para regresión lineal)
        two_points = [10.0, 20.0]
        result_two = self.forecast_models.linear_regression_model(two_points)
        
        self.assertIsNotNone(result_two)
        # Con solo dos puntos, el ajuste debería ser perfecto
        self.assertLess(result_two['metrics']['mape'], 1.0)
    
    def test_linear_regression_reproducibility(self):
        """Test para verificar reproducibilidad de resultados."""
        data = self.test_generator.generate_trend_data(20, 'linear', 2.0, 100.0, 0.1)
        
        # Ejecutar múltiples veces
        result1 = self.forecast_models.linear_regression_model(data)
        result2 = self.forecast_models.linear_regression_model(data)
        
        # Los resultados deberían ser idénticos
        self.assertEqual(result1['parameters']['intercept'], result2['parameters']['intercept'])
        self.assertEqual(result1['parameters']['coefficient'], result2['parameters']['coefficient'])
        self.assertEqual(result1['predictions'], result2['predictions'])
        self.assertEqual(result1['metrics'], result2['metrics'])
    
    def test_linear_regression_performance_requirements(self):
        """Test para verificar que la regresión lineal cumple con requisitos de rendimiento."""
        import time
        
        # Generar dataset grande
        large_data = self.test_generator.generate_trend_data(
            length=120,  # Máximo permitido
            trend_type='linear',
            trend_slope=1.0,
            base_value=100.0,
            noise_level=0.1
        )
        
        # Medir tiempo de ejecución
        start_time = time.time()
        result = self.forecast_models.linear_regression_model(large_data)
        execution_time = time.time() - start_time
        
        # La regresión lineal debería ser muy rápida
        self.assertLess(execution_time, 1.0)  # Debería ser casi instantánea
        
        # Verificar que el resultado es válido
        self.assertIsNotNone(result)
        self.assertFalse(np.isnan(result['metrics']['mape']))
    
    def test_linear_regression_prediction_accuracy(self):
        """Test para verificar precisión de las predicciones."""
        # Crear datos lineales conocidos
        known_slope = 1.5
        known_intercept = 25.0
        length = 20
        
        known_linear_data = [known_intercept + known_slope * i for i in range(length)]
        
        result = self.forecast_models.linear_regression_model(known_linear_data)
        
        self.assertIsNotNone(result)
        
        # Verificar que los coeficientes son correctos
        fitted_intercept = result['parameters']['intercept']
        fitted_slope = result['parameters']['coefficient']
        
        self.assertAlmostEqual(fitted_slope, known_slope, places=5)
        self.assertAlmostEqual(fitted_intercept, known_intercept, places=5)
        
        # Verificar que las predicciones son exactas
        predictions = result['predictions']
        
        for i, pred in enumerate(predictions):
            expected = known_intercept + known_slope * i
            self.assertAlmostEqual(pred, expected, places=5)
        
        # Las métricas deberían ser prácticamente 0
        metrics = result['metrics']
        self.assertLess(metrics['mae'], 0.001)
        self.assertLess(metrics['mse'], 0.001)
        self.assertLess(metrics['mape'], 0.001)
    
    def test_linear_regression_parameter_interpretation(self):
        """Test para verificar interpretación correcta de parámetros."""
        # Datos con interpretación clara
        # Simular ventas que crecen 100 unidades por mes, empezando en 500
        monthly_sales = [500 + 100 * month for month in range(24)]
        
        result = self.forecast_models.linear_regression_model(monthly_sales)
        
        self.assertIsNotNone(result)
        
        # El coeficiente debería representar el crecimiento mensual
        coefficient = result['parameters']['coefficient']
        self.assertAlmostEqual(coefficient, 100.0, places=1)
        
        # El intercepto debería representar el valor inicial
        intercept = result['parameters']['intercept']
        self.assertAlmostEqual(intercept, 500.0, places=1)
        
        # Verificar que las predicciones tienen sentido
        predictions = result['predictions']
        
        # La primera predicción debería ser cercana al intercepto
        self.assertAlmostEqual(predictions[0], intercept, places=1)
        
        # La diferencia entre predicciones consecutivas debería ser el coeficiente
        for i in range(1, len(predictions)):
            diff = predictions[i] - predictions[i-1]
            self.assertAlmostEqual(diff, coefficient, places=1)


if __name__ == '__main__':
    # Ejecutar todos los tests
    unittest.main(verbosity=2)