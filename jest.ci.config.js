// Configuración optimizada para CI con mejores prácticas de performance y cleanup
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Configuración de test patterns
  // Incluye tests reales (real-*.test.ts) que requieren servicios Docker
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/integration/**/*.test.ts',
  ],

  moduleFileExtensions: ['ts', 'js', 'json'],

  // Configuración de logging optimizada para CI (Fase 1: habilitar visibilidad)
  verbose: true,
  // silent removido en Fase 1 - mostrar errores completos en CI
  // silent: process.env.SUPPRESS_CI_LOGS === 'true',

  // Timeouts optimizados
  // Tests reales E2E requieren más tiempo (60s default, 90s para flujos completos)
  testTimeout: parseInt(process.env.JEST_TIMEOUT) || 60000,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Configuración de transformación optimizada
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  // Configuración de workers optimizada para CI
  maxWorkers: process.env.CI ? 2 : 1,
  maxConcurrency: 2,

  // Configuración de cleanup (Fase 1: remover forceExit para detectar leaks)
  // forceExit removido - permitir que Jest detecte handles abiertos y memory leaks
  // forceExit: true,
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
  moduleNameMapper: {
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
