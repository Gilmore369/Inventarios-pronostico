"""
Script para ejecutar todos los tests unitarios de los modelos de pronóstico.
"""

import unittest
import sys
import os

# Añadir el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Importar todos los módulos de test
from test_test_data_generator import TestTestDataGenerator, TestCreateKnownPatternData
from test_sma_model import TestSMAModel
from test_ses_model import TestSESModel
from test_holt_winters_model import TestHoltWintersModel
from test_arima_model import TestARIMAModel
from test_linear_regression_model import TestLinearRegressionModel
from test_random_forest_model import TestRandomForestModel
from test_metrics_calculation import TestMetricsCalculation

def run_all_tests():
    """Ejecuta todos los tests unitarios."""
    
    # Crear suite de tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Añadir todos los tests
    test_classes = [
        TestTestDataGenerator,
        TestCreateKnownPatternData,
        TestSMAModel,
        TestSESModel,
        TestHoltWintersModel,
        TestARIMAModel,
        TestLinearRegressionModel,
        TestRandomForestModel,
        TestMetricsCalculation
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Ejecutar tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Resumen de resultados
    print(f"\n{'='*60}")
    print("RESUMEN DE TESTS UNITARIOS")
    print(f"{'='*60}")
    print(f"Tests ejecutados: {result.testsRun}")
    print(f"Errores: {len(result.errors)}")
    print(f"Fallos: {len(result.failures)}")
    print(f"Éxito: {result.wasSuccessful()}")
    
    if result.errors:
        print(f"\nERRORES ({len(result.errors)}):")
        for test, error in result.errors:
            print(f"  - {test}: {error.split(chr(10))[0]}")
    
    if result.failures:
        print(f"\nFALLOS ({len(result.failures)}):")
        for test, failure in result.failures:
            print(f"  - {test}: {failure.split(chr(10))[0]}")
    
    if result.wasSuccessful():
        print(f"\n🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!")
        print("✅ Generador de datos de prueba: OK")
        print("✅ Modelo SMA: OK")
        print("✅ Modelo SES: OK")
        print("✅ Modelo Holt-Winters: OK")
        print("✅ Modelo ARIMA: OK")
        print("✅ Modelo Regresión Lineal: OK")
        print("✅ Modelo Random Forest: OK")
        print("✅ Cálculo de métricas: OK")
    else:
        print(f"\n❌ ALGUNOS TESTS FALLARON")
        print("Revisa los errores y fallos arriba para más detalles.")
    
    return result.wasSuccessful()

if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)