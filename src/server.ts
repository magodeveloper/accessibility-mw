import cors from 'cors';
import 'dotenv/config';
import express, { Request } from 'express';
import helmet from 'helmet';
import http from 'http';
import { AddressInfo } from 'net';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { setupHealthChecks } from './config/health.config';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { analyzeLimiter, generalLimiter } from './middlewares/rateLimit';
import { attachRequestId } from './middlewares/requestId';
import analyzeRouter from './routes/analyze.route';
import healthRouter from './routes/health.route';
import { monitoringRouter } from './routes/monitoring.route';
import { browserPool } from './services/browser.pool.service';
import { analysisCache } from './services/cache.service';
import { advancedLogger } from './services/logging.service';
import {
  metricsCollector,
  metricsMiddleware,
} from './services/metrics.service';
import { performanceMonitor } from './services/performance.service';
import { swaggerSpec } from './swagger';
import { ENV, FeatureFlags } from './utils/environment';

// Interfaces y tipos para el servidor
type RequestWithId = Request & {
  id?: string | number;
};

// Crear instancia de Express
const app = express();

// Oculta cabecera X-Powered-By (seguridad)
app.disable('x-powered-by');

// Logger con configuración optimizada usando advanced logging
const logger = advancedLogger.getRawLogger();

// Middleware para agregar requestId a cada solicitud
app.use(attachRequestId);

// Middleware de métricas (debe ir temprano)
if (FeatureFlags.enableMetrics()) {
  app.use(metricsMiddleware());
}

// Helper function to safely get request ID as string
const getRequestIdAsString = (id: unknown): string => {
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return id.toString();
  if (id && typeof id === 'object' && 'toString' in id) {
    return (id as { toString(): string }).toString();
  }
  return 'unknown';
};

// Performance monitoring middleware
app.use((req, res, next) => {
  const requestId = getRequestIdAsString(req.id);
  const start = Date.now();

  // Set up request context for logging
  advancedLogger.setRequestContext(requestId, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const success = res.statusCode < 400;

    // Record performance metrics
    performanceMonitor.recordRequest(duration, success);

    // Cleanup logger context
    advancedLogger.cleanupContext(requestId);
  });

  next();
});

// Confianza en cabeceras X-Forwarded-* si hay proxy/CDN
if (ENV.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Seguridad por cabeceras HTTP con configuración optimizada
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'unpkg.com'],
        scriptSrc: ["'self'", 'unpkg.com'],
        imgSrc: ["'self'", 'data:', 'unpkg.com'],
      },
    },
    crossOriginEmbedderPolicy: false, // Para Swagger UI
  })
);

// CORS optimizado
app.use(
  cors({
    origin: ENV.CORS_ORIGINS.length ? ENV.CORS_ORIGINS : true,
    credentials: true,
    maxAge: 86400, // 24h cache para preflight
  })
);

// Logger HTTP (ya tendrá requestId)
app.use(
  pinoHttp({
    logger,
    customProps: req => ({ requestId: (req as RequestWithId).id }),
    // No registrar health checks en logs para reducir ruido
    autoLogging: {
      ignore: req => req.url?.startsWith('/health'),
    },
  })
);

// Body parser JSON optimizado
app.use(
  express.json({
    limit: '2mb',
    strict: true,
    type: ['application/json', 'text/plain'],
  })
);

// Rate limiting general (después de CORS y JSON para evitar 429 en preflight)
app.use(generalLimiter);

