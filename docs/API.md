# 📡 API Reference - Accessibility Middleware

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Autenticación](#autenticación)
- [Endpoints](#endpoints)
- [Modelos de Datos](#modelos-de-datos)
- [Códigos de Error](#códigos-de-error)
- [Rate Limiting](#rate-limiting)
- [Ejemplos de Uso](#ejemplos-de-uso)

---

## Introducción

### Base URL

```
http://localhost:3001/api
```

### Content-Type

Todas las requests y responses usan `application/json`:

```http
Content-Type: application/json
Accept: application/json
```

### Versioning

Actualmente API v1 (sin prefijo de versión). En futuras versiones:

```http
GET /api/v1/analyze
GET /api/v2/analyze
```

---

## Autenticación

### JWT Bearer Token

Todos los endpoints (excepto `/health` y `/metrics`) requieren autenticación JWT.

#### Formato del Token

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Payload del Token

```json
{
  "sub": "user-id-123",
  "email": "user@example.com",
  "roles": ["user", "admin"],
  "iat": 1698000000,
  "exp": 1698086400,
  "iss": "https://api.accessibility.example.com"
}
```

#### Configuración

Variables de entorno requeridas:

```bash
JWT_SECRET_KEY=<base64-encoded-secret>
JWT_ISSUER=https://api.accessibility.example.com
JWT_EXPIRY_HOURS=24
```

#### Gateway Validation (Producción)

En producción, además del JWT, se valida la firma HMAC del Gateway:

```http
X-Gateway-Signature: sha256=a3c4f8b2e...
X-Gateway-Timestamp: 1698000000
```

```bash
# Configuración Gateway
GATEWAY_SECRET=<base64-encoded-secret>
GATEWAY_VALIDATION_ENABLED=true
```

---

## Endpoints

### 1. POST /api/analyze

Realiza análisis de accesibilidad en una URL con usuario **autenticado** y **persistencia en base de datos**.

> ⚡ **Nuevo**: Para análisis sin autenticación, usa `/api/analyze/anonymous` (sin persistencia).

#### Request

```http
POST /api/analyze
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "inputType": "url",
  "value": "https://example.com",
  "tool": "axe-core",
  "wcagVersion": "2.2",
  "wcagLevel": "AA",
  "cumulativeWcag": false,
  "userId": 123
}
```

**Parámetros:**

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `inputType` | `"url"` \| `"html"` | ✅ | - | Tipo de entrada a analizar |
| `value` | string | ✅ | - | URL (http/https) o código HTML |
| `tool` | `"axe-core"` \| `"equal-access"` \| `"both"` | ❌ | `"axe-core"` | Herramienta(s) de análisis |
| `wcagVersion` | `"2.0"` \| `"2.1"` \| `"2.2"` | ❌ | `"2.2"` | Versión WCAG |
| `wcagLevel` | `"A"` \| `"AA"` \| `"AAA"` | ❌ | `"AA"` | Nivel WCAG |
| `cumulativeWcag` | boolean | ❌ | `false` | Incluir niveles inferiores |
| `userId` | number | ✅ | - | ID del usuario (para persistencia) |

**Validaciones:**

- `value`: Debe ser URL válida (http/https) o HTML válido según `inputType`
- `tool`: Debe ser uno de los valores permitidos
- `userId`: Requerido para guardar en base de datos

#### Response - Success (200)

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "meta": {
      "axe-core": {
        "violations": 2,
        "needsReview": 0,
        "recommendations": 0,
        "passes": 13,
        "incomplete": 0,
        "inapplicable": 75
      },
      "inputType": "url",
      "value": "https://example.com",
      "tool": "axe-core",
      "duration": 3311
    },
    "results": [
      {
        "tool": "axe-core",
        "stats": {
          "violations": 2,
          "needsReview": 0,
          "recommendations": 0,
          "passes": 13,
          "incomplete": 0,
          "inapplicable": 75
        },
        "items": [
          {
            "id": "landmark-one-main",
            "tool": "axe-core",
            "type": "violation",
            "impact": "moderate",
            "help": "Document should have one main landmark",
            "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/landmark-one-main",
            "nodes": [
              {
                "target": ["html"],
                "html": "<html lang=\"en\">",
                "failureSummary": "Fix all of the following:\n  Document does not have a main landmark"
              }
            ],
            "wcag": {
              "version": "2.2",
              "level": "AA",
              "criterion": "2.4.1"
            }
          }
        ]
      }
    ],
    "total": 2,
    "analysisSaved": true,
    "message": "Análisis completado con detalles de persistencia",
    "analysisId": 1,
    "persistence": {
      "analysis": {
        "success": 1,
        "error": 0,
        "message": "Análisis guardado correctamente"
      },
      "results": {
        "success": 2,
        "error": 0,
        "message": "2 resultados procesados"
      },
      "errors": {
        "success": 2,
        "error": 0,
        "message": "Errores procesados correctamente"
      },
      "history": {
        "success": 1,
        "error": 0,
        "message": "Historial guardado correctamente"
      }
    },
    "totalErrors": 0,
    "errorsSummary": {
      "resultSaveErrors": 0,
      "errorSaveErrors": 0
    },
    "isAnonymous": false
  },
  "requestId": "1be5cb7c-794c-4be7-9bd6-967350558474"
}
```

**Campos específicos de usuario autenticado:**

- `analysisSaved`: `true` - Indica que se guardó en base de datos
- `analysisId`: número - ID del análisis guardado
- `persistence`: objeto completo con estado de persistencia de cada entidad
- `totalErrors`: número de errores durante la persistencia
- `errorsSummary`: resumen de errores de guardado
- `isAnonymous`: `false` - Indica que es un usuario autenticado

#### Response - Cached (200)

Cuando el resultado está en cache (mismo formato, con `cached: true` en metadata):

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "meta": {
      "axe-core": { ... },
      "duration": 150
    },
    "results": [ ... ],
    "total": 2,
    "analysisSaved": true,
    "message": "Resultado recuperado de caché",
    "analysisId": 1,
    "persistence": { ... },
    "isAnonymous": false
  },
  "requestId": "..."
}
```

---

### 2. POST /api/analyze/anonymous

🆕 **Nuevo endpoint**: Realiza análisis de accesibilidad **sin autenticación** y **sin persistencia en base de datos**.

Útil para:
- Pruebas rápidas sin registro
- Demos públicas
- Testing de herramientas
- Análisis temporales

#### Request

```http
POST /api/analyze/anonymous
Content-Type: application/json
```

> ⚠️ **No requiere autenticación** (sin header `Authorization`)

```json
{
  "inputType": "url",
  "value": "https://example.com",
  "tool": "axe-core",
  "wcagVersion": "2.2",
  "wcagLevel": "AA",
  "cumulativeWcag": false
}
```

**Parámetros:**

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `inputType` | `"url"` \| `"html"` | ✅ | - | Tipo de entrada a analizar |
| `value` | string | ✅ | - | URL (http/https) o código HTML |
| `tool` | `"axe-core"` \| `"equal-access"` \| `"both"` | ❌ | `"axe-core"` | Herramienta(s) de análisis |
| `wcagVersion` | `"2.0"` \| `"2.1"` \| `"2.2"` | ❌ | `"2.2"` | Versión WCAG |
| `wcagLevel` | `"A"` \| `"AA"` \| `"AAA"` | ❌ | `"AA"` | Nivel WCAG |
| `cumulativeWcag` | boolean | ❌ | `false` | Incluir niveles inferiores |

> ⚠️ **userId no se acepta** en este endpoint (se ignora si se envía)

#### Response - Success (200)

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "meta": {
      "axe-core": {
        "violations": 2,
        "needsReview": 0,
        "recommendations": 0,
        "passes": 13,
        "incomplete": 0,
        "inapplicable": 75
      },
      "inputType": "url",
      "value": "https://example.com",
      "tool": "axe-core",
      "duration": 3539
    },
    "results": [
      {
        "tool": "axe-core",
        "stats": { ... },
        "items": [ ... ]
      }
    ],
    "total": 2,
    "analysisSaved": false,
    "message": "Anonymous analysis completed successfully",
    "analysisId": null,
    "persistence": null,
    "isAnonymous": true
  },
  "requestId": "94290097-0657-4bf9-bd19-edb24ccf2a71"
}
```

**Diferencias con `/api/analyze` (autenticado):**

| Campo | Usuario Autenticado | Usuario Anónimo |
|-------|---------------------|-----------------|
| `analysisSaved` | `true` | `false` |
| `analysisId` | número | `null` |
| `persistence` | objeto completo | `null` |
| `totalErrors` | presente | ausente |
| `errorsSummary` | presente | ausente |
| `isAnonymous` | `false` | `true` |

#### Comparación de Respuestas

**Usuario Autenticado** (`POST /api/analyze`):
```json
{
  "analysisSaved": true,
  "analysisId": 1,
  "persistence": {
    "analysis": { "success": 1, "error": 0, "message": "..." },
    "results": { "success": 2, "error": 0, "message": "..." },
    "errors": { "success": 2, "error": 0, "message": "..." },
    "history": { "success": 1, "error": 0, "message": "..." }
  },
  "totalErrors": 0,
  "errorsSummary": { "resultSaveErrors": 0, "errorSaveErrors": 0 },
  "isAnonymous": false
}
```

**Usuario Anónimo** (`POST /api/analyze/anonymous`):
```json
{
  "analysisSaved": false,
  "analysisId": null,
  "persistence": null,
  "isAnonymous": true
}
```

#### Códigos de Estado

| Código | Descripción |
|--------|-------------|
| `200` | Análisis exitoso |
| `400` | Request inválida (validación fallida) |
| `429` | Rate limit excedido |
| `500` | Error interno del servidor |
| `503` | Servicio no disponible (browser pool lleno) |
| `504` | Timeout en análisis |

#### Ejemplo con cURL

```bash
# Análisis anónimo (sin autenticación)
curl -X POST http://localhost:3001/api/analyze/anonymous \
  -H "Content-Type: application/json" \
  -d '{
    "inputType": "url",
    "value": "https://example.com",
    "tool": "axe-core",
    "wcagVersion": "2.2",
    "wcagLevel": "AA"
  }'
```

#### Ejemplo con JavaScript (fetch)

```javascript
// Análisis anónimo
const response = await fetch('http://localhost:3001/api/analyze/anonymous', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    inputType: 'url',
    value: 'https://example.com',
    tool: 'axe-core',
    wcagVersion: '2.2',
    wcagLevel: 'AA'
  })
});

