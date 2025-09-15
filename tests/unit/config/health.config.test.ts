/**
 * Tests unitarios para health.config.ts
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  getHealthDashboard,
  getServicesStatus,
  setupHealthChecks,
  stopHealthMonitoring,
} from '../../../src/config/health.config';

describe('Health Config', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('setupHealthChecks', () => {
    it('should log setup completion messages', () => {
      setupHealthChecks();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup] 🚫 Health checks automáticos DESHABILITADOS'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup] ℹ️  Solo endpoints básicos disponibles:'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup]     - GET /health (health check básico)'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup]     - GET /health/shallow (health check superficial)'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup]     - GET /health/deep (health check profundo)'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup]     - GET /health/ready (readiness check)'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup]     - GET /health/live (liveness check)'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup] 💡 Esto mejora la estabilidad y reduce la complejidad del sistema'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup] ✅ Configuración simplificada completada'
      );
    });

    it('should not throw any errors', () => {
      expect(() => setupHealthChecks()).not.toThrow();
    });
  });

  describe('getHealthDashboard', () => {
    it('should return a valid health dashboard object', () => {
      const result = getHealthDashboard();

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Object);
    });

    it('should include timestamp', () => {
      const result = getHealthDashboard();

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp as string)).toBeInstanceOf(Date);
    });

    it('should have simplified status', () => {
      const result = getHealthDashboard();

      expect(result.status).toBe('simplified');
      expect(result.message).toBe(
        'Health monitoring automático deshabilitado por estabilidad'
      );
    });

    it('should include all required endpoints', () => {
      const result = getHealthDashboard();

      expect(result.endpoints).toBeDefined();
      expect(Array.isArray(result.endpoints)).toBe(true);

      const endpoints = result.endpoints as Array<{
        path: string;
        description: string;
      }>;
      expect(endpoints).toHaveLength(5);

      const expectedEndpoints = [
        { path: '/health', description: 'Health check básico' },
        { path: '/health/shallow', description: 'Health check superficial' },
        { path: '/health/deep', description: 'Health check profundo' },
        { path: '/health/ready', description: 'Readiness check' },
        { path: '/health/live', description: 'Liveness check' },
      ];

      expectedEndpoints.forEach((expectedEndpoint, index) => {
        expect(endpoints[index]).toEqual(expectedEndpoint);
      });
    });

    it('should include system information', () => {
      const result = getHealthDashboard();

      expect(result.system).toBeDefined();
      const system = result.system as Record<string, unknown>;

      expect(system.uptime).toBeDefined();
      expect(typeof system.uptime).toBe('number');
      expect(system.uptime).toBeGreaterThan(0);

      expect(system.memory).toBeDefined();
      expect(typeof system.memory).toBe('object');

      expect(system.version).toBeDefined();
      expect(typeof system.version).toBe('string');

      expect(system.nodeEnv).toBeDefined();
      expect(typeof system.nodeEnv).toBe('string');
    });

    it('should use development as default NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const result = getHealthDashboard();
      const system = result.system as Record<string, unknown>;

      expect(system.nodeEnv).toBe('development');

      // Restore original env
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should use custom NODE_ENV when set', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = getHealthDashboard();
      const system = result.system as Record<string, unknown>;

      expect(system.nodeEnv).toBe('production');

      // Restore original env
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    });
  });

  describe('getServicesStatus', () => {
    it('should return an array of service status', () => {
      const result = getServicesStatus();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should include middleware-core service', () => {
      const result = getServicesStatus();
      const service = result[0];

      expect(service.name).toBe('middleware-core');
      expect(service.status).toBe('healthy');
      expect(service.statusIcon).toBe('✅');
      expect(service.description).toBe('Servicio principal funcionando');
      expect(service.responseTime).toBe(0);
    });

    it('should include timestamp information', () => {
      const result = getServicesStatus();
      const service = result[0];

      expect(service.lastCheck).toBeDefined();
      expect(typeof service.lastCheck).toBe('string');
      expect(new Date(service.lastCheck as string)).toBeInstanceOf(Date);

      expect(service.lastCheckFormatted).toBeDefined();
      expect(typeof service.lastCheckFormatted).toBe('string');
    });

    it('should generate recent timestamps', () => {
      const beforeCall = new Date();
      const result = getServicesStatus();
      const afterCall = new Date();

      const service = result[0];
      const lastCheckDate = new Date(service.lastCheck as string);

      expect(lastCheckDate.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime()
      );
      expect(lastCheckDate.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe('stopHealthMonitoring', () => {
    it('should log stop messages', () => {
      stopHealthMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup] 🛑 Health monitoring ya estaba deshabilitado'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthSetup] ✅ No hay procesos que detener'
      );
    });

    it('should not throw any errors', () => {
      expect(() => stopHealthMonitoring()).not.toThrow();
    });
  });

  describe('integration', () => {
    it('should work together seamlessly', () => {
      expect(() => {
        setupHealthChecks();
        const dashboard = getHealthDashboard();
        const services = getServicesStatus();
        stopHealthMonitoring();

        expect(dashboard).toBeDefined();
        expect(services).toBeDefined();
      }).not.toThrow();
    });

    it('should maintain consistent data structure', () => {
      const dashboard = getHealthDashboard();
      const services = getServicesStatus();

      expect(typeof dashboard).toBe('object');
      expect(Array.isArray(services)).toBe(true);

      // Both should have timestamp information
      expect(dashboard.timestamp).toBeDefined();
      expect(services[0].lastCheck).toBeDefined();
    });
  });
});
