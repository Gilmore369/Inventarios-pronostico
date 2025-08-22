#!/usr/bin/env python3
"""
Script para ejecutar la suite completa de pruebas de validación
del proyecto de pronósticos de inventarios.

Este script ejecuta:
1. Validación de estructura del proyecto
2. Pruebas unitarias de modelos (backend)
3. Pruebas de API (backend)
4. Pruebas de rendimiento de modelos
5. Pruebas de componentes React (frontend)
6. Pruebas de rendimiento del frontend
7. Pruebas de usabilidad y UX
8. Pruebas de integración E2E

Genera un reporte completo con métricas de cobertura y recomendaciones.
"""

import os
import sys
import json
import subprocess
import time
from datetime import datetime
from pathlib import Path

class CompleteValidationRunner:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.backend_path = self.project_root / "backend"
        self.frontend_path = self.project_root / "frontend"
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "UNKNOWN",
            "execution_summary": {
                "total_test_suites": 8,
                "completed_suites": 0,
                "failed_suites": 0,
                "total_execution_time": 0
            },
            "test_results": {},
            "coverage_metrics": {},
            "recommendations": [],
            "critical_issues": [],
            "warnings": []
        }
        self.start_time = time.time()

    def log(self, message, level="INFO"):
        """Log con timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_command(self, command, cwd=None, timeout=300):
        """Ejecutar comando con timeout y captura de salida"""
        try:
            self.log(f"Ejecutando: {command}")
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd or self.project_root,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds",
                "returncode": -1
            }
        except Exception as e:
            return {
                "success": False,
                "stdout": "",
                "stderr": str(e),
                "returncode": -1
            }

    def validate_project_structure(self):
        """1. Validación de estructura del proyecto"""
        self.log("=== VALIDANDO ESTRUCTURA DEL PROYECTO ===")
        
        suite_start = time.time()
        result = self.run_command("python validate_project_structure.py")
        execution_time = time.time() - suite_start

        # Leer reporte de validación si existe
        validation_report = {}
        try:
            with open(self.project_root / "validation_report.json", "r") as f:
                validation_report = json.load(f)
        except:
            pass

        self.results["test_results"]["project_structure"] = {
            "suite_name": "Project Structure Validation",
            "success": result["success"],
            "execution_time": execution_time,
            "details": validation_report,
            "stdout": result["stdout"],
            "stderr": result["stderr"]
        }

        if result["success"]:
            self.results["execution_summary"]["completed_suites"] += 1
            self.log("✅ Validación de estructura: EXITOSA")
        else:
            self.results["execution_summary"]["failed_suites"] += 1
            self.log("❌ Validación de estructura: FALLIDA")
            self.results["critical_issues"].append("Project structure validation failed")

        return result["success"]

    def run_backend_unit_tests(self):
        """2. Pruebas unitarias de modelos (backend)"""
        self.log("=== EJECUTANDO PRUEBAS UNITARIAS DE MODELOS ===")
        
        suite_start = time.time()
        result = self.run_command("python run_all_tests.py", cwd=self.backend_path)
        execution_time = time.time() - suite_start

        self.results["test_results"]["backend_unit_tests"] = {
            "suite_name": "Backend Unit Tests",
            "success": result["success"],
            "execution_time": execution_time,
            "stdout": result["stdout"],
            "stderr": result["stderr"]
        }

        if result["success"]:
            self.results["execution_summary"]["completed_suites"] += 1
            self.log("✅ Pruebas unitarias backend: EXITOSAS")
        else:
            self.results["execution_summary"]["failed_suites"] += 1
            self.log("❌ Pruebas unitarias backend: FALLIDAS")
            self.results["critical_issues"].append("Backend unit tests failed")

        return result["success"]

    def run_backend_api_tests(self):
        """3. Pruebas de API (backend)"""
        self.log("=== EJECUTANDO PRUEBAS DE API ===")
        
        suite_start = time.time()
        result = self.run_command("python run_api_tests.py", cwd=self.backend_path)
        execution_time = time.time() - suite_start

        self.results["test_results"]["backend_api_tests"] = {
            "suite_name": "Backend API Tests",
            "success": result["success"],
            "execution_time": execution_time,
            "stdout": result["stdout"],
            "stderr": result["stderr"]
        }

        if result["success"]:
            self.results["execution_summary"]["completed_suites"] += 1
            self.log("✅ Pruebas de API: EXITOSAS")
        else:
            self.results["execution_summary"]["failed_suites"] += 1
            self.log("❌ Pruebas de API: FALLIDAS")
            self.results["critical_issues"].append("API tests failed")

        return result["success"]

    def run_backend_performance_tests(self):
        """4. Pruebas de rendimiento de modelos"""
        self.log("=== EJECUTANDO PRUEBAS DE RENDIMIENTO DE MODELOS ===")
        
        suite_start = time.time()
        result = self.run_command("python test_model_performance.py", cwd=self.backend_path)
        execution_time = time.time() - suite_start

        # Leer reporte de rendimiento si existe
        performance_report = {}
        try:
            with open(self.backend_path / "model_performance_report.json", "r") as f:
                performance_report = json.load(f)
        except:
            pass

        self.results["test_results"]["backend_performance"] = {
            "suite_name": "Backend Performance Tests",
            "success": result["success"],
            "execution_time": execution_time,
            "details": performance_report,
            "stdout": result["stdout"],
            "stderr": result["stderr"]
        }

        if result["success"]:
            self.results["execution_summary"]["completed_suites"] += 1
            self.log("✅ Pruebas de rendimiento backend: EXITOSAS")
        else:
            self.results["execution_summary"]["failed_suites"] += 1
            self.log("❌ Pruebas de rendimiento backend: FALLIDAS")
            self.results["warnings"].append("Backend performance tests had issues")

        return result["success"]

    def run_frontend_component_tests(self):
        """5. Pruebas de componentes React (frontend)"""
        self.log("=== EJECUTANDO PRUEBAS DE COMPONENTES REACT ===")
        
        suite_start = time.time()
        
        # Verificar si npm está disponible
        npm_check = self.run_command("npm --version", cwd=self.frontend_path)
        if not npm_check["success"]:
            self.log("❌ npm no está disponible, saltando pruebas de frontend")
            self.results["test_results"]["frontend_components"] = {
                "suite_name": "Frontend Component Tests",
                "success": False,
                "execution_time": 0,
                "error": "npm not available",
                "stdout": "",
                "stderr": "npm command not found"
            }
            self.results["warnings"].append("Frontend tests skipped - npm not available")
            return False

        # Ejecutar pruebas de componentes
        result = self.run_command(
            "npm test -- --testPathPattern=\"(DataInput|ResultsTable|Forecast|IntuitiveUserFlow|TooltipsAndInformativeElements).test.jsx\" --watchAll=false --coverage=false",
            cwd=self.frontend_path,
            timeout=180
        )
        execution_time = time.time() - suite_start

        self.results["test_results"]["frontend_components"] = {
            "suite_name": "Frontend Component Tests",
            "success": result["success"],
            "execution_time": execution_time,
            "stdout": result["stdout"],
            "stderr": result["stderr"]
        }

        if result["success"]:
            self.results["execution_summary"]["completed_suites"] += 1
            self.log("✅ Pruebas de componentes frontend: EXITOSAS")
        else:
            self.results["execution_summary"]["failed_suites"] += 1
            self.log("❌ Pruebas de componentes frontend: FALLIDAS")
            self.results["warnings"].append("Frontend component tests had issues")

        return result["success"]

    def run_frontend_performance_tests(self):
        """6. Pruebas de rendimiento del frontend"""
        self.log("=== EJECUTANDO PRUEBAS DE RENDIMIENTO DEL FRONTEND ===")
        
        suite_start = time.time()
        result = self.run_command("node run-performance-tests.js", cwd=self.frontend_path)
        execution_time = time.time() - suite_start

        # Leer reporte de rendimiento si existe
        performance_report = {}
        try:
            with open(self.frontend_path / "frontend-performance-report.json", "r") as f:
                performance_report = json.load(f)
        except:
            pass

        self.results["test_results"]["frontend_performance"] = {
            "suite_name": "Frontend Performance Tests",
            "success": result["success"],
            "execution_time": execution_time,
            "details": performance_report,
            "stdout": result["stdout"],
            "stderr": result["stderr"]
        }

        if result["success"]:
            self.results["execution_summary"]["completed_suites"] += 1
            self.log("✅ Pruebas de rendimiento frontend: EXITOSAS")
        else:
            self.results["execution_summary"]["failed_suites"] += 1
            self.log("❌ Pruebas de rendimiento frontend: FALLIDAS")
            self.results["warnings"].append("Frontend performance tests had issues")

        return result["success"]

    def run_usability_tests(self):
        """7. Pruebas de usabilidad y UX"""
        self.log("=== EJECUTANDO PRUEBAS DE USABILIDAD ===")
        
        suite_start = time.time()
        result = self.run_command(
            "npm test -- --testPathPattern=\"(UserErrorHandling|UserFlowNavigation|ExportFunctionality).test.jsx\" --watchAll=false",
            cwd=self.frontend_path,
            timeout=180
        )
        execution_time = time.time() - suite_start

        self.results["test_results"]["usability_tests"] = {
            "suite_name": "Usability and UX Tests",
            "success": result["success"],
            "execution_time": execution_time,
            "stdout": result["stdout"],
            "stderr": result["stderr"]
        }

        if result["success"]:
            self.results["execution_summary"]["completed_suites"] += 1
            self.log("✅ Pruebas de usabilidad: EXITOSAS")
        else:
            self.results["execution_summary"]["failed_suites"] += 1
            self.log("❌ Pruebas de usabilidad: FALLIDAS")
            self.results["warnings"].append("Usability tests had issues")

        return result["success"]

    def run_integration_tests(self):
        """8. Pruebas de integración E2E"""
        self.log("=== EJECUTANDO PRUEBAS DE INTEGRACIÓN E2E ===")
        
        suite_start = time.time()
        result = self.run_command("python test_e2e_integration.py", cwd=self.backend_path)
        execution_time = time.time() - suite_start

        self.results["test_results"]["integration_tests"] = {
            "suite_name": "End-to-End Integration Tests",
            "success": result["success"],
            "execution_time": execution_time,
            "stdout": result["stdout"],
            "stderr": result["stderr"]
        }

        if result["success"]:
            self.results["execution_summary"]["completed_suites"] += 1
            self.log("✅ Pruebas de integración: EXITOSAS")
        else:
            self.results["execution_summary"]["failed_suites"] += 1
            self.log("❌ Pruebas de integración: FALLIDAS")
            self.results["warnings"].append("Integration tests had issues")

        return result["success"]

    def calculate_coverage_metrics(self):
        """Calcular métricas de cobertura"""
        self.log("=== CALCULANDO MÉTRICAS DE COBERTURA ===")
        
        total_suites = self.results["execution_summary"]["total_test_suites"]
        completed = self.results["execution_summary"]["completed_suites"]
        failed = self.results["execution_summary"]["failed_suites"]
        
        self.results["coverage_metrics"] = {
            "test_suite_completion_rate": (completed / total_suites) * 100,
            "test_suite_success_rate": (completed / total_suites) * 100 if completed > 0 else 0,
            "critical_issues_count": len(self.results["critical_issues"]),
            "warnings_count": len(self.results["warnings"]),
            "total_execution_time": time.time() - self.start_time
        }

        # Determinar estado general
        if failed == 0 and completed == total_suites:
            self.results["overall_status"] = "PASS"
        elif len(self.results["critical_issues"]) > 0:
            self.results["overall_status"] = "FAIL"
        else:
            self.results["overall_status"] = "PARTIAL"

    def generate_recommendations(self):
        """Generar recomendaciones basadas en los resultados"""
        self.log("=== GENERANDO RECOMENDACIONES ===")
        
        recommendations = []

        # Recomendaciones basadas en fallos críticos
        if len(self.results["critical_issues"]) > 0:
            recommendations.append({
                "priority": "CRITICAL",
                "category": "Core Functionality",
                "description": "Resolver problemas críticos antes de continuar con el desarrollo",
                "actions": self.results["critical_issues"]
            })

        # Recomendaciones basadas en advertencias
        if len(self.results["warnings"]) > 0:
            recommendations.append({
                "priority": "HIGH",
                "category": "Quality Improvements",
                "description": "Abordar advertencias para mejorar la calidad del código",
                "actions": self.results["warnings"]
            })

        # Recomendaciones de rendimiento
        backend_perf = self.results["test_results"].get("backend_performance", {})
        if backend_perf.get("details", {}).get("summary", {}).get("success_rate", 100) < 95:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Performance",
                "description": "Optimizar rendimiento de modelos de pronóstico",
                "actions": ["Revisar modelos con baja tasa de éxito", "Optimizar parámetros de modelos"]
            })

        # Recomendaciones de frontend
        frontend_perf = self.results["test_results"].get("frontend_performance", {})
        if frontend_perf.get("details", {}).get("staticAnalysis", {}).get("bundleSize", {}).get("withinThreshold") == False:
            recommendations.append({
                "priority": "MEDIUM",
                "category": "Frontend Optimization",
                "description": "Optimizar tamaño del bundle del frontend",
                "actions": ["Implementar code splitting", "Optimizar dependencias pesadas"]
            })

        # Recomendaciones generales
        if self.results["coverage_metrics"]["test_suite_completion_rate"] < 100:
            recommendations.append({
                "priority": "LOW",
                "category": "Test Coverage",
                "description": "Completar todas las suites de pruebas",
                "actions": ["Resolver problemas de configuración", "Instalar dependencias faltantes"]
            })

        self.results["recommendations"] = recommendations

    def generate_report(self):
        """Generar reporte final"""
        self.log("=== GENERANDO REPORTE FINAL ===")
        
        # Calcular métricas finales
        self.results["execution_summary"]["total_execution_time"] = time.time() - self.start_time
        
        # Guardar reporte JSON
        report_path = self.project_root / "complete_validation_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)

        # Generar reporte Markdown
        self.generate_markdown_report()

        self.log(f"📄 Reporte completo guardado en: {report_path}")
        return report_path

    def generate_markdown_report(self):
        """Generar reporte en formato Markdown"""
        
        md_content = f"""# Reporte de Validación Completa - Pronósticos de Inventarios

