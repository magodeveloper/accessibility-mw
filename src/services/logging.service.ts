/**
 * Advanced Structured Logging Service
 * Provides centralized, efficient logging with context awareness
 */

import pino from 'pino';
import { FeatureFlags } from '../utils/environment';

// Log levels hierarchy
export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60,
}

// Extended error interface
interface ExtendedError extends Error {
  code?: string | number;
}

// Security event details interface
interface SecurityEventDetails {
  ip?: string;
  userAgent?: string;
  url?: string;
  reason?: string;
  [key: string]: unknown;
}

// Structured log context interface
export interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  url?: string;
  ip?: string;
  userAgent?: string;
  tool?: string;
  inputType?: string;
  cacheHit?: boolean;
  errorCode?: string;
  statusCode?: number;
  [key: string]: unknown;
}

// Performance tracking for operations
interface PerformanceTracker {
  start: number;
  operation: string;
  metadata?: Record<string, unknown>;
}

class AdvancedLogger {
  private pinoLogger: pino.Logger;
  private readonly performanceTrackers = new Map<string, PerformanceTracker>();
  private readonly requestContexts = new Map<string, LogContext>();

  constructor() {
    const isDev = FeatureFlags.isDevelopment();
    const isProd = FeatureFlags.isProduction();

    // Determine log level
    let logLevel = 'info';
    if (!isProd) {
      logLevel = FeatureFlags.verboseLogging() ? 'debug' : 'info';
    }

    // Base pino configuration
    const baseConfig: pino.LoggerOptions = {
      level: logLevel,
      formatters: {
        level: (label: string) => ({ level: label }),
        bindings: (bindings: pino.Bindings) => ({
          pid: bindings.pid,
          hostname: bindings.hostname,
          service: 'accessibility-mw',
        }),
      },
      timestamp:
        pino.stdTimeFunctions?.isoTime ||
        (() => `,"timestamp":"${new Date().toISOString()}"`),

      // Redact sensitive information
      redact: {
        paths: [
          'password',
          'token',
          'authorization',
          'cookie',
          'req.headers.authorization',
          'req.headers.cookie',
        ],
        remove: true,
      },
    };

    // Add pretty print transport only in development if available
    if (isDev) {
      try {
        // Check if pino-pretty is available before using it
        require.resolve('pino-pretty');
        baseConfig.transport = {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,service',
          },
        };
      } catch (error) {
        // Fallback to basic logging if pino-pretty is not available
        if (error instanceof Error) {
          console.warn(
            'pino-pretty not available, using basic logging:',
            error.message
          );
        }
        // Continue without pretty printing - pino will use default JSON format
      }
    }

