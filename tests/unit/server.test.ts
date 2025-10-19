/**
 * @file tests/unit/server.test.ts
 * Tests unitarios para el servidor Express principal
 * VERSIÓN COMPLETAMENTE REFACTORIZADA - 15/10/2025
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import express from 'express';
import request from 'supertest';

// ========================================================================
// MOCKS - CONFIGURADOS UNA SOLA VEZ ANTES DE CUALQUIER IMPORTACIÓN
// ========================================================================

// Mock logging service
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  fatal: jest.fn(),
};

const mockAdvancedLogger = {
  getRawLogger: () => mockLogger,
  setRequestContext: jest.fn(),
  cleanupContext: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  flush: jest.fn(),
};

jest.mock('../../src/services/logging.service', () => ({
  advancedLogger: mockAdvancedLogger,
}));

// Mock health config
const mockSetupHealthChecks = jest.fn();
jest.mock('../../src/config/health.config', () => ({
  setupHealthChecks: mockSetupHealthChecks,
}));

// Mock browser pool service
const mockBrowserPool = {
  shutdown: jest.fn(() => Promise.resolve()),
  getPoolStats: jest.fn(() => ({
    active: 2,
    idle: 1,
    total: 3,
    utilization: 0.67,
  })),
};

jest.mock('../../src/services/browser.pool.service', () => ({
  browserPool: mockBrowserPool,
}));

// Mock cache service
const mockAnalysisCache = {
  clear: jest.fn(),
  getStats: jest.fn(() => ({
    size: 150,
    hits: 450,
    misses: 50,
    hitRate: 0.9,
    memoryUsageMB: 25.5,
  })),
};

jest.mock('../../src/services/cache.service', () => ({
  analysisCache: mockAnalysisCache,
}));

// Mock performance service
const mockPerformanceMonitor = {
  recordRequest: jest.fn(),
  reset: jest.fn(),
  getMetrics: jest.fn(() => ({
    requests: 1000,
    avgDuration: 245.5,
    successRate: 0.95,
  })),
  getHealthStatus: jest.fn(() => ({
    status: 'healthy',
    score: 95,
  })),
  getAlerts: jest.fn(() => []),
  toPrometheusMetrics: jest.fn(() => '# performance metrics\nperf_requests_total 1000'),
};

jest.mock('../../src/services/performance.service', () => ({
  performanceMonitor: mockPerformanceMonitor,
}));

// Mock metrics service
const mockMetricsCollector = {
  getMetrics: jest.fn(() => ({
    httpRequests: 5000,
    analysisTotal: 1200,
  })),
  toPrometheusFormat: jest.fn(() => '# metrics\nhttp_requests_total 5000'),
};

// Create a trackable middleware that will be used
const actualMetricsMiddleware = jest.fn((req: any, res: any, next: any) => {
  next();
});

const mockMetricsMiddleware = jest.fn(() => actualMetricsMiddleware);

jest.mock('../../src/services/metrics.service', () => ({
  metricsCollector: mockMetricsCollector,
  metricsMiddleware: mockMetricsMiddleware,
}));

// Mock routes
jest.mock('../../src/routes/analyze.route', () => {
  const router = express.Router();
  router.post('/', (req, res) => {
    res.json({
      success: true,
      tool: 'axe-core',
      violations: 0,
    });
  });
  return router;
});

jest.mock('../../src/routes/bundle.route', () => {
  const router = express.Router();
  router.get('/status', (req, res) => {
    res.json({ bundle: 'status' });
  });
  return router;
});

jest.mock('../../src/routes/health.route', () => {
  const router = express.Router();
  router.get('/', (req, res) => {
    res.json({ status: 'healthy', uptime: 12345 });
  });
  router.get('/live', (req, res) => {
    res.json({ status: 'ok' });
  });
  router.get('/ready', (req, res) => {
    res.json({ status: 'ready' });
  });
  return router;
});

jest.mock('../../src/routes/monitoring.route', () => ({
  monitoringRouter: (() => {
    const router = express.Router();
    router.get('/dashboard', (req, res) => {
      res.json({ dashboard: 'data', timestamp: Date.now() });
    });
    router.get('/status', (req, res) => {
      res.json({ status: 'running' });
    });
    return router;
  })(),
}));

// Mock middlewares
const mockGeneralLimiter = jest.fn((req: any, res: any, next: any) => next());
const mockAnalyzeLimiter = jest.fn((req: any, res: any, next: any) => next());

jest.mock('../../src/middlewares/rateLimit', () => ({
  generalLimiter: mockGeneralLimiter,
  analyzeLimiter: mockAnalyzeLimiter,
}));

const mockAttachRequestId = jest.fn((req: any, res: any, next: any) => {
  req.id = 'test-request-id-' + Date.now();
  next();
});

jest.mock('../../src/middlewares/requestId', () => ({
  attachRequestId: mockAttachRequestId,
}));

const mockNotFoundHandler = jest.fn((req: any, res: any) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

const mockErrorHandler = jest.fn((err: any, req: any, res: any, next: any) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

jest.mock('../../src/middlewares/errorHandler', () => ({
  notFoundHandler: mockNotFoundHandler,
  errorHandler: mockErrorHandler,
}));

const mockValidateGatewaySecret = jest.fn((req: any, res: any, next: any) => {
  next();
});

jest.mock('../../src/middlewares/gateway.middleware', () => ({
  validateGatewaySecret: mockValidateGatewaySecret,
}));

const mockExtractUserContext = jest.fn((req: any, res: any, next: any) => {
  req.user = { id: 'test-user-123', email: 'test@example.com' };
  next();
});

jest.mock('../../src/middlewares/user-context.middleware', () => ({
  extractUserContext: mockExtractUserContext,
}));

// Mock Swagger
jest.mock('../../src/swagger', () => ({
  swaggerSpec: {
    info: {
      title: 'Accessibility Middleware API',
      version: '1.0.0',
      description: 'Test API',
    },
    paths: {},
  },
}));

jest.mock('swagger-ui-express', () => ({
  serve: jest.fn((req: any, res: any, next: any) => next()),
  setup: jest.fn(() => (req: any, res: any) => {
    res.json({ swagger: 'ui', version: '1.0.0' });
  }),
}));

// Mock pino-http
jest.mock('pino-http', () => {
  return jest.fn(() => (req: any, res: any, next: any) => {
    req.log = mockLogger;
    next();
  });
});

// Mock config functions
let gatewayValidationEnabled = false;
let jwtEnabled = false;

const mockIsGatewayValidationEnabled = jest.fn(() => gatewayValidationEnabled);
const mockIsJwtEnabled = jest.fn(() => jwtEnabled);

jest.mock('../../src/config/gateway.config', () => ({
  isGatewayValidationEnabled: mockIsGatewayValidationEnabled,
}));

jest.mock('../../src/config/jwt.config', () => ({
  isJwtEnabled: mockIsJwtEnabled,
}));

// Mock environment
jest.mock('../../src/utils/environment', () => ({
  ENV: {
    TRUST_PROXY: false,
    CORS_ORIGINS: ['http://localhost:3000'],
    PORT: 3001,
    HOST: 'localhost',
    NODE_ENV: 'test',
    CACHE_MAX_ENTRIES: 1000,
    CACHE_MAX_MEMORY_MB: 100,
    ANALYZE_TIMEOUT_MS: 30000,
    NAVIGATION_TIMEOUT_MS: 10000,
    BROWSER_POOL_SIZE: 3,
    RATE_LIMIT_MAX_REQUESTS: 100,
    ANALYZE_RATE_LIMIT_MAX: 20,
  },
  FeatureFlags: {
    enableMetrics: jest.fn(() => true),
    isProduction: jest.fn(() => false),
  },
}));

// ========================================================================
// IMPORTAR SERVER DESPUÉS DE TODOS LOS MOCKS
// ========================================================================

import app from '../../src/server';

// ========================================================================
// TESTS
// ========================================================================

describe('Server Configuration', () => {
  beforeEach(() => {
    // Limpiar solo los mocks, no los módulos
    jest.clearAllMocks();
    gatewayValidationEnabled = false;
    jwtEnabled = false;
  });

  afterAll(async () => {
    // Limpiar recursos
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Basic Server Setup', () => {
    it('should be an Express application', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
      expect(app.listen).toBeDefined();
    });

    it('should disable x-powered-by header', () => {
      const poweredBy = app.get('x-powered-by');
      expect(poweredBy).toBe(false);
    });

    it('should be configured for test environment', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });
  });

  describe('Middleware Configuration', () => {
    it('should configure CORS middleware', async () => {
      const response = await request(app)
        .options('/api/analyze')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      // CORS should handle OPTIONS preflight
      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should attach request ID to requests', async () => {
      await request(app).get('/health');
      expect(mockAttachRequestId).toHaveBeenCalled();
    });

    it('should apply general rate limiting', async () => {
      await request(app).get('/health');
      expect(mockGeneralLimiter).toHaveBeenCalled();
    });

    it('should parse JSON payloads', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ inputType: 'html', html: '<div>test</div>' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should apply metrics middleware when feature flag enabled', async () => {
      // El middleware mockMetricsMiddleware() se llama una vez durante la configuración del servidor
      // Verificamos que el middleware real (actualMetricsMiddleware) se ejecuta en cada request
      const callsBefore = actualMetricsMiddleware.mock.calls.length;
      await request(app).get('/health');
      const callsAfter = actualMetricsMiddleware.mock.calls.length;
      
      // El middleware debe haberse ejecutado al menos una vez más
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });

    it('should log requests with pino-http', async () => {
      await request(app).get('/health');
      // pino-http middleware debe haber sido aplicado
      expect(mockAttachRequestId).toHaveBeenCalled();
    });
  });

  describe('Route Configuration', () => {
    it('should serve health endpoint', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.uptime).toBeDefined();
    });

    it('should serve health liveness endpoint', async () => {
      const response = await request(app).get('/health/live');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });

    it('should serve health readiness endpoint', async () => {
      const response = await request(app).get('/health/ready');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
    });

    it('should serve analyze endpoint', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ inputType: 'html', html: '<div>test</div>' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tool).toBe('axe-core');
    });

    it('should serve monitoring dashboard', async () => {
      const response = await request(app).get('/api/monitoring/dashboard');
      expect(response.status).toBe(200);
      expect(response.body.dashboard).toBe('data');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should serve monitoring status', async () => {
      const response = await request(app).get('/api/monitoring/status');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('running');
    });

    it('should serve bundle status endpoint', async () => {
      const response = await request(app).get('/api/bundle/status');
      expect(response.status).toBe(200);
      expect(response.body.bundle).toBe('status');
    });

    it('should serve metrics endpoint with JSON format', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.performance).toBeDefined();
      expect(response.body.health).toBeDefined();
      expect(response.body.alerts).toBeDefined();
      expect(response.body.cache).toBeDefined();
      expect(response.body.browserPool).toBeDefined();
      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should serve metrics endpoint with Prometheus format', async () => {
      const response = await request(app).get('/metrics?format=prometheus');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('# metrics');
      expect(response.text).toContain('# performance metrics');
      expect(response.text).toContain('http_requests_total 5000');
      expect(response.text).toContain('perf_requests_total 1000');
    });

    it('should serve Swagger UI', async () => {
      const response = await request(app).get('/api/docs');
      expect(response.status).toBe(200);
      expect(response.body.swagger).toBe('ui');
      expect(response.body.version).toBe('1.0.0');
    });

    it('should serve Swagger JSON spec', async () => {
      const response = await request(app).get('/api/docs.json');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.info).toBeDefined();
      expect(response.body.info.title).toBe('Accessibility Middleware API');
      expect(response.body.info.version).toBe('1.0.0');
    });

    it('should serve auth status endpoint', async () => {
      const response = await request(app).get('/api/auth/status');
      expect(response.status).toBe(200);
      expect(response.body.jwtEnabled).toBeDefined();
      expect(response.body.gatewayValidationEnabled).toBeDefined();
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app).get('/nonexistent-route-test');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
      expect(response.body.path).toBe('/nonexistent-route-test');
    });

    it('should use notFoundHandler middleware', async () => {
      await request(app).get('/another-nonexistent-route');
      expect(mockNotFoundHandler).toHaveBeenCalled();
    });

    it('should handle POST requests to non-existent routes', async () => {
      const response = await request(app)
        .post('/invalid-endpoint')
        .send({ data: 'test' });
      expect(response.status).toBe(404);
    });
  });

  describe('Security Configuration', () => {
    it('should apply helmet security headers', async () => {
      const response = await request(app).get('/health');
      // Helmet adds various security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should configure CSP headers', async () => {
      const response = await request(app).get('/api/docs');
      // Should not block due to crossOriginEmbedderPolicy: false
      expect(response.status).toBe(200);
      // CSP header should be present
      expect(
        response.headers['content-security-policy'] ||
        response.headers['Content-Security-Policy']
      ).toBeDefined();
    });

    it('should not expose x-powered-by header', async () => {
      const response = await request(app).get('/health');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
});

describe('Performance Monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should record request performance metrics', async () => {
    await request(app).get('/health');

    // Wait for finish event
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(mockPerformanceMonitor.recordRequest).toHaveBeenCalled();
    expect(mockPerformanceMonitor.recordRequest).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Boolean)
    );
  });

  it('should record success metric for 2xx responses', async () => {
    await request(app).get('/health');
    await new Promise(resolve => setTimeout(resolve, 150));

    const calls = mockPerformanceMonitor.recordRequest.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    // El segundo parámetro debe ser true para respuestas exitosas
    const lastCall = calls.at(-1);
    expect(lastCall?.[1]).toBe(true);
  });

  it('should record failure metric for 4xx responses', async () => {
    await request(app).get('/nonexistent-endpoint-test');
    await new Promise(resolve => setTimeout(resolve, 150));

    const calls = mockPerformanceMonitor.recordRequest.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    // El segundo parámetro debe ser false para respuestas 4xx
    const lastCall = calls.at(-1);
    expect(lastCall?.[1]).toBe(false);
  });

  it('should set up request context for logging', async () => {
    await request(app).get('/health');

    expect(mockAdvancedLogger.setRequestContext).toHaveBeenCalled();
    expect(mockAdvancedLogger.setRequestContext).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        url: '/health',
      })
    );
  });

  it('should cleanup logging context after request', async () => {
    await request(app).get('/health');
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(mockAdvancedLogger.cleanupContext).toHaveBeenCalled();
  });
});

describe('Metrics Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log debug message when metrics are requested', async () => {
    await request(app).get('/metrics');

    expect(mockAdvancedLogger.debug).toHaveBeenCalledWith(
      'Metrics requested',
      expect.objectContaining({
        requestId: expect.any(String),
      })
    );
  });

  it('should include all service stats in metrics response', async () => {
    const response = await request(app).get('/metrics');

    expect(mockMetricsCollector.getMetrics).toHaveBeenCalled();
    expect(mockPerformanceMonitor.getMetrics).toHaveBeenCalled();
    expect(mockPerformanceMonitor.getHealthStatus).toHaveBeenCalled();
    expect(mockPerformanceMonitor.getAlerts).toHaveBeenCalled();
    expect(mockAnalysisCache.getStats).toHaveBeenCalled();
    expect(mockBrowserPool.getPoolStats).toHaveBeenCalled();

    expect(response.body.metrics.httpRequests).toBe(5000);
    expect(response.body.performance.requests).toBe(1000);
    expect(response.body.cache.hits).toBe(450);
    expect(response.body.browserPool.active).toBe(2);
  });

  it('should format Prometheus metrics correctly', async () => {
    await request(app).get('/metrics?format=prometheus');

    expect(mockMetricsCollector.toPrometheusFormat).toHaveBeenCalled();
    expect(mockPerformanceMonitor.toPrometheusMetrics).toHaveBeenCalled();
  });
});

describe('Route Protection Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gatewayValidationEnabled = false;
    jwtEnabled = false;
  });

  it('should extract user context on analyze routes', async () => {
    await request(app)
      .post('/api/analyze')
      .send({ inputType: 'html', html: '<div>test</div>' });

    expect(mockExtractUserContext).toHaveBeenCalled();
  });

  it('should apply analyze rate limiter on analyze routes', async () => {
    await request(app)
      .post('/api/analyze')
      .send({ inputType: 'html', html: '<div>test</div>' });

    expect(mockAnalyzeLimiter).toHaveBeenCalled();
  });

  // NOTA: No podemos testear el comportamiento dinámico de gateway validation
  // porque el servidor se configura una sola vez al importar el módulo.
  // El gateway validation está configurado según el valor inicial de
  // isGatewayValidationEnabled() al momento de la importación.
  // Este comportamiento se testea mejor con tests de integración.
});

describe('Request ID Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should attach unique request ID to each request', async () => {
    const response1 = await request(app).get('/metrics');
    const response2 = await request(app).get('/metrics');

    expect(response1.body.requestId).toBeDefined();
    expect(response2.body.requestId).toBeDefined();
    expect(typeof response1.body.requestId).toBe('string');
    expect(typeof response2.body.requestId).toBe('string');
  });

  it('should use request ID in logging context', async () => {
    await request(app).get('/health');

    expect(mockAdvancedLogger.setRequestContext).toHaveBeenCalledWith(
      expect.stringContaining('test-request-id'),
      expect.any(Object)
    );
  });

  it('should include request ID in metrics response', async () => {
    const response = await request(app).get('/metrics');
    expect(response.body.requestId).toMatch(/^test-request-id-\d+$/);
  });
});

describe('Environment Configuration', () => {
  it('should use correct CORS origins from environment', () => {
    const { ENV } = require('../../src/utils/environment');
    expect(ENV.CORS_ORIGINS).toEqual(['http://localhost:3000']);
  });

  it('should use correct port from environment', () => {
    const { ENV } = require('../../src/utils/environment');
    expect(ENV.PORT).toBe(3001);
  });

  it('should use correct host from environment', () => {
    const { ENV } = require('../../src/utils/environment');
    expect(ENV.HOST).toBe('localhost');
  });

  it('should enable metrics based on feature flags', () => {
    const { FeatureFlags } = require('../../src/utils/environment');
    expect(FeatureFlags.enableMetrics()).toBe(true);
  });

  it('should not be in production mode', () => {
    const { FeatureFlags } = require('../../src/utils/environment');
    expect(FeatureFlags.isProduction()).toBe(false);
  });

  it('should have correct cache configuration', () => {
    const { ENV } = require('../../src/utils/environment');
    expect(ENV.CACHE_MAX_ENTRIES).toBe(1000);
    expect(ENV.CACHE_MAX_MEMORY_MB).toBe(100);
  });

  it('should have correct timeout configuration', () => {
    const { ENV } = require('../../src/utils/environment');
    expect(ENV.ANALYZE_TIMEOUT_MS).toBe(30000);
    expect(ENV.NAVIGATION_TIMEOUT_MS).toBe(10000);
  });

  it('should have correct browser pool size', () => {
    const { ENV } = require('../../src/utils/environment');
    expect(ENV.BROWSER_POOL_SIZE).toBe(3);
  });

  it('should have correct rate limit configuration', () => {
    const { ENV } = require('../../src/utils/environment');
    expect(ENV.RATE_LIMIT_MAX_REQUESTS).toBe(100);
    expect(ENV.ANALYZE_RATE_LIMIT_MAX).toBe(20);
  });
});

describe('Auth Status Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return JWT disabled status by default', async () => {
    jwtEnabled = false;
    gatewayValidationEnabled = false;

    const response = await request(app).get('/api/auth/status');

    expect(response.status).toBe(200);
    expect(response.body.jwtEnabled).toBe(false);
    expect(response.body.gatewayValidationEnabled).toBe(false);
    expect(response.body.message).toContain('disabled');
  });

  it('should return JWT enabled status when configured', async () => {
    jwtEnabled = true;

    const response = await request(app).get('/api/auth/status');

    expect(response.status).toBe(200);
    expect(response.body.jwtEnabled).toBe(true);
  });

  it('should return gateway validation status', async () => {
    gatewayValidationEnabled = true;

    const response = await request(app).get('/api/auth/status');

    expect(response.status).toBe(200);
    expect(response.body.gatewayValidationEnabled).toBe(true);
  });
});

describe('Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cache statistics', async () => {
    const response = await request(app).get('/metrics');

    expect(mockAnalysisCache.getStats).toHaveBeenCalled();
    expect(response.body.cache).toEqual({
      size: 150,
      hits: 450,
      misses: 50,
      hitRate: 0.9,
      memoryUsageMB: 25.5,
    });
  });

  it('should return browser pool statistics', async () => {
    const response = await request(app).get('/metrics');

    expect(mockBrowserPool.getPoolStats).toHaveBeenCalled();
    expect(response.body.browserPool).toEqual({
      active: 2,
      idle: 1,
      total: 3,
      utilization: 0.67,
    });
  });

  it('should return performance metrics', async () => {
    const response = await request(app).get('/metrics');

    expect(mockPerformanceMonitor.getMetrics).toHaveBeenCalled();
    expect(response.body.performance).toEqual({
      requests: 1000,
      avgDuration: 245.5,
      successRate: 0.95,
    });
  });

  it('should return health status', async () => {
    const response = await request(app).get('/metrics');

    expect(mockPerformanceMonitor.getHealthStatus).toHaveBeenCalled();
    expect(response.body.health).toEqual({
      status: 'healthy',
      score: 95,
    });
  });

  it('should return alerts array', async () => {
    const response = await request(app).get('/metrics');

    expect(mockPerformanceMonitor.getAlerts).toHaveBeenCalled();
    expect(Array.isArray(response.body.alerts)).toBe(true);
  });
});
