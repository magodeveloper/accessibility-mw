/**
 * Dashboard API para Bundle Monitoring
 * Proporciona endpoints para visualizar reportes de bundle
 */

import express, { Request, Response, Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';

const router: Router = express.Router();

// Directorio de reportes
const REPORTS_DIR = path.join(__dirname, '../../reports/bundle');

interface BundleReport {
  metadata: {
    timestamp: string;
    version: string;
    nodeVersion: string;
    platform: string;
  };
  bundle: {
    summary: {
      totalSizeFormatted: string;
      totalFiles: number;
      jsSize: string;
      mapSize: string;
    };
    files: Array<{
      path: string;
      size: number;
      sizeFormatted: string;
      type: string;
    }>;
  };
  dependencies: {
    dependencies: number;
    devDependencies: number;
    heavyDependencies: Array<{
      name: string;
      version: string;
    }>;
  };
  sizeLimit?: Array<{
    name: string;
    size: number;
    limit: number;
    passed: boolean;
  }>;
  recommendations: Array<{
    type: string;
    message: string;
    action: string;
  }>;
  comparison?: {
    trend: string;
    percentageChange: string;
    difference: string;
  };
}

interface BundleStatus {
  timestamp: string;
  version: string;
  totalSize: string;
  totalFiles: number;
  jsSize: string;
  status: string;
  recommendations: number;
  alerts: string[];
}

/**
 * GET /api/bundle/status - Estado actual del bundle
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const latestReportPath = path.join(REPORTS_DIR, 'latest.json');

    if (!fs.existsSync(latestReportPath)) {
      return res.status(404).json({
        error: 'No bundle reports found',
        message: 'Run npm run bundle:monitor to generate a report',
      });
    }

    const report: BundleReport = JSON.parse(
      fs.readFileSync(latestReportPath, 'utf8')
    );

    // Extraer métricas clave
    const status: BundleStatus = {
      timestamp: report.metadata.timestamp,
      version: report.metadata.version,
      totalSize: report.bundle.summary.totalSizeFormatted,
      totalFiles: report.bundle.summary.totalFiles,
      jsSize: report.bundle.summary.jsSize,
      status: determineStatus(report),
      recommendations: report.recommendations.length,
      alerts: generateQuickAlerts(report),
    };

    res.json(status);
  } catch (error: unknown) {
    res.status(500).json({
      error: 'Failed to read bundle report',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /api/bundle/full - Reporte completo del bundle
 */
router.get('/full', (req: Request, res: Response) => {
  try {
    const latestReportPath = path.join(REPORTS_DIR, 'latest.json');

    if (!fs.existsSync(latestReportPath)) {
      return res.status(404).json({
        error: 'No bundle reports found',
        message: 'Run npm run bundle:monitor to generate a report',
      });
    }

    const report = JSON.parse(fs.readFileSync(latestReportPath, 'utf8'));
    res.json(report);
  } catch (error: unknown) {
    res.status(500).json({
      error: 'Failed to read bundle report',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /api/bundle/history - Historial de reportes
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(REPORTS_DIR)) {
      return res.json([]);
    }

    const files = fs
      .readdirSync(REPORTS_DIR)
      .filter(
        file => file.startsWith('bundle-report-') && file.endsWith('.json')
      )
      .sort()
      .reverse()
      .slice(0, 10); // Últimos 10 reportes

    const history = files.map(file => {
      const reportPath = path.join(REPORTS_DIR, file);
      const report: BundleReport = JSON.parse(
        fs.readFileSync(reportPath, 'utf8')
      );

      return {
        filename: file,
        timestamp: report.metadata.timestamp,
        version: report.metadata.version,
        totalSize: report.bundle.summary.totalSizeFormatted,
        totalFiles: report.bundle.summary.totalFiles,
        status: determineStatus(report),
      };
    });

    res.json(history);
  } catch (error: unknown) {
    res.status(500).json({
      error: 'Failed to read bundle history',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /api/bundle/analysis - Análisis detallado de archivos
 */
router.get('/analysis', (req: Request, res: Response) => {
  try {
    const latestReportPath = path.join(REPORTS_DIR, 'latest.json');

    if (!fs.existsSync(latestReportPath)) {
      return res.status(404).json({
        error: 'No bundle reports found',
      });
    }

    const report: BundleReport = JSON.parse(
      fs.readFileSync(latestReportPath, 'utf8')
    );

    // Análisis por categorías
    const categories = {
      routes: report.bundle.files.filter(f => f.path.includes('/routes/')),
      services: report.bundle.files.filter(f => f.path.includes('/services/')),
      utils: report.bundle.files.filter(f => f.path.includes('/utils/')),
      middlewares: report.bundle.files.filter(f =>
        f.path.includes('/middlewares/')
      ),
      other: report.bundle.files.filter(
        f =>
          !f.path.includes('/routes/') &&
          !f.path.includes('/services/') &&
          !f.path.includes('/utils/') &&
          !f.path.includes('/middlewares/')
      ),
    };

    const analysis = {
      categories: Object.entries(categories).map(([name, files]) => ({
        name,
        files: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        totalSizeFormatted: formatBytes(
          files.reduce((sum, f) => sum + f.size, 0)
        ),
        largestFile: [...files].sort((a, b) => b.size - a.size)[0] || null,
      })),
      largestFiles: [...report.bundle.files]
        .sort((a, b) => b.size - a.size)
        .slice(0, 10),
      sizeLimit: report.sizeLimit || null,
      recommendations: report.recommendations,
    };

    res.json(analysis);
  } catch (error: unknown) {
    res.status(500).json({
      error: 'Failed to analyze bundle',
      message: getErrorMessage(error),
    });
  }
});

/**
 * GET /api/bundle/dependencies - Análisis de dependencias
 */
router.get('/dependencies', (req: Request, res: Response) => {
  try {
    const latestReportPath = path.join(REPORTS_DIR, 'latest.json');

    if (!fs.existsSync(latestReportPath)) {
      return res.status(404).json({
        error: 'No bundle reports found',
      });
    }

    const report: BundleReport = JSON.parse(
      fs.readFileSync(latestReportPath, 'utf8')
    );

    res.json({
      summary: {
        production: report.dependencies.dependencies,
        development: report.dependencies.devDependencies,
        heavy: report.dependencies.heavyDependencies.length,
      },
      heavyDependencies: report.dependencies.heavyDependencies,
      recommendations: report.recommendations.filter(
        r =>
          r.message.toLowerCase().includes('dependencias') ||
          r.message.toLowerCase().includes('dependencies')
      ),
    });
  } catch (error: unknown) {
    res.status(500).json({
      error: 'Failed to analyze dependencies',
      message: getErrorMessage(error),
    });
  }
});

/**
 * POST /api/bundle/generate - Generar nuevo reporte
 */
router.post('/generate', (req: Request, res: Response) => {
  try {
    // En un entorno real, esto ejecutaría el bundle monitoring
    // Por ahora, solo verificamos si existe el script
    const scriptPath = path.join(__dirname, '../../scripts/bundle-monitor.js');

    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({
        error: 'Bundle monitor script not found',
      });
    }

    // Información sobre cómo generar un reporte
    res.json({
      message: 'To generate a new bundle report, run: npm run bundle:monitor',
      script: scriptPath,
      command: 'npm run bundle:monitor',
    });
  } catch (error: unknown) {
    res.status(500).json({
      error: 'Failed to check bundle monitor',
      message: getErrorMessage(error),
    });
  }
});

// === FUNCIONES AUXILIARES ===

/**
 * Determina el estado general del bundle
 */
function determineStatus(report: BundleReport): string {
  // Verificar si hay alertas críticas
  const criticalRecommendations = report.recommendations.filter(
    r => r.type === 'error'
  );
  if (criticalRecommendations.length > 0) {
    return 'critical';
  }

  // Verificar si hay advertencias
  const warnings = report.recommendations.filter(r => r.type === 'warning');
  if (warnings.length > 2) {
    return 'warning';
  }

  // Verificar tendencia si está disponible
  if (report.comparison) {
    if (report.comparison.trend === 'increased') {
      const percentageChange = parseFloat(report.comparison.percentageChange);
      if (percentageChange > 20) {
        return 'warning';
      }
    }
  }

  return 'healthy';
}

/**
 * Genera alertas rápidas para el dashboard
 */
function generateQuickAlerts(report: BundleReport): string[] {
  const alerts: string[] = [];

  // Verificar archivos muy grandes
  const largeFiles = report.bundle.files.filter(f => f.size > 1024 * 1024); // > 1MB
  if (largeFiles.length > 0) {
    alerts.push(`${largeFiles.length} archivo(s) mayor(es) a 1MB detectado(s)`);
  }

  // Verificar dependencias pesadas
  if (report.dependencies.heavyDependencies.length > 5) {
    alerts.push(
      `${report.dependencies.heavyDependencies.length} dependencias pesadas detectadas`
    );
  }

  // Verificar tendencia de crecimiento
  if (report.comparison && report.comparison.trend === 'increased') {
    const percentageChange = parseFloat(report.comparison.percentageChange);
    if (percentageChange > 10) {
      alerts.push(
        `Bundle creció ${report.comparison.percentageChange}% desde el último reporte`
      );
    }
  }

  // Verificar límites de size-limit
  if (report.sizeLimit && Array.isArray(report.sizeLimit)) {
    const exceeded = report.sizeLimit.filter(item => !item.passed);
    if (exceeded.length > 0) {
      alerts.push(`${exceeded.length} límite(s) de tamaño excedido(s)`);
    }
  }

  return alerts;
}

/**
 * Formatea bytes en formato legible
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extrae el mensaje de error de forma segura
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export default router;
