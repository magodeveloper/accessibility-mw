/**
 * Performance Service Tests
 * Tests para el servicio de monitoreo de performance
 */

// Mock del módulo environment ANTES de importar el service
jest.mock('../../src/utils/environment', () => ({
  FeatureFlags: {
    enableMetrics: jest.fn(() => true), // Por defecto habilitado
    enableLogging: jest.fn(() => true),
    enableDebug: jest.fn(() => false),
  },
}));

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { performanceMonitor } from '../../src/services/performance.service';
import * as EnvironmentModule from '../../src/utils/environment';

describe('Performance Service', () => {
  let consoleSpy: any;

  beforeEach(() => {
    // Reset todos los mocks
    jest.clearAllMocks();

    // Configurar FeatureFlags para permitir métricas por defecto
    (EnvironmentModule.FeatureFlags.enableMetrics as jest.Mock).mockReturnValue(
      true
    );

    // Reset la instancia singleton para cada test
    performanceMonitor.reset();

    // Spy en console.warn (no console.log) para verificar alertas
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    performanceMonitor.reset();
  });

  describe('Configuración básica', () => {
    test('debe inicializar con valores por defecto', () => {
      const metrics = performanceMonitor.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.avgResponseTime).toBe(0);
      expect(metrics.analysisCount).toBe(0);
      expect(metrics.healthScore).toBe(100);
      expect(metrics.cacheHitRate).toBe(0);
      expect(typeof metrics.memoryUsage).toBe('object');
      expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
    });
  });

  describe('Recording de requests', () => {
    test('debe registrar request exitoso correctamente', () => {
      performanceMonitor.recordRequest(500, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.avgResponseTime).toBe(500);
    });

    test('debe registrar request fallido correctamente', () => {
      performanceMonitor.recordRequest(800, false);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.avgResponseTime).toBe(800);
    });

    test('debe calcular promedios correctamente con múltiples requests', () => {
      performanceMonitor.recordRequest(100, true);
      performanceMonitor.recordRequest(200, true);
      performanceMonitor.recordRequest(300, false);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.avgResponseTime).toBe(200); // (100+200+300)/3
    });

    test('debe omitir recording cuando metrics están deshabilitadas', () => {
      // Deshabilitar métricas solo para este test
      (
        EnvironmentModule.FeatureFlags.enableMetrics as jest.Mock
      ).mockReturnValue(false);

      performanceMonitor.recordRequest(500, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
    });
  });

  describe('Recording de análisis', () => {
    test('debe registrar análisis con cache hit', () => {
      performanceMonitor.recordAnalysis(100, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.analysisCount).toBe(1);
      expect(metrics.avgAnalysisTime).toBe(100);
      expect(metrics.cacheHitRate).toBe(100); // 100% hit rate
    });

    test('debe registrar análisis con cache miss', () => {
      performanceMonitor.recordAnalysis(200, false);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.analysisCount).toBe(1);
      expect(metrics.avgAnalysisTime).toBe(200);
      expect(metrics.cacheHitRate).toBe(0); // 0% hit rate
    });

    test('debe calcular cache hit rate promedio correctamente', () => {
      performanceMonitor.recordAnalysis(100, true); // 100% hit rate
      performanceMonitor.recordAnalysis(200, false); // 50% hit rate overall
      performanceMonitor.recordAnalysis(150, true); // 66.67% hit rate overall

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.analysisCount).toBe(3);
      expect(metrics.avgAnalysisTime).toBe(150); // (100+200+150)/3
      expect(Math.round(metrics.cacheHitRate)).toBe(67); // ~66.67%
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

    test('debe calcular percentiles con un solo valor', () => {
      performanceMonitor.recordRequest(500, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(500);
      expect(metrics.p95ResponseTime).toBe(500);
      expect(metrics.p99ResponseTime).toBe(500);
    });

    test('debe manejar valores ordenados y desordenados', () => {
      const times = [300, 100, 500, 200, 400];
      times.forEach(time => {
        performanceMonitor.recordRequest(time, true);
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(300);
      expect(metrics.p95ResponseTime).toBe(500);
      expect(metrics.p99ResponseTime).toBe(500);
    });
  });

  describe('Sistema de alertas', () => {
    test('debe crear alerta por tiempo de respuesta alto', () => {
      performanceMonitor.recordRequest(6000, true); // > 5000ms

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERFORMANCE ALERT] ERROR')
      );
    });

    test('debe crear alerta de warning por tiempo moderadamente alto', () => {
      performanceMonitor.recordRequest(3000, true); // > 2000ms but < 5000ms

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PERFORMANCE ALERT] WARNING')
      );
    });

    test('debe incluir información completa en alertas', () => {
      performanceMonitor.recordRequest(6000, true);

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const alert = alerts[0];
      expect(typeof alert.level).toBe('string');
      expect(typeof alert.metric).toBe('string');
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
      // Crear condiciones para score bajo - más requests fallidos
      for (let i = 0; i < 60; i++) {
        performanceMonitor.recordRequest(5000, false); // 60 errores con tiempo alto
      }
      performanceMonitor.recordRequest(100, true); // 1 éxito

      // Forzar actualización del health score
      (performanceMonitor as any).updateSystemMetrics();

      const status = performanceMonitor.getHealthStatus();
      expect(status.score).toBeLessThanOrEqual(50);
      expect(['warning', 'critical']).toContain(status.status);
      expect(['yellow', 'orange', 'red']).toContain(status.color);
    });
  });

  describe('Prometheus Metrics Export', () => {
    test('debe exportar métricas en formato Prometheus', () => {
      performanceMonitor.recordRequest(500, true);

      const prometheus = performanceMonitor.toPrometheusMetrics();

      expect(prometheus).toContain('accessibility_requests_total 1');
      expect(prometheus).toContain('accessibility_requests_success_total 1');
      expect(prometheus).toContain('accessibility_response_time_avg 500');
      expect(prometheus).toContain('accessibility_health_score 100');
      expect(prometheus).toContain('accessibility_cache_hit_rate 0');
      expect(prometheus).toContain('accessibility_memory_used_bytes');
    });

    test('debe incluir headers de Prometheus correctos', () => {
      const prometheus = performanceMonitor.toPrometheusMetrics();

      expect(prometheus).toContain('# HELP');
      expect(prometheus).toContain('# TYPE');
      expect(prometheus).toContain('counter');
      expect(prometheus).toContain('gauge');
    });
  });

  describe('Reset functionality', () => {
    test('debe permitir uso normal después de reset', () => {
      // Agregar algunos datos
      performanceMonitor.recordRequest(500, true);
      performanceMonitor.recordAnalysis(200, true);

      // Reset
      performanceMonitor.reset();

      // Verificar estado limpio
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.analysisCount).toBe(0);
      expect(metrics.healthScore).toBe(100);
      expect(metrics.cacheHitRate).toBe(0);

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.length).toBe(0);

      // Verificar que funciona después del reset
      performanceMonitor.recordRequest(300, true);
      const metricsAfterReset = performanceMonitor.getMetrics();
      expect(metricsAfterReset.totalRequests).toBe(1);
    });
  });

  describe('Edge Cases y robustez', () => {
    const createOperation = (i: number) => () =>
      performanceMonitor.recordRequest(
        Math.random() * 1000,
        Math.random() > 0.5
      );

    const executeOperations = (operations: (() => void)[]) => {
      operations.forEach(op => op());
    };

    test('debe manejar múltiples operaciones concurrentes', () => {
      // Simular operaciones concurrentes
      const operations: (() => void)[] = [];
      for (let i = 0; i < 100; i++) {
        operations.push(createOperation(i));
      }

      expect(() => {
        executeOperations(operations);
      }).not.toThrow();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(100);
    });

    test('debe manejar tiempos negativos correctamente', () => {
      performanceMonitor.recordRequest(-100, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.avgResponseTime).toBe(-100);
    });

    test('debe mantener precisión con números grandes', () => {
      performanceMonitor.recordRequest(999999999, true);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(999999999);
    });
  });

  describe('Integración completa', () => {
    test('debe funcionar como un sistema completo', () => {
      // Simular carga de trabajo real
      performanceMonitor.recordRequest(100, true);
      performanceMonitor.recordRequest(200, true);
      performanceMonitor.recordRequest(1500, false);

      performanceMonitor.recordAnalysis(50, true);
      performanceMonitor.recordAnalysis(75, false);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.analysisCount).toBe(2);

      const status = performanceMonitor.getHealthStatus();
      expect(status.score).toBeGreaterThan(0);
      expect(status.score).toBeLessThanOrEqual(100);

      const prometheus = performanceMonitor.toPrometheusMetrics();
      expect(prometheus).toContain('accessibility_requests_total');
      expect(prometheus).toContain('accessibility_health_score');
    });
  });
});
