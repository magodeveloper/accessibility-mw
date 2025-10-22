/**
 * Prometheus Metrics Service
 * 
 * Servicio centralizado para recolectar y exponer métricas en formato Prometheus
 * usando la biblioteca prom-client. Complementa el servicio de métricas existente
 * proporcionando métricas estándar de Node.js y métricas personalizadas de negocio.
 */

import { register, Counter, Gauge, Histogram, Summary, collectDefaultMetrics } from 'prom-client';

// ============================================================================
// Configuración de métricas por defecto de Node.js
// ============================================================================
// Incluye: CPU, memoria, event loop, handles, requests, etc.
collectDefaultMetrics({
  prefix: 'nodejs_',
  labels: {
    app: 'accessibility_mw',
    version: process.env.npm_package_version || '1.0.0',
  },
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection buckets
});

// ============================================================================
// Métricas HTTP y Requests
// ============================================================================

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5, 10], // Buckets en segundos
  registers: [register],
});

export const httpRequestSizeBytesTotal = new Counter({
  name: 'http_request_size_bytes_total',
  help: 'Total size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  registers: [register],
});

export const httpResponseSizeBytesTotal = new Counter({
  name: 'http_response_size_bytes_total',
  help: 'Total size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// ============================================================================
// Métricas de Análisis de Accesibilidad
// ============================================================================

export const analysisRequestsTotal = new Counter({
  name: 'accessibility_analysis_requests_total',
  help: 'Total number of accessibility analysis requests',
  labelNames: ['tool', 'status'], // tool: axe-core, equal-access | status: success, error, timeout
  registers: [register],
});

export const analysisDuration = new Histogram({
  name: 'accessibility_analysis_duration_seconds',
  help: 'Duration of accessibility analysis in seconds',
  labelNames: ['tool', 'status'],
  buckets: [1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120], // Buckets en segundos
  registers: [register],
});

export const analysisViolationsFound = new Histogram({
  name: 'accessibility_analysis_violations_found',
  help: 'Number of violations found in accessibility analysis',
  labelNames: ['tool', 'severity'], // severity: critical, serious, moderate, minor
  buckets: [0, 1, 5, 10, 20, 50, 100, 200, 500],
  registers: [register],
});

export const analysisUrlsProcessed = new Counter({
  name: 'accessibility_analysis_urls_processed_total',
  help: 'Total number of URLs processed for accessibility analysis',
  labelNames: ['tool', 'status'],
  registers: [register],
});

// ============================================================================
// Métricas del Browser Pool
// ============================================================================

export const browserPoolSize = new Gauge({
  name: 'browser_pool_size',
  help: 'Current number of browser instances in the pool',
  labelNames: ['state'], // state: active, idle, total
  registers: [register],
});

export const browserPoolWaitTime = new Histogram({
  name: 'browser_pool_wait_time_seconds',
  help: 'Time spent waiting for an available browser instance',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const browserPoolAcquisitions = new Counter({
  name: 'browser_pool_acquisitions_total',
  help: 'Total number of browser instance acquisitions',
  labelNames: ['status'], // status: success, timeout, error
  registers: [register],
});

// ============================================================================
// Métricas de Cache
// ============================================================================

export const cacheOperations = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'], // operation: get, set, delete | result: hit, miss, error
  registers: [register],
});

export const cacheSize = new Gauge({
  name: 'cache_size_entries',
  help: 'Current number of entries in cache',
  registers: [register],
});

export const cacheMemoryUsage = new Gauge({
  name: 'cache_memory_bytes',
  help: 'Approximate memory usage of cache in bytes',
  registers: [register],
});

export const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate (0-1)',
  registers: [register],
});

// ============================================================================
// Métricas de Performance y Health
// ============================================================================

export const healthScore = new Gauge({
  name: 'accessibility_mw_health_score',
  help: 'Overall health score of the middleware (0-100)',
  registers: [register],
});

export const activeRequests = new Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests being processed',
  labelNames: ['method'],
  registers: [register],
});

export const eventLoopLag = new Gauge({
  name: 'nodejs_eventloop_lag_seconds',
  help: 'Event loop lag in seconds',
  registers: [register],
});

// ============================================================================
// Métricas de Rate Limiting
// ============================================================================

export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['limiter'], // limiter: general, analyze
  registers: [register],
});

// ============================================================================
// Métricas de Errores y Excepciones
// ============================================================================