const result = await response.json();
```

---

### 3. GET /health

Health check del servicio (no requiere autenticación).

#### Request

```http
GET /health
```

#### Response - Healthy (200)

```json
{
  "status": "healthy",
  "timestamp": "2024-10-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "browserPool": {
      "status": "up",
      "available": 3,
      "total": 3
    },
    "microservices": {
      "msAnalysis": {
        "status": "up",
        "url": "http://localhost:8082",
        "responseTime": 45
      },
      "msReports": {
        "status": "up",
        "url": "http://localhost:8083",
        "responseTime": 38
      },
      "msUsers": {
        "status": "up",
        "url": "http://localhost:8084",
        "responseTime": 42
      }
    },
    "cache": {
      "status": "up",
      "keys": 47,
      "hitRate": 78.5
    }
  }
}
```

#### Response - Degraded (200)

```json
{
  "status": "degraded",
  "timestamp": "2024-10-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "browserPool": {
      "status": "degraded",
      "available": 1,
      "total": 3,
      "message": "2 browsers unavailable"
    },
    "microservices": {
      "msAnalysis": {
        "status": "up",
        "url": "http://localhost:8082",
        "responseTime": 45
      },
      "msReports": {
        "status": "down",
        "url": "http://localhost:8083",
        "error": "Connection timeout"
      }
    }
  }
}
```

#### Response - Unhealthy (503)

```json
{
  "status": "unhealthy",
  "timestamp": "2024-10-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "browserPool": {
      "status": "down",
      "available": 0,
      "total": 3,
      "error": "All browsers crashed"
    }
  }
}
```

---

### 3. GET /metrics

Métricas de Prometheus (no requiere autenticación).

#### Request

```http
GET /metrics
```

#### Response (200)

```
# HELP http_requests_total Total de requests HTTP
# TYPE http_requests_total counter
http_requests_total{method="POST",route="/api/analyze",status="200"} 1523

