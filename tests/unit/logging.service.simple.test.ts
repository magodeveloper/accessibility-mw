// Mock pino first, before any imports
const mockLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn().mockReturnValue({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  }),
  level: 'info',
};

const mockPino = jest.fn(() => mockLogger) as any;
mockPino.stdTimeFunctions = {
  isoTime: ',"time":"%s"',
};

jest.mock('pino', () => mockPino);

// Mock feature flags first
jest.mock('../../src/utils/environment', () => ({
  FeatureFlags: {
    isDevelopment: () => true,
    isProduction: () => false,
    verboseLogging: () => false,
  },
}));

import {
  advancedLogger,
  createRequestLogger,
} from '../../src/services/logging.service';

describe('Logging Service - Basic Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('debería estar disponible e inicializado', () => {
      expect(advancedLogger).toBeDefined();
      expect(typeof advancedLogger.info).toBe('function');
      expect(typeof advancedLogger.error).toBe('function');
    });
  });

  describe('Basic Logging', () => {
    it('debería loggear mensajes info', () => {
      const message = 'Test info message';
      const context = { key: 'value' };

      advancedLogger.info(message, context);

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('debería loggear mensajes de error', () => {
      const message = 'Test error message';
      const error = new Error('Test error');

      advancedLogger.error(message, { requestId: 'test' }, error);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('debería manejar todos los niveles de log', () => {
      const message = 'Test message';
      const context = { requestId: 'test' };

      advancedLogger.trace(message, context);
      advancedLogger.debug(message, context);
      advancedLogger.info(message, context);
      advancedLogger.warn(message, context);
      advancedLogger.error(message, context);
      advancedLogger.fatal(message, context);

      expect(mockLogger.trace).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.fatal).toHaveBeenCalled();
    });
  });

  describe('Context and Child Loggers', () => {
    it('debería crear child logger', () => {
      const bindings = { component: 'test', requestId: 'test-123' };

      const childLogger = advancedLogger.child(bindings);

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
      expect(mockLogger.child).toHaveBeenCalledWith(bindings);
    });

    it('debería crear request logger usando factory function', () => {
      const requestId = 'test-request-123';
      const context = { userId: 'user1' };

      const requestLogger = createRequestLogger(requestId, context);

      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
    });
  });

  describe('Domain-Specific Methods', () => {
    it('debería manejar domain-specific logging methods', () => {
      const requestId = 'analysis-123';

      // Test that methods exist and don't throw
      expect(() => {
        advancedLogger.logAnalysisStart(
          requestId,
          'axe-core',
          'html',
          'https://example.com'
        );
      }).not.toThrow();

      expect(() => {
        advancedLogger.logAnalysisComplete(
          requestId,
          'axe-core',
          { violations: 5, passed: 10 },
          false
        );
      }).not.toThrow();

      expect(() => {
        advancedLogger.logCacheHit(requestId, 'cache-key-123');
      }).not.toThrow();

      expect(() => {
        advancedLogger.logSecurityEvent('rate_limit', requestId, {
          ip: '127.0.0.1',
        });
      }).not.toThrow();

      expect(() => {
        advancedLogger.logHealthCheck('database', 'healthy', 45);
      }).not.toThrow();
    });
  });

  describe('Context Management', () => {
    it('debería manejar context management methods', () => {
      const requestId = 'test-request-123';
      const context = { userId: 'user1', sessionId: 'session1' };

      // Should not throw
      expect(() => {
        advancedLogger.setRequestContext(requestId, context);
      }).not.toThrow();

      expect(() => {
        const retrievedContext = advancedLogger.getRequestContext(requestId);
        expect(retrievedContext).toEqual(expect.any(Object));
      }).not.toThrow();

      expect(() => {
        advancedLogger.cleanupContext(requestId);
      }).not.toThrow();
    });
  });

  describe('Performance Tracking', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1000);
    });

    afterEach(() => {
      (Date.now as jest.Mock).mockRestore();
    });

    it('debería manejar performance tracking', () => {
      const requestId = 'test-request';
      const operation = 'test-operation';

      expect(() => {
        advancedLogger.startPerformanceTracking(requestId, operation, {
          metadata: 'test',
        });
      }).not.toThrow();

      // Move time forward
      (Date.now as jest.Mock).mockReturnValue(2000);

      expect(() => {
        advancedLogger.endPerformanceTracking(requestId, operation, {
          additional: 'context',
        });
      }).not.toThrow();
    });
  });

  describe('Advanced Features', () => {
    it('debería tener métodos utilitarios', () => {
      expect(typeof advancedLogger.flush).toBe('function');
      expect(typeof advancedLogger.getRawLogger).toBe('function');
    });

    it('debería obtener raw logger', () => {
      const rawLogger = advancedLogger.getRawLogger();
      expect(rawLogger).toBe(mockLogger);
    });
  });

  describe('Edge Cases', () => {
    it('debería manejar logging básico sin contexto', () => {
      expect(() => {
        advancedLogger.info('Message without context');
        advancedLogger.error('Error without context');
        advancedLogger.warn('Warning without context');
      }).not.toThrow();
    });

    it('debería manejar objetos complejos como contexto', () => {
      const complexObject = {
        nested: { data: 'value' },
        array: [1, 2, 3],
        date: new Date(),
        number: 42,
        boolean: true,
        requestId: 'test-123',
      };

      expect(() => {
        advancedLogger.info('Complex object', complexObject);
      }).not.toThrow();
    });

    it('debería manejar strings vacíos y contextos vacíos', () => {
      expect(() => {
        advancedLogger.info('Message with empty context', {});
        advancedLogger.info('Empty message', { requestId: 'test' });
      }).not.toThrow();
    });

    it('debería manejar cache miss logging', () => {
      const requestId = 'cache-test';
      const cacheKey = 'test-cache-key';

      expect(() => {
        advancedLogger.logCacheMiss(requestId, cacheKey);
      }).not.toThrow();
    });
  });
});
