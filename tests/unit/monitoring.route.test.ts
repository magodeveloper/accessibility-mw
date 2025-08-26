import express from 'express';
import request from 'supertest';

// Mock dependencies
jest.mock('../../src/config/health.config', () => ({
  getHealthDashboard: jest.fn(),
  getServicesStatus: jest.fn(),
}));

describe('Monitoring Route Tests', () => {
  let app: express.Express;
  let mockGetHealthDashboard: jest.Mock;
  let mockGetServicesStatus: jest.Mock;

  beforeEach(async () => {
    // Clear mocks
    jest.clearAllMocks();

    // Get mocked functions
    const healthConfig = require('../../src/config/health.config');
    mockGetHealthDashboard = healthConfig.getHealthDashboard;
    mockGetServicesStatus = healthConfig.getServicesStatus;

    // Import and setup the route
    const { monitoringRouter } = require('../../src/routes/monitoring.route');

    app = express();
    app.use(express.json());

    // Mock request ID middleware
    app.use((req: any, _res, next) => {
      req.id = 'test-request-123';
      next();
    });

    app.use('/monitoring', monitoringRouter);
  });

  describe('GET /monitoring/dashboard', () => {
    it('debe retornar dashboard de monitoreo', async () => {
      const mockDashboard = {
        status: 'healthy',
        services: {
          axe: true,
          'equal-access': true,
          browser: true,
        },
        timestamp: Date.now(),
      };

      mockGetHealthDashboard.mockReturnValue(mockDashboard);

      const response = await request(app)
        .get('/monitoring/dashboard')
        .expect(200);

      expect(mockGetHealthDashboard).toHaveBeenCalled();
      expect(response.body).toMatchObject({
        ...mockDashboard,
        requestId: 'test-request-123',
      });
    });

    it('debe manejar errores en dashboard', async () => {
      const error = new Error('Dashboard error');
      mockGetHealthDashboard.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/monitoring/dashboard')
        .expect(500);

      expect(mockGetHealthDashboard).toHaveBeenCalled();
      expect(response.body).toMatchObject({
        ok: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        requestId: 'test-request-123',
      });
    });
  });

  describe('GET /monitoring/status', () => {
    it('debe retornar estado del sistema', async () => {
      const response = await request(app).get('/monitoring/status').expect(200);

      expect(response.body).toMatchObject({
        timestamp: expect.any(String),
        status: 'healthy',
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          rss: expect.any(Number),
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
        }),
        version: expect.any(String),
        environment: expect.any(String),
        requestId: 'test-request-123',
      });
    });
  });

  describe('GET /monitoring/services', () => {
    it('debe retornar estado de servicios', async () => {
      const mockServices = [
        { status: 'healthy', name: 'axe-core', responseTime: 50 },
        { status: 'healthy', name: 'equal-access', responseTime: 75 },
        { status: 'degraded', name: 'browser-pool', responseTime: 200 },
      ];

      mockGetServicesStatus.mockReturnValue(mockServices);

      const response = await request(app)
        .get('/monitoring/services')
        .expect(200);

      expect(mockGetServicesStatus).toHaveBeenCalled();
      expect(response.body).toMatchObject({
        services: mockServices,
        total: 3,
        healthy: 2,
        timestamp: expect.any(String),
        requestId: 'test-request-123',
      });
    });

    it('debe manejar errores en servicios', async () => {
      const error = new Error('Services error');
      mockGetServicesStatus.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/monitoring/services')
        .expect(500);

      expect(mockGetServicesStatus).toHaveBeenCalled();
      expect(response.body).toMatchObject({
        ok: false,
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        requestId: 'test-request-123',
      });
    });
  });

  describe('GET /monitoring/metrics', () => {
    it('debe retornar métricas del sistema', async () => {
      const response = await request(app)
        .get('/monitoring/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          rss: expect.any(Number),
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
        }),
        cpu: expect.objectContaining({
          user: expect.any(Number),
          system: expect.any(Number),
        }),
        version: expect.any(String),
        platform: expect.any(String),
        arch: expect.any(String),
        environment: expect.any(String),
        requestId: 'test-request-123',
      });
    });
  });

  describe('Monitoring Integration', () => {
    it('debe manejar requests concurrentes a diferentes endpoints', async () => {
      // Setup mocks
      mockGetHealthDashboard.mockReturnValue({ status: 'healthy' });
      mockGetServicesStatus.mockReturnValue([
        { status: 'healthy', name: 'test' },
      ]);

      // Make concurrent requests to different endpoints
      const promises = [
        request(app).get('/monitoring/dashboard'),
        request(app).get('/monitoring/status'),
        request(app).get('/monitoring/services'),
        request(app).get('/monitoring/metrics'),
      ];

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(4);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.requestId).toBe('test-request-123');
      });

      expect(mockGetHealthDashboard).toHaveBeenCalledTimes(1);
      expect(mockGetServicesStatus).toHaveBeenCalledTimes(1);
    });

    it('debe incluir requestId en todas las respuestas', async () => {
      mockGetHealthDashboard.mockReturnValue({ status: 'healthy' });

      await request(app)
        .get('/monitoring/dashboard')
        .expect(200)
        .expect(res => {
          expect(res.body.requestId).toBe('test-request-123');
        });
    });

    it('debe manejar requests sin requestId', async () => {
      // Create app without requestId middleware
      const appNoId = express();
      appNoId.use(express.json());
      const { monitoringRouter } = require('../../src/routes/monitoring.route');
      appNoId.use('/monitoring', monitoringRouter);

      mockGetHealthDashboard.mockReturnValue({ status: 'healthy' });

      await request(appNoId)
        .get('/monitoring/dashboard')
        .expect(200)
        .expect(res => {
          expect(res.body.requestId).toBeUndefined();
        });
    });
  });
});
