module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        // Disable coverage instrumentation for integration tests to avoid browser conflicts
        isolatedModules: true,
      },
    ],
  },
  maxWorkers: 1, // Single worker for integration tests
  forceExit: true,
  detectOpenHandles: true,
  collectCoverage: false, // Disable coverage for integration tests
  // No coverage configuration needed
};
