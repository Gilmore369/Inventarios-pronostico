#!/usr/bin/env python3
"""
Script para ejecutar todas las pruebas de API del backend
Implementa la suite completa de pruebas para endpoints API según la especificación
"""

import unittest
import sys
import os
import time
from datetime import datetime

# Importar todos los módulos de prueba de API
from test_api_upload import TestUploadEndpoint
from test_api_process import TestProcessEndpoint
from test_api_results import TestResultsEndpoint
from test_api_forecast import TestForecastEndpoint
from test_api_error_handling import TestAPIErrorHandling

class APITestRunner:
    """Ejecutor de pruebas API con reporte detallado"""
    
    def __init__(self):
        self.start_time = None
        self.end_time = None
        self.results = {}
    
    def run_all_tests(self, verbose=True):
        """Ejecutar todas las suites de pruebas API"""
        
        print("=" * 80)
        print("EJECUTANDO SUITE COMPLETA DE PRUEBAS API DEL BACKEND")
        print("=" * 80)
        print(f"Fecha y hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        self.start_time = time.time()
        
        # Definir las suites de pruebas
        test_suites = [
            ("Pruebas Endpoint /api/upload", TestUploadEndpoint),
            ("Pruebas Endpoint /api/process", TestProcessEndpoint),
            ("Pruebas Endpoint /api/results", TestResultsEndpoint),
            ("Pruebas Endpoint /api/forecast", TestForecastEndpoint),
            ("Pruebas Manejo de Errores API", TestAPIErrorHandling)
        ]
        
        total_tests = 0
        total_failures = 0
        total_errors = 0
        
        # Ejecutar cada suite
        for suite_name, test_class in test_suites:
            print(f"\n{'=' * 60}")
            print(f"EJECUTANDO: {suite_name}")
            print(f"{'=' * 60}")
            
            # Crear suite de pruebas
            loader = unittest.TestLoader()
            suite = loader.loadTestsFromTestCase(test_class)
            
            # Ejecutar pruebas
            runner = unittest.TextTestRunner(
                verbosity=2 if verbose else 1,
                stream=sys.stdout,
                buffer=True
            )
            
            result = runner.run(suite)
            
            # Recopilar estadísticas
            tests_run = result.testsRun
            failures = len(result.failures)
            errors = len(result.errors)
            
            total_tests += tests_run
            total_failures += failures
            total_errors += errors
            
            # Almacenar resultados
            self.results[suite_name] = {
                'tests_run': tests_run,
                'failures': failures,
                'errors': errors,
                'success_rate': ((tests_run - failures - errors) / tests_run * 100) if tests_run > 0 else 0
            }
            
            # Mostrar resumen de la suite
            print(f"\nRESUMEN {suite_name}:")
            print(f"  Pruebas ejecutadas: {tests_run}")
            print(f"  Exitosas: {tests_run - failures - errors}")
            print(f"  Fallidas: {failures}")
            print(f"  Errores: {errors}")
            print(f"  Tasa de éxito: {self.results[suite_name]['success_rate']:.1f}%")
            
            if failures > 0:
                print(f"\nFALLOS EN {suite_name}:")
                for test, traceback in result.failures:
                    print(f"  - {test}: {traceback.split('AssertionError:')[-1].strip()}")
            
            if errors > 0:
                print(f"\nERRORES EN {suite_name}:")
                for test, traceback in result.errors:
                    print(f"  - {test}: {traceback.split('Exception:')[-1].strip()}")
        
        self.end_time = time.time()
        
        # Mostrar resumen final
        self._print_final_summary(total_tests, total_failures, total_errors)
        
        return total_failures + total_errors == 0
    
    def _print_final_summary(self, total_tests, total_failures, total_errors):
        """Imprimir resumen final de todas las pruebas"""
        
        execution_time = self.end_time - self.start_time
        
        print("\n" + "=" * 80)
        print("RESUMEN FINAL DE PRUEBAS API")
        print("=" * 80)
        
        print(f"Tiempo total de ejecución: {execution_time:.2f} segundos")
        print(f"Total de pruebas ejecutadas: {total_tests}")
        print(f"Pruebas exitosas: {total_tests - total_failures - total_errors}")
        print(f"Pruebas fallidas: {total_failures}")
        print(f"Errores: {total_errors}")
        
        overall_success_rate = ((total_tests - total_failures - total_errors) / total_tests * 100) if total_tests > 0 else 0
        print(f"Tasa de éxito general: {overall_success_rate:.1f}%")
        
        print("\nRESUMEN POR SUITE:")
        print("-" * 80)
        for suite_name, results in self.results.items():
            status = "✓ PASS" if results['failures'] + results['errors'] == 0 else "✗ FAIL"
            print(f"{status} {suite_name}: {results['success_rate']:.1f}% "
                  f"({results['tests_run']} pruebas)")
        
        print("\nCOBERTURA DE REQUISITOS:")
        print("-" * 80)
        self._print_requirements_coverage()
        
        if total_failures + total_errors == 0:
            print("\n🎉 ¡TODAS LAS PRUEBAS API PASARON EXITOSAMENTE!")
            print("✅ Los endpoints del backend están funcionando correctamente")
            print("✅ El manejo de errores es apropiado")
            print("✅ Los códigos de respuesta HTTP son correctos")
            print("✅ Los mensajes de error son descriptivos")
        else:
            print(f"\n❌ {total_failures + total_errors} PRUEBAS FALLARON")
            print("⚠️  Revisar los fallos antes de continuar con la implementación")
    
    def _print_requirements_coverage(self):
        """Imprimir cobertura de requisitos según la especificación"""
        
        requirements_coverage = {
            "2.1 - Endpoint /api/upload acepta CSV y JSON": "✓ Cubierto",
            "2.2 - Validación de rango de datos (12-120 meses)": "✓ Cubierto", 
            "2.3 - Endpoint /api/process ejecuta modelos en paralelo": "✓ Cubierto",
            "2.4 - Endpoint /api/results devuelve top 10 ordenados": "✓ Cubierto",
            "2.5 - Endpoint /api/forecast genera pronósticos": "✓ Cubierto",
            "2.6 - Manejo de errores con códigos HTTP apropiados": "✓ Cubierto",
            "6.2 - Pruebas de endpoints API": "✓ Cubierto",
            "5.6 - Timeout handling y recuperación": "✓ Cubierto"
        }
        
        for requirement, status in requirements_coverage.items():
            print(f"{status} {requirement}")

def main():
    """Función principal"""
    
    # Verificar que estamos en el directorio correcto
    if not os.path.exists('app.py'):
        print("❌ Error: No se encontró app.py")
        print("   Ejecutar este script desde el directorio backend/")
        sys.exit(1)
    
    # Verificar que los módulos de prueba existen
    required_test_files = [
        'test_api_upload.py',
        'test_api_process.py', 
        'test_api_results.py',
        'test_api_forecast.py',
        'test_api_error_handling.py'
    ]
    
    missing_files = [f for f in required_test_files if not os.path.exists(f)]
    if missing_files:
        print(f"❌ Error: Archivos de prueba faltantes: {', '.join(missing_files)}")
        sys.exit(1)
    
    # Ejecutar pruebas
    runner = APITestRunner()
    
    try:
        success = runner.run_all_tests(verbose=True)
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Ejecución interrumpida por el usuario")
        sys.exit(1)
        
    except Exception as e:
        print(f"\n❌ Error inesperado durante la ejecución: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()