export const exceptionsTotal = new Counter({
  name: 'exceptions_total',
  help: 'Total number of exceptions thrown',
  labelNames: ['type', 'fatal'], // type: error class, fatal: true/false
  registers: [register],
});

export const validationErrorsTotal = new Counter({
  name: 'validation_errors_total',
  help: 'Total number of validation errors',
  labelNames: ['validator', 'field'],
  registers: [register],
});

// ============================================================================
// Summary Metrics (para percentiles más eficientes)
// ============================================================================

export const responseTimeSummary = new Summary({
  name: 'http_response_time_summary_seconds',
  help: 'Summary of HTTP response times',
  labelNames: ['method', 'route'],
  percentiles: [0.5, 0.9, 0.95, 0.99],
  maxAgeSeconds: 600,
  ageBuckets: 5,
  registers: [register],
});

// ============================================================================
// Funciones auxiliares
// ============================================================================

/**
 * Actualiza las métricas del browser pool
 */
export function updateBrowserPoolMetrics(stats: {
  active: number;
  idle: number;
  total: number;
}): void {
  browserPoolSize.set({ state: 'active' }, stats.active);
  browserPoolSize.set({ state: 'idle' }, stats.idle);
  browserPoolSize.set({ state: 'total' }, stats.total);
}

/**
 * Actualiza las métricas de cache
 */
export function updateCacheMetrics(stats: {
  size: number;
  memoryBytes: number;
  hits: number;
  misses: number;
}): void {
  cacheSize.set(stats.size);
  cacheMemoryUsage.set(stats.memoryBytes);
  
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? stats.hits / total : 0;
  cacheHitRate.set(hitRate);
}

/**
 * Registra un análisis completado
 */
export function recordAnalysis(params: {
  tool: 'axe-core' | 'equal-access';
  status: 'success' | 'error' | 'timeout';
  durationSeconds: number;
  violationsCount?: number;
  violationsBySeverity?: Record<string, number>;
}): void {
  analysisRequestsTotal.inc({ tool: params.tool, status: params.status });
  analysisDuration.observe(
    { tool: params.tool, status: params.status },
    params.durationSeconds
  );
  
  if (params.violationsCount !== undefined) {
    analysisUrlsProcessed.inc({ tool: params.tool, status: params.status });
  }
  
  if (params.violationsBySeverity) {
    for (const [severity, count] of Object.entries(params.violationsBySeverity)) {
      analysisViolationsFound.observe({ tool: params.tool, severity }, count);
    }
  }
}

/**
 * Registra una adquisición del browser pool
 */
export function recordBrowserAcquisition(params: {
  status: 'success' | 'timeout' | 'error';
  waitTimeSeconds: number;
}): void {
  browserPoolAcquisitions.inc({ status: params.status });
  browserPoolWaitTime.observe(params.waitTimeSeconds);
}

/**
 * Registra una operación de cache
 */
export function recordCacheOperation(params: {
  operation: 'get' | 'set' | 'delete';
  result: 'hit' | 'miss' | 'error';
}): void {
  cacheOperations.inc({ operation: params.operation, result: params.result });
}

/**
 * Registra un rate limit hit
 */
export function recordRateLimitHit(limiter: 'general' | 'analyze'): void {
  rateLimitHits.inc({ limiter });
}

/**
 * Registra una excepción
 */
export function recordException(params: {
  type: string;
  fatal: boolean;
}): void {
  exceptionsTotal.inc({
    type: params.type,
    fatal: params.fatal.toString(),
  });
}

/**
 * Actualiza el health score
 */
export function updateHealthScore(score: number): void {
  healthScore.set(score);
}

/**
 * Obtiene todas las métricas en formato Prometheus
 */
export async function getPrometheusMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Obtiene el content type para Prometheus
 */
export function getPrometheusContentType(): string {
  return register.contentType;
}

/**
 * Limpia el registro de métricas (útil para tests)
 */
export function clearMetrics(): void {
  register.clear();
}

/**
 * Re-registra las métricas por defecto (útil después de clearMetrics)
 */
export function reinitializeMetrics(): void {
  collectDefaultMetrics({
    prefix: 'nodejs_',
    labels: {
      app: 'accessibility_mw',
      version: process.env.npm_package_version || '1.0.0',
    },
  });
}

// Exportar el registro completo por si se necesita
export const prometheusRegister = register;
