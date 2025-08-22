"""
Pruebas de rendimiento para endpoints API del backend
Valida que todas las respuestas sean menores a 5 segundos
y prueba comportamiento bajo carga concurrente
"""

import time
import requests
import threading
import json
import pandas as pd
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import psutil
import os
from test_data_generator import TestDataGenerator

class APIPerformanceTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.data_generator = TestDataGenerator()
        self.response_time_threshold = 5.0  # segundos
        self.memory_threshold_mb = 200  # MB
        self.results = []
        
    def measure_memory_usage(self):
        """Mide el uso de memoria del proceso actual"""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024  # MB
    
    def create_test_data(self, size=24):
        """Crea datos de prueba para los endpoints"""
        data = self.data_generator.generate_trend_data(size, 'linear', 1.0, 100.0, 0.1)
        return [{'month': i+1, 'demand': value} for i, value in enumerate(data)]
    
    def test_upload_endpoint_performance(self):
        """Prueba el rendimiento del endpoint /api/upload"""
        print("=== PROBANDO RENDIMIENTO DE /api/upload ===")
        
        # Probar con diferentes tamaños de datos
        test_sizes = [12, 24, 60, 120]
        
        for size in test_sizes:
            print(f"Probando upload con {size} meses de datos")
            
            # Preparar datos
            test_data = self.create_test_data(size)
            
            # Medir memoria antes
            memory_before = self.measure_memory_usage()
            
            # Medir tiempo de respuesta
            start_time = time.time()
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/upload",
                    json=test_data,
                    timeout=10
                )
                
                response_time = time.time() - start_time
                memory_after = self.measure_memory_usage()
                memory_used = memory_after - memory_before
                
                # Validar respuesta
                success = response.status_code == 200
                if success:
                    response_data = response.json()
                    session_id = response_data.get('session_id')
                else:
                    session_id = None
                
                result = {
                    'endpoint': '/api/upload',
                    'method': 'POST',
                    'dataset_size': size,
                    'response_time': round(response_time, 3),
                    'memory_used_mb': round(memory_used, 2),
                    'status_code': response.status_code,
                    'success': success,
                    'within_time_threshold': response_time < self.response_time_threshold,
                    'within_memory_threshold': memory_used < self.memory_threshold_mb,
                    'session_id': session_id,
                    'timestamp': datetime.now().isoformat()
                }
                
                self.results.append(result)
                
                status = "✓" if success and result['within_time_threshold'] else "✗"
                print(f"  {status} {size} meses: {response_time:.3f}s, {memory_used:.2f}MB, Status: {response.status_code}")
                
                return session_id if success else None
                
            except Exception as e:
                response_time = time.time() - start_time
                memory_after = self.measure_memory_usage()
                memory_used = memory_after - memory_before
                
                result = {
                    'endpoint': '/api/upload',
                    'method': 'POST',
                    'dataset_size': size,
                    'response_time': round(response_time, 3),
                    'memory_used_mb': round(memory_used, 2),
                    'status_code': 0,
                    'success': False,
                    'within_time_threshold': response_time < self.response_time_threshold,
                    'within_memory_threshold': memory_used < self.memory_threshold_mb,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                
                self.results.append(result)
                print(f"  ✗ {size} meses: Error - {str(e)}")
                return None
    
    def test_process_endpoint_performance(self, session_id):
        """Prueba el rendimiento del endpoint /api/process"""
        print("=== PROBANDO RENDIMIENTO DE /api/process ===")
        
        if not session_id:
            print("No hay session_id válido para probar /api/process")
            return
        
        # Medir memoria antes
        memory_before = self.measure_memory_usage()
        
        # Medir tiempo de respuesta
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.base_url}/api/process",
                json={'session_id': session_id},
                timeout=10
            )
            
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            # Validar respuesta
            success = response.status_code == 200
            
            result = {
                'endpoint': '/api/process',
                'method': 'POST',
                'session_id': session_id,
                'response_time': round(response_time, 3),
                'memory_used_mb': round(memory_used, 2),
                'status_code': response.status_code,
                'success': success,
                'within_time_threshold': response_time < self.response_time_threshold,
                'within_memory_threshold': memory_used < self.memory_threshold_mb,
                'timestamp': datetime.now().isoformat()
            }
            
            self.results.append(result)
            
            status = "✓" if success and result['within_time_threshold'] else "✗"
            print(f"  {status} Process: {response_time:.3f}s, {memory_used:.2f}MB, Status: {response.status_code}")
            
        except Exception as e:
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            result = {
                'endpoint': '/api/process',
                'method': 'POST',
                'session_id': session_id,
                'response_time': round(response_time, 3),
                'memory_used_mb': round(memory_used, 2),
                'status_code': 0,
                'success': False,
                'within_time_threshold': response_time < self.response_time_threshold,
                'within_memory_threshold': memory_used < self.memory_threshold_mb,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
            
            self.results.append(result)
            print(f"  ✗ Process: Error - {str(e)}")
    
    def test_results_endpoint_performance(self, session_id):
        """Prueba el rendimiento del endpoint /api/results"""
        print("=== PROBANDO RENDIMIENTO DE /api/results ===")
        
        if not session_id:
            print("No hay session_id válido para probar /api/results")
            return
        
        # Esperar un poco para que el procesamiento termine
        print("Esperando procesamiento...")
        time.sleep(3)
        
        # Probar múltiples veces para medir consistencia
        for attempt in range(3):
            print(f"Intento {attempt + 1}/3")
            
            # Medir memoria antes
            memory_before = self.measure_memory_usage()
            
            # Medir tiempo de respuesta
            start_time = time.time()
            
            try:
                response = requests.get(
                    f"{self.base_url}/api/results",
                    params={'session_id': session_id},
                    timeout=10
                )
                
                response_time = time.time() - start_time
                memory_after = self.measure_memory_usage()
                memory_used = memory_after - memory_before
                
                # Validar respuesta
                success = response.status_code == 200
                if success:
                    response_data = response.json()
                    status = response_data.get('status')
                    results_count = len(response_data.get('results', [])) if status == 'completed' else 0
                else:
                    status = 'error'
                    results_count = 0
                
                result = {
                    'endpoint': '/api/results',
                    'method': 'GET',
                    'session_id': session_id,
                    'attempt': attempt + 1,
                    'response_time': round(response_time, 3),
                    'memory_used_mb': round(memory_used, 2),
                    'status_code': response.status_code,
                    'success': success,
                    'within_time_threshold': response_time < self.response_time_threshold,
                    'within_memory_threshold': memory_used < self.memory_threshold_mb,
                    'processing_status': status,
                    'results_count': results_count,
                    'timestamp': datetime.now().isoformat()
                }
                
                self.results.append(result)
                
                status_icon = "✓" if success and result['within_time_threshold'] else "✗"
                print(f"    {status_icon} Results: {response_time:.3f}s, {memory_used:.2f}MB, Status: {status}")
                
                # Si está completado, no necesitamos más intentos
                if status == 'completed':
                    break
                elif status == 'processing':
                    time.sleep(2)  # Esperar más tiempo
                
            except Exception as e:
                response_time = time.time() - start_time
                memory_after = self.measure_memory_usage()
                memory_used = memory_after - memory_before
                
                result = {
                    'endpoint': '/api/results',
                    'method': 'GET',
                    'session_id': session_id,
                    'attempt': attempt + 1,
                    'response_time': round(response_time, 3),
                    'memory_used_mb': round(memory_used, 2),
                    'status_code': 0,
                    'success': False,
                    'within_time_threshold': response_time < self.response_time_threshold,
                    'within_memory_threshold': memory_used < self.memory_threshold_mb,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                
                self.results.append(result)
                print(f"    ✗ Results: Error - {str(e)}")
    
    def test_forecast_endpoint_performance(self, session_id):
        """Prueba el rendimiento del endpoint /api/forecast"""
        print("=== PROBANDO RENDIMIENTO DE /api/forecast ===")
        
        if not session_id:
            print("No hay session_id válido para probar /api/forecast")
            return
        
        # Probar con diferentes modelos
        models_to_test = [
            'Media Móvil Simple (SMA)',
            'Suavizado Exponencial Simple (SES)',
            'Regresión Lineal'
        ]
        
        for model_name in models_to_test:
            print(f"Probando forecast con modelo: {model_name}")
            
            # Medir memoria antes
            memory_before = self.measure_memory_usage()
            
            # Medir tiempo de respuesta
            start_time = time.time()
            
            try:
                response = requests.post(
                    f"{self.base_url}/api/forecast",
                    json={
                        'session_id': session_id,
                        'model_name': model_name,
                        'periods': 12
                    },
                    timeout=10
                )
                
                response_time = time.time() - start_time
                memory_after = self.measure_memory_usage()
                memory_used = memory_after - memory_before
                
                # Validar respuesta
                success = response.status_code == 200
                if success:
                    response_data = response.json()
                    forecast_length = len(response_data.get('forecast', []))
                else:
                    forecast_length = 0
                
                result = {
                    'endpoint': '/api/forecast',
                    'method': 'POST',
                    'session_id': session_id,
                    'model_name': model_name,
                    'response_time': round(response_time, 3),
                    'memory_used_mb': round(memory_used, 2),
                    'status_code': response.status_code,
                    'success': success,
                    'within_time_threshold': response_time < self.response_time_threshold,
                    'within_memory_threshold': memory_used < self.memory_threshold_mb,
                    'forecast_length': forecast_length,
                    'timestamp': datetime.now().isoformat()
                }
                
                self.results.append(result)
                
                status = "✓" if success and result['within_time_threshold'] else "✗"
                print(f"  {status} {model_name}: {response_time:.3f}s, {memory_used:.2f}MB")
                
            except Exception as e:
                response_time = time.time() - start_time
                memory_after = self.measure_memory_usage()
                memory_used = memory_after - memory_before
                
                result = {
                    'endpoint': '/api/forecast',
                    'method': 'POST',
                    'session_id': session_id,
                    'model_name': model_name,
                    'response_time': round(response_time, 3),
                    'memory_used_mb': round(memory_used, 2),
                    'status_code': 0,
                    'success': False,
                    'within_time_threshold': response_time < self.response_time_threshold,
                    'within_memory_threshold': memory_used < self.memory_threshold_mb,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                
                self.results.append(result)
                print(f"  ✗ {model_name}: Error - {str(e)}")
    
    def test_concurrent_load(self):
        """Prueba el comportamiento bajo carga concurrente"""
        print("=== PROBANDO CARGA CONCURRENTE ===")
        
        # Crear múltiples sesiones concurrentes
        num_concurrent_users = 5
        
        def concurrent_user_session(user_id):
            """Simula una sesión completa de usuario"""
            print(f"Usuario {user_id}: Iniciando sesión")
            
            # 1. Upload
            test_data = self.create_test_data(24)
            
            start_time = time.time()
            try:
                upload_response = requests.post(
                    f"{self.base_url}/api/upload",
                    json=test_data,
                    timeout=10
                )
                
                if upload_response.status_code != 200:
                    return {
                        'user_id': user_id,
                        'success': False,
                        'error': f'Upload failed: {upload_response.status_code}',
                        'total_time': time.time() - start_time
                    }
                
                session_id = upload_response.json()['session_id']
                
                # 2. Process
                process_response = requests.post(
                    f"{self.base_url}/api/process",
                    json={'session_id': session_id},
                    timeout=10
                )
                
                if process_response.status_code != 200:
                    return {
                        'user_id': user_id,
                        'success': False,
                        'error': f'Process failed: {process_response.status_code}',
                        'total_time': time.time() - start_time
                    }
                
                # 3. Wait and check results
                time.sleep(3)
                results_response = requests.get(
                    f"{self.base_url}/api/results",
                    params={'session_id': session_id},
                    timeout=10
                )
                
                total_time = time.time() - start_time
                
                success = (results_response.status_code == 200 and 
                          results_response.json().get('status') in ['completed', 'processing'])
                
                return {
                    'user_id': user_id,
                    'success': success,
                    'session_id': session_id,
                    'total_time': round(total_time, 3),
                    'final_status': results_response.json().get('status') if success else 'error'
                }
                
            except Exception as e:
                return {
                    'user_id': user_id,
                    'success': False,
                    'error': str(e),
                    'total_time': time.time() - start_time
                }
        
        # Ejecutar usuarios concurrentes
        concurrent_results = []
        with ThreadPoolExecutor(max_workers=num_concurrent_users) as executor:
            futures = [executor.submit(concurrent_user_session, i+1) for i in range(num_concurrent_users)]
            
            for future in as_completed(futures):
                result = future.result()
                concurrent_results.append(result)
                
                status = "✓" if result['success'] else "✗"
                print(f"  {status} Usuario {result['user_id']}: {result['total_time']:.3f}s - {result.get('final_status', result.get('error'))}")
        
        # Agregar resultados de concurrencia
        concurrent_summary = {
            'test_type': 'concurrent_load',
            'concurrent_users': num_concurrent_users,
            'successful_sessions': len([r for r in concurrent_results if r['success']]),
            'failed_sessions': len([r for r in concurrent_results if not r['success']]),
            'avg_session_time': round(np.mean([r['total_time'] for r in concurrent_results]), 3),
            'max_session_time': round(np.max([r['total_time'] for r in concurrent_results]), 3),
            'min_session_time': round(np.min([r['total_time'] for r in concurrent_results]), 3),
            'success_rate': round(len([r for r in concurrent_results if r['success']]) / num_concurrent_users * 100, 2),
            'detailed_results': concurrent_results,
            'timestamp': datetime.now().isoformat()
        }
        
        self.results.append(concurrent_summary)
        
        print(f"Resumen de carga concurrente:")
        print(f"  Usuarios exitosos: {concurrent_summary['successful_sessions']}/{num_concurrent_users}")
        print(f"  Tasa de éxito: {concurrent_summary['success_rate']}%")
        print(f"  Tiempo promedio: {concurrent_summary['avg_session_time']}s")
        
        return concurrent_summary
    
    def generate_api_performance_report(self):
        """Genera un reporte completo de rendimiento de API"""
        print("\n=== GENERANDO REPORTE DE RENDIMIENTO DE API ===")
        
        # Filtrar resultados por tipo
        endpoint_tests = [r for r in self.results if 'endpoint' in r]
        concurrent_tests = [r for r in self.results if r.get('test_type') == 'concurrent_load']
        
        # Estadísticas por endpoint
        endpoint_stats = {}
        for result in endpoint_tests:
            endpoint = result['endpoint']
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {
                    'total_tests': 0,
                    'successful_tests': 0,
                    'avg_response_time': 0,
                    'max_response_time': 0,
                    'avg_memory_usage': 0,
                    'max_memory_usage': 0,
                    'response_times': [],
                    'memory_usages': []
                }
            
            stats = endpoint_stats[endpoint]
            stats['total_tests'] += 1
            
            if result['success']:
                stats['successful_tests'] += 1
            
            stats['response_times'].append(result['response_time'])
            stats['memory_usages'].append(result['memory_used_mb'])
        
        # Calcular promedios y máximos
        for endpoint, stats in endpoint_stats.items():
            if stats['response_times']:
                stats['avg_response_time'] = round(np.mean(stats['response_times']), 3)
                stats['max_response_time'] = round(np.max(stats['response_times']), 3)
            
            if stats['memory_usages']:
                stats['avg_memory_usage'] = round(np.mean(stats['memory_usages']), 2)
                stats['max_memory_usage'] = round(np.max(stats['memory_usages']), 2)
            
            # Limpiar listas para el reporte JSON
            del stats['response_times']
            del stats['memory_usages']
        
        # Estadísticas generales
        total_endpoint_tests = len(endpoint_tests)
        successful_endpoint_tests = len([r for r in endpoint_tests if r['success']])
        within_time_threshold = len([r for r in endpoint_tests if r.get('within_time_threshold', False)])
        within_memory_threshold = len([r for r in endpoint_tests if r.get('within_memory_threshold', False)])
        
        report = {
            'summary': {
                'total_endpoint_tests': total_endpoint_tests,
                'successful_endpoint_tests': successful_endpoint_tests,
                'success_rate': round(successful_endpoint_tests / total_endpoint_tests * 100, 2) if total_endpoint_tests > 0 else 0,
                'within_time_threshold': within_time_threshold,
                'within_memory_threshold': within_memory_threshold,
                'time_compliance_rate': round(within_time_threshold / total_endpoint_tests * 100, 2) if total_endpoint_tests > 0 else 0,
                'memory_compliance_rate': round(within_memory_threshold / total_endpoint_tests * 100, 2) if total_endpoint_tests > 0 else 0
            },
            'endpoint_statistics': endpoint_stats,
            'concurrent_load_results': concurrent_tests,
            'detailed_results': self.results,
            'thresholds': {
                'max_response_time_seconds': self.response_time_threshold,
                'max_memory_usage_mb': self.memory_threshold_mb
            },
            'timestamp': datetime.now().isoformat()
        }
        
        # Guardar reporte
        with open('api_performance_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # Mostrar resumen
        print(f"Total de pruebas de endpoints: {total_endpoint_tests}")
        print(f"Pruebas exitosas: {successful_endpoint_tests} ({report['summary']['success_rate']}%)")
        print(f"Dentro del límite de tiempo: {within_time_threshold} ({report['summary']['time_compliance_rate']}%)")
        print(f"Dentro del límite de memoria: {within_memory_threshold} ({report['summary']['memory_compliance_rate']}%)")
        
        print("\nRendimiento por endpoint:")
        for endpoint, stats in endpoint_stats.items():
            print(f"  {endpoint}:")
            print(f"    Tiempo promedio: {stats['avg_response_time']}s (máx: {stats['max_response_time']}s)")
            print(f"    Memoria promedio: {stats['avg_memory_usage']}MB (máx: {stats['max_memory_usage']}MB)")
            print(f"    Tasa de éxito: {stats['successful_tests']}/{stats['total_tests']}")
        
        return report
    
    def run_all_api_performance_tests(self):
        """Ejecuta todas las pruebas de rendimiento de API"""
        print("INICIANDO SUITE COMPLETA DE PRUEBAS DE RENDIMIENTO DE API")
        print("=" * 60)
        
        # Limpiar resultados previos
        self.results = []
        
        # Probar conectividad básica
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            print(f"Conectividad con API: OK (Status: {response.status_code})")
        except Exception as e:
            print(f"❌ Error de conectividad con API: {str(e)}")
            print("Asegúrate de que el servidor Flask esté ejecutándose en http://localhost:5000")
            return None
        
        # Ejecutar pruebas secuenciales
        session_id = self.test_upload_endpoint_performance()
        
        if session_id:
            self.test_process_endpoint_performance(session_id)
            self.test_results_endpoint_performance(session_id)
            self.test_forecast_endpoint_performance(session_id)
        
        # Ejecutar pruebas de carga concurrente
        self.test_concurrent_load()
        
        # Generar reporte final
        report = self.generate_api_performance_report()
        
        print("\n" + "=" * 60)
        print("PRUEBAS DE RENDIMIENTO DE API COMPLETADAS")
        print("Reporte guardado en: api_performance_report.json")
        
        return report

def main():
    """Función principal para ejecutar las pruebas de rendimiento de API"""
    tester = APIPerformanceTester()
    report = tester.run_all_api_performance_tests()
    
    if report is None:
        print("❌ No se pudieron ejecutar las pruebas debido a problemas de conectividad")
        return None
    
    # Validar que todos los endpoints cumplan con los requisitos
    failed_endpoints = []
    for endpoint, stats in report['endpoint_statistics'].items():
        if stats['max_response_time'] >= 5.0:
            failed_endpoints.append(f"{endpoint} (tiempo: {stats['max_response_time']}s)")
        if stats['max_memory_usage'] >= 200.0:
            failed_endpoints.append(f"{endpoint} (memoria: {stats['max_memory_usage']}MB)")
    
    if failed_endpoints:
        print(f"\n⚠️  ENDPOINTS QUE NO CUMPLEN REQUISITOS:")
        for endpoint in failed_endpoints:
            print(f"   - {endpoint}")
    else:
        print(f"\n✅ TODOS LOS ENDPOINTS CUMPLEN CON LOS REQUISITOS DE RENDIMIENTO")
    
    return report

if __name__ == "__main__":
    main()