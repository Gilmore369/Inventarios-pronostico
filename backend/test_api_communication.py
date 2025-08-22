"""
Pruebas de comunicación API para verificar formato correcto de respuestas,
manejo de errores de conectividad, timeout handling y retry logic.

Requirements: 5.6, 6.3
"""

import pytest
import requests
import json
import time
import pandas as pd
import numpy as np
from unittest.mock import patch, Mock
import socket
from requests.exceptions import ConnectionError, Timeout, RequestException
from test_data_generator import TestDataGenerator

class TestAPICommunication:
    """Suite de pruebas de comunicación API"""
    
    def setup_method(self):
        """Configuración inicial para cada test"""
        self.base_url = "http://localhost:5000"
        self.generator = TestDataGenerator()
        self.timeout_seconds = 10
        
    def test_api_response_format_upload(self):
        """
        Test para verificar formato correcto de respuestas del endpoint /api/upload
        """
        # Test con datos válidos
        test_data = self.generator.generate_trend_data(24, trend_slope=0.2)
        df = pd.DataFrame({'demand': test_data})
        
        response = requests.post(
            f"{self.base_url}/api/upload",
            json=df.to_dict('records'),
            headers={'Content-Type': 'application/json'},
            timeout=self.timeout_seconds
        )
        
        # Verificar código de estado
        assert response.status_code == 200
        
        # Verificar headers de respuesta
        assert response.headers['Content-Type'] == 'application/json'
        
        # Verificar estructura JSON de respuesta exitosa
        data = response.json()
        assert isinstance(data, dict)
        assert 'session_id' in data
        assert 'message' in data
        assert isinstance(data['session_id'], str)
        assert isinstance(data['message'], str)
        assert len(data['session_id']) > 0
        
        # Test con datos inválidos (muy pocos datos)
        invalid_data = [{'demand': 100}] * 5  # Solo 5 meses
        
        response = requests.post(
            f"{self.base_url}/api/upload",
            json=invalid_data,
            headers={'Content-Type': 'application/json'},
            timeout=self.timeout_seconds
        )
        
        # Verificar respuesta de error
        assert response.status_code == 400
        error_data = response.json()
        assert isinstance(error_data, dict)
        assert 'error' in error_data
        assert isinstance(error_data['error'], str)
        assert 'entre 12 y 120 meses' in error_data['error']
    
    def test_api_response_format_process(self):
        """
        Test para verificar formato correcto de respuestas del endpoint /api/process
        """
        # Primero crear una sesión válida
        test_data = self.generator.generate_seasonal_data(18, seasonal_period=6)
        df = pd.DataFrame({'demand': test_data})
        
        upload_response = requests.post(
            f"{self.base_url}/api/upload",
            json=df.to_dict('records'),
            timeout=self.timeout_seconds
        )
        session_id = upload_response.json()['session_id']
        
        # Test con session_id válido
        response = requests.post(
            f"{self.base_url}/api/process",
            json={'session_id': session_id},
            headers={'Content-Type': 'application/json'},
            timeout=self.timeout_seconds
        )
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/json'
        
        data = response.json()
        assert isinstance(data, dict)
        assert 'message' in data
        assert 'session_id' in data
        assert data['session_id'] == session_id
        assert 'iniciado' in data['message'].lower()
        
        # Test con session_id inválido
        response = requests.post(
            f"{self.base_url}/api/process",
            json={'session_id': 'invalid_session_id'},
            headers={'Content-Type': 'application/json'},
            timeout=self.timeout_seconds
        )
        
        assert response.status_code == 404
        error_data = response.json()
        assert 'error' in error_data
        assert 'no encontrada' in error_data['error'].lower()
    
    def test_api_response_format_results(self):
        """
        Test para verificar formato correcto de respuestas del endpoint /api/results
        """
        # Crear sesión y procesar
        test_data = self.generator.generate_stationary_data(15, noise_level=0.05)
        df = pd.DataFrame({'demand': test_data})
        
        upload_response = requests.post(
            f"{self.base_url}/api/upload",
            json=df.to_dict('records'),
            timeout=self.timeout_seconds
        )
        session_id = upload_response.json()['session_id']
        
        requests.post(
            f"{self.base_url}/api/process",
            json={'session_id': session_id},
            timeout=self.timeout_seconds
        )
        
        # Esperar a que complete el procesamiento
        max_attempts = 30
        for _ in range(max_attempts):
            response = requests.get(
                f"{self.base_url}/api/results",
                params={'session_id': session_id},
                timeout=self.timeout_seconds
            )
            
            assert response.status_code == 200
            assert response.headers['Content-Type'] == 'application/json'
            
            data = response.json()
            assert isinstance(data, dict)
            assert 'status' in data
            
            if data['status'] == 'processing':
                # Verificar formato durante procesamiento
                assert data['status'] == 'processing'
                time.sleep(1)
                
            elif data['status'] == 'completed':
                # Verificar formato de respuesta completada
                assert 'results' in data
                assert isinstance(data['results'], list)
                assert len(data['results']) > 0
                assert len(data['results']) <= 10  # Top 10
                
                # Verificar estructura de cada resultado
                for result in data['results']:
                    assert isinstance(result, dict)
                    assert 'name' in result
                    assert 'metrics' in result
                    assert 'parameters' in result
                    assert 'predictions' in result
                    
                    # Verificar métricas
                    metrics = result['metrics']
                    assert isinstance(metrics, dict)
                    required_metrics = ['mae', 'mse', 'rmse', 'mape']
                    for metric in required_metrics:
                        assert metric in metrics
                        assert isinstance(metrics[metric], (int, float))
                
                break
            else:
                pytest.fail(f"Estado inesperado: {data['status']}")
        else:
            pytest.fail("Timeout esperando completar procesamiento")
        
        # Test con session_id inválido
        response = requests.get(
            f"{self.base_url}/api/results",
            params={'session_id': 'invalid_session'},
            timeout=self.timeout_seconds
        )
        
        assert response.status_code == 404
        error_data = response.json()
        assert 'error' in error_data
    
    def test_api_response_format_forecast(self):
        """
        Test para verificar formato correcto de respuestas del endpoint /api/forecast
        """
        # Crear sesión, procesar y obtener resultados
        test_data = self.generator.generate_trend_data(20, trend_slope=0.3)
        df = pd.DataFrame({'demand': test_data})
        
        upload_response = requests.post(
            f"{self.base_url}/api/upload",
            json=df.to_dict('records'),
            timeout=self.timeout_seconds
        )
        session_id = upload_response.json()['session_id']
        
        requests.post(
            f"{self.base_url}/api/process",
            json={'session_id': session_id},
            timeout=self.timeout_seconds
        )
        
        # Esperar resultados
        max_attempts = 30
        for _ in range(max_attempts):
            results_response = requests.get(
                f"{self.base_url}/api/results",
                params={'session_id': session_id},
                timeout=self.timeout_seconds
            )
            
            if results_response.json()['status'] == 'completed':
                break
            time.sleep(1)
        
        results_data = results_response.json()
        best_model = results_data['results'][0]['name']
        
        # Test forecast con parámetros válidos
        response = requests.post(
            f"{self.base_url}/api/forecast",
            json={
                'session_id': session_id,
                'model_name': best_model,
                'periods': 6
            },
            headers={'Content-Type': 'application/json'},
            timeout=self.timeout_seconds
        )
        
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/json'
        
        data = response.json()
        assert isinstance(data, dict)
        assert 'forecast' in data
        assert 'model_name' in data
        assert 'periods' in data
        
        # Verificar forecast
        forecast = data['forecast']
        assert isinstance(forecast, list)
        assert len(forecast) == 6
        for value in forecast:
            assert isinstance(value, (int, float))
            assert not np.isnan(value)
            assert not np.isinf(value)
        
        assert data['model_name'] == best_model
        assert data['periods'] == 6
        
        # Test con modelo inexistente
        response = requests.post(
            f"{self.base_url}/api/forecast",
            json={
                'session_id': session_id,
                'model_name': 'Modelo Inexistente',
                'periods': 12
            },
            timeout=self.timeout_seconds
        )
        
        # Debería manejar el error gracefully (puede devolver pronóstico por defecto)
        assert response.status_code in [200, 400, 404]
    
    def test_connectivity_error_handling(self):
        """
        Test para manejo de errores de conectividad
        """
        # Test con URL inválida (servidor no disponible)
        invalid_url = "http://localhost:9999"  # Puerto que no debería estar en uso
        
        with pytest.raises(ConnectionError):
            requests.post(
                f"{invalid_url}/api/upload",
                json=[{'demand': 100}],
                timeout=2
            )
        
        # Test con hostname inválido
        invalid_hostname = "http://servidor-inexistente.com"
        
        with pytest.raises((ConnectionError, socket.gaierror)):
            requests.post(
                f"{invalid_hostname}/api/upload",
                json=[{'demand': 100}],
                timeout=2
            )
    
    def test_timeout_handling(self):
        """
        Test para verificar manejo de timeouts
        """
        # Test con timeout muy corto
        test_data = self.generator.generate_trend_data(12, trend_slope=0.1)
        df = pd.DataFrame({'demand': test_data})
        
        with pytest.raises(Timeout):
            requests.post(
                f"{self.base_url}/api/upload",
                json=df.to_dict('records'),
                timeout=0.001  # 1ms - muy corto
            )
    
    def test_retry_logic_simulation(self):
        """
        Test para simular retry logic que implementaría el frontend
        """
        test_data = self.generator.generate_seasonal_data(16, seasonal_period=4)
        df = pd.DataFrame({'demand': test_data})
        
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    f"{self.base_url}/api/upload",
                    json=df.to_dict('records'),
                    timeout=self.timeout_seconds
                )
                
                if response.status_code == 200:
                    # Éxito en el intento
                    data = response.json()
                    assert 'session_id' in data
                    break
                else:
                    # Error HTTP, intentar de nuevo
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    else:
                        pytest.fail(f"Falló después de {max_retries} intentos")
                        
            except (ConnectionError, Timeout) as e:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                else:
                    pytest.fail(f"Error de conectividad después de {max_retries} intentos: {str(e)}")
    
    def test_malformed_request_handling(self):
        """
        Test para verificar manejo de requests malformados
        """
        # Test con JSON inválido
        response = requests.post(
            f"{self.base_url}/api/upload",
            data="invalid json",
            headers={'Content-Type': 'application/json'},
            timeout=self.timeout_seconds
        )
        
        assert response.status_code in [400, 500]
        
        # Test con Content-Type incorrecto
        test_data = [{'demand': 100}] * 15
        response = requests.post(
            f"{self.base_url}/api/upload",
            data=json.dumps(test_data),
            headers={'Content-Type': 'text/plain'},
            timeout=self.timeout_seconds
        )
        
        # Debería manejar el error apropiadamente
        assert response.status_code in [400, 415, 500]
    
    def test_large_payload_handling(self):
        """
        Test para verificar manejo de payloads grandes
        """
        # Crear dataset grande (120 meses - límite máximo)
        large_data = self.generator.generate_trend_data(120, trend_slope=0.1)
        df = pd.DataFrame({'demand': large_data})
        
        response = requests.post(
            f"{self.base_url}/api/upload",
            json=df.to_dict('records'),
            timeout=30  # Timeout más largo para datos grandes
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'session_id' in data
    
    def test_concurrent_requests_handling(self):
        """
        Test para verificar manejo de requests concurrentes
        """
        import threading
        import queue
        
        results_queue = queue.Queue()
        
        def make_request(thread_id):
            try:
                test_data = self.generator.generate_stationary_data(12, noise_level=0.1)
                df = pd.DataFrame({'demand': test_data})
                
                response = requests.post(
                    f"{self.base_url}/api/upload",
                    json=df.to_dict('records'),
                    timeout=self.timeout_seconds
                )
                
                results_queue.put({
                    'thread_id': thread_id,
                    'status_code': response.status_code,
                    'success': response.status_code == 200
                })
                
            except Exception as e:
                results_queue.put({
                    'thread_id': thread_id,
                    'error': str(e),
                    'success': False
                })
        
        # Crear múltiples threads para requests concurrentes
        threads = []
        num_threads = 5
        
        for i in range(num_threads):
            thread = threading.Thread(target=make_request, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Esperar a que todos los threads terminen
        for thread in threads:
            thread.join()
        
        # Verificar resultados
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        assert len(results) == num_threads
        
        # Al menos la mayoría de requests deberían ser exitosos
        successful_requests = sum(1 for r in results if r.get('success', False))
        assert successful_requests >= num_threads * 0.8  # 80% de éxito mínimo

if __name__ == "__main__":
    # Ejecutar tests individuales para debugging
    test_suite = TestAPICommunication()
    test_suite.setup_method()
    
    try:
        print("Ejecutando test de formato de respuestas API...")
        test_suite.test_api_response_format_upload()
        print("✓ Test de formato upload completado")
        
        test_suite.test_api_response_format_process()
        print("✓ Test de formato process completado")
        
        test_suite.test_retry_logic_simulation()
        print("✓ Test de retry logic completado")
        
    except Exception as e:
        print(f"✗ Test falló: {str(e)}")