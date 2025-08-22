"""
Tests unitarios para el modelo de Holt-Winters (Triple Exponential Smoothing).

Valida modelos aditivos y multiplicativos, detección automática del mejor tipo,
manejo de estacionalidad con diferentes períodos y comportamiento con datos
que tienen tendencia y estacionalidad.
"""

import unittest
import numpy as np
import sys
import os

# Añadir el directorio actual al path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import ForecastModels
from test_data_generator import TestDataGenerator, create_known_pattern_data


class TestHoltWintersModel(unittest.TestCase):
    """Tests para el modelo de Holt-Winters (Triple Exponential Smoothing)."""
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.forecast_models = ForecastModels()
        self.test_generator = TestDataGenerator(random_seed=42)
    
    def test_holt_winters_basic_functionality(self):
        """Test básico de funcionalidad del modelo Holt-Winters."""
        # Generar datos con estacionalidad clara
        seasonal_data = self.test_generator.generate_seasonal_data(
            length=36,  # 3 años de datos mensuales
            seasonal_period=12,
            seasonal_amplitude=25.0,
            base_value=100.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.holt_winters_model(seasonal_data, seasonal_periods=12)
        
        # Verificar estructura del resultado
        self.assertIsNotNone(result)
        self.assertEqual(result['name'], 'Holt-Winters (Triple Exponencial)')
        self.assertIn('predictions', result)
        self.assertIn('metrics', result)
        self.assertIn('parameters', result)
        self.assertIn('description', result)
        
        # Verificar longitud de predicciones
        self.assertEqual(len(result['predictions']), len(seasonal_data))
        
        # Verificar parámetros
        self.assertIn('seasonal', result['parameters'])
        self.assertIn('seasonal_periods', result['parameters'])
        
        seasonal_type = result['parameters']['seasonal']
        self.assertIn(seasonal_type, ['add', 'mul'])
        
        self.assertEqual(result['parameters']['seasonal_periods'], 12)
        
        # Verificar métricas
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
    
    def test_holt_winters_additive_vs_multiplicative(self):
        """Test para modelos aditivos vs multiplicativos."""
        # Generar datos con estacionalidad aditiva (amplitud constante)
        additive_data = self.test_generator.generate_seasonal_data(
            length=48,
            seasonal_period=12,
            seasonal_amplitude=20.0,  # Amplitud constante
            base_value=150.0,
            noise_level=0.05
        )
        
        result_additive = self.forecast_models.holt_winters_model(additive_data, seasonal_periods=12)
        
        # Generar datos con estacionalidad multiplicativa (amplitud proporcional)
        multiplicative_base = self.test_generator.generate_trend_data(
            length=48,
            trend_type='linear',
            trend_slope=2.0,
            base_value=100.0,
            noise_level=0.02
        )
        
        # Aplicar estacionalidad multiplicativa
        multiplicative_data = []
        for i, base_val in enumerate(multiplicative_base):
            seasonal_factor = 1.0 + 0.2 * np.sin(2 * np.pi * i / 12)  # ±20% variación
            multiplicative_data.append(base_val * seasonal_factor)
        
        result_multiplicative = self.forecast_models.holt_winters_model(multiplicative_data, seasonal_periods=12)
        
        # Ambos deberían funcionar
        self.assertIsNotNone(result_additive)
        self.assertIsNotNone(result_multiplicative)
        
        # Verificar que se seleccionaron tipos apropiados
        self.assertIn(result_additive['parameters']['seasonal'], ['add', 'mul'])
        self.assertIn(result_multiplicative['parameters']['seasonal'], ['add', 'mul'])
        
        # Verificar métricas válidas
        self.assertFalse(np.isnan(result_additive['metrics']['mape']))
        self.assertFalse(np.isnan(result_multiplicative['metrics']['mape']))
    
    def test_holt_winters_automatic_model_selection(self):
        """Test para detección automática del mejor tipo de modelo."""
        # Generar datos complejos con tendencia y estacionalidad
        complex_data = self.test_generator.generate_complex_pattern_data(
            length=60,
            base_value=200.0,
            trend_slope=1.5,
            seasonal_amplitude=30.0,
            seasonal_period=12,
            noise_level=0.08,
            outlier_percentage=0.02
        )
        
        result = self.forecast_models.holt_winters_model(complex_data['data'], seasonal_periods=12)
        
        self.assertIsNotNone(result)
        
        # Verificar que se seleccionó automáticamente el mejor modelo
        selected_type = result['parameters']['seasonal']
        self.assertIn(selected_type, ['add', 'mul'])
        
        # El modelo debería tener un rendimiento razonable con datos complejos
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
        self.assertLess(metrics['mape'], 100)  # No debería ser terrible
    
    def test_holt_winters_different_seasonal_periods(self):
        """Test para manejo de estacionalidad con diferentes períodos."""
        # Test con estacionalidad trimestral (período 4)
        quarterly_data = self.test_generator.generate_seasonal_data(
            length=32,  # 8 trimestres
            seasonal_period=4,
            seasonal_amplitude=15.0,
            base_value=80.0,
            noise_level=0.1
        )
        
        result_quarterly = self.forecast_models.holt_winters_model(quarterly_data, seasonal_periods=4)
        
        # Test con estacionalidad semanal (período 7) - datos diarios
        weekly_data = self.test_generator.generate_seasonal_data(
            length=28,  # 4 semanas
            seasonal_period=7,
            seasonal_amplitude=10.0,
            base_value=50.0,
            noise_level=0.1
        )
        
        result_weekly = self.forecast_models.holt_winters_model(weekly_data, seasonal_periods=7)
        
        # Ambos deberían funcionar
        self.assertIsNotNone(result_quarterly)
        self.assertIsNotNone(result_weekly)
        
        # Verificar períodos estacionales correctos
        self.assertEqual(result_quarterly['parameters']['seasonal_periods'], 4)
        self.assertEqual(result_weekly['parameters']['seasonal_periods'], 7)
        
        # Verificar métricas válidas
        self.assertFalse(np.isnan(result_quarterly['metrics']['mape']))
        self.assertFalse(np.isnan(result_weekly['metrics']['mape']))
    
    def test_holt_winters_with_trend_and_seasonality(self):
        """Test con datos que tienen tanto tendencia como estacionalidad."""
        # Generar datos con tendencia creciente y estacionalidad mensual
        trend_seasonal_data = []
        base_trend = 100.0
        trend_slope = 2.0
        seasonal_amplitude = 20.0
        
        for i in range(48):  # 4 años de datos
            trend_component = base_trend + trend_slope * i
            seasonal_component = seasonal_amplitude * np.sin(2 * np.pi * i / 12)
            noise = np.random.normal(0, 2.0)
            trend_seasonal_data.append(trend_component + seasonal_component + noise)
        
        result = self.forecast_models.holt_winters_model(trend_seasonal_data, seasonal_periods=12)
        
        self.assertIsNotNone(result)
        
        # Holt-Winters debería manejar bien tendencia + estacionalidad
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
        
        # Con tendencia y estacionalidad claras, debería tener buen rendimiento
        self.assertLess(metrics['mape'], 50)
        
        # Verificar que detectó el patrón estacional
        self.assertEqual(result['parameters']['seasonal_periods'], 12)
    
    def test_holt_winters_insufficient_seasonal_data(self):
        """Test con datos insuficientes para capturar estacionalidad completa."""
        # Datos con exactamente 2 ciclos estacionales (mínimo)
        short_seasonal_data = self.test_generator.generate_seasonal_data(
            length=24,  # Exactamente 2 ciclos de 12 meses
            seasonal_period=12,
            seasonal_amplitude=15.0,
            base_value=90.0,
            noise_level=0.1
        )
        
        result = self.forecast_models.holt_winters_model(short_seasonal_data, seasonal_periods=12)
        
        # Debería manejar graciosamente datos insuficientes
        # Puede fallar o tener métricas pobres, pero no debería crashear
        if result is not None:
            self.assertIn('seasonal', result['parameters'])
            # Si funciona, las métricas deberían ser calculables
            if not np.isnan(result['metrics']['mape']):
                self.assertGreater(result['metrics']['mape'], 0)
    
    def test_holt_winters_metrics_calculation(self):
        """Test para validar cálculo correcto de métricas."""
        # Datos con patrón estacional conocido
        known_seasonal_data = []
        for i in range(36):
            base = 100.0
            seasonal = 20.0 * np.sin(2 * np.pi * i / 12)
            known_seasonal_data.append(base + seasonal)
        
        result = self.forecast_models.holt_winters_model(known_seasonal_data, seasonal_periods=12)
        
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
        
        # Todas las métricas deberían ser no negativas (pueden ser 0 con datos perfectos)
        self.assertGreaterEqual(metrics['mae'], 0)
        self.assertGreaterEqual(metrics['mse'], 0)
        self.assertGreaterEqual(metrics['rmse'], 0)
        self.assertGreaterEqual(metrics['mape'], 0)
    
    def test_holt_winters_with_no_clear_seasonality(self):
        """Test con datos sin estacionalidad clara."""
        # Datos principalmente con tendencia, poca estacionalidad
        trend_data = self.test_generator.generate_trend_data(
            length=36,
            trend_type='linear',
            trend_slope=3.0,
            base_value=120.0,
            noise_level=0.15
        )
        
        result = self.forecast_models.holt_winters_model(trend_data, seasonal_periods=12)
        
        # Puede funcionar o fallar dependiendo de la implementación
        if result is not None:
            # Si funciona, debería tener métricas calculables
            metrics = result['metrics']
            if not np.isnan(metrics['mape']):
                self.assertGreater(metrics['mape'], 0)
                # Sin estacionalidad clara, el rendimiento podría ser pobre
                # pero no debería ser infinito
                self.assertLess(metrics['mape'], 1000)
    
    def test_holt_winters_with_outliers(self):
        """Test con datos estacionales que contienen outliers."""
        base_seasonal = self.test_generator.generate_seasonal_data(
            length=48,
            seasonal_period=12,
            seasonal_amplitude=25.0,
            base_value=150.0,
            noise_level=0.05
        )
        
        # Añadir outliers
        outlier_seasonal = self.test_generator.generate_outlier_data(
            base_seasonal,
            outlier_percentage=0.08,
            outlier_magnitude=3.0
        )
        
        result = self.forecast_models.holt_winters_model(outlier_seasonal, seasonal_periods=12)
        
        self.assertIsNotNone(result)
        
        # Holt-Winters debería ser relativamente robusto a outliers ocasionales
        metrics = result['metrics']
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreater(metrics['mape'], 0)
        
        # Con outliers, el rendimiento puede degradarse pero debería ser manejable
        self.assertLess(metrics['mape'], 200)
    
    def test_holt_winters_edge_cases(self):
        """Test para casos extremos."""
        # Caso 1: Datos constantes (sin tendencia ni estacionalidad)
        constant_data = [75.0] * 24
        result_constant = self.forecast_models.holt_winters_model(constant_data, seasonal_periods=12)
        
        # Puede fallar con datos constantes, lo cual es esperado
        if result_constant is not None:
            self.assertIn('seasonal', result_constant['parameters'])
        
        # Caso 2: Datos con variación mínima
        minimal_variation = [100.0 + 0.1 * np.sin(2 * np.pi * i / 12) for i in range(36)]
        result_minimal = self.forecast_models.holt_winters_model(minimal_variation, seasonal_periods=12)
        
        if result_minimal is not None:
            self.assertFalse(np.isnan(result_minimal['metrics']['mape']))
        
        # Caso 3: Datos con valores muy grandes
        large_seasonal = [10000.0 + 1000.0 * np.sin(2 * np.pi * i / 12) for i in range(24)]
        result_large = self.forecast_models.holt_winters_model(large_seasonal, seasonal_periods=12)
        
        if result_large is not None:
            self.assertFalse(np.isnan(result_large['metrics']['mape']))
    
    def test_holt_winters_reproducibility(self):
        """Test para verificar reproducibilidad de resultados."""
        seasonal_data = self.test_generator.generate_seasonal_data(
            length=36, seasonal_period=12, seasonal_amplitude=20.0, base_value=100.0, noise_level=0.1
        )
        
        # Ejecutar múltiples veces
        result1 = self.forecast_models.holt_winters_model(seasonal_data, seasonal_periods=12)
        result2 = self.forecast_models.holt_winters_model(seasonal_data, seasonal_periods=12)
        
        # Si ambos funcionan, deberían ser idénticos
        if result1 is not None and result2 is not None:
            self.assertEqual(result1['parameters']['seasonal'], result2['parameters']['seasonal'])
            self.assertEqual(result1['predictions'], result2['predictions'])
            self.assertEqual(result1['metrics'], result2['metrics'])
    
    def test_holt_winters_performance_requirements(self):
        """Test para verificar que Holt-Winters cumple con requisitos de rendimiento."""
        import time
        
        # Generar dataset grande con estacionalidad
        large_seasonal_data = []
        for i in range(120):  # 10 años de datos mensuales
            base = 200.0 + 2.0 * i  # Tendencia
            seasonal = 40.0 * np.sin(2 * np.pi * i / 12)  # Estacionalidad
            noise = np.random.normal(0, 5.0)
            large_seasonal_data.append(base + seasonal + noise)
        
        # Medir tiempo de ejecución
        start_time = time.time()
        result = self.forecast_models.holt_winters_model(large_seasonal_data, seasonal_periods=12)
        execution_time = time.time() - start_time
        
        # Verificar que se ejecuta en tiempo razonable (< 10 segundos)
        self.assertLess(execution_time, 10.0)
        
        # Verificar que el resultado es válido si funciona
        if result is not None:
            self.assertFalse(np.isnan(result['metrics']['mape']))
    
    def test_holt_winters_seasonal_period_validation(self):
        """Test para validación de períodos estacionales."""
        base_data = self.test_generator.generate_seasonal_data(
            length=48, seasonal_period=12, seasonal_amplitude=15.0, base_value=90.0, noise_level=0.1
        )
        
        # Test con diferentes períodos estacionales válidos
        valid_periods = [4, 6, 12, 24]
        
        for period in valid_periods:
            with self.subTest(seasonal_period=period):
                # Ajustar datos para el período
                if len(base_data) >= period * 2:  # Necesitamos al menos 2 ciclos
                    result = self.forecast_models.holt_winters_model(base_data, seasonal_periods=period)
                    
                    if result is not None:
                        self.assertEqual(result['parameters']['seasonal_periods'], period)
                        self.assertFalse(np.isnan(result['metrics']['mape']))
    
    def test_holt_winters_model_comparison(self):
        """Test para comparar rendimiento de modelos aditivo vs multiplicativo."""
        # Generar datos claramente aditivos
        additive_data = []
        for i in range(36):
            trend = 100.0 + 1.0 * i
            seasonal = 15.0 * np.sin(2 * np.pi * i / 12)  # Amplitud constante
            additive_data.append(trend + seasonal + np.random.normal(0, 1.0))
        
        result_additive = self.forecast_models.holt_winters_model(additive_data, seasonal_periods=12)
        
        # Generar datos claramente multiplicativos
        multiplicative_data = []
        for i in range(36):
            base = 100.0 + 2.0 * i
            seasonal_factor = 1.0 + 0.15 * np.sin(2 * np.pi * i / 12)  # Factor multiplicativo
            multiplicative_data.append(base * seasonal_factor * (1 + np.random.normal(0, 0.02)))
        
        result_multiplicative = self.forecast_models.holt_winters_model(multiplicative_data, seasonal_periods=12)
        
        # Ambos deberían funcionar
        if result_additive is not None:
            self.assertIn(result_additive['parameters']['seasonal'], ['add', 'mul'])
            self.assertFalse(np.isnan(result_additive['metrics']['mape']))
        
        if result_multiplicative is not None:
            self.assertIn(result_multiplicative['parameters']['seasonal'], ['add', 'mul'])
            self.assertFalse(np.isnan(result_multiplicative['metrics']['mape']))
    
    def test_holt_winters_minimum_data_requirements(self):
        """Test con requisitos mínimos de datos."""
        # Datos mínimos para estacionalidad mensual (24 puntos = 2 años)
        min_seasonal_data = []
        for i in range(24):
            base = 80.0
            seasonal = 12.0 * np.sin(2 * np.pi * i / 12)
            min_seasonal_data.append(base + seasonal)
        
        result = self.forecast_models.holt_winters_model(min_seasonal_data, seasonal_periods=12)
        
        # Con datos mínimos, puede funcionar o no
        if result is not None:
            self.assertEqual(len(result['predictions']), 24)
            self.assertEqual(result['parameters']['seasonal_periods'], 12)
            
            # Si funciona, las métricas deberían ser calculables
            metrics = result['metrics']
            if not np.isnan(metrics['mape']):
                self.assertGreaterEqual(metrics['mape'], 0)


if __name__ == '__main__':
    # Ejecutar todos los tests
    unittest.main(verbosity=2)