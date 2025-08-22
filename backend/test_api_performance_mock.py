"""
Pruebas de rendimiento simuladas para endpoints API del backend
Simula el comportamiento de la API para validar métricas de rendimiento
sin necesidad de servidor en ejecución
"""

import time
import json
import pandas as pd
import numpy as np
from datetime import datetime
import psutil
import os
from test_data_generator import TestDataGenerator
from models import ForecastModels

class MockAPIPerformanceTester:
    def __init__(self):
        self.data_generator = TestDataGenerator()
        self.forecast_models = ForecastModels()
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
    
    def simulate_upload_endpoint(self, test_data):
        """Simula el comportamiento del endpoint /api/upload"""
        memory_before = self.measure_memory_usage()
        start_time = time.time()
        
        try:
            # Simular validación de datos
            df = pd.DataFrame(test_data)
            
            # Validaciones como en el endpoint real
            if len(df) < 12 or len(df) > 120:
                raise ValueError('Se requieren entre 12 y 120 meses de datos')
            
            if 'demand' not in df.columns:
                raise ValueError('El dataset debe contener una columna "demand"')
            
            # Simular generación de session_id
            session_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': True,
                'response_time': response_time,
                'memory_used': memory_used,
                'session_id': session_id,
                'status_code': 200
            }
            
        except Exception as e:
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': False,
                'response_time': response_time,
                'memory_used': memory_used,
                'error': str(e),
                'status_code': 400
            }
    
    def simulate_process_endpoint(self, session_id, test_data):
        """Simula el comportamiento del endpoint /api/process"""
        memory_before = self.measure_memory_usage()
        start_time = time.time()
        
        try:
            # Simular validación de session_id
            if not session_id:
                raise ValueError('Session ID requerido')
            
            # El endpoint real solo inicia el procesamiento, no lo ejecuta
            # Simular respuesta inmediata
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': True,
                'response_time': response_time,
                'memory_used': memory_used,
                'status_code': 200
            }
            
        except Exception as e:
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': False,
                'response_time': response_time,
                'memory_used': memory_used,
                'error': str(e),
                'status_code': 400
            }
    
    def simulate_model_processing(self, test_data):
        """Simula el procesamiento real de modelos (que ocurre en background)"""
        memory_before = self.measure_memory_usage()
        start_time = time.time()
        
        try:
            # Extraer datos de demanda
            df = pd.DataFrame(test_data)
            demand_data = df['demand'].values
            
            # Ejecutar todos los modelos como en el backend real
            results = self.forecast_models.run_all_models(demand_data)
            
            # Ordenar por MAPE
            sorted_results = sorted(results, key=lambda x: x['metrics']['mape'])
            
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': True,
                'response_time': response_time,
                'memory_used': memory_used,
                'results': sorted_results,
                'status_code': 200
            }
            
        except Exception as e:
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': False,
                'response_time': response_time,
                'memory_used': memory_used,
                'error': str(e),
                'status_code': 500
            }
    
    def simulate_results_endpoint(self, session_id, processing_results):
        """Simula el comportamiento del endpoint /api/results"""
        memory_before = self.measure_memory_usage()
        start_time = time.time()
        
        try:
            # Simular validación de session_id
            if not session_id:
                raise ValueError('Session ID requerido')
            
            # Simular recuperación de resultados (top 10)
            if processing_results and processing_results['success']:
                results = processing_results['results'][:10]
            else:
                results = []
            
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': True,
                'response_time': response_time,
                'memory_used': memory_used,
                'results_count': len(results),
                'status_code': 200
            }
            
        except Exception as e:
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': False,
                'response_time': response_time,
                'memory_used': memory_used,
                'error': str(e),
                'status_code': 400
            }
    
    def simulate_forecast_endpoint(self, session_id, test_data, model_name):
        """Simula el comportamiento del endpoint /api/forecast"""
        memory_before = self.measure_memory_usage()
        start_time = time.time()
        
        try:
            # Simular validación de session_id
            if not session_id:
                raise ValueError('Session ID requerido')
            
            # Extraer datos de demanda
            df = pd.DataFrame(test_data)
            demand_data = df['demand'].values
            
            # Generar pronóstico como en el backend real
            forecast = self.forecast_models.generate_forecast(model_name, demand_data, 12)
            
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': True,
                'response_time': response_time,
                'memory_used': memory_used,
                'forecast_length': len(forecast.get('forecast', [])),
                'status_code': 200
            }
            
        except Exception as e:
            response_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'success': False,
                'response_time': response_time,
                'memory_used': memory_used,
                'error': str(e),
                'status_code': 500
            }
    
    def test_upload_performance(self):
        """Prueba el rendimiento simulado del endpoint /api/upload"""
        print("=== PROBANDO RENDIMIENTO SIMULADO DE /api/upload ===")
        
        test_sizes = [12, 24, 60, 120]
        
        for size in test_sizes:
            print(f"Probando upload con {size} meses de datos")
            
            test_data = self.create_test_data(size)
            result = self.simulate_upload_endpoint(test_data)
            
            test_result = {
                'endpoint': '/api/upload',
                'method': 'POST',
                'dataset_size': size,
                'response_time': round(result['response_time'], 3),
                'memory_used_mb': round(result['memory_used'], 2),
                'status_code': result['status_code'],
                'success': result['success'],
                'within_time_threshold': result['response_time'] < self.response_time_threshold,
                'within_memory_threshold': result['memory_used'] < self.memory_threshold_mb,
                'timestamp': datetime.now().isoformat()
            }
            
            if result['success']:
                test_result['session_id'] = result['session_id']
            else:
                test_result['error'] = result['error']
            
            self.results.append(test_result)
            
            status = "✓" if result['success'] and test_result['within_time_threshold'] else "✗"
            print(f"  {status} {size} meses: {result['response_time']:.3f}s, {result['memory_used']:.2f}MB")
    
    def test_process_performance(self):
        """Prueba el rendimiento simulado del endpoint /api/process"""
        print("=== PROBANDO RENDIMIENTO SIMULADO DE /api/process ===")
        
        test_data = self.create_test_data(24)
        session_id = "test_session_123"
        
        result = self.simulate_process_endpoint(session_id, test_data)
        
        test_result = {
            'endpoint': '/api/process',
            'method': 'POST',
            'session_id': session_id,
            'response_time': round(result['response_time'], 3),
            'memory_used_mb': round(result['memory_used'], 2),
            'status_code': result['status_code'],
            'success': result['success'],
            'within_time_threshold': result['response_time'] < self.response_time_threshold,
            'within_memory_threshold': result['memory_used'] < self.memory_threshold_mb,
            'timestamp': datetime.now().isoformat()
        }
        
        if not result['success']:
            test_result['error'] = result['error']
        
        self.results.append(test_result)
        
        status = "✓" if result['success'] and test_result['within_time_threshold'] else "✗"
        print(f"  {status} Process: {result['response_time']:.3f}s, {result['memory_used']:.2f}MB")
    
    def test_model_processing_performance(self):
        """Prueba el rendimiento del procesamiento real de modelos"""
        print("=== PROBANDO RENDIMIENTO DE PROCESAMIENTO DE MODELOS ===")
        
        test_sizes = [12, 24, 60, 120]
        
        for size in test_sizes:
            print(f"Probando procesamiento con {size} meses de datos")
            
            test_data = self.create_test_data(size)
            result = self.simulate_model_processing(test_data)
            
            test_result = {
                'operation': 'model_processing',
                'dataset_size': size,
                'response_time': round(result['response_time'], 3),
                'memory_used_mb': round(result['memory_used'], 2),
                'success': result['success'],
                'within_time_threshold': result['response_time'] < self.response_time_threshold,
                'within_memory_threshold': result['memory_used'] < self.memory_threshold_mb,
                'timestamp': datetime.now().isoformat()
            }
            
            if result['success']:
                test_result['models_completed'] = len(result['results'])
            else:
                test_result['error'] = result['error']
            
            self.results.append(test_result)
            
            status = "✓" if result['success'] and test_result['within_time_threshold'] else "✗"
            print(f"  {status} {size} meses: {result['response_time']:.3f}s, {result['memory_used']:.2f}MB")
    
    def test_results_performance(self):
        """Prueba el rendimiento simulado del endpoint /api/results"""
        print("=== PROBANDO RENDIMIENTO SIMULADO DE /api/results ===")
        
        test_data = self.create_test_data(24)
        session_id = "test_session_123"
        
        # Simular procesamiento previo
        processing_result = self.simulate_model_processing(test_data)
        
        # Probar endpoint de resultados
        result = self.simulate_results_endpoint(session_id, processing_result)
        
        test_result = {
            'endpoint': '/api/results',
            'method': 'GET',
            'session_id': session_id,
            'response_time': round(result['response_time'], 3),
            'memory_used_mb': round(result['memory_used'], 2),
            'status_code': result['status_code'],
            'success': result['success'],
            'within_time_threshold': result['response_time'] < self.response_time_threshold,
            'within_memory_threshold': result['memory_used'] < self.memory_threshold_mb,
            'timestamp': datetime.now().isoformat()
        }
        
        if result['success']:
            test_result['results_count'] = result['results_count']
        else:
            test_result['error'] = result['error']
        
        self.results.append(test_result)
        
        status = "✓" if result['success'] and test_result['within_time_threshold'] else "✗"
        print(f"  {status} Results: {result['response_time']:.3f}s, {result['memory_used']:.2f}MB")
    
    def test_forecast_performance(self):
        """Prueba el rendimiento simulado del endpoint /api/forecast"""
        print("=== PROBANDO RENDIMIENTO SIMULADO DE /api/forecast ===")
        
        test_data = self.create_test_data(24)
        session_id = "test_session_123"
        
        models_to_test = [
            'Media Móvil Simple (SMA)',
            'Suavizado Exponencial Simple (SES)',
            'Regresión Lineal'
        ]
        
        for model_name in models_to_test:
            print(f"Probando forecast con modelo: {model_name}")
            
            result = self.simulate_forecast_endpoint(session_id, test_data, model_name)
            
            test_result = {
                'endpoint': '/api/forecast',
                'method': 'POST',
                'session_id': session_id,
                'model_name': model_name,
                'response_time': round(result['response_time'], 3),
                'memory_used_mb': round(result['memory_used'], 2),
                'status_code': result['status_code'],
                'success': result['success'],
                'within_time_threshold': result['response_time'] < self.response_time_threshold,
                'within_memory_threshold': result['memory_used'] < self.memory_threshold_mb,
                'timestamp': datetime.now().isoformat()
            }
            
            if result['success']:
                test_result['forecast_length'] = result['forecast_length']
            else:
                test_result['error'] = result['error']
            
            self.results.append(test_result)
            
            status = "✓" if result['success'] and test_result['within_time_threshold'] else "✗"
            print(f"  {status} {model_name}: {result['response_time']:.3f}s, {result['memory_used']:.2f}MB")
    
    def generate_api_performance_report(self):
        """Genera un reporte completo de rendimiento de API simulado"""
        print("\n=== GENERANDO REPORTE DE RENDIMIENTO DE API SIMULADO ===")
        
        # Filtrar resultados por tipo
        endpoint_tests = [r for r in self.results if 'endpoint' in r]
        processing_tests = [r for r in self.results if r.get('operation') == 'model_processing']
        
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
        
        # Estadísticas de procesamiento de modelos
        processing_stats = {}
        if processing_tests:
            processing_stats = {
                'total_tests': len(processing_tests),
                'successful_tests': len([r for r in processing_tests if r['success']]),
                'avg_processing_time': round(np.mean([r['response_time'] for r in processing_tests]), 3),
                'max_processing_time': round(np.max([r['response_time'] for r in processing_tests]), 3),
                'avg_memory_usage': round(np.mean([r['memory_used_mb'] for r in processing_tests]), 2),
                'max_memory_usage': round(np.max([r['memory_used_mb'] for r in processing_tests]), 2)
            }
        
        # Estadísticas generales
        total_tests = len(endpoint_tests)
        successful_tests = len([r for r in endpoint_tests if r['success']])
        within_time_threshold = len([r for r in endpoint_tests if r.get('within_time_threshold', False)])
        within_memory_threshold = len([r for r in endpoint_tests if r.get('within_memory_threshold', False)])
        
        report = {
            'summary': {
                'total_endpoint_tests': total_tests,
                'successful_endpoint_tests': successful_tests,
                'success_rate': round(successful_tests / total_tests * 100, 2) if total_tests > 0 else 0,
                'within_time_threshold': within_time_threshold,
                'within_memory_threshold': within_memory_threshold,
                'time_compliance_rate': round(within_time_threshold / total_tests * 100, 2) if total_tests > 0 else 0,
                'memory_compliance_rate': round(within_memory_threshold / total_tests * 100, 2) if total_tests > 0 else 0
            },
            'endpoint_statistics': endpoint_stats,
            'model_processing_statistics': processing_stats,
            'detailed_results': self.results,
            'thresholds': {
                'max_response_time_seconds': self.response_time_threshold,
                'max_memory_usage_mb': self.memory_threshold_mb
            },
            'test_type': 'simulated_api_performance',
            'timestamp': datetime.now().isoformat()
        }
        
        # Guardar reporte
        with open('api_performance_report_simulated.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # Mostrar resumen
        print(f"Total de pruebas de endpoints: {total_tests}")
        print(f"Pruebas exitosas: {successful_tests} ({report['summary']['success_rate']}%)")
        print(f"Dentro del límite de tiempo: {within_time_threshold} ({report['summary']['time_compliance_rate']}%)")
        print(f"Dentro del límite de memoria: {within_memory_threshold} ({report['summary']['memory_compliance_rate']}%)")
        
        print("\nRendimiento por endpoint:")
        for endpoint, stats in endpoint_stats.items():
            print(f"  {endpoint}:")
            print(f"    Tiempo promedio: {stats['avg_response_time']}s (máx: {stats['max_response_time']}s)")
            print(f"    Memoria promedio: {stats['avg_memory_usage']}MB (máx: {stats['max_memory_usage']}MB)")
            print(f"    Tasa de éxito: {stats['successful_tests']}/{stats['total_tests']}")
        
        if processing_stats:
            print("\nRendimiento de procesamiento de modelos:")
            print(f"  Tiempo promedio: {processing_stats['avg_processing_time']}s (máx: {processing_stats['max_processing_time']}s)")
            print(f"  Memoria promedio: {processing_stats['avg_memory_usage']}MB (máx: {processing_stats['max_memory_usage']}MB)")
            print(f"  Tasa de éxito: {processing_stats['successful_tests']}/{processing_stats['total_tests']}")
        
        return report
    
    def run_all_api_performance_tests(self):
        """Ejecuta todas las pruebas de rendimiento de API simuladas"""
        print("INICIANDO SUITE COMPLETA DE PRUEBAS DE RENDIMIENTO DE API SIMULADAS")
        print("=" * 70)
        
        # Limpiar resultados previos
        self.results = []
        
        # Ejecutar todas las pruebas
        self.test_upload_performance()
        self.test_process_performance()
        self.test_model_processing_performance()
        self.test_results_performance()
        self.test_forecast_performance()
        
        # Generar reporte final
        report = self.generate_api_performance_report()
        
        print("\n" + "=" * 70)
        print("PRUEBAS DE RENDIMIENTO DE API SIMULADAS COMPLETADAS")
        print("Reporte guardado en: api_performance_report_simulated.json")
        
        return report

def main():
    """Función principal para ejecutar las pruebas de rendimiento de API simuladas"""
    tester = MockAPIPerformanceTester()
    report = tester.run_all_api_performance_tests()
    
    # Validar que todos los endpoints cumplan con los requisitos
    failed_endpoints = []
    for endpoint, stats in report['endpoint_statistics'].items():
        if stats['max_response_time'] >= 5.0:
            failed_endpoints.append(f"{endpoint} (tiempo: {stats['max_response_time']}s)")
        if stats['max_memory_usage'] >= 200.0:
            failed_endpoints.append(f"{endpoint} (memoria: {stats['max_memory_usage']}MB)")
    
    # Validar procesamiento de modelos
    processing_stats = report.get('model_processing_statistics', {})
    if processing_stats.get('max_processing_time', 0) >= 30.0:
        failed_endpoints.append(f"Model Processing (tiempo: {processing_stats['max_processing_time']}s)")
    
    if failed_endpoints:
        print(f"\n⚠️  COMPONENTES QUE NO CUMPLEN REQUISITOS:")
        for endpoint in failed_endpoints:
            print(f"   - {endpoint}")
    else:
        print(f"\n✅ TODOS LOS ENDPOINTS Y PROCESAMIENTO CUMPLEN CON LOS REQUISITOS DE RENDIMIENTO")
    
    return report

if __name__ == "__main__":
    main()