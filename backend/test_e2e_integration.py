"""
Pruebas de integración end-to-end para el flujo completo de la aplicación
upload → process → results → forecast

Requirements: 6.3, 6.5
"""

import pytest
import requests
import json
import time
import pandas as pd
import numpy as np
from io import StringIO
import tempfile
import os
from test_data_generator import TestDataGenerator

class TestE2EIntegration:
    """Suite de pruebas de integración end-to-end"""
    
    def setup_method(self):
        """Configuración inicial para cada test"""
        self.base_url = "http://localhost:5000"
        self.generator = TestDataGenerator()
        self.session_id = None
        
    def teardown_method(self):
        """Limpieza después de cada test"""
        # Limpiar datos de sesión si es necesario
        pass
    
    def test_complete_flow_with_synthetic_data(self):
        """
        Test de flujo completo con datos sintéticos
        Verifica: upload → process → results → forecast
        """
        # 1. Generar datos sintéticos de prueba
        test_data = self.generator.generate_trend_data(24, trend_slope=0.5)
        df = pd.DataFrame({'demand': test_data})
        
        # 2. Test Upload - Datos JSON manuales
        upload_payload = df.to_dict('records')
        upload_response = requests.post(
            f"{self.base_url}/api/upload",
            json=upload_payload,
            headers={'Content-Type': 'application/json'}
        )
        
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        assert 'session_id' in upload_data
        assert upload_data['message'] == 'Datos cargados exitosamente'
        
        self.session_id = upload_data['session_id']
        
        # 3. Test Process - Iniciar procesamiento
        process_payload = {'session_id': self.session_id}
        process_response = requests.post(
            f"{self.base_url}/api/process",
            json=process_payload,
            headers={'Content-Type': 'application/json'}
        )
        
        assert process_response.status_code == 200
        process_data = process_response.json()
        assert process_data['message'] == 'Procesamiento iniciado'
        assert process_data['session_id'] == self.session_id
        
        # 4. Test Results - Esperar y obtener resultados
        max_wait_time = 60  # 60 segundos máximo
        wait_interval = 2   # Verificar cada 2 segundos
        elapsed_time = 0
        
        while elapsed_time < max_wait_time:
            results_response = requests.get(
                f"{self.base_url}/api/results",
                params={'session_id': self.session_id}
            )
            
            assert results_response.status_code == 200
            results_data = results_response.json()
            
            if results_data['status'] == 'completed':
                # Verificar estructura de resultados
                assert 'results' in results_data
                assert len(results_data['results']) > 0
                assert len(results_data['results']) <= 10  # Top 10
                
                # Verificar que están ordenados por MAPE ascendente
                mapes = [result['metrics']['mape'] for result in results_data['results'] 
                        if not np.isnan(result['metrics']['mape'])]
                assert mapes == sorted(mapes), "Resultados no están ordenados por MAPE"
                
                # Verificar estructura de cada resultado
                for result in results_data['results']:
                    assert 'name' in result
                    assert 'metrics' in result
                    assert 'parameters' in result
                    assert 'predictions' in result
                    
                    # Verificar métricas
                    metrics = result['metrics']
                    assert 'mae' in metrics
                    assert 'mse' in metrics
                    assert 'rmse' in metrics
                    assert 'mape' in metrics
                
                break
            elif results_data['status'] == 'processing':
                time.sleep(wait_interval)
                elapsed_time += wait_interval
            elif results_data['status'] == 'error':
                pytest.fail(f"Error en procesamiento: {results_data.get('error', 'Error desconocido')}")
            else:
                pytest.fail(f"Estado inesperado: {results_data['status']}")
        else:
            pytest.fail("Timeout esperando resultados del procesamiento")
        
        # 5. Test Forecast - Generar pronóstico con el mejor modelo
        best_model = results_data['results'][0]['name']
        forecast_payload = {
            'session_id': self.session_id,
            'model_name': best_model,
            'periods': 12
        }
        
        forecast_response = requests.post(
            f"{self.base_url}/api/forecast",
            json=forecast_payload,
            headers={'Content-Type': 'application/json'}
        )
        
        assert forecast_response.status_code == 200
        forecast_data = forecast_response.json()
        
        # Verificar estructura del pronóstico
        assert 'forecast' in forecast_data
        assert 'model_name' in forecast_data
        assert 'periods' in forecast_data
        assert forecast_data['model_name'] == best_model
        assert forecast_data['periods'] == 12
        assert len(forecast_data['forecast']) == 12
        
        # Verificar que los valores del pronóstico son numéricos válidos
        for value in forecast_data['forecast']:
            assert isinstance(value, (int, float))
            assert not np.isnan(value)
            assert not np.isinf(value)
    
    def test_complete_flow_with_csv_upload(self):
        """
        Test de flujo completo con carga de archivo CSV
        """
        # 1. Generar datos sintéticos y crear archivo CSV temporal
        test_data = self.generator.generate_seasonal_data(36, seasonal_period=12)
        df = pd.DataFrame({'demand': test_data})
        
        # Crear archivo CSV temporal
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            df.to_csv(f, index=False)
            csv_file_path = f.name
        
        try:
            # 2. Test Upload - Archivo CSV
            with open(csv_file_path, 'rb') as f:
                files = {'file': ('test_data.csv', f, 'text/csv')}
                upload_response = requests.post(
                    f"{self.base_url}/api/upload",
                    files=files
                )
            
            assert upload_response.status_code == 200
            upload_data = upload_response.json()
            assert 'session_id' in upload_data
            
            self.session_id = upload_data['session_id']
            
            # 3. Continuar con el flujo completo (process → results → forecast)
            # Process
            process_response = requests.post(
                f"{self.base_url}/api/process",
                json={'session_id': self.session_id}
            )
            assert process_response.status_code == 200
            
            # Results (esperar completado)
            max_wait_time = 60
            wait_interval = 2
            elapsed_time = 0
            
            while elapsed_time < max_wait_time:
                results_response = requests.get(
                    f"{self.base_url}/api/results",
                    params={'session_id': self.session_id}
                )
                
                assert results_response.status_code == 200
                results_data = results_response.json()
                
                if results_data['status'] == 'completed':
                    break
                elif results_data['status'] == 'processing':
                    time.sleep(wait_interval)
                    elapsed_time += wait_interval
                else:
                    pytest.fail(f"Error o estado inesperado: {results_data}")
            else:
                pytest.fail("Timeout en procesamiento")
            
            # Forecast
            best_model = results_data['results'][0]['name']
            forecast_response = requests.post(
                f"{self.base_url}/api/forecast",
                json={
                    'session_id': self.session_id,
                    'model_name': best_model,
                    'periods': 6
                }
            )
            
            assert forecast_response.status_code == 200
            forecast_data = forecast_response.json()
            assert len(forecast_data['forecast']) == 6
            
        finally:
            # Limpiar archivo temporal
            os.unlink(csv_file_path)
    
    def test_data_persistence_through_complete_flow(self):
        """
        Test de persistencia de datos a través del flujo completo
        Verifica que los datos se mantienen consistentes en cada paso
        """
        # Generar datos conocidos para verificar consistencia
        known_data = [100, 110, 105, 115, 120, 125, 130, 135, 140, 145, 150, 155]
        df = pd.DataFrame({'demand': known_data})
        
        # Upload
        upload_response = requests.post(
            f"{self.base_url}/api/upload",
            json=df.to_dict('records')
        )
        assert upload_response.status_code == 200
        self.session_id = upload_response.json()['session_id']
        
        # Process
        process_response = requests.post(
            f"{self.base_url}/api/process",
            json={'session_id': self.session_id}
        )
        assert process_response.status_code == 200
        
        # Esperar resultados
        max_attempts = 30
        for _ in range(max_attempts):
            results_response = requests.get(
                f"{self.base_url}/api/results",
                params={'session_id': self.session_id}
            )
            results_data = results_response.json()
            
            if results_data['status'] == 'completed':
                break
            time.sleep(2)
        else:
            pytest.fail("Timeout esperando resultados")
        
        # Verificar que los datos originales se mantuvieron
        # (esto se puede inferir de las predicciones y métricas)
        results = results_data['results']
        assert len(results) > 0
        
        # Verificar que las predicciones tienen la longitud correcta
        for result in results:
            predictions = result['predictions']
            # Filtrar NaN values para modelos como SMA
            valid_predictions = [p for p in predictions if not (isinstance(p, float) and np.isnan(p))]
            # Debe haber al menos algunas predicciones válidas
            assert len(valid_predictions) > 0
        
        # Test forecast con datos persistidos
        best_model = results[0]['name']
        forecast_response = requests.post(
            f"{self.base_url}/api/forecast",
            json={
                'session_id': self.session_id,
                'model_name': best_model,
                'periods': 3
            }
        )
        
        assert forecast_response.status_code == 200
        forecast_data = forecast_response.json()
        
        # Verificar que el pronóstico es razonable dado los datos de entrada
        forecast_values = forecast_data['forecast']
        assert len(forecast_values) == 3
        
        # Los valores del pronóstico deberían estar en un rango razonable
        # considerando que los datos originales van de 100 a 155
        for value in forecast_values:
            assert 50 <= value <= 300, f"Valor de pronóstico fuera de rango razonable: {value}"
    
    def test_frontend_state_updates_simulation(self):
        """
        Test que simula las actualizaciones de estado del frontend
        Verifica la comunicación correcta entre frontend y backend
        """
        # Simular el comportamiento del frontend
        test_data = self.generator.generate_stationary_data(18, noise_level=0.1)
        df = pd.DataFrame({'demand': test_data})
        
        # 1. Simular carga de datos desde el frontend
        upload_response = requests.post(
            f"{self.base_url}/api/upload",
            json=df.to_dict('records'),
            headers={'Content-Type': 'application/json'}
        )
        
        assert upload_response.status_code == 200
        self.session_id = upload_response.json()['session_id']
        
        # 2. Simular inicio de procesamiento desde el frontend
        process_response = requests.post(
            f"{self.base_url}/api/process",
            json={'session_id': self.session_id}
        )
        
        assert process_response.status_code == 200
        
        # 3. Simular polling del frontend para obtener resultados
        polling_attempts = 0
        max_polling_attempts = 30
        
        while polling_attempts < max_polling_attempts:
            results_response = requests.get(
                f"{self.base_url}/api/results",
                params={'session_id': self.session_id}
            )
            
            assert results_response.status_code == 200
            results_data = results_response.json()
            
            # Simular diferentes estados que el frontend debe manejar
            if results_data['status'] == 'processing':
                # Frontend debería mostrar indicador de carga
                assert 'status' in results_data
                polling_attempts += 1
                time.sleep(1)
                
            elif results_data['status'] == 'completed':
                # Frontend debería mostrar resultados
                assert 'results' in results_data
                assert len(results_data['results']) > 0
                
                # Simular selección de modelo desde el frontend
                selected_model = results_data['results'][0]['name']
                
                # 4. Simular generación de pronóstico desde el frontend
                forecast_response = requests.post(
                    f"{self.base_url}/api/forecast",
                    json={
                        'session_id': self.session_id,
                        'model_name': selected_model,
                        'periods': 12
                    }
                )
                
                assert forecast_response.status_code == 200
                forecast_data = forecast_response.json()
                
                # Frontend debería recibir datos completos del pronóstico
                assert 'forecast' in forecast_data
                assert 'model_name' in forecast_data
                assert 'periods' in forecast_data
                
                # Verificar que incluye información del modelo para el frontend
                if 'model_info' in forecast_data:
                    model_info = forecast_data['model_info']
                    assert isinstance(model_info, dict)
                
                break
                
            elif results_data['status'] == 'error':
                pytest.fail(f"Error en procesamiento: {results_data.get('error')}")
            
            else:
                pytest.fail(f"Estado inesperado: {results_data['status']}")
        
        else:
            pytest.fail("Timeout en polling de resultados")

if __name__ == "__main__":
    # Ejecutar tests individuales para debugging
    test_suite = TestE2EIntegration()
    test_suite.setup_method()
    
    try:
        print("Ejecutando test de flujo completo con datos sintéticos...")
        test_suite.test_complete_flow_with_synthetic_data()
        print("✓ Test completado exitosamente")
        
    except Exception as e:
        print(f"✗ Test falló: {str(e)}")
    
    finally:
        test_suite.teardown_method()