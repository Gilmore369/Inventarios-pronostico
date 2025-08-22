"""
Tests unitarios para el validador de cálculo de métricas.

Valida el cálculo correcto de MAE, MSE, RMSE con datos conocidos, cálculo de MAPE
con protección contra divisiones por cero, y manejo de valores NaN e infinitos
en las métricas.
"""

import unittest
import numpy as np
import sys
import os

# Añadir el directorio actual al path para importar módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import ForecastModels


class TestMetricsCalculation(unittest.TestCase):
    """Tests para el cálculo de métricas de los modelos de pronóstico."""
    
    def setUp(self):
        """Configuración inicial para cada test."""
        self.forecast_models = ForecastModels()
    
    def test_calculate_metrics_basic_functionality(self):
        """Test básico de funcionalidad del cálculo de métricas."""
        # Datos conocidos para verificar cálculos
        actual = np.array([100.0, 110.0, 120.0, 130.0, 140.0])
        predicted = np.array([98.0, 112.0, 118.0, 132.0, 138.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Verificar que todas las métricas están presentes
        self.assertIn('mae', metrics)
        self.assertIn('mse', metrics)
        self.assertIn('rmse', metrics)
        self.assertIn('mape', metrics)
        
        # Verificar que son números válidos
        self.assertFalse(np.isnan(metrics['mae']))
        self.assertFalse(np.isnan(metrics['mse']))
        self.assertFalse(np.isnan(metrics['rmse']))
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Verificar que son no negativos
        self.assertGreaterEqual(metrics['mae'], 0)
        self.assertGreaterEqual(metrics['mse'], 0)
        self.assertGreaterEqual(metrics['rmse'], 0)
        self.assertGreaterEqual(metrics['mape'], 0)
    
    def test_mae_calculation_with_known_data(self):
        """Test para verificar cálculo correcto de MAE con datos conocidos."""
        # Caso 1: Errores conocidos
        actual = np.array([10.0, 20.0, 30.0, 40.0])
        predicted = np.array([12.0, 18.0, 32.0, 38.0])  # Errores: [2, 2, 2, 2]
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        expected_mae = 2.0  # Promedio de errores absolutos
        
        self.assertAlmostEqual(metrics['mae'], expected_mae, places=2)
        
        # Caso 2: Errores mixtos
        actual = np.array([100.0, 200.0, 300.0])
        predicted = np.array([90.0, 210.0, 280.0])  # Errores: [10, 10, 20]
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        expected_mae = (10 + 10 + 20) / 3  # 13.33
        
        self.assertAlmostEqual(metrics['mae'], expected_mae, places=2)
        
        # Caso 3: Predicciones perfectas
        actual = np.array([50.0, 60.0, 70.0])
        predicted = np.array([50.0, 60.0, 70.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        self.assertAlmostEqual(metrics['mae'], 0.0, places=5)
    
    def test_mse_calculation_with_known_data(self):
        """Test para verificar cálculo correcto de MSE con datos conocidos."""
        # Caso 1: Errores conocidos
        actual = np.array([10.0, 20.0, 30.0])
        predicted = np.array([8.0, 22.0, 27.0])  # Errores: [2, -2, 3] -> [4, 4, 9]
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        expected_mse = (4 + 4 + 9) / 3  # 5.67
        
        self.assertAlmostEqual(metrics['mse'], expected_mse, places=2)
        
        # Caso 2: Errores cuadráticos grandes
        actual = np.array([100.0, 200.0])
        predicted = np.array([110.0, 180.0])  # Errores: [10, 20] -> [100, 400]
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        expected_mse = (100 + 400) / 2  # 250
        
        self.assertAlmostEqual(metrics['mse'], expected_mse, places=2)
        
        # Caso 3: Predicciones perfectas
        actual = np.array([75.0, 85.0, 95.0])
        predicted = np.array([75.0, 85.0, 95.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        self.assertAlmostEqual(metrics['mse'], 0.0, places=5)
    
    def test_rmse_calculation_with_known_data(self):
        """Test para verificar cálculo correcto de RMSE con datos conocidos."""
        # RMSE debería ser la raíz cuadrada de MSE
        actual = np.array([10.0, 20.0, 30.0, 40.0])
        predicted = np.array([12.0, 18.0, 32.0, 38.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Verificar que RMSE = sqrt(MSE)
        expected_rmse = np.sqrt(metrics['mse'])
        self.assertAlmostEqual(metrics['rmse'], expected_rmse, places=5)
        
        # Caso específico con valores conocidos
        actual = np.array([100.0, 200.0, 300.0])
        predicted = np.array([90.0, 210.0, 270.0])  # Errores: [10, -10, 30] -> [100, 100, 900]
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        expected_mse = (100 + 100 + 900) / 3  # 366.67
        expected_rmse = np.sqrt(expected_mse)  # ~19.15
        
        self.assertAlmostEqual(metrics['rmse'], expected_rmse, places=2)
    
    def test_mape_calculation_with_known_data(self):
        """Test para verificar cálculo correcto de MAPE con datos conocidos."""
        # Caso 1: Errores porcentuales conocidos
        actual = np.array([100.0, 200.0, 300.0])
        predicted = np.array([90.0, 220.0, 270.0])  # Errores: 10%, 10%, 10%
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        expected_mape = 10.0  # Promedio de 10%, 10%, 10%
        
        self.assertAlmostEqual(metrics['mape'], expected_mape, places=1)
        
        # Caso 2: Errores porcentuales mixtos
        actual = np.array([50.0, 100.0, 200.0])
        predicted = np.array([45.0, 110.0, 180.0])  # Errores: 10%, 10%, 10%
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        expected_mape = 10.0
        
        self.assertAlmostEqual(metrics['mape'], expected_mape, places=1)
        
        # Caso 3: Predicciones perfectas
        actual = np.array([80.0, 90.0, 100.0])
        predicted = np.array([80.0, 90.0, 100.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        self.assertAlmostEqual(metrics['mape'], 0.0, places=5)
    
    def test_mape_division_by_zero_protection(self):
        """Test para protección contra divisiones por cero en MAPE."""
        # Caso 1: Valores actuales con ceros
        actual = np.array([0.0, 100.0, 200.0])
        predicted = np.array([10.0, 110.0, 180.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # MAPE debería manejar la división por cero
        # Solo debería calcular para valores no cero
        # Error para 100: |100-110|/100 = 10%
        # Error para 200: |200-180|/200 = 10%
        # Promedio: 10%
        self.assertAlmostEqual(metrics['mape'], 10.0, places=1)
        
        # Caso 2: Todos los valores actuales son cero
        actual = np.array([0.0, 0.0, 0.0])
        predicted = np.array([10.0, 20.0, 30.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # MAPE debería ser NaN cuando no hay valores válidos para calcular
        self.assertTrue(np.isnan(metrics['mape']))
        
        # Caso 3: Mezcla con valores muy pequeños
        actual = np.array([0.001, 100.0, 0.0])
        predicted = np.array([0.002, 110.0, 5.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Debería calcular MAPE solo para valores válidos
        self.assertFalse(np.isnan(metrics['mape']))
        self.assertGreaterEqual(metrics['mape'], 0)
    
    def test_metrics_with_nan_values(self):
        """Test para manejo de valores NaN en las métricas."""
        # Caso 1: NaN en valores actuales
        actual = np.array([100.0, np.nan, 200.0, 300.0])
        predicted = np.array([90.0, 110.0, 210.0, 290.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Debería filtrar NaN y calcular solo con valores válidos
        self.assertFalse(np.isnan(metrics['mae']))
        self.assertFalse(np.isnan(metrics['mse']))
        self.assertFalse(np.isnan(metrics['rmse']))
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Caso 2: NaN en predicciones
        actual = np.array([100.0, 200.0, 300.0, 400.0])
        predicted = np.array([90.0, np.nan, 310.0, 390.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Debería funcionar con valores válidos
        self.assertFalse(np.isnan(metrics['mae']))
        self.assertFalse(np.isnan(metrics['mse']))
        self.assertFalse(np.isnan(metrics['rmse']))
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Caso 3: Todos los valores son NaN
        actual = np.array([np.nan, np.nan, np.nan])
        predicted = np.array([100.0, 200.0, 300.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Todas las métricas deberían ser NaN
        self.assertTrue(np.isnan(metrics['mae']))
        self.assertTrue(np.isnan(metrics['mse']))
        self.assertTrue(np.isnan(metrics['rmse']))
        self.assertTrue(np.isnan(metrics['mape']))
    
    def test_metrics_with_infinite_values(self):
        """Test para manejo de valores infinitos en las métricas."""
        # Caso 1: Valores infinitos en predicciones
        actual = np.array([100.0, 200.0, 300.0])
        predicted = np.array([np.inf, 210.0, 290.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Debería filtrar infinitos y calcular con valores válidos
        self.assertFalse(np.isnan(metrics['mae']))
        self.assertFalse(np.isinf(metrics['mae']))
        
        # Caso 2: Valores infinitos en actuales
        actual = np.array([100.0, np.inf, 300.0])
        predicted = np.array([90.0, 210.0, 310.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Debería manejar infinitos apropiadamente
        self.assertFalse(np.isnan(metrics['mae']))
        self.assertFalse(np.isinf(metrics['mae']))
    
    def test_metrics_edge_cases(self):
        """Test para casos extremos en el cálculo de métricas."""
        # Caso 1: Un solo punto de datos
        actual = np.array([100.0])
        predicted = np.array([95.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        self.assertAlmostEqual(metrics['mae'], 5.0, places=2)
        self.assertAlmostEqual(metrics['mse'], 25.0, places=2)
        self.assertAlmostEqual(metrics['rmse'], 5.0, places=2)
        self.assertAlmostEqual(metrics['mape'], 5.0, places=2)
        
        # Caso 2: Valores muy pequeños
        actual = np.array([0.001, 0.002, 0.003])
        predicted = np.array([0.0011, 0.0019, 0.0031])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Debería manejar valores pequeños sin problemas
        self.assertFalse(np.isnan(metrics['mae']))
        self.assertFalse(np.isnan(metrics['mse']))
        self.assertFalse(np.isnan(metrics['rmse']))
        self.assertFalse(np.isnan(metrics['mape']))
        
        # Caso 3: Valores muy grandes
        actual = np.array([1e6, 2e6, 3e6])
        predicted = np.array([1.1e6, 1.9e6, 3.1e6])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Debería manejar valores grandes sin problemas
        self.assertFalse(np.isnan(metrics['mae']))
        self.assertFalse(np.isnan(metrics['mse']))
        self.assertFalse(np.isnan(metrics['rmse']))
        self.assertFalse(np.isnan(metrics['mape']))
    
    def test_metrics_mathematical_relationships(self):
        """Test para verificar relaciones matemáticas entre métricas."""
        # Generar datos de prueba
        actual = np.array([50.0, 100.0, 150.0, 200.0, 250.0])
        predicted = np.array([45.0, 105.0, 140.0, 210.0, 240.0])
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Verificar que RMSE = sqrt(MSE) (con tolerancia por redondeo)
        self.assertAlmostEqual(metrics['rmse'], np.sqrt(metrics['mse']), places=2)
        
        # Verificar que MSE >= 0
        self.assertGreaterEqual(metrics['mse'], 0)
        
        # Verificar que RMSE >= 0
        self.assertGreaterEqual(metrics['rmse'], 0)
        
        # Verificar que MAE >= 0
        self.assertGreaterEqual(metrics['mae'], 0)
        
        # Verificar que MAPE >= 0
        self.assertGreaterEqual(metrics['mape'], 0)
        
        # Para la mayoría de casos, RMSE >= MAE (por la desigualdad de Jensen)
        # Aunque puede haber excepciones con pocos datos
        if len(actual) > 2:
            self.assertGreaterEqual(metrics['rmse'], metrics['mae'] * 0.9)  # Tolerancia pequeña
    
    def test_metrics_with_different_input_types(self):
        """Test para verificar que las métricas funcionan con diferentes tipos de entrada."""
        # Caso 1: Listas de Python
        actual_list = [100.0, 200.0, 300.0]
        predicted_list = [90.0, 210.0, 290.0]
        
        metrics_list = self.forecast_models.calculate_metrics(actual_list, predicted_list)
        
        # Caso 2: Arrays de NumPy
        actual_array = np.array([100.0, 200.0, 300.0])
        predicted_array = np.array([90.0, 210.0, 290.0])
        
        metrics_array = self.forecast_models.calculate_metrics(actual_array, predicted_array)
        
        # Los resultados deberían ser idénticos
        self.assertAlmostEqual(metrics_list['mae'], metrics_array['mae'], places=5)
        self.assertAlmostEqual(metrics_list['mse'], metrics_array['mse'], places=5)
        self.assertAlmostEqual(metrics_list['rmse'], metrics_array['rmse'], places=5)
        self.assertAlmostEqual(metrics_list['mape'], metrics_array['mape'], places=5)
        
        # Caso 3: Tipos mixtos
        actual_mixed = [100, 200.0, 300]  # Enteros y flotantes
        predicted_mixed = [90.0, 210, 290.0]
        
        metrics_mixed = self.forecast_models.calculate_metrics(actual_mixed, predicted_mixed)
        
        # Debería funcionar sin problemas
        self.assertFalse(np.isnan(metrics_mixed['mae']))
        self.assertFalse(np.isnan(metrics_mixed['mse']))
        self.assertFalse(np.isnan(metrics_mixed['rmse']))
        self.assertFalse(np.isnan(metrics_mixed['mape']))
    
    def test_metrics_precision_and_rounding(self):
        """Test para verificar precisión y redondeo de métricas."""
        # Datos que producen valores decimales conocidos
        actual = np.array([100.0, 200.0, 300.0])
        predicted = np.array([101.0, 199.0, 301.0])  # Errores pequeños
        
        metrics = self.forecast_models.calculate_metrics(actual, predicted)
        
        # Verificar que las métricas están redondeadas a 2 decimales (o menos si son enteros)
        mae_decimals = len(str(metrics['mae']).split('.')[-1]) if '.' in str(metrics['mae']) else 0
        mse_decimals = len(str(metrics['mse']).split('.')[-1]) if '.' in str(metrics['mse']) else 0
        self.assertLessEqual(mae_decimals, 2)
        self.assertLessEqual(mse_decimals, 2)
        
        # Verificar que los valores son razonables
        self.assertAlmostEqual(metrics['mae'], 1.0, places=2)
        self.assertAlmostEqual(metrics['mse'], 1.0, places=2)
        self.assertAlmostEqual(metrics['rmse'], 1.0, places=2)
        
        # MAPE debería ser aproximadamente 0.5% promedio
        expected_mape = (1/100 + 1/200 + 1/300) / 3 * 100
        self.assertAlmostEqual(metrics['mape'], expected_mape, places=2)
    
    def test_metrics_performance(self):
        """Test para verificar rendimiento del cálculo de métricas."""
        import time
        
        # Generar datos grandes
        large_actual = np.random.normal(100, 20, 10000)
        large_predicted = large_actual + np.random.normal(0, 5, 10000)
        
        # Medir tiempo de cálculo
        start_time = time.time()
        metrics = self.forecast_models.calculate_metrics(large_actual, large_predicted)
        execution_time = time.time() - start_time
        
        # El cálculo debería ser muy rápido
        self.assertLess(execution_time, 0.1)  # Menos de 100ms
        
        # Verificar que los resultados son válidos
        self.assertFalse(np.isnan(metrics['mae']))
        self.assertFalse(np.isnan(metrics['mse']))
        self.assertFalse(np.isnan(metrics['rmse']))
        self.assertFalse(np.isnan(metrics['mape']))


if __name__ == '__main__':
    # Ejecutar todos los tests
    unittest.main(verbosity=2)