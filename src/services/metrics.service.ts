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
  private readonly metrics: Metrics;
  private responseTimes: number[] = [];
  private readonly maxResponseTimeEntries = 1000; // Mantener últimas 1000 mediciones
  private readonly systemMetricsTimer?: NodeJS.Timeout;

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
    this.systemMetricsTimer = setInterval(() => {
      this.updateSystemMetrics();
    }, 60000);
    this.systemMetricsTimer.unref();
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
    // Existing project-specific metrics (kept for backward compatibility)
    const projectSpecific = `
# HELP accessibility_mw_requests_total Total number of requests processed by the middleware
# TYPE accessibility_mw_requests_total counter
accessibility_mw_requests_total ${m.requests.total}

# HELP accessibility_mw_requests_success Total number of successful requests
# TYPE accessibility_mw_requests_success counter
accessibility_mw_requests_success ${m.requests.success}

# HELP accessibility_mw_requests_errors Total number of failed requests
# TYPE accessibility_mw_requests_errors counter
accessibility_mw_requests_errors ${m.requests.errors}

# HELP accessibility_mw_requests_timeouts Total number of timeout requests
# TYPE accessibility_mw_requests_timeouts counter
accessibility_mw_requests_timeouts ${m.requests.timeouts}

# HELP accessibility_mw_response_time_avg Average response time in milliseconds
# TYPE accessibility_mw_response_time_avg gauge
accessibility_mw_response_time_avg ${m.performance.avgResponseTime}

# HELP accessibility_mw_response_time_p95 P95 response time in milliseconds
# TYPE accessibility_mw_response_time_p95 gauge
accessibility_mw_response_time_p95 ${m.performance.p95ResponseTime}

# HELP accessibility_mw_response_time_max Maximum response time in milliseconds
# TYPE accessibility_mw_response_time_max gauge
accessibility_mw_response_time_max ${m.performance.maxResponseTime}

# HELP accessibility_mw_response_time_min Minimum response time in milliseconds
# TYPE accessibility_mw_response_time_min gauge
accessibility_mw_response_time_min ${m.performance.minResponseTime}

# HELP accessibility_mw_analysis_axecore_total Total number of Axe-Core analyses
# TYPE accessibility_mw_analysis_axecore_total counter
accessibility_mw_analysis_axecore_total ${m.analysis.axeCore.total}

# HELP accessibility_mw_analysis_axecore_avg_duration Average duration of Axe-Core analysis in milliseconds
# TYPE accessibility_mw_analysis_axecore_avg_duration gauge
accessibility_mw_analysis_axecore_avg_duration ${m.analysis.axeCore.avgDuration}

# HELP accessibility_mw_analysis_axecore_errors Total number of Axe-Core analysis errors
# TYPE accessibility_mw_analysis_axecore_errors counter
accessibility_mw_analysis_axecore_errors ${m.analysis.axeCore.errors}

# HELP accessibility_mw_analysis_equalaccess_total Total number of Equal-Access analyses
# TYPE accessibility_mw_analysis_equalaccess_total counter
accessibility_mw_analysis_equalaccess_total ${m.analysis.equalAccess.total}

# HELP accessibility_mw_analysis_equalaccess_avg_duration Average duration of Equal-Access analysis in milliseconds
# TYPE accessibility_mw_analysis_equalaccess_avg_duration gauge
accessibility_mw_analysis_equalaccess_avg_duration ${m.analysis.equalAccess.avgDuration}

# HELP accessibility_mw_analysis_equalaccess_errors Total number of Equal-Access analysis errors
# TYPE accessibility_mw_analysis_equalaccess_errors counter
accessibility_mw_analysis_equalaccess_errors ${m.analysis.equalAccess.errors}

# HELP accessibility_mw_health_score Overall health score (0-100)
# TYPE accessibility_mw_health_score gauge
accessibility_mw_health_score ${m.healthScore}

# HELP accessibility_mw_memory_rss Resident set size memory in bytes
# TYPE accessibility_mw_memory_rss gauge
accessibility_mw_memory_rss ${m.system.memoryUsage.rss}

# HELP accessibility_mw_memory_heap_total Total heap memory in bytes
# TYPE accessibility_mw_memory_heap_total gauge
accessibility_mw_memory_heap_total ${m.system.memoryUsage.heapTotal}

# HELP accessibility_mw_memory_heap_used Used heap memory in bytes
# TYPE accessibility_mw_memory_heap_used gauge
accessibility_mw_memory_heap_used ${m.system.memoryUsage.heapUsed}

# HELP accessibility_mw_memory_external External memory in bytes
# TYPE accessibility_mw_memory_external gauge
accessibility_mw_memory_external ${m.system.memoryUsage.external}

# HELP accessibility_mw_uptime Process uptime in seconds
# TYPE accessibility_mw_uptime counter
accessibility_mw_uptime ${m.system.uptime}
`.trim();

    // Generic metrics expected by some tests/consumers
    const generic = `
# HELP accessibility_requests_total Total number of requests processed
# TYPE accessibility_requests_total counter
accessibility_requests_total{status="success"} ${m.requests.success}
accessibility_requests_total{status="error"} ${m.requests.errors}
accessibility_requests_total{status="timeout"} ${m.requests.timeouts}

# HELP accessibility_response_time_ms Response time summary in milliseconds
# TYPE accessibility_response_time_ms summary
accessibility_response_time_ms{quantile="0.5"} ${m.performance.avgResponseTime}
accessibility_response_time_ms{quantile="0.95"} ${m.performance.p95ResponseTime}
accessibility_response_time_ms_sum ${
      m.performance.avgResponseTime * Math.max(1, this.responseTimes.length)
    }
accessibility_response_time_ms_count ${this.responseTimes.length}

# HELP accessibility_analysis_duration_ms Analysis duration by tool in milliseconds
# TYPE accessibility_analysis_duration_ms gauge
accessibility_analysis_duration_ms{tool="axe-core"} ${
      m.analysis.axeCore.avgDuration
    }
accessibility_analysis_duration_ms{tool="equal-access"} ${
      m.analysis.equalAccess.avgDuration
    }

# HELP accessibility_health_score Overall health score (0-100)
# TYPE accessibility_health_score gauge
accessibility_health_score ${m.healthScore}

# HELP nodejs_memory_usage_bytes Node.js process memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${m.system.memoryUsage.rss}
nodejs_memory_usage_bytes{type="heapTotal"} ${m.system.memoryUsage.heapTotal}
nodejs_memory_usage_bytes{type="heapUsed"} ${m.system.memoryUsage.heapUsed}
nodejs_memory_usage_bytes{type="external"} ${m.system.memoryUsage.external}
`.trim();

    return `${projectSpecific}\n${generic}`.trim();
  }

  /**
   * Destruye el recolector de métricas y limpia los timers
   */
  destroy(): void {
    if (this.systemMetricsTimer) {
      clearInterval(this.systemMetricsTimer);
    }
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
