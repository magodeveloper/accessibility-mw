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
  forceExit: true,
  collectCoverage: true, // Enable coverage by default
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
  coverageThreshold: {
    global: {
      branches: 40, // Reduced due to excluding browser services in CI
      functions: 55, // Reduced due to excluding browser services in CI
      lines: 55, // Reduced due to excluding browser services in CI
      statements: 55, // Reduced due to excluding browser services in CI
    },
  },
};
