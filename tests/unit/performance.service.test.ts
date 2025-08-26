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
  let originalSetInterval: typeof setInterval;
  let intervalCallbacks: (() => void)[] = [];

  beforeEach(() => {
    // Mock console.warn para capturar alertas
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock setInterval para controlar updates periódicos
    originalSetInterval = global.setInterval;
    global.setInterval = jest.fn((callback: any) => {
      intervalCallbacks.push(callback as () => void);
      return 123 as any; // Mock timer ID
    }) as any;

    // Reset monitor state
    performanceMonitor.reset();
    intervalCallbacks = [];
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    global.setInterval = originalSetInterval;
    intervalCallbacks = [];
  });

  describe('Constructor y inicialización', () => {
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

    test('debe configurar intervalos de actualización', () => {
      // Constructor should have set up 2 intervals
      expect(setInterval).toHaveBeenCalledTimes(2);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 300000);
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
      expect(metrics.cacheHitRate).toBe(0);
    });

    test('debe calcular cache hit rate promedio correctamente', () => {
      performanceMonitor.recordAnalysis(100, true); // 100% hit rate
      performanceMonitor.recordAnalysis(200, false); // 50% hit rate overall
      performanceMonitor.recordAnalysis(150, true); // 66.7% hit rate overall

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.analysisCount).toBe(3);
      expect(metrics.cacheHitRate).toBeCloseTo(66.67, 1);
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
  });

  describe('Health Score Calculation', () => {
    test('debe empezar con health score perfecto', () => {
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.healthScore).toBe(100);
    });

    test('debe reducir score por alta tasa de errores', () => {
      // Crear alta tasa de errores
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(500, false); // 10 errores
      }
      performanceMonitor.recordRequest(500, true); // 1 éxito

      // Trigger health score calculation
      intervalCallbacks[0](); // systemMetrics update

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.healthScore).toBeLessThan(100);
    });

    test('debe reducir score por tiempo de respuesta alto', () => {
      // Request con tiempo muy alto
      performanceMonitor.recordRequest(3000, true);

      // Trigger health score calculation
      intervalCallbacks[0](); // systemMetrics update

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.healthScore).toBeLessThan(100);
    });

    test('debe reducir score por baja cache hit rate', () => {
      // Crear muchos análisis con baja cache hit rate
      for (let i = 0; i < 15; i++) {
        performanceMonitor.recordAnalysis(100, false); // cache miss
      }

      // Trigger health score calculation
      intervalCallbacks[0](); // systemMetrics update

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.healthScore).toBeLessThan(100);
    });

    test('debe mantener score mínimo de 0', () => {
      // Crear condiciones extremas para forzar score muy bajo
      for (let i = 0; i < 20; i++) {
        performanceMonitor.recordRequest(10000, false); // Muy lentos y fallan
      }

      // Trigger health score calculation
      intervalCallbacks[0](); // systemMetrics update

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
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
    });

    test('debe evitar alertas duplicadas recientes', () => {
      // Dos requests con tiempo alto seguidos
      performanceMonitor.recordRequest(6000, true);
      performanceMonitor.recordRequest(6000, true);

      // Solo debe haberse creado una alerta
      const alerts = performanceMonitor.getAlerts();
      const responseTimeAlerts = alerts.filter(
        a => a.metric === 'avgResponseTime'
      );
      expect(responseTimeAlerts.length).toBe(1);
    });

    test('debe crear alerta por health score crítico', () => {
      // Crear condiciones para health score bajo
      for (let i = 0; i < 20; i++) {
        performanceMonitor.recordRequest(100, false); // muchos errores
      }

      // Trigger health score calculation and alerts
      intervalCallbacks[0](); // systemMetrics update

      const alerts = performanceMonitor.getAlerts('critical');
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.metric === 'healthScore')).toBe(true);
    });

    test('debe filtrar alertas por nivel', () => {
      performanceMonitor.recordRequest(3000, true); // warning
      performanceMonitor.recordRequest(6000, true); // error

      const warningAlerts = performanceMonitor.getAlerts('warning');
      const errorAlerts = performanceMonitor.getAlerts('error');

      expect(warningAlerts.every(a => a.level === 'warning')).toBe(true);
      expect(errorAlerts.every(a => a.level === 'error')).toBe(true);
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
      // Forzar score bajo
      for (let i = 0; i < 15; i++) {
        performanceMonitor.recordRequest(100, false);
      }

      // Trigger calculation
      intervalCallbacks[0]();

      const status = performanceMonitor.getHealthStatus();
      expect(status.status).toBe('critical');
      expect(status.color).toBe('red');
      expect(status.score).toBeLessThan(50);
    });

    test('debe retornar status de warning para score medio', () => {
      // Crear condiciones para score intermedio (usar menos errores)
      performanceMonitor.recordRequest(2500, false); // tiempo medio-alto + error
      performanceMonitor.recordRequest(500, true);
      performanceMonitor.recordRequest(500, true);

      // Trigger calculation
      intervalCallbacks[0]();

      const status = performanceMonitor.getHealthStatus();
      expect(['good', 'warning'].includes(status.status)).toBe(true);
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
      expect(prometheus).toContain('accessibility_health_score 100');
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
  });

  describe('Data Management', () => {
    test('debe podar datos antiguos automáticamente', () => {
      // Simular muchos data points
      for (let i = 0; i < 1500; i++) {
        performanceMonitor.recordRequest(100, true);
        performanceMonitor.recordAnalysis(50, i % 2 === 0);
      }

      // Trigger pruning
      intervalCallbacks[1](); // pruning interval

      // Verificar que los datos se mantuvieron dentro de límites
      // (esto se verifica indirectamente por el hecho de que no crashea)
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1500);
    });

    test('debe limitar número de alertas almacenadas', () => {
      // Crear más de 50 alertas
      for (let i = 0; i < 60; i++) {
        performanceMonitor.recordRequest(6000, true); // Cada una genera alerta
      }

      // Trigger pruning
      intervalCallbacks[1](); // pruning interval

      const allAlerts = performanceMonitor.getAlerts();
      expect(allAlerts.length).toBeLessThanOrEqual(50);
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

      const alerts = performanceMonitor.getAlerts();
      expect(alerts.length).toBe(0);
    });

    test('debe mantener structure correcta después de reset', () => {
      performanceMonitor.reset();

      const metrics = performanceMonitor.getMetrics();
      expect(typeof metrics.memoryUsage).toBe('object');
      expect(metrics.lastUpdated instanceof Date).toBe(true);
      expect(typeof metrics.healthScore).toBe('number');
    });
  });

  describe('System Metrics Updates', () => {
    test('debe actualizar métricas de sistema periódicamente', () => {
      const initialMetrics = performanceMonitor.getMetrics();

      // Simular passage de tiempo y trigger update
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60000);
      intervalCallbacks[0](); // systemMetrics update

      const updatedMetrics = performanceMonitor.getMetrics();
      expect(updatedMetrics.uptime).toBeGreaterThan(initialMetrics.uptime);
      expect(updatedMetrics.lastUpdated.getTime()).toBeGreaterThan(
        initialMetrics.lastUpdated.getTime()
      );
    });
  });

  describe('Edge Cases', () => {
    test('debe manejar arrays de response times vacíos', () => {
      performanceMonitor.reset();

      expect(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(metrics.avgResponseTime).toBe(0);
      }).not.toThrow();
    });

    test('debe manejar division por cero en error rate', () => {
      performanceMonitor.reset();

      // Trigger health calculation sin requests
      intervalCallbacks[0](); // systemMetrics update

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.healthScore).toBe(100); // Debe mantener score perfecto
    });

    test('debe manejar valores extremos en percentile calculation', () => {
      performanceMonitor.recordRequest(0, true); // valor mínimo
      performanceMonitor.recordRequest(Number.MAX_SAFE_INTEGER, true); // valor máximo

      expect(() => {
        const metrics = performanceMonitor.getMetrics();
        expect(typeof metrics.p95ResponseTime).toBe('number');
        expect(typeof metrics.p99ResponseTime).toBe('number');
      }).not.toThrow();
    });
  });
});
