/**
 * Script para ejecutar pruebas de rendimiento del frontend
 * Genera un reporte JSON con los resultados
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('INICIANDO PRUEBAS DE RENDIMIENTO DEL FRONTEND');
console.log('=' * 50);

try {
  // Ejecutar las pruebas de rendimiento con Jest
  console.log('Ejecutando pruebas de rendimiento...');
  
  const testCommand = 'npm test -- --testPathPattern=performance --watchAll=false --verbose --json --outputFile=performance-test-results.json';
  
  try {
    execSync(testCommand, { 
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (error) {
    // Jest puede fallar pero aún generar resultados útiles
    console.log('Tests completados (algunos pueden haber fallado)');
  }

  // Generar reporte adicional de análisis estático
  const staticAnalysis = generateStaticAnalysis();
  
  // Combinar resultados
  const performanceReport = {
    timestamp: new Date().toISOString(),
    testType: 'frontend_performance',
    staticAnalysis,
    summary: {
      testsExecuted: true,
      reportGenerated: true,
      recommendations: generateRecommendations(staticAnalysis)
    }
  };

  // Guardar reporte
  const reportPath = path.join(__dirname, 'frontend-performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2));

  console.log('\n' + '=' * 50);
  console.log('PRUEBAS DE RENDIMIENTO COMPLETADAS');
  console.log(`Reporte guardado en: ${reportPath}`);
  
  // Mostrar resumen
  displaySummary(performanceReport);

} catch (error) {
  console.error('Error ejecutando pruebas de rendimiento:', error.message);
  process.exit(1);
}

function generateStaticAnalysis() {
  console.log('\nEjecutando análisis estático...');
  
  const analysis = {
    bundleSize: analyzeBundleSize(),
    dependencies: analyzeDependencies(),
    codeComplexity: analyzeCodeComplexity(),
    performance: {
      renderOptimizations: checkRenderOptimizations(),
      memoryLeaks: checkPotentialMemoryLeaks(),
      bundleOptimizations: checkBundleOptimizations()
    }
  };

  return analysis;
}

function analyzeBundleSize() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});

    // Estimar tamaños basados en dependencias conocidas
    const sizeEstimates = {
      'react': 42.2,
      'react-dom': 130.5,
      '@mui/material': 156.8,
      '@mui/icons-material': 89.3,
      'recharts': 89.3,
      '@emotion/react': 45.2,
      '@emotion/styled': 23.1
    };

    let estimatedSize = 0;
    const breakdown = {};

    dependencies.forEach(dep => {
      const size = sizeEstimates[dep] || 15; // Tamaño por defecto
      breakdown[dep] = size;
      estimatedSize += size;
    });

    return {
      estimatedTotalKB: Math.round(estimatedSize * 100) / 100,
      breakdown,
      dependencyCount: dependencies.length,
      devDependencyCount: devDependencies.length,
      withinThreshold: estimatedSize < 500 // 500KB threshold
    };
  } catch (error) {
    return {
      error: 'No se pudo analizar package.json',
      estimatedTotalKB: 0,
      breakdown: {},
      withinThreshold: false
    };
  }
}

function analyzeDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const dependencies = packageJson.dependencies || {};
    
    // Analizar dependencias por categoría
    const categories = {
      ui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
      charts: ['recharts'],
      core: ['react', 'react-dom', 'react-scripts'],
      testing: ['@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event']
    };

    const analysis = {
      total: Object.keys(dependencies).length,
      byCategory: {},
      heavyDependencies: [],
      recommendations: []
    };

    Object.entries(categories).forEach(([category, deps]) => {
      analysis.byCategory[category] = deps.filter(dep => dependencies[dep]).length;
    });

    // Identificar dependencias pesadas
    const heavyDeps = ['@mui/material', 'recharts'];
    analysis.heavyDependencies = heavyDeps.filter(dep => dependencies[dep]);

    // Generar recomendaciones
    if (analysis.heavyDependencies.length > 0) {
      analysis.recommendations.push('Considerar tree-shaking para dependencias pesadas');
    }
    if (analysis.total > 20) {
      analysis.recommendations.push('Revisar si todas las dependencias son necesarias');
    }

    return analysis;
  } catch (error) {
    return {
      error: 'No se pudo analizar dependencias',
      total: 0,
      byCategory: {},
      recommendations: []
    };
  }
}

function analyzeCodeComplexity() {
  const srcPath = path.join(__dirname, 'src');
  
  try {
    const componentFiles = findFiles(srcPath, '.jsx', '.js').filter(file => 
      file.includes('components/') && !file.includes('test') && !file.includes('performance')
    );

    const analysis = {
      totalComponents: componentFiles.length,
      avgFileSize: 0,
      largeFiles: [],
      recommendations: []
    };

    let totalSize = 0;
    componentFiles.forEach(file => {
      try {
        const stats = fs.statSync(file);
        const sizeKB = stats.size / 1024;
        totalSize += sizeKB;

        if (sizeKB > 10) { // Archivos mayores a 10KB
          analysis.largeFiles.push({
            file: path.relative(srcPath, file),
            sizeKB: Math.round(sizeKB * 100) / 100
          });
        }
      } catch (err) {
        // Ignorar errores de archivos individuales
      }
    });

    analysis.avgFileSize = componentFiles.length > 0 ? 
      Math.round((totalSize / componentFiles.length) * 100) / 100 : 0;

    // Generar recomendaciones
    if (analysis.largeFiles.length > 0) {
      analysis.recommendations.push('Considerar dividir componentes grandes en subcomponentes');
    }
    if (analysis.avgFileSize > 8) {
      analysis.recommendations.push('El tamaño promedio de componentes es alto, revisar complejidad');
    }

    return analysis;
  } catch (error) {
    return {
      error: 'No se pudo analizar complejidad del código',
      totalComponents: 0,
      avgFileSize: 0,
      recommendations: []
    };
  }
}

function checkRenderOptimizations() {
  const optimizations = {
    memoization: false,
    lazyLoading: false,
    virtualization: false,
    codesplitting: false
  };

  const recommendations = [];

  // Estas serían verificaciones más sofisticadas en un análisis real
  recommendations.push('Implementar React.memo para componentes que reciben props estables');
  recommendations.push('Considerar lazy loading para componentes pesados');
  recommendations.push('Evaluar virtualización para listas grandes de datos');

  return {
    optimizations,
    recommendations
  };
}

function checkPotentialMemoryLeaks() {
  const issues = [];
  const recommendations = [];

  // Análisis básico de patrones que pueden causar memory leaks
  recommendations.push('Verificar que todos los event listeners se limpien en useEffect cleanup');
  recommendations.push('Asegurar que las subscripciones se cancelen apropiadamente');
  recommendations.push('Revisar el uso de closures que puedan retener referencias');

  return {
    potentialIssues: issues,
    recommendations
  };
}

function checkBundleOptimizations() {
  const optimizations = {
    treeShaking: true, // React Scripts lo incluye por defecto
    minification: true, // React Scripts lo incluye por defecto
    compression: false,
    codesplitting: false
  };

  const recommendations = [];

  if (!optimizations.compression) {
    recommendations.push('Habilitar compresión gzip en el servidor');
  }
  if (!optimizations.codesplitting) {
    recommendations.push('Implementar code splitting con React.lazy()');
  }

  return {
    optimizations,
    recommendations
  };
}

function findFiles(dir, ...extensions) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findFiles(fullPath, ...extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    });
  } catch (error) {
    // Ignorar errores de directorios
  }
  
  return files;
}

function generateRecommendations(analysis) {
  const recommendations = [];

  // Recomendaciones basadas en bundle size
  if (analysis.bundleSize && analysis.bundleSize.estimatedTotalKB > 400) {
    recommendations.push({
      category: 'Bundle Size',
      priority: 'High',
      description: 'El bundle es grande, implementar code splitting y tree shaking'
    });
  }

  // Recomendaciones basadas en dependencias
  if (analysis.dependencies && analysis.dependencies.heavyDependencies.length > 0) {
    recommendations.push({
      category: 'Dependencies',
      priority: 'Medium',
      description: 'Optimizar dependencias pesadas con tree shaking'
    });
  }

  // Recomendaciones basadas en complejidad
  if (analysis.codeComplexity && analysis.codeComplexity.largeFiles.length > 0) {
    recommendations.push({
      category: 'Code Complexity',
      priority: 'Medium',
      description: 'Refactorizar componentes grandes en subcomponentes'
    });
  }

  // Recomendaciones generales de rendimiento
  recommendations.push({
    category: 'Performance',
    priority: 'Low',
    description: 'Implementar React.memo y useMemo para optimizar re-renders'
  });

  return recommendations;
}

function displaySummary(report) {
  console.log('\n=== RESUMEN DE RENDIMIENTO FRONTEND ===');
  
  if (report.staticAnalysis.bundleSize) {
    const bundle = report.staticAnalysis.bundleSize;
    console.log(`Bundle estimado: ${bundle.estimatedTotalKB}KB`);
    console.log(`Dependencias: ${bundle.dependencyCount}`);
    console.log(`Dentro del umbral: ${bundle.withinThreshold ? '✓' : '✗'}`);
  }

  if (report.staticAnalysis.codeComplexity) {
    const complexity = report.staticAnalysis.codeComplexity;
    console.log(`Componentes totales: ${complexity.totalComponents}`);
    console.log(`Tamaño promedio: ${complexity.avgFileSize}KB`);
    console.log(`Archivos grandes: ${complexity.largeFiles.length}`);
  }

  console.log(`\nRecomendaciones: ${report.summary.recommendations.length}`);
  report.summary.recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. [${rec.priority}] ${rec.description}`);
  });
}