## Resumen Ejecutivo

- **Estado General:** {self.results['overall_status']}
- **Fecha de Ejecución:** {self.results['timestamp']}
- **Tiempo Total:** {self.results['coverage_metrics']['total_execution_time']:.2f} segundos
- **Suites Completadas:** {self.results['execution_summary']['completed_suites']}/{self.results['execution_summary']['total_test_suites']}
- **Tasa de Éxito:** {self.results['coverage_metrics']['test_suite_success_rate']:.1f}%

## Resultados por Suite de Pruebas

"""

        for suite_key, suite_data in self.results["test_results"].items():
            status_icon = "✅" if suite_data["success"] else "❌"
            md_content += f"""### {suite_data['suite_name']} {status_icon}

- **Estado:** {'EXITOSO' if suite_data['success'] else 'FALLIDO'}
- **Tiempo de Ejecución:** {suite_data['execution_time']:.2f} segundos

"""

        # Problemas críticos
        if self.results["critical_issues"]:
            md_content += f"""## 🚨 Problemas Críticos

"""
            for issue in self.results["critical_issues"]:
                md_content += f"- {issue}\n"

        # Advertencias
        if self.results["warnings"]:
            md_content += f"""## ⚠️ Advertencias

"""
            for warning in self.results["warnings"]:
                md_content += f"- {warning}\n"

        # Recomendaciones
        if self.results["recommendations"]:
            md_content += f"""## 📋 Recomendaciones

