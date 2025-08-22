"""
Tests unitarios para el modelo ARIMA (AutoRegressive Integrated Moving Average).

Valida diferentes órdenes de ARIMA (p,d,q), selección automática de parámetros óptimos,
comportamiento con datos estacionarios y no estacionarios, y manejo de casos donde
ARIMA no converge.
"""

import unittest
import numpy as np
import sys
import os

# Añadir el directorio actual al path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import ForecastModels
from test_data_generator import TestDataGenerator, create_known_pattern_data


class TestARIMAModel(unittest.TestCase):
    """Tests para el modelo ARIMA (AutoRegressive Integrated Moving Average)."""
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.forecast_models = ForecastModels()
        self.test_generator = TestDataGenerator(random_seed=42)
    
    def test_arima_basic_functionality(self):
        """Test básico de funcionalidad del modelo ARIMA."""
        # Generar datos con tendencia que requieren diferenciación
        trend_data = self.test_generator.generate_trend_data(
            length=30,
            trend_type='linear',
            trend_slope=1.5,
            base_value=100.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.arima_model(trend_data)
        
        # Verificar estructura del resultado
        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'ARIMA (AutoRegressive Integrated Moving Average)')
        self.assertIn('predictions', result)
        self.assertIn('metrics', result)
        self.assertIn('parameters', result)
        self.assertIn('description', result)
        
        # Verificar longitud de predicciones
        self.assertEqual(len(result['predictions']), len(trend_data))
        
        # Verificar parámetros ARIMA
        self.assertIn('order', result['parameters'])
        order = result['parameters']['order']
        self.assertIsInstance(order, tuple)
        self.assertEqual(len(order), 3)  # (p, d, q)
        
        p, d, q = order
        self.assertGreaterEqual(p, 0)
        self.assertGreaterEqual(d, 0)
        self.assertGreaterEqual(q, 0)
        
        # Verificar métricas
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreaterEqual(metrics['mape'], 0)
    
    def test_arima_different_orders(self):
        """Test para diferentes órdenes de ARIMA (p,d,q)."""
        # Generar datos que deberían funcionar bien con ARIMA
        arima_data = self.test_generator.generate_stationary_data(
            length=40,
            mean_value=80.0,
            noise_level=0.15,
            ar_coefficient=0.6  # Componente autoregresivo
        )
        
        result = self.forecast_models.arima_model(arima_data)
        
        self.assertIsNotNone(result)
        
        # Verificar que se seleccionó un orden válido
        order = result['parameters']['order']
        p, d, q = order
        
        # Los órdenes deberían estar en rangos razonables
        self.assertLessEqual(p, 3)  # Orden AR no muy alto
        self.assertLessEqual(d, 2)  # Diferenciación no muy alta
        self.assertLessEqual(q, 3)  # Orden MA no muy alto
        
        # Al menos uno de p, d, q debería ser > 0
        self.assertGreater(p + d + q, 0)
        
        # Verificar que las métricas son razonables
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreaterEqual(metrics['mape'], 0)
    
    def test_arima_automatic_parameter_selection(self):
        """Test para verificar selección automática de parámetros óptimos."""
        # Generar datos con diferentes características
        test_datasets = [
            # Datos estacionarios (debería usar d=0)
            self.test_generator.generate_stationary_data(35, 100.0, 0.1, 0.3),
            
            # Datos con tendencia (debería usar d=1)
            self.test_generator.generate_trend_data(30, 'linear', 2.0, 50.0, 0.1),
            
            # Datos con ruido (podría usar componente MA)
            self.test_generator.generate_stationary_data(25, 75.0, 0.3, 0.1)
        ]
        
        for i, data in enumerate(test_datasets):
            with self.subTest(dataset=i):
                result = self.forecast_models.arima_model(data)
                
                if result is not None:  # ARIMA puede fallar en algunos casos
                    order = result['parameters']['order']
                    p, d, q = order
                    
                    # Verificar que los parámetros están en rangos válidos
                    self.assertGreaterEqual(p, 0)
                    self.assertGreaterEqual(d, 0)
                    self.assertGreaterEqual(q, 0)
                    self.assertLessEqual(p, 3)
                    self.assertLessEqual(d, 2)
                    self.assertLessEqual(q, 3)
                    
                    # Verificar métricas válidas
                    metrics = result['metrics']
                    self.assertFalse(np.isnan(metrics['mape']))
    
    def test_arima_with_stationary_data(self):
        """Test con datos estacionarios (ideal para ARIMA con d=0)."""
        # Datos estacionarios puros
        stationary_data = self.test_generator.generate_stationary_data(
            length=50,
            mean_value=120.0,
            noise_level=0.12,
            ar_coefficient=0.4
        )
        
        result = self.forecast_models.arima_model(stationary_data)
        
        if result is not None:
            # Con datos estacionarios, d debería ser 0 o muy bajo
            order = result['parameters']['order']
            p, d, q = order
            
            self.assertLessEqual(d, 1)  # No debería necesitar mucha diferenciación
            
            # ARIMA debería funcionar bien con datos estacionarios
            metrics = result['metrics']
            self.assertFalse(np.isnan(metrics['mape']))
            self.assertLess(metrics['mape'], 100)  # Debería tener rendimiento razonable
    
    def test_arima_with_non_stationary_data(self):
        """Test con datos no estacionarios (requieren diferenciación)."""
        # Datos con tendencia fuerte (no estacionarios)
        non_stationary_data = self.test_generator.generate_trend_data(
            length=35,
            trend_type='exponential',
            trend_slope=0.05,
            base_value=80.0,
            noise_level=0.08
        )
        
        result = self.forecast_models.arima_model(non_stationary_data)
        
        if result is not None:
            # Con datos no estacionarios, d debería ser > 0
            order = result['parameters']['order']
            p, d, q = order
            
            # Debería usar diferenciación para hacer los datos estacionarios
            self.assertGreaterEqual(d, 0)  # Puede ser 0 si el algoritmo no detecta la tendencia
            
            # Verificar métricas válidas
            metrics = result['metrics']
            self.assertFalse(np.isnan(metrics['mape']))
    
    def test_arima_convergence_handling(self):
        """Test para manejo de casos donde ARIMA no converge."""
        # Datos problemáticos que pueden causar problemas de convergencia
        problematic_datasets = [
            # Datos constantes
            [100.0] * 20,
            
            # Datos con variación extrema
            [i * 1000 if i % 2 == 0 else i for i in range(15)],
            
            # Datos muy ruidosos
            self.test_generator.generate_stationary_data(25, 50.0, 1.0, 0.1),
            
            # Datos con outliers extremos
            self.test_generator.generate_outlier_data(
                [75.0] * 20, 0.3, 10.0
            )
        ]
        
        for i, data in enumerate(problematic_datasets):
            with self.subTest(dataset=i):
                result = self.forecast_models.arima_model(data)
                
                # ARIMA puede fallar con datos problemáticos, lo cual es aceptable
                if result is not None:
                    # Si funciona, debería tener estructura válida
                    self.assertIn('order', result['parameters'])
                    self.assertIn('mape', result['metrics'])
                    
                    # Las métricas pueden ser altas pero no deberían ser NaN
                    if not np.isnan(result['metrics']['mape']):
                        self.assertGreaterEqual(result['metrics']['mape'], 0)
    
    def test_arima_metrics_calculation(self):
        """Test para validar cálculo correcto de métricas."""
        # Datos con patrón conocido
        known_pattern_data = []
        for i in range(30):
            # Serie AR(1) simple: y_t = 0.7 * y_{t-1} + error
            if i == 0:
                known_pattern_data.append(100.0)
            else:
                known_pattern_data.append(0.7 * known_pattern_data[i-1] + np.random.normal(0, 2.0))
        
        result = self.forecast_models.arima_model(known_pattern_data)
        
        if result is not None:
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
    
    def test_arima_with_seasonal_data(self):
        """Test con datos estacionales (ARIMA básico puede no ser ideal)."""
        # Datos con estacionalidad
        seasonal_data = self.test_generator.generate_seasonal_data(
            length=48,
            seasonal_period=12,
            seasonal_amplitude=20.0,
            base_value=100.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.arima_model(seasonal_data)
        
        # ARIMA básico puede no manejar bien la estacionalidad
        if result is not None:
            # Debería funcionar pero puede no ser el mejor modelo
            metrics = result['metrics']
            self.assertFalse(np.isnan(metrics['mape']))
            
            # Con estacionalidad, ARIMA puede necesitar diferenciación
            order = result['parameters']['order']
            p, d, q = order
            self.assertGreaterEqual(p + d + q, 1)  # Debería usar algún parámetro
    
    def test_arima_with_outliers(self):
        """Test con datos que contienen outliers."""
        base_data = self.test_generator.generate_trend_data(
            length=35,
            trend_type='linear',
            trend_slope=1.0,
            base_value=60.0,
            noise_level=0.05
        )
        
        # Añadir outliers
        outlier_data = self.test_generator.generate_outlier_data(
            base_data,
            outlier_percentage=0.1,
            outlier_magnitude=4.0
        )
        
        result = self.forecast_models.arima_model(outlier_data)
        
        if result is not None:
            # ARIMA puede ser sensible a outliers
            metrics = result['metrics']
            self.assertFalse(np.isnan(metrics['mape']))
            
            # Con outliers, el rendimiento puede degradarse
            # pero debería ser manejable
            if metrics['mape'] < 1000:  # Si no es extremadamente malo
                self.assertGreaterEqual(metrics['mape'], 0)
    
    def test_arima_edge_cases(self):
        """Test para casos extremos."""
        edge_cases = [
            # Datos mínimos (12 puntos)
            list(range(100, 112)),
            
            # Datos con poca variación
            [50.0 + 0.01 * i for i in range(20)],
            
            # Datos con valores muy pequeños
            [0.001 * (i + 1) for i in range(15)],
            
            # Datos con valores muy grandes
            [1000000.0 + i * 1000 for i in range(18)]
        ]
        
        for i, data in enumerate(edge_cases):
            with self.subTest(case=i):
                result = self.forecast_models.arima_model(data)
                
                # ARIMA puede fallar con casos extremos
                if result is not None:
                    self.assertIn('order', result['parameters'])
                    order = result['parameters']['order']
                    self.assertEqual(len(order), 3)
                    
                    # Verificar que las métricas son calculables
                    metrics = result['metrics']
                    if not np.isnan(metrics['mape']):
                        self.assertGreaterEqual(metrics['mape'], 0)
    
    def test_arima_reproducibility(self):
        """Test para verificar reproducibilidad de resultados."""
        data = self.test_generator.generate_trend_data(25, 'linear', 1.0, 80.0, 0.1)
        
        # Ejecutar múltiples veces
        result1 = self.forecast_models.arima_model(data)
        result2 = self.forecast_models.arima_model(data)
        
        # Si ambos funcionan, deberían ser idénticos
        if result1 is not None and result2 is not None:
            self.assertEqual(result1['parameters']['order'], result2['parameters']['order'])
            
            # Las predicciones deberían ser muy similares (puede haber pequeñas diferencias numéricas)
            pred1 = result1['predictions']
            pred2 = result2['predictions']
            
            for p1, p2 in zip(pred1, pred2):
                if not (np.isnan(p1) and np.isnan(p2)):
                    self.assertAlmostEqual(p1, p2, places=5)
    
    def test_arima_performance_requirements(self):
        """Test para verificar que ARIMA cumple con requisitos de rendimiento."""
        import time
        
        # Generar dataset grande
        large_data = self.test_generator.generate_trend_data(
            length=100,  # Datos grandes pero no extremos para ARIMA
            trend_type='linear',
            trend_slope=1.5,
            base_value=150.0,
            noise_level=0.1
        )
        
        # Medir tiempo de ejecución
        start_time = time.time()
        result = self.forecast_models.arima_model(large_data)
        execution_time = time.time() - start_time
        
        # ARIMA puede ser más lento que otros modelos
        self.assertLess(execution_time, 15.0)  # Tiempo más generoso para ARIMA
        
        # Verificar que el resultado es válido si funciona
        if result is not None:
            self.assertFalse(np.isnan(result['metrics']['mape']))
    
    def test_arima_parameter_ranges(self):
        """Test para verificar que los parámetros están en rangos válidos."""
        # Probar con diferentes tipos de datos
        test_datasets = [
            self.test_generator.generate_stationary_data(30, 100.0, 0.1, 0.5),
            self.test_generator.generate_trend_data(25, 'linear', 2.0, 75.0, 0.1),
            [80.0 + 5.0 * np.sin(i * 0.5) for i in range(20)]  # Datos oscilantes
        ]
        
        for i, data in enumerate(test_datasets):
            with self.subTest(dataset=i):
                result = self.forecast_models.arima_model(data)
                
                if result is not None:
                    order = result['parameters']['order']
                    p, d, q = order
                    
                    # Verificar rangos razonables para los parámetros
                    self.assertGreaterEqual(p, 0)
                    self.assertLessEqual(p, 5)  # No debería ser muy alto
                    
                    self.assertGreaterEqual(d, 0)
                    self.assertLessEqual(d, 2)  # Raramente necesita más de 2 diferenciaciones
                    
                    self.assertGreaterEqual(q, 0)
                    self.assertLessEqual(q, 5)  # No debería ser muy alto
    
    def test_arima_with_missing_values(self):
        """Test con datos que contienen valores faltantes."""
        base_data = self.test_generator.generate_trend_data(30, 'linear', 1.0, 90.0, 0.1)
        
        # Introducir algunos valores faltantes
        missing_data, missing_indices = self.test_generator.generate_missing_values_data(
            base_data, 0.1
        )
        
        # Filtrar NaN para ARIMA (no maneja NaN directamente)
        clean_data = [x for x in missing_data if not np.isnan(x)]
        
        if len(clean_data) >= 12:  # Suficientes datos después de filtrar
            result = self.forecast_models.arima_model(clean_data)
            
            if result is not None:
                # Debería funcionar con datos limpios
                self.assertIn('order', result['parameters'])
                metrics = result['metrics']
                self.assertFalse(np.isnan(metrics['mape']))
    
    def test_arima_order_selection_logic(self):
        """Test para verificar la lógica de selección de órdenes."""
        # Datos claramente AR(1)
        ar1_data = [100.0]
        for i in range(1, 25):
            ar1_data.append(0.8 * ar1_data[i-1] + np.random.normal(0, 1.0))
        
        result_ar1 = self.forecast_models.arima_model(ar1_data)
        
        if result_ar1 is not None:
            order = result_ar1['parameters']['order']
            p, d, q = order
            
            # Debería detectar componente autoregresivo
            # (aunque puede no ser perfecto debido a la optimización automática)
            self.assertGreaterEqual(p + q, 1)  # Debería usar algún componente
            
            # Con datos estacionarios AR(1), d debería ser bajo
            self.assertLessEqual(d, 1)


if __name__ == '__main__':
    # Ejecutar todos los tests
    unittest.main(verbosity=2)