    this.pinoLogger = pino(baseConfig);
  }

  // Set context for a request
  setRequestContext(requestId: string, context: Partial<LogContext>): void {
    this.requestContexts.set(requestId, {
      requestId,
      ...context,
    });
  }

  // Get context for a request
  getRequestContext(requestId: string): LogContext | undefined {
    return this.requestContexts.get(requestId);
  }

  // Clean old contexts to prevent memory leaks
  cleanupContext(requestId: string): void {
    this.requestContexts.delete(requestId);

    // Clean up any associated performance trackers
    const trackersToDelete = Array.from(this.performanceTrackers.keys()).filter(
      key => key.startsWith(requestId)
    );
    trackersToDelete.forEach(key => this.performanceTrackers.delete(key));
  }

  // Start performance tracking
  startPerformanceTracking(
    requestId: string,
    operation: string,
    metadata?: Record<string, unknown>
  ): void {
    const trackerId = `${requestId}:${operation}`;
    this.performanceTrackers.set(trackerId, {
      start: Date.now(),
      operation,
      metadata,
    });
  }

  // End performance tracking and log duration
  endPerformanceTracking(
    requestId: string,
    operation: string,
    additionalContext?: LogContext
  ): void {
    const trackerId = `${requestId}:${operation}`;
    const tracker = this.performanceTrackers.get(trackerId);

    if (tracker) {
      const duration = Date.now() - tracker.start;
      this.performanceTrackers.delete(trackerId);

      const context = this.getRequestContext(requestId) || {};
      this.info(`Operation completed: ${operation}`, {
        ...context,
        ...additionalContext,
        operation,
        duration,
        ...tracker.metadata,
      });
    }
  }

  // Enhanced logging methods with context
  trace(message: string, context?: LogContext): void {
    this.log('trace', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    const extError = error as ExtendedError;
    const enrichedContext = {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          name: error.name,
          stack: FeatureFlags.isDevelopment() ? error.stack : undefined,
          code: extError?.code,
        },
      }),
    };
    this.log('error', message, enrichedContext);
  }

  fatal(message: string, context?: LogContext, error?: Error): void {
    const extError = error as ExtendedError;
    const enrichedContext = {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          code: extError?.code,
        },
      }),
    };
    this.log('fatal', message, enrichedContext);
  }

  private log(level: string, message: string, context?: LogContext): void {
    const enrichedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    };

    // Get request context if requestId is provided
    if (context?.requestId) {
      const requestContext = this.getRequestContext(context.requestId);
      Object.assign(enrichedContext, requestContext);
    }

    // Type-safe logging
    switch (level) {
      case 'trace':
        this.pinoLogger.trace(enrichedContext, message);
        break;
      case 'debug':
        this.pinoLogger.debug(enrichedContext, message);
        break;
      case 'info':
        this.pinoLogger.info(enrichedContext, message);
        break;
      case 'warn':
        this.pinoLogger.warn(enrichedContext, message);
        break;
      case 'error':
        this.pinoLogger.error(enrichedContext, message);
        break;
      case 'fatal':
        this.pinoLogger.fatal(enrichedContext, message);
        break;
      default:
        this.pinoLogger.info(enrichedContext, message);
    }
  }

  // Specific domain logging methods
  logAnalysisStart(
    requestId: string,
    tool: string,
    inputType: string,
    url?: string
  ): void {
    this.startPerformanceTracking(requestId, 'analysis', { tool, inputType });
    this.info('Analysis started', {
      requestId,
      tool,
      inputType,
      url: inputType === 'url' ? url : undefined,
    });
  }

  logAnalysisComplete(
    requestId: string,
    tool: string,
    results: { violations: number; passed: number },
    cacheHit: boolean
  ): void {
    this.endPerformanceTracking(requestId, 'analysis', {
      tool,
      violationCount: results.violations,
      passedCount: results.passed,
      cacheHit,
    });
  }

  logCacheHit(requestId: string, cacheKey: string): void {
    this.debug('Cache hit', {
      requestId,
      cacheKey: cacheKey.substring(0, 50) + '...',
      cacheHit: true,
    });
  }

  logCacheMiss(requestId: string, cacheKey: string): void {
    this.debug('Cache miss', {
      requestId,
      cacheKey: cacheKey.substring(0, 50) + '...',
      cacheHit: false,
    });
  }

  logSecurityEvent(
    type: 'rate_limit' | 'invalid_url' | 'validation_failure',
    requestId: string,
    details: SecurityEventDetails
  ): void {
    this.warn(`Security event: ${type}`, {
      requestId,
      securityEventType: type,
      ...details,
    });
  }

  logHealthCheck(
    component: string,
    status: 'healthy' | 'unhealthy',
    duration: number,
    error?: Error
  ): void {
    if (status === 'healthy') {
      this.debug(`Health check passed: ${component}`, {
        component,
        healthStatus: status,
        duration,
      });
    } else {
      this.error(
        `Health check failed: ${component}`,
        {
          component,
          healthStatus: status,
          duration,
        },
        error
      );
    }
  }

  // Create child logger with persistent context
  child(context: LogContext): AdvancedLogger {
    const childLogger = new AdvancedLogger();
    childLogger.pinoLogger = this.pinoLogger.child(context);
    return childLogger;
  }

  // Flush logs (useful for testing)
  flush(): void {
    this.pinoLogger.flush();
  }

  // Get raw pino logger for compatibility
  getRawLogger(): pino.Logger {
    return this.pinoLogger;
  }
}

// Export singleton instance
export const advancedLogger = new AdvancedLogger();

// Export factory function for request-scoped loggers
export function createRequestLogger(
  requestId: string,
  initialContext?: Partial<LogContext>
): AdvancedLogger {
  const logger = advancedLogger.child({ requestId, ...initialContext });
  if (initialContext) {
    advancedLogger.setRequestContext(requestId, initialContext);
  }
  return logger;
}
