// Configuración optimizada para CI con mejores prácticas de performance y cleanup
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Configuración de logging optimizada para CI
  verbose: !process.env.SUPPRESS_CI_LOGS,
  silent: process.env.SUPPRESS_CI_LOGS === 'true',

  // Timeouts optimizados
  testTimeout: parseInt(process.env.JEST_TIMEOUT) || 60000,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Configuración de transformación optimizada
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        isolatedModules: true, // Mejora performance
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  // Configuración de workers optimizada para CI
  maxWorkers: process.env.CI ? 2 : 1,
  maxConcurrency: 2,

  // Configuración de cleanup para evitar memory leaks
  forceExit: true,
  detectOpenHandles: true,
  logHeapUsage: process.env.CI === 'true',

  // Configuración de coverage condicional
  collectCoverage: process.env.COLLECT_COVERAGE === 'true',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,js}',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Configuración de cache
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Configuración de módulos
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // Ignorar patrones para mejor performance
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/.achecker_cache/',
  ],

  // Configuración específica por environment
  globalSetup: undefined,
  globalTeardown: undefined,

  // Error handling optimizado
  errorOnDeprecated: false,

  // Configuración de memoria para CI
  ...(process.env.CI && {
    bail: 1, // Parar en el primer fallo para CI más rápido
  }),
};
