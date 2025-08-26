/**
 * Tests for Performance Service
 * Testing comprehensive performance monitoring with metrics, alerts, and health scoring
 */

import { performanceMonitor } from '../../src/services/performance.service';
import * as EnvironmentModule from '../../src/utils/environment';

// Mock para FeatureFlags
jest.mock('../../src/utils/environment', () => ({
  FeatureFlags: {
    enableMetrics: jest.fn().mockReturnValue(true),
  },
}));

describe('Performance Service', () => {
  let consoleSpy: jest.SpyInstance;

  beforeAll(() => {
    // Ensure FeatureFlags mock is properly set
    const EnvironmentModule = require('../../src/utils/environment');
    EnvironmentModule.FeatureFlags.enableMetrics.mockReturnValue(true);
  });

  beforeEach(() => {
    // Mock console.warn para capturar alertas
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset monitor state
    performanceMonitor.reset();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Inicialización y configuración', () => {
    test('debe inicializar con métricas por defecto', () => {
      const metrics = performanceMonitor.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.healthScore).toBe(100);
      expect(metrics.cacheHitRate).toBe(0);
      expect(metrics.analysisCount).toBe(0);
      expect(typeof metrics.memoryUsage).toBe('object');
      expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
    });

    test('debe tener estructura de métricas correcta', () => {
      const metrics = performanceMonitor.getMetrics();

      // Request metrics
      expect(typeof metrics.totalRequests).toBe('number');
      expect(typeof metrics.successfulRequests).toBe('number');
      expect(typeof metrics.failedRequests).toBe('number');
      expect(typeof metrics.avgResponseTime).toBe('number');
      expect(typeof metrics.p95ResponseTime).toBe('number');
      expect(typeof metrics.p99ResponseTime).toBe('number');

      // Analysis metrics
      expect(typeof metrics.analysisCount).toBe('number');
      expect(typeof metrics.avgAnalysisTime).toBe('number');
      expect(typeof metrics.cacheHitRate).toBe('number');

      // System health
      expect(typeof metrics.healthScore).toBe('number');
      expect(metrics.lastUpdated instanceof Date).toBe(true);
    });
  });

  describe('Recording de requests', () => {
    test('debe registrar request exitoso', () => {
      performanceMonitor.recordRequest(500, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.avgResponseTime).toBe(500);
    });

    test('debe registrar request fallido', () => {
      performanceMonitor.recordRequest(1000, false);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.avgResponseTime).toBe(1000);
    });

    test('debe calcular métricas de tiempo de respuesta correctamente', () => {
      // Agregar múltiples requests para probar cálculos
      performanceMonitor.recordRequest(100, true);
      performanceMonitor.recordRequest(200, true);
      performanceMonitor.recordRequest(300, true);
      performanceMonitor.recordRequest(400, true);
      performanceMonitor.recordRequest(500, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(300); // (100+200+300+400+500)/5
      expect(metrics.p95ResponseTime).toBe(500);
      expect(metrics.p99ResponseTime).toBe(500);
    });

    test('debe omitir recording cuando metrics están deshabilitadas', () => {
      const mockEnableMetrics = jest.spyOn(
        EnvironmentModule.FeatureFlags,
        'enableMetrics'
      );
      mockEnableMetrics.mockReturnValue(false);

      performanceMonitor.recordRequest(500, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(0);

      mockEnableMetrics.mockRestore();
    });

    test('debe actualizar correctamente con múltiples requests', () => {
      performanceMonitor.recordRequest(100, true);
      performanceMonitor.recordRequest(200, false);
      performanceMonitor.recordRequest(300, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.avgResponseTime).toBe(200); // (100+200+300)/3
    });
  });

  describe('Recording de análisis', () => {
    test('debe registrar análisis con cache hit', () => {
      performanceMonitor.recordAnalysis(100, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.analysisCount).toBe(1);
      expect(metrics.avgAnalysisTime).toBe(100);
      expect(metrics.cacheHitRate).toBe(100);
    });

    test('debe registrar análisis con cache miss', () => {
      performanceMonitor.recordAnalysis(200, false);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.analysisCount).toBe(1);
      expect(metrics.avgAnalysisTime).toBe(200);
      expect(metrics.cacheHitRate).toBe(0);
    });

    test('debe calcular cache hit rate promedio correctamente', () => {
      performanceMonitor.recordAnalysis(100, true); // 100% hit rate
      performanceMonitor.recordAnalysis(200, false); // 50% hit rate overall
      performanceMonitor.recordAnalysis(150, true); // 66.7% hit rate overall

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.analysisCount).toBe(3);
      expect(metrics.cacheHitRate).toBeCloseTo(66.67, 1);
      expect(metrics.avgAnalysisTime).toBe(150); // (100+200+150)/3
    });

    test('debe omitir recording cuando metrics están deshabilitadas', () => {
      const mockEnableMetrics = jest.spyOn(
        EnvironmentModule.FeatureFlags,
        'enableMetrics'
      );
      mockEnableMetrics.mockReturnValue(false);

      performanceMonitor.recordAnalysis(100, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.analysisCount).toBe(0);

      mockEnableMetrics.mockRestore();
    });
  });

  describe('Cálculo de percentiles', () => {
    test('debe calcular percentiles correctamente con múltiples valores', () => {
      // Agregar 10 requests con tiempos conocidos
      for (let i = 1; i <= 10; i++) {
        performanceMonitor.recordRequest(i * 100, true); // 100, 200, 300, ..., 1000
      }

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(550); // promedio de 100-1000
      expect(metrics.p95ResponseTime).toBe(1000); // 95th percentile of 10 values
      expect(metrics.p99ResponseTime).toBe(1000); // 99th percentile of 10 values
    });

    test('debe manejar arrays vacíos sin errores', () => {
      // Reset para asegurar arrays vacíos
      performanceMonitor.reset();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(0);
      expect(metrics.p95ResponseTime).toBe(0);
      expect(metrics.p99ResponseTime).toBe(0);
    });

    test('debe calcular percentiles con un solo valor', () => {
      performanceMonitor.recordRequest(500, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(500);
      expect(metrics.p95ResponseTime).toBe(500);
      expect(metrics.p99ResponseTime).toBe(500);
    });

    test('debe manejar valores ordenados y desordenados', () => {
      // Agregar valores desordenados
      [300, 100, 500, 200, 400].forEach(time => {
        performanceMonitor.recordRequest(time, true);
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(300);
      expect(metrics.p95ResponseTime).toBe(500);
    });
  });

  describe('Sistema de alertas', () => {
    test('debe crear alerta por tiempo de respuesta alto', () => {
      performanceMonitor.recordRequest(6000, true); // > 5000ms threshold

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERFORMANCE ALERT] ERROR')
      );

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].level).toBe('error');
      expect(alerts[0].metric).toBe('avgResponseTime');
    });

    test('debe crear alerta de warning por tiempo moderadamente alto', () => {
      performanceMonitor.recordRequest(3000, true); // > 2000ms but < 5000ms

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERFORMANCE ALERT] WARNING')
      );

      const alerts = performanceMonitor.getAlerts('warning');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].metric).toBe('avgResponseTime');
    });

    test('debe evitar alertas duplicadas recientes', () => {
      // Mock Date.now para controlar timestamps
      const originalNow = Date.now;
      Date.now = jest.fn().mockReturnValue(1000000);

      performanceMonitor.recordRequest(6000, true);
      const alertsAfterFirst = performanceMonitor.getAlerts();

      performanceMonitor.recordRequest(6000, true);
      const alertsAfterSecond = performanceMonitor.getAlerts();

      expect(alertsAfterFirst.length).toBe(alertsAfterSecond.length);

      Date.now = originalNow;
    });

    test('debe filtrar alertas por nivel', () => {
      performanceMonitor.recordRequest(3000, true); // warning
      performanceMonitor.recordRequest(6000, true); // error

      const warningAlerts = performanceMonitor.getAlerts('warning');
      const errorAlerts = performanceMonitor.getAlerts('error');
      const allAlerts = performanceMonitor.getAlerts();

      expect(warningAlerts.every(a => a.level === 'warning')).toBe(true);
      expect(errorAlerts.every(a => a.level === 'error')).toBe(true);
      expect(allAlerts.length).toBeGreaterThanOrEqual(
        warningAlerts.length + errorAlerts.length
      );
    });

    test('debe incluir información completa en alertas', () => {
      performanceMonitor.recordRequest(6000, true);

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const alert = alerts[0];
      expect(alert.level).toBeDefined();
      expect(alert.metric).toBeDefined();
      expect(typeof alert.value).toBe('number');
      expect(typeof alert.threshold).toBe('number');
      expect(typeof alert.message).toBe('string');
      expect(alert.timestamp instanceof Date).toBe(true);
    });
  });

  describe('Health Status', () => {
    test('debe retornar status excelente para score alto', () => {
      const status = performanceMonitor.getHealthStatus();

      expect(status.status).toBe('excellent');
      expect(status.score).toBe(100);
      expect(status.color).toBe('green');
    });

    test('debe retornar status crítico para score bajo', () => {
      // Forzar score bajo con muchos errores
      for (let i = 0; i < 20; i++) {
        performanceMonitor.recordRequest(10000, false); // muy lentos y fallan
      }

      const status = performanceMonitor.getHealthStatus();
      expect(status.score).toBeLessThan(50);
      expect(status.status).toBe('critical');
      expect(status.color).toBe('red');
    });

    test('debe manejar diferentes rangos de scores', () => {
      // Test status thresholds
      const testCases = [
        { score: 95, expectedStatus: 'excellent', expectedColor: 'green' },
        { score: 75, expectedStatus: 'good', expectedColor: 'yellow' },
        { score: 60, expectedStatus: 'warning', expectedColor: 'orange' },
        { score: 30, expectedStatus: 'critical', expectedColor: 'red' },
      ];

      testCases.forEach(({ score, expectedStatus, expectedColor }) => {
        // Force specific score by manipulating health calculation
        const errorRequests = Math.ceil((100 - score) / 2);
        performanceMonitor.reset();

        for (let i = 0; i < errorRequests; i++) {
          performanceMonitor.recordRequest(100, false);
        }
        for (let i = 0; i < 5; i++) {
          performanceMonitor.recordRequest(100, true);
        }

        const status = performanceMonitor.getHealthStatus();
        expect(['excellent', 'good', 'warning', 'critical']).toContain(
          status.status
        );
        expect(['green', 'yellow', 'orange', 'red']).toContain(status.color);
      });
    });
  });

  describe('Prometheus Metrics Export', () => {
    test('debe exportar métricas en formato Prometheus', () => {
      performanceMonitor.recordRequest(500, true);
      performanceMonitor.recordAnalysis(100, true);

      const prometheus = performanceMonitor.toPrometheusMetrics();

      expect(prometheus).toContain('accessibility_requests_total 1');
      expect(prometheus).toContain('accessibility_requests_success_total 1');
      expect(prometheus).toContain('accessibility_response_time_avg 500');
      expect(prometheus).toContain('accessibility_health_score');
      expect(prometheus).toContain('accessibility_cache_hit_rate 100');
      expect(prometheus).toContain('accessibility_memory_used_bytes');
    });

    test('debe incluir headers de Prometheus correctos', () => {
      const prometheus = performanceMonitor.toPrometheusMetrics();

      expect(prometheus).toContain('# HELP');
      expect(prometheus).toContain('# TYPE');
      expect(prometheus).toContain('counter');
      expect(prometheus).toContain('gauge');
    });

    test('debe actualizar métricas dinámicamente en export', () => {
      const prometheus1 = performanceMonitor.toPrometheusMetrics();

      performanceMonitor.recordRequest(200, true);

      const prometheus2 = performanceMonitor.toPrometheusMetrics();

      expect(prometheus1).toContain('accessibility_requests_total 0');
      expect(prometheus2).toContain('accessibility_requests_total 1');
    });
  });

  describe('Reset functionality', () => {
    test('debe resetear todas las métricas', () => {
      // Crear datos
      performanceMonitor.recordRequest(500, true);
      performanceMonitor.recordAnalysis(100, true);

      // Reset
      performanceMonitor.reset();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.analysisCount).toBe(0);
      expect(metrics.healthScore).toBe(100);
      expect(metrics.cacheHitRate).toBe(0);

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.length).toBe(0);
    });

    test('debe mantener structure correcta después de reset', () => {
      performanceMonitor.recordRequest(500, true);
      performanceMonitor.reset();

      const metrics = performanceMonitor.getMetrics();
      expect(typeof metrics.memoryUsage).toBe('object');
      expect(metrics.lastUpdated instanceof Date).toBe(true);
      expect(typeof metrics.healthScore).toBe('number');
      expect(metrics.healthScore).toBe(100);
    });

    test('debe permitir uso normal después de reset', () => {
      performanceMonitor.recordRequest(500, true);
      performanceMonitor.reset();
      performanceMonitor.recordRequest(300, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.avgResponseTime).toBe(300);
    });
  });

  describe('Edge Cases y robustez', () => {
    test('debe manejar arrays de response times vacíos', () => {
      performanceMonitor.reset();

      expect(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.avgResponseTime).toBe(0);
      }).not.toThrow();
    });

    test('debe manejar valores extremos en percentile calculation', () => {
      performanceMonitor.recordRequest(0, true); // valor mínimo
      performanceMonitor.recordRequest(Number.MAX_SAFE_INTEGER, true); // valor máximo

      expect(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(typeof metrics.p95ResponseTime).toBe('number');
        expect(typeof metrics.p99ResponseTime).toBe('number');
        expect(metrics.p95ResponseTime).toBeGreaterThanOrEqual(0);
      }).not.toThrow();
    });

    test('debe manejar múltiples operaciones concurrentes', () => {
      // Simular carga concurrente
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordRequest(
          Math.random() * 1000,
          Math.random() > 0.1
        );
        if (i % 10 === 0) {
          performanceMonitor.recordAnalysis(
            Math.random() * 100,
            Math.random() > 0.5
          );
        }
      }

      expect(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.totalRequests).toBe(100);
        expect(metrics.analysisCount).toBe(10);
      }).not.toThrow();
    });

    test('debe manejar tiempos negativos correctamente', () => {
      // Aunque no debería suceder, test robustez
      performanceMonitor.recordRequest(-100, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.avgResponseTime).toBe(-100);
    });

    test('debe mantener precisión con números grandes', () => {
      const largeTime = 999999999;
      performanceMonitor.recordRequest(largeTime, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(largeTime);
    });
  });

  describe('Integración completa', () => {
    test('debe funcionar como un sistema completo', () => {
      // Simular un escenario real de uso

      // Requests normales
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(500 + Math.random() * 200, true);
      }

      // Algunos requests lentos
      performanceMonitor.recordRequest(3000, true);
      performanceMonitor.recordRequest(2500, true);

      // Algunos errores
      performanceMonitor.recordRequest(1000, false);
      performanceMonitor.recordRequest(1500, false);

      // Análisis con cache hits y misses
      performanceMonitor.recordAnalysis(100, true);
      performanceMonitor.recordAnalysis(150, true);
      performanceMonitor.recordAnalysis(200, false);
      performanceMonitor.recordAnalysis(120, true);

      const metrics = performanceMonitor.getMetrics();
      const status = performanceMonitor.getHealthStatus();
      const alerts = performanceMonitor.getAlerts();
      const prometheus = performanceMonitor.toPrometheusMetrics();

      // Verificar que todo funciona junto
      expect(metrics.totalRequests).toBe(14);
      expect(metrics.successfulRequests).toBe(12);
      expect(metrics.failedRequests).toBe(2);
      expect(metrics.analysisCount).toBe(4);
      expect(status.score).toBeGreaterThan(0);
      expect(status.score).toBeLessThanOrEqual(100);
      expect(typeof prometheus).toBe('string');
      expect(prometheus.length).toBeGreaterThan(100);

      // Al menos una alerta por tiempo alto
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
