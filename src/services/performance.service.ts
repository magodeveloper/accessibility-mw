/**
 * Advanced Performance Monitoring Service
 * Provides real-time performance insights and alerting
 */

import { FeatureFlags } from '../utils/environment';

interface PerformanceMetrics {
  // Request metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Analysis metrics
  analysisCount: number;
  avgAnalysisTime: number;
  cacheHitRate: number;

  // Resource metrics
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;

  // System health
  healthScore: number;
  uptime: number;
  lastUpdated: Date;
}

interface PerformanceAlert {
  level: 'info' | 'warning' | 'error' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private responseTimes: number[] = [];
  private analysisTimes: number[] = [];
  private alerts: PerformanceAlert[] = [];
  private startTime: Date;
  private readonly systemMetricsTimer?: NodeJS.Timeout;
  private readonly pruneDataTimer?: NodeJS.Timeout;

  // Thresholds for alerting
  private readonly thresholds = {
    responseTime: { warning: 2000, error: 5000 }, // ms
    memoryUsage: { warning: 80, error: 90 }, // percentage
    healthScore: { warning: 70, error: 50 }, // 0-100
    cacheHitRate: { warning: 60, error: 40 }, // percentage
    errorRate: { warning: 5, error: 10 }, // percentage
  };

  constructor() {
    this.startTime = new Date();
    this.metrics = this.initializeMetrics();

    // Update metrics periodically
    this.systemMetricsTimer = setInterval(
      () => this.updateSystemMetrics(),
      30000
    ); // Every 30 seconds
    this.pruneDataTimer = setInterval(() => this.pruneOldData(), 300000); // Every 5 minutes

    // Use unref() para que no mantenga el proceso activo
    this.systemMetricsTimer.unref();
    this.pruneDataTimer.unref();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      analysisCount: 0,
      avgAnalysisTime: 0,
      cacheHitRate: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: 0,
      activeConnections: 0,
      healthScore: 100,
      uptime: 0,
      lastUpdated: new Date(),
    };
  }

  // Record a request completion
  recordRequest(responseTime: number, success: boolean): void {
    if (!FeatureFlags.enableMetrics()) return;

    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    this.responseTimes.push(responseTime);
    this.updateResponseTimeMetrics();
    this.checkAlerts();
  }

  // Record an analysis completion
  recordAnalysis(duration: number, cacheHit: boolean): void {
    if (!FeatureFlags.enableMetrics()) return;

    this.metrics.analysisCount++;
    this.analysisTimes.push(duration);

    // Update cache hit rate
    const totalAnalyses = this.metrics.analysisCount;
    const currentHitRate = this.metrics.cacheHitRate;
    this.metrics.cacheHitRate =
      (currentHitRate * (totalAnalyses - 1) + (cacheHit ? 100 : 0)) /
      totalAnalyses;

    this.updateAnalysisMetrics();
  }

  private updateResponseTimeMetrics(): void {
    if (this.responseTimes.length === 0) return;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const total = sorted.reduce((sum, time) => sum + time, 0);

    this.metrics.avgResponseTime = total / sorted.length;
    this.metrics.p95ResponseTime = this.getPercentile(sorted, 0.95);
    this.metrics.p99ResponseTime = this.getPercentile(sorted, 0.99);
  }

  private updateAnalysisMetrics(): void {
    if (this.analysisTimes.length === 0) return;

    const total = this.analysisTimes.reduce((sum, time) => sum + time, 0);
    this.metrics.avgAnalysisTime = total / this.analysisTimes.length;
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }

  private updateSystemMetrics(): void {
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.uptime = Date.now() - this.startTime.getTime();
    this.metrics.lastUpdated = new Date();

    // Calculate health score
    this.calculateHealthScore();
  }

  private calculateHealthScore(): void {
    let score = 100;

    // Error rate impact
    const errorRate =
      (this.metrics.failedRequests / Math.max(1, this.metrics.totalRequests)) *
      100;
    if (errorRate > 1) score -= Math.min(30, errorRate * 3);

    // Response time impact
    if (this.metrics.avgResponseTime > 1000)
      score -= Math.min(20, (this.metrics.avgResponseTime - 1000) / 100);

    // Memory usage impact
    const memoryUsagePercent =
      (this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal) *
      100;
    if (memoryUsagePercent > 70)
      score -= Math.min(25, (memoryUsagePercent - 70) * 2);

    // Cache efficiency impact
    if (this.metrics.cacheHitRate < 80 && this.metrics.analysisCount > 10) {
      score -= Math.min(15, (80 - this.metrics.cacheHitRate) / 2);
    }

    this.metrics.healthScore = Math.max(0, Math.round(score));
  }

  private checkAlerts(): void {
    // Response time alerts
    if (this.metrics.avgResponseTime > this.thresholds.responseTime.error) {
      this.addAlert(
        'error',
        'avgResponseTime',
        this.metrics.avgResponseTime,
        this.thresholds.responseTime.error,
        'Average response time is critically high'
      );
    } else if (
      this.metrics.avgResponseTime > this.thresholds.responseTime.warning
    ) {
      this.addAlert(
        'warning',
        'avgResponseTime',
        this.metrics.avgResponseTime,
        this.thresholds.responseTime.warning,
        'Average response time is elevated'
      );
    }

    // Memory alerts
    const memoryPercent =
      (this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal) *
      100;
    if (memoryPercent > this.thresholds.memoryUsage.error) {
      this.addAlert(
        'error',
        'memoryUsage',
        memoryPercent,
        this.thresholds.memoryUsage.error,
        'Memory usage is critically high'
      );
    } else if (memoryPercent > this.thresholds.memoryUsage.warning) {
      this.addAlert(
        'warning',
        'memoryUsage',
        memoryPercent,
        this.thresholds.memoryUsage.warning,
        'Memory usage is elevated'
      );
    }

    // Health score alerts
    if (this.metrics.healthScore < this.thresholds.healthScore.error) {
      this.addAlert(
        'critical',
        'healthScore',
        this.metrics.healthScore,
        this.thresholds.healthScore.error,
        'System health score is critical'
      );
    } else if (this.metrics.healthScore < this.thresholds.healthScore.warning) {
      this.addAlert(
        'warning',
        'healthScore',
        this.metrics.healthScore,
        this.thresholds.healthScore.warning,
        'System health score is low'
      );
    }
  }

  private addAlert(
    level: PerformanceAlert['level'],
    metric: string,
    value: number,
    threshold: number,
    message: string
  ): void {
    const alert: PerformanceAlert = {
      level,
      metric,
      value,
      threshold,
      message,
      timestamp: new Date(),
    };

    // Avoid duplicate alerts within 5 minutes
    const recentAlert = this.alerts.find(
      a =>
        a.metric === metric &&
        a.level === level &&
        Date.now() - a.timestamp.getTime() < 300000
    );

    if (!recentAlert) {
      this.alerts.unshift(alert);

      // Log alert
      console.warn(
        `[PERFORMANCE ALERT] ${level.toUpperCase()}: ${message} (${value.toFixed(
          2
        )} > ${threshold})`
      );
    }
  }

  private pruneOldData(): void {
    const maxDataPoints = 1000;

    // Keep only recent data points to prevent memory leaks
    if (this.responseTimes.length > maxDataPoints) {
      this.responseTimes = this.responseTimes.slice(-maxDataPoints);
    }

    if (this.analysisTimes.length > maxDataPoints) {
      this.analysisTimes = this.analysisTimes.slice(-maxDataPoints);
    }

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(0, 50);
    }
  }

  // Public getters
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getAlerts(level?: PerformanceAlert['level']): PerformanceAlert[] {
    if (level) {
      return this.alerts.filter(alert => alert.level === level);
    }
    return [...this.alerts];
  }

  getHealthStatus(): { status: string; score: number; color: string } {
    const score = this.metrics.healthScore;

    if (score >= 90) return { status: 'excellent', score, color: 'green' };
    if (score >= 70) return { status: 'good', score, color: 'yellow' };
    if (score >= 50) return { status: 'warning', score, color: 'orange' };
    return { status: 'critical', score, color: 'red' };
  }

  // Export metrics in Prometheus format
  toPrometheusMetrics(): string {
    const m = this.metrics;
    return `
# HELP accessibility_requests_total Total number of requests
# TYPE accessibility_requests_total counter
accessibility_requests_total ${m.totalRequests}

# HELP accessibility_requests_success_total Total number of successful requests
# TYPE accessibility_requests_success_total counter
accessibility_requests_success_total ${m.successfulRequests}

# HELP accessibility_response_time_avg Average response time in milliseconds
# TYPE accessibility_response_time_avg gauge
accessibility_response_time_avg ${m.avgResponseTime}

# HELP accessibility_response_time_p95 95th percentile response time in milliseconds
# TYPE accessibility_response_time_p95 gauge
accessibility_response_time_p95 ${m.p95ResponseTime}

# HELP accessibility_health_score System health score (0-100)
# TYPE accessibility_health_score gauge
accessibility_health_score ${m.healthScore}

# HELP accessibility_cache_hit_rate Cache hit rate percentage
# TYPE accessibility_cache_hit_rate gauge
accessibility_cache_hit_rate ${m.cacheHitRate}

# HELP accessibility_memory_used_bytes Memory usage in bytes
# TYPE accessibility_memory_used_bytes gauge
accessibility_memory_used_bytes ${m.memoryUsage.heapUsed}
    `.trim();
  }

  /**
   * Destruye el monitor y limpia los timers
   */
  destroy(): void {
    if (this.systemMetricsTimer) {
      clearInterval(this.systemMetricsTimer);
    }
    if (this.pruneDataTimer) {
      clearInterval(this.pruneDataTimer);
    }
    this.reset();
  }

  // Reset all metrics (useful for testing)
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.responseTimes = [];
    this.analysisTimes = [];
    this.alerts = [];
    this.startTime = new Date();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
