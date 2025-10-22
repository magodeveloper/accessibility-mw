// Cargar configuración de entorno ANTES de cualquier otra importación
import { loadEnvironmentConfig } from './config/env.config';
loadEnvironmentConfig();

import cors from 'cors';
import express, { Request } from 'express';
import helmet from 'helmet';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { isGatewayValidationEnabled } from './config/gateway.config';
import { setupHealthChecks } from './config/health.config';
import { isJwtEnabled } from './config/jwt.config';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { validateGatewaySecret } from './middlewares/gateway.middleware';
import { analyzeLimiter, generalLimiter } from './middlewares/rateLimit';
import { attachRequestId } from './middlewares/requestId';
import { extractUserContext } from './middlewares/user-context.middleware';
import analyzeRouter from './routes/analyze.route';
import bundleRouter from './routes/bundle.route';
import healthRouter from './routes/health.route';
import { monitoringRouter } from './routes/monitoring.route';
import { browserPool } from './services/browser.pool.service';
import { analysisCache } from './services/cache.service';
import { advancedLogger } from './services/logging.service';
import {
  metricsCollector,
  metricsMiddleware,
} from './services/metrics.service';
import {
  getPrometheusMetrics,
  getPrometheusContentType,
  updateBrowserPoolMetrics,
  updateCacheMetrics,
  updateHealthScore,
} from './services/prometheus.metrics.service';
import { performanceMonitor } from './services/performance.service';
import { swaggerSpec } from './swagger';
import { ENV, FeatureFlags } from './utils/environment';

// Log de configuración de seguridad después de cargar el entorno
console.log(`[Server] [JWT] JWT configurado: ${isJwtEnabled()}`);
console.log(
  `[Server] [GATEWAY] Gateway Validation habilitado: ${isGatewayValidationEnabled()}`
);

// Aumentar el límite de listeners para evitar warnings en tests
// Esto es necesario porque pino-http y otros middlewares pueden registrar listeners automáticamente
if (process.env.NODE_ENV === 'test') {
  process.setMaxListeners(20);
}

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
app.get('/metrics', async (req, res) => {
  const requestId = (req as RequestWithId).id;
  advancedLogger.debug('Metrics requested', { requestId: String(requestId) });

  const format = req.query.format as string;
  
  // Actualizar métricas dinámicas antes de exportar
  const cacheStats = analysisCache.getStats();
  const poolStats = browserPool.getPoolStats();
  const legacyMetrics = metricsCollector.getMetrics();
  
  updateBrowserPoolMetrics({
    active: poolStats.inUse,
    idle: poolStats.available,
    total: poolStats.total,
  });
  
  updateCacheMetrics({
    size: cacheStats.size,
    memoryBytes: cacheStats.memoryUsage,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
  });
  
  updateHealthScore(legacyMetrics.healthScore);
  
  // Formato Prometheus es el DEFAULT (cambio principal)
  if (format === 'json') {
    // Formato JSON solo cuando se solicita explícitamente
    res.json({
      ok: true,
      metrics: legacyMetrics,
      performance: performanceMonitor.getMetrics(),
      health: performanceMonitor.getHealthStatus(),
      alerts: performanceMonitor.getAlerts(),
      cache: cacheStats,
      browserPool: poolStats,
      timestamp: new Date().toISOString(),
      requestId,
    });
  } else {
    // Formato Prometheus por defecto
    res.set('Content-Type', getPrometheusContentType());
    const prometheusMetrics = await getPrometheusMetrics();
    
    // Agregar métricas legacy para compatibilidad
    const legacyPrometheusMetrics =
      metricsCollector.toPrometheusFormat() +
      '\n' +
      performanceMonitor.toPrometheusMetrics();
    
    res.send(prometheusMetrics + '\n\n' + legacyPrometheusMetrics);
  }
});

// Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON (depuración)
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// JWT Authentication status endpoint (for debugging)
app.get('/api/auth/status', (_req, res) => {
  res.json({
    jwtEnabled: isJwtEnabled(),
    gatewayValidationEnabled: isGatewayValidationEnabled(),
    message: isJwtEnabled()
      ? 'JWT authentication is enabled'
      : 'JWT authentication is disabled (development mode)',
  });
});

// Rutas de análisis - PÚBLICAS pero protegidas por Gateway Secret
// ESTRATEGIA:
// - Gateway Secret: REQUERIDO (valida que peticiones vienen del Gateway)
// - JWT: NO REQUERIDO (rutas públicas, usuario no necesita estar autenticado)
// - User Context: Extraído si está disponible (opcional)
//
// ORDEN DE MIDDLEWARES:
// 1. validateGatewaySecret - Valida origen (Gateway) - OBLIGATORIO si está habilitado
// 2. extractUserContext - Extrae contexto de usuario (X-User-* headers) - OPCIONAL
// 3. analyzeLimiter - Rate limiting
// 4. analyzeRouter - Lógica de negocio

const gatewayEnabled = isGatewayValidationEnabled();
const jwtEnabled = isJwtEnabled();

if (gatewayEnabled) {
  advancedLogger.info(
    '[SECURITY] Gateway Secret enabled - /api/analyze routes are PUBLIC but requests must come from Gateway (User Context extracted if available)'
  );
  app.use(
    '/api/analyze',
    validateGatewaySecret,
    extractUserContext,
    analyzeLimiter,
    analyzeRouter
  );
} else {
  advancedLogger.warn(
    '[WARNING] SECURITY WARNING: Gateway Secret disabled - /api/analyze routes are COMPLETELY UNPROTECTED and accessible from anywhere (User Context extracted if available)'
  );
  app.use('/api/analyze', extractUserContext, analyzeLimiter, analyzeRouter);
}

// JWT Configuration Status (informativo, no se usa para /api/analyze)
if (jwtEnabled) {
  advancedLogger.info(
    '[INFO] JWT is configured and available for other protected routes (not used for /api/analyze)'
  );
}

// Bundle monitoring routes - NO requieren autenticación (métricas internas)
app.use('/api/bundle', bundleRouter);

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

// Force IPv4 binding in development to avoid IPv6 issues on Windows
// EXCEPTION: En Docker (DOCKER_ENV=true), siempre usar 0.0.0.0
const isDockerMode = process.env.DOCKER_ENV === 'true';
let forceHost: string;
if (isDockerMode) {
  forceHost = '0.0.0.0';
} else if (ENV.NODE_ENV === 'production') {
  forceHost = '0.0.0.0';
} else {
  forceHost = '127.0.0.1';
}

// Only start server if not in test environment
if (ENV.NODE_ENV !== 'test') {
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
    console.log(`[SERVER] Server bound to: ${addrStr}`);
    advancedLogger.info('Server address info', { address: addr });

    // Configurar health checks automáticos después del startup
    console.log('[HEALTH] Configurando health monitoring...');
    setupHealthChecks();
    advancedLogger.info('Health monitoring configurado correctamente');
  });
}

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
if (ENV.NODE_ENV !== 'test') {
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    advancedLogger.fatal(
      'Unhandled Promise Rejection',
      {
        operation: 'process.unhandledRejection',
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      },
      error
    );

    // En producción, considerar graceful shutdown
    if (FeatureFlags.isProduction()) {
      gracefulShutdown('UNHANDLED_REJECTION');
    }
  });

  process.on('uncaughtException', (err: Error) => {
    advancedLogger.fatal(
      'Uncaught Exception',
      {
        operation: 'process.uncaughtException',
        error: {
          message: err.message,
          name: err.name,
          stack: err.stack,
        },
      },
      err
    );

    // Flush logs and exit immediately for uncaught exceptions
    advancedLogger.flush();

    // Exit after allowing time for log flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

// Only register signal handlers if not in test environment
if (ENV.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
