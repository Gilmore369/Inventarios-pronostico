import unittest
import json
import numpy as np
from unittest.mock import patch, MagicMock
from app import app, results_cache
import pandas as pd

class TestForecastEndpoint(unittest.TestCase):
    def setUp(self):
        """Configurar el entorno de prueba"""
        self.app = app.test_client()
        self.app.testing = True
        # Limpiar caché antes de cada prueba
        results_cache.clear()
        
        # Crear datos de prueba válidos con tendencia y estacionalidad
        self.test_data = [{'demand': 100 + i * 2 + 10 * np.sin(i * np.pi / 6)} for i in range(24)]
        self.session_id = self._create_test_session()
        
        # Modelos disponibles
        self.available_models = [
            'Media Móvil Simple (SMA)',
            'Suavizado Exponencial Simple (SES)',
            'Holt-Winters (Triple Exponencial)',
            'ARIMA (AutoRegressive Integrated Moving Average)',
            'Regresión Lineal',
            'Random Forest'
        ]
    
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
    
    def test_forecast_default_12_months(self):
        """Test generación de pronósticos de 12 meses por defecto"""
        for model_name in self.available_models:
            with self.subTest(model=model_name):
                response = self.app.post('/api/forecast',
                                       data=json.dumps({
                                           'session_id': self.session_id,
                                           'model_name': model_name
                                       }),
                                       content_type='application/json')
                
                # Verificar respuesta exitosa
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                
                # Verificar estructura de respuesta
                self.assertIn('forecast', data)
                self.assertIn('model_name', data)
                self.assertIn('periods', data)
                self.assertIn('model_info', data)
                
                # Verificar que se generaron 12 períodos por defecto
                self.assertEqual(data['periods'], 12)
                self.assertEqual(len(data['forecast']), 12)
                
                # Verificar que el modelo es correcto
                self.assertEqual(data['model_name'], model_name)
                
                # Verificar que los valores del pronóstico son numéricos
                forecast = data['forecast']
                for value in forecast:
                    self.assertIsInstance(value, (int, float))
                    self.assertFalse(np.isnan(value))
    
    def test_forecast_custom_periods(self):
        """Test generación de pronósticos con diferentes períodos"""
        model_name = 'Regresión Lineal'
        test_periods = [6, 18, 24, 36]
        
        for periods in test_periods:
            with self.subTest(periods=periods):
                response = self.app.post('/api/forecast',
                                       data=json.dumps({
                                           'session_id': self.session_id,
                                           'model_name': model_name,
                                           'periods': periods
                                       }),
                                       content_type='application/json')
                
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                
                # Verificar que se generó el número correcto de períodos
                self.assertEqual(data['periods'], periods)
                self.assertEqual(len(data['forecast']), periods)
    
    def test_forecast_model_selection(self):
        """Test selección correcta del modelo especificado"""
        for model_name in self.available_models:
            with self.subTest(model=model_name):
                response = self.app.post('/api/forecast',
                                       data=json.dumps({
                                           'session_id': self.session_id,
                                           'model_name': model_name
                                       }),
                                       content_type='application/json')
                
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                
                # Verificar que se seleccionó el modelo correcto
                self.assertEqual(data['model_name'], model_name)
    
    def test_forecast_model_info_inclusion(self):
        """Test inclusión de información del modelo en la respuesta"""
        model_name = 'Holt-Winters (Triple Exponencial)'
        
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': self.session_id,
                                   'model_name': model_name
                               }),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar que se incluye información del modelo
        self.assertIn('model_info', data)
        model_info = data['model_info']
        
        # Verificar estructura de model_info
        expected_keys = ['equation', 'description', 'best_for', 'limitations', 'parameters']
        for key in expected_keys:
            self.assertIn(key, model_info)
            self.assertIsInstance(model_info[key], str)
            self.assertGreater(len(model_info[key]), 0)
    
    def test_forecast_invalid_session_id(self):
        """Test manejo de errores con session_id inexistente"""
        invalid_session_id = "20240101_120000"
        
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': invalid_session_id,
                                   'model_name': 'Regresión Lineal'
                               }),
                               content_type='application/json')
        
        # Verificar error 404
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
    
    def test_forecast_nonexistent_model(self):
        """Test manejo de errores con modelos inexistentes"""
        nonexistent_model = "Modelo Inexistente"
        
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': self.session_id,
                                   'model_name': nonexistent_model
                               }),
                               content_type='application/json')
        
        # Debe responder con éxito pero usar pronóstico por defecto
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar que se devuelve el modelo solicitado (aunque no exista)
        self.assertEqual(data['model_name'], nonexistent_model)
        
        # Verificar que se generó un pronóstico (por defecto)
        self.assertIn('forecast', data)
        self.assertEqual(len(data['forecast']), 12)  # Períodos por defecto
    
    def test_forecast_missing_parameters(self):
        """Test manejo de parámetros faltantes"""
        # Test sin model_name
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': self.session_id
                               }),
                               content_type='application/json')
        
        # Puede devolver 200 con pronóstico por defecto o 500 por parámetro faltante
        self.assertIn(response.status_code, [200, 500])
        data = json.loads(response.data)
        
        if response.status_code == 500:
            self.assertIn('error', data)
        else:
            # Si responde con éxito, debe incluir un pronóstico
            self.assertIn('forecast', data)
        
        # Test sin session_id
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'model_name': 'Regresión Lineal'
                               }),
                               content_type='application/json')
        
        # Debe devolver error 404
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_forecast_malformed_json(self):
        """Test manejo de JSON malformado"""
        response = self.app.post('/api/forecast',
                               data='{"invalid": json}',
                               content_type='application/json')
        
        # Debe devolver error 500
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_forecast_negative_periods(self):
        """Test manejo de períodos negativos"""
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': self.session_id,
                                   'model_name': 'Regresión Lineal',
                                   'periods': -5
                               }),
                               content_type='application/json')
        
        # Debe manejar el error apropiadamente
        self.assertIn(response.status_code, [200, 500])
        data = json.loads(response.data)
        
        if response.status_code == 200:
            # Si responde con éxito, debe usar un valor por defecto
            self.assertIn('forecast', data)
        else:
            # Si responde con error, debe incluir mensaje de error
            self.assertIn('error', data)
    
    def test_forecast_zero_periods(self):
        """Test manejo de cero períodos"""
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': self.session_id,
                                   'model_name': 'Regresión Lineal',
                                   'periods': 0
                               }),
                               content_type='application/json')
        
        # Debe manejar el caso apropiadamente
        self.assertIn(response.status_code, [200, 500])
        data = json.loads(response.data)
        
        if response.status_code == 200:
            # Si responde con éxito, debe devolver lista vacía o usar defecto
            self.assertIn('forecast', data)
            self.assertEqual(data['periods'], 0)
            self.assertEqual(len(data['forecast']), 0)
    
    def test_forecast_large_periods(self):
        """Test manejo de número muy grande de períodos"""
        large_periods = 120
        
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': self.session_id,
                                   'model_name': 'Media Móvil Simple (SMA)',
                                   'periods': large_periods
                               }),
                               content_type='application/json')
        
        # Debe responder correctamente
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar que se generaron todos los períodos solicitados
        self.assertEqual(data['periods'], large_periods)
        self.assertEqual(len(data['forecast']), large_periods)
    
    @patch('app.forecast_models.generate_forecast')
    def test_forecast_with_mock(self, mock_generate_forecast):
        """Test con mock para controlar el resultado de generate_forecast"""
        # Configurar mock
        mock_forecast_result = {
            'forecast': [110.5, 112.3, 114.1, 115.8, 117.6, 119.4, 121.2, 123.0, 124.8, 126.6, 128.4, 130.2],
            'model_name': 'Regresión Lineal',
            'periods': 12
        }
        mock_generate_forecast.return_value = mock_forecast_result
        
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': self.session_id,
                                   'model_name': 'Regresión Lineal'
                               }),
                               content_type='application/json')
        
        # Verificar que se llamó el método con los parámetros correctos
        mock_generate_forecast.assert_called_once()
        args = mock_generate_forecast.call_args[0]
        self.assertEqual(args[0], 'Regresión Lineal')  # model_name
        self.assertEqual(args[2], 12)  # periods (default)
        
        # Verificar respuesta
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar que se incluye model_info además del resultado del mock
        self.assertIn('model_info', data)
        self.assertEqual(data['forecast'], mock_forecast_result['forecast'])
        self.assertEqual(data['model_name'], mock_forecast_result['model_name'])
        self.assertEqual(data['periods'], mock_forecast_result['periods'])
    
    @patch('app.forecast_models.generate_forecast')
    def test_forecast_exception_handling(self, mock_generate_forecast):
        """Test manejo de excepciones en generate_forecast"""
        # Configurar mock para lanzar excepción
        mock_generate_forecast.side_effect = Exception("Error en generación de pronóstico")
        
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': self.session_id,
                                   'model_name': 'ARIMA (AutoRegressive Integrated Moving Average)'
                               }),
                               content_type='application/json')
        
        # Verificar error 500
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_forecast_data_consistency(self):
        """Test consistencia de datos entre sesión y pronóstico"""
        # Crear sesión con datos específicos
        specific_data = [{'demand': 100 + i * 5} for i in range(12)]
        
        upload_response = self.app.post('/api/upload',
                                      data=json.dumps(specific_data),
                                      content_type='application/json')
        
        session_id = json.loads(upload_response.data)['session_id']
        
        # Generar pronóstico
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': session_id,
                                   'model_name': 'Regresión Lineal'
                               }),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar que el pronóstico es consistente con los datos de entrada
        # (para regresión lineal con tendencia creciente, el pronóstico debe continuar la tendencia)
        forecast = data['forecast']
        self.assertGreater(len(forecast), 0)
        
        # Los valores del pronóstico deben ser razonables (no extremos)
        for value in forecast:
            self.assertGreater(value, 0)  # Valores positivos
            self.assertLess(value, 1000)  # Valores razonables
    
    def test_forecast_all_models_with_different_periods(self):
        """Test generación de pronósticos con todos los modelos y diferentes períodos"""
        test_periods = [6, 12, 18, 24]
        
        for model_name in self.available_models:
            for periods in test_periods:
                with self.subTest(model=model_name, periods=periods):
                    response = self.app.post('/api/forecast',
                                           data=json.dumps({
                                               'session_id': self.session_id,
                                               'model_name': model_name,
                                               'periods': periods
                                           }),
                                           content_type='application/json')
                    
                    self.assertEqual(response.status_code, 200)
                    data = json.loads(response.data)
                    
                    # Verificar estructura de respuesta
                    self.assertIn('forecast', data)
                    self.assertIn('model_name', data)
                    self.assertIn('periods', data)
                    self.assertIn('model_info', data)
                    
                    # Verificar que se generó el número correcto de períodos
                    self.assertEqual(data['periods'], periods)
                    self.assertEqual(len(data['forecast']), periods)
                    self.assertEqual(data['model_name'], model_name)
    
    def test_forecast_model_info_completeness(self):
        """Test completitud de información del modelo para todos los modelos"""
        required_info_keys = ['equation', 'description', 'best_for', 'limitations', 'parameters']
        
        for model_name in self.available_models:
            with self.subTest(model=model_name):
                response = self.app.post('/api/forecast',
                                       data=json.dumps({
                                           'session_id': self.session_id,
                                           'model_name': model_name
                                       }),
                                       content_type='application/json')
                
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                
                # Verificar que model_info está presente
                self.assertIn('model_info', data)
                model_info = data['model_info']
                
                # Verificar que todas las claves requeridas están presentes
                for key in required_info_keys:
                    self.assertIn(key, model_info, f"Falta la clave '{key}' en model_info para {model_name}")
                    self.assertIsInstance(model_info[key], str, f"La clave '{key}' debe ser string para {model_name}")
                    self.assertGreater(len(model_info[key]), 0, f"La clave '{key}' no puede estar vacía para {model_name}")
    
    def test_forecast_extreme_periods_values(self):
        """Test manejo de valores extremos de períodos"""
        extreme_values = [1, 60, 120, 240]
        model_name = 'Media Móvil Simple (SMA)'
        
        for periods in extreme_values:
            with self.subTest(periods=periods):
                response = self.app.post('/api/forecast',
                                       data=json.dumps({
                                           'session_id': self.session_id,
                                           'model_name': model_name,
                                           'periods': periods
                                       }),
                                       content_type='application/json')
                
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                
                # Verificar que se generó el número correcto de períodos
                self.assertEqual(data['periods'], periods)
                self.assertEqual(len(data['forecast']), periods)
                
                # Verificar que todos los valores son numéricos válidos
                for value in data['forecast']:
                    self.assertIsInstance(value, (int, float))
                    self.assertFalse(np.isnan(value))
                    self.assertFalse(np.isinf(value))
    
    def test_forecast_nonexistent_model_detailed(self):
        """Test detallado de manejo de modelos inexistentes"""
        nonexistent_models = [
            "Modelo Inexistente",
            "LSTM Neural Network", 
            "Prophet",
            "",
            None,
            123,
            {"invalid": "model"}
        ]
        
        for invalid_model in nonexistent_models:
            with self.subTest(model=invalid_model):
                response = self.app.post('/api/forecast',
                                       data=json.dumps({
                                           'session_id': self.session_id,
                                           'model_name': invalid_model
                                       }),
                                       content_type='application/json')
                
                # El endpoint debe manejar modelos inexistentes apropiadamente
                self.assertIn(response.status_code, [200, 400, 500])
                data = json.loads(response.data)
                
                if response.status_code == 200:
                    # Si responde con éxito, debe incluir un pronóstico por defecto
                    self.assertIn('forecast', data)
                    self.assertIn('model_name', data)
                    self.assertEqual(len(data['forecast']), 12)  # Períodos por defecto
                else:
                    # Si responde con error, debe incluir mensaje de error
                    self.assertIn('error', data)
    
    def test_forecast_response_time_performance(self):
        """Test rendimiento del tiempo de respuesta del endpoint"""
        import time
        
        model_name = 'Regresión Lineal'  # Modelo más rápido
        
        start_time = time.time()
        response = self.app.post('/api/forecast',
                               data=json.dumps({
                                   'session_id': self.session_id,
                                   'model_name': model_name,
                                   'periods': 12
                               }),
                               content_type='application/json')
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # Verificar que la respuesta es exitosa
        self.assertEqual(response.status_code, 200)
        
        # Verificar que el tiempo de respuesta es aceptable (< 5 segundos según requirements)
        self.assertLess(response_time, 5.0, f"Tiempo de respuesta {response_time:.2f}s excede el límite de 5s")
    
    def test_forecast_concurrent_requests(self):
        """Test manejo de múltiples requests concurrentes"""
        import threading
        import time
        
        results = []
        errors = []
        
        def make_forecast_request():
            try:
                response = self.app.post('/api/forecast',
                                       data=json.dumps({
                                           'session_id': self.session_id,
                                           'model_name': 'Media Móvil Simple (SMA)',
                                           'periods': 12
                                       }),
                                       content_type='application/json')
                results.append(response.status_code)
            except Exception as e:
                errors.append(str(e))
        
        # Crear múltiples threads para requests concurrentes
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=make_forecast_request)
            threads.append(thread)
        
        # Ejecutar todos los threads
        for thread in threads:
            thread.start()
        
        # Esperar a que terminen todos
        for thread in threads:
            thread.join()
        
        # Verificar que no hubo errores
        self.assertEqual(len(errors), 0, f"Errores en requests concurrentes: {errors}")
        
        # Verificar que todas las respuestas fueron exitosas
        for status_code in results:
            self.assertEqual(status_code, 200)

if __name__ == '__main__':
    unittest.main()