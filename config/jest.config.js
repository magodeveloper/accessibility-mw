module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.js'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '../',
  verbose: true,
  testTimeout: 30000, // Aumentar timeout a 30 segundos
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // Configuración adicional para TypeScript
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: {
          compilerOptions: {
            module: 'commonjs',
            target: 'es2020',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: false,
            skipLibCheck: true,
          },
        },
      },
    ],
    '^.+\\.js$': 'babel-jest',
  },
  // Configuración de módulos para evitar problemas ES/CommonJS
  extensionsToTreatAsEsm: [],
  // Ignorar node_modules excepto los paquetes que necesitan transformación
  transformIgnorePatterns: ['node_modules/(?!(supertest)/)'],
  // Configuración para manejo de puertos en tests
  maxWorkers: 1, // Ejecutar tests secuencialmente para evitar conflictos de puerto
  testSequencer: '<rootDir>/config/jest.sequencer.js',
  forceExit: true, // Forzar salida después de tests
  detectOpenHandles: true, // Detectar handles abiertos
  // Configuración de coverage
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
  ],
  coveragePathIgnorePatterns: ['node_modules', 'tests', 'coverage'],
  coverageProvider: 'babel', // Usar babel en lugar de v8 para mejor compatibilidad
};
