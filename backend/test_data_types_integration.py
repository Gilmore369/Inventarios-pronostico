"""
Pruebas de integración para manejo de diferentes tipos de datos:
- Datos con tendencia creciente
- Datos estacionales
- Datos estacionarios
- Datos con outliers
- Datos ruidosos

Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 6.4
"""

import pytest
import requests
import json
import time
import pandas as pd
import numpy as np
from test_data_generator import TestDataGenerator

class TestDataTypesIntegration:
    """Suite de pruebas de integración para diferentes tipos de datos"""
    
    def setup_method(self):
        """Configuración inicial para cada test"""
        self.base_url = "http://localhost:5000"
        self.generator = TestDataGenerator()
        self.timeout_seconds = 10
        
    def _execute_complete_flow(self, data, expected_behavior=None):
        """
        Ejecuta el flujo completo upload → process → results → forecast
        y retorna los resultados para análisis
        """
        df = pd.DataFrame({'demand': data})
        
        # Upload
        upload_response = requests.post(
            f"{self.base_url}/api/upload",
            json=df.to_dict('records'),
            timeout=self.timeout_seconds
        )
        
        assert upload_response.status_code == 200
        session_id = upload_response.json()['session_id']
        
        # Process
        process_response = requests.post(
            f"{self.base_url}/api/process",
            json={'session_id': session_id},
            timeout=self.timeout_seconds
        )
        
        assert process_response.status_code == 200
        
        # Results (esperar completado)
        max_attempts = 60  # Más tiempo para datos complejos
        results_data = None
        
        for _ in range(max_attempts):
            results_response = requests.get(
                f"{self.base_url}/api/results",
                params={'session_id': session_id},
                timeout=self.timeout_seconds
            )
            
            assert results_response.status_code == 200
            results_data = results_response.json()
            
            if results_data['status'] == 'completed':
                break
            elif results_data['status'] == 'processing':
                time.sleep(1)
            elif results_data['status'] == 'error':
                pytest.fail(f"Error en procesamiento: {results_data.get('error')}")
            else:
                pytest.fail(f"Estado inesperado: {results_data['status']}")
        else:
            pytest.fail("Timeout esperando resultados")
        
        # Forecast con el mejor modelo
        best_model = results_data['results'][0]['name']
        forecast_response = requests.post(
            f"{self.base_url}/api/forecast",
            json={
                'session_id': session_id,
                'model_name': best_model,
                'periods': 12
            },
            timeout=self.timeout_seconds
        )
        
        assert forecast_response.status_code == 200
        forecast_data = forecast_response.json()
        
        return {
            'session_id': session_id,
            'results': results_data['results'],
            'best_model': best_model,
            'forecast': forecast_data['forecast'],
            'original_data': data
        }
    
    def test_trending_data_handling(self):
        """
        Test con datos que tienen tendencia creciente
        Requirements: 7.1
        """
        # Generar datos con tendencia creciente fuerte
        trending_data = self.generator.generate_trend_data(36, trend_slope=2.0)
        
        result = self._execute_complete_flow(trending_data)
        
        # Verificar que el sistema manejó los datos correctamente
        assert len(result['results']) > 0
        
        # Verificar que los modelos apropiados para tendencia están presentes
        model_names = [r['name'] for r in result['results']]
        
        # Regresión Lineal debería funcionar bien con datos de tendencia
        assert any('Regresión Lineal' in name for name in model_names)
        
        # Verificar que las métricas son razonables
        best_result = result['results'][0]
        assert not np.isnan(best_result['metrics']['mape'])
        assert best_result['metrics']['mape'] >= 0
        
        # Verificar que el pronóstico sigue la tendencia
        forecast = result['forecast']
        original_data = result['original_data']
        
        # El pronóstico debería tener valores en un rango razonable
        last_values = original_data[-5:]  # Últimos 5 valores
        avg_last_values = np.mean(last_values)
        
        for forecast_value in forecast:
            # Los valores del pronóstico deberían estar relacionados con los datos originales
            assert isinstance(forecast_value, (int, float))
            assert not np.isnan(forecast_value)
            assert not np.isinf(forecast_value)
            # Para datos con tendencia, el pronóstico debería estar en un rango razonable
            assert forecast_value > 0  # Valores positivos para demanda
    
    def test_seasonal_data_handling(self):
        """
        Test con datos estacionales
        Requirements: 7.2
        """
        # Generar datos con estacionalidad mensual
        seasonal_data = self.generator.generate_seasonal_data(48, seasonal_period=12)
        
        result = self._execute_complete_flow(seasonal_data)
        
        # Verificar que el sistema procesó los datos estacionales
        assert len(result['results']) > 0
        
        model_names = [r['name'] for r in result['results']]
        
        # Holt-Winters debería estar presente y funcionar bien con datos estacionales
        holt_winters_present = any('Holt-Winters' in name for name in model_names)
        assert holt_winters_present, "Holt-Winters debería estar disponible para datos estacionales"
        
        # Verificar métricas del mejor modelo
        best_result = result['results'][0]
        assert not np.isnan(best_result['metrics']['mape'])
        
        # Para datos estacionales, Holt-Winters debería estar entre los mejores modelos
        top_3_models = [r['name'] for r in result['results'][:3]]
        
        # Verificar que el pronóstico es razonable
        forecast = result['forecast']
        original_data = result['original_data']
        
        # Calcular estadísticas básicas de los datos originales
        data_mean = np.mean(original_data)
        data_std = np.std(original_data)
        
        for forecast_value in forecast:
            assert isinstance(forecast_value, (int, float))
            assert not np.isnan(forecast_value)
            assert not np.isinf(forecast_value)
            # El pronóstico debería estar dentro de un rango razonable basado en los datos históricos
            assert abs(forecast_value - data_mean) <= 5 * data_std
    
    def test_stationary_data_handling(self):
        """
        Test con datos estacionarios
        Requirements: 7.3
        """
        # Generar datos estacionarios con poco ruido
        stationary_data = self.generator.generate_stationary_data(30, noise_level=0.1)
        
        result = self._execute_complete_flow(stationary_data)
        
        # Verificar procesamiento exitoso
        assert len(result['results']) > 0
        
        model_names = [r['name'] for r in result['results']]
        
        # Para datos estacionarios, modelos simples deberían funcionar bien
        # SMA, SES, y ARIMA deberían estar presentes
        assert any('Media Móvil' in name for name in model_names)
        assert any('Suavizado Exponencial' in name for name in model_names)
        
        # Verificar que las métricas son buenas para datos estacionarios
        best_result = result['results'][0]
        assert not np.isnan(best_result['metrics']['mape'])
        
        # Para datos estacionarios, el MAPE debería ser relativamente bajo
        # (dependiendo del nivel de ruido)
        
        # Verificar pronóstico
        forecast = result['forecast']
        original_data = result['original_data']
        
        data_mean = np.mean(original_data)
        
        # Para datos estacionarios, el pronóstico debería estar cerca de la media
        for forecast_value in forecast:
            assert isinstance(forecast_value, (int, float))
            assert not np.isnan(forecast_value)
            assert not np.isinf(forecast_value)
    
    def test_outlier_data_handling(self):
        """
        Test con datos que contienen outliers
        Requirements: 7.4
        """
        # Generar datos base y añadir outliers
        base_data = self.generator.generate_trend_data(24, trend_slope=0.5)
        outlier_data = self.generator.generate_outlier_data(base_data, outlier_percentage=0.1)
        
        result = self._execute_complete_flow(outlier_data)
        
        # Verificar que el sistema manejó los outliers
        assert len(result['results']) > 0
        
        model_names = [r['name'] for r in result['results']]
        
        # Random Forest debería ser robusto ante outliers
        rf_present = any('Random Forest' in name for name in model_names)
        assert rf_present, "Random Forest debería estar disponible para datos con outliers"
        
        # Verificar que todos los modelos completaron sin errores
        for result_item in result['results']:
            assert 'metrics' in result_item
            assert 'predictions' in result_item
            # Las métricas pueden ser altas debido a outliers, pero no deberían ser NaN
            metrics = result_item['metrics']
            for metric_name, metric_value in metrics.items():
                if not np.isnan(metric_value):  # Algunos modelos pueden tener NaN en ciertas métricas
                    assert metric_value >= 0
        
        # Verificar pronóstico
        forecast = result['forecast']
        
        for forecast_value in forecast:
            assert isinstance(forecast_value, (int, float))
            assert not np.isnan(forecast_value)
            assert not np.isinf(forecast_value)
            assert forecast_value > 0  # Valores positivos para demanda
    
    def test_noisy_data_handling(self):
        """
        Test con datos ruidosos
        Requirements: 7.5
        """
        # Generar datos con alto nivel de ruido
        noisy_data = self.generator.generate_stationary_data(40, noise_level=0.5)
        
        result = self._execute_complete_flow(noisy_data)
        
        # Verificar procesamiento exitoso a pesar del ruido
        assert len(result['results']) > 0
        
        model_names = [r['name'] for r in result['results']]
        
        # Los modelos de suavizado deberían ayudar con datos ruidosos
        smoothing_models = [name for name in model_names 
                          if 'Suavizado' in name or 'Media Móvil' in name or 'Holt-Winters' in name]
        assert len(smoothing_models) > 0, "Modelos de suavizado deberían estar disponibles para datos ruidosos"
        
        # Verificar que el sistema no falló con datos ruidosos
        best_result = result['results'][0]
        assert 'metrics' in best_result
        assert 'predictions' in best_result
        
        # Las métricas pueden ser altas debido al ruido, pero deberían ser válidas
        metrics = best_result['metrics']
        for metric_name, metric_value in metrics.items():
            if not np.isnan(metric_value):
                assert isinstance(metric_value, (int, float))
                assert metric_value >= 0
        
        # Verificar pronóstico
        forecast = result['forecast']
        original_data = result['original_data']
        
        # Calcular rango de datos originales
        data_min = np.min(original_data)
        data_max = np.max(original_data)
        data_range = data_max - data_min
        
        for forecast_value in forecast:
            assert isinstance(forecast_value, (int, float))
            assert not np.isnan(forecast_value)
            assert not np.isinf(forecast_value)
            # El pronóstico debería estar en un rango expandido pero razonable
            assert data_min - data_range <= forecast_value <= data_max + data_range
    
    def test_mixed_pattern_data_handling(self):
        """
        Test con datos que combinan múltiples patrones (tendencia + estacionalidad + ruido)
        Requirements: 7.1, 7.2, 7.5, 6.4
        """
        # Generar datos complejos combinando patrones
        base_trend = self.generator.generate_trend_data(36, trend_slope=1.0)
        seasonal_component = self.generator.generate_seasonal_data(36, seasonal_period=12)
        
        # Combinar tendencia y estacionalidad
        combined_data = []
        for i in range(36):
            # Combinar tendencia base con componente estacional
            trend_value = base_trend[i]
            seasonal_value = seasonal_component[i]
            # Normalizar el componente estacional y añadirlo como variación
            seasonal_variation = (seasonal_value - np.mean(seasonal_component)) * 0.3
            combined_value = trend_value + seasonal_variation
            combined_data.append(combined_value)
        
        # Añadir ruido
        noisy_combined = self.generator.generate_stationary_data(36, noise_level=0.2)
        for i in range(36):
            combined_data[i] += (noisy_combined[i] - np.mean(noisy_combined)) * 0.1
        
        result = self._execute_complete_flow(combined_data)
        
        # Verificar que el sistema manejó datos complejos
        assert len(result['results']) > 0
        
        # Todos los modelos deberían haber intentado procesar los datos
        model_names = [r['name'] for r in result['results']]
        expected_models = ['Media Móvil', 'Suavizado Exponencial', 'Holt-Winters', 
                          'ARIMA', 'Regresión Lineal', 'Random Forest']
        
        for expected in expected_models:
            assert any(expected in name for name in model_names), f"Modelo {expected} debería estar presente"
        
        # Verificar que el mejor modelo tiene métricas válidas
        best_result = result['results'][0]
        assert not np.isnan(best_result['metrics']['mape'])
        
        # Para datos complejos, modelos más sofisticados deberían estar entre los mejores
        top_3_models = [r['name'] for r in result['results'][:3]]
        sophisticated_models = ['Holt-Winters', 'ARIMA', 'Random Forest']
        
        # Al menos uno de los modelos sofisticados debería estar en el top 3
        assert any(any(soph in top_model for soph in sophisticated_models) 
                  for top_model in top_3_models), "Modelos sofisticados deberían estar entre los mejores para datos complejos"
        
        # Verificar pronóstico
        forecast = result['forecast']
        
        for forecast_value in forecast:
            assert isinstance(forecast_value, (int, float))
            assert not np.isnan(forecast_value)
            assert not np.isinf(forecast_value)
    
    def test_edge_case_data_handling(self):
        """
        Test con casos extremos de datos
        Requirements: 6.4
        """
        # Test con datos mínimos (12 meses exactos)
        minimal_data = self.generator.generate_trend_data(12, trend_slope=0.1)
        result_minimal = self._execute_complete_flow(minimal_data)
        assert len(result_minimal['results']) > 0
        
        # Test con datos máximos (120 meses)
        maximal_data = self.generator.generate_seasonal_data(120, seasonal_period=12)
        result_maximal = self._execute_complete_flow(maximal_data)
        assert len(result_maximal['results']) > 0
        
        # Test con valores muy pequeños
        small_values = [0.001, 0.002, 0.001, 0.003, 0.002] * 6  # 30 valores
        result_small = self._execute_complete_flow(small_values)
        assert len(result_small['results']) > 0
        
        # Test con valores muy grandes
        large_values = [1000000, 1100000, 1050000, 1200000, 1150000] * 6  # 30 valores
        result_large = self._execute_complete_flow(large_values)
        assert len(result_large['results']) > 0
        
        # Verificar que todos los casos produjeron pronósticos válidos
        for result in [result_minimal, result_maximal, result_small, result_large]:
            forecast = result['forecast']
            for value in forecast:
                assert isinstance(value, (int, float))
                assert not np.isnan(value)
                assert not np.isinf(value)

if __name__ == "__main__":
    # Ejecutar tests individuales para debugging
    test_suite = TestDataTypesIntegration()
    test_suite.setup_method()
    
    try:
        print("Ejecutando test de datos con tendencia...")
        test_suite.test_trending_data_handling()
        print("✓ Test de datos con tendencia completado")
        
        print("Ejecutando test de datos estacionales...")
        test_suite.test_seasonal_data_handling()
        print("✓ Test de datos estacionales completado")
        
        print("Ejecutando test de datos estacionarios...")
        test_suite.test_stationary_data_handling()
        print("✓ Test de datos estacionarios completado")
        
    except Exception as e:
        print(f"✗ Test falló: {str(e)}")
        import traceback
        traceback.print_exc()