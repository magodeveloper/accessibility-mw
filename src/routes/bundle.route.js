/**
 * Dashboard API para Bundle Monitoring
 * Proporciona endpoints para visualizar reportes de bundle
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Directorio de reportes
const REPORTS_DIR = path.join(__dirname, '../../reports/bundle');

/**
 * GET /api/bundle/status - Estado actual del bundle
 */
router.get('/status', (req, res) => {
  try {
    const latestReportPath = path.join(REPORTS_DIR, 'latest.json');

    if (!fs.existsSync(latestReportPath)) {
      return res.status(404).json({
        error: 'No bundle reports found',
        message: 'Run npm run bundle:monitor to generate a report',
      });
    }

    const report = JSON.parse(fs.readFileSync(latestReportPath, 'utf8'));

    // Extraer métricas clave
    const status = {
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
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read bundle report',
      message: error.message,
    });
  }
});

/**
 * GET /api/bundle/report - Reporte completo
 */
router.get('/report', (req, res) => {
  try {
    const latestReportPath = path.join(REPORTS_DIR, 'latest.json');

    if (!fs.existsSync(latestReportPath)) {
      return res.status(404).json({
        error: 'No bundle reports found',
      });
    }

    const report = JSON.parse(fs.readFileSync(latestReportPath, 'utf8'));
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read bundle report',
      message: error.message,
    });
  }
});

/**
 * GET /api/bundle/history - Historial de reportes
 */
router.get('/history', (req, res) => {
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
      .reverse() // Más recientes primero
      .slice(0, 10); // Últimos 10 reportes

    const history = files
      .map(file => {
        try {
          const filePath = path.join(REPORTS_DIR, file);
          const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          return {
            filename: file,
            timestamp: report.metadata.timestamp,
            version: report.metadata.version,
            totalSize: report.bundle.summary.totalSizeFormatted,
            totalFiles: report.bundle.summary.totalFiles,
            status: determineStatus(report),
          };
        } catch (err) {
          return null;
        }
      })
      .filter(Boolean);

    res.json(history);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read bundle history',
      message: error.message,
    });
  }
});

/**
 * GET /api/bundle/trends - Tendencias de tamaño
 */
router.get('/trends', (req, res) => {
  try {
    if (!fs.existsSync(REPORTS_DIR)) {
      return res.json({ data: [], labels: [] });
    }

    const files = fs
      .readdirSync(REPORTS_DIR)
      .filter(
        file => file.startsWith('bundle-report-') && file.endsWith('.json')
      )
      .sort()
      .slice(-20); // Últimos 20 reportes

    const trends = {
      labels: [],
      data: {
        totalSize: [],
        jsSize: [],
        fileCount: [],
      },
    };

    files.forEach(file => {
      try {
        const filePath = path.join(REPORTS_DIR, file);
        const report = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        trends.labels.push(
          new Date(report.metadata.timestamp).toLocaleDateString()
        );
        trends.data.totalSize.push(report.bundle.totalSize);
        trends.data.jsSize.push(
          report.bundle.files
            .filter(f => f.type === '.js')
            .reduce((sum, f) => sum + f.size, 0)
        );
        trends.data.fileCount.push(report.bundle.summary.totalFiles);
      } catch (err) {
        // Ignorar archivos con errores
      }
    });

    res.json(trends);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate trends',
      message: error.message,
    });
  }
});

/**
 * GET /api/bundle/dashboard - Dashboard HTML
 */
router.get('/dashboard', (req, res) => {
  const dashboardHtml = generateDashboardHtml();
  res.send(dashboardHtml);
});

/**
 * Determina el estado basado en el reporte
 */
function determineStatus(report) {
  const totalSizeMB = report.bundle.totalSize / (1024 * 1024);

  if (totalSizeMB > 50) return 'critical';
  if (totalSizeMB > 25) return 'warning';
  if (report.recommendations.some(r => r.type === 'error')) return 'error';
  if (report.recommendations.some(r => r.type === 'warning')) return 'warning';
  return 'healthy';
}

/**
 * Genera alertas rápidas
 */
function generateQuickAlerts(report) {
  const alerts = [];
  const totalSizeMB = report.bundle.totalSize / (1024 * 1024);

  if (totalSizeMB > 25) {
    alerts.push({
      level: totalSizeMB > 50 ? 'critical' : 'warning',
      message: `Bundle size is ${totalSizeMB.toFixed(1)}MB`,
    });
  }

  if (report.comparison && report.comparison.trend === 'increased') {
    const change = parseFloat(report.comparison.percentageChange);
    if (change > 10) {
      alerts.push({
        level: 'warning',
        message: `Size increased by ${change.toFixed(1)}%`,
      });
    }
  }

  return alerts;
}

