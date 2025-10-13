// Habilitar cobertura solo en CI o cuando se pida explícitamente
const isCI = !!process.env.CI;
const collect = process.env.COLLECT_COVERAGE === 'true' || isCI;

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: process.env.CI ? 60000 : 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        // Disable coverage instrumentation for files that will be evaluated in browser context
        coveragePathIgnorePatterns: process.env.CI
          ? [
              '/node_modules/',
              '/tests/',
              'browser.pool.service.ts',
              'render.service.ts',
            ]
          : ['/node_modules/', '/tests/'],
      },
    ],
  },
  maxWorkers: process.env.CI ? 1 : '50%',
  // forceExit removido en Fase 1 - permitir que Jest detecte handles abiertos
  // forceExit: true,
  collectCoverage: collect, // Solo cubrir en CI o cuando COLLECT_COVERAGE=true
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    // Exclude browser-related services from coverage when running in CI to avoid conflicts
    ...(process.env.CI
      ? [
          '!src/services/browser.pool.service.ts',
          '!src/services/render.service.ts',
        ]
      : []),
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: collect
    ? {
        global: {
          branches: 40, // Reduced due to excluding browser services in CI
          functions: 55, // Reduced due to excluding browser services in CI
          lines: 55, // Reduced due to excluding browser services in CI
          statements: 55, // Reduced due to excluding browser services in CI
        },
      }
    : undefined,
};
