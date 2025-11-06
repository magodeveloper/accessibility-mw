// Configuración para pruebas de cobertura sin conflictos con Playwright
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
      },
    ],
  },
  maxWorkers: '50%',
  forceExit: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    // Exclude browser-related services from coverage to avoid Playwright conflicts
    '!src/services/browser.pool.service.ts',
    '!src/services/render.service.ts',
    '!src/services/axe.service.ts',
    '!src/services/prometheus.metrics.service.ts',
    '!src/server.ts',
    '!src/routes/bundle.route.ts',
    '!src/routes/health.route.ts',
    '!src/routes/analyze.route.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 87,
      lines: 88,
      statements: 88,
    },
  },
  // Exclude problematic test files that use Playwright extensively
  testPathIgnorePatterns: [
    '/node_modules/',
    'tests/integration/analyze.route.real.test.ts',
    'tests/integration/microservices.integration.test.ts',
    'tests/unit/browser.pool.coverage.test.ts',
    'tests/analyze.e2e.test.ts',
  ],
};