/**
 * Genera HTML del dashboard
 */
function generateDashboardHtml() {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bundle Monitoring Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        header {
            background: linear-gradient(45deg, #2c3e50, #34495e);
            color: white;
            padding: 30px;
            text-align: center;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        .subtitle {
            opacity: 0.8;
            font-size: 1.1rem;
        }
        .dashboard {
            padding: 30px;
        }
        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        .card h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.2rem;
        }
        .metric {
            font-size: 2rem;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 5px;
        }
        .status {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            text-align: center;
            margin: 10px 0;
        }
        .status.healthy { background: #2ecc71; color: white; }
        .status.warning { background: #f39c12; color: white; }
        .status.critical { background: #e74c3c; color: white; }
        .status.error { background: #e74c3c; color: white; }
        .actions {
            display: flex;
            gap: 15px;
            margin-top: 30px;
            flex-wrap: wrap;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: #3498db;
            color: white;
        }
        .btn-primary:hover {
            background: #2980b9;
        }
        .btn-success {
            background: #2ecc71;
            color: white;
        }
        .btn-success:hover {
            background: #27ae60;
        }
        .loading {
            text-align: center;
            padding: 50px;
            color: #7f8c8d;
        }
        .error {
            text-align: center;
            padding: 50px;
            color: #e74c3c;
        }
        footer {
            background: #ecf0f1;
            padding: 20px;
            text-align: center;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📦 Bundle Monitoring</h1>
            <p class="subtitle">Dashboard de Monitoreo de Bundle Size</p>
        </header>
        
        <div class="dashboard">
            <div id="content" class="loading">
                <h3>Cargando datos del bundle...</h3>
            </div>
        </div>
        
        <footer>
            <p>Bundle Monitoring Dashboard - Actualizado automáticamente</p>
        </footer>
    </div>

    <script>
        async function loadDashboard() {
            try {
                const response = await fetch('/api/bundle/status');
                const data = await response.json();
                
                if (response.ok) {
                    renderDashboard(data);
                } else {
                    renderError(data.message || 'Error al cargar datos');
                }
            } catch (error) {
                renderError('No se pudo conectar con el servidor');
            }
        }
        
        function renderDashboard(data) {
            const content = document.getElementById('content');
            content.innerHTML = \`
                <div class="cards">
                    <div class="card">
                        <h3>📊 Tamaño Total</h3>
                        <div class="metric">\${data.totalSize}</div>
                        <p>Archivos: \${data.totalFiles}</p>
                    </div>
                    <div class="card">
                        <h3>🚀 JavaScript</h3>
                        <div class="metric">\${data.jsSize}</div>
                        <p>Bundle principal</p>
                    </div>
                    <div class="card">
                        <h3>📈 Estado</h3>
                        <div class="status \${data.status}">
                            \${data.status.toUpperCase()}
                        </div>
                        <p>Recomendaciones: \${data.recommendations}</p>
                    </div>
                    <div class="card">
                        <h3>⏰ Última Actualización</h3>
                        <div class="metric">\${new Date(data.timestamp).toLocaleDateString()}</div>
                        <p>Versión: \${data.version}</p>
                    </div>
                </div>
                
                <div class="actions">
                    <a href="/api/bundle/report" class="btn btn-primary" target="_blank">
                        📋 Ver Reporte Completo
                    </a>
                    <a href="/api/bundle/history" class="btn btn-primary" target="_blank">
                        📊 Ver Historial
                    </a>
                    <button class="btn btn-success" onclick="refreshData()">
                        🔄 Actualizar Datos
                    </button>
                </div>
            \`;
        }
        
        function renderError(message) {
            const content = document.getElementById('content');
            content.innerHTML = \`
                <div class="error">
                    <h3>❌ Error</h3>
                    <p>\${message}</p>
                    <div class="actions">
                        <button class="btn btn-primary" onclick="loadDashboard()">
                            🔄 Reintentar
                        </button>
                    </div>
                </div>
            \`;
        }
        
        function refreshData() {
            document.getElementById('content').innerHTML = \`
                <div class="loading">
                    <h3>Actualizando datos...</h3>
                </div>
            \`;
            loadDashboard();
        }
        
        // Cargar dashboard al iniciar
        loadDashboard();
        
        // Auto-refresh cada 30 segundos
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>
  `;
}

module.exports = router;
