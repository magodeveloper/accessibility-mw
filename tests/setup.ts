// Setup para tests de Jest
import { jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

// Aumentar el límite de listeners para evitar warnings en tests
// Esto es necesario porque pino-http y otros middlewares pueden registrar listeners automáticamente
process.setMaxListeners(20);

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
    )
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
    message.includes('Error al guardar error')
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

// Configuraciones adicionales para CI
if (process.env.CI) {
  // Timeout más largo para CI
  jest.setTimeout(60000);

  // Variables de entorno para CI
  process.env.PUPPETEER_ARGS =
    '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage';
  process.env.BYPASS_SSRF_VALIDATION_IN_DEV = 'false'; // Stricter validation in CI

  // Disable coverage instrumentation for browser evaluation context to avoid conflicts
  process.env.DISABLE_BROWSER_COVERAGE = 'true';
} else {
  // Solo configurar PLAYWRIGHT_BROWSERS_PATH en desarrollo local
  process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}
