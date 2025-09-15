import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock dependencies
jest.mock('../../src/services/metrics.service', () => ({
  metricsCollector: {
    getMetrics: jest.fn(),
  },
}));

jest.mock('axe-core', () => ({
  default: { version: '4.8.0' },
  version: '4.8.0',
}));

jest.mock('accessibility-checker', () => ({
  default: true,
}));

jest.mock('node:os', () => ({
  freemem: jest.fn().mockReturnValue(1000000000),
  totalmem: jest.fn().mockReturnValue(2000000000),
  uptime: jest.fn().mockReturnValue(3600),
  platform: jest.fn().mockReturnValue('linux'),
  arch: jest.fn().mockReturnValue('x64'),
  release: jest.fn().mockReturnValue('5.4.0'),
  hostname: jest.fn().mockReturnValue('test-host'),
  tmpdir: jest.fn().mockReturnValue('/tmp'),
  homedir: jest.fn().mockReturnValue('/home/user'),
  type: jest.fn().mockReturnValue('Linux'),
  version: jest.fn().mockReturnValue('#1 SMP'),
  cpus: jest.fn().mockReturnValue(Array(4).fill({})),
  loadavg: jest.fn().mockReturnValue([1.0, 1.5, 2.0]),
}));

describe('Health Route Tests', () => {
  let app: express.Express;
  let mockGetMetrics: jest.Mock;
  let mockMemoryUsage: any;

  beforeEach(async () => {
    // Clear mocks and reset cache
    jest.clearAllMocks();
    jest.resetModules();

    // Mock process.memoryUsage
    mockMemoryUsage = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100000000,
      heapTotal: 50000000,
      heapUsed: 25000000,
      external: 5000000,
      arrayBuffers: 1000000,
    });

    // Get mocked functions
    const { metricsCollector } = require('../../src/services/metrics.service');
    mockGetMetrics = metricsCollector.getMetrics;

    // Import and setup the route
    const healthRouter = require('../../src/routes/health.route').default;

    app = express();
    app.use(express.json());

    // Mock request ID middleware
    app.use((req: any, _res, next) => {
      req.id = 'test-health-123';
      req.log = {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      };
      next();
    });

    app.use('/health', healthRouter);
  });

  afterEach(() => {
    mockMemoryUsage.mockRestore();
  });

  describe('GET /health (quick check)', () => {
    it('debe retornar status de salud básico', async () => {
      const mockMetrics = {
        healthScore: 85,
        requests: {
          total: 100,
          success: 95,
        },
      };

      mockGetMetrics.mockReturnValue(mockMetrics);

      const response = await request(app).get('/health').expect(200);

      expect(mockGetMetrics).toHaveBeenCalled();
      expect(response.body).toMatchObject({
        ok: true,
        data: {
          uptime: expect.any(Number),
          timestamp: expect.any(String),
          healthScore: 85,
          requests: {
            total: 100,
            successRate: 0.95,
          },
          memory: {
            used: expect.any(Number),
            total: expect.any(Number),
          },
        },
        requestId: 'test-health-123',
      });
    });

    it('debe manejar métricas con valores por defecto', async () => {
      const mockMetrics = {
        healthScore: 0,
        requests: {
          total: 0,
          success: 0,
        },
      };

      mockGetMetrics.mockReturnValue(mockMetrics);

      const response = await request(app).get('/health').expect(200);

      expect(response.body.data.requests.successRate).toBe(0);
    });
  });

  describe('GET /health?deep=true (deep check)', () => {
    beforeEach(() => {
      // Mock process.env for timeout
      process.env.HEALTHCHECK_TIMEOUT_MS = '1000';
    });

    it('debe retornar status detallado de salud cuando todo está bien', async () => {
      const response = await request(app).get('/health?deep=true').expect(200);

      expect(response.body).toMatchObject({
        ok: true,
        data: {
          uptime: expect.any(Number),
          timestamp: expect.any(String),
          environment: expect.any(String),
          checks: expect.objectContaining({
            axeCorePkg: expect.objectContaining({ ok: expect.any(Boolean) }),
            equalAccessPkg: expect.objectContaining({
              ok: expect.any(Boolean),
            }),
            browserPool: expect.objectContaining({ ok: expect.any(Boolean) }),
            cache: expect.objectContaining({ ok: expect.any(Boolean) }),
            metrics: expect.objectContaining({ ok: expect.any(Boolean) }),
            playwrightAxe: expect.objectContaining({ ok: expect.any(Boolean) }),
          }),
          system: expect.objectContaining({
            platform: 'linux',
            arch: 'x64',
            nodeVersion: expect.any(String),
            memory: expect.any(Object),
            cpus: 4,
            loadAverage: [1.0, 1.5, 2.0],
          }),
        },
        requestId: 'test-health-123',
      });
    });

    it('debe usar cache cuando está disponible', async () => {
      // First request to populate cache
      await request(app).get('/health?deep=true').expect(200);

      // Second request should use cache
      const response = await request(app).get('/health?deep=true').expect(200);

      expect(response.body.cached).toBe(true);
      expect(response.body.requestId).toBe('test-health-123');
    });

    it('debe interpretar parámetro deep correctamente', async () => {
      // Test different deep parameter values
      const deepValues = ['1', 'true', 'yes'];

      for (const deepValue of deepValues) {
        const response = await request(app)
          .get(`/health?deep=${deepValue}`)
          .expect(200);

        expect(response.body.data.checks).toBeDefined();
      }
    });

    it('debe ignorar deep cuando es false o 0', async () => {
      mockGetMetrics.mockReturnValue({
        healthScore: 100,
        requests: { total: 50, success: 50 },
      });

      const falseValues = ['0', 'false', ''];

      for (const falseValue of falseValues) {
        const response = await request(app)
          .get(`/health?deep=${falseValue}`)
          .expect(200);

        // Should not have deep check data
        expect(response.body.data.checks).toBeUndefined();
        expect(response.body.data.healthScore).toBeDefined();
      }
    });
  });

  describe('Health Check Integration', () => {
    it('debe manejar múltiples requests concurrentes', async () => {
      mockGetMetrics.mockReturnValue({
        healthScore: 90,
        requests: { total: 200, success: 180 },
      });

      // Make concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => request(app).get('/health'));

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body.requestId).toBe('test-health-123');
      });

      expect(mockGetMetrics).toHaveBeenCalledTimes(5);
    });

    it('debe validar estructura de respuesta completa', async () => {
      mockGetMetrics.mockReturnValue({
        healthScore: 75,
        requests: { total: 150, success: 120 },
      });

      await request(app)
        .get('/health')
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('ok', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('uptime');
          expect(res.body.data).toHaveProperty('timestamp');
          expect(res.body.data).toHaveProperty('healthScore', 75);
          expect(res.body.data).toHaveProperty('requests');
          expect(res.body.data.requests).toHaveProperty('total', 150);
          expect(res.body.data.requests).toHaveProperty('successRate', 0.8);
          expect(res.body.data).toHaveProperty('memory');
          expect(res.body.data.memory).toHaveProperty('used');
          expect(res.body.data.memory).toHaveProperty('total');
          expect(res.body).toHaveProperty('requestId', 'test-health-123');
        });
    });
  });
});
