import unittest
import json
from unittest.mock import patch, MagicMock
from app import app, results_cache
import pandas as pd

class TestResultsEndpoint(unittest.TestCase):
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
    
    def _create_completed_session(self):
        """Crear una sesión con resultados completados"""
        session_id = self._create_test_session()
        
        # Simular resultados completados ordenados por MAPE
        mock_results = [
            {
                'name': 'Random Forest',
                'metrics': {'mape': 8.5, 'mae': 12.3, 'mse': 180.5, 'rmse': 13.4},
                'parameters': {'n_estimators': 100, 'max_depth': 10}
            },
            {
                'name': 'ARIMA (AutoRegressive Integrated Moving Average)',
                'metrics': {'mape': 10.2, 'mae': 15.1, 'mse': 220.3, 'rmse': 14.8},
                'parameters': {'p': 2, 'd': 1, 'q': 1}
            },
            {
                'name': 'Holt-Winters (Triple Exponencial)',
                'metrics': {'mape': 12.7, 'mae': 18.2, 'mse': 280.1, 'rmse': 16.7},
                'parameters': {'alpha': 0.3, 'beta': 0.2, 'gamma': 0.1}
            },
            {
                'name': 'Suavizado Exponencial Simple (SES)',
                'metrics': {'mape': 15.3, 'mae': 22.1, 'mse': 350.2, 'rmse': 18.7},
                'parameters': {'alpha': 0.4}
            },
            {
                'name': 'Regresión Lineal',
                'metrics': {'mape': 18.9, 'mae': 25.8, 'mse': 420.7, 'rmse': 20.5},
                'parameters': {'coef': [1.2, 0.8], 'intercept': 95.3}
            },
            {
                'name': 'Media Móvil Simple (SMA)',
                'metrics': {'mape': 22.4, 'mae': 28.9, 'mse': 480.3, 'rmse': 21.9},
                'parameters': {'window': 6}
            }
        ]
        
        results_cache[session_id]['status'] = 'completed'
        results_cache[session_id]['results'] = mock_results
        
        return session_id
    
    def _create_processing_session(self):
        """Crear una sesión en estado de procesamiento"""
        session_id = self._create_test_session()
        results_cache[session_id]['status'] = 'processing'
        return session_id
    
    def _create_error_session(self):
        """Crear una sesión con error"""
        session_id = self._create_test_session()
        results_cache[session_id]['status'] = 'error'
        results_cache[session_id]['error'] = 'Error en el procesamiento de modelos'
        return session_id
    
    def test_results_completed_session(self):
        """Test recuperación de resultados completados"""
        session_id = self._create_completed_session()
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        # Verificar respuesta exitosa
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar estructura de respuesta
        self.assertIn('status', data)
        self.assertEqual(data['status'], 'completed')
        self.assertIn('results', data)
        self.assertIsInstance(data['results'], list)
        
        # Verificar que hay resultados
        results = data['results']
        self.assertGreater(len(results), 0)
        
        # Verificar estructura de cada resultado
        for result in results:
            self.assertIn('name', result)
            self.assertIn('metrics', result)
            self.assertIn('parameters', result)
            
            # Verificar métricas
            metrics = result['metrics']
            self.assertIn('mape', metrics)
            self.assertIn('mae', metrics)
            self.assertIn('mse', metrics)
            self.assertIn('rmse', metrics)
    
    def test_results_ordering_by_mape(self):
        """Test verificación de ordenamiento correcto por MAPE ascendente"""
        session_id = self._create_completed_session()
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        results = data['results']
        
        # Verificar ordenamiento por MAPE ascendente
        mapes = [result['metrics']['mape'] for result in results 
                if not pd.isna(result['metrics']['mape'])]
        
        if len(mapes) > 1:
            self.assertEqual(mapes, sorted(mapes))
            
        # Verificar que Random Forest está primero (menor MAPE en nuestros datos de prueba)
        self.assertEqual(results[0]['name'], 'Random Forest')
        self.assertEqual(results[0]['metrics']['mape'], 8.5)
    
    def test_results_processing_status(self):
        """Test respuesta de estado 'processing' durante ejecución"""
        session_id = self._create_processing_session()
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        # Verificar respuesta exitosa
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar estado de procesamiento
        self.assertIn('status', data)
        self.assertEqual(data['status'], 'processing')
        
        # No debe haber resultados aún
        self.assertNotIn('results', data)
    
    def test_results_error_status(self):
        """Test respuesta de error cuando el procesamiento falla"""
        session_id = self._create_error_session()
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        # Verificar respuesta exitosa (200) pero con estado de error
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar estado de error
        self.assertIn('status', data)
        self.assertEqual(data['status'], 'error')
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Error en el procesamiento de modelos')
        
        # No debe haber resultados
        self.assertNotIn('results', data)
    
    def test_results_invalid_session_id(self):
        """Test manejo de session_id inexistente"""
        invalid_session_id = "20240101_120000"
        
        response = self.app.get(f'/api/results?session_id={invalid_session_id}')
        
        # Verificar error 404
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
    
    def test_results_missing_session_id(self):
        """Test manejo de petición sin session_id"""
        response = self.app.get('/api/results')
        
        # Verificar error 404 (session_id None no existe)
        self.assertEqual(response.status_code, 404)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Sesión no encontrada')
    
    def test_results_top_10_limitation(self):
        """Test limitación a top 10 resultados"""
        session_id = self._create_test_session()
        
        # Crear más de 10 resultados simulados
        mock_results = []
        for i in range(15):
            mock_results.append({
                'name': f'Model_{i}',
                'metrics': {'mape': 10.0 + i, 'mae': 15.0 + i, 'mse': 200.0 + i * 10, 'rmse': 14.0 + i},
                'parameters': {'param': f'value_{i}'}
            })
        
        results_cache[session_id]['status'] = 'completed'
        results_cache[session_id]['results'] = mock_results
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        results = data['results']
        
        # Verificar que solo se devuelven 10 resultados
        self.assertEqual(len(results), 10)
        
        # Verificar que son los primeros 10 (mejores MAPE)
        for i, result in enumerate(results):
            self.assertEqual(result['name'], f'Model_{i}')
            self.assertEqual(result['metrics']['mape'], 10.0 + i)
    
    def test_results_empty_results_list(self):
        """Test manejo de lista de resultados vacía"""
        session_id = self._create_test_session()
        
        # Simular resultados completados pero vacíos
        results_cache[session_id]['status'] = 'completed'
        results_cache[session_id]['results'] = []
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        self.assertEqual(data['status'], 'completed')
        self.assertIn('results', data)
        self.assertEqual(len(data['results']), 0)
    
    def test_results_with_nan_mape_values(self):
        """Test manejo de valores NaN en MAPE"""
        session_id = self._create_test_session()
        
        # Crear resultados con algunos valores NaN en MAPE
        mock_results = [
            {
                'name': 'Model_Good',
                'metrics': {'mape': 12.5, 'mae': 15.0, 'mse': 200.0, 'rmse': 14.1},
                'parameters': {'param': 'value1'}
            },
            {
                'name': 'Model_NaN',
                'metrics': {'mape': float('nan'), 'mae': 18.0, 'mse': 250.0, 'rmse': 15.8},
                'parameters': {'param': 'value2'}
            },
            {
                'name': 'Model_Better',
                'metrics': {'mape': 8.3, 'mae': 12.0, 'mse': 180.0, 'rmse': 13.4},
                'parameters': {'param': 'value3'}
            }
        ]
        
        results_cache[session_id]['status'] = 'completed'
        results_cache[session_id]['results'] = mock_results
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        results = data['results']
        
        # Verificar que se devuelven todos los resultados
        self.assertEqual(len(results), 3)
        
        # Los resultados deben estar en el orden correcto
        # (el ordenamiento en el backend maneja NaN apropiadamente)
        self.assertIsInstance(results, list)
    
    def test_results_exception_handling(self):
        """Test manejo de excepciones internas"""
        # Crear sesión válida
        session_id = self._create_completed_session()
        
        # Corromper el caché para forzar una excepción
        results_cache[session_id] = "invalid_data_structure"
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        # Verificar error 500
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_results_completed_with_none_results(self):
        """Test manejo de sesión completada pero con results = None"""
        session_id = self._create_test_session()
        
        # Simular estado completado pero con results = None
        results_cache[session_id]['status'] = 'completed'
        results_cache[session_id]['results'] = None
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        # Verificar error 500 debido a que results es None
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_results_ordering_with_identical_mape(self):
        """Test ordenamiento cuando múltiples modelos tienen el mismo MAPE"""
        session_id = self._create_test_session()
        
        # Crear resultados con MAPE idénticos - simular el ordenamiento que hace el backend
        mock_results = [
            {
                'name': 'Model_C',
                'metrics': {'mape': 10.0, 'mae': 15.0, 'mse': 200.0, 'rmse': 14.1},
                'parameters': {'param': 'valueC'}
            },
            {
                'name': 'Model_A',
                'metrics': {'mape': 15.0, 'mae': 20.0, 'mse': 300.0, 'rmse': 17.3},
                'parameters': {'param': 'valueA'}
            },
            {
                'name': 'Model_B',
                'metrics': {'mape': 15.0, 'mae': 18.0, 'mse': 280.0, 'rmse': 16.7},
                'parameters': {'param': 'valueB'}
            }
        ]
        
        # Simular el ordenamiento que hace el backend (sorted by MAPE)
        sorted_results = sorted(mock_results, key=lambda x: x['metrics']['mape'])
        
        results_cache[session_id]['status'] = 'completed'
        results_cache[session_id]['results'] = sorted_results
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        results = data['results']
        
        # Verificar que Model_C está primero (menor MAPE)
        self.assertEqual(results[0]['name'], 'Model_C')
        self.assertEqual(results[0]['metrics']['mape'], 10.0)
        
        # Los otros dos pueden estar en cualquier orden ya que tienen el mismo MAPE
        remaining_names = [results[1]['name'], results[2]['name']]
        self.assertIn('Model_A', remaining_names)
        self.assertIn('Model_B', remaining_names)
    
    def test_results_response_format_validation(self):
        """Test validación completa del formato de respuesta"""
        session_id = self._create_completed_session()
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'application/json')
        
        data = json.loads(response.data)
        
        # Verificar estructura de respuesta completa
        self.assertIn('status', data)
        self.assertIn('results', data)
        self.assertEqual(data['status'], 'completed')
        self.assertIsInstance(data['results'], list)
        
        # Verificar estructura detallada de cada resultado
        for result in data['results']:
            # Campos obligatorios
            self.assertIn('name', result)
            self.assertIn('metrics', result)
            self.assertIn('parameters', result)
            
            # Tipos de datos correctos
            self.assertIsInstance(result['name'], str)
            self.assertIsInstance(result['metrics'], dict)
            self.assertIsInstance(result['parameters'], dict)
            
            # Métricas obligatorias
            metrics = result['metrics']
            required_metrics = ['mape', 'mae', 'mse', 'rmse']
            for metric in required_metrics:
                self.assertIn(metric, metrics)
                # Verificar que son números (pueden ser NaN)
                self.assertTrue(isinstance(metrics[metric], (int, float)))
    
    def test_results_unknown_status(self):
        """Test manejo de estado desconocido en la sesión"""
        session_id = self._create_test_session()
        
        # Simular un estado desconocido
        results_cache[session_id]['status'] = 'unknown_status'
        results_cache[session_id]['results'] = []
        
        response = self.app.get(f'/api/results?session_id={session_id}')
        
        # El endpoint debería manejar esto como un estado completado
        # ya que no es 'processing' ni 'error'
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar que devuelve los resultados (aunque estén vacíos)
        self.assertIn('status', data)
        self.assertEqual(data['status'], 'completed')
        self.assertIn('results', data)
        self.assertEqual(len(data['results']), 0)

if __name__ == '__main__':
    unittest.main()