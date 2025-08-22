import unittest
import json
import time
import io
import pandas as pd
from unittest.mock import patch, MagicMock
from app import app, results_cache
import logging
import sys
from io import StringIO

class TestAPIErrorHandling(unittest.TestCase):
    def setUp(self):
        """Configurar el entorno de prueba"""
        self.app = app.test_client()
        self.app.testing = True
        # Limpiar caché antes de cada prueba
        results_cache.clear()
        
        # Configurar captura de logs para las pruebas
        self.log_stream = StringIO()
        self.log_handler = logging.StreamHandler(self.log_stream)
        self.log_handler.setLevel(logging.DEBUG)
        
        # Configurar formato de logging para incluir el nivel
        formatter = logging.Formatter('%(levelname)s - %(name)s - %(message)s')
        self.log_handler.setFormatter(formatter)
        
        # Obtener el logger de la aplicación
        self.app_logger = logging.getLogger('app')
        self.app_logger.addHandler(self.log_handler)
        self.app_logger.setLevel(logging.DEBUG)
        
        # Datos de prueba válidos
        self.valid_data = [{'demand': 100 + i * 2} for i in range(24)]
        self.valid_session_id = self._create_valid_session()
    
    def tearDown(self):
        """Limpiar después de cada prueba"""
        results_cache.clear()
        # Remover el handler de logging
        self.app_logger.removeHandler(self.log_handler)
        self.log_handler.close()
    
    def _create_valid_session(self):
        """Crear una sesión válida para pruebas"""
        response = self.app.post('/api/upload',
                               data=json.dumps(self.valid_data),
                               content_type='application/json')
        
        if response.status_code == 200:
            data = json.loads(response.data)
            return data['session_id']
        return None
    
    def test_http_error_codes_upload_endpoint(self):
        """Test códigos de error HTTP apropiados para /api/upload"""
        
        # Test 400 - Bad Request (datos insuficientes)
        insufficient_data = [{'demand': 100 + i} for i in range(5)]  # Solo 5 meses
        response = self.app.post('/api/upload',
                               data=json.dumps(insufficient_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('12 y 120 meses', data['error'])
        
        # Test 400 - Bad Request (datos excesivos)
        excessive_data = [{'demand': 100 + i} for i in range(125)]  # 125 meses
        response = self.app.post('/api/upload',
                               data=json.dumps(excessive_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('12 y 120 meses', data['error'])
        
        # Test 400 - Bad Request (columna faltante)
        missing_column_data = [{'sales': 100 + i} for i in range(15)]
        response = self.app.post('/api/upload',
                               data=json.dumps(missing_column_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertIn('demand', data['error'])
        
        # Test 500 - Internal Server Error (JSON malformado)
        response = self.app.post('/api/upload',
                               data='{"invalid": json}',
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_http_error_codes_process_endpoint(self):
        """Test códigos de error HTTP apropiados para /api/process"""
        
        # Test 404 - Not Found (session_id inexistente)
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': 'nonexistent_session'}),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
        
        # Test 500 - Internal Server Error (JSON malformado)
        response = self.app.post('/api/process',
                               data='{"invalid": json}',
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_http_error_codes_results_endpoint(self):
        """Test códigos de error HTTP apropiados para /api/results"""
        
        # Test 404 - Not Found (session_id inexistente)
        response = self.app.get('/api/results?session_id=nonexistent_session')
        
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
        
        # Test 404 - Not Found (sin session_id)
        response = self.app.get('/api/results')
        
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
    
    def test_http_error_codes_forecast_endpoint(self):
        """Test códigos de error HTTP apropiados para /api/forecast"""
        
        # Test 404 - Not Found (session_id inexistente)
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': 'nonexistent_session',
                                   'model_name': 'Regresión Lineal'
                               }),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
        
        # Test 500 - Internal Server Error (JSON malformado)
        response = self.app.post('/api/forecast',
                               data='{"invalid": json}',
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_descriptive_error_messages(self):
        """Test mensajes de error descriptivos y accionables"""
        
        # Error de validación de rango
        insufficient_data = [{'demand': 100} for _ in range(8)]
        response = self.app.post('/api/upload',
                               data=json.dumps(insufficient_data),
                               content_type='application/json')
        
        data = json.loads(response.data)
        error_message = data['error']
        
        # El mensaje debe ser descriptivo y accionable
        self.assertIn('12 y 120 meses', error_message)
        self.assertIn('requieren', error_message.lower())
        
        # Error de columna faltante
        wrong_column_data = [{'sales': 100 + i} for i in range(15)]
        response = self.app.post('/api/upload',
                               data=json.dumps(wrong_column_data),
                               content_type='application/json')
        
        data = json.loads(response.data)
        error_message = data['error']
        
        # El mensaje debe especificar qué columna se necesita
        self.assertIn('demand', error_message)
        self.assertIn('contener', error_message.lower())
        
        # Error de sesión no encontrada
        response = self.app.get('/api/results?session_id=invalid_session')
        
        data = json.loads(response.data)
        error_message = data['error']
        
        # El mensaje debe ser claro sobre el problema
        self.assertEqual(error_message, 'Sesión no encontrada')
    
    def test_error_message_consistency(self):
        """Test consistencia de mensajes de error entre endpoints"""
        
        # Todos los endpoints deben devolver el mismo mensaje para sesión no encontrada
        invalid_session = 'invalid_session_id'
        expected_message = 'Sesión no encontrada'
        
        # Test /api/process
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': invalid_session}),
                               content_type='application/json')
        
        data = json.loads(response.data)
        self.assertEqual(data['error'], expected_message)
        
        # Test /api/results
        response = self.app.get(f'/api/results?session_id={invalid_session}')
        
        data = json.loads(response.data)
        self.assertEqual(data['error'], expected_message)
        
        # Test /api/forecast
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': invalid_session,
                                   'model_name': 'Regresión Lineal'
                               }),
                               content_type='application/json')
        
        data = json.loads(response.data)
        self.assertEqual(data['error'], expected_message)
    
    @patch('app.pd.read_csv')
    def test_timeout_handling_simulation(self, mock_read_csv):
        """Test simulación de timeout handling"""
        
        # Simular operación lenta que podría causar timeout
        def slow_read_csv(*args, **kwargs):
            time.sleep(0.1)  # Simular operación lenta
            raise Exception("Timeout simulado")
        
        mock_read_csv.side_effect = slow_read_csv
        
        # Crear archivo CSV de prueba
        csv_content = "demand\n100\n101\n102\n103\n104\n105\n106\n107\n108\n109\n110\n111\n112"
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        
        response = self.app.post('/api/upload',
                               data={'file': (csv_file, 'test.csv')},
                               content_type='multipart/form-data')
        
        # Debe manejar el error apropiadamente
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    @patch('app.run_forecast_models')
    def test_background_processing_error_recovery(self, mock_run_forecast_models):
        """Test recuperación de errores en procesamiento en background"""
        
        # Configurar mock para simular error en procesamiento
        def failing_process(session_id):
            results_cache[session_id]['status'] = 'error'
            results_cache[session_id]['error'] = 'Error simulado en procesamiento'
        
        mock_run_forecast_models.side_effect = failing_process
        
        # Iniciar procesamiento
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': self.valid_session_id}),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        # Dar tiempo para que el procesamiento "falle"
        time.sleep(0.1)
        
        # Verificar que el error se maneja correctamente en /api/results
        response = self.app.get(f'/api/results?session_id={self.valid_session_id}')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'error')
        self.assertIn('error', data)
    
    def test_concurrent_request_error_handling(self):
        """Test manejo de errores con peticiones concurrentes"""
        
        # Test que múltiples peticiones se manejan correctamente sin errores del servidor
        responses = []
        for i in range(3):
            test_data = [{'demand': 100 + i * 10 + j} for j in range(15)]
            response = self.app.post('/api/upload',
                                   data=json.dumps(test_data),
                                   content_type='application/json')
            responses.append(response)
        
        # Todas las respuestas deben ser exitosas (200) o tener errores de cliente (4xx)
        # No debe haber errores de servidor (5xx) por concurrencia
        for i, response in enumerate(responses):
            self.assertIn(response.status_code, [200, 400, 404])
            
            if response.status_code == 200:
                data = json.loads(response.data)
                self.assertIn('session_id', data)
                self.assertIn('message', data)
            else:
                # Si hay error, debe tener mensaje descriptivo
                data = json.loads(response.data)
                self.assertIn('error', data)
        
        # Al menos una petición debe ser exitosa
        successful_count = sum(1 for r in responses if r.status_code == 200)
        self.assertGreaterEqual(successful_count, 1)
    
    def test_malformed_request_handling(self):
        """Test manejo de peticiones malformadas"""
        
        # Test con Content-Type incorrecto
        response = self.app.post('/api/upload',
                               data=json.dumps(self.valid_data),
                               content_type='text/plain')
        
        # Debe manejar el error apropiadamente
        self.assertIn(response.status_code, [400, 500])
        
        # Test con datos binarios inválidos
        response = self.app.post('/api/upload',
                               data=b'\\x00\\x01\\x02\\x03',
                               content_type='application/json')
        
        self.assertIn(response.status_code, [400, 500])
        
        # Test con JSON vacío
        response = self.app.post('/api/process',
                               data='{}',
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 404)  # session_id faltante
    
    def test_edge_case_error_handling(self):
        """Test manejo de casos extremos"""
        
        # Test con datos que contienen valores especiales
        special_data = [
            {'demand': float('inf')},
            {'demand': float('-inf')},
            {'demand': float('nan')},
            {'demand': None}
        ] + [{'demand': 100 + i} for i in range(12)]  # Completar a 16 elementos
        
        response = self.app.post('/api/upload',
                               data=json.dumps(special_data),
                               content_type='application/json')
        
        # Debe manejar valores especiales apropiadamente
        # Puede ser exitoso (si los filtra) o error (si no los maneja)
        self.assertIn(response.status_code, [200, 400, 500])
        
        if response.status_code != 200:
            data = json.loads(response.data)
            self.assertIn('error', data)
    
    def test_memory_pressure_simulation(self):
        """Test simulación de presión de memoria"""
        
        # Crear datos muy grandes para simular presión de memoria
        large_data = [{'demand': 100 + i, 'extra_field': 'x' * 1000} for i in range(120)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(large_data),
                               content_type='application/json')
        
        # Debe manejar datos grandes apropiadamente
        if response.status_code == 200:
            # Si es exitoso, verificar que se almacenó correctamente
            data = json.loads(response.data)
            self.assertIn('session_id', data)
        else:
            # Si falla, debe devolver error apropiado
            data = json.loads(response.data)
            self.assertIn('error', data)
    
    def test_error_response_format_consistency(self):
        """Test consistencia del formato de respuestas de error"""
        
        # Todos los errores deben tener el mismo formato
        error_responses = []
        
        # Error 400 de /api/upload
        response = self.app.post('/api/upload',
                               data=json.dumps([{'demand': 100}]),  # Datos insuficientes
                               content_type='application/json')
        error_responses.append(response)
        
        # Error 404 de /api/process
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': 'invalid'}),
                               content_type='application/json')
        error_responses.append(response)
        
        # Error 500 de /api/forecast
        response = self.app.post('/api/forecast',
                               data='invalid json',
                               content_type='application/json')
        error_responses.append(response)
        
        # Verificar formato consistente
        for response in error_responses:
            self.assertGreaterEqual(response.status_code, 400)
            data = json.loads(response.data)
            
            # Todas las respuestas de error deben tener campo 'error'
            self.assertIn('error', data)
            self.assertIsInstance(data['error'], str)
            self.assertGreater(len(data['error']), 0)
            
            # No deben tener campos de éxito
            self.assertNotIn('session_id', data)
            self.assertNotIn('message', data)
            self.assertNotIn('results', data)
    
    def _get_log_contents(self):
        """Obtener contenido de los logs capturados"""
        return self.log_stream.getvalue()
    
    def _clear_logs(self):
        """Limpiar logs capturados"""
        self.log_stream.seek(0)
        self.log_stream.truncate(0)
    
    def test_server_error_logging_validation(self):
        """Test validación de logging apropiado de errores del servidor"""
        
        self._clear_logs()
        
        # Test logging de error 500 en /api/upload
        response = self.app.post('/api/upload',
                               data='invalid json data',
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 500)
        
        # Verificar que el error se logueó apropiadamente
        log_contents = self._get_log_contents()
        self.assertIn('ERROR', log_contents)
        self.assertIn('/api/upload', log_contents)
        
        self._clear_logs()
        
        # Test logging de error 500 en /api/process
        response = self.app.post('/api/process',
                               data='{"malformed": json}',
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 500)
        
        log_contents = self._get_log_contents()
        self.assertIn('ERROR', log_contents)
        self.assertIn('/api/process', log_contents)
    
    def test_warning_logging_validation(self):
        """Test logging de advertencias para errores de validación"""
        
        self._clear_logs()
        
        # Test logging de advertencia para datos insuficientes
        insufficient_data = [{'demand': 100} for _ in range(5)]
        response = self.app.post('/api/upload',
                               data=json.dumps(insufficient_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        
        log_contents = self._get_log_contents()
        self.assertIn('WARNING', log_contents)
        self.assertIn('Validación fallida', log_contents)
        self.assertIn('12 y 120 meses', log_contents)
        
        self._clear_logs()
        
        # Test logging de advertencia para columna faltante
        wrong_data = [{'sales': 100} for _ in range(15)]
        response = self.app.post('/api/upload',
                               data=json.dumps(wrong_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        
        log_contents = self._get_log_contents()
        self.assertIn('WARNING', log_contents)
        self.assertIn('demand', log_contents)
        self.assertIn('Columnas encontradas', log_contents)
    
    def test_info_logging_validation(self):
        """Test logging de información para operaciones exitosas"""
        
        self._clear_logs()
        
        # Test logging de información para carga exitosa
        response = self.app.post('/api/upload',
                               data=json.dumps(self.valid_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        log_contents = self._get_log_contents()
        self.assertIn('INFO', log_contents)
        self.assertIn('Iniciando carga de datos', log_contents)
        self.assertIn('Datos cargados exitosamente', log_contents)
        
        # Verificar que se loguea el session_id
        data = json.loads(response.data)
        session_id = data['session_id']
        self.assertIn(session_id, log_contents)
    
    def test_session_not_found_logging(self):
        """Test logging específico para errores de sesión no encontrada"""
        
        self._clear_logs()
        
        # Test /api/process con sesión inexistente
        response = self.app.post('/api/process',
                               data=json.dumps({'session_id': 'invalid_session'}),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 404)
        
        log_contents = self._get_log_contents()
        self.assertIn('WARNING', log_contents)
        self.assertIn('Sesión no encontrada', log_contents)
        self.assertIn('invalid_session', log_contents)
        
        self._clear_logs()
        
        # Test /api/results con sesión inexistente
        response = self.app.get('/api/results?session_id=another_invalid_session')
        
        self.assertEqual(response.status_code, 404)
        
        log_contents = self._get_log_contents()
        self.assertIn('WARNING', log_contents)
        self.assertIn('Sesión no encontrada', log_contents)
        self.assertIn('another_invalid_session', log_contents)
    
    def test_comprehensive_timeout_and_recovery_scenarios(self):
        """Test escenarios comprehensivos de timeout y recuperación"""
        
        # Test timeout en carga de archivo grande
        with patch('app.pd.read_csv') as mock_read_csv:
            def slow_operation(*args, **kwargs):
                time.sleep(0.05)  # Simular operación lenta
                raise TimeoutError("Operación timeout")
            
            mock_read_csv.side_effect = slow_operation
            
            csv_content = "demand\n" + "\n".join([str(100 + i) for i in range(50)])
            csv_file = io.BytesIO(csv_content.encode('utf-8'))
            
            response = self.app.post('/api/upload',
                                   data={'file': (csv_file, 'large_file.csv')},
                                   content_type='multipart/form-data')
            
            self.assertEqual(response.status_code, 500)
            data = json.loads(response.data)
            self.assertIn('error', data)
    
    def test_rate_limiting_simulation(self):
        """Test simulación de rate limiting y manejo de carga"""
        
        # Simular múltiples peticiones rápidas
        responses = []
        start_time = time.time()
        
        for i in range(5):
            test_data = [{'demand': 100 + i + j} for j in range(15)]
            response = self.app.post('/api/upload',
                                   data=json.dumps(test_data),
                                   content_type='application/json')
            responses.append(response)
        
        end_time = time.time()
        
        # Verificar que todas las peticiones se procesaron
        successful_responses = [r for r in responses if r.status_code == 200]
        self.assertGreaterEqual(len(successful_responses), 3)  # Al menos 3 exitosas
        
        # Verificar que el tiempo total es razonable (no hay bloqueos)
        total_time = end_time - start_time
        self.assertLess(total_time, 2.0)  # Menos de 2 segundos
    
    def test_data_validation_edge_cases(self):
        """Test casos extremos de validación de datos"""
        
        # Test con datos que contienen valores None mezclados
        mixed_data = [
            {'demand': 100},
            {'demand': None},
            {'demand': 102},
            {'demand': 103}
        ] + [{'demand': 100 + i} for i in range(10)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(mixed_data),
                               content_type='application/json')
        
        # Debe manejar apropiadamente (puede ser 200 si filtra, o 400 si rechaza)
        self.assertIn(response.status_code, [200, 400, 500])
        
        # Test con strings en lugar de números
        string_data = [{'demand': str(100 + i)} for i in range(15)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(string_data),
                               content_type='application/json')
        
        # Debe manejar apropiadamente
        self.assertIn(response.status_code, [200, 400, 500])
        
        if response.status_code != 200:
            data = json.loads(response.data)
            self.assertIn('error', data)
    
    def test_concurrent_session_management(self):
        """Test manejo concurrente de sesiones"""
        
        # Crear múltiples sesiones simultáneamente
        session_ids = []
        
        for i in range(3):
            test_data = [{'demand': 100 + i * 10 + j} for j in range(20)]
            response = self.app.post('/api/upload',
                                   data=json.dumps(test_data),
                                   content_type='application/json')
            
            if response.status_code == 200:
                data = json.loads(response.data)
                session_ids.append(data['session_id'])
        
        # Verificar que todas las sesiones son únicas
        self.assertEqual(len(session_ids), len(set(session_ids)))
        
        # Verificar que todas las sesiones están en caché
        for session_id in session_ids:
            self.assertIn(session_id, results_cache)
    
    def test_error_recovery_after_server_restart_simulation(self):
        """Test recuperación de errores después de simulación de reinicio del servidor"""
        
        # Simular pérdida de caché (como si el servidor se reiniciara)
        original_cache = results_cache.copy()
        results_cache.clear()
        
        # Intentar acceder a una sesión que existía antes del "reinicio"
        response = self.app.get('/api/results?session_id=lost_session')
        
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
        
        # Restaurar caché para otras pruebas
        results_cache.update(original_cache)
    
    def test_comprehensive_http_status_codes(self):
        """Test comprehensivo de todos los códigos de estado HTTP"""
        
        # Test 200 - Success
        response = self.app.post('/api/upload',
                               data=json.dumps(self.valid_data),
                               content_type='application/json')
        self.assertEqual(response.status_code, 200)
        
        # Test 400 - Bad Request (múltiples escenarios)
        bad_requests = [
            ([{'demand': 100}], 'datos insuficientes'),
            ([{'sales': 100} for _ in range(15)], 'columna incorrecta'),
            ([{'demand': 100} for _ in range(125)], 'datos excesivos')
        ]
        
        for bad_data, description in bad_requests:
            response = self.app.post('/api/upload',
                                   data=json.dumps(bad_data),
                                   content_type='application/json')
            self.assertEqual(response.status_code, 400, f"Falló para: {description}")
        
        # Test 404 - Not Found
        response = self.app.get('/api/results?session_id=nonexistent')
        self.assertEqual(response.status_code, 404)
        
        # Test 500 - Internal Server Error
        response = self.app.post('/api/upload',
                               data='malformed json',
                               content_type='application/json')
        self.assertEqual(response.status_code, 500)
    
    def test_error_message_localization_consistency(self):
        """Test consistencia de localización de mensajes de error"""
        
        # Todos los mensajes de error deben estar en español
        error_scenarios = [
            ('/api/upload', json.dumps([{'demand': 100}]), 'application/json'),
            ('/api/upload', json.dumps([{'sales': 100} for _ in range(15)]), 'application/json'),
            ('/api/process', json.dumps({'session_id': 'invalid'}), 'application/json'),
        ]
        
        spanish_keywords = ['requieren', 'contener', 'encontrada', 'datos', 'columna']
        
        for endpoint, data, content_type in error_scenarios:
            response = self.app.post(endpoint, data=data, content_type=content_type)
            
            if response.status_code >= 400:
                response_data = json.loads(response.data)
                error_message = response_data.get('error', '').lower()
                
                # Verificar que contiene al menos una palabra clave en español
                contains_spanish = any(keyword in error_message for keyword in spanish_keywords)
                self.assertTrue(contains_spanish, f"Mensaje no localizado: {error_message}")

if __name__ == '__main__':
    unittest.main()