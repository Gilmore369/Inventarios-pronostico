"""
Script para ejecutar todas las pruebas de integración end-to-end
Incluye: flujo completo, comunicación API, y manejo de diferentes tipos de datos
"""

import sys
import subprocess
import time
import requests
import json
from datetime import datetime

def check_backend_availability(base_url="http://localhost:5000", max_attempts=10):
    """
    Verifica que el backend esté disponible antes de ejecutar las pruebas
    """
    print(f"Verificando disponibilidad del backend en {base_url}...")
    
    for attempt in range(max_attempts):
        try:
            # Intentar hacer una request simple para verificar conectividad
            response = requests.get(f"{base_url}/api/results?session_id=test", timeout=5)
            # Cualquier respuesta (incluso 404) indica que el servidor está funcionando
            print(f"✓ Backend disponible (intento {attempt + 1})")
            return True
        except requests.exceptions.ConnectionError:
            print(f"✗ Backend no disponible (intento {attempt + 1}/{max_attempts})")
            if attempt < max_attempts - 1:
                time.sleep(2)
        except Exception as e:
            print(f"✗ Error verificando backend: {str(e)}")
            if attempt < max_attempts - 1:
                time.sleep(2)
    
    return False

def run_test_file(test_file, description):
    """
    Ejecuta un archivo de pruebas específico usando pytest
    """
    print(f"\n{'='*60}")
    print(f"EJECUTANDO: {description}")
    print(f"Archivo: {test_file}")
    print(f"{'='*60}")
    
    try:
        # Ejecutar pytest con verbose output
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            test_file, 
            "-v",  # verbose
            "--tb=short",  # traceback corto
            "--no-header",  # sin header de pytest
            "--disable-warnings"  # deshabilitar warnings
        ], capture_output=True, text=True, timeout=300)  # 5 minutos timeout
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        if result.returncode == 0:
            print(f"✓ {description} - COMPLETADO EXITOSAMENTE")
            return True
        else:
            print(f"✗ {description} - FALLÓ (código de salida: {result.returncode})")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"✗ {description} - TIMEOUT (>5 minutos)")
        return False
    except Exception as e:
        print(f"✗ {description} - ERROR: {str(e)}")
        return False

def run_individual_test_methods():
    """
    Ejecuta métodos de prueba individuales para debugging más granular
    """
    print(f"\n{'='*60}")
    print("EJECUTANDO PRUEBAS INDIVIDUALES PARA DEBUGGING")
    print(f"{'='*60}")
    
    # Importar y ejecutar tests individuales
    try:
        from test_e2e_integration import TestE2EIntegration
        from test_api_communication import TestAPICommunication
        from test_data_types_integration import TestDataTypesIntegration
        
        # Test E2E básico
        print("\n--- Test E2E Básico ---")
        e2e_suite = TestE2EIntegration()
        e2e_suite.setup_method()
        try:
            e2e_suite.test_complete_flow_with_synthetic_data()
            print("✓ Flujo completo E2E - OK")
        except Exception as e:
            print(f"✗ Flujo completo E2E - ERROR: {str(e)}")
        finally:
            e2e_suite.teardown_method()
        
        # Test API Communication básico
        print("\n--- Test API Communication Básico ---")
        api_suite = TestAPICommunication()
        api_suite.setup_method()
        try:
            api_suite.test_api_response_format_upload()
            print("✓ Formato respuesta API - OK")
        except Exception as e:
            print(f"✗ Formato respuesta API - ERROR: {str(e)}")
        
        # Test Data Types básico
        print("\n--- Test Data Types Básico ---")
        data_suite = TestDataTypesIntegration()
        data_suite.setup_method()
        try:
            data_suite.test_trending_data_handling()
            print("✓ Manejo datos con tendencia - OK")
        except Exception as e:
            print(f"✗ Manejo datos con tendencia - ERROR: {str(e)}")
            
    except ImportError as e:
        print(f"✗ Error importando módulos de prueba: {str(e)}")
    except Exception as e:
        print(f"✗ Error ejecutando pruebas individuales: {str(e)}")

