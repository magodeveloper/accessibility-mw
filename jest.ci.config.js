// Configuración optimizada para CI con mejores prácticas de performance y cleanup
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Configuración de test patterns
  // SOLO tests unitarios y de contrato (rápidos, sin servicios externos)
  // Tests de integración se corren por separado con jest.integration.config.js
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/contract/**/*.test.ts',
  ],

  moduleFileExtensions: ['ts', 'js', 'json'],

  // Configuración de logging optimizada para CI (Fase 1: habilitar visibilidad)
  verbose: true,
  // silent removido en Fase 1 - mostrar errores completos en CI
  // silent: process.env.SUPPRESS_CI_LOGS === 'true',

  // Timeouts optimizados
  // Tests reales E2E requieren más tiempo (60s default, 90s para flujos completos)
  testTimeout: Number.parseInt(process.env.JEST_TIMEOUT) || 60000,

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
  // CRÍTICO: Usar 1 worker para evitar race conditions con mocks de Playwright y timers
  maxWorkers: 1,
  maxConcurrency: 1,

  // Configuración de cleanup optimizada para CI
  // forceExit habilitado en CLI para evitar hangs
  // No usar detectOpenHandles en CI - causa timeouts
  logHeapUsage: process.env.CI === 'true',
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

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
  coverageReporters: process.env.CI ? ['text', 'lcov'] : ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 69, // ✅ Alcanzado 69.06% (1029/1490) - Mejora de +4.34% desde 64.72%
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
    '<rootDir>/tests/unit/server.test.ts',
    '<rootDir>/tests/unit/analyze.route.advanced.test.ts',
    '<rootDir>/tests/unit/analyze.route.branches.test.ts',
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