"""
            for rec in self.results["recommendations"]:
                md_content += f"""### {rec['category']} ({rec['priority']})

{rec['description']}

**Acciones:**
"""
                for action in rec['actions']:
                    md_content += f"- {action}\n"
                md_content += "\n"

        # Métricas de cobertura
        md_content += f"""## 📊 Métricas de Cobertura

- **Tasa de Completitud:** {self.results['coverage_metrics']['test_suite_completion_rate']:.1f}%
- **Problemas Críticos:** {self.results['coverage_metrics']['critical_issues_count']}
- **Advertencias:** {self.results['coverage_metrics']['warnings_count']}
- **Tiempo Total de Ejecución:** {self.results['coverage_metrics']['total_execution_time']:.2f} segundos

## Próximos Pasos

1. **Resolver Problemas Críticos:** Abordar todos los problemas marcados como críticos
2. **Implementar Recomendaciones:** Seguir las recomendaciones de alta prioridad
3. **Monitoreo Continuo:** Ejecutar esta validación regularmente
4. **Documentación:** Actualizar documentación basada en los hallazgos

---

*Reporte generado automáticamente por el sistema de validación completa*
"""

        # Guardar reporte Markdown
        md_path = self.project_root / "COMPLETE_VALIDATION_REPORT.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)

        self.log(f"📄 Reporte Markdown guardado en: {md_path}")

    def run_complete_validation(self):
        """Ejecutar validación completa"""
        self.log("🚀 INICIANDO VALIDACIÓN COMPLETA DEL PROYECTO")
        self.log("=" * 60)

        try:
            # Ejecutar todas las suites de pruebas
            self.validate_project_structure()
            self.run_backend_unit_tests()
            self.run_backend_api_tests()
            self.run_backend_performance_tests()
            self.run_frontend_component_tests()
            self.run_frontend_performance_tests()
            self.run_usability_tests()
            self.run_integration_tests()

            # Calcular métricas y generar recomendaciones
            self.calculate_coverage_metrics()
            self.generate_recommendations()

            # Generar reporte final
            report_path = self.generate_report()

            # Mostrar resumen final
            self.display_final_summary()

            return self.results["overall_status"] == "PASS"

        except Exception as e:
            self.log(f"❌ Error durante la validación: {str(e)}", "ERROR")
            self.results["overall_status"] = "ERROR"
            self.results["critical_issues"].append(f"Validation runner error: {str(e)}")
            return False

    def display_final_summary(self):
        """Mostrar resumen final en consola"""
        self.log("=" * 60)
        self.log("📊 RESUMEN FINAL DE VALIDACIÓN")
        self.log("=" * 60)

        status_icon = {
            "PASS": "✅",
            "PARTIAL": "⚠️",
            "FAIL": "❌",
            "ERROR": "💥"
        }.get(self.results["overall_status"], "❓")

        self.log(f"Estado General: {status_icon} {self.results['overall_status']}")
        self.log(f"Suites Completadas: {self.results['execution_summary']['completed_suites']}/{self.results['execution_summary']['total_test_suites']}")
        self.log(f"Tasa de Éxito: {self.results['coverage_metrics']['test_suite_success_rate']:.1f}%")
        self.log(f"Tiempo Total: {self.results['coverage_metrics']['total_execution_time']:.2f} segundos")

        if self.results["critical_issues"]:
            self.log(f"🚨 Problemas Críticos: {len(self.results['critical_issues'])}")

        if self.results["warnings"]:
            self.log(f"⚠️ Advertencias: {len(self.results['warnings'])}")

        if self.results["recommendations"]:
            self.log(f"📋 Recomendaciones: {len(self.results['recommendations'])}")

        self.log("=" * 60)

def main():
    """Función principal"""
    runner = CompleteValidationRunner()
    success = runner.run_complete_validation()
    
    # Código de salida basado en el resultado
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()