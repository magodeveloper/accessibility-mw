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

// Configuración para Playwright en tests
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';

// Configuraciones adicionales para CI
if (process.env.CI) {
  // Timeout más largo para CI
  jest.setTimeout(30000);

  // Variables de entorno para CI
  process.env.PUPPETEER_ARGS =
    '--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage';
  process.env.BYPASS_SSRF_VALIDATION_IN_DEV = 'false'; // Stricter validation in CI

  // Skip tests problemáticos en CI
  process.env.SKIP_BROWSER_TESTS = 'true';
  process.env.SKIP_EQUALACCESS_TESTS = 'true';
}
