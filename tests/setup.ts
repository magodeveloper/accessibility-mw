// Setup para tests de Jest
process.env.NODE_ENV = 'test';

// Interceptar console.warn para filtrar warnings conocidos en tests
const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args.join(' ');

  // Filtrar warnings específicos que no queremos en tests
  if (
    message.includes('[withPage] Using legacy non-pooled browser') ||
    message.includes('Error closing idle browser') ||
    message.includes('Error closing browser during shutdown') ||
    message.includes('Error cleaning up page/context')
  ) {
    return; // Suprimir estos warnings en tests
  }

  // Mostrar otros warnings normalmente
  originalConsoleWarn.apply(console, args);
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
} else {
  // Solo configurar PLAYWRIGHT_BROWSERS_PATH en desarrollo local
  process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
}
