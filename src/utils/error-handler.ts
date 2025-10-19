/**
 * Centralized Error Handling Utility
 * Provides structured error management with logging integration
 */

import type { LogContext } from '../services/logging.service';
import { advancedLogger as logger } from '../services/logging.service';

/**
 * Standard error codes for the application
 */
export enum ErrorCode {
  // Validation Errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_URL = 'INVALID_URL',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',

  // Authentication/Authorization (401/403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Resource Errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Request Errors (408/429)
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server Errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',

  // Analysis Specific
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  BROWSER_ERROR = 'BROWSER_ERROR',
  PAGE_LOAD_ERROR = 'PAGE_LOAD_ERROR',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',

  // Cache/Storage
  CACHE_ERROR = 'CACHE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',

  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // Configuration
  CONFIG_ERROR = 'CONFIG_ERROR',
  MISSING_CONFIG = 'MISSING_CONFIG',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW', // Minor issues, recoverable
  MEDIUM = 'MEDIUM', // Significant issues, may impact functionality
  HIGH = 'HIGH', // Critical issues, requires immediate attention
  CRITICAL = 'CRITICAL', // System-wide failures
}

/**
 * Custom Application Error class with enhanced metadata
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly context?: LogContext;
  public readonly timestamp: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    context?: LogContext,
    originalError?: Error
  ) {
    super(message);

    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.originalError = originalError;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        severity: this.severity,
        timestamp: this.timestamp,
        ...(this.context?.requestId && { requestId: this.context.requestId }),
      },
    };
  }

  /**
   * Get sanitized error for client response (hides sensitive details in production)
   */
  toClientResponse(): Record<string, unknown> {
    const isProd = process.env.NODE_ENV === 'production';

    return {
      error: {
        message: this.isOperational ? this.message : 'Internal server error',
        code: this.code,
        ...(this.context?.requestId && { requestId: this.context.requestId }),
        ...((!isProd || this.isOperational) && {
          statusCode: this.statusCode,
          timestamp: this.timestamp,
        }),
      },
    };
  }
}

/**
 * Factory functions for common error types
 */
export const ErrorFactory = {
  validation: (
    message: string,
    context?: LogContext,
    originalError?: Error
  ): AppError =>
    new AppError(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      ErrorSeverity.LOW,
      true,
      context,
      originalError
    ),

  unauthorized: (
    message: string = 'Unauthorized',
    context?: LogContext
  ): AppError =>
    new AppError(
      message,
      ErrorCode.UNAUTHORIZED,
      401,
      ErrorSeverity.MEDIUM,
      true,
      context
    ),

  forbidden: (message: string = 'Forbidden', context?: LogContext): AppError =>
    new AppError(
      message,
      ErrorCode.FORBIDDEN,
      403,
      ErrorSeverity.MEDIUM,
      true,
      context
    ),

  notFound: (message: string, context?: LogContext): AppError =>
    new AppError(
      message,
      ErrorCode.NOT_FOUND,
      404,
      ErrorSeverity.LOW,
      true,
      context
    ),

  timeout: (message: string, context?: LogContext): AppError =>
    new AppError(
      message,
      ErrorCode.TIMEOUT,
      504,
      ErrorSeverity.MEDIUM,
      true,
      context
    ),

  rateLimit: (
    message: string = 'Rate limit exceeded',
    context?: LogContext
  ): AppError =>
    new AppError(
      message,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      ErrorSeverity.MEDIUM,
      true,
      context
    ),

  internal: (
    message: string,
    context?: LogContext,
    originalError?: Error
  ): AppError =>
    new AppError(
      message,
      ErrorCode.INTERNAL_ERROR,
      500,
      ErrorSeverity.HIGH,
      false,
      context,
      originalError
    ),

  serviceUnavailable: (message: string, context?: LogContext): AppError =>
    new AppError(
      message,
      ErrorCode.SERVICE_UNAVAILABLE,
      503,
      ErrorSeverity.HIGH,
      true,
      context
    ),

  analysis: (
    message: string,
    context?: LogContext,
    originalError?: Error
  ): AppError =>
    new AppError(
      message,
      ErrorCode.ANALYSIS_FAILED,
      422,
      ErrorSeverity.MEDIUM,
      true,
      context,
      originalError
    ),

  browser: (
    message: string,
    context?: LogContext,
    originalError?: Error
  ): AppError =>
    new AppError(
      message,
      ErrorCode.BROWSER_ERROR,
      500,
      ErrorSeverity.MEDIUM,
      true,
      context,
      originalError
    ),

  externalApi: (
    message: string,
    statusCode: number,
    context?: LogContext,
    originalError?: Error
  ): AppError =>
    new AppError(
      message,
      ErrorCode.EXTERNAL_API_ERROR,
      statusCode >= 500 ? 502 : statusCode,
      statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      true,
      context,
      originalError
    ),

  config: (message: string, context?: LogContext): AppError =>
    new AppError(
      message,
      ErrorCode.CONFIG_ERROR,
      500,
      ErrorSeverity.CRITICAL,
      false,
      context
    ),
};

/**
 * Normalize unknown errors into AppError instances
 */
