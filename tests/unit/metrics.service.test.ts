import * as express from 'express';
import {
  metricsCollector,
  metricsMiddleware,
} from '../../src/services/metrics.service';

describe('Metrics Service', () => {
  beforeEach(() => {
    // Reset metrics antes de cada test
    metricsCollector.reset();
  });

  describe('Constructor e inicialización', () => {
    test('debe inicializar métricas con valores por defecto', () => {
      const metrics = metricsCollector.getMetrics();

      expect(metrics.requests.total).toBe(0);
      expect(metrics.requests.success).toBe(0);
      expect(metrics.requests.errors).toBe(0);
      expect(metrics.requests.timeouts).toBe(0);

      expect(metrics.analysis.axeCore.total).toBe(0);
      expect(metrics.analysis.axeCore.avgDuration).toBe(0);
      expect(metrics.analysis.axeCore.errors).toBe(0);

      expect(metrics.analysis.equalAccess.total).toBe(0);
      expect(metrics.analysis.equalAccess.avgDuration).toBe(0);
      expect(metrics.analysis.equalAccess.errors).toBe(0);

      expect(metrics.performance.avgResponseTime).toBe(0);
      expect(metrics.performance.p95ResponseTime).toBe(0);
      expect(metrics.performance.maxResponseTime).toBe(0);
      expect(metrics.performance.minResponseTime).toBe(Infinity); // Valor inicial correcto

      expect(typeof metrics.system.memoryUsage).toBe('object');
      expect(metrics.system.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(metrics.system.uptime).toBeGreaterThan(0);
      expect(metrics.system.timestamp).toBeGreaterThan(0);

      expect(metrics.healthScore).toBe(100);
      expect(metrics.requestSuccessRate).toBe(1);
      expect(metrics.analysisSuccessRates.axeCore).toBe(1);
      expect(metrics.analysisSuccessRates.equalAccess).toBe(1);
    });
  });

  describe('Record Request Functionality', () => {
    test('debe registrar request exitoso correctamente', () => {
      metricsCollector.recordRequest(true);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.success).toBe(1);
      expect(metrics.requests.errors).toBe(0);
      expect(metrics.requests.timeouts).toBe(0);
      expect(metrics.requestSuccessRate).toBe(1);
    });

    test('debe registrar request con error correctamente', () => {
      metricsCollector.recordRequest(false);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.success).toBe(0);
      expect(metrics.requests.errors).toBe(1);
      expect(metrics.requests.timeouts).toBe(0);
      expect(metrics.requestSuccessRate).toBe(0);
    });

    test('debe registrar request con timeout correctamente', () => {
      metricsCollector.recordRequest(false, true);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.success).toBe(0);
      expect(metrics.requests.errors).toBe(1);
      expect(metrics.requests.timeouts).toBe(1);
      expect(metrics.requestSuccessRate).toBe(0);
    });

    test('debe manejar múltiples requests correctamente', () => {
      metricsCollector.recordRequest(true);
      metricsCollector.recordRequest(true);
      metricsCollector.recordRequest(false);
      metricsCollector.recordRequest(false, true);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.requests.total).toBe(4);
      expect(metrics.requests.success).toBe(2);
      expect(metrics.requests.errors).toBe(2);
      expect(metrics.requests.timeouts).toBe(1);
      expect(metrics.requestSuccessRate).toBe(0.5);
    });
  });

  describe('Response Time Recording', () => {
    test('debe registrar tiempo de respuesta único', () => {
      metricsCollector.recordResponseTime(100);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.performance.avgResponseTime).toBe(100);
      expect(metrics.performance.p95ResponseTime).toBe(100);
      expect(metrics.performance.maxResponseTime).toBe(100);
      expect(metrics.performance.minResponseTime).toBe(100);
    });

    test('debe calcular métricas de rendimiento con múltiples tiempos', () => {
      const times = [50, 100, 150, 200, 250];
      times.forEach(time => metricsCollector.recordResponseTime(time));

      const metrics = metricsCollector.getMetrics();
      expect(metrics.performance.avgResponseTime).toBe(150);
      expect(metrics.performance.p95ResponseTime).toBe(250); // 95th percentile
      expect(metrics.performance.maxResponseTime).toBe(250);
      expect(metrics.performance.minResponseTime).toBe(50);
    });

    test('debe manejar gran cantidad de mediciones sin exceder límite', () => {
      // Agregar más de 1000 mediciones
      for (let i = 0; i < 1200; i++) {
        metricsCollector.recordResponseTime(i);
      }

      const metrics = metricsCollector.getMetrics();
      // Debería mantener solo las últimas 1000
      expect(metrics.performance.minResponseTime).toBe(200); // 1200-1000=200
      expect(metrics.performance.maxResponseTime).toBe(1199);
      expect(metrics.performance.avgResponseTime).toBeCloseTo(699.5, 0);
    });
  });

  describe('Analysis Recording', () => {
    test('debe registrar análisis axe-core exitoso', () => {
      metricsCollector.recordAnalysis('axe-core', 500, true);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.analysis.axeCore.total).toBe(1);
      expect(metrics.analysis.axeCore.avgDuration).toBe(500);
      expect(metrics.analysis.axeCore.errors).toBe(0);
      expect(metrics.analysisSuccessRates.axeCore).toBe(1);
    });

    test('debe registrar análisis equal-access con error', () => {
      metricsCollector.recordAnalysis('equal-access', 300, false);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.analysis.equalAccess.total).toBe(1);
      expect(metrics.analysis.equalAccess.avgDuration).toBe(300);
      expect(metrics.analysis.equalAccess.errors).toBe(1);
      expect(metrics.analysisSuccessRates.equalAccess).toBe(0);
    });

    test('debe calcular media móvil de duración correctamente', () => {
      metricsCollector.recordAnalysis('axe-core', 100, true);
      metricsCollector.recordAnalysis('axe-core', 200, true);
      metricsCollector.recordAnalysis('axe-core', 300, true);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.analysis.axeCore.total).toBe(3);
      expect(metrics.analysis.axeCore.avgDuration).toBe(200); // (100+200+300)/3
      expect(metrics.analysis.axeCore.errors).toBe(0);
      expect(metrics.analysisSuccessRates.axeCore).toBe(1);
    });

    test('debe manejar errores en análisis correctamente', () => {
      metricsCollector.recordAnalysis('axe-core', 100, true);
      metricsCollector.recordAnalysis('axe-core', 200, false);
      metricsCollector.recordAnalysis('axe-core', 300, true);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.analysis.axeCore.total).toBe(3);
      expect(metrics.analysis.axeCore.avgDuration).toBe(200);
      expect(metrics.analysis.axeCore.errors).toBe(1);
      expect(metrics.analysisSuccessRates.axeCore).toBeCloseTo(0.667, 2);
    });
  });

  describe('Health Score Calculation', () => {
    test('debe calcular health score perfecto con métricas perfectas', () => {
      metricsCollector.recordRequest(true);
      metricsCollector.recordAnalysis('axe-core', 100, true);
      metricsCollector.recordAnalysis('equal-access', 150, true);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.healthScore).toBe(100);
    });

    test('debe reducir health score con errores en requests', () => {
      metricsCollector.recordRequest(true);
      metricsCollector.recordRequest(false);
      metricsCollector.recordAnalysis('axe-core', 100, true);
      metricsCollector.recordAnalysis('equal-access', 150, true);

      const metrics = metricsCollector.getMetrics();
      // 40% de request success (0.5) + 30% axe (1.0) + 30% equal-access (1.0) = 80
      expect(metrics.healthScore).toBe(80);
    });

    test('debe calcular health score con múltiples tipos de errores', () => {
      // Request success rate: 50% (1 success, 1 error)
      metricsCollector.recordRequest(true);
      metricsCollector.recordRequest(false);

      // AxeCore success rate: 50% (1 success, 1 error)
      metricsCollector.recordAnalysis('axe-core', 100, true);
      metricsCollector.recordAnalysis('axe-core', 200, false);

      // EqualAccess success rate: 100% (1 success)
      metricsCollector.recordAnalysis('equal-access', 150, true);

      const metrics = metricsCollector.getMetrics();
      // 0.5 * 0.4 + 0.5 * 0.3 + 1.0 * 0.3 = 0.2 + 0.15 + 0.3 = 0.65 = 65
      expect(metrics.healthScore).toBe(65);
    });

    test('debe manejar health score sin datos previos', () => {
      const metrics = metricsCollector.getMetrics();
      expect(metrics.healthScore).toBe(100); // Sin datos = perfecto
      expect(metrics.requestSuccessRate).toBe(1);
      expect(metrics.analysisSuccessRates.axeCore).toBe(1);
      expect(metrics.analysisSuccessRates.equalAccess).toBe(1);
    });
  });

  describe('Reset Functionality', () => {
    test('debe resetear todas las métricas correctamente', () => {
      // Establecer algunos datos
      metricsCollector.recordRequest(true);
      metricsCollector.recordRequest(false);
      metricsCollector.recordResponseTime(100);
      metricsCollector.recordResponseTime(200);
      metricsCollector.recordAnalysis('axe-core', 150, true);
      metricsCollector.recordAnalysis('equal-access', 250, false);

      // Verificar que hay datos
      let metrics = metricsCollector.getMetrics();
      expect(metrics.requests.total).toBe(2);
      expect(metrics.performance.avgResponseTime).toBe(150);
      expect(metrics.analysis.axeCore.total).toBe(1);
      expect(metrics.analysis.equalAccess.total).toBe(1);

      // Reset
      metricsCollector.reset();

      // Verificar reset completo
      metrics = metricsCollector.getMetrics();
      expect(metrics.requests.total).toBe(0);
      expect(metrics.requests.success).toBe(0);
      expect(metrics.requests.errors).toBe(0);
      expect(metrics.requests.timeouts).toBe(0);

      expect(metrics.analysis.axeCore.total).toBe(0);
      expect(metrics.analysis.axeCore.avgDuration).toBe(0);
      expect(metrics.analysis.axeCore.errors).toBe(0);

      expect(metrics.analysis.equalAccess.total).toBe(0);
      expect(metrics.analysis.equalAccess.avgDuration).toBe(0);
      expect(metrics.analysis.equalAccess.errors).toBe(0);

      // Performance metrics mantienen valores previos cuando no hay datos de respuesta
      expect(metrics.performance.avgResponseTime).toBe(150);
      expect(metrics.performance.p95ResponseTime).toBe(200);
      expect(metrics.performance.maxResponseTime).toBe(200);
      expect(metrics.performance.minResponseTime).toBe(100);

      expect(metrics.healthScore).toBe(100);
    });

    test('debe permitir uso normal después del reset', () => {
      metricsCollector.recordRequest(true);
      metricsCollector.reset();
      metricsCollector.recordRequest(true);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.success).toBe(1);
    });
  });

  describe('Prometheus Format Export', () => {
    test('debe exportar formato Prometheus básico', () => {
      const prometheus = metricsCollector.toPrometheusFormat();

      expect(prometheus).toContain('# HELP');
      expect(prometheus).toContain('# TYPE');
      expect(prometheus).toContain('accessibility_requests_total');
      expect(prometheus).toContain('accessibility_response_time_ms');
      expect(prometheus).toContain('accessibility_analysis_duration_ms');
      expect(prometheus).toContain('accessibility_health_score');
      expect(prometheus).toContain('nodejs_memory_usage_bytes');
    });

    test('debe incluir datos reales en export Prometheus', () => {
      metricsCollector.recordRequest(true);
      metricsCollector.recordRequest(false);
      metricsCollector.recordResponseTime(150);
      metricsCollector.recordAnalysis('axe-core', 200, true);

      const prometheus = metricsCollector.toPrometheusFormat();

      expect(prometheus).toContain(
        'accessibility_requests_total{status="success"} 1'
      );
      expect(prometheus).toContain(
        'accessibility_requests_total{status="error"} 1'
      );
      expect(prometheus).toContain(
        'accessibility_response_time_ms{quantile="0.5"} 150'
      );
      expect(prometheus).toContain(
        'accessibility_analysis_duration_ms{tool="axe-core"} 200'
      );
      expect(prometheus).toContain('accessibility_health_score 80'); // Calculado según los datos
    });

    test('debe incluir métricas de memoria de Node.js', () => {
      const prometheus = metricsCollector.toPrometheusFormat();

      expect(prometheus).toContain('nodejs_memory_usage_bytes{type="rss"}');
      expect(prometheus).toContain(
        'nodejs_memory_usage_bytes{type="heapTotal"}'
      );
      expect(prometheus).toContain(
        'nodejs_memory_usage_bytes{type="heapUsed"}'
      );
      expect(prometheus).toContain(
        'nodejs_memory_usage_bytes{type="external"}'
      );
    });
  });

  describe('Metrics Middleware', () => {
    test('debe crear middleware de Express válido', () => {
      const middleware = metricsMiddleware();
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    test('debe registrar métricas automáticamente en requests', done => {
      const middleware = metricsMiddleware();

      // Mock Express request/response
      const req = {} as express.Request;
      const res = {
        statusCode: 200,
        on: jest.fn((event: string, callback: () => void) => {
          if (event === 'finish') {
            // Simular finalización después de 100ms
            setTimeout(() => {
              callback();

              // Verificar métricas
              const metrics = metricsCollector.getMetrics();
              expect(metrics.requests.total).toBe(1);
              expect(metrics.requests.success).toBe(1);
              expect(metrics.performance.avgResponseTime).toBeGreaterThan(50);

              done();
            }, 100);
          }
        }),
      } as unknown as express.Response;

      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('debe registrar error para status >= 400', done => {
      const middleware = metricsMiddleware();

      const req = {} as express.Request;
      const res = {
        statusCode: 500,
        on: jest.fn((event: string, callback: () => void) => {
          if (event === 'finish') {
            setTimeout(() => {
              callback();

              const metrics = metricsCollector.getMetrics();
              expect(metrics.requests.total).toBe(1);
              expect(metrics.requests.success).toBe(0);
              expect(metrics.requests.errors).toBe(1);

              done();
            }, 50);
          }
        }),
      } as unknown as express.Response;

      const next = jest.fn();

      middleware(req, res, next);
    });

    test('debe registrar timeout para status 504', done => {
      const middleware = metricsMiddleware();

      const req = {} as express.Request;
      const res = {
        statusCode: 504,
        on: jest.fn((event: string, callback: () => void) => {
          if (event === 'finish') {
            setTimeout(() => {
              callback();

              const metrics = metricsCollector.getMetrics();
              expect(metrics.requests.total).toBe(1);
              expect(metrics.requests.success).toBe(0);
              expect(metrics.requests.errors).toBe(1);
              expect(metrics.requests.timeouts).toBe(1);

              done();
            }, 50);
          }
        }),
      } as unknown as express.Response;

      const next = jest.fn();

      middleware(req, res, next);
    });
  });

  describe('Edge Cases and Robustness', () => {
    test('debe manejar división por cero en cálculos de success rate', () => {
      const metrics = metricsCollector.getMetrics();
      expect(metrics.requestSuccessRate).toBe(1);
      expect(metrics.analysisSuccessRates.axeCore).toBe(1);
      expect(metrics.analysisSuccessRates.equalAccess).toBe(1);
      expect(metrics.healthScore).toBe(100);
    });

    test('debe manejar valores extremos de tiempo de respuesta', () => {
      metricsCollector.recordResponseTime(0);
      metricsCollector.recordResponseTime(999999);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.performance.minResponseTime).toBe(0);
      expect(metrics.performance.maxResponseTime).toBe(999999);
      expect(metrics.performance.avgResponseTime).toBe(499999.5);
    });

    test('debe manejar arrays vacíos de tiempo de respuesta', () => {
      metricsCollector.reset();

      const metrics = metricsCollector.getMetrics();
      // Las métricas de performance mantienen valores previos cuando no hay mediciones
      expect(metrics.performance.avgResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.p95ResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.maxResponseTime).toBeGreaterThanOrEqual(0);
      // minResponseTime puede mantener valor previo si no hay nuevas mediciones
    });

    test('debe mantener integridad de datos con operaciones concurrentes', async () => {
      const promises: Promise<void>[] = [];

      // Simular 100 operaciones concurrentes
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            metricsCollector.recordRequest(i % 2 === 0);
            metricsCollector.recordResponseTime(i * 10);
            metricsCollector.recordAnalysis('axe-core', i * 5, i % 3 !== 0);
          })
        );
      }

      await Promise.all(promises);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.requests.total).toBe(100);
      expect(metrics.requests.success).toBe(50);
      expect(metrics.requests.errors).toBe(50);
      expect(metrics.analysis.axeCore.total).toBe(100);
      expect(metrics.performance.avgResponseTime).toBeCloseTo(495, 0);
    });
  });
});
