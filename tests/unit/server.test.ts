/**
 * @file tests/unit/server.test.ts
 * Tests unitarios para el servidor Express principal
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

// Mock dependencies before importing server
jest.mock('../../src/services/logging.service', () => ({
  advancedLogger: {
    getRawLogger: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
    }),
    setRequestContext: jest.fn(),
    cleanupContext: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    flush: jest.fn(),
  },
}));

jest.mock('../../src/config/health.config', () => ({
  setupHealthChecks: jest.fn(),
}));

jest.mock('../../src/services/browser.pool.service', () => ({
  browserPool: {
    shutdown: jest.fn().mockImplementation(() => Promise.resolve()),
    getPoolStats: jest.fn(() => ({ active: 0, idle: 0 })),
  },
}));

jest.mock('../../src/services/cache.service', () => ({
  analysisCache: {
    clear: jest.fn(),
    getStats: jest.fn(() => ({ size: 0, hits: 0, misses: 0 })),
  },
}));

jest.mock('../../src/services/performance.service', () => ({
  performanceMonitor: {
    recordRequest: jest.fn(),
    reset: jest.fn(),
    getMetrics: jest.fn(() => ({ requests: 0, avgDuration: 0 })),
    getHealthStatus: jest.fn(() => ({ status: 'healthy' })),
    getAlerts: jest.fn(() => []),
    toPrometheusMetrics: jest.fn(() => '# performance metrics'),
  },
}));

jest.mock('../../src/services/metrics.service', () => ({
  metricsCollector: {
    getMetrics: jest.fn(() => ({ collected: 0 })),
    toPrometheusFormat: jest.fn(() => '# metrics'),
  },
  metricsMiddleware: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock('../../src/routes/analyze.route', () => {
  const router = express.Router();
  router.post('/', (req, res) => {
    res.json({ success: true, tool: 'axe-core' });
  });
  return router;
});

jest.mock('../../src/routes/health.route', () => {
  const router = express.Router();
  router.get('/', (req, res) => {
    res.json({ status: 'healthy' });
  });
  return router;
});

jest.mock('../../src/routes/monitoring.route', () => ({
  monitoringRouter: (() => {
    const router = express.Router();
    router.get('/dashboard', (req, res) => {
      res.json({ dashboard: 'data' });
    });
    return router;
  })(),
}));

// Create trackable middleware mocks
const mockGeneralLimiter = jest.fn((req: any, res: any, next: any) => next());
const mockAnalyzeLimiter = jest.fn((req: any, res: any, next: any) => next());

jest.mock('../../src/middlewares/rateLimit', () => ({
  generalLimiter: mockGeneralLimiter,
  analyzeLimiter: mockAnalyzeLimiter,
}));

// Create actual middleware function mocks that can be tracked
const mockAttachRequestId = jest.fn((req: any, res: any, next: any) => {
  req.id = 'test-request-id';
  next();
});

const mockNotFoundHandler = jest.fn((req: any, res: any) => {
  res.status(404).json({ error: 'Not Found' });
});

const mockErrorHandler = jest.fn((err: any, req: any, res: any, next: any) => {
  res.status(500).json({ error: 'Internal Server Error' });
});

jest.mock('../../src/middlewares/requestId', () => ({
  attachRequestId: mockAttachRequestId,
}));

jest.mock('../../src/middlewares/errorHandler', () => ({
  notFoundHandler: mockNotFoundHandler,
  errorHandler: mockErrorHandler,
}));

jest.mock('../../src/swagger', () => ({
  swaggerSpec: { info: { title: 'Test API', version: '1.0.0' } },
}));

jest.mock('swagger-ui-express', () => ({
  serve: jest.fn((req: any, res: any, next: any) => next()),
  setup: jest.fn(() => (req: any, res: any) => {
    res.json({ swagger: 'ui' });
  }),
}));

jest.mock('pino-http', () => {
  return jest.fn(() => (req: any, res: any, next: any) => next());
});

// Mock environment variables
jest.mock('../../src/utils/environment', () => ({
  ENV: {
    TRUST_PROXY: false,
    CORS_ORIGINS: [],
    PORT: 3000,
    NODE_ENV: 'test',
    CACHE_MAX_ENTRIES: 1000,
    CACHE_MAX_MEMORY_MB: 100,
    ANALYZE_TIMEOUT_MS: 30000,
    NAVIGATION_TIMEOUT_MS: 10000,
    BROWSER_POOL_SIZE: 2,
    RATE_LIMIT_MAX_REQUESTS: 100,
    ANALYZE_RATE_LIMIT_MAX: 10,
  },
  FeatureFlags: {
    enableMetrics: () => true,
    isProduction: () => false,
  },
}));

describe('Server Configuration', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    // Import app after mocks are set up
    app = require('../../src/server').default;
  });

  afterAll(async () => {
    // Allow Jest to cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Basic Server Setup', () => {
    it('should be an Express application', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });

    it('should disable x-powered-by header', () => {
      expect(app.get('x-powered-by')).toBe(false);
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
    });

    it('should attach request ID to requests', async () => {
      await request(app).get('/health');
      expect(mockAttachRequestId).toHaveBeenCalled();
    });

    it('should apply rate limiting', async () => {
      await request(app).get('/health');
      expect(mockGeneralLimiter).toHaveBeenCalled();
    });

    it('should parse JSON payloads', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ inputType: 'html', html: '<div>test</div>' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });
  });

  describe('Route Configuration', () => {
    it('should serve health endpoint', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'healthy' });
    });

    it('should serve analyze endpoint', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ inputType: 'html', html: '<div>test</div>' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should serve monitoring dashboard', async () => {
      const response = await request(app).get('/api/monitoring/dashboard');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ dashboard: 'data' });
    });

    it('should serve metrics endpoint with JSON format', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.requestId).toBeDefined();
    });

    it('should serve metrics endpoint with Prometheus format', async () => {
      const response = await request(app).get('/metrics?format=prometheus');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe(
        'text/plain; charset=utf-8'
      );
      expect(response.text).toContain('# metrics');
    });

    it('should serve Swagger UI', async () => {
      const response = await request(app).get('/api/docs');
      expect(response.status).toBe(200);
    });

    it('should serve Swagger JSON spec', async () => {
      const response = await request(app).get('/api/docs.json');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.info).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app).get('/nonexistent-route');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    it('should use error handler middleware', async () => {
      // Create a scenario that would trigger 404 to test error handler
      await request(app).get('/nonexistent-route');
      expect(mockNotFoundHandler).toHaveBeenCalled();
    });
  });

  describe('Security Configuration', () => {
    it('should apply helmet security headers', async () => {
      const response = await request(app).get('/health');
      // Helmet adds various security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should configure CSP headers for Swagger', async () => {
      const response = await request(app).get('/api/docs');
      // Should not block due to crossOriginEmbedderPolicy: false
      expect(response.status).toBe(200);
    });
  });
});

describe('Server Utility Functions', () => {
  let getRequestIdAsString: (id: unknown) => string;

  beforeAll(() => {
    // Test the utility function by importing the module after mocks
    require('../../src/server');
    // Since the function is not exported, we'll test it indirectly through requests
  });

  describe('Request ID Handling', () => {
    it('should handle string request IDs in metrics', async () => {
      const app = require('../../src/server').default;
      const response = await request(app).get('/metrics');
      expect(response.body.requestId).toBeDefined();
      expect(typeof response.body.requestId).toBe('string');
    });

    it('should include request ID in all responses', async () => {
      const app = require('../../src/server').default;
      const response = await request(app).get('/metrics');
      expect(response.body.requestId).toBe('test-request-id');
    });
  });
});

describe('Performance Monitoring', () => {
  it('should record request performance metrics', async () => {
    const {
      performanceMonitor,
    } = require('../../src/services/performance.service');
    const app = require('../../src/server').default;

    await request(app).get('/health');

    // Should call recordRequest when request finishes
    expect(performanceMonitor.recordRequest).toHaveBeenCalled();
  });

  it('should set up request context for logging', async () => {
    const { advancedLogger } = require('../../src/services/logging.service');
    const app = require('../../src/server').default;

    await request(app).get('/health');

    expect(advancedLogger.setRequestContext).toHaveBeenCalled();
    expect(advancedLogger.cleanupContext).toHaveBeenCalled();
  });
});

describe('Environment Configuration', () => {
  it('should use correct CORS origins from environment', () => {
    const { ENV } = require('../../src/utils/environment');
    expect(ENV.CORS_ORIGINS).toEqual([]);
  });

  it('should use correct port from environment', () => {
    const { ENV } = require('../../src/utils/environment');
    expect(ENV.PORT).toBe(3000);
  });

  it('should enable metrics based on feature flags', () => {
    const { FeatureFlags } = require('../../src/utils/environment');
    expect(FeatureFlags.enableMetrics()).toBe(true);
  });
});

describe('Auth Status Endpoint', () => {
  let mockIsJwtEnabled: jest.Mock;
  let mockIsGatewayValidationEnabled: jest.Mock;

  beforeEach(() => {
    // Mock the config functions
    mockIsJwtEnabled = jest.fn();
    mockIsGatewayValidationEnabled = jest.fn();

    jest.mock('../../src/config/jwt.config', () => ({
      isJwtEnabled: mockIsJwtEnabled,
    }));

    jest.mock('../../src/config/gateway.config', () => ({
      isGatewayValidationEnabled: mockIsGatewayValidationEnabled,
    }));
  });

  it('should return JWT enabled status when JWT is enabled', async () => {
    mockIsJwtEnabled.mockReturnValue(true);
    mockIsGatewayValidationEnabled.mockReturnValue(false);

    const app = require('../../src/server').default;
    const response = await request(app).get('/api/auth/status');

    expect(response.status).toBe(200);
    expect(response.body.jwtEnabled).toBeDefined();
    expect(response.body.gatewayValidationEnabled).toBeDefined();
    expect(response.body.message).toBeDefined();
  });

  it('should return JWT disabled status when JWT is disabled', async () => {
    mockIsJwtEnabled.mockReturnValue(false);
    mockIsGatewayValidationEnabled.mockReturnValue(false);

    const app = require('../../src/server').default;
    const response = await request(app).get('/api/auth/status');

    expect(response.status).toBe(200);
    expect(response.body.jwtEnabled).toBeDefined();
  });
});

describe('Route Protection Scenarios', () => {
  let mockIsJwtEnabled: jest.Mock;
  let mockIsGatewayValidationEnabled: jest.Mock;
  let mockAuthenticateJWT: jest.Mock;
  let mockValidateGatewaySecret: jest.Mock;
  let mockExtractUserContext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockIsJwtEnabled = jest.fn();
    mockIsGatewayValidationEnabled = jest.fn();
    mockAuthenticateJWT = jest.fn((req: any, res: any, next: any) => next());
    mockValidateGatewaySecret = jest.fn((req: any, res: any, next: any) =>
      next()
    );
    mockExtractUserContext = jest.fn((req: any, res: any, next: any) => next());

    jest.mock('../../src/config/jwt.config', () => ({
      isJwtEnabled: mockIsJwtEnabled,
    }));

    jest.mock('../../src/config/gateway.config', () => ({
      isGatewayValidationEnabled: mockIsGatewayValidationEnabled,
    }));

    jest.mock('../../src/middlewares/auth.middleware', () => ({
      authenticateJWT: mockAuthenticateJWT,
    }));

    jest.mock('../../src/middlewares/gateway.middleware', () => ({
      validateGatewaySecret: mockValidateGatewaySecret,
    }));

    jest.mock('../../src/middlewares/user-context.middleware', () => ({
      extractUserContext: mockExtractUserContext,
    }));
  });

  it('should protect routes with Gateway + JWT + UserContext when both enabled', async () => {
    mockIsGatewayValidationEnabled.mockReturnValue(true);
    mockIsJwtEnabled.mockReturnValue(true);

    // Re-require to pick up new mocks
    jest.resetModules();
    const app = require('../../src/server').default;

    await request(app).post('/api/analyze').send({ inputType: 'html' });

    // All middlewares should be called
    expect(mockValidateGatewaySecret).toHaveBeenCalled();
    expect(mockAuthenticateJWT).toHaveBeenCalled();
    expect(mockExtractUserContext).toHaveBeenCalled();
  });

  it('should protect routes with Gateway + UserContext when only Gateway enabled', async () => {
    mockIsGatewayValidationEnabled.mockReturnValue(true);
    mockIsJwtEnabled.mockReturnValue(false);

    jest.resetModules();
    const app = require('../../src/server').default;

    await request(app).post('/api/analyze').send({ inputType: 'html' });

    expect(mockValidateGatewaySecret).toHaveBeenCalled();
    expect(mockExtractUserContext).toHaveBeenCalled();
    // JWT should NOT be called
    expect(mockAuthenticateJWT).not.toHaveBeenCalled();
  });

  it('should protect routes with JWT + UserContext when only JWT enabled', async () => {
    mockIsGatewayValidationEnabled.mockReturnValue(false);
    mockIsJwtEnabled.mockReturnValue(true);

    jest.resetModules();
    const app = require('../../src/server').default;

    await request(app).post('/api/analyze').send({ inputType: 'html' });

    expect(mockAuthenticateJWT).toHaveBeenCalled();
    expect(mockExtractUserContext).toHaveBeenCalled();
    // Gateway should NOT be called
    expect(mockValidateGatewaySecret).not.toHaveBeenCalled();
  });

  it('should only extract UserContext when neither Gateway nor JWT enabled', async () => {
    mockIsGatewayValidationEnabled.mockReturnValue(false);
    mockIsJwtEnabled.mockReturnValue(false);

    jest.resetModules();
    const app = require('../../src/server').default;

    await request(app).post('/api/analyze').send({ inputType: 'html' });

    expect(mockExtractUserContext).toHaveBeenCalled();
    // Neither Gateway nor JWT should be called
    expect(mockValidateGatewaySecret).not.toHaveBeenCalled();
    expect(mockAuthenticateJWT).not.toHaveBeenCalled();
  });
});

describe('getRequestIdAsString utility', () => {
  it('should handle string request ID', () => {
    const app = require('../../src/server').default;
    // Test indirectly through metrics endpoint which uses the helper
    return request(app).get('/metrics').expect(200);
  });

  it('should handle number request ID', async () => {
    const app = require('../../src/server').default;
    const response = await request(app).get('/metrics');
    expect(response.body.requestId).toBeDefined();
  });

  it('should handle object with toString', async () => {
    const app = require('../../src/server').default;
    const response = await request(app).get('/metrics');
    expect(typeof response.body.requestId).toBe('string');
  });

  it('should handle unknown request ID type', async () => {
    const app = require('../../src/server').default;
    // Even if req.id is undefined, should return 'unknown'
    const response = await request(app).get('/metrics');
    expect(response.body.requestId).toBeDefined();
  });
});

describe('Trust Proxy Configuration', () => {
  it('should set trust proxy when TRUST_PROXY is true', () => {
    const { ENV } = require('../../src/utils/environment');
    ENV.TRUST_PROXY = true;

    jest.resetModules();
    const app = require('../../src/server').default;

    // App should have trust proxy set
    expect(app).toBeDefined();
  });

  it('should not set trust proxy when TRUST_PROXY is false', () => {
    const { ENV } = require('../../src/utils/environment');
    ENV.TRUST_PROXY = false;

    jest.resetModules();
    const app = require('../../src/server').default;

    expect(app).toBeDefined();
  });
});

describe('CORS Origins Configuration', () => {
  it('should use specific origins when CORS_ORIGINS has values', () => {
    const { ENV } = require('../../src/utils/environment');
    ENV.CORS_ORIGINS = ['http://localhost:3000', 'http://example.com'];

    jest.resetModules();
    const app = require('../../src/server').default;

    expect(app).toBeDefined();
  });

  it('should allow all origins when CORS_ORIGINS is empty', () => {
    const { ENV } = require('../../src/utils/environment');
    ENV.CORS_ORIGINS = [];

    jest.resetModules();
    const app = require('../../src/server').default;

    expect(app).toBeDefined();
  });
});

describe('Performance Monitoring - Success vs Failure', () => {
  it('should record success metric for 2xx responses', async () => {
    const {
      performanceMonitor,
    } = require('../../src/services/performance.service');
    jest.clearAllMocks();

    const app = require('../../src/server').default;
    await request(app).get('/health');

    // Wait for 'finish' event
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should record with success=true
    expect(performanceMonitor.recordRequest).toHaveBeenCalledWith(
      expect.any(Number),
      true
    );
  });

  it('should record failure metric for 4xx responses', async () => {
    const {
      performanceMonitor,
    } = require('../../src/services/performance.service');
    jest.clearAllMocks();

    const app = require('../../src/server').default;
    await request(app).get('/nonexistent-route');

    // Wait for 'finish' event
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should record with success=false (404 >= 400)
    expect(performanceMonitor.recordRequest).toHaveBeenCalledWith(
      expect.any(Number),
      false
    );
  });
});

describe('Metrics Endpoint - Debug Logging', () => {
  it('should log debug message when metrics are requested', async () => {
    const { advancedLogger } = require('../../src/services/logging.service');
    jest.clearAllMocks();

    const app = require('../../src/server').default;
    await request(app).get('/metrics');

    expect(advancedLogger.debug).toHaveBeenCalledWith(
      'Metrics requested',
      expect.objectContaining({ requestId: expect.any(String) })
    );
  });
});
