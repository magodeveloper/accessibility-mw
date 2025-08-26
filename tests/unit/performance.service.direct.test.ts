/**
 * Performance Service Tests - Direct Testing Approach
 * Testing performance monitoring without feature flag dependencies
 */

describe('Performance Service - Direct Coverage', () => {
  let consoleSpy: jest.SpyInstance;
  let PerformanceMonitor: any;
  let monitor: any;

  beforeEach(() => {
    // Mock console.warn to capture alerts
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Import the class directly and create a new instance for testing
    // This bypasses the singleton and feature flags
    const performanceModule = require('../../src/services/performance.service');

    // Access the class constructor through reflection
    const moduleContent = performanceModule.constructor.toString();

    // For direct testing, we'll import and work with what's available
    PerformanceMonitor = performanceModule.performanceMonitor;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Basic Service Functionality', () => {
    test('debe tener instancia de performance monitor', () => {
      expect(PerformanceMonitor).toBeDefined();
      expect(typeof PerformanceMonitor.getMetrics).toBe('function');
      expect(typeof PerformanceMonitor.reset).toBe('function');
      expect(typeof PerformanceMonitor.getHealthStatus).toBe('function');
      expect(typeof PerformanceMonitor.toPrometheusMetrics).toBe('function');
    });

    test('debe tener métricas iniciales', () => {
      const metrics = PerformanceMonitor.getMetrics();

      expect(typeof metrics).toBe('object');
      expect(typeof metrics.totalRequests).toBe('number');
      expect(typeof metrics.successfulRequests).toBe('number');
      expect(typeof metrics.failedRequests).toBe('number');
      expect(typeof metrics.avgResponseTime).toBe('number');
      expect(typeof metrics.healthScore).toBe('number');
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);
    });

    test('debe resetear métricas correctamente', () => {
      const initialMetrics = PerformanceMonitor.getMetrics();

      // Reset
      PerformanceMonitor.reset();

      const resetMetrics = PerformanceMonitor.getMetrics();

      // Verify structure is maintained
      expect(typeof resetMetrics.totalRequests).toBe('number');
      expect(typeof resetMetrics.healthScore).toBe('number');
      expect(resetMetrics.healthScore).toBe(100); // Should be perfect after reset

      // Arrays should be cleared
      const alerts = PerformanceMonitor.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    test('debe obtener health status', () => {
      const status = PerformanceMonitor.getHealthStatus();

      expect(typeof status).toBe('object');
      expect(typeof status.status).toBe('string');
      expect(typeof status.score).toBe('number');
      expect(typeof status.color).toBe('string');

      // Should be one of the expected statuses
      expect(['excellent', 'good', 'warning', 'critical']).toContain(
        status.status
      );
      expect(['green', 'yellow', 'orange', 'red']).toContain(status.color);
    });

    test('debe obtener alertas', () => {
      const allAlerts = PerformanceMonitor.getAlerts();
      const warningAlerts = PerformanceMonitor.getAlerts('warning');
      const errorAlerts = PerformanceMonitor.getAlerts('error');

      expect(Array.isArray(allAlerts)).toBe(true);
      expect(Array.isArray(warningAlerts)).toBe(true);
      expect(Array.isArray(errorAlerts)).toBe(true);

      // Warning alerts should only contain warnings
      warningAlerts.forEach((alert: any) => {
        expect(alert.level).toBe('warning');
      });

      // Error alerts should only contain errors
      errorAlerts.forEach((alert: any) => {
        expect(alert.level).toBe('error');
      });
    });

    test('debe exportar métricas Prometheus', () => {
      const prometheus = PerformanceMonitor.toPrometheusMetrics();

      expect(typeof prometheus).toBe('string');
      expect(prometheus.length).toBeGreaterThan(0);

      // Should contain Prometheus format elements
      expect(prometheus).toContain('# HELP');
      expect(prometheus).toContain('# TYPE');
      expect(prometheus).toContain('accessibility_');

      // Should contain various metric types
      expect(prometheus).toMatch(/counter|gauge/);
    });
  });

  describe('Metric Structure Validation', () => {
    test('debe tener estructura de métricas completa', () => {
      const metrics = PerformanceMonitor.getMetrics();

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

      // Resource metrics
      expect(typeof metrics.memoryUsage).toBe('object');
      expect(typeof metrics.cpuUsage).toBe('number');
      expect(typeof metrics.activeConnections).toBe('number');

      // System health
      expect(typeof metrics.healthScore).toBe('number');
      expect(typeof metrics.uptime).toBe('number');
      expect(metrics.lastUpdated instanceof Date).toBe(true);
    });

    test('debe tener rangos válidos en métricas', () => {
      const metrics = PerformanceMonitor.getMetrics();

      // Counts should be non-negative
      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.successfulRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.failedRequests).toBeGreaterThanOrEqual(0);
      expect(metrics.analysisCount).toBeGreaterThanOrEqual(0);

      // Percentages should be 0-100
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(100);

      // Times should be non-negative
      expect(metrics.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.avgAnalysisTime).toBeGreaterThanOrEqual(0);
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Alert System Structure', () => {
    test('debe tener estructura de alerta correcta', () => {
      const alerts = PerformanceMonitor.getAlerts();

      alerts.forEach((alert: any) => {
        expect(typeof alert.level).toBe('string');
        expect(['info', 'warning', 'error', 'critical']).toContain(alert.level);
        expect(typeof alert.metric).toBe('string');
        expect(typeof alert.value).toBe('number');
        expect(typeof alert.threshold).toBe('number');
        expect(typeof alert.message).toBe('string');
        expect(alert.timestamp instanceof Date).toBe(true);
      });
    });

    test('debe filtrar alertas por nivel correctamente', () => {
      // Test each alert level filter
      const levels = ['info', 'warning', 'error', 'critical'];

      levels.forEach(level => {
        const filteredAlerts = PerformanceMonitor.getAlerts(level as any);
        expect(Array.isArray(filteredAlerts)).toBe(true);

        filteredAlerts.forEach((alert: any) => {
          expect(alert.level).toBe(level);
        });
      });
    });
  });

  describe('Prometheus Export Validation', () => {
    test('debe incluir todas las métricas esenciales en export', () => {
      const prometheus = PerformanceMonitor.toPrometheusMetrics();

      // Check for essential metrics
      expect(prometheus).toContain('accessibility_requests_total');
      expect(prometheus).toContain('accessibility_requests_success_total');
      expect(prometheus).toContain('accessibility_response_time_avg');
      expect(prometheus).toContain('accessibility_health_score');
      expect(prometheus).toContain('accessibility_cache_hit_rate');
      expect(prometheus).toContain('accessibility_memory_used_bytes');
    });

    test('debe tener formato Prometheus válido', () => {
      const prometheus = PerformanceMonitor.toPrometheusMetrics();

      // Should have HELP comments
      const helpLines = prometheus
        .split('\n')
        .filter((line: string) => line.startsWith('# HELP'));
      expect(helpLines.length).toBeGreaterThan(0);

      // Should have TYPE comments
      const typeLines = prometheus
        .split('\n')
        .filter((line: string) => line.startsWith('# TYPE'));
      expect(typeLines.length).toBeGreaterThan(0);

      // Should have actual metrics (lines with numbers)
      const metricLines = prometheus
        .split('\n')
        .filter((line: string) =>
          line.match(/^accessibility_.*\s+\d+(\.\d+)?$/)
        );
      expect(metricLines.length).toBeGreaterThan(0);
    });
  });

  describe('Service Integration', () => {
    test('debe mantener consistencia después de múltiples operaciones', () => {
      const initialMetrics = PerformanceMonitor.getMetrics();
      const initialAlerts = PerformanceMonitor.getAlerts();
      const initialStatus = PerformanceMonitor.getHealthStatus();
      const initialPrometheus = PerformanceMonitor.toPrometheusMetrics();

      // All operations should work without errors
      expect(typeof initialMetrics).toBe('object');
      expect(Array.isArray(initialAlerts)).toBe(true);
      expect(typeof initialStatus).toBe('object');
      expect(typeof initialPrometheus).toBe('string');

      // Reset should work
      PerformanceMonitor.reset();

      // Everything should still work after reset
      const resetMetrics = PerformanceMonitor.getMetrics();
      const resetAlerts = PerformanceMonitor.getAlerts();
      const resetStatus = PerformanceMonitor.getHealthStatus();
      const resetPrometheus = PerformanceMonitor.toPrometheusMetrics();

      expect(typeof resetMetrics).toBe('object');
      expect(Array.isArray(resetAlerts)).toBe(true);
      expect(typeof resetStatus).toBe('object');
      expect(typeof resetPrometheus).toBe('string');
    });

    test('debe manejar llamadas concurrentes sin errores', async () => {
      // Multiple concurrent calls to various methods
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve(PerformanceMonitor.getMetrics()));
        promises.push(Promise.resolve(PerformanceMonitor.getAlerts()));
        promises.push(Promise.resolve(PerformanceMonitor.getHealthStatus()));
        promises.push(
          Promise.resolve(PerformanceMonitor.toPrometheusMetrics())
        );
      }

      const results = await Promise.all(promises);

      // All calls should complete successfully
      expect(results.length).toBe(40);

      // Results should have expected types
      results.forEach((result, index) => {
        const operation = index % 4;
        if (operation === 0) {
          // getMetrics
          expect(typeof result).toBe('object');
        } else if (operation === 1) {
          // getAlerts
          expect(Array.isArray(result)).toBe(true);
        } else if (operation === 2) {
          // getHealthStatus
          expect(typeof result).toBe('object');
        } else {
          // toPrometheusMetrics
          expect(typeof result).toBe('string');
        }
      });
    });
  });

  describe('Edge Cases and Robustness', () => {
    test('debe manejar estados extremos sin crashear', () => {
      // Multiple resets
      for (let i = 0; i < 5; i++) {
        PerformanceMonitor.reset();
        const metrics = PerformanceMonitor.getMetrics();
        expect(metrics.healthScore).toBe(100);
      }
    });

    test('debe mantener tipos consistentes en todas las operaciones', () => {
      const operations = [
        () => PerformanceMonitor.getMetrics(),
        () => PerformanceMonitor.getAlerts(),
        () => PerformanceMonitor.getHealthStatus(),
        () => PerformanceMonitor.toPrometheusMetrics(),
        () => PerformanceMonitor.reset(),
      ];

      operations.forEach(operation => {
        expect(() => operation()).not.toThrow();
      });
    });

    test('debe manejar filtros de alertas con parámetros undefined', () => {
      expect(() => PerformanceMonitor.getAlerts(undefined)).not.toThrow();
      expect(() => PerformanceMonitor.getAlerts(null)).not.toThrow();
      expect(() => PerformanceMonitor.getAlerts('')).not.toThrow();
    });
  });

  describe('Module Export Structure', () => {
    test('debe exportar correctamente el singleton', () => {
      const performanceModule = require('../../src/services/performance.service');

      expect(performanceModule.performanceMonitor).toBeDefined();
      expect(typeof performanceModule.performanceMonitor.getMetrics).toBe(
        'function'
      );

      // Should be the same instance
      const instance1 = performanceModule.performanceMonitor;
      const instance2 = performanceModule.performanceMonitor;
      expect(instance1).toBe(instance2);
    });
  });
});
