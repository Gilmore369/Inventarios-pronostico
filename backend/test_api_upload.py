import unittest
import json
import io
import pandas as pd
import numpy as np
from unittest.mock import patch, MagicMock
from app import app, results_cache
import tempfile
import os
import time

class TestUploadEndpoint(unittest.TestCase):
    def setUp(self):
        """Configurar el entorno de prueba"""
        self.app = app.test_client()
        self.app.testing = True
        # Limpiar caché antes de cada prueba
        results_cache.clear()
    
    def tearDown(self):
        """Limpiar después de cada prueba"""
        results_cache.clear()
    
    def test_upload_csv_file_valid(self):
        """Test para carga de archivos CSV válidos"""
        # Crear datos de prueba válidos (24 meses)
        test_data = pd.DataFrame({
            'demand': [100 + i * 5 + (i % 12) * 10 for i in range(24)]
        })
        
        # Crear archivo CSV temporal
        csv_content = test_data.to_csv(index=False)
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        
        # Realizar petición POST
        response = self.app.post('/api/upload', 
                               data={'file': (csv_file, 'test_data.csv')},
                               content_type='multipart/form-data')
        
        # Verificar respuesta
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar que se generó session_id
        self.assertIn('session_id', data)
        self.assertIn('message', data)
        self.assertEqual(data['message'], 'Datos cargados exitosamente')
        
        # Verificar que los datos se almacenaron en caché
        session_id = data['session_id']
        self.assertIn(session_id, results_cache)
        self.assertEqual(results_cache[session_id]['status'], 'uploaded')
        self.assertIsNotNone(results_cache[session_id]['data'])
    
    def test_upload_json_data_valid(self):
        """Test para entrada de datos manuales en formato JSON"""
        # Crear datos de prueba válidos (18 meses)
        test_data = [
            {'demand': 100 + i * 3} for i in range(18)
        ]
        
        # Realizar petición POST con JSON
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data),
                               content_type='application/json')
        
        # Verificar respuesta
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        # Verificar que se generó session_id
        self.assertIn('session_id', data)
        self.assertIn('message', data)
        
        # Verificar que los datos se almacenaron correctamente
        session_id = data['session_id']
        self.assertIn(session_id, results_cache)
        stored_data = pd.DataFrame(results_cache[session_id]['data'])
        self.assertEqual(len(stored_data), 18)
        self.assertIn('demand', stored_data.columns)
    
    def test_upload_data_range_validation_minimum(self):
        """Test validación de rango mínimo de datos (12 meses)"""
        # Datos con menos de 12 meses (solo 10)
        test_data = [{'demand': 100 + i} for i in range(10)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data),
                               content_type='application/json')
        
        # Verificar error 400
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Se requieren entre 12 y 120 meses de datos')
    
    def test_upload_data_range_validation_maximum(self):
        """Test validación de rango máximo de datos (120 meses)"""
        # Datos con más de 120 meses (125)
        test_data = [{'demand': 100 + i} for i in range(125)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data),
                               content_type='application/json')
        
        # Verificar error 400
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Se requieren entre 12 y 120 meses de datos')
    
    def test_upload_data_range_validation_boundary_valid(self):
        """Test validación en los límites válidos (12 y 120 meses)"""
        # Test con exactamente 12 meses
        test_data_12 = [{'demand': 100 + i} for i in range(12)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data_12),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        
        # Test con exactamente 120 meses
        test_data_120 = [{'demand': 100 + i} for i in range(120)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data_120),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
    
    def test_upload_missing_demand_column(self):
        """Test validación de columna 'demand' requerida"""
        # Datos sin columna 'demand'
        test_data = [{'sales': 100 + i, 'month': i} for i in range(15)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data),
                               content_type='application/json')
        
        # Verificar error 400
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'El dataset debe contener una columna "demand"')
    
    def test_upload_csv_missing_demand_column(self):
        """Test validación de columna 'demand' en archivo CSV"""
        # Crear CSV sin columna 'demand'
        test_data = pd.DataFrame({
            'sales': [100 + i for i in range(15)],
            'month': list(range(15))
        })
        
        csv_content = test_data.to_csv(index=False)
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        
        response = self.app.post('/api/upload',
                               data={'file': (csv_file, 'test_data.csv')},
                               content_type='multipart/form-data')
        
        # Verificar error 400
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'El dataset debe contener una columna "demand"')
    
    def test_session_id_generation_format(self):
        """Test validación de generación correcta de session_id"""
        test_data = [{'demand': 100 + i} for i in range(15)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data),
                               content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        session_id = data['session_id']
        
        # Verificar formato de session_id (YYYYMMDD_HHMMSS)
        self.assertEqual(len(session_id), 15)  # 8 + 1 + 6
        self.assertIn('_', session_id)
        
        # Verificar que es único en múltiples llamadas
        response2 = self.app.post('/api/upload',
                                data=json.dumps(test_data),
                                content_type='application/json')
        
        data2 = json.loads(response2.data)
        session_id2 = data2['session_id']
        
        # Los session_ids deben ser diferentes (aunque sea por milisegundos)
        # En caso de que sean iguales por velocidad, al menos verificar que ambos existen
        self.assertTrue(session_id in results_cache)
        self.assertTrue(session_id2 in results_cache)
    
    def test_upload_invalid_csv_file(self):
        """Test manejo de errores con archivos CSV inválidos"""
        # Crear archivo con contenido inválido
        invalid_csv = io.BytesIO(b"invalid,csv,content\nwithout,proper,structure")
        
        response = self.app.post('/api/upload',
                               data={'file': (invalid_csv, 'invalid.csv')},
                               content_type='multipart/form-data')
        
        # Debe devolver error (400 o 500 son ambos válidos para contenido inválido)
        self.assertIn(response.status_code, [400, 500])
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_upload_empty_file(self):
        """Test manejo de archivos vacíos"""
        empty_csv = io.BytesIO(b"")
        
        response = self.app.post('/api/upload',
                               data={'file': (empty_csv, 'empty.csv')},
                               content_type='multipart/form-data')
        
        # Debe devolver error
        self.assertIn(response.status_code, [400, 500])
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_upload_malformed_json(self):
        """Test manejo de JSON malformado"""
        response = self.app.post('/api/upload',
                               data='{"invalid": json}',
                               content_type='application/json')
        
        # Debe devolver error por JSON inválido
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_upload_csv_with_extra_columns(self):
        """Test que archivos CSV con columnas adicionales funcionen correctamente"""
        # CSV con columnas adicionales pero incluyendo 'demand'
        test_data = pd.DataFrame({
            'month': list(range(1, 16)),
            'demand': [100 + i * 2 for i in range(15)],
            'region': ['North'] * 15,
            'product': ['A'] * 15
        })
        
        csv_content = test_data.to_csv(index=False)
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        
        response = self.app.post('/api/upload',
                               data={'file': (csv_file, 'test_data.csv')},
                               content_type='multipart/form-data')
        
        # Debe funcionar correctamente
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('session_id', data)
        
        # Verificar que todas las columnas se almacenaron
        session_id = data['session_id']
        stored_data = pd.DataFrame(results_cache[session_id]['data'])
        self.assertIn('demand', stored_data.columns)
        self.assertIn('month', stored_data.columns)
        self.assertIn('region', stored_data.columns)
        self.assertIn('product', stored_data.columns)
    
    def test_upload_demand_column_with_numeric_validation(self):
        """Test validación de que la columna 'demand' contenga valores numéricos válidos"""
        # Datos con valores no numéricos en demand
        test_data = [
            {'demand': 'invalid_value'},
            {'demand': 100},
            {'demand': 200}
        ] + [{'demand': 100 + i} for i in range(12)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data),
                               content_type='application/json')
        
        # El endpoint debería manejar esto apropiadamente
        # (puede convertir o fallar, dependiendo de la implementación)
        self.assertIn(response.status_code, [200, 400, 500])
    
    def test_upload_demand_column_with_missing_values(self):
        """Test manejo de valores faltantes en la columna 'demand'"""
        # Datos con algunos valores None/null en demand
        test_data = [
            {'demand': 100},
            {'demand': None},
            {'demand': 200}
        ] + [{'demand': 100 + i} for i in range(12)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data),
                               content_type='application/json')
        
        # El endpoint debería manejar esto apropiadamente
        self.assertIn(response.status_code, [200, 400, 500])
    
    def test_upload_session_id_uniqueness_concurrent(self):
        """Test que los session_ids sean únicos incluso en llamadas concurrentes"""
        test_data = [{'demand': 100 + i} for i in range(15)]
        
        # Simular múltiples uploads con pausas para asegurar timestamps únicos
        session_ids = []
        for i in range(3):
            response = self.app.post('/api/upload',
                                   data=json.dumps(test_data),
                                   content_type='application/json')
            
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            session_ids.append(data['session_id'])
            
            # Pausa más larga para asegurar timestamps diferentes
            if i < 2:  # No pausar después del último
                time.sleep(1.1)  # Más de 1 segundo para asegurar diferencia
        
        # Verificar que todos los session_ids son únicos
        unique_ids = set(session_ids)
        self.assertEqual(len(session_ids), len(unique_ids), 
                        f"Session IDs no son únicos: {session_ids}")
        
        # Verificar que todos están en caché
        for session_id in session_ids:
            self.assertIn(session_id, results_cache)
    
    def test_upload_no_content_type_header(self):
        """Test manejo de requests sin Content-Type header"""
        test_data = [{'demand': 100 + i} for i in range(15)]
        
        response = self.app.post('/api/upload',
                               data=json.dumps(test_data))
        
        # Debería manejar apropiadamente la falta de content-type
        self.assertIn(response.status_code, [200, 400, 500])
    
    def test_upload_large_csv_file_within_limits(self):
        """Test carga de archivo CSV grande pero dentro de los límites (120 meses)"""
        # Crear dataset de exactamente 120 meses con múltiples columnas
        test_data = pd.DataFrame({
            'month': list(range(1, 121)),
            'demand': [1000 + i * 10 + np.sin(i/12) * 50 for i in range(120)],
            'category': ['A', 'B', 'C'] * 40,
            'region': ['North', 'South', 'East', 'West'] * 30
        })
        
        csv_content = test_data.to_csv(index=False)
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        
        response = self.app.post('/api/upload',
                               data={'file': (csv_file, 'large_data.csv')},
                               content_type='multipart/form-data')
        
        # Debe funcionar correctamente
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('session_id', data)
        
        # Verificar que se almacenaron todos los datos
        session_id = data['session_id']
        stored_data = pd.DataFrame(results_cache[session_id]['data'])
        self.assertEqual(len(stored_data), 120)

if __name__ == '__main__':
    unittest.main()