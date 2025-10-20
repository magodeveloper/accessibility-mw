// Configuración optimizada para CI con mejores prácticas de performance y cleanup
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Configuración de test patterns
  // Incluye tests unitarios, de contrato y de integración
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/contract/**/*.test.ts',
    '**/tests/integration/**/*.test.ts',
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
  maxWorkers: process.env.CI ? 2 : 1,
  maxConcurrency: 2,

  // Configuración de cleanup optimizada para CI
  // forceExit: true habilitado en comando CLI (npm test -- --forceExit)
  // No configurar aquí para mantener flexibilidad
  detectOpenHandles: false, // Desactivado en CI para evitar falsos positivos
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
