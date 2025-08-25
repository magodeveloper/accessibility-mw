import * as express from 'express';

interface Metrics {
  requests: {
    total: number;
    success: number;
    errors: number;
    timeouts: number;
  };
  analysis: {
    axeCore: {
      total: number;
      avgDuration: number;
      errors: number;
    };
    equalAccess: {
      total: number;
      avgDuration: number;
      errors: number;
    };
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  };
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
    timestamp: number;
  };
}

class MetricsCollector {
  private metrics: Metrics;
  private responseTimes: number[] = [];
  private maxResponseTimeEntries = 1000; // Mantener últimas 1000 mediciones

  constructor() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0, timeouts: 0 },
      analysis: {
        axeCore: { total: 0, avgDuration: 0, errors: 0 },
        equalAccess: { total: 0, avgDuration: 0, errors: 0 },
      },
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
      },
      system: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: Date.now(),
      },
    };

    // Actualizar métricas del sistema cada minuto
    setInterval(() => {
      this.updateSystemMetrics();
    }, 60000);
  }

  recordRequest(success: boolean, isTimeout = false): void {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
      if (isTimeout) {
        this.metrics.requests.timeouts++;
      }
    }
  }

  recordResponseTime(timeMs: number): void {
    this.responseTimes.push(timeMs);

    // Mantener solo las últimas mediciones
    if (this.responseTimes.length > this.maxResponseTimeEntries) {
      this.responseTimes = this.responseTimes.slice(
        -this.maxResponseTimeEntries
      );
    }

    // Actualizar métricas de rendimiento
    this.updatePerformanceMetrics();
  }

  recordAnalysis(
    tool: 'axe-core' | 'equal-access',
    durationMs: number,
    success: boolean
  ): void {
    const toolMetrics =
      this.metrics.analysis[tool === 'axe-core' ? 'axeCore' : 'equalAccess'];

    toolMetrics.total++;
    if (!success) {
      toolMetrics.errors++;
    }

    // Calcular nueva media móvil
    if (toolMetrics.total === 1) {
      toolMetrics.avgDuration = durationMs;
    } else {
      toolMetrics.avgDuration =
        (toolMetrics.avgDuration * (toolMetrics.total - 1) + durationMs) /
        toolMetrics.total;
    }
  }

  private updatePerformanceMetrics(): void {
    if (this.responseTimes.length === 0) return;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);

    this.metrics.performance.avgResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) /
      this.responseTimes.length;

    this.metrics.performance.p95ResponseTime =
      sorted[Math.floor(sorted.length * 0.95)] || 0;

    this.metrics.performance.maxResponseTime = sorted[sorted.length - 1] || 0;
    this.metrics.performance.minResponseTime = sorted[0] || 0;
  }

  private updateSystemMetrics(): void {
    this.metrics.system.memoryUsage = process.memoryUsage();
    this.metrics.system.uptime = process.uptime();
    this.metrics.system.timestamp = Date.now();
  }

  getMetrics(): Metrics & {
    healthScore: number;
    requestSuccessRate: number;
    analysisSuccessRates: {
      axeCore: number;
      equalAccess: number;
    };
  } {
    const requestSuccessRate =
      this.metrics.requests.total > 0
        ? this.metrics.requests.success / this.metrics.requests.total
        : 1;

    const axeCoreSuccessRate =
      this.metrics.analysis.axeCore.total > 0
        ? (this.metrics.analysis.axeCore.total -
            this.metrics.analysis.axeCore.errors) /
          this.metrics.analysis.axeCore.total
        : 1;

    const equalAccessSuccessRate =
      this.metrics.analysis.equalAccess.total > 0
        ? (this.metrics.analysis.equalAccess.total -
            this.metrics.analysis.equalAccess.errors) /
          this.metrics.analysis.equalAccess.total
        : 1;

    // Calcular score de salud (0-100)
    const healthScore = Math.round(
      (requestSuccessRate * 0.4 +
        axeCoreSuccessRate * 0.3 +
        equalAccessSuccessRate * 0.3) *
        100
    );

    return {
      ...this.metrics,
      healthScore,
      requestSuccessRate,
      analysisSuccessRates: {
        axeCore: axeCoreSuccessRate,
        equalAccess: equalAccessSuccessRate,
      },
    };
  }

  reset(): void {
    this.metrics.requests = { total: 0, success: 0, errors: 0, timeouts: 0 };
    this.metrics.analysis = {
      axeCore: { total: 0, avgDuration: 0, errors: 0 },
      equalAccess: { total: 0, avgDuration: 0, errors: 0 },
    };
    this.responseTimes = [];
    this.updatePerformanceMetrics();
  }

  // Métricas en formato Prometheus (opcional)
  toPrometheusFormat(): string {
    const m = this.getMetrics();
    return `
# HELP accessibility_requests_total Total number of requests
# TYPE accessibility_requests_total counter
accessibility_requests_total{status="success"} ${m.requests.success}
accessibility_requests_total{status="error"} ${m.requests.errors}
accessibility_requests_total{status="timeout"} ${m.requests.timeouts}

# HELP accessibility_response_time_ms Response time in milliseconds
# TYPE accessibility_response_time_ms summary
accessibility_response_time_ms{quantile="0.5"} ${m.performance.avgResponseTime}
accessibility_response_time_ms{quantile="0.95"} ${m.performance.p95ResponseTime}
accessibility_response_time_ms_max ${m.performance.maxResponseTime}
accessibility_response_time_ms_min ${m.performance.minResponseTime}

# HELP accessibility_analysis_duration_ms Analysis duration in milliseconds
# TYPE accessibility_analysis_duration_ms gauge
accessibility_analysis_duration_ms{tool="axe-core"} ${m.analysis.axeCore.avgDuration}
accessibility_analysis_duration_ms{tool="equal-access"} ${m.analysis.equalAccess.avgDuration}

# HELP accessibility_health_score Health score (0-100)
# TYPE accessibility_health_score gauge
accessibility_health_score ${m.healthScore}

# HELP nodejs_memory_usage_bytes Node.js memory usage
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${m.system.memoryUsage.rss}
nodejs_memory_usage_bytes{type="heapTotal"} ${m.system.memoryUsage.heapTotal}
nodejs_memory_usage_bytes{type="heapUsed"} ${m.system.memoryUsage.heapUsed}
nodejs_memory_usage_bytes{type="external"} ${m.system.memoryUsage.external}
`.trim();
  }
}

export const metricsCollector = new MetricsCollector();

// Middleware para recopilar métricas automáticamente
export function metricsMiddleware() {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode < 400;
      const isTimeout = res.statusCode === 504;

      metricsCollector.recordRequest(success, isTimeout);
      metricsCollector.recordResponseTime(responseTime);
    });

    next();
  };
}
