#!/usr/bin/env node

/**
 * Bundle Monitor - Análisis automático de bundle size
 * Genera reportes detallados del tamaño de los bundles y dependencias
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleMonitor {
  constructor() {
    this.distPath = path.join(__dirname, '..', 'dist');
    this.reportsDir = path.join(__dirname, '..', 'reports', 'bundle');
    this.packageJsonPath = path.join(__dirname, '..', 'package.json');

    // Crear directorio de reportes si no existe
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Analiza el tamaño de los archivos del bundle
   */
  analyzeBundleSize() {
    console.log('🔍 Analizando tamaño del bundle...');

    if (!fs.existsSync(this.distPath)) {
      console.error(
        '❌ Directorio dist no encontrado. Ejecuta npm run build primero.'
      );
      process.exit(1);
    }

    const results = {
      timestamp: new Date().toISOString(),
      totalSize: 0,
      files: [],
      summary: {},
    };

    // Analizar archivos recursivamente
    this.analyzeDirectory(this.distPath, results, '');

    // Calcular estadísticas
    this.calculateStatistics(results);

    return results;
  }

  /**
   * Analiza un directorio recursivamente
   */
  analyzeDirectory(dirPath, results, relativePath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const itemRelativePath = path.join(relativePath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        this.analyzeDirectory(fullPath, results, itemRelativePath);
      } else if (stats.isFile()) {
        const fileInfo = {
          path: itemRelativePath.replace(/\\/g, '/'),
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          type: path.extname(item),
          modified: stats.mtime,
        };

        results.files.push(fileInfo);
        results.totalSize += stats.size;
      }
    }
  }

  /**
   * Calcula estadísticas del bundle
   */
  calculateStatistics(results) {
    const typeStats = {};
    let jsSize = 0;
    let mapSize = 0;

    results.files.forEach(file => {
      const type = file.type || 'other';
      if (!typeStats[type]) {
        typeStats[type] = { count: 0, size: 0 };
      }
      typeStats[type].count++;
      typeStats[type].size += file.size;

      if (type === '.js') jsSize += file.size;
      if (type === '.map') mapSize += file.size;
    });

    results.summary = {
      totalFiles: results.files.length,
      totalSizeFormatted: this.formatBytes(results.totalSize),
      jsSize: this.formatBytes(jsSize),
      mapSize: this.formatBytes(mapSize),
      typeBreakdown: Object.entries(typeStats)
        .map(([type, stats]) => ({
          type,
          count: stats.count,
          size: this.formatBytes(stats.size),
          percentage: ((stats.size / results.totalSize) * 100).toFixed(2),
        }))
        .sort((a, b) => parseInt(b.percentage) - parseInt(a.percentage)),
    };
  }

  /**
   * Analiza dependencias del package.json
   */
  analyzeDependencies() {
    console.log('📦 Analizando dependencias...');

    const packageJson = JSON.parse(
      fs.readFileSync(this.packageJsonPath, 'utf8')
    );

    const analysis = {
      dependencies: Object.keys(packageJson.dependencies || {}).length,
      devDependencies: Object.keys(packageJson.devDependencies || {}).length,
      heavyDependencies: [],
    };

    // Identificar dependencias pesadas conocidas
    const heavyPackages = [
      'playwright',
      'puppeteer',
      '@types/node',
      'typescript',
      'webpack',
      'babel',
      'eslint',
      'jest',
      'express',
      'axios',
      'lodash',
    ];

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    for (const [name, version] of Object.entries(allDeps)) {
      if (heavyPackages.some(heavy => name.includes(heavy))) {
        analysis.heavyDependencies.push({ name, version });
      }
    }

    return analysis;
  }

  /**
   * Ejecuta size-limit para análisis avanzado (adaptado para Node.js)
   */
  runSizeLimit() {
    console.log('📏 Ejecutando Size Limit...');

    try {
      // Intentar primero con --json
      let output;
      try {
        output = execSync('npx size-limit --json', {
          encoding: 'utf8',
          cwd: path.join(__dirname, '..'),
          timeout: 30000, // 30 segundos timeout
          env: {
            ...process.env,
            NODE_ENV: 'production',
          },
        });
        return JSON.parse(output);
      } catch (jsonError) {
        // Si falla JSON, intentar con output normal
        console.warn('⚠️ JSON output falló, intentando análisis básico...');
        return this.getBasicSizeAnalysis();
      }
    } catch (error) {
      console.warn('⚠️ Size Limit falló (común en aplicaciones Node.js)');
      console.warn('Usando análisis básico de archivos...');
      return this.getBasicSizeAnalysis();
    }
  }

  /**
   * Análisis básico de tamaño sin size-limit
   */
  getBasicSizeAnalysis() {
    const distPath = path.join(__dirname, '..', 'dist');

    if (!fs.existsSync(distPath)) {
      return { error: 'Directorio dist no encontrado' };
    }

    const analysis = [];

    // Analizar archivos principales con límites simulados
    const filesToCheck = [
      { name: '📁 Total Distribution', path: 'dist/**/*.js', limit: '10 MB' },
      { name: '🚀 Main Server', path: 'server.js', limit: '5 MB' },
      { name: '🛣️ Main Route', path: 'routes/analyze.route.js', limit: '2 MB' },
      { name: '🔧 Utils Bundle', path: 'utils/security.js', limit: '1 MB' },
      { name: '🎯 Services Bundle', path: 'services/**/*.js', limit: '2 MB' },
    ];

    for (const fileInfo of filesToCheck) {
      let totalSize = 0;
      let files = [];

      if (fileInfo.path.includes('**')) {
        // Analizar patrón glob
        const basePath = fileInfo.path.split('/**')[0];
        const fullBasePath = path.join(distPath, basePath);

        if (fs.existsSync(fullBasePath)) {
          const allFiles = this.getFilesRecursive(fullBasePath);
          totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);
          files = allFiles.length;
        }
      } else {
        // Analizar archivo específico
        const fullPath = path.join(distPath, fileInfo.path);
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          totalSize = stats.size;
          files = 1;
        }
      }

      analysis.push({
        name: fileInfo.name,
        size: totalSize,
        limit: this.parseLimit(fileInfo.limit),
        files: files,
        passed: totalSize < this.parseLimit(fileInfo.limit),
      });
    }

    return analysis;
  }

  /**
   * Obtener archivos recursivamente
   */
  getFilesRecursive(dirPath) {
    let files = [];

    if (!fs.existsSync(dirPath)) return files;

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        files = files.concat(this.getFilesRecursive(fullPath));
      } else if (stats.isFile() && item.endsWith('.js')) {
        files.push({
          path: fullPath,
          size: stats.size,
        });
      }
    }

    return files;
  }

  /**
   * Parsear límite de tamaño
   */
  parseLimit(limitStr) {
    const match = limitStr.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'KB':
        return value * 1024;
      case 'MB':
        return value * 1024 * 1024;
      case 'GB':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  /**
   * Compara con reporte anterior
   */
  compareWithPrevious(currentResults) {
    const previousReportPath = path.join(this.reportsDir, 'latest.json');

    if (!fs.existsSync(previousReportPath)) {
      console.log('📊 No hay reporte anterior para comparar.');
      return null;
    }

    try {
      const previousReport = JSON.parse(
        fs.readFileSync(previousReportPath, 'utf8')
      );
      const currentSize = currentResults.totalSize;
      const previousSize = previousReport.totalSize;

      const difference = currentSize - previousSize;
      const percentageChange = ((difference / previousSize) * 100).toFixed(2);

      return {
        previousSize: this.formatBytes(previousSize),
        currentSize: this.formatBytes(currentSize),
        difference: this.formatBytes(Math.abs(difference)),
        percentageChange,
        trend:
          difference > 0
            ? 'increased'
            : difference < 0
            ? 'decreased'
            : 'unchanged',
        significant: Math.abs(difference) > 1024 * 10, // Más de 10KB es significativo
      };
    } catch (error) {
      console.warn('⚠️ Error comparando con reporte anterior:', error.message);
      return null;
    }
  }

  /**
   * Genera el reporte completo
   */
  generateReport() {
    console.log('📋 Generando reporte de bundle monitoring...');

    const bundleAnalysis = this.analyzeBundleSize();
    const dependencyAnalysis = this.analyzeDependencies();
    const sizeLimitResults = this.runSizeLimit();
    const comparison = this.compareWithPrevious(bundleAnalysis);

    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: this.getProjectVersion(),
        nodeVersion: process.version,
        platform: process.platform,
      },
      bundle: bundleAnalysis,
      dependencies: dependencyAnalysis,
      sizeLimit: sizeLimitResults,
      comparison,
      recommendations: this.generateRecommendations(
        bundleAnalysis,
        dependencyAnalysis
      ),
    };

    // Guardar reportes
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timestampedPath = path.join(
      this.reportsDir,
      `bundle-report-${timestamp}.json`
    );
    const latestPath = path.join(this.reportsDir, 'latest.json');

    fs.writeFileSync(timestampedPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

    // Generar reporte en formato markdown
    this.generateMarkdownReport(report);

    return report;
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  generateRecommendations(bundleAnalysis, dependencyAnalysis) {
    const recommendations = [];

    // Verificar tamaño total del bundle
    if (bundleAnalysis.totalSize > 10 * 1024 * 1024) {
      // 10MB
      recommendations.push({
        type: 'warning',
        message: 'El bundle total es mayor a 10MB. Considera optimizaciones.',
        action: 'Revisa dependencias innecesarias y habilita tree-shaking.',
      });
    }

    // Verificar archivos grandes
    const largeFiles = bundleAnalysis.files.filter(f => f.size > 1024 * 1024); // 1MB
    if (largeFiles.length > 0) {
      recommendations.push({
        type: 'info',
        message: `${largeFiles.length} archivo(s) mayor(es) a 1MB encontrado(s).`,
        action: 'Considera dividir en chunks más pequeños o lazy loading.',
        files: largeFiles.map(f => f.path),
      });
    }

    // Verificar dependencias pesadas
    if (dependencyAnalysis.heavyDependencies.length > 5) {
      recommendations.push({
        type: 'warning',
        message: 'Muchas dependencias pesadas detectadas.',
        action:
          'Revisa si todas las dependencias son necesarias en producción.',
        dependencies: dependencyAnalysis.heavyDependencies.slice(0, 5),
      });
    }

    return recommendations;
  }

  /**
   * Genera reporte en formato Markdown
   */
  generateMarkdownReport(report) {
    const markdownPath = path.join(this.reportsDir, 'BUNDLE_REPORT.md');

    let markdown = `# Bundle Monitoring Report\n\n`;
    markdown += `**Generated:** ${report.metadata.timestamp}\n`;
    markdown += `**Version:** ${report.metadata.version}\n`;
    markdown += `**Node Version:** ${report.metadata.nodeVersion}\n\n`;

    // Resumen del Bundle
    markdown += `## 📦 Bundle Summary\n\n`;
    markdown += `- **Total Size:** ${report.bundle.summary.totalSizeFormatted}\n`;
    markdown += `- **Total Files:** ${report.bundle.summary.totalFiles}\n`;
    markdown += `- **JavaScript Size:** ${report.bundle.summary.jsSize}\n`;
    markdown += `- **Source Maps Size:** ${report.bundle.summary.mapSize}\n\n`;

    // Comparación con anterior
    if (report.comparison) {
      markdown += `## 📊 Size Comparison\n\n`;
      const trend = report.comparison.trend;
      const emoji =
        trend === 'increased' ? '📈' : trend === 'decreased' ? '📉' : '➡️';

      markdown += `${emoji} **Size ${trend}** by ${report.comparison.difference} (${report.comparison.percentageChange}%)\n`;
      markdown += `- Previous: ${report.comparison.previousSize}\n`;
      markdown += `- Current: ${report.comparison.currentSize}\n\n`;
    }

    // Breakdown por tipo
    markdown += `## 📁 File Type Breakdown\n\n`;
    markdown += `| Type | Count | Size | Percentage |\n`;
    markdown += `|------|-------|------|------------|\n`;

    report.bundle.summary.typeBreakdown.forEach(type => {
      markdown += `| ${type.type || 'other'} | ${type.count} | ${type.size} | ${
        type.percentage
      }% |\n`;
    });
    markdown += `\n`;

    // Archivos más grandes
    markdown += `## 📋 Largest Files\n\n`;
    const largestFiles = report.bundle.files
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    markdown += `| File | Size |\n`;
    markdown += `|------|------|\n`;
    largestFiles.forEach(file => {
      markdown += `| ${file.path} | ${file.sizeFormatted} |\n`;
    });
    markdown += `\n`;

    // Dependencias
    markdown += `## 📦 Dependencies Analysis\n\n`;
    markdown += `- **Production Dependencies:** ${report.dependencies.dependencies}\n`;
    markdown += `- **Development Dependencies:** ${report.dependencies.devDependencies}\n`;

    if (report.dependencies.heavyDependencies.length > 0) {
      markdown += `\n**Heavy Dependencies:**\n`;
      report.dependencies.heavyDependencies.forEach(dep => {
        markdown += `- ${dep.name}@${dep.version}\n`;
      });
    }
    markdown += `\n`;

    // Size Limit Results
    if (report.sizeLimit && Array.isArray(report.sizeLimit)) {
      markdown += `## 📏 Size Limit Analysis\n\n`;
      markdown += `| Bundle | Size | Limit | Status |\n`;
      markdown += `|--------|------|-------|--------|\n`;

      report.sizeLimit.forEach(item => {
        const status = item.passed ? '✅ Pass' : '❌ Exceed';
        const sizeFormatted = this.formatBytes(item.size);
        const limitFormatted = this.formatBytes(item.limit);

        markdown += `| ${item.name} | ${sizeFormatted} | ${limitFormatted} | ${status} |\n`;
      });
      markdown += `\n`;
    } else if (report.sizeLimit && report.sizeLimit.error) {
      markdown += `## 📏 Size Limit Analysis\n\n`;
      markdown += `⚠️ **Size Limit Analysis Failed:** ${report.sizeLimit.error}\n\n`;
    }

    // Recomendaciones
    if (report.recommendations.length > 0) {
      markdown += `## 💡 Recommendations\n\n`;
      report.recommendations.forEach(rec => {
        const emoji =
          rec.type === 'warning' ? '⚠️' : rec.type === 'error' ? '❌' : 'ℹ️';
        markdown += `${emoji} **${rec.message}**\n`;
        markdown += `   *Action:* ${rec.action}\n\n`;
      });
    }

    fs.writeFileSync(markdownPath, markdown);
    console.log(`📄 Reporte Markdown generado: ${markdownPath}`);
  }

  /**
   * Obtiene la versión del proyecto
   */
  getProjectVersion() {
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(this.packageJsonPath, 'utf8')
      );
      return packageJson.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Formatea bytes a formato legible
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Genera alertas si hay problemas significativos
   */
  generateAlerts(report) {
    const alerts = [];

    // Alert por tamaño excesivo
    if (report.bundle.totalSize > 50 * 1024 * 1024) {
      // 50MB
      alerts.push({
        level: 'error',
        message: `Bundle size (${report.bundle.summary.totalSizeFormatted}) exceeds 50MB limit`,
      });
    }

    // Alert por crecimiento significativo
    if (
      report.comparison &&
      report.comparison.trend === 'increased' &&
      parseFloat(report.comparison.percentageChange) > 20
    ) {
      alerts.push({
        level: 'warning',
        message: `Bundle size increased by ${report.comparison.percentageChange}%`,
      });
    }

    return alerts;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const monitor = new BundleMonitor();

  try {
    const report = monitor.generateReport();
    const alerts = monitor.generateAlerts(report);

    console.log('\n✅ Bundle monitoring completado!');
    console.log(`📊 Tamaño total: ${report.bundle.summary.totalSizeFormatted}`);
    console.log(`📁 Archivos: ${report.bundle.summary.totalFiles}`);

    if (report.comparison) {
      const trend = report.comparison.trend;
      console.log(
        `📈 Tendencia: ${trend} (${report.comparison.percentageChange}%)`
      );
    }

    if (alerts.length > 0) {
      console.log('\n🚨 Alertas:');
      alerts.forEach(alert => {
        const emoji = alert.level === 'error' ? '❌' : '⚠️';
        console.log(`${emoji} ${alert.message}`);
      });
    }

    // Exit code basado en alertas
    const hasErrors = alerts.some(alert => alert.level === 'error');
    process.exit(hasErrors ? 1 : 0);
  } catch (error) {
    console.error('❌ Error en bundle monitoring:', error.message);
    process.exit(1);
  }
}

module.exports = BundleMonitor;
