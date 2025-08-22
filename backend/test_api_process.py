import unittest
import json
import time
import threading
from unittest.mock import patch, MagicMock
from app import app, results_cache, run_forecast_models
import pandas as pd

class TestProcessEndpoint(unittest.TestCase):
    def setUp(self):
        """Configurar el entorno de prueba"""
        self.app = app.test_client()
        self.app.testing = True
        # Limpiar caché antes de cada prueba
        results_cache.clear()
        
        # Crear datos de prueba válidos
        self.test_data = [{'demand': 100 + i * 2} for i in range(24)]
        self.session_id = self._create_test_session()
    
    def tearDown(self):
        """Limpiar después de cada prueba"""
        results_cache.clear()
    
    def _create_test_session(self):
        """Crear una sesión de prueba con datos válidos"""
        response = self.app.post('/api/upload',
                               data=json.dumps(self.test_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        return data['session_id']
    
    def test_process_valid_session_id(self):
        """Test inicio correcto de procesamiento en background"""
        # Realizar petición de procesamiento
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': self.session_id}),
                               content_type='application/json')
        
        # Verificar respuesta inmediata
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar contenido de respuesta
        self.assertIn('message', data)
        self.assertEqual(data['message'], 'Procesamiento iniciado')
        self.assertIn('session_id', data)
        self.assertEqual(data['session_id'], self.session_id)
        
        # Verificar que el procesamiento se inició (puede estar en progreso o completado)
        # Dar tiempo para que el hilo inicie
        time.sleep(0.1)
        self.assertIn(self.session_id, results_cache)
    
    def test_process_invalid_session_id(self):
        """Test validación de session_id inexistente"""
        invalid_session_id = "20240101_120000"
        
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': invalid_session_id}),
                               content_type='application/json')
        
        # Verificar error 404
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
    
    def test_process_missing_session_id(self):
        """Test manejo de petición sin session_id"""
        response = self.app.post('/api/process',
                               data=json.dumps({}),
                               content_type='application/json')
        
        # Verificar error 404 (session_id None no existe en caché)
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
    
    def test_process_malformed_json(self):
        """Test manejo de JSON malformado en petición"""
        response = self.app.post('/api/process',
                               data='{"invalid": json}',
                               content_type='application/json')
        
        # Verificar error 500
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_process_empty_request_body(self):
        """Test manejo de cuerpo de petición vacío"""
        response = self.app.post('/api/process',
                               data='',
                               content_type='application/json')
        
        # Verificar error
        self.assertIn(response.status_code, [400, 500])
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    @patch('app.threading.Thread')
    def test_process_background_thread_creation(self, mock_thread):
        """Test que se crea correctamente el hilo de procesamiento en background"""
        mock_thread_instance = MagicMock()
        mock_thread.return_value = mock_thread_instance
        
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': self.session_id}),
                               content_type='application/json')
        
        # Verificar que se creó el hilo
        mock_thread.assert_called_once()
        args, kwargs = mock_thread.call_args
        
        # Verificar argumentos del hilo
        self.assertEqual(kwargs['target'], run_forecast_models)
        self.assertEqual(kwargs['args'], (self.session_id,))
        
        # Verificar que se inició el hilo
        mock_thread_instance.start.assert_called_once()
        
        # Verificar respuesta
        self.assertEqual(response.status_code, 200)
    
    def test_process_multiple_sessions(self):
        """Test procesamiento de múltiples sesiones simultáneas"""
        # Crear segunda sesión
        session_id_2 = self._create_test_session()
        
        # Procesar ambas sesiones
        response1 = self.app.post('/api/process',
                                data=json.dumps({'session_id': self.session_id}),
                                content_type='application/json')
        
        response2 = self.app.post('/api/process',
                                data=json.dumps({'session_id': session_id_2}),
                                content_type='application/json')
        
        # Ambas deben responder correctamente
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)
        
        # Verificar que ambas sesiones están en caché
        self.assertIn(self.session_id, results_cache)
        self.assertIn(session_id_2, results_cache)
    
    def test_process_same_session_multiple_times(self):
        """Test procesamiento de la misma sesión múltiples veces"""
        # Primera llamada
        response1 = self.app.post('/api/process',
                                data=json.dumps({'session_id': self.session_id}),
                                content_type='application/json')
        
        # Segunda llamada inmediata
        response2 = self.app.post('/api/process',
                                data=json.dumps({'session_id': self.session_id}),
                                content_type='application/json')
        
        # Ambas deben responder correctamente
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)
        
        # Verificar que la sesión sigue existiendo
        self.assertIn(self.session_id, results_cache)
    
    def test_run_forecast_models_function(self):
        """Test directo de la función run_forecast_models"""
        # Ejecutar la función directamente
        run_forecast_models(self.session_id)
        
        # Verificar que el estado cambió
        self.assertIn(self.session_id, results_cache)
        session_data = results_cache[self.session_id]
        
        # El estado debe ser 'completed' o 'error'
        self.assertIn(session_data['status'], ['completed', 'error'])
        
        if session_data['status'] == 'completed':
            # Verificar que hay resultados
            self.assertIsNotNone(session_data['results'])
            self.assertIsInstance(session_data['results'], list)
            
            # Verificar que los resultados están ordenados por MAPE
            if len(session_data['results']) > 1:
                mapes = [result['metrics']['mape'] for result in session_data['results'] 
                        if not pd.isna(result['metrics']['mape'])]
                if len(mapes) > 1:
                    self.assertEqual(mapes, sorted(mapes))
        
        elif session_data['status'] == 'error':
            # Verificar que hay mensaje de error
            self.assertIn('error', session_data)
    
    @patch('app.forecast_models.run_all_models')
    def test_run_forecast_models_with_mock(self, mock_run_all_models):
        """Test run_forecast_models con mock para controlar el resultado"""
        # Configurar mock para devolver resultados simulados
        mock_results = [
            {
                'name': 'Model A',
                'metrics': {'mape': 15.5, 'mae': 10.2, 'mse': 150.3, 'rmse': 12.3},
                'parameters': {'param1': 'value1'}
            },
            {
                'name': 'Model B', 
                'metrics': {'mape': 12.3, 'mae': 8.5, 'mse': 120.1, 'rmse': 11.0},
                'parameters': {'param2': 'value2'}
            }
        ]
        mock_run_all_models.return_value = mock_results
        
        # Ejecutar función
        run_forecast_models(self.session_id)
        
        # Verificar que se llamó run_all_models
        mock_run_all_models.assert_called_once()
        
        # Verificar resultados
        session_data = results_cache[self.session_id]
        self.assertEqual(session_data['status'], 'completed')
        self.assertIsNotNone(session_data['results'])
        
        # Verificar ordenamiento por MAPE (Model B debe estar primero)
        results = session_data['results']
        self.assertEqual(results[0]['name'], 'Model B')
        self.assertEqual(results[1]['name'], 'Model A')
    
    @patch('app.forecast_models.run_all_models')
    def test_run_forecast_models_exception_handling(self, mock_run_all_models):
        """Test manejo de excepciones en run_forecast_models"""
        # Configurar mock para lanzar excepción
        mock_run_all_models.side_effect = Exception("Error en modelo")
        
        # Ejecutar función
        run_forecast_models(self.session_id)
        
        # Verificar que el estado es 'error'
        session_data = results_cache[self.session_id]
        self.assertEqual(session_data['status'], 'error')
        self.assertIn('error', session_data)
        self.assertEqual(session_data['error'], "Error en modelo")
    
    def test_process_response_format(self):
        """Test formato correcto de respuesta del endpoint /api/process"""
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': self.session_id}),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar estructura de respuesta
        self.assertIsInstance(data, dict)
        self.assertIn('message', data)
        self.assertIn('session_id', data)
        
        # Verificar tipos de datos
        self.assertIsInstance(data['message'], str)
        self.assertIsInstance(data['session_id'], str)
        
        # Verificar contenido específico
        self.assertEqual(data['message'], 'Procesamiento iniciado')
        self.assertEqual(data['session_id'], self.session_id)
    
    def test_process_content_type_validation(self):
        """Test validación de Content-Type en peticiones"""
        # Test sin Content-Type
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': self.session_id}))
        
        # Debe manejar la petición (Flask es flexible con Content-Type)
        self.assertIn(response.status_code, [200, 400, 500])
        
        # Test con Content-Type incorrecto
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': self.session_id}),
                               content_type='text/plain')
        
        # Debe manejar la petición o devolver error apropiado
        self.assertIn(response.status_code, [200, 400, 500])
    
    def test_process_http_methods(self):
        """Test que el endpoint solo acepta método POST"""
        # Test GET (no permitido)
        response = self.app.get('/api/process')
        self.assertEqual(response.status_code, 405)  # Method Not Allowed
        
        # Test PUT (no permitido)
        response = self.app.put('/api/process')
        self.assertEqual(response.status_code, 405)  # Method Not Allowed
        
        # Test DELETE (no permitido)
        response = self.app.delete('/api/process')
        self.assertEqual(response.status_code, 405)  # Method Not Allowed
    
    def test_process_session_id_data_types(self):
        """Test manejo de diferentes tipos de datos para session_id"""
        # Test con session_id como número
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': 123456}),
                               content_type='application/json')
        
        # Puede ser 404 (sesión no encontrada) o 500 (error de tipo)
        self.assertIn(response.status_code, [404, 500])
        data = json.loads(response.data)
        self.assertIn('error', data)
        
        # Test con session_id como lista
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': ['invalid']}),
                               content_type='application/json')
        
        # Puede ser 404 (sesión no encontrada) o 500 (error de tipo)
        self.assertIn(response.status_code, [404, 500])
        data = json.loads(response.data)
        self.assertIn('error', data)
        
        # Test con session_id como objeto
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': {'invalid': 'data'}}),
                               content_type='application/json')
        
        # Puede ser 404 (sesión no encontrada) o 500 (error de tipo)
        self.assertIn(response.status_code, [404, 500])
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_process_concurrent_requests_same_session(self):
        """Test manejo de peticiones concurrentes para la misma sesión"""
        import concurrent.futures
        
        def make_process_request():
            return self.app.post('/api/process',
                               data=json.dumps({'session_id': self.session_id}),
                               content_type='application/json')
        
        # Ejecutar múltiples peticiones concurrentes
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_process_request) for _ in range(3)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # Todas las respuestas deben ser exitosas
        for response in responses:
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertEqual(data['message'], 'Procesamiento iniciado')
            self.assertEqual(data['session_id'], self.session_id)
    
    def test_process_large_payload(self):
        """Test manejo de payload grande en petición"""
        # Crear payload con datos adicionales grandes
        large_payload = {
            'session_id': self.session_id,
            'extra_data': 'x' * 10000,  # 10KB de datos extra
            'metadata': {
                'user': 'test_user',
                'timestamp': '2024-01-01T00:00:00Z',
                'additional_info': ['item' + str(i) for i in range(1000)]
            }
        }
        
        response = self.app.post('/api/process',
                               data=json.dumps(large_payload),
                               content_type='application/json')
        
        # Debe procesar correctamente independientemente del tamaño del payload
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['message'], 'Procesamiento iniciado')
        self.assertEqual(data['session_id'], self.session_id)
    
    @patch('app.threading.Thread')
    def test_process_thread_failure_handling(self, mock_thread):
        """Test manejo de fallas en la creación del hilo de procesamiento"""
        # Configurar mock para fallar en start()
        mock_thread_instance = MagicMock()
        mock_thread_instance.start.side_effect = Exception("Error al iniciar hilo")
        mock_thread.return_value = mock_thread_instance
        
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': self.session_id}),
                               content_type='application/json')
        
        # Verificar que se maneja la excepción
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_process_response_time(self):
        """Test que la respuesta del endpoint es inmediata"""
        import time
        
        start_time = time.time()
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': self.session_id}),
                               content_type='application/json')
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # La respuesta debe ser inmediata (menos de 1 segundo)
        self.assertLess(response_time, 1.0)
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(data['message'], 'Procesamiento iniciado')

if __name__ == '__main__':
    unittest.main()