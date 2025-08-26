import pino from 'pino';
import {
  advancedLogger,
  createRequestLogger,
  LogContext,
  LogLevel,
} from '../../src/services/logging.service';
import { FeatureFlags } from '../../src/utils/environment';

// Mock FeatureFlags
jest.mock('../../src/utils/environment', () => ({
  FeatureFlags: {
    isDevelopment: jest.fn(),
    isProduction: jest.fn(),
    verboseLogging: jest.fn(),
  },
}));

// Mock pino y pino-pretty
const mockPinoLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn(),
  flush: jest.fn(),
};

jest.mock('pino', () => jest.fn(() => mockPinoLogger));

// Mock console methods
const originalConsoleWarn = console.warn;
const mockConsoleWarn = jest.fn();

describe('Logging Service', () => {
  let mockFeatureFlags: jest.Mocked<typeof FeatureFlags>;

  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = mockConsoleWarn;

    mockFeatureFlags = FeatureFlags as jest.Mocked<typeof FeatureFlags>;
    mockFeatureFlags.isDevelopment.mockReturnValue(false);
    mockFeatureFlags.isProduction.mockReturnValue(true);
    mockFeatureFlags.verboseLogging.mockReturnValue(false);

    // Resetear el child logger mock
    mockPinoLogger.child.mockReturnValue(mockPinoLogger);
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('debe estar correctamente inicializado el servicio singleton', () => {
      expect(advancedLogger).toBeDefined();
      expect(typeof advancedLogger.info).toBe('function');
      expect(typeof advancedLogger.error).toBe('function');
      expect(typeof advancedLogger.debug).toBe('function');
    });

    it('debe configurar pino correctamente', () => {
      // El servicio ya está inicializado, solo verificamos que pino fue llamado
      expect(pino).toHaveBeenCalled();

      // Verificar que fue llamado con configuración base
      const mockPino = pino as jest.MockedFunction<typeof pino>;
      const pinoConfig = mockPino.mock.calls[0][0];
      expect(pinoConfig).toEqual(
        expect.objectContaining({
          level: expect.any(String),
          formatters: expect.objectContaining({
            level: expect.any(Function),
            bindings: expect.any(Function),
          }),
          timestamp: expect.any(Function),
          redact: expect.objectContaining({
            paths: expect.arrayContaining([
              'password',
              'token',
              'authorization',
              'cookie',
            ]),
            remove: true,
          }),
        })
      );
    });
  });

  describe('LogLevel enum', () => {
    it('debe tener los niveles correctos', () => {
      expect(LogLevel.TRACE).toBe(10);
      expect(LogLevel.DEBUG).toBe(20);
      expect(LogLevel.INFO).toBe(30);
      expect(LogLevel.WARN).toBe(40);
      expect(LogLevel.ERROR).toBe(50);
      expect(LogLevel.FATAL).toBe(60);
    });
  });

  describe('Request Context Management', () => {
    it('debe establecer y recuperar contexto de request', () => {
      const requestId = 'test-request-123';
      const context: Partial<LogContext> = {
        userId: 'user-456',
        operation: 'analysis',
        url: 'https://example.com',
      };

      advancedLogger.setRequestContext(requestId, context);
      const retrievedContext = advancedLogger.getRequestContext(requestId);

      expect(retrievedContext).toEqual({
        requestId,
        ...context,
      });
    });

    it('debe retornar undefined para contexto inexistente', () => {
      const context = advancedLogger.getRequestContext('nonexistent-request');

      expect(context).toBeUndefined();
    });

    it('debe limpiar contexto y performance trackers', () => {
      const requestId = 'test-request-cleanup';

      // Establecer contexto
      advancedLogger.setRequestContext(requestId, { operation: 'test' });

      // Iniciar performance tracking
      advancedLogger.startPerformanceTracking(requestId, 'operation1');
      advancedLogger.startPerformanceTracking(requestId, 'operation2');

      // Verificar que el contexto existe
      expect(advancedLogger.getRequestContext(requestId)).toBeDefined();

      // Limpiar contexto
      advancedLogger.cleanupContext(requestId);

      // Verificar que se limpió
      expect(advancedLogger.getRequestContext(requestId)).toBeUndefined();
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(() => {
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000000) // start time
        .mockReturnValueOnce(1001500); // end time (1500ms later)
    });

    it('debe iniciar y finalizar seguimiento de performance', () => {
      const requestId = 'perf-test-123';
      const operation = 'test-operation';
      const metadata = { tool: 'axe-core' };

      advancedLogger.startPerformanceTracking(requestId, operation, metadata);
      advancedLogger.endPerformanceTracking(requestId, operation, {
        statusCode: 200,
      });

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operation,
          duration: 1500,
          tool: 'axe-core',
          statusCode: 200,
          timestamp: expect.any(String),
          environment: process.env.NODE_ENV,
        }),
        `Operation completed: ${operation}`
      );
    });

    it('debe manejar finalización sin tracking iniciado', () => {
      const requestId = 'perf-test-no-start';
      const operation = 'missing-operation';

      // No debería hacer nada ni fallar
      expect(() => {
        advancedLogger.endPerformanceTracking(requestId, operation);
      }).not.toThrow();

      expect(mockPinoLogger.info).not.toHaveBeenCalled();
    });

    it('debe usar contexto de request en performance tracking', () => {
      const requestId = 'perf-context-test';
      const operation = 'operation-with-context';

      // Establecer contexto de request
      advancedLogger.setRequestContext(requestId, {
        userId: 'user-789',
        tool: 'equal-access',
      });

      advancedLogger.startPerformanceTracking(requestId, operation);
      advancedLogger.endPerformanceTracking(requestId, operation);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId,
          userId: 'user-789',
          tool: 'equal-access',
          operation,
          duration: 1500,
        }),
        expect.any(String)
      );
    });
  });

  describe('Basic Logging Methods', () => {
    const testCases = [
      { method: 'trace', level: 'trace' },
      { method: 'debug', level: 'debug' },
      { method: 'info', level: 'info' },
      { method: 'warn', level: 'warn' },
    ] as const;

    testCases.forEach(({ method, level }) => {
      it(`debe loggear ${level} correctamente`, () => {
        const message = `Test ${level} message`;
        const context = { requestId: 'test-123', operation: 'test' };

        (advancedLogger as any)[method](message, context);

        expect(mockPinoLogger[level]).toHaveBeenCalledWith(
          expect.objectContaining({
            ...context,
            timestamp: expect.any(String),
            environment: process.env.NODE_ENV,
          }),
          message
        );
      });
    });

    it('debe manejar logging sin contexto', () => {
      advancedLogger.info('Message without context');

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          environment: process.env.NODE_ENV,
        }),
        'Message without context'
      );
    });
  });

  describe('Error Logging', () => {
    it('debe loggear errores con información completa en desarrollo', () => {
      mockFeatureFlags.isDevelopment.mockReturnValue(true);

      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      (error as any).code = 'TEST_ERROR_CODE';

      const context = { requestId: 'error-test-123' };

      advancedLogger.error('Error occurred', context, error);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          ...context,
          error: {
            message: 'Test error',
            name: 'Error',
            stack: 'Error stack trace',
            code: 'TEST_ERROR_CODE',
          },
          timestamp: expect.any(String),
          environment: process.env.NODE_ENV,
        }),
        'Error occurred'
      );
    });

    it('debe loggear errores sin stack trace en producción', () => {
      mockFeatureFlags.isDevelopment.mockReturnValue(false);

      const error = new Error('Production error');
      error.stack = 'Error stack trace';

      advancedLogger.error('Error in production', {}, error);

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            message: 'Production error',
            name: 'Error',
            stack: undefined, // No stack trace en production
            code: undefined,
          },
        }),
        'Error in production'
      );
    });

    it('debe loggear fatal errors con stack trace siempre', () => {
      const error = new Error('Fatal error');
      error.stack = 'Fatal error stack trace';

      advancedLogger.fatal('Fatal error occurred', {}, error);

      expect(mockPinoLogger.fatal).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            message: 'Fatal error',
            name: 'Error',
            stack: 'Fatal error stack trace', // Stack trace siempre en fatal
            code: undefined,
          },
        }),
        'Fatal error occurred'
      );
    });

    it('debe manejar errores sin objeto Error', () => {
      advancedLogger.error('Error without error object');

      expect(mockPinoLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          environment: process.env.NODE_ENV,
        }),
        'Error without error object'
      );
    });
  });

  describe('Domain-Specific Logging', () => {
    describe('Analysis Logging', () => {
      it('debe loggear inicio de análisis', () => {
        const requestId = 'analysis-start-123';
        const tool = 'axe-core';
        const inputType = 'html';

        advancedLogger.logAnalysisStart(requestId, tool, inputType);

        expect(mockPinoLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId,
            tool,
            inputType,
            url: undefined,
          }),
          'Analysis started'
        );
      });

      it('debe loggear inicio de análisis con URL', () => {
        const requestId = 'analysis-url-123';
        const tool = 'equal-access';
        const inputType = 'url';
        const url = 'https://example.com';

        advancedLogger.logAnalysisStart(requestId, tool, inputType, url);

        expect(mockPinoLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId,
            tool,
            inputType,
            url,
          }),
          'Analysis started'
        );
      });

      it('debe loggear finalización de análisis', () => {
        const requestId = 'analysis-complete-123';
        const tool = 'axe-core';
        const results = { violations: 5, passed: 10 };
        const cacheHit = true;

        // Mock para performance tracking
        jest
          .spyOn(Date, 'now')
          .mockReturnValueOnce(1000000)
          .mockReturnValueOnce(1002000);

        // Iniciar tracking primero
        advancedLogger.startPerformanceTracking(requestId, 'analysis', {
          tool,
        });

        advancedLogger.logAnalysisComplete(requestId, tool, results, cacheHit);

        expect(mockPinoLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            tool,
            violationCount: 5,
            passedCount: 10,
            cacheHit: true,
            operation: 'analysis',
            duration: 2000,
          }),
          'Operation completed: analysis'
        );
      });
    });

    describe('Cache Logging', () => {
      it('debe loggear cache hit', () => {
        const requestId = 'cache-hit-123';
        const cacheKey =
          'very-long-cache-key-that-should-be-truncated-for-logging-purposes-because-it-is-too-long';

        advancedLogger.logCacheHit(requestId, cacheKey);

        expect(mockPinoLogger.debug).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId,
            cacheKey: expect.stringMatching(/^.{50}\.\.\.$/), // Truncated to 50 chars + ...
            cacheHit: true,
          }),
          'Cache hit'
        );
      });

      it('debe loggear cache miss', () => {
        const requestId = 'cache-miss-123';
        const cacheKey = 'short-key';

        advancedLogger.logCacheMiss(requestId, cacheKey);

        expect(mockPinoLogger.debug).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId,
            cacheKey: 'short-key...',
            cacheHit: false,
          }),
          'Cache miss'
        );
      });
    });

    describe('Security Event Logging', () => {
      it('debe loggear evento de rate limiting', () => {
        const requestId = 'security-123';
        const details = {
          ip: '192.168.1.1',
          userAgent: 'Test Agent',
          url: '/api/analyze',
          reason: 'Too many requests',
        };

        advancedLogger.logSecurityEvent('rate_limit', requestId, details);

        expect(mockPinoLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId,
            securityEventType: 'rate_limit',
            ...details,
          }),
          'Security event: rate_limit'
        );
      });

      it('debe loggear evento de validación', () => {
        const requestId = 'validation-fail-123';
        const details = { url: 'invalid-url', reason: 'Malformed URL' };

        advancedLogger.logSecurityEvent(
          'validation_failure',
          requestId,
          details
        );

        expect(mockPinoLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            requestId,
            securityEventType: 'validation_failure',
            ...details,
          }),
          'Security event: validation_failure'
        );
      });
    });

    describe('Health Check Logging', () => {
      it('debe loggear health check exitoso', () => {
        const component = 'database';
        const duration = 150;

        advancedLogger.logHealthCheck(component, 'healthy', duration);

        expect(mockPinoLogger.debug).toHaveBeenCalledWith(
          expect.objectContaining({
            component,
            healthStatus: 'healthy',
            duration,
          }),
          'Health check passed: database'
        );
      });

      it('debe loggear health check fallido', () => {
        const component = 'external-api';
        const duration = 5000;
        const error = new Error('Connection timeout');

        advancedLogger.logHealthCheck(component, 'unhealthy', duration, error);

        expect(mockPinoLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            component,
            healthStatus: 'unhealthy',
            duration,
            error: expect.objectContaining({
              message: 'Connection timeout',
              name: 'Error',
            }),
          }),
          'Health check failed: external-api'
        );
      });
    });
  });

  describe('Child Logger', () => {
    it('debe crear child logger con contexto persistente', () => {
      const context = {
        requestId: 'child-123',
        operation: 'child-operation',
      };

      const childLogger = advancedLogger.child(context);

      expect(mockPinoLogger.child).toHaveBeenCalledWith(context);
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });

  describe('Utility Methods', () => {
    it('debe flush logs', () => {
      advancedLogger.flush();

      expect(mockPinoLogger.flush).toHaveBeenCalled();
    });

    it('debe retornar raw logger', () => {
      const rawLogger = advancedLogger.getRawLogger();

      expect(rawLogger).toBe(mockPinoLogger);
    });
  });

  describe('Factory Functions', () => {
    it('debe crear request logger con contexto inicial', () => {
      const requestId = 'factory-test-123';
      const initialContext = {
        userId: 'user-456',
        operation: 'factory-operation',
      };

      const requestLogger = createRequestLogger(requestId, initialContext);

      expect(mockPinoLogger.child).toHaveBeenCalledWith({
        requestId,
        ...initialContext,
      });
      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');

      // Verificar que se estableció el contexto
      const storedContext = advancedLogger.getRequestContext(requestId);
      expect(storedContext).toEqual({
        requestId,
        ...initialContext,
      });
    });

    it('debe crear request logger sin contexto inicial', () => {
      const requestId = 'factory-simple-123';

      const requestLogger = createRequestLogger(requestId);

      expect(mockPinoLogger.child).toHaveBeenCalledWith({ requestId });
      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });
  });

  describe('Context Integration', () => {
    it('debe usar contexto de request en logs cuando está disponible', () => {
      const requestId = 'context-integration-123';
      const requestContext = {
        userId: 'user-integration-456',
        operation: 'test-operation',
      };
      const logContext = {
        requestId,
        additionalData: 'test-data',
      };

      // Establecer contexto de request
      advancedLogger.setRequestContext(requestId, requestContext);

      // Log con contexto que incluye requestId
      advancedLogger.info('Test message with context', logContext);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId,
          userId: 'user-integration-456',
          operation: 'test-operation',
          additionalData: 'test-data',
          timestamp: expect.any(String),
          environment: process.env.NODE_ENV,
        }),
        'Test message with context'
      );
    });

    it('debe manejar nivel de log desconocido con fallback a info', () => {
      const message = 'Unknown level message';
      const context = { requestId: 'unknown-level-123' };

      // Llamar método privado log directamente con nivel inválido
      (advancedLogger as any).log('unknown', message, context);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          ...context,
          timestamp: expect.any(String),
          environment: process.env.NODE_ENV,
        }),
        message
      );
    });
  });

  describe('Edge Cases y Error Handling', () => {
    it('debe manejar contexto null o undefined', () => {
      expect(() => {
        advancedLogger.info('Message with null context', null as any);
      }).not.toThrow();

      expect(() => {
        advancedLogger.info('Message with undefined context', undefined);
      }).not.toThrow();

      expect(mockPinoLogger.info).toHaveBeenCalledTimes(2);
    });

    it('debe manejar errores en enrichedContext', () => {
      // Mock Date.toISOString para lanzar error
      const originalDateProto = Date.prototype.toISOString;
      Date.prototype.toISOString = jest.fn(() => {
        throw new Error('Date error');
      });

      // No debería fallar
      expect(() => {
        advancedLogger.info('Test message');
      }).not.toThrow();

      // Restaurar
      Date.prototype.toISOString = originalDateProto;
    });

    it('debe manejar performance tracking con metadata complex', () => {
      const requestId = 'complex-metadata-123';
      const operation = 'complex-operation';
      const complexMetadata = {
        nested: { object: { with: 'values' } },
        array: [1, 2, 3],
        number: 42,
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
      };

      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(1000000)
        .mockReturnValueOnce(1001000);

      advancedLogger.startPerformanceTracking(
        requestId,
        operation,
        complexMetadata
      );
      advancedLogger.endPerformanceTracking(requestId, operation);

      expect(mockPinoLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operation,
          duration: 1000,
          ...complexMetadata,
        }),
        `Operation completed: ${operation}`
      );
    });
  });
});
