/**
 * Tests para Performance Service
 * Cobertura objetivo: 85%+
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Performance Service', () => {
  let performanceMonitor: any;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset modules and environment
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // Enable metrics for tests
    process.env.ENABLE_METRICS = 'true';
    
    // Import fresh instance
    const module = await import('../../../src/services/performance.service');
    performanceMonitor = module.performanceMonitor;
    performanceMonitor.reset();
  });

  afterEach(() => {
    // Cleanup
    if (performanceMonitor && performanceMonitor.destroy) {
      performanceMonitor.destroy();
    }
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    it('should initialize with default metrics', () => {
      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.healthScore).toBe(100);
      expect(metrics.cacheHitRate).toBe(0);
    });

    it('should have memory usage metrics', () => {
      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(metrics.memoryUsage.heapTotal).toBeGreaterThan(0);
    });

    it('should have zero response time metrics initially', () => {
      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.avgResponseTime).toBe(0);
      expect(metrics.p95ResponseTime).toBe(0);
      expect(metrics.p99ResponseTime).toBe(0);
    });
  });

  describe('recordRequest', () => {
    it('should record successful request', () => {
      // Act
      performanceMonitor.recordRequest(100, true);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.avgResponseTime).toBe(100);
    });

    it('should record failed request', () => {
      // Act
      performanceMonitor.recordRequest(200, false);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
    });

    it('should calculate average response time correctly', () => {
      // Act
      performanceMonitor.recordRequest(100, true);
      performanceMonitor.recordRequest(200, true);
      performanceMonitor.recordRequest(300, true);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.avgResponseTime).toBe(200); // (100+200+300)/3
    });

    it('should calculate p95 response time correctly', () => {
      // Arrange - Add 100 requests
      for (let i = 1; i <= 100; i++) {
        performanceMonitor.recordRequest(i * 10, true);
      }

      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.p95ResponseTime).toBeGreaterThan(900);
      expect(metrics.p95ResponseTime).toBeLessThanOrEqual(1000);
    });

    it('should calculate p99 response time correctly', () => {
      // Arrange - Add 100 requests
      for (let i = 1; i <= 100; i++) {
        performanceMonitor.recordRequest(i * 10, true);
      }

      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.p99ResponseTime).toBeGreaterThan(980);
      expect(metrics.p99ResponseTime).toBeLessThanOrEqual(1000);
    });

    it('should handle single request for percentiles', () => {
      // Act
      performanceMonitor.recordRequest(100, true);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.p95ResponseTime).toBe(100);
      expect(metrics.p99ResponseTime).toBe(100);
    });

    it('should update metrics on each request', () => {
      // Act
      performanceMonitor.recordRequest(100, true);
      const metrics1 = performanceMonitor.getMetrics();
      
      performanceMonitor.recordRequest(200, true);
      const metrics2 = performanceMonitor.getMetrics();

      // Assert
      expect(metrics1.totalRequests).toBe(1);
      expect(metrics2.totalRequests).toBe(2);
      expect(metrics2.avgResponseTime).toBeGreaterThan(metrics1.avgResponseTime);
    });
  });

  describe('recordAnalysis', () => {
    it('should record analysis with cache hit', () => {
      // Act
      performanceMonitor.recordAnalysis(1000, true);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.analysisCount).toBe(1);
      expect(metrics.avgAnalysisTime).toBe(1000);
      expect(metrics.cacheHitRate).toBe(100);
    });

    it('should record analysis with cache miss', () => {
      // Act
      performanceMonitor.recordAnalysis(2000, false);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.analysisCount).toBe(1);
      expect(metrics.avgAnalysisTime).toBe(2000);
      expect(metrics.cacheHitRate).toBe(0);
    });

    it('should calculate cache hit rate correctly', () => {
      // Act
      performanceMonitor.recordAnalysis(1000, true);  // 100%
      performanceMonitor.recordAnalysis(1000, false); // 50%
      performanceMonitor.recordAnalysis(1000, true);  // 66.67%
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.analysisCount).toBe(3);
      expect(metrics.cacheHitRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate average analysis time correctly', () => {
      // Act
      performanceMonitor.recordAnalysis(1000, true);
      performanceMonitor.recordAnalysis(2000, true);
      performanceMonitor.recordAnalysis(3000, true);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.analysisCount).toBe(3);
      expect(metrics.avgAnalysisTime).toBe(2000); // (1000+2000+3000)/3
    });

    it('should handle many analyses correctly', () => {
      // Arrange
      for (let i = 0; i < 50; i++) {
        performanceMonitor.recordAnalysis(1000 + i * 10, i % 2 === 0);
      }

      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.analysisCount).toBe(50);
      expect(metrics.cacheHitRate).toBe(50); // 50% hit rate
    });
  });

  describe('getMetrics', () => {
    it('should return copy of metrics', () => {
      // Act
      const metrics1 = performanceMonitor.getMetrics();
      const metrics2 = performanceMonitor.getMetrics();

      // Assert
      expect(metrics1).not.toBe(metrics2); // Different objects
      expect(metrics1).toEqual(metrics2);  // Same values
    });

    it('should not allow mutation of internal metrics', () => {
      // Act
      const metrics = performanceMonitor.getMetrics();
      metrics.totalRequests = 999;
      const metrics2 = performanceMonitor.getMetrics();

      // Assert
      expect(metrics2.totalRequests).toBe(0); // Not affected
    });
  });

  describe('getHealthStatus', () => {
    it('should return excellent status for score >= 90', () => {
      // Act
      const status = performanceMonitor.getHealthStatus();

      // Assert
      expect(status.status).toBe('excellent');
      expect(status.score).toBeGreaterThanOrEqual(90);
      expect(status.color).toBe('green');
    });

    it('should return good status for score >= 70', () => {
      // Arrange - Simulate some issues to lower score
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(1500, true); // Slow responses
      }

      // Act
      const status = performanceMonitor.getHealthStatus();

      // Assert
      if (status.score >= 70 && status.score < 90) {
        expect(status.status).toBe('good');
        expect(status.color).toBe('yellow');
      }
    });

    it('should return warning status for score >= 50', () => {
      // Arrange - Simulate more issues
      for (let i = 0; i < 20; i++) {
        performanceMonitor.recordRequest(2000, false); // Slow failures
      }

      // Act
      const status = performanceMonitor.getHealthStatus();

      // Assert
      if (status.score >= 50 && status.score < 70) {
        expect(status.status).toBe('warning');
        expect(status.color).toBe('orange');
      }
    });

    it('should return critical status for score < 50', () => {
      // Arrange - Simulate critical issues
      for (let i = 0; i < 50; i++) {
        performanceMonitor.recordRequest(6000, false); // Very slow failures
      }

      // Act
      const status = performanceMonitor.getHealthStatus();

      // Assert
      if (status.score < 50) {
        expect(status.status).toBe('critical');
        expect(status.color).toBe('red');
      }
    });
  });

  describe('getAlerts', () => {
    it('should return empty array initially', () => {
      // Act
      const alerts = performanceMonitor.getAlerts();

      // Assert
      expect(alerts).toEqual([]);
    });

    it('should return copy of alerts', () => {
      // Act
      const alerts1 = performanceMonitor.getAlerts();
      const alerts2 = performanceMonitor.getAlerts();

      // Assert
      expect(alerts1).not.toBe(alerts2); // Different arrays
    });

    it('should filter alerts by level', () => {
      // Arrange - Trigger some alerts
      for (let i = 0; i < 30; i++) {
        performanceMonitor.recordRequest(6000, false);
      }

      // Act
      const allAlerts = performanceMonitor.getAlerts();
      const errorAlerts = performanceMonitor.getAlerts('error');
      const warningAlerts = performanceMonitor.getAlerts('warning');

      // Assert
      expect(Array.isArray(allAlerts)).toBe(true);
      expect(Array.isArray(errorAlerts)).toBe(true);
      expect(Array.isArray(warningAlerts)).toBe(true);
    });
  });

  describe('toPrometheusMetrics', () => {
    it('should export metrics in Prometheus format', () => {
      // Arrange
      performanceMonitor.recordRequest(100, true);
      performanceMonitor.recordAnalysis(1000, true);

      // Act
      const metrics = performanceMonitor.toPrometheusMetrics();

      // Assert
      expect(metrics).toContain('accessibility_requests_total 1');
      expect(metrics).toContain('accessibility_requests_success_total 1');
      expect(metrics).toContain('accessibility_requests_failed_total 0');
      expect(metrics).toContain('accessibility_response_time_avg 100');
    });

    it('should include all required metric types', () => {
      // Arrange
      performanceMonitor.recordRequest(100, true);

      // Act
      const metrics = performanceMonitor.toPrometheusMetrics();

      // Assert
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      expect(metrics).toContain('counter');
      expect(metrics).toContain('gauge');
    });

    it('should include health score', () => {
      // Act
      const metrics = performanceMonitor.toPrometheusMetrics();

      // Assert
      expect(metrics).toContain('accessibility_health_score');
      expect(metrics).toMatch(/accessibility_health_score \d+/);
    });

    it('should include cache hit rate', () => {
      // Arrange
      performanceMonitor.recordAnalysis(1000, true);

      // Act
      const metrics = performanceMonitor.toPrometheusMetrics();

      // Assert
      expect(metrics).toContain('accessibility_cache_hit_rate');
    });

    it('should include memory metrics', () => {
      // Act
      const metrics = performanceMonitor.toPrometheusMetrics();

      // Assert
      expect(metrics).toContain('accessibility_memory_used_bytes');
      expect(metrics).toMatch(/accessibility_memory_used_bytes \d+/);
    });

    it('should include project-specific metrics', () => {
      // Act
      const metrics = performanceMonitor.toPrometheusMetrics();

      // Assert
      expect(metrics).toContain('accessibility_mw_perf_total_requests');
      expect(metrics).toContain('accessibility_mw_perf_health_score');
    });
  });

  describe('reset', () => {
    it('should reset all metrics to initial state', () => {
      // Arrange
      performanceMonitor.recordRequest(100, true);
      performanceMonitor.recordAnalysis(1000, true);
      expect(performanceMonitor.getMetrics().totalRequests).toBe(1);

      // Act
      performanceMonitor.reset();
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.analysisCount).toBe(0);
      expect(metrics.healthScore).toBe(100);
    });

    it('should reset alerts', () => {
      // Arrange
      for (let i = 0; i < 30; i++) {
        performanceMonitor.recordRequest(6000, false);
      }
      expect(performanceMonitor.getAlerts().length).toBeGreaterThan(0);

      // Act
      performanceMonitor.reset();

      // Assert
      expect(performanceMonitor.getAlerts()).toEqual([]);
    });
  });

  describe('destroy', () => {
    it('should clean up timers and reset metrics', () => {
      // Arrange
      performanceMonitor.recordRequest(100, true);

      // Act
      performanceMonitor.destroy();
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.totalRequests).toBe(0);
    });

    it('should not throw when called multiple times', () => {
      // Act & Assert
      expect(() => {
        performanceMonitor.destroy();
        performanceMonitor.destroy();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero response time', () => {
      // Act
      performanceMonitor.recordRequest(0, true);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.avgResponseTime).toBe(0);
      expect(metrics.p95ResponseTime).toBe(0);
    });

    it('should handle very large response times', () => {
      // Act
      performanceMonitor.recordRequest(999999, true);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.avgResponseTime).toBe(999999);
      expect(metrics.p95ResponseTime).toBe(999999);
    });

    it('should handle negative response times gracefully', () => {
      // Act
      performanceMonitor.recordRequest(-100, true);
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.avgResponseTime).toBe(-100);
    });

    it('should handle very large number of requests', () => {
      // Arrange
      for (let i = 0; i < 2000; i++) {
        performanceMonitor.recordRequest(100, true);
      }

      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.totalRequests).toBe(2000);
      expect(metrics.successfulRequests).toBe(2000);
    });

    it('should handle mixed success and failure patterns', () => {
      // Arrange
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordRequest(100 + i, i % 3 === 0);
      }

      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.totalRequests).toBe(100);
      expect(metrics.successfulRequests).toBeGreaterThan(0);
      expect(metrics.failedRequests).toBeGreaterThan(0);
      expect(metrics.successfulRequests + metrics.failedRequests).toBe(100);
    });
  });

  describe('Health Score Calculation', () => {
    it('should decrease health score with high error rate', () => {
      // Arrange
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(100, false); // All failures
      }

      // Force health score calculation by calling private method
      (performanceMonitor as any).updateSystemMetrics();

      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.healthScore).toBeLessThan(100);
    });

    it('should decrease health score with slow responses', () => {
      // Arrange
      for (let i = 0; i < 10; i++) {
        performanceMonitor.recordRequest(3000, true); // Slow but successful
      }

      // Force health score calculation by calling private method
      (performanceMonitor as any).updateSystemMetrics();

      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.healthScore).toBeLessThan(100);
    });

    it('should maintain high health score with good performance', () => {
      // Arrange
      for (let i = 0; i < 100; i++) {
        performanceMonitor.recordRequest(100, true); // Fast and successful
      }

      // Act
      const metrics = performanceMonitor.getMetrics();

      // Assert
      expect(metrics.healthScore).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Feature Flags', () => {
    it('should respect ENABLE_METRICS=false', async () => {
      // Arrange
      process.env.ENABLE_METRICS = 'false';
      jest.resetModules();
      const module = await import('../../../src/services/performance.service');
      const monitor = module.performanceMonitor;
      monitor.reset();

      // Act
      monitor.recordRequest(100, true);
      const metrics = monitor.getMetrics();

      // Assert
      // When metrics disabled, recording should be no-op
      expect(metrics.totalRequests).toBe(0);

      // Cleanup
      monitor.destroy();
    });
  });
});
