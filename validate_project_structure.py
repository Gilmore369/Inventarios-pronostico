#!/usr/bin/env python3
"""
Script de validación de estructura del proyecto de pronósticos de inventarios.
Valida archivos esenciales, configuraciones y dependencias.
"""

import os
import json
import yaml
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Any
import subprocess
import re

class ProjectStructureValidator:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.validation_results = []
        self.errors = []
        self.warnings = []
        
    def log_result(self, component: str, status: str, message: str, details: Dict = None):
        """Registra un resultado de validación"""
        result = {
            'component': component,
            'status': status,  # PASS, FAIL, WARNING
            'message': message,
            'details': details or {}
        }
        self.validation_results.append(result)
        
        if status == 'FAIL':
            self.errors.append(f"{component}: {message}")
        elif status == 'WARNING':
            self.warnings.append(f"{component}: {message}")
    
    def validate_directory_structure(self) -> bool:
        """Valida la estructura de directorios requerida"""
        required_dirs = [
            'backend',
            'frontend',
            '.git',
            '.venv'
        ]
        
        all_dirs_exist = True
        for dir_name in required_dirs:
            dir_path = self.project_root / dir_name
            if dir_path.exists() and dir_path.is_dir():
                self.log_result(
                    'Directory Structure', 
                    'PASS', 
                    f"Directorio '{dir_name}' encontrado"
                )
            else:
                self.log_result(
                    'Directory Structure', 
                    'FAIL', 
                    f"Directorio requerido '{dir_name}' no encontrado"
                )
                all_dirs_exist = False
        
        return all_dirs_exist    

    def validate_essential_files(self) -> bool:
        """Valida que todos los archivos esenciales estén presentes"""
        essential_files = {
            'docker-compose.yml': 'Archivo de orquestación Docker',
            'backend/Dockerfile': 'Dockerfile del backend',
            'backend/requirements.txt': 'Dependencias Python del backend',
            'backend/app.py': 'Aplicación principal del backend',
            'backend/models.py': 'Modelos de pronóstico',
            'frontend/Dockerfile': 'Dockerfile del frontend',
            'frontend/package.json': 'Configuración y dependencias del frontend',
            'frontend/src/App.js': 'Componente principal de React',
            'frontend/src/index.js': 'Punto de entrada de React',
            'frontend/src/components/DataInput.jsx': 'Componente de entrada de datos',
            'frontend/src/components/ResultsTable.jsx': 'Componente de tabla de resultados',
            'frontend/src/components/Forecast.jsx': 'Componente de pronósticos'
        }
        
        all_files_exist = True
        for file_path, description in essential_files.items():
            full_path = self.project_root / file_path
            if full_path.exists() and full_path.is_file():
                self.log_result(
                    'Essential Files', 
                    'PASS', 
                    f"Archivo esencial '{file_path}' encontrado",
                    {'description': description}
                )
            else:
                self.log_result(
                    'Essential Files', 
                    'FAIL', 
                    f"Archivo esencial '{file_path}' no encontrado",
                    {'description': description}
                )
                all_files_exist = False
        
        return all_files_exist
    
    def validate_docker_compose_syntax(self) -> bool:
        """Valida la sintaxis del archivo docker-compose.yml"""
        compose_file = self.project_root / 'docker-compose.yml'
        
        if not compose_file.exists():
            self.log_result(
                'Docker Compose Syntax', 
                'FAIL', 
                'Archivo docker-compose.yml no encontrado'
            )
            return False
        
        try:
            with open(compose_file, 'r', encoding='utf-8') as f:
                compose_data = yaml.safe_load(f)
            
            # Validar estructura básica
            required_keys = ['version', 'services']
            for key in required_keys:
                if key not in compose_data:
                    self.log_result(
                        'Docker Compose Syntax', 
                        'FAIL', 
                        f"Clave requerida '{key}' no encontrada en docker-compose.yml"
                    )
                    return False
            
            # Validar servicios requeridos
            required_services = ['backend', 'frontend', 'redis', 'celery']
            services = compose_data.get('services', {})
            
            for service in required_services:
                if service not in services:
                    self.log_result(
                        'Docker Compose Syntax', 
                        'FAIL', 
                        f"Servicio requerido '{service}' no encontrado en docker-compose.yml"
                    )
                    return False
            
            self.log_result(
                'Docker Compose Syntax', 
                'PASS', 
                'Archivo docker-compose.yml tiene sintaxis válida y servicios requeridos'
            )
            return True
            
        except yaml.YAMLError as e:
            self.log_result(
                'Docker Compose Syntax', 
                'FAIL', 
                f'Error de sintaxis YAML en docker-compose.yml: {str(e)}'
            )
            return False
        except Exception as e:
            self.log_result(
                'Docker Compose Syntax', 
                'FAIL', 
                f'Error leyendo docker-compose.yml: {str(e)}'
            )
            return False 
   
    def validate_package_json_syntax(self) -> bool:
        """Valida la sintaxis de los archivos package.json"""
        package_files = [
            'frontend/package.json',
            'backend/package.json'
        ]
        
        all_valid = True
        for package_file in package_files:
            file_path = self.project_root / package_file
            
            if not file_path.exists():
                if package_file == 'frontend/package.json':
                    self.log_result(
                        'Package.json Syntax', 
                        'FAIL', 
                        f'Archivo requerido {package_file} no encontrado'
                    )
                    all_valid = False
                else:
                    # backend/package.json es opcional
                    self.log_result(
                        'Package.json Syntax', 
                        'WARNING', 
                        f'Archivo opcional {package_file} no encontrado'
                    )
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    package_data = json.load(f)
                
                # Validar estructura básica para frontend
                if package_file == 'frontend/package.json':
                    required_keys = ['name', 'version', 'dependencies', 'scripts']
                    for key in required_keys:
                        if key not in package_data:
                            self.log_result(
                                'Package.json Syntax', 
                                'FAIL', 
                                f"Clave requerida '{key}' no encontrada en {package_file}"
                            )
                            all_valid = False
                    
                    # Validar scripts requeridos
                    scripts = package_data.get('scripts', {})
                    required_scripts = ['start', 'build', 'test']
                    for script in required_scripts:
                        if script not in scripts:
                            self.log_result(
                                'Package.json Syntax', 
                                'WARNING', 
                                f"Script recomendado '{script}' no encontrado en {package_file}"
                            )
                
                self.log_result(
                    'Package.json Syntax', 
                    'PASS', 
                    f'Archivo {package_file} tiene sintaxis JSON válida'
                )
                
            except json.JSONDecodeError as e:
                self.log_result(
                    'Package.json Syntax', 
                    'FAIL', 
                    f'Error de sintaxis JSON en {package_file}: {str(e)}'
                )
                all_valid = False
            except Exception as e:
                self.log_result(
                    'Package.json Syntax', 
                    'FAIL', 
                    f'Error leyendo {package_file}: {str(e)}'
                )
                all_valid = False
        
        return all_valid
    
    def validate_python_dependencies(self) -> bool:
        """Valida las dependencias de Python en requirements.txt"""
        requirements_file = self.project_root / 'backend' / 'requirements.txt'
        
        if not requirements_file.exists():
            self.log_result(
                'Python Dependencies', 
                'FAIL', 
                'Archivo requirements.txt no encontrado'
            )
            return False
        
        # Dependencias requeridas para los modelos de pronóstico
        required_packages = {
            'flask': 'Framework web para API',
            'flask-cors': 'Manejo de CORS',
            'pandas': 'Manipulación de datos',
            'numpy': 'Operaciones numéricas',
            'statsmodels': 'Modelos estadísticos (ARIMA, Holt-Winters)',
            'scikit-learn': 'Machine Learning (Random Forest, Regresión)',
            'celery': 'Procesamiento asíncrono',
            'redis': 'Cache y cola de tareas'
        }
        
        try:
            with open(requirements_file, 'r', encoding='utf-8') as f:
                requirements_content = f.read()
            
            missing_packages = []
            for package, description in required_packages.items():
                # Buscar el paquete en el archivo (con o sin versión)
                pattern = rf'^{re.escape(package)}(?:[>=<!=]+.*)?$'
                if not re.search(pattern, requirements_content, re.MULTILINE | re.IGNORECASE):
                    missing_packages.append(f"{package} ({description})")
                else:
                    self.log_result(
                        'Python Dependencies', 
                        'PASS', 
                        f'Dependencia requerida encontrada: {package}',
                        {'description': description}
                    )
            
            if missing_packages:
                self.log_result(
                    'Python Dependencies', 
                    'FAIL', 
                    f'Dependencias faltantes: {", ".join(missing_packages)}'
                )
                return False
            
            self.log_result(
                'Python Dependencies', 
                'PASS', 
                'Todas las dependencias Python requeridas están presentes'
            )
            return True
            
        except Exception as e:
            self.log_result(
                'Python Dependencies', 
                'FAIL', 
                f'Error leyendo requirements.txt: {str(e)}'
            )
            return False    

    def validate_node_dependencies(self) -> bool:
        """Valida las dependencias de Node.js en package.json del frontend"""
        package_file = self.project_root / 'frontend' / 'package.json'
        
        if not package_file.exists():
            self.log_result(
                'Node Dependencies', 
                'FAIL', 
                'Archivo frontend/package.json no encontrado'
            )
            return False
        
        # Dependencias requeridas para React y componentes
        required_packages = {
            'react': 'Biblioteca principal de React',
            'react-dom': 'DOM renderer para React',
            'react-scripts': 'Scripts de construcción de Create React App',
            '@mui/material': 'Componentes Material-UI',
            'recharts': 'Biblioteca de gráficos para React'
        }
        
        try:
            with open(package_file, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
            
            dependencies = package_data.get('dependencies', {})
            dev_dependencies = package_data.get('devDependencies', {})
            all_dependencies = {**dependencies, **dev_dependencies}
            
            missing_packages = []
            for package, description in required_packages.items():
                if package not in all_dependencies:
                    missing_packages.append(f"{package} ({description})")
                else:
                    self.log_result(
                        'Node Dependencies', 
                        'PASS', 
                        f'Dependencia requerida encontrada: {package}',
                        {'description': description, 'version': all_dependencies[package]}
                    )
            
            if missing_packages:
                self.log_result(
                    'Node Dependencies', 
                    'FAIL', 
                    f'Dependencias faltantes: {", ".join(missing_packages)}'
                )
                return False
            
            self.log_result(
                'Node Dependencies', 
                'PASS', 
                'Todas las dependencias Node.js requeridas están presentes'
            )
            return True
            
        except Exception as e:
            self.log_result(
                'Node Dependencies', 
                'FAIL', 
                f'Error leyendo frontend/package.json: {str(e)}'
            )
            return False
    
    def validate_dockerfile_syntax(self) -> bool:
        """Valida la sintaxis básica de los Dockerfiles"""
        dockerfiles = [
            'backend/Dockerfile',
            'frontend/Dockerfile'
        ]
        
        all_valid = True
        for dockerfile_path in dockerfiles:
            file_path = self.project_root / dockerfile_path
            
            if not file_path.exists():
                self.log_result(
                    'Dockerfile Syntax', 
                    'FAIL', 
                    f'Dockerfile requerido {dockerfile_path} no encontrado'
                )
                all_valid = False
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    dockerfile_content = f.read()
                
                # Validar instrucciones básicas requeridas
                required_instructions = ['FROM', 'WORKDIR', 'COPY', 'EXPOSE']
                missing_instructions = []
                
                for instruction in required_instructions:
                    if not re.search(rf'^{instruction}\s+', dockerfile_content, re.MULTILINE | re.IGNORECASE):
                        missing_instructions.append(instruction)
                
                if missing_instructions:
                    self.log_result(
                        'Dockerfile Syntax', 
                        'WARNING', 
                        f'Instrucciones recomendadas faltantes en {dockerfile_path}: {", ".join(missing_instructions)}'
                    )
                
                # Validar que tenga FROM como primera instrucción no comentada
                lines = [line.strip() for line in dockerfile_content.split('\n') if line.strip() and not line.strip().startswith('#')]
                if lines and not lines[0].upper().startswith('FROM'):
                    self.log_result(
                        'Dockerfile Syntax', 
                        'WARNING', 
                        f'Dockerfile {dockerfile_path} debería comenzar con instrucción FROM'
                    )
                
                self.log_result(
                    'Dockerfile Syntax', 
                    'PASS', 
                    f'Dockerfile {dockerfile_path} tiene estructura básica válida'
                )
                
            except Exception as e:
                self.log_result(
                    'Dockerfile Syntax', 
                    'FAIL', 
                    f'Error leyendo {dockerfile_path}: {str(e)}'
                )
                all_valid = False
        
        return all_valid 
   
    def validate_python_syntax(self) -> bool:
        """Valida la sintaxis básica de archivos Python principales"""
        python_files = [
            'backend/app.py',
            'backend/models.py'
        ]
        
        all_valid = True
        for python_file in python_files:
            file_path = self.project_root / python_file
            
            if not file_path.exists():
                self.log_result(
                    'Python Syntax', 
                    'FAIL', 
                    f'Archivo Python requerido {python_file} no encontrado'
                )
                all_valid = False
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    python_content = f.read()
                
                # Intentar compilar el código Python
                compile(python_content, python_file, 'exec')
                
                self.log_result(
                    'Python Syntax', 
                    'PASS', 
                    f'Archivo {python_file} tiene sintaxis Python válida'
                )
                
            except SyntaxError as e:
                self.log_result(
                    'Python Syntax', 
                    'FAIL', 
                    f'Error de sintaxis en {python_file}: {str(e)}'
                )
                all_valid = False
            except Exception as e:
                self.log_result(
                    'Python Syntax', 
                    'FAIL', 
                    f'Error leyendo {python_file}: {str(e)}'
                )
                all_valid = False
        
        return all_valid
    
    def validate_react_components(self) -> bool:
        """Valida la presencia y estructura básica de componentes React"""
        react_components = [
            'frontend/src/components/DataInput.jsx',
            'frontend/src/components/ResultsTable.jsx',
            'frontend/src/components/Forecast.jsx',
            'frontend/src/App.js',
            'frontend/src/index.js'
        ]
        
        all_valid = True
        for component_file in react_components:
            file_path = self.project_root / component_file
            
            if not file_path.exists():
                self.log_result(
                    'React Components', 
                    'FAIL', 
                    f'Componente React requerido {component_file} no encontrado'
                )
                all_valid = False
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    component_content = f.read()
                
                # Validar que contenga imports de React
                if 'react' not in component_content.lower():
                    self.log_result(
                        'React Components', 
                        'WARNING', 
                        f'Componente {component_file} no parece importar React'
                    )
                
                # Validar que tenga export
                if 'export' not in component_content.lower():
                    self.log_result(
                        'React Components', 
                        'WARNING', 
                        f'Componente {component_file} no tiene export visible'
                    )
                
                self.log_result(
                    'React Components', 
                    'PASS', 
                    f'Componente {component_file} encontrado y tiene estructura básica'
                )
                
            except Exception as e:
                self.log_result(
                    'React Components', 
                    'FAIL', 
                    f'Error leyendo {component_file}: {str(e)}'
                )
                all_valid = False
        
        return all_valid
    
    def run_full_validation(self) -> Dict[str, Any]:
        """Ejecuta todas las validaciones y retorna un reporte completo"""
        print("🔍 Iniciando validación de estructura del proyecto...")
        print("=" * 60)
        
        # Ejecutar todas las validaciones
        validations = [
            ('Estructura de Directorios', self.validate_directory_structure),
            ('Archivos Esenciales', self.validate_essential_files),
            ('Sintaxis Docker Compose', self.validate_docker_compose_syntax),
            ('Sintaxis Package.json', self.validate_package_json_syntax),
            ('Dependencias Python', self.validate_python_dependencies),
            ('Dependencias Node.js', self.validate_node_dependencies),
            ('Sintaxis Dockerfile', self.validate_dockerfile_syntax),
            ('Sintaxis Python', self.validate_python_syntax),
            ('Componentes React', self.validate_react_components)
        ]
        
        results_summary = {}
        for validation_name, validation_func in validations:
            print(f"\n📋 Validando: {validation_name}")
            try:
                result = validation_func()
                results_summary[validation_name] = 'PASS' if result else 'FAIL'
                status_icon = "✅" if result else "❌"
                print(f"{status_icon} {validation_name}: {'COMPLETADO' if result else 'FALLÓ'}")
            except Exception as e:
                results_summary[validation_name] = 'ERROR'
                print(f"💥 {validation_name}: ERROR - {str(e)}")
                self.log_result(validation_name, 'FAIL', f'Error durante validación: {str(e)}')
        
        return self.generate_report(results_summary)    

    def generate_report(self, results_summary: Dict[str, str]) -> Dict[str, Any]:
        """Genera un reporte completo de la validación"""
        total_validations = len(results_summary)
        passed_validations = sum(1 for status in results_summary.values() if status == 'PASS')
        failed_validations = sum(1 for status in results_summary.values() if status == 'FAIL')
        error_validations = sum(1 for status in results_summary.values() if status == 'ERROR')
        
        overall_status = 'PASS' if failed_validations == 0 and error_validations == 0 else 'FAIL'
        
        report = {
            'timestamp': str(Path.cwd()),
            'overall_status': overall_status,
            'summary': {
                'total_validations': total_validations,
                'passed': passed_validations,
                'failed': failed_validations,
                'errors': error_validations,
                'success_rate': round((passed_validations / total_validations) * 100, 2)
            },
            'validation_results': self.validation_results,
            'errors': self.errors,
            'warnings': self.warnings,
            'results_by_category': results_summary
        }
        
        # Imprimir reporte en consola
        print("\n" + "=" * 60)
        print("📊 REPORTE DE VALIDACIÓN")
        print("=" * 60)
        
        print(f"\n🎯 Estado General: {'✅ APROBADO' if overall_status == 'PASS' else '❌ FALLÓ'}")
        print(f"📈 Tasa de Éxito: {report['summary']['success_rate']}%")
        print(f"✅ Validaciones Exitosas: {passed_validations}")
        print(f"❌ Validaciones Fallidas: {failed_validations}")
        print(f"💥 Errores: {error_validations}")
        
        if self.errors:
            print(f"\n🚨 ERRORES CRÍTICOS ({len(self.errors)}):")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")
        
        if self.warnings:
            print(f"\n⚠️  ADVERTENCIAS ({len(self.warnings)}):")
            for i, warning in enumerate(self.warnings, 1):
                print(f"  {i}. {warning}")
        
        # Recomendaciones
        print(f"\n💡 RECOMENDACIONES:")
        if failed_validations > 0:
            print("  • Corregir todos los errores críticos antes de continuar")
            print("  • Verificar que todos los archivos esenciales estén presentes")
            print("  • Validar sintaxis de archivos de configuración")
        
        if len(self.warnings) > 0:
            print("  • Revisar las advertencias para mejorar la calidad del proyecto")
        
        if overall_status == 'PASS':
            print("  • ¡Excelente! El proyecto tiene una estructura sólida")
            print("  • Proceder con las pruebas unitarias y de integración")
        
        print("\n" + "=" * 60)
        
        return report
    
    def save_report_to_file(self, report: Dict[str, Any], filename: str = "validation_report.json"):
        """Guarda el reporte en un archivo JSON"""
        try:
            report_path = self.project_root / filename
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            print(f"📄 Reporte guardado en: {report_path}")
        except Exception as e:
            print(f"❌ Error guardando reporte: {str(e)}")


def main():
    """Función principal del script"""
    if len(sys.argv) > 1:
        project_path = sys.argv[1]
    else:
        project_path = "."
    
    validator = ProjectStructureValidator(project_path)
    report = validator.run_full_validation()
    
    # Guardar reporte
    validator.save_report_to_file(report)
    
    # Código de salida basado en el resultado
    exit_code = 0 if report['overall_status'] == 'PASS' else 1
    sys.exit(exit_code)


if __name__ == "__main__":
    main()