def generate_integration_test_report(results):
    """
    Genera un reporte de los resultados de las pruebas de integración
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    report = f"""
# REPORTE DE PRUEBAS DE INTEGRACIÓN END-TO-END
Generado: {timestamp}

## RESUMEN DE RESULTADOS

"""
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results if result['passed'])
    failed_tests = total_tests - passed_tests
    
    report += f"- Total de suites de pruebas: {total_tests}\n"
    report += f"- Pruebas exitosas: {passed_tests}\n"
    report += f"- Pruebas fallidas: {failed_tests}\n"
    report += f"- Porcentaje de éxito: {(passed_tests/total_tests)*100:.1f}%\n\n"
    
    report += "## DETALLE DE RESULTADOS\n\n"
    
    for result in results:
        status = "✓ EXITOSO" if result['passed'] else "✗ FALLIDO"
        report += f"### {result['description']}\n"
        report += f"- Estado: {status}\n"
        report += f"- Archivo: {result['file']}\n"
        if not result['passed']:
            report += f"- Notas: Revisar logs para detalles del error\n"
        report += "\n"
    
    report += "## RECOMENDACIONES\n\n"
    
    if failed_tests == 0:
        report += "✓ Todas las pruebas de integración pasaron exitosamente.\n"
        report += "✓ El sistema está listo para pruebas de rendimiento y usabilidad.\n"
    else:
        report += f"⚠ {failed_tests} suite(s) de pruebas fallaron.\n"
        report += "⚠ Revisar logs detallados y corregir problemas antes de continuar.\n"
        report += "⚠ Verificar que el backend esté ejecutándose correctamente.\n"
        report += "⚠ Verificar que todas las dependencias estén instaladas.\n"
    
    # Guardar reporte
    with open("integration_test_report.md", "w", encoding="utf-8") as f:
        f.write(report)
    
    print(f"\n📄 Reporte guardado en: integration_test_report.md")
    return report

def main():
    """
    Función principal para ejecutar todas las pruebas de integración
    """
    print("🚀 INICIANDO SUITE DE PRUEBAS DE INTEGRACIÓN END-TO-END")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Verificar disponibilidad del backend
    if not check_backend_availability():
        print("\n❌ ABORTANDO: Backend no disponible")
        print("💡 Asegúrate de que el backend esté ejecutándose en http://localhost:5000")
        print("💡 Puedes iniciarlo con: python app.py")
        return False
    
    # Definir pruebas a ejecutar
    test_suites = [
        {
            'file': 'test_e2e_integration.py',
            'description': 'Pruebas de flujo completo upload → process → results → forecast'
        },
        {
            'file': 'test_api_communication.py',
            'description': 'Pruebas de comunicación API y manejo de errores'
        },
        {
            'file': 'test_data_types_integration.py',
            'description': 'Pruebas de manejo de diferentes tipos de datos'
        }
    ]
    
    results = []
    
    # Ejecutar cada suite de pruebas
    for test_suite in test_suites:
        passed = run_test_file(test_suite['file'], test_suite['description'])
        results.append({
            'file': test_suite['file'],
            'description': test_suite['description'],
            'passed': passed
        })
    
    # Ejecutar pruebas individuales para debugging adicional
    print(f"\n{'='*60}")
    print("EJECUTANDO PRUEBAS ADICIONALES DE DEBUGGING")
    run_individual_test_methods()
    
    # Generar reporte
    print(f"\n{'='*60}")
    print("GENERANDO REPORTE DE RESULTADOS")
    report = generate_integration_test_report(results)
    
    # Resumen final
    total_passed = sum(1 for r in results if r['passed'])
    total_tests = len(results)
    
    print(f"\n🏁 RESUMEN FINAL:")
    print(f"   Suites exitosas: {total_passed}/{total_tests}")
    
    if total_passed == total_tests:
        print("🎉 ¡TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON!")
        print("✅ El sistema está listo para las siguientes fases de validación")
        return True
    else:
        print("⚠️  ALGUNAS PRUEBAS FALLARON")
        print("🔧 Revisar logs y corregir problemas antes de continuar")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)