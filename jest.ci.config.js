// Configuración específica para CI que evita conflictos de coverage con Playwright
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        // Disable all coverage instrumentation to avoid browser context conflicts
        isolatedModules: true,
      },
    ],
  },
  maxWorkers: 1,
  forceExit: true,
  collectCoverage: false, // Disable coverage completely for CI integration tests
  coverageProvider: undefined,
};