# HELP http_request_duration_seconds Duración de requests HTTP
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="POST",route="/api/analyze"} 234
http_request_duration_seconds_bucket{le="0.5",method="POST",route="/api/analyze"} 890
http_request_duration_seconds_bucket{le="1",method="POST",route="/api/analyze"} 1420
http_request_duration_seconds_bucket{le="2",method="POST",route="/api/analyze"} 1500
http_request_duration_seconds_bucket{le="5",method="POST",route="/api/analyze"} 1523
http_request_duration_seconds_bucket{le="+Inf",method="POST",route="/api/analyze"} 1523
http_request_duration_seconds_sum{method="POST",route="/api/analyze"} 4267.8
http_request_duration_seconds_count{method="POST",route="/api/analyze"} 1523

# HELP analysis_duration_seconds Duración de análisis de accesibilidad
# TYPE analysis_duration_seconds histogram
analysis_duration_seconds_bucket{le="1"} 45
analysis_duration_seconds_bucket{le="2"} 234
analysis_duration_seconds_bucket{le="3"} 890
analysis_duration_seconds_bucket{le="5"} 1420
analysis_duration_seconds_bucket{le="10"} 1523
analysis_duration_seconds_bucket{le="+Inf"} 1523
analysis_duration_seconds_sum 4267.8
analysis_duration_seconds_count 1523

