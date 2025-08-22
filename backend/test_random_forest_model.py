"""
Tests unitarios para el modelo de Random Forest.

Valida diferentes configuraciones de hiperparámetros, optimización automática de
n_estimators y max_depth, robustez ante outliers y datos ruidosos, y creación
correcta de características temporales (mes, trimestre).
"""

import unittest
import numpy as np
import sys
import os

# Añadir el directorio actual al path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import ForecastModels
from test_data_generator import TestDataGenerator, create_known_pattern_data


class TestRandomForestModel(unittest.TestCase):
    """Tests para el modelo de Random Forest."""
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.forecast_models = ForecastModels()
        self.test_generator = TestDataGenerator(random_seed=42)
    
    def test_random_forest_basic_functionality(self):
        """Test básico de funcionalidad del modelo Random Forest."""
        # Generar datos complejos que Random Forest debería manejar bien
        complex_data = self.test_generator.generate_complex_pattern_data(
            length=40,
            base_value=100.0,
            trend_slope=1.0,
            seasonal_amplitude=15.0,
            seasonal_period=12,
            noise_level=0.1,
            outlier_percentage=0.05
        )
        
        result = self.forecast_models.random_forest_model(complex_data['data'])
        
        # Verificar estructura del resultado
        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'Random Forest')
        self.assertIn('predictions', result)
        self.assertIn('metrics', result)
        self.assertIn('parameters', result)
        self.assertIn('description', result)
        
        # Verificar longitud de predicciones
        self.assertEqual(len(result['predictions']), len(complex_data['data']))
        
        # Verificar parámetros de Random Forest
        self.assertIn('n_estimators', result['parameters'])
        self.assertIn('max_depth', result['parameters'])
        
        n_estimators = result['parameters']['n_estimators']
        max_depth = result['parameters']['max_depth']
        
        # Verificar que los parámetros están en rangos válidos
        self.assertIn(n_estimators, [50, 100])  # Valores que prueba el modelo
        self.assertIn(max_depth, [None, 5, 10])  # Valores que prueba el modelo
        
        # Verificar métricas
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreaterEqual(metrics['mape'], 0)
    
    def test_random_forest_hyperparameter_optimization(self):
        """Test para verificar optimización automática de hiperparámetros."""
        # Generar datos que deberían beneficiarse de la optimización
        optimization_data = self.test_generator.generate_complex_pattern_data(
            length=50,
            base_value=150.0,
            trend_slope=2.0,
            seasonal_amplitude=25.0,
            seasonal_period=12,
            noise_level=0.15,
            outlier_percentage=0.08
        )
        
        result = self.forecast_models.random_forest_model(optimization_data['data'])
        
        self.assertIsNotNone(result)
        
        # Verificar que se seleccionaron hiperparámetros válidos
        params = result['parameters']
        n_estimators = params['n_estimators']
        max_depth = params['max_depth']
        
        # n_estimators debería ser uno de los valores probados
        self.assertIn(n_estimators, [50, 100])
        
        # max_depth debería ser uno de los valores probados
        self.assertIn(max_depth, [None, 5, 10])
        
        # Verificar que las métricas son razonables
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertLess(metrics['mape'], 200)  # No debería ser extremadamente malo
    
    def test_random_forest_different_configurations(self):
        """Test para diferentes configuraciones de hiperparámetros."""
        # Datos de prueba
        test_data = self.test_generator.generate_trend_data(
            length=30,
            trend_type='linear',
            trend_slope=1.5,
            base_value=80.0,
            noise_level=0.2
        )
        
        result = self.forecast_models.random_forest_model(test_data)
        
        self.assertIsNotNone(result)
        
        # El modelo debería probar diferentes configuraciones y elegir la mejor
        params = result['parameters']
        
        # Verificar que los parámetros están en los rangos esperados
        self.assertIsInstance(params['n_estimators'], int)
        self.assertGreater(params['n_estimators'], 0)
        self.assertLessEqual(params['n_estimators'], 100)
        
        # max_depth puede ser None o un entero
        max_depth = params['max_depth']
        if max_depth is not None:
            self.assertIsInstance(max_depth, int)
            self.assertGreater(max_depth, 0)
            self.assertLessEqual(max_depth, 20)
        
        # Verificar métricas válidas
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
    
    def test_random_forest_robustness_to_outliers(self):
        """Test para robustez ante outliers."""
        # Generar datos base
        base_data = self.test_generator.generate_trend_data(
            length=35,
            trend_type='linear',
            trend_slope=2.0,
            base_value=100.0,
            noise_level=0.1
        )
        
        # Añadir outliers significativos
        outlier_data = self.test_generator.generate_outlier_data(
            base_data,
            outlier_percentage=0.15,  # 15% outliers
            outlier_magnitude=5.0     # Outliers grandes
        )
        
        result = self.forecast_models.random_forest_model(outlier_data)
        
        self.assertIsNotNone(result)
        
        # Random Forest debería ser robusto a outliers
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Aunque hay outliers, debería mantener un rendimiento razonable
        self.assertLess(metrics['mape'], 100)  # No debería ser extremadamente malo
        
        # Verificar que las predicciones son números válidos
        predictions = result['predictions']
        for pred in predictions:
            self.assertFalse(np.isnan(pred))
            self.assertFalse(np.isinf(pred))
    
    def test_random_forest_with_noisy_data(self):
        """Test con datos ruidosos."""
        # Generar datos con alto nivel de ruido
        noisy_data = self.test_generator.generate_stationary_data(
            length=40,
            mean_value=120.0,
            noise_level=0.5,  # Ruido muy alto
            ar_coefficient=0.2
        )
        
        result = self.forecast_models.random_forest_model(noisy_data)
        
        self.assertIsNotNone(result)
        
        # Random Forest debería manejar bien el ruido
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Con datos muy ruidosos, el rendimiento puede ser variable
        # pero debería ser calculable
        self.assertGreaterEqual(metrics['mape'], 0)
        
        # Verificar que los parámetros son válidos
        params = result['parameters']
        self.assertIn('n_estimators', params)
        self.assertIn('max_depth', params)
    
    def test_random_forest_temporal_features(self):
        """Test para validar creación correcta de características temporales."""
        # Generar datos con patrón estacional para probar características temporales
        seasonal_data = self.test_generator.generate_seasonal_data(
            length=48,  # 4 años de datos mensuales
            seasonal_period=12,
            seasonal_amplitude=20.0,
            base_value=100.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.random_forest_model(seasonal_data)
        
        self.assertIsNotNone(result)
        
        # Random Forest debería poder capturar patrones estacionales
        # usando características temporales (mes, trimestre)
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Con características temporales, debería tener un rendimiento decente
        # en datos estacionales
        self.assertLess(metrics['mape'], 150)  # Rendimiento razonable
        
        # Verificar que las predicciones tienen sentido
        predictions = result['predictions']
        self.assertEqual(len(predictions), len(seasonal_data))
        
        # Las predicciones deberían estar en un rango razonable
        pred_mean = np.mean(predictions)
        data_mean = np.mean(seasonal_data)
        self.assertAlmostEqual(pred_mean, data_mean, delta=50.0)
    
    def test_random_forest_with_trend_data(self):
        """Test con datos que tienen tendencia clara."""
        # Datos con tendencia exponencial (no lineal)
        exponential_data = self.test_generator.generate_trend_data(
            length=30,
            trend_type='exponential',
            trend_slope=0.08,
            base_value=50.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.random_forest_model(exponential_data)
        
        self.assertIsNotNone(result)
        
        # Random Forest debería manejar bien tendencias no lineales
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Con tendencia exponencial, debería tener buen rendimiento
        self.assertLess(metrics['mape'], 50)
        
        # Verificar que captura la tendencia creciente
        predictions = result['predictions']
        
        # Las predicciones deberían mostrar una tendencia general creciente
        first_half_mean = np.mean(predictions[:15])
        second_half_mean = np.mean(predictions[15:])
        self.assertGreater(second_half_mean, first_half_mean)
    
    def test_random_forest_metrics_calculation(self):
        """Test para validar cálculo correcto de métricas."""
        # Datos con patrón conocido
        known_data = []
        for i in range(25):
            # Patrón no lineal que Random Forest debería capturar bien
            value = 100 + 2 * i + 0.1 * i**2 + 5 * np.sin(i * 0.5)
            known_data.append(value)
        
        result = self.forecast_models.random_forest_model(known_data)
        
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
    
    def test_random_forest_with_complex_patterns(self):
        """Test con patrones complejos (ideal para Random Forest)."""
        # Generar datos con múltiples patrones complejos
        complex_pattern = self.test_generator.generate_complex_pattern_data(
            length=60,
            base_value=200.0,
            trend_slope=1.5,
            seasonal_amplitude=30.0,
            seasonal_period=12,
            noise_level=0.12,
            outlier_percentage=0.05
        )
        
        result = self.forecast_models.random_forest_model(complex_pattern['data'])
        
        self.assertIsNotNone(result)
        
        # Random Forest debería manejar muy bien patrones complejos
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Con patrones complejos, Random Forest debería tener buen rendimiento
        self.assertLess(metrics['mape'], 30)  # Debería ser bastante bueno
        
        # Verificar que los parámetros optimizados son razonables
        params = result['parameters']
        n_estimators = params['n_estimators']
        max_depth = params['max_depth']
        
        # Con datos complejos, podría beneficiarse de más árboles
        self.assertGreaterEqual(n_estimators, 50)
    
    def test_random_forest_edge_cases(self):
        """Test para casos extremos."""
        # Caso 1: Datos constantes
        constant_data = [85.0] * 20
        result_constant = self.forecast_models.random_forest_model(constant_data)
        
        self.assertIsNotNone(result_constant)
        
        # Con datos constantes, debería predecir valores cercanos a la constante
        predictions = result_constant['predictions']
        for pred in predictions:
            self.assertAlmostEqual(pred, 85.0, delta=10.0)
        
        # Caso 2: Datos mínimos (12 puntos)
        min_data = list(range(100, 112))
        result_min = self.forecast_models.random_forest_model(min_data)
        
        self.assertIsNotNone(result_min)
        self.assertEqual(len(result_min['predictions']), 12)
        
        # Caso 3: Datos con valores muy pequeños
        small_data = [0.001 * (i + 1) for i in range(15)]
        result_small = self.forecast_models.random_forest_model(small_data)
        
        self.assertIsNotNone(result_small)
        self.assertFalse(np.isnan(result_small['metrics']['mape']))
        
        # Caso 4: Datos con valores muy grandes
        large_data = [1000000.0 + i * 10000 for i in range(18)]
        result_large = self.forecast_models.random_forest_model(large_data)
        
        self.assertIsNotNone(result_large)
        self.assertFalse(np.isnan(result_large['metrics']['mape']))
    
    def test_random_forest_reproducibility(self):
        """Test para verificar reproducibilidad de resultados."""
        data = self.test_generator.generate_complex_pattern_data(30)['data']
        
        # Ejecutar múltiples veces
        result1 = self.forecast_models.random_forest_model(data)
        result2 = self.forecast_models.random_forest_model(data)
        
        # Los resultados deberían ser idénticos (random_state=42 fijo)
        self.assertEqual(result1['parameters']['n_estimators'], result2['parameters']['n_estimators'])
        self.assertEqual(result1['parameters']['max_depth'], result2['parameters']['max_depth'])
        
        # Las predicciones deberían ser muy similares
        pred1 = result1['predictions']
        pred2 = result2['predictions']
        
        for p1, p2 in zip(pred1, pred2):
            self.assertAlmostEqual(p1, p2, places=5)
    
    def test_random_forest_performance_requirements(self):
        """Test para verificar que Random Forest cumple con requisitos de rendimiento."""
        import time
        
        # Generar dataset grande
        large_data = self.test_generator.generate_complex_pattern_data(
            length=100,  # Dataset grande pero manejable
            base_value=150.0,
            trend_slope=1.0,
            seasonal_amplitude=20.0,
            seasonal_period=12,
            noise_level=0.1,
            outlier_percentage=0.03
        )
        
        # Medir tiempo de ejecución
        start_time = time.time()
        result = self.forecast_models.random_forest_model(large_data['data'])
        execution_time = time.time() - start_time
        
        # Random Forest puede ser más lento pero debería ser razonable
        self.assertLess(execution_time, 10.0)  # Tiempo generoso para Random Forest
        
        # Verificar que el resultado es válido
        self.assertIsNotNone(result)
        self.assertFalse(np.isnan(result['metrics']['mape']))
    
    def test_random_forest_feature_engineering(self):
        """Test para verificar que las características temporales se crean correctamente."""
        # Datos que deberían beneficiarse de características temporales
        temporal_data = []
        for i in range(36):  # 3 años de datos
            # Patrón que varía por mes y trimestre
            month = (i % 12) + 1
            quarter = ((i % 12) // 3) + 1
            
            base_value = 100
            monthly_effect = 10 * np.sin(2 * np.pi * month / 12)
            quarterly_effect = 5 * np.cos(2 * np.pi * quarter / 4)
            
            temporal_data.append(base_value + monthly_effect + quarterly_effect)
        
        result = self.forecast_models.random_forest_model(temporal_data)
        
        self.assertIsNotNone(result)
        
        # Random Forest debería capturar los patrones temporales
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Con características temporales bien definidas, debería tener buen rendimiento
        self.assertLess(metrics['mape'], 40)
        
        # Verificar que las predicciones capturan la variabilidad temporal
        predictions = result['predictions']
        pred_std = np.std(predictions)
        data_std = np.std(temporal_data)
        
        # La variabilidad de las predicciones debería ser similar a la de los datos
        self.assertAlmostEqual(pred_std, data_std, delta=data_std * 0.5)
    
    def test_random_forest_parameter_ranges(self):
        """Test para verificar que los parámetros están en rangos válidos."""
        # Probar con diferentes tipos de datos
        test_datasets = [
            self.test_generator.generate_trend_data(25, 'linear', 2.0, 100.0, 0.1),
            self.test_generator.generate_seasonal_data(36, 12, 15.0, 80.0, 0.1),
            self.test_generator.generate_stationary_data(30, 120.0, 0.2, 0.3),
            self.test_generator.generate_complex_pattern_data(40)['data']
        ]
        
        for i, data in enumerate(test_datasets):
            with self.subTest(dataset=i):
                result = self.forecast_models.random_forest_model(data)
                
                self.assertIsNotNone(result, f"Dataset {i} failed")
                
                params = result['parameters']
                n_estimators = params['n_estimators']
                max_depth = params['max_depth']
                
                # Verificar rangos de n_estimators
                self.assertGreaterEqual(n_estimators, 10)
                self.assertLessEqual(n_estimators, 200)
                
                # Verificar rangos de max_depth
                if max_depth is not None:
                    self.assertGreaterEqual(max_depth, 1)
                    self.assertLessEqual(max_depth, 50)
                
                # Verificar métricas válidas
                metrics = result['metrics']
                self.assertFalse(np.isnan(metrics['mape']))


if __name__ == '__main__':
    # Ejecutar todos los tests
    unittest.main(verbosity=2)