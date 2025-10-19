/**
 * Enhanced Global Error Handling Middleware
 * Integrates structured logging and consistent error responses
 */

import type { NextFunction, Request, Response } from 'express';
import type { LogContext } from '../services/logging.service';
import { advancedLogger as logger } from '../services/logging.service';
import { ErrorCode, normalizeError } from '../utils/error-handler';

/**
 * Extract request context for error logging
 */
function extractRequestContext(req: Request): LogContext {
  return {
    requestId: req.id as string,
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: (req as Request & { user?: { id?: string } }).user?.id,
  };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const context = extractRequestContext(req);

  logger.warn('Route not found', {
    ...context,
    errorCode: ErrorCode.NOT_FOUND,
  });

  res.status(404).json({
    ok: false,
    error: 'Not Found',
    details: {
      path: req.originalUrl,
      method: req.method,
    },
    requestId: context.requestId,
  });
}

/**
 * Main error handling middleware
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const context = extractRequestContext(req);
  const isProd = process.env.NODE_ENV === 'production';

  // Normalize error to AppError for consistent handling
  const appError = normalizeError(error, 'Internal server error', context);

  // Determine log level based on error type and severity
  if (!appError.isOperational) {
    // Non-operational errors are critical system failures
    logger.fatal(
      appError.message,
      {
        ...context,
        errorCode: appError.code,
        severity: appError.severity,
        statusCode: appError.statusCode,
      },
      appError.originalError || appError
    );
  } else if (appError.statusCode >= 500) {
    // Server errors
    logger.error(
      appError.message,
      {
        ...context,
        errorCode: appError.code,
        statusCode: appError.statusCode,
      },
      appError.originalError || appError
    );
  } else if (appError.statusCode >= 400) {
    // Client errors (warn level)
    logger.warn(appError.message, {
      ...context,
      errorCode: appError.code,
      statusCode: appError.statusCode,
    });
  } else {
    // Informational
    logger.info(appError.message, {
      ...context,
      errorCode: appError.code,
      statusCode: appError.statusCode,
    });
  }

  // Build client response
  const clientResponse = appError.toClientResponse();

  // Add additional context for development
  if (!isProd && clientResponse.error) {
    const errorObj = clientResponse.error as Record<string, unknown>;
    errorObj.stack = appError.stack;
    if (appError.originalError) {
      errorObj.originalError = appError.originalError.message;
    }
  }

  // Send response
  res.status(appError.statusCode).json(clientResponse);
}