# HELP cache_hits_total Total de cache hits
# TYPE cache_hits_total counter
cache_hits_total 1190

# HELP cache_misses_total Total de cache misses
# TYPE cache_misses_total counter
cache_misses_total 333

# HELP browser_pool_size Tamaño actual del browser pool
# TYPE browser_pool_size gauge
browser_pool_size 3

# HELP browser_pool_available Browsers disponibles en el pool
# TYPE browser_pool_available gauge
browser_pool_available 2

# HELP active_analysis_count Análisis activos actualmente
# TYPE active_analysis_count gauge
active_analysis_count 1

# HELP nodejs_heap_size_used_bytes Heap de Node.js en uso
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 87654320

# HELP nodejs_heap_size_total_bytes Heap total de Node.js
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 134217728
```

---

## Modelos de Datos

### AnalysisRequest

```typescript
interface AnalysisRequest {
  url: string;
  standards?: string[];
  includeScreenshots?: boolean;
  waitForSelector?: string | null;
  userId: number;
  analysisName?: string;
  viewport?: {
    width: number;
    height: number;
  };
}
```

### AnalysisResult

```typescript
interface AnalysisResult {
  analysisId: string;
  url: string;
  timestamp: string;
  duration: number;
  standards: string[];
  summary: AnalysisSummary;
  violations: Issue[];
  warnings: Issue[];
  metadata: AnalysisMetadata;
  cached: boolean;
  cacheKey?: string;
  cacheAge?: number;
}
```

### AnalysisSummary

```typescript
interface AnalysisSummary {
  totalIssues: number;
  violations: number;
  warnings: number;
  passed: number;
  incomplete: number;
  bySeverity: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  byLevel: {
    A: number;
    AA: number;
    AAA: number;
  };
}
```

### Issue

```typescript
interface Issue {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagCriteria: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: IssueNode[];
}
```

### IssueNode

```typescript
interface IssueNode {
  html: string;
  target: string[];
  failureSummary: string;
  snippet: string;
}
```

### AnalysisMetadata

```typescript
interface AnalysisMetadata {
  engine: string;
  engineVersion: string;
  testRunner: string;
  testRunnerVersion: string;
  pageTitle: string;
  viewport: {
    width: number;
    height: number;
  };
}
```

### HealthCheck

```typescript
interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database?: ComponentHealth;
    browserPool?: BrowserPoolHealth;
    microservices?: {
      [key: string]: ServiceHealth;
    };
    cache?: CacheHealth;
  };
}
```

### ErrorResponse

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

---

## Códigos de Error

### Error Codes

| Código | HTTP | Descripción |
|--------|------|-------------|
| `VALIDATION_ERROR` | 400 | Request inválida (campos faltantes o inválidos) |
| `INVALID_URL` | 400 | URL malformada o inalcanzable |
| `INVALID_STANDARDS` | 400 | Estándares WCAG inválidos |
| `AUTHENTICATION_ERROR` | 401 | JWT faltante, inválido o expirado |
| `AUTHORIZATION_ERROR` | 403 | Usuario sin permisos suficientes |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit excedido (demasiadas requests) |
| `BROWSER_POOL_EXHAUSTED` | 503 | No hay browsers disponibles |
| `ANALYSIS_TIMEOUT` | 504 | Análisis excedió el timeout |
| `INTERNAL_ERROR` | 500 | Error interno del servidor |
| `SERVICE_UNAVAILABLE` | 503 | Servicio temporalmente no disponible |

### Ejemplo de Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "url",
      "value": "",
      "reason": "URL is required and cannot be empty"
    },
    "timestamp": "2024-10-15T10:30:00.000Z",
    "requestId": "req-a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

---

## Rate Limiting

### Límites por Usuario

| Tier | Requests/min | Requests/día | Análisis concurrentes |
|------|--------------|--------------|----------------------|
| **Free** | 10 | 100 | 1 |
| **Pro** | 60 | 1000 | 3 |
| **Enterprise** | 300 | 10000 | 10 |

### Headers de Rate Limit

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1698000060
```

