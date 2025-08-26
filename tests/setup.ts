// Setup para tests de Jest
process.env.NODE_ENV = 'test';

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
}
