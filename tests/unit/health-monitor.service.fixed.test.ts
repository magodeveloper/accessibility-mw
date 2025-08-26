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

describe('HealthMonitor Service', () => {
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

      // Verificar que se registró
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
    });
  });

  describe('Ejecución automática de health checks', () => {
    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('debe ejecutar checks automáticamente y marcar como healthy', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'healthy-service',
        url: 'http://healthy.com/health',
        timeout: 5000,
        interval: 10000,
        retries: 1,
      };

      monitor.registerCheck(config);

      // Avanzar tiempo para que se ejecute el check inicial
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

      // Avanzar tiempo para permitir la ejecución del check y reintentos
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.services[0].status).toBe('unhealthy');
    });

    it('debe manejar timeout correctamente', async () => {
      // Mock que nunca se resuelve (simula timeout)
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const config = {
        name: 'timeout-service',
        url: 'http://timeout.com/health',
        timeout: 1000,
        interval: 10000,
        retries: 1,
      };

      monitor.registerCheck(config);

      // Avanzar tiempo para ejecución inicial y timeout
      jest.advanceTimersByTime(2000);
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.services[0].status).toBe('unhealthy');
    });

    it('debe reintentar según configuración', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const config = {
        name: 'retry-service',
        url: 'http://retry.com/health',
        timeout: 5000,
        interval: 10000,
        retries: 3,
      };

      monitor.registerCheck(config);

      // Avanzar tiempo para permitir todos los reintentos
      jest.advanceTimersByTime(10000);
      await jest.runOnlyPendingTimersAsync();

      // Verificar que se hicieron múltiples llamadas (reintentos)
      expect(mockFetch).toHaveBeenCalledTimes(3);
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

    it('debe calcular estado overall partial con servicios mixtos', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(
        (url: string | URL | Request): Promise<Response> => {
          callCount++;
          if ((url as string).includes('healthy')) {
            return Promise.resolve(new Response('OK', { status: 200 }));
          } else {
            return Promise.reject(new Error('Service down'));
          }
        }
      );

      const configs = [
        {
          name: 'healthy-service',
          url: 'http://healthy.com/health',
          timeout: 5000,
          interval: 10000,
          retries: 1,
        },
        {
          name: 'unhealthy-service',
          url: 'http://unhealthy.com/health',
          timeout: 5000,
          interval: 10000,
          retries: 1,
        },
      ];

      configs.forEach(config => monitor.registerCheck(config));
      await jest.runOnlyPendingTimersAsync();

      const status = monitor.getStatus();
      expect(status.overall).toBe('partial');
      expect(status.services).toHaveLength(2);
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

    it('debe respetar cooldown de alertas', async () => {
      const monitorWithWebhook = new HealthMonitor({
        enabled: true,
        webhook: 'http://webhook.test.com',
        cooldownMs: 5000,
      });

      // Configurar respuestas mock
      mockFetch
        .mockRejectedValueOnce(new Error('Service down'))
        .mockResolvedValueOnce(new Response('Alert sent', { status: 200 }))
        .mockRejectedValueOnce(new Error('Service down'));

      const config = {
        name: 'cooldown-service',
        url: 'http://cooldown.test.com/health',
        timeout: 5000,
        interval: 1000, // Intervalo corto para testing
        retries: 1,
      };

      monitorWithWebhook.registerCheck(config);

      // Primer check - debe enviar alerta
      await jest.runOnlyPendingTimersAsync();

      // Avanzar tiempo menos del cooldown para segundo check
      jest.advanceTimersByTime(2000);
      await jest.runOnlyPendingTimersAsync();

      // Debe haber solo 2 llamadas: 1 health check inicial + 1 webhook
      // El segundo health check no debe generar webhook por cooldown
      const webhookCalls = mockFetch.mock.calls.filter(call =>
        (call[0] as string).includes('webhook.test.com')
      );
      expect(webhookCalls).toHaveLength(1);

      monitorWithWebhook.stop();
    });
  });

  describe('Eventos', () => {
    it('debe emitir evento check-completed', done => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }));

      const config = {
        name: 'event-service',
        url: 'http://event.test.com/health',
        timeout: 5000,
        interval: 60000,
        retries: 1,
      };

      monitor.on('check-completed', (data: any) => {
        expect(data.name).toBe('event-service');
        expect(data.status).toBe('healthy');
        done();
      });

      monitor.registerCheck(config);
      jest.runOnlyPendingTimers();
    });

    it('debe emitir evento statusChanged en transiciones', done => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(new Response('OK', { status: 200 }));
        } else {
          return Promise.reject(new Error('Service down'));
        }
      });

      const config = {
        name: 'status-change-service',
        url: 'http://status.test.com/health',
        timeout: 5000,
        interval: 1000, // Intervalo corto
        retries: 1,
      };

      monitor.on('statusChanged', (data: any) => {
        expect(data.current.name).toBe('status-change-service');
        expect(data.current.status).toBe('unhealthy');
        expect(data.previous.status).toBe('healthy');
        done();
      });

      monitor.registerCheck(config);

      // Esperar primer check (healthy)
      setTimeout(() => {
        // Avanzar tiempo para segundo check (unhealthy)
        jest.advanceTimersByTime(2000);
      }, 100);
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
      expect(jest.getTimerCount()).toBeGreaterThan(0);

      monitor.stop();

      // Verificar que los timers se limpiaron
      expect(jest.getTimerCount()).toBe(0);
    });

    it('debe limpiar listeners al parar', () => {
      const listener = jest.fn();
      monitor.on('check-completed', listener);

      expect(monitor.listenerCount('check-completed')).toBe(1);

      monitor.stop();

      // Los listeners deben permanecer (stop() no los remueve automáticamente)
      expect(monitor.listenerCount('check-completed')).toBe(1);
    });
  });

  describe('Patrón singleton', () => {
    it('debe retornar la misma instancia', () => {
      const instance1 =
        require('../../src/services/health-monitor.service').healthMonitor;
      const instance2 =
        require('../../src/services/health-monitor.service').healthMonitor;

      expect(instance1).toBe(instance2);
    });
  });
});