export function normalizeError(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred',
  context?: LogContext
): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for custom error properties first
    const errorObj = error as Error & {
      statusCode?: number;
      status?: number;
      code?: string;
      expose?: boolean;
    };

    // Domain-specific error codes (before HTTP status)
    if (errorObj.code) {
      // Timeout errors
      if (errorObj.code === 'ETIMEDOUT' || errorObj.code === 'TIMEOUT') {
        return ErrorFactory.timeout(
          errorObj.message || 'Operation timed out',
          context
        );
      }

      // Analysis errors
      if (errorObj.code === 'ANALYSIS_ERROR') {
        return new AppError(
          errorObj.message || 'Analysis failed',
          ErrorCode.ANALYSIS_FAILED,
          422,
          ErrorSeverity.MEDIUM,
          true,
          context,
          error
        );
      }

      // URL validation errors
      if (errorObj.code === 'URL_VALIDATION_ERROR') {
        return new AppError(
          errorObj.message || 'Invalid URL',
          ErrorCode.INVALID_URL,
          400,
          ErrorSeverity.LOW,
          true,
          context,
          error
        );
      }
    }

    // Timeout errors by name
    if (errorObj.name === 'TimeoutError') {
      return ErrorFactory.timeout(
        errorObj.message || 'Operation timed out',
        context
      );
    }

    // JSON parsing errors
    if (
      errorObj.name === 'SyntaxError' &&
      (errorObj.message.includes('JSON') ||
        ('type' in errorObj && errorObj.type === 'entity.parse.failed'))
    ) {
      return new AppError(
        'Invalid JSON in request body',
        ErrorCode.VALIDATION_ERROR,
        400,
        ErrorSeverity.LOW,
        true,
        context,
        error
      );
    }

    // HTTP-specific errors (status or statusCode)
    const statusCode = errorObj.statusCode || errorObj.status;
    if (statusCode && typeof statusCode === 'number') {
      if (statusCode === 404) {
        return ErrorFactory.notFound(errorObj.message, context);
      }
      if (statusCode === 401) {
        return ErrorFactory.unauthorized(errorObj.message, context);
      }
      if (statusCode === 403) {
        return ErrorFactory.forbidden(errorObj.message, context);
      }
      if (statusCode === 429) {
        return ErrorFactory.rateLimit(errorObj.message, context);
      }
      if (statusCode >= 500) {
        return ErrorFactory.internal(errorObj.message, context, error);
      }
      // For other status codes with expose flag, use them directly
      if (statusCode >= 400 && errorObj.expose) {
        return new AppError(
          errorObj.message,
          ErrorCode.VALIDATION_ERROR,
          statusCode,
          statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.LOW,
          true,
          context,
          error
        );
      }
    }

    // Validation errors
    if (
      errorObj.name === 'ValidationError' ||
      errorObj.message.includes('validation')
    ) {
      return ErrorFactory.validation(errorObj.message, context, error);
    }

    // Generic error
    return ErrorFactory.internal(
      errorObj.message || defaultMessage,
      context,
      error
    );
  }

  // String error
  if (typeof error === 'string') {
    return ErrorFactory.internal(error || defaultMessage, context);
  }

  // Unknown error type
  return ErrorFactory.internal(
    `${defaultMessage}: ${JSON.stringify(error)}`,
    context
  );
}

/**
 * Enhanced error handler with logging integration
 */
export function handleError(
  error: unknown,
  context?: LogContext,
  options?: {
    logLevel?: 'error' | 'warn' | 'fatal';
    rethrow?: boolean;
    defaultMessage?: string;
  }
): AppError {
  const {
    logLevel = 'error',
    rethrow = false,
    defaultMessage = 'An error occurred',
  } = options || {};

  // Normalize error
  const appError = normalizeError(error, defaultMessage, context);

  // Prepare logging context
  const logContext: LogContext = {
    ...context,
    ...appError.context,
    errorCode: appError.code,
    statusCode: appError.statusCode,
    severity: appError.severity,
    isOperational: appError.isOperational,
  };

  // Log based on severity and operational status
  if (
    appError.severity === ErrorSeverity.CRITICAL ||
    !appError.isOperational ||
    logLevel === 'fatal'
  ) {
    logger.fatal(
      appError.message,
      logContext,
      appError.originalError || appError
    );
  } else if (logLevel === 'warn' || appError.severity === ErrorSeverity.LOW) {
    logger.warn(appError.message, logContext);
  } else {
    logger.error(
      appError.message,
      logContext,
      appError.originalError || appError
    );
  }

  // Rethrow if requested
  if (rethrow) {
    throw appError;
  }

  return appError;
}

/**
 * Async error wrapper for express handlers
 */
export function asyncHandler<T = unknown>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (req: any, res: any, next: any) => Promise<T>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Safe async operation wrapper with automatic error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: LogContext,
  options?: {
    fallback?: T;
    logLevel?: 'error' | 'warn';
    defaultMessage?: string;
  }
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const appError = handleError(error, context, {
      logLevel: options?.logLevel || 'error',
      defaultMessage: options?.defaultMessage,
      rethrow: false,
    });

    if (options?.fallback !== undefined) {
      return { success: true, data: options.fallback };
    }

    return { success: false, error: appError };
  }
}

/**
 * Error context builder for chaining context information
 */
export class ErrorContextBuilder {
  private context: LogContext = {};

  requestId(id: string): this {
    this.context.requestId = id;
    return this;
  }

  userId(id: string): this {
    this.context.userId = id;
    return this;
  }

  operation(op: string): this {
    this.context.operation = op;
    return this;
  }

  url(url: string): this {
    this.context.url = url;
    return this;
  }

  tool(tool: string): this {
    this.context.tool = tool;
    return this;
  }

  add(key: string, value: unknown): this {
    this.context[key] = value;
    return this;
  }

  build(): LogContext {
    return { ...this.context };
  }
}

/**
 * Create error context builder
 */
export function createErrorContext(): ErrorContextBuilder {
  return new ErrorContextBuilder();
}
