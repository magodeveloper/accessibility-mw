import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { NextFunction, Request, Response } from 'express';
import { ENV } from '../../src/utils/environment';

// Mock express-rate-limit to capture configuration
let capturedConfig: any = null;

jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: jest.fn((config: any) => {
    capturedConfig = config;
    // Return a mock middleware function
    const middleware = jest.fn(
      (req: Request, res: Response, next: NextFunction) => {
        // Simulate rate limiting behavior
        if (config.skip && config.skip(req)) {
          return next();
        }

        // If we reach here, we're testing the handler
        if (config.handler) {
          // Set mock headers
          (res as any).getHeader = jest
            .fn()
            .mockReturnValueOnce('100') // RateLimit-Limit
            .mockReturnValueOnce('0') // RateLimit-Remaining
            .mockReturnValueOnce('1640995200') // RateLimit-Reset
            .mockReturnValueOnce('60'); // Retry-After

          return config.handler(req, res);
        }

        return next();
      }
    );

    // Attach config for testing access (use any to bypass TypeScript)
    (middleware as any)._config = config;
    return middleware;
  }),
}));

describe('Rate Limit Middleware', () => {
  // Store original environment values
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEnforceRateLimit = process.env.ENFORCE_RATE_LIMIT;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    capturedConfig = null;
  });

  afterEach(() => {
    // Restore original environment values
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ENFORCE_RATE_LIMIT = originalEnforceRateLimit;
  });

  describe('Rate Limiter Configuration', () => {
    it('debe exportar generalLimiter como función middleware', () => {
      const { generalLimiter } = require('../../src/middlewares/rateLimit');

      expect(generalLimiter).toBeDefined();
      expect(typeof generalLimiter).toBe('function');
      expect((generalLimiter as any)._config).toBeDefined();
      expect((generalLimiter as any)._config.max).toBe(
        ENV.RATE_LIMIT_MAX_REQUESTS
      );
      expect((generalLimiter as any)._config.windowMs).toBe(
        ENV.RATE_LIMIT_WINDOW_MS
      );
    });

    it('debe exportar analyzeLimiter como función middleware', () => {
      const { analyzeLimiter } = require('../../src/middlewares/rateLimit');

      expect(analyzeLimiter).toBeDefined();
      expect(typeof analyzeLimiter).toBe('function');
      expect((analyzeLimiter as any)._config).toBeDefined();
      expect((analyzeLimiter as any)._config.max).toBe(
        ENV.ANALYZE_RATE_LIMIT_MAX
      );
      expect((analyzeLimiter as any)._config.windowMs).toBe(
        ENV.RATE_LIMIT_WINDOW_MS
      );
    });

    it('debe configurar diferentes límites para general y analyze', () => {
      const {
        generalLimiter,
        analyzeLimiter,
      } = require('../../src/middlewares/rateLimit');

      expect((generalLimiter as any)._config.max).toBe(100);
      expect((analyzeLimiter as any)._config.max).toBe(20);
      expect((generalLimiter as any)._config.max).not.toBe(
        (analyzeLimiter as any)._config.max
      );
    });

    it('debe usar la misma configuración base para ambos limiters', () => {
      const {
        generalLimiter,
        analyzeLimiter,
      } = require('../../src/middlewares/rateLimit');

      const generalConfig = (generalLimiter as any)._config;
      const analyzeConfig = (analyzeLimiter as any)._config;

      expect(generalConfig.windowMs).toBe(analyzeConfig.windowMs);
      expect(generalConfig.standardHeaders).toBe(analyzeConfig.standardHeaders);
      expect(generalConfig.legacyHeaders).toBe(analyzeConfig.legacyHeaders);
      expect(generalConfig.validate.trustProxy).toBe(
        analyzeConfig.validate.trustProxy
      );
    });
  });

  describe('Skip Rate Limit Logic', () => {
    let skipFunction: (req: Request) => boolean;

    beforeEach(() => {
      // Set default environment for most tests
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_RATE_LIMIT = 'true';

      const { generalLimiter } = require('../../src/middlewares/rateLimit');
      skipFunction = (generalLimiter as any)._config.skip;
    });

    it('debe saltarse rate limiting para rutas de sistema', () => {
      const testCases = [
        { path: '/health', expected: true },
        { path: '/api/docs', expected: true },
        { path: '/api/docs/swagger', expected: true },
        { path: '/metrics', expected: true },
      ];

      testCases.forEach(({ path, expected }) => {
        const testRequest = { path } as unknown as Request;
        const result = skipFunction(testRequest);
        expect(result).toBe(expected);
      });
    });

    it('debe saltarse rate limiting en environment de test', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();

      const { generalLimiter } = require('../../src/middlewares/rateLimit');
      const skipFunction = (generalLimiter as any)._config.skip;

      const testRequest = { path: '/api/analyze' } as unknown as Request;
      const result = skipFunction(testRequest);

      expect(result).toBe(true);
    });

    it('debe saltarse rate limiting cuando está deshabilitado', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_RATE_LIMIT = 'false';
      jest.resetModules();

      const { generalLimiter } = require('../../src/middlewares/rateLimit');
      const skipFunction = (generalLimiter as any)._config.skip;

      const testRequest = { path: '/api/analyze' } as unknown as Request;
      const result = skipFunction(testRequest);

      expect(result).toBe(true);
    });

    it('no debe saltarse rate limiting para rutas API normales', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_RATE_LIMIT = 'true';
      jest.resetModules();

      const { generalLimiter } = require('../../src/middlewares/rateLimit');
      const skipFunction = (generalLimiter as any)._config.skip;

      const testCases = ['/api/analyze', '/api/status', '/other/endpoint'];

      testCases.forEach(path => {
        const testRequest = { path } as unknown as Request;
        const result = skipFunction(testRequest);
        expect(result).toBe(false);
      });
    });

    it('debe evaluar condiciones de skip en orden correcto', () => {
      // Test system routes (highest priority) - always skip regardless of flags
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_RATE_LIMIT = 'true';
      jest.resetModules();

      let { generalLimiter } = require('../../src/middlewares/rateLimit');
      let skipFunction = (generalLimiter as any)._config.skip;
      let testRequest = { path: '/health' } as unknown as Request;
      expect(skipFunction(testRequest)).toBe(true);

      // Test environment flag - skip when NODE_ENV=test
      process.env.NODE_ENV = 'test';
      process.env.ENFORCE_RATE_LIMIT = 'true';
      jest.resetModules();

      ({ generalLimiter } = require('../../src/middlewares/rateLimit'));
      skipFunction = (generalLimiter as any)._config.skip;
      testRequest = { path: '/api/analyze' } as unknown as Request;
      expect(skipFunction(testRequest)).toBe(true);

      // Test rate limit flag - skip when ENFORCE_RATE_LIMIT=false
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_RATE_LIMIT = 'false';
      jest.resetModules();

      ({ generalLimiter } = require('../../src/middlewares/rateLimit'));
      skipFunction = (generalLimiter as any)._config.skip;
      expect(skipFunction(testRequest)).toBe(true);

      // Test normal case - don't skip in production with rate limiting enabled
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_RATE_LIMIT = 'true';
      jest.resetModules();

      ({ generalLimiter } = require('../../src/middlewares/rateLimit'));
      skipFunction = (generalLimiter as any)._config.skip;
      expect(skipFunction(testRequest)).toBe(false);
    });
  });

  describe('Rate Limit Handler', () => {
    let rateLimitHandler: (req: Request, res: Response) => void;
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      const { generalLimiter } = require('../../src/middlewares/rateLimit');
      rateLimitHandler = (generalLimiter as any)._config.handler;

      mockRequest = {
        id: 'test-request-id',
        originalUrl: '/api/analyze',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent'),
        log: {
          warn: jest.fn(),
        },
      };

      mockResponse = {
        getHeader: jest
          .fn()
          .mockReturnValueOnce('100') // RateLimit-Limit
          .mockReturnValueOnce('0') // RateLimit-Remaining
          .mockReturnValueOnce('1640995200') // RateLimit-Reset
          .mockReturnValueOnce('60'), // Retry-After
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('debe retornar error 429 con información completa', () => {
      rateLimitHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Too many requests. Please try again later.',
        details: {
          path: '/api/analyze',
          limit: '100',
          remaining: '0',
          reset: '1640995200',
          retryAfter: '60',
          windowMs: ENV.RATE_LIMIT_WINDOW_MS,
        },
        requestId: 'test-request-id',
      });
    });

    it('debe loggear información del rate limit exceeded', () => {
      rateLimitHandler(mockRequest, mockResponse);

      expect(mockRequest.log.warn).toHaveBeenCalledWith(
        {
          requestId: 'test-request-id',
          path: '/api/analyze',
          ip: '127.0.0.1',
          userAgent: 'test-user-agent',
          rateLimitInfo: {
            limit: '100',
            remaining: '0',
            reset: '1640995200',
            retryAfter: '60',
          },
        },
        'Rate limit exceeded'
      );
    });

    it('debe manejar request sin logger', () => {
      const requestWithoutLog = { ...mockRequest, log: undefined };

      expect(() => {
        rateLimitHandler(requestWithoutLog, mockResponse);
      }).not.toThrow();

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('debe leer headers de rate limit info', () => {
      rateLimitHandler(mockRequest, mockResponse);

      expect(mockResponse.getHeader).toHaveBeenCalledWith('RateLimit-Limit');
      expect(mockResponse.getHeader).toHaveBeenCalledWith(
        'RateLimit-Remaining'
      );
      expect(mockResponse.getHeader).toHaveBeenCalledWith('RateLimit-Reset');
      expect(mockResponse.getHeader).toHaveBeenCalledWith('Retry-After');
    });
  });

  describe('Middleware Integration', () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockRequest = {
        path: '/api/analyze',
        id: 'test-request-id',
        originalUrl: '/api/analyze',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent'),
      };

      mockResponse = {
        getHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      mockNext = jest.fn();
    });

    it('debe permitir requests cuando skip retorna true', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();

      const { generalLimiter } = require('../../src/middlewares/rateLimit');

      generalLimiter(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('debe usar el mismo handler para ambos limiters', () => {
      const {
        generalLimiter,
        analyzeLimiter,
      } = require('../../src/middlewares/rateLimit');

      expect((generalLimiter as any)._config.handler).toBe(
        (analyzeLimiter as any)._config.handler
      );
    });

    it('debe usar el mismo skip function para ambos limiters', () => {
      const {
        generalLimiter,
        analyzeLimiter,
      } = require('../../src/middlewares/rateLimit');

      expect((generalLimiter as any)._config.skip).toBe(
        (analyzeLimiter as any)._config.skip
      );
    });
  });
});
