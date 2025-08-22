"""
Pruebas de rendimiento para modelos de pronóstico
Valida que todos los modelos completen en menos de 30 segundos
y mide uso de memoria durante la ejecución
"""

import time
import psutil
import os
import numpy as np
import pandas as pd
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from models import ForecastModels
from test_data_generator import TestDataGenerator
import json
from datetime import datetime

class ModelPerformanceTester:
    def __init__(self):
        self.forecast_models = ForecastModels()
        self.data_generator = TestDataGenerator()
        self.performance_threshold = 30.0  # segundos
        self.memory_threshold_mb = 500  # MB
        self.results = []
        
    def measure_memory_usage(self):
        """Mide el uso de memoria del proceso actual"""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024  # MB
    
    def generate_test_datasets(self):
        """Genera datasets de prueba de diferentes tamaños"""
        datasets = {}
        
        # Datasets de 12, 24, 60, 120 meses
        sizes = [12, 24, 60, 120]
        
        for size in sizes:
            datasets[f'trend_{size}'] = self.data_generator.generate_trend_data(size, 'linear', 0.5)
            
            # Ajustar período estacional según el tamaño del dataset
            seasonal_period = min(12, size // 2) if size >= 24 else 4
            datasets[f'seasonal_{size}'] = self.data_generator.generate_seasonal_data(size, seasonal_period)
            
            datasets[f'stationary_{size}'] = self.data_generator.generate_stationary_data(size, 0.1)
            
            # Solo generar datos complejos si el tamaño es suficiente
            if size >= 24:
                datasets[f'complex_{size}'] = self.data_generator.generate_complex_pattern_data(size)['data']
            else:
                # Para datasets pequeños, usar datos con tendencia y ruido
                datasets[f'complex_{size}'] = self.data_generator.generate_trend_data(size, 'linear', 0.3, 100.0, 0.2)
            
        return datasets
    
    def test_single_model_performance(self, model_name, model_func, data, data_name):
        """Prueba el rendimiento de un modelo individual"""
        print(f"Probando {model_name} con dataset {data_name} ({len(data)} puntos)")
        
        # Medir memoria inicial
        memory_before = self.measure_memory_usage()
        
        # Medir tiempo de ejecución
        start_time = time.time()
        
        try:
            result = model_func(data)
            execution_time = time.time() - start_time
            
            # Medir memoria después
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            # Validar resultado
            success = result is not None and 'metrics' in result
            
            test_result = {
                'model_name': model_name,
                'dataset': data_name,
                'dataset_size': len(data),
                'execution_time': round(execution_time, 3),
                'memory_used_mb': round(memory_used, 2),
                'success': success,
                'within_time_threshold': execution_time < self.performance_threshold,
                'within_memory_threshold': memory_used < self.memory_threshold_mb,
                'timestamp': datetime.now().isoformat()
            }
            
            if success:
                test_result['metrics'] = result['metrics']
                test_result['parameters'] = result.get('parameters', {})
            else:
                test_result['error'] = 'Model returned None or invalid result'
            
            return test_result
            
        except Exception as e:
            execution_time = time.time() - start_time
            memory_after = self.measure_memory_usage()
            memory_used = memory_after - memory_before
            
            return {
                'model_name': model_name,
                'dataset': data_name,
                'dataset_size': len(data),
                'execution_time': round(execution_time, 3),
                'memory_used_mb': round(memory_used, 2),
                'success': False,
                'within_time_threshold': execution_time < self.performance_threshold,
                'within_memory_threshold': memory_used < self.memory_threshold_mb,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def test_all_models_performance(self):
        """Prueba el rendimiento de todos los modelos con diferentes datasets"""
        print("=== INICIANDO PRUEBAS DE RENDIMIENTO DE MODELOS ===")
        
        # Generar datasets de prueba
        datasets = self.generate_test_datasets()
        
        # Probar cada modelo con cada dataset
        for dataset_name, data in datasets.items():
            print(f"\n--- Probando dataset: {dataset_name} ---")
            
            for model_name, model_func in self.forecast_models.models.items():
                result = self.test_single_model_performance(
                    model_name, model_func, data, dataset_name
                )
                self.results.append(result)
                
                # Mostrar resultado inmediato
                status = "✓" if result['success'] and result['within_time_threshold'] else "✗"
                print(f"{status} {model_name}: {result['execution_time']}s, {result['memory_used_mb']}MB")
    
    def test_parallel_processing_efficiency(self):
        """Prueba la eficiencia del procesamiento paralelo"""
        print("\n=== PROBANDO EFICIENCIA DE PROCESAMIENTO PARALELO ===")
        
        # Generar dataset de prueba
        test_data = self.data_generator.generate_complex_pattern_data(60)['data']
        
        # Prueba secuencial
        start_time = time.time()
        sequential_results = []
        for model_name, model_func in self.forecast_models.models.items():
            try:
                result = model_func(test_data)
                sequential_results.append(result)
            except:
                pass
        sequential_time = time.time() - start_time
        
        # Prueba paralela
        start_time = time.time()
        parallel_results = []
        
        def run_model(model_item):
            model_name, model_func = model_item
            try:
                return model_func(test_data)
            except:
                return None
        
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = [executor.submit(run_model, item) for item in self.forecast_models.models.items()]
            for future in as_completed(futures):
                result = future.result()
                if result:
                    parallel_results.append(result)
        
        parallel_time = time.time() - start_time
        
        # Calcular eficiencia
        efficiency = (sequential_time - parallel_time) / sequential_time * 100
        
        parallel_result = {
            'test_type': 'parallel_processing',
            'sequential_time': round(sequential_time, 3),
            'parallel_time': round(parallel_time, 3),
            'efficiency_improvement': round(efficiency, 2),
            'models_completed_sequential': len(sequential_results),
            'models_completed_parallel': len(parallel_results),
            'timestamp': datetime.now().isoformat()
        }
        
        self.results.append(parallel_result)
        
        print(f"Tiempo secuencial: {sequential_time:.3f}s")
        print(f"Tiempo paralelo: {parallel_time:.3f}s")
        print(f"Mejora de eficiencia: {efficiency:.2f}%")
        
        return parallel_result
    
    def test_memory_stress(self):
        """Prueba el comportamiento con datasets grandes para validar uso de memoria"""
        print("\n=== PROBANDO USO DE MEMORIA CON DATASETS GRANDES ===")
        
        # Generar dataset grande (120 meses con múltiples características)
        large_data = self.data_generator.generate_complex_pattern_data(120)['data']
        
        memory_results = []
        
        for model_name, model_func in self.forecast_models.models.items():
            print(f"Probando memoria para {model_name}")
            
            # Medir memoria antes, durante y después
            memory_before = self.measure_memory_usage()
            
            try:
                result = model_func(large_data)
                memory_after = self.measure_memory_usage()
                memory_peak = memory_after  # Simplificado - en producción usar memory_profiler
                
                memory_result = {
                    'model_name': model_name,
                    'memory_before_mb': round(memory_before, 2),
                    'memory_after_mb': round(memory_after, 2),
                    'memory_peak_mb': round(memory_peak, 2),
                    'memory_increase_mb': round(memory_after - memory_before, 2),
                    'within_memory_threshold': (memory_after - memory_before) < self.memory_threshold_mb,
                    'success': result is not None,
                    'timestamp': datetime.now().isoformat()
                }
                
                memory_results.append(memory_result)
                self.results.append(memory_result)
                
                print(f"  Memoria usada: {memory_result['memory_increase_mb']}MB")
                
            except Exception as e:
                memory_after = self.measure_memory_usage()
                memory_result = {
                    'model_name': model_name,
                    'memory_before_mb': round(memory_before, 2),
                    'memory_after_mb': round(memory_after, 2),
                    'memory_increase_mb': round(memory_after - memory_before, 2),
                    'within_memory_threshold': False,
                    'success': False,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                
                memory_results.append(memory_result)
                self.results.append(memory_result)
                
                print(f"  Error: {str(e)}")
        
        return memory_results
    
    def generate_performance_report(self):
        """Genera un reporte completo de rendimiento"""
        print("\n=== GENERANDO REPORTE DE RENDIMIENTO ===")
        
        # Estadísticas generales
        model_tests = [r for r in self.results if 'model_name' in r and 'dataset' in r]
        
        total_tests = len(model_tests)
        successful_tests = len([r for r in model_tests if r['success']])
        within_time_threshold = len([r for r in model_tests if r.get('within_time_threshold', False)])
        within_memory_threshold = len([r for r in model_tests if r.get('within_memory_threshold', False)])
        
        # Estadísticas por modelo
        model_stats = {}
        for result in model_tests:
            model_name = result['model_name']
            if model_name not in model_stats:
                model_stats[model_name] = {
                    'total_tests': 0,
                    'successful_tests': 0,
                    'avg_execution_time': 0,
                    'max_execution_time': 0,
                    'avg_memory_usage': 0,
                    'max_memory_usage': 0,
                    'execution_times': [],
                    'memory_usages': []
                }
            
            stats = model_stats[model_name]
            stats['total_tests'] += 1
            
            if result['success']:
                stats['successful_tests'] += 1
            
            stats['execution_times'].append(result['execution_time'])
            stats['memory_usages'].append(result['memory_used_mb'])
        
        # Calcular promedios y máximos
        for model_name, stats in model_stats.items():
            if stats['execution_times']:
                stats['avg_execution_time'] = round(np.mean(stats['execution_times']), 3)
                stats['max_execution_time'] = round(np.max(stats['execution_times']), 3)
            
            if stats['memory_usages']:
                stats['avg_memory_usage'] = round(np.mean(stats['memory_usages']), 2)
                stats['max_memory_usage'] = round(np.max(stats['memory_usages']), 2)
            
            # Limpiar listas para el reporte JSON
            del stats['execution_times']
            del stats['memory_usages']
        
        report = {
            'summary': {
                'total_tests': total_tests,
                'successful_tests': successful_tests,
                'success_rate': round(successful_tests / total_tests * 100, 2) if total_tests > 0 else 0,
                'within_time_threshold': within_time_threshold,
                'within_memory_threshold': within_memory_threshold,
                'time_compliance_rate': round(within_time_threshold / total_tests * 100, 2) if total_tests > 0 else 0,
                'memory_compliance_rate': round(within_memory_threshold / total_tests * 100, 2) if total_tests > 0 else 0
            },
            'model_statistics': model_stats,
            'detailed_results': self.results,
            'thresholds': {
                'max_execution_time_seconds': self.performance_threshold,
                'max_memory_usage_mb': self.memory_threshold_mb
            },
            'timestamp': datetime.now().isoformat()
        }
        
        # Guardar reporte
        with open('model_performance_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # Mostrar resumen
        print(f"Total de pruebas: {total_tests}")
        print(f"Pruebas exitosas: {successful_tests} ({report['summary']['success_rate']}%)")
        print(f"Dentro del límite de tiempo: {within_time_threshold} ({report['summary']['time_compliance_rate']}%)")
        print(f"Dentro del límite de memoria: {within_memory_threshold} ({report['summary']['memory_compliance_rate']}%)")
        
        print("\nRendimiento por modelo:")
        for model_name, stats in model_stats.items():
            print(f"  {model_name}:")
            print(f"    Tiempo promedio: {stats['avg_execution_time']}s (máx: {stats['max_execution_time']}s)")
            print(f"    Memoria promedio: {stats['avg_memory_usage']}MB (máx: {stats['max_memory_usage']}MB)")
            print(f"    Tasa de éxito: {stats['successful_tests']}/{stats['total_tests']}")
        
        return report
    
    def run_all_performance_tests(self):
        """Ejecuta todas las pruebas de rendimiento"""
        print("INICIANDO SUITE COMPLETA DE PRUEBAS DE RENDIMIENTO DE MODELOS")
        print("=" * 60)
        
        # Limpiar resultados previos
        self.results = []
        
        # Ejecutar todas las pruebas
        self.test_all_models_performance()
        self.test_parallel_processing_efficiency()
        self.test_memory_stress()
        
        # Generar reporte final
        report = self.generate_performance_report()
        
        print("\n" + "=" * 60)
        print("PRUEBAS DE RENDIMIENTO COMPLETADAS")
        print("Reporte guardado en: model_performance_report.json")
        
        return report

def main():
    """Función principal para ejecutar las pruebas de rendimiento"""
    tester = ModelPerformanceTester()
    report = tester.run_all_performance_tests()
    
    # Validar que todos los modelos cumplan con los requisitos
    failed_models = []
    for model_name, stats in report['model_statistics'].items():
        if stats['max_execution_time'] >= 30.0:
            failed_models.append(f"{model_name} (tiempo: {stats['max_execution_time']}s)")
        if stats['max_memory_usage'] >= 500.0:
            failed_models.append(f"{model_name} (memoria: {stats['max_memory_usage']}MB)")
    
    if failed_models:
        print(f"\n⚠️  MODELOS QUE NO CUMPLEN REQUISITOS:")
        for model in failed_models:
            print(f"   - {model}")
    else:
        print(f"\n✅ TODOS LOS MODELOS CUMPLEN CON LOS REQUISITOS DE RENDIMIENTO")
    
    return report

if __name__ == "__main__":
    main()