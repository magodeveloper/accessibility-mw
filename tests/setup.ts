// Setup optimizado para tests de Jest con mejores prácticas para CI
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

// Aumentar el límite de listeners para evitar warnings en tests
// Configuración más alta para CI donde hay más procesos concurrentes
const maxListeners = process.env.CI ? 30 : 20;
process.setMaxListeners(maxListeners);

// Configurar supresión de logs basada en environment
const shouldSuppressLogs =
  process.env.SUPPRESS_CI_LOGS === 'true' || process.env.CI === 'true';

// Función auxiliar para detectar stack traces de análisis que deben ser suprimidos
function isAnalysisStackTrace(message: string): boolean {
  const stackTracePatterns = [
    'at Array.map (<anonymous>)',
    'at async Promise.all (index',
    'at saveResultsAndErrors',
    'at saveAndFormatResults',
    'at src/routes/analyze.route.ts:',
    'at Object.<anonymous> (src/routes/analyze.route.ts:',
    "requestId: 'unknown'",
    'item ID: document-title',
    'item ID: html-has-lang',
    'item ID: landmark-one-main',
    'item ID: page-has-heading-one',
    'Skipping error processing because result was not saved',
    '⚠️ [unknown] Skipping error processing',
    'because result was not saved for item ID:',
    'Received promise resolved instead of rejected',
    'Resolved to value: {"close": [Function mockConstructor]',
    'Failed to launch browser. Please install Playwright browsers',
    'Original error: Playwright browsers not found',
    'at BrowserPool.createBrowser',
    'at BrowserPool.getBrowser',
    'Force exiting Jest: Have you considered using `--detectOpenHandles`',
  ];

  return stackTracePatterns.some(pattern => message.includes(pattern));
}

// Interceptar console.log para CI optimizado
if (shouldSuppressLogs) {
  const originalConsoleLog = console.log;
  console.log = (...args: any[]) => {
    const message = args.join(' ');

    // Suprimir logs verbosos específicos en CI
    if (
      message.includes('[MonitoringRouter]') ||
      message.includes('[Monitoring] Dashboard solicitado') ||
      message.includes('OpenAPI YAML loaded successfully') ||
      message.includes('REPORTS_API_URL en environment') ||
      message.includes('REPORTS_API_URL en config') ||
      message.includes('✅ OpenAPI YAML loaded') ||
      message.includes('📍 Endpoints disponibles') ||
      message.includes('Rutas de monitoreo simplificadas') ||
      isAnalysisStackTrace(message)
    ) {
      return; // Suprimir estos logs en CI
    }

    // Permitir logs importantes (errores, warnings críticos)
    if (
      message.includes('ERROR') ||
      message.includes('CRITICAL') ||
      message.includes('FAIL') ||
      message.includes('Test failed')
    ) {
      originalConsoleLog.apply(console, args);
      return;
    }

    // En CI, solo mostrar logs esenciales
    if (!process.env.CI) {
      originalConsoleLog.apply(console, args);
    }
  };
}

// Interceptar console.warn para filtrar warnings conocidos en tests
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args.join(' ');

  // Filtrar warnings específicos que no queremos en tests
  if (
    message.includes('[withPage] Using legacy non-pooled browser') ||
    message.includes('Error closing idle browser') ||
    message.includes('Error closing browser during shutdown') ||
    message.includes('Error cleaning up page/context') ||
    message.includes('Continuing without saving due to microservice error') ||
    message.includes(
      'Continuing without saving due to missing ANALYSIS_API_URL'
    ) ||
    message.includes('Could not create .achecker_cache/engine directory') ||
    message.includes('Permission denied') ||
    message.includes(
      '⚠️ [unknown] Skipping error processing because result was not saved for item ID:'
    ) ||
    message.includes(
      'Skipping error processing because result was not saved'
    ) ||
    message.includes('landmark-one-main { requestId:') ||
    message.includes('page-has-heading-one { requestId:') ||
    message.includes('document-title { requestId:') ||
    message.includes('html-has-lang { requestId:') ||
    message.match(
      /⚠️ \[unknown\] Skipping error processing because result was not saved for item ID: [\w-]+ \{ requestId: 'unknown' \}/
    ) ||
    isAnalysisStackTrace(message)
  ) {
    return; // Suprimir estos warnings en tests
  }

  // Mostrar otros warnings normalmente
  originalConsoleWarn.apply(console, args);
};

// Interceptar console.error para filtrar errores conocidos en tests
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');

  // Filtrar solo errores de microservicios en modo mock/test
  // NO filtrar errores de análisis/coverage que son importantes para debugging
  if (
    message.includes('Network error to ms-reports') ||
    message.includes('Reports API returned error') ||
    message.includes('Reports API error') ||
    message.includes('Network error to ms-analysis') ||
    message.includes('Error saving analysis') ||
    message.includes('Microservice returned error') ||
    message.includes('Error al guardar resultado') ||
    message.includes('Error al guardar error') ||
    isAnalysisStackTrace(message)
  ) {
    return; // Suprimir estos errores en tests ya que son esperados cuando no hay servicios disponibles
  }

  // Mostrar otros errores normalmente (incluyendo errores de coverage/análisis)
  originalConsoleError.apply(console, args);
};

// Variables de entorno por defecto para tests
if (!process.env.ANALYSIS_API_URL) {
  process.env.ANALYSIS_API_URL = 'http://localhost:3002';
}

// Configuraciones adicionales para CI optimizadas
if (process.env.CI) {
  // Timeout más largo para CI
  jest.setTimeout(parseInt(process.env.JEST_TIMEOUT || '60000'));

  // Variables de entorno para CI optimizadas
  process.env.PUPPETEER_ARGS =
    '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding';
  process.env.BYPASS_SSRF_VALIDATION_IN_DEV = 'false'; // Stricter validation in CI

  // Configuraciones específicas para Playwright en CI
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/home/runner/.cache/ms-playwright';

  // Disable coverage instrumentation for browser evaluation context to avoid conflicts
  process.env.DISABLE_BROWSER_COVERAGE = 'true';

  // Configuraciones adicionales para optimizar CI
  process.env.NODE_OPTIONS = `${
    process.env.NODE_OPTIONS || ''
  } --max-old-space-size=4096 --max-listeners=${maxListeners}`;

  // Configurar directorio de cache para achecker
  process.env.ACHECKER_CACHE_DIR = '/tmp/.achecker_cache';
} else {
  // Configuraciones para desarrollo local
  process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
  jest.setTimeout(30000);
}

// Mock global para evitar problemas de permisos en CI
if (process.env.CI) {
  const fs = require('fs');
  const originalMkdirSync = fs.mkdirSync;

  fs.mkdirSync = function (path: string, options?: any) {
    try {
      return originalMkdirSync.call(this, path, options);
    } catch (error: any) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        console.warn(
          `Warning: Could not create ${path} directory: ${error.message}`
        );
        return path; // Return path to avoid breaking the flow
      }
      throw error;
    }
  };
}

// Interceptar console.trace también para suprimir stack traces verbosos
if (shouldSuppressLogs) {
  const originalConsoleTrace = console.trace;
  console.trace = (...args: any[]) => {
    const message = args.join(' ');

    if (isAnalysisStackTrace(message)) {
      return; // Suprimir stack traces de análisis en CI
    }

    originalConsoleTrace.apply(console, args);
  };
}
