import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { HealthMonitor } from '../../src/services/health-monitor.service';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.spyOn(console, 'log').mockImplementation(mockConsole.log);
jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
jest.spyOn(console, 'error').mockImplementation(mockConsole.error);

describe('Health Monitor Service', () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockFetch.mockClear();

    // Crear nueva instancia para cada test
    monitor = new HealthMonitor();
  });

  afterEach(() => {
    // Limpiar timers y listeners
    if (monitor) {
      monitor.stop();
      monitor.removeAllListeners();
    }

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Constructor y configuración', () => {
    it('debe crear instancia con configuración por defecto', () => {
      expect(monitor).toBeInstanceOf(HealthMonitor);
      expect(monitor.getStatus().overall).toBe('healthy');
    });

    it('debe crear instancia con configuración personalizada', () => {
      const customMonitor = new HealthMonitor({
        enabled: true,
        webhook: 'http://test.com/webhook',
        cooldownMs: 5000,
      });

      expect(customMonitor).toBeInstanceOf(HealthMonitor);
      expect(customMonitor.getStatus().overall).toBe('healthy');

      customMonitor.stop();
    });

    it('debe configurar alertConfig correctamente', () => {
      const customMonitor = new HealthMonitor({
        enabled: false,
        webhook: 'http://custom.webhook.com',
        cooldownMs: 10000,
      });

      expect(customMonitor).toBeInstanceOf(HealthMonitor);

      customMonitor.stop();
    });
  });

  describe('Registro de health checks', () => {
    it('debe registrar un health check básico', () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'test-service',
        url: 'http://test.com/health',
        timeout: 5000,
        interval: 60000, // Intervalo largo
        retries: 3,
      };

      monitor.registerCheck(config);

      // Verificar que se registró - inicialmente en estado unknown
      const status = monitor.getStatus();
      expect(status.services).toHaveLength(1);
      expect(status.services[0].name).toBe('test-service');
      expect(status.services[0].status).toBe('unknown');
    });

    it('debe registrar múltiples health checks', () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const configs = [
        {
          name: 'service1',
          url: 'http://service1.com/health',
          timeout: 5000,
          interval: 60000,
          retries: 3,
        },
        {
          name: 'service2',
          url: 'http://service2.com/health',
          timeout: 5000,
          interval: 60000,
          retries: 3,
        },
      ];

      configs.forEach(config => monitor.registerCheck(config));

      const status = monitor.getStatus();
      expect(status.services).toHaveLength(2);
      expect(status.services.every(s => s.status === 'unknown')).toBe(true);
    });

    it('debe iniciar monitoreo automático al registrar', () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'auto-service',
        url: 'http://auto.com/health',
        timeout: 5000,
        interval: 60000,
        retries: 1,
      };

      // Verificar que hay timers activos después del registro
      expect(jest.getTimerCount()).toBe(0);
      monitor.registerCheck(config);

      // El registerCheck debe crear al menos un timer
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });
  });

  describe('Ejecución automática de health checks', () => {
    it('debe ejecutar check automáticamente y marcar como healthy', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'healthy-service',
        url: 'http://healthy.com/health',
        timeout: 5000,
        interval: 10000,
        retries: 1,
      };

      monitor.registerCheck(config);

      // Esperar a que se ejecute el check inicial
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.services[0].status).toBe('healthy');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://healthy.com/health',
        expect.objectContaining({
          method: 'GET',
          headers: { 'User-Agent': 'HealthMonitor/1.0' },
        })
      );
    });

    it('debe marcar como unhealthy cuando el servicio falla', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const config = {
        name: 'unhealthy-service',
        url: 'http://unhealthy.com/health',
        timeout: 5000,
        interval: 10000,
        retries: 1,
      };

      monitor.registerCheck(config);

      // Esperar a que se ejecute el check con reintentos
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.services[0].status).toBe('unhealthy');
    });

    it('debe manejar status code incorrecto', async () => {
      mockFetch.mockResolvedValue(
        new Response('Server Error', { status: 500 })
      );

      const config = {
        name: 'error-service',
        url: 'http://error.com/health',
        timeout: 5000,
        interval: 10000,
        retries: 1,
        expectedStatus: 200,
      };

      monitor.registerCheck(config);

      // Esperar a que se ejecute el check
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.services[0].status).toBe('unhealthy');
    });

    it('debe usar expectedStatus personalizado', async () => {
      mockFetch.mockResolvedValue(new Response('Maintenance', { status: 503 }));

      const config = {
        name: 'maintenance-service',
        url: 'http://maintenance.com/health',
        timeout: 5000,
        interval: 10000,
        retries: 1,
        expectedStatus: 503, // Acepta 503 como healthy
      };

      monitor.registerCheck(config);
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.services[0].status).toBe('healthy');
    });
  });

  describe('Estados y métricas', () => {
    it('debe calcular estado overall healthy con servicios healthy', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'healthy-service',
        url: 'http://healthy.com/health',
        timeout: 5000,
        interval: 10000,
        retries: 1,
      };

      monitor.registerCheck(config);
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.overall).toBe('healthy');
    });

    it('debe calcular estado overall unhealthy con servicios unhealthy', async () => {
      mockFetch.mockRejectedValue(new Error('Service down'));

      const config = {
        name: 'unhealthy-service',
        url: 'http://unhealthy.com/health',
        timeout: 5000,
        interval: 10000,
        retries: 1,
      };

      monitor.registerCheck(config);
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.overall).toBe('unhealthy');
    });

    it('debe retornar métricas correctas', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const configs = [
        {
          name: 'service1',
          url: 'http://service1.com/health',
          timeout: 5000,
          interval: 10000,
          retries: 1,
        },
        {
          name: 'service2',
          url: 'http://service2.com/health',
          timeout: 5000,
          interval: 10000,
          retries: 1,
        },
      ];

      configs.forEach(config => monitor.registerCheck(config));
      await jest.runOnlyPendingTimersAsync();

      const metrics = monitor.getMetrics();
      expect(metrics.totalServices).toBe(2);
      expect(metrics.healthyServices).toBe(2);
      expect(metrics.unhealthyServices).toBe(0);
    });

    it('debe incluir detalles en el estado', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'detail-service',
        url: 'http://detail.com/health',
        timeout: 5000,
        interval: 10000,
        retries: 1,
      };

      monitor.registerCheck(config);
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      const service = status.services[0];

      expect(service.name).toBe('detail-service');
      expect(service.status).toBe('healthy');
      expect(service.responseTime).toBeGreaterThanOrEqual(0);
      expect(service.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Sistema de alertas', () => {
    it('debe enviar webhook alert para servicio unhealthy', async () => {
      const monitorWithWebhook = new HealthMonitor({
        enabled: true,
        webhook: 'http://webhook.test.com',
        cooldownMs: 1000,
      });

      // Primera llamada falla (health check), segunda es exitosa (webhook)
      mockFetch
        .mockRejectedValueOnce(new Error('Service down'))
        .mockResolvedValueOnce(new Response('Alert sent', { status: 200 }));

      const config = {
        name: 'alert-service',
        url: 'http://alert.test.com/health',
        timeout: 5000,
        interval: 60000, // Intervalo largo
        retries: 1,
      };

      monitorWithWebhook.registerCheck(config);
      await jest.runOnlyPendingTimersAsync();

      // Verificar que se llamó al webhook
      expect(mockFetch).toHaveBeenCalledWith(
        'http://webhook.test.com',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('alert-service'),
        })
      );

      monitorWithWebhook.stop();
    });

    it('debe manejar error en webhook', async () => {
      const monitorWithWebhook = new HealthMonitor({
        enabled: true,
        webhook: 'http://webhook.test.com',
        cooldownMs: 1000,
      });

      // Health check falla, webhook también falla
      mockFetch
        .mockRejectedValueOnce(new Error('Service down'))
        .mockRejectedValueOnce(new Error('Webhook failed'));

      const config = {
        name: 'webhook-error-service',
        url: 'http://error.test.com/health',
        timeout: 5000,
        interval: 60000,
        retries: 1,
      };

      monitorWithWebhook.registerCheck(config);
      await jest.runOnlyPendingTimersAsync();

      // Debe haber intentado llamar al webhook a pesar del error
      expect(mockFetch).toHaveBeenCalledWith(
        'http://webhook.test.com',
        expect.objectContaining({
          method: 'POST',
        })
      );

      monitorWithWebhook.stop();
    });
  });

  describe('Eventos', () => {
    it('debe emitir evento check-completed en check exitoso', done => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'event-service',
        url: 'http://event.test.com/health',
        timeout: 5000,
        interval: 60000,
        retries: 1,
      };

      monitor.once('check-completed', (data: any) => {
        expect(data.name).toBe('event-service');
        expect(data.status).toBe('healthy');
        expect(data.responseTime).toBeGreaterThanOrEqual(0);
        done();
      });

      monitor.registerCheck(config);
      jest.runOnlyPendingTimers();
    });

    it('debe emitir evento check-completed en check fallido', done => {
      mockFetch.mockRejectedValue(new Error('Service down'));

      const config = {
        name: 'failed-event-service',
        url: 'http://failed.test.com/health',
        timeout: 5000,
        interval: 60000,
        retries: 1,
      };

      monitor.once('check-completed', (data: any) => {
        expect(data.name).toBe('failed-event-service');
        expect(data.status).toBe('unhealthy');
        expect(data.error).toBeTruthy();
        done();
      });

      monitor.registerCheck(config);
      jest.runOnlyPendingTimers();
    });
  });

  describe('Control del servicio', () => {
    it('debe detener monitoreo con stop()', () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'stop-service',
        url: 'http://stop.test.com/health',
        timeout: 5000,
        interval: 1000,
        retries: 1,
      };

      monitor.registerCheck(config);

      // Verificar que hay timers activos
      const initialTimerCount = jest.getTimerCount();
      expect(initialTimerCount).toBeGreaterThan(0);

      monitor.stop();

      // Verificar que se redujeron los timers
      const finalTimerCount = jest.getTimerCount();
      expect(finalTimerCount).toBeLessThan(initialTimerCount);
    });

    it('debe manejar stop() sin checks registrados', () => {
      expect(() => monitor.stop()).not.toThrow();
    });

    it('debe permitir múltiples llamadas a stop()', () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'multi-stop-service',
        url: 'http://multistop.test.com/health',
        timeout: 5000,
        interval: 1000,
        retries: 1,
      };

      monitor.registerCheck(config);

      expect(() => {
        monitor.stop();
        monitor.stop(); // Segunda llamada no debe causar error
      }).not.toThrow();
    });
  });

  describe('Manejo de errores', () => {
    it('debe manejar URL inválida', async () => {
      mockFetch.mockRejectedValue(new TypeError('Invalid URL'));

      const config = {
        name: 'invalid-url-service',
        url: 'invalid-url',
        timeout: 5000,
        interval: 10000,
        retries: 1,
      };

      monitor.registerCheck(config);
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.services[0].status).toBe('unhealthy');
      expect(status.services[0].error).toContain('Invalid URL');
    });

    it('debe manejar timeout de red', async () => {
      // Mock que simula timeout usando Promise.reject después de un delay
      mockFetch.mockImplementation(() => {
        // Simular async timeout con Promise reject directo
        return Promise.reject(new Error('timeout'));
      });

      const config = {
        name: 'network-timeout-service',
        url: 'http://timeout.test.com/health',
        timeout: 50, // Timeout muy corto
        interval: 10000,
        retries: 1,
      };

      monitor.registerCheck(config);

      // Avanzar tiempo para que el timeout se active
      jest.advanceTimersByTime(100);
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.services[0].status).toBe('unhealthy');
    });
  });

  describe('Patrón singleton', () => {
    it('debe retornar la misma instancia', () => {
      const instance1 =
        require('../../src/services/health-monitor.service').healthMonitor;
      const instance2 =
        require('../../src/services/health-monitor.service').healthMonitor;

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(HealthMonitor);
    });

    it('debe mantener estado entre referencias', () => {
      const instance1 =
        require('../../src/services/health-monitor.service').healthMonitor;

      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      instance1.registerCheck({
        name: 'singleton-service',
        url: 'http://singleton.test.com/health',
        timeout: 5000,
        interval: 60000,
        retries: 1,
      });

      const instance2 =
        require('../../src/services/health-monitor.service').healthMonitor;
      const status = instance2.getStatus();

      expect(status.services).toHaveLength(1);
      expect(status.services[0].name).toBe('singleton-service');
    });
  });
});
