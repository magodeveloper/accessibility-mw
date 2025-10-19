/**
 * Jest Configuration for Integration Tests
 *
 * This configuration automatically detects the environment:
 * - LOCAL: Uses mock HTTP servers (no Docker required)
 * - CI: Uses real docker-compose.ci.yml services
 *
 * Usage:
 *   npm run test:integration       (auto-detects: mocks in local, real in CI)
 *   USE_REAL_SERVICES=true npm run test:integration  (force real services)
 *
 * Prerequisites:
 *   Local: None (mocks start automatically)
 *   CI: Docker services must be running (docker-compose.ci.yml)
 */

module.exports = {
  displayName: 'integration',
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test patterns - Include ALL integration tests
  testMatch: ['**/tests/integration/**/*.test.ts'],

  moduleFileExtensions: ['ts', 'js', 'json'],

  // Extended timeouts for real service calls
  testTimeout: 180000, // 3 minutes (increased from 60s)

  // Global setup/teardown - Auto-detect and use mocks or real services
  globalSetup: '<rootDir>/tests/helpers/integration-setup.ts',
  globalTeardown: '<rootDir>/tests/helpers/integration-teardown.ts',

  // Setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // TypeScript configuration
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

  // Run tests serially to avoid service conflicts
  maxWorkers: 1,

  // Test environment options
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,

  // No coverage for integration tests (covered by unit tests)
  collectCoverage: false,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './TestResults',
        outputName: 'integration-test-results.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // Environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};
