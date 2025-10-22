# Prometheus Metrics - Accessibility Middleware

## 📊 Endpoint de Métricas

### URL
```
GET /metrics
```

### Formatos Disponibles

#### 1. Formato Prometheus (DEFAULT)
```bash
# Sin parámetros - retorna Prometheus por defecto
curl http://localhost:3001/metrics

# Explícitamente Prometheus
curl http://localhost:3001/metrics?format=prometheus
```

**Content-Type:** `text/plain; version=0.0.4; charset=utf-8`

#### 2. Formato JSON
```bash
curl http://localhost:3001/metrics?format=json
```

**Content-Type:** `application/json`

---

## 📈 Métricas Disponibles

### Métricas Estándar de Node.js (prom-client)

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `nodejs_version_info` | Gauge | Versión de Node.js |
| `nodejs_heap_size_total_bytes` | Gauge | Tamaño total del heap |
| `nodejs_heap_size_used_bytes` | Gauge | Heap usado |
| `nodejs_external_memory_bytes` | Gauge | Memoria externa |
| `nodejs_heap_space_size_*` | Gauge | Espacios del heap por tipo |
| `nodejs_eventloop_lag_*` | Gauge/Summary | Lag del event loop |
| `process_cpu_*` | Gauge | Uso de CPU |
| `process_resident_memory_bytes` | Gauge | Memoria residente (RSS) |
| `process_start_time_seconds` | Gauge | Timestamp de inicio del proceso |

### Métricas HTTP

| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `http_requests_total` | Counter | method, route, status_code | Total de requests HTTP |
| `http_request_duration_seconds` | Histogram | method, route, status_code | Latencia de requests |
| `http_request_size_bytes_total` | Counter | method, route | Tamaño de requests |
| `http_response_size_bytes_total` | Counter | method, route, status_code | Tamaño de responses |
| `http_active_requests` | Gauge | method | Requests activos en proceso |
| `http_response_time_summary_seconds` | Summary | method, route | Summary de tiempos de respuesta (p50, p90, p95, p99) |

**Buckets de latencia:** 0.1s, 0.3s, 0.5s, 1s, 1.5s, 2s, 3s, 5s, 10s

### Métricas de Análisis de Accesibilidad

| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `accessibility_analysis_requests_total` | Counter | tool, status | Total de análisis ejecutados |
| `accessibility_analysis_duration_seconds` | Histogram | tool, status | Duración de análisis |
| `accessibility_analysis_violations_found` | Histogram | tool, severity | Violaciones encontradas |
| `accessibility_analysis_urls_processed_total` | Counter | tool, status | URLs procesadas |

**Tools:** `axe-core`, `equal-access`  
**Status:** `success`, `error`, `timeout`  
**Severity:** `critical`, `serious`, `moderate`, `minor`

**Buckets de duración:** 1s, 2s, 5s, 10s, 15s, 20s, 30s, 45s, 60s, 90s, 120s  
**Buckets de violaciones:** 0, 1, 5, 10, 20, 50, 100, 200, 500

### Métricas del Browser Pool

| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `browser_pool_size` | Gauge | state | Tamaño del pool de browsers |
| `browser_pool_wait_time_seconds` | Histogram | - | Tiempo de espera por browser |
| `browser_pool_acquisitions_total` | Counter | status | Adquisiciones de browser |

**States:** `active`, `idle`, `total`  
**Buckets de espera:** 0.1s, 0.5s, 1s, 2s, 5s, 10s, 30s

### Métricas de Cache

| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `cache_operations_total` | Counter | operation, result | Operaciones de cache |
| `cache_size_entries` | Gauge | - | Número de entradas |
| `cache_memory_bytes` | Gauge | - | Uso de memoria |
| `cache_hit_rate` | Gauge | - | Tasa de aciertos (0-1) |

**Operations:** `get`, `set`, `delete`  
**Results:** `hit`, `miss`, `error`

### Métricas de Health y Performance

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `accessibility_mw_health_score` | Gauge | Score de salud general (0-100) |
| `nodejs_eventloop_lag_seconds` | Gauge | Lag del event loop |

### Métricas de Rate Limiting

| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `rate_limit_hits_total` | Counter | limiter | Hits de rate limit |

**Limiters:** `general`, `analyze`

### Métricas de Errores

| Métrica | Tipo | Labels | Descripción |
|---------|------|--------|-------------|
| `exceptions_total` | Counter | type, fatal | Total de excepciones |
| `validation_errors_total` | Counter | validator, field | Errores de validación |

---

## 🔧 Integración con Prometheus

### Configuración de Scrape

```yaml
scrape_configs:
  - job_name: 'accessibility-middleware'
    static_configs:
      - targets: ['accessibility-mw-prod:3001']
        labels:
          service: 'middleware'
          component: 'analysis-engine'
          team: 'analysis'
    
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s
```

### Queries de Ejemplo

#### Tasa de Requests
```promql
rate(http_requests_total[5m])
```

#### Latencia P95
```promql
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
)
```

#### Análisis por Herramienta
```promql
rate(accessibility_analysis_requests_total{tool="axe-core"}[5m])
```

#### Health Score
```promql
accessibility_mw_health_score
```

#### Tasa de Éxito de Análisis
```promql
rate(accessibility_analysis_requests_total{status="success"}[5m]) 
/ 
rate(accessibility_analysis_requests_total[5m])
```

#### Uso del Browser Pool
```promql
browser_pool_size{state="active"} / browser_pool_size{state="total"}
```

#### Cache Hit Rate
```promql
cache_hit_rate
```

---

## 📝 Notas

1. **Formato por defecto:** El endpoint ahora retorna formato Prometheus por defecto (sin parámetros)
2. **Compatibilidad:** El formato JSON sigue disponible con `?format=json`
3. **Métricas legacy:** Se mantienen métricas del sistema anterior para compatibilidad
4. **Performance:** Las métricas por defecto de Node.js se recolectan automáticamente
5. **Labels:** Usar labels para filtrar y agregar métricas en Grafana/Prometheus

---

## 🚀 Testing

### Verificar endpoint
```bash
# Formato Prometheus
curl http://localhost:3001/metrics

# Formato JSON
curl http://localhost:3001/metrics?format=json | jq .
```

### Verificar desde Prometheus
```bash
# En Prometheus UI: http://localhost:9090
# Targets -> http://accessibility-mw-prod:3001/metrics
# Graph -> accessibility_mw_health_score
```
