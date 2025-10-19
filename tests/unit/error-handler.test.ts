/**
 * Unit Tests for Error Handling Utilities
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Mocked } from 'jest-mock';
import {
  AppError,
  ErrorCode,
  ErrorFactory,
  ErrorSeverity,
  handleError,
  normalizeError,
} from '../../src/utils/error-handler';

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an AppError with all properties', () => {
      const context = { requestId: 'test-123', operation: 'test' };
      const originalError = new Error('Original error');

      const error = new AppError(
        'Test error',
        ErrorCode.VALIDATION_ERROR,
        400,
        ErrorSeverity.LOW,
        true,
        context,
        originalError
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.isOperational).toBe(true);
      expect(error.context).toEqual(context);
      expect(error.originalError).toBe(originalError);
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('AppError');
    });

    it('should use default values when not provided', () => {
      const error = new AppError('Test error');

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.isOperational).toBe(true);
      expect(error.context).toBeUndefined();
      expect(error.originalError).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should convert error to JSON format', () => {
      const error = new AppError(
        'Test error',
        ErrorCode.VALIDATION_ERROR,
        400,
        ErrorSeverity.LOW,
        true,
        { requestId: 'test-123' }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        error: {
          message: 'Test error',
          code: ErrorCode.VALIDATION_ERROR,
          statusCode: 400,
          severity: ErrorSeverity.LOW,
          timestamp: error.timestamp,
          requestId: 'test-123',
        },
      });
    });

    it('should not include requestId when not provided', () => {
      const error = new AppError('Test error');
      const json = error.toJSON();

      expect(json.error).not.toHaveProperty('requestId');
    });
  });

  describe('toClientResponse', () => {
    beforeEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should return full details for operational errors in development', () => {
      process.env.NODE_ENV = 'development';

      const error = new AppError(
        'Test error',
        ErrorCode.VALIDATION_ERROR,
        400,
        ErrorSeverity.LOW,
        true,
        { requestId: 'test-123' }
      );

      const response = error.toClientResponse();

      expect(response).toEqual({
        error: {
          message: 'Test error',
          code: ErrorCode.VALIDATION_ERROR,
          requestId: 'test-123',
          statusCode: 400,
          timestamp: error.timestamp,
        },
      });
    });

    it('should hide error message for non-operational errors in production', () => {
      process.env.NODE_ENV = 'production';

      const error = new AppError(
        'Sensitive error',
        ErrorCode.INTERNAL_ERROR,
        500,
        ErrorSeverity.HIGH,
        false, // non-operational
        { requestId: 'test-123' }
      );

      const response = error.toClientResponse();

      expect(response).toEqual({
        error: {
          message: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR,
          requestId: 'test-123',
        },
      });
    });

    it('should show operational error message in production', () => {
      process.env.NODE_ENV = 'production';

      const error = new AppError(
        'User error',
        ErrorCode.VALIDATION_ERROR,
        400,
        ErrorSeverity.LOW,
        true, // operational
        { requestId: 'test-123' }
      );

      const response = error.toClientResponse();

      expect((response.error as { message: string }).message).toBe('User error');
    });
  });
});

describe('ErrorFactory', () => {
  describe('validation', () => {
    it('should create a validation error', () => {
      const context = { requestId: 'test-123' };
      const originalError = new Error('Original');

      const error = ErrorFactory.validation('Invalid input', context, originalError);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.isOperational).toBe(true);
      expect(error.context).toEqual(context);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('unauthorized', () => {
    it('should create an unauthorized error', () => {
      const error = ErrorFactory.unauthorized('Not authorized');

      expect(error.message).toBe('Not authorized');
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should use default message', () => {
      const error = ErrorFactory.unauthorized();

      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('forbidden', () => {
    it('should create a forbidden error', () => {
      const error = ErrorFactory.forbidden('Access denied');

      expect(error.message).toBe('Access denied');
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.statusCode).toBe(403);
    });
  });

  describe('notFound', () => {
    it('should create a not found error', () => {
      const error = ErrorFactory.notFound('Resource not found');

      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('timeout', () => {
    it('should create a timeout error', () => {
      const error = ErrorFactory.timeout('Operation timed out');

      expect(error.message).toBe('Operation timed out');
      expect(error.code).toBe(ErrorCode.TIMEOUT);
      expect(error.statusCode).toBe(504);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('rateLimit', () => {
    it('should create a rate limit error', () => {
      const error = ErrorFactory.rateLimit('Too many requests');

      expect(error.message).toBe('Too many requests');
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(429);
    });

    it('should use default message', () => {
      const error = ErrorFactory.rateLimit();

      expect(error.message).toBe('Rate limit exceeded');
    });
  });

  describe('internal', () => {
    it('should create an internal error', () => {
      const originalError = new Error('DB connection failed');
      const error = ErrorFactory.internal('Internal error', undefined, originalError);

      expect(error.message).toBe('Internal error');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.isOperational).toBe(false);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('serviceUnavailable', () => {
    it('should create a service unavailable error', () => {
      const error = ErrorFactory.serviceUnavailable('Service down');

      expect(error.message).toBe('Service down');
      expect(error.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(error.statusCode).toBe(503);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('analysis', () => {
    it('should create an analysis error', () => {
      const error = ErrorFactory.analysis('Analysis failed');

      expect(error.message).toBe('Analysis failed');
      expect(error.code).toBe(ErrorCode.ANALYSIS_FAILED);
      expect(error.statusCode).toBe(422);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('browser', () => {
    it('should create a browser error', () => {
      const error = ErrorFactory.browser('Browser crashed');

      expect(error.message).toBe('Browser crashed');
      expect(error.code).toBe(ErrorCode.BROWSER_ERROR);
      expect(error.statusCode).toBe(500);
    });
  });

  describe('externalApi', () => {
    it('should create an external API error with 4xx status', () => {
      const error = ErrorFactory.externalApi('API returned 404', 404);

      expect(error.message).toBe('API returned 404');
      expect(error.code).toBe(ErrorCode.EXTERNAL_API_ERROR);
      expect(error.statusCode).toBe(404);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should create an external API error with 5xx status', () => {
      const error = ErrorFactory.externalApi('API returned 503', 503);

      expect(error.message).toBe('API returned 503');
      expect(error.statusCode).toBe(502); // Mapped to Bad Gateway
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('config', () => {
    it('should create a config error', () => {
      const error = ErrorFactory.config('Missing config');

      expect(error.message).toBe('Missing config');
      expect(error.code).toBe(ErrorCode.CONFIG_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.isOperational).toBe(false);
    });
  });
});

describe('normalizeError', () => {
  const context = { requestId: 'test-123' };

  it('should return AppError as-is', () => {
    const appError = ErrorFactory.validation('Test error', context);
    const normalized = normalizeError(appError, 'Default message', context);

    expect(normalized).toBe(appError);
  });

  it('should normalize 404 error', () => {
    const error = Object.assign(new Error('Not found'), { statusCode: 404 });
    const normalized = normalizeError(error, 'Default', context);

    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.code).toBe(ErrorCode.NOT_FOUND);
    expect(normalized.statusCode).toBe(404);
  });

  it('should normalize 401 error', () => {
    const error = Object.assign(new Error('Unauthorized'), { statusCode: 401 });
    const normalized = normalizeError(error, 'Default', context);

    expect(normalized.code).toBe(ErrorCode.UNAUTHORIZED);
    expect(normalized.statusCode).toBe(401);
  });

  it('should normalize 403 error', () => {
    const error = Object.assign(new Error('Forbidden'), { statusCode: 403 });
    const normalized = normalizeError(error, 'Default', context);

    expect(normalized.code).toBe(ErrorCode.FORBIDDEN);
    expect(normalized.statusCode).toBe(403);
  });

  it('should normalize 429 error', () => {
    const error = Object.assign(new Error('Rate limit'), { statusCode: 429 });
    const normalized = normalizeError(error, 'Default', context);

    expect(normalized.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
    expect(normalized.statusCode).toBe(429);
  });

  it('should normalize 5xx error', () => {
    const error = Object.assign(new Error('Server error'), { statusCode: 503 });
    const normalized = normalizeError(error, 'Default', context);

    expect(normalized.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(normalized.statusCode).toBe(500);
  });

  it('should normalize timeout error', () => {
    const error = new Error('Operation timed out');
    error.name = 'TimeoutError';
    const normalized = normalizeError(error, 'Default', context);

    expect(normalized.code).toBe(ErrorCode.TIMEOUT);
    expect(normalized.statusCode).toBe(504);
  });

  it('should normalize validation error', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    const normalized = normalizeError(error, 'Default', context);

    expect(normalized.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(normalized.statusCode).toBe(400);
  });

  it('should normalize generic Error', () => {
    const error = new Error('Something went wrong');
    const normalized = normalizeError(error, 'Default', context);

    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.message).toBe('Something went wrong');
    expect(normalized.code).toBe(ErrorCode.INTERNAL_ERROR);
  });

  it('should normalize string error', () => {
    const error = 'String error message';
    const normalized = normalizeError(error, 'Default', context);

    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.message).toBe('String error message');
    expect(normalized.code).toBe(ErrorCode.INTERNAL_ERROR);
  });

  it('should normalize unknown error', () => {
    const error = { weird: 'object' };
    const normalized = normalizeError(error, 'Default message', context);

    expect(normalized).toBeInstanceOf(AppError);
    expect(normalized.message).toContain('Default message');
    expect(normalized.code).toBe(ErrorCode.INTERNAL_ERROR);
  });

  it('should use default message when error is falsy', () => {
    const normalized = normalizeError(null, 'Default message', context);

    expect(normalized.message).toContain('Default message');
  });
});

describe('handleError', () => {
  // Mock the logger to avoid actual logging during tests
  let mockLogger: Mocked<typeof import('../../src/services/logging.service').advancedLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the logger module
    mockLogger = {
      fatal: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as any;

    jest.mock('../../src/services/logging.service', () => ({
      advancedLogger: mockLogger,
    }));
  });

  it('should handle error and return AppError', () => {
    const error = new Error('Test error');
    const context = { requestId: 'test-123' };

    const appError = handleError(error, context);

    expect(appError).toBeInstanceOf(AppError);
    expect(appError.message).toBe('Test error');
  });

  it('should use custom default message', () => {
    const error = null;
    const context = { requestId: 'test-123' };

    const appError = handleError(error, context, {
      defaultMessage: 'Custom default',
    });

    expect(appError.message).toContain('Custom default');
  });

  it('should throw error when rethrow is true', () => {
    const error = new Error('Test error');

    expect(() => {
      handleError(error, undefined, { rethrow: true });
    }).toThrow(AppError);
  });

  it('should return AppError when rethrow is false', () => {
    const error = new Error('Test error');

    const appError = handleError(error, undefined, { rethrow: false });

    expect(appError).toBeInstanceOf(AppError);
    expect(() => appError).not.toThrow();
  });

  it('should preserve context from normalized error', () => {
    const context = { requestId: 'test-123', operation: 'test-op' };
    const error = new Error('Test error');

    const appError = handleError(error, context);

    expect(appError.context?.requestId).toBe('test-123');
    expect(appError.context?.operation).toBe('test-op');
  });
});