### Response cuando se excede

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698000060
Retry-After: 45

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again in 45 seconds.",
    "details": {
      "limit": 60,
      "remaining": 0,
      "reset": 1698000060
    }
  }
}
```

---

## Ejemplos de Uso

### 1. Análisis Básico

```javascript
// JavaScript/TypeScript
const token = 'eyJhbGciOiJIUzI1NiIs...';

async function analyzeWebsite(url) {
  const response = await fetch('http://localhost:3001/api/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: url,
      standards: ['wcag2aa'],
      userId: 123
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}

// Uso
const result = await analyzeWebsite('https://example.com');
console.log(`Found ${result.data.summary.totalIssues} issues`);
```

### 2. Análisis con Múltiples Estándares

```python
# Python
import requests

url = "http://localhost:3001/api/analyze"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
payload = {
    "url": "https://example.com",
    "standards": ["wcag2a", "wcag2aa", "wcag2aaa"],
    "userId": 123,
    "analysisName": "Complete WCAG Audit"
}

response = requests.post(url, headers=headers, json=payload)
result = response.json()

if result["success"]:
    summary = result["data"]["summary"]
    print(f"Total issues: {summary['totalIssues']}")
    print(f"By severity: {summary['bySeverity']}")
```

### 3. Análisis con Viewport Personalizado

```bash
# cURL
curl -X POST http://localhost:3001/api/analyze \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "standards": ["wcag2aa"],
    "userId": 123,
    "viewport": {
      "width": 375,
      "height": 667
    }
  }'
```

### 4. Health Check con Retry

```javascript
async function waitForHealthy(maxRetries = 5, interval = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3001/health');
      const health = await response.json();
      
      if (health.status === 'healthy') {
        return true;
      }
      
      console.log(`Service degraded, retrying in ${interval}ms...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }
  
  throw new Error('Service did not become healthy');
}
```

### 5. Manejo de Rate Limit

```typescript
async function analyzeWithRetry(url: string, userId: number) {
  while (true) {
    try {
      const response = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, userId, standards: ['wcag2aa'] })
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`Rate limited, waiting ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return await response.json();
    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    }
  }
}
```

### 6. Batch Analysis

```javascript
async function analyzeBatch(urls, userId) {
  const results = [];
  
  for (const url of urls) {
    try {
      const result = await analyzeWebsite(url, userId);
      results.push({ url, success: true, data: result.data });
    } catch (error) {
      results.push({ url, success: false, error: error.message });
    }
    
    // Respetar rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

// Uso
const urls = [
  'https://example.com',
  'https://example.com/about',
  'https://example.com/contact'
];

const results = await analyzeBatch(urls, 123);
console.log(`Analyzed ${results.length} pages`);
```

---

## 🔗 Referencias

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [axe-core API Documentation](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OpenAPI Specification](https://swagger.io/specification/)

---

**Última actualización:** 15 de Octubre de 2025