// Endpoint de métricas para monitoreo
app.get('/metrics', (req, res) => {
  const requestId = (req as RequestWithId).id;
  advancedLogger.debug('Metrics requested', { requestId: String(requestId) });

  const format = req.query.format as string;
  if (format === 'prometheus') {
    res.set('Content-Type', 'text/plain');
    const prometheusMetrics =
      metricsCollector.toPrometheusFormat() +
      '\n' +
      performanceMonitor.toPrometheusMetrics();
    res.send(prometheusMetrics);
  } else {
    res.json({
      ok: true,
      metrics: metricsCollector.getMetrics(),
      performance: performanceMonitor.getMetrics(),
      health: performanceMonitor.getHealthStatus(),
      alerts: performanceMonitor.getAlerts(),
      cache: analysisCache.getStats(),
      browserPool: browserPool.getPoolStats(),
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
});

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON (depuración)
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Rutas de análisis
app.use('/api/analyze', analyzeLimiter, analyzeRouter);

// Health shallow/deep
app.use('/health', healthRouter);

// Monitoring routes (dashboard, status, metrics)
app.use('/api/monitoring', monitoringRouter);

// 404 y manejador global de errores ANTES de escuchar
app.use(notFoundHandler);

// Manejador de errores
app.use(errorHandler);

// Create HTTP server explicitly and force binding to IPv4 127.0.0.1 in development
// to avoid Node.js resolving 'localhost' to IPv6 ::1 on Windows. Allow
// overriding with HOST env if necessary.
const server = http.createServer(app);
const forceHost =
  process.env.HOST ??
  (ENV.NODE_ENV === 'development' ? '127.0.0.1' : '0.0.0.0');

server.listen(ENV.PORT, forceHost, () => {
  const addr = server.address();
  const addrStr =
    typeof addr === 'string'
      ? addr
      : `${(addr as AddressInfo)?.address}:${(addr as AddressInfo)?.port}`;
  advancedLogger.info(
    `API escuchando en http://${forceHost}:${ENV.PORT} - Swagger: /api/docs`,
    {
      port: ENV.PORT,
      host: forceHost,
      nodeEnv: ENV.NODE_ENV,
      cacheConfig: {
        maxEntries: ENV.CACHE_MAX_ENTRIES,
        maxMemoryMB: ENV.CACHE_MAX_MEMORY_MB,
      },
      timeouts: {
        analyze: ENV.ANALYZE_TIMEOUT_MS,
        navigation: ENV.NAVIGATION_TIMEOUT_MS,
      },
      browserPoolSize: ENV.BROWSER_POOL_SIZE,
      rateLimits: {
        general: ENV.RATE_LIMIT_MAX_REQUESTS,
        analyze: ENV.ANALYZE_RATE_LIMIT_MAX,
      },
    }
  );

  // Mostrar dirección real del servidor para depuración de binding
  console.log(`🚀 Server bound to: ${addrStr}`);
  advancedLogger.info('Server address info', { address: addr });

  // Configurar health checks automáticos después del startup
  console.log('🏥 Configurando health monitoring...');
  setupHealthChecks();
  advancedLogger.info('Health monitoring configurado correctamente');
});

// Graceful shutdown mejorado
const gracefulShutdown = async (signal: string) => {
  advancedLogger.info(`${signal} received. Shutting down gracefully...`, {
    signal,
  });

  // Cerrar servidor HTTP
  server.close(async () => {
    advancedLogger.info('HTTP server closed');

    // Limpiar recursos
    try {
      await browserPool.shutdown();
      // stopHealthMonitoring(); // Detener health monitoring
      analysisCache.clear();
      performanceMonitor.reset();
      advancedLogger.info('Resources cleaned up');
    } catch (error) {
      advancedLogger.error('Error during cleanup', {}, error as Error);
    }

    // Flush logs before exit
    advancedLogger.flush();
    process.exit(0);
  });

  // Forzar salida después de 30 segundos
  setTimeout(() => {
    advancedLogger.fatal('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Errores de proceso con logging mejorado
process.on('unhandledRejection', (reason: unknown) => {
  const error = reason as Error;
  advancedLogger.fatal(
    'UNHANDLED_REJECTION',
    {
      reason: error?.message || String(reason),
      stack: error?.stack,
    },
    reason instanceof Error ? reason : new Error(String(reason))
  );
  // En producción, considerar graceful shutdown
  if (FeatureFlags.isProduction()) {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

process.on('uncaughtException', err => {
  advancedLogger.fatal('UNCAUGHT_EXCEPTION', {}, err);
  // Salida inmediata para excepciones no capturadas
  process.exit(1);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
