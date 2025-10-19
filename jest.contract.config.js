/**
 * Jest Configuration for Contract Tests
 *
 * This configuration is specifically designed for contract tests that:
 * - Use MOCKS (fetchMock, jest.mock) instead of real services
 * - Test API contracts, interfaces, and data structures
 * - Run FAST without docker or external dependencies
 * - Validate input/output schemas and error handling
 *
 * Usage:
 *   npm run test:contract  (runs ONLY contract tests)
 *
 * Prerequisites:
 *   None - contract tests run standalone without external services
 *
 * Key Differences from Integration Tests:
 *   - No docker required
 *   - No real HTTP calls to microservices
 *   - Faster execution (seconds vs minutes)
 *   - Focus on contracts, not end-to-end flows
 */

module.exports = {
  displayName: 'contract',
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test patterns - Include ONLY contract tests
  testMatch: ['**/tests/contract/**/*.contract.test.ts'],

  moduleFileExtensions: ['ts', 'js', 'json'],

  // Shorter timeouts for fast mock-based tests
  testTimeout: 30000, // 30 seconds (contract tests should be fast)

  // Setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // TypeScript configuration
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        isolatedModules: true,
      },
    ],
  },

  // Allow parallel execution for faster test runs
  maxWorkers: '50%',

  // Coverage configuration (optional)
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/server.ts',
  ],

  // Module path aliases (if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output for debugging
  verbose: true,
};
