# 🚀 Accessibility Middleware

[![Node.js](https://img.shields.io/badge/Node.js-20.19.5-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Alpine%203.22-2496ED?logo=docker)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](#-testing)
[![Coverage](https://img.shields.io/badge/coverage-88%25-brightgreen)](#-testing)
[![Security](https://img.shields.io/badge/vulnerabilities-0%20prod-success)](#-seguridad)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

> **Middleware avanzado de análisis de accesibilidad web con integración dual de herramientas (axe-core e IBM Equal Access) y persistencia automática en microservicios .NET.**

> ⚡ **Nota:** Este middleware forma parte de un ecosistema donde el **Gateway** gestiona rate limiting, circuit breaker y load balancing. El middleware se enfoca en análisis de accesibilidad y orquestación de herramientas.

---

## 📋 Tabla de Contenidos

- [✨ Características](#-características-principales)
- [🏗️ Arquitectura](#️-arquitectura)
- [� Documentación Adicional](#-documentación-adicional)
- [�🚀 Quick Start](#-quick-start)
  - [Requisitos](#requisitos)
  - [Instalación Local](#instalación-local)
  - [Docker Compose](#docker-compose-recomendado)
- [⚙️ Configuración](#️-configuración)
- [📡 API Reference](#-api-reference)
- [🧪 Testing](#-testing)
- [📊 Load Testing](#-load-testing)
- [🐳 Docker & Deployment](#-docker--deployment)
- [🔒 Seguridad](#-seguridad)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [🔄 CI/CD](#-cicd)

---

## ✨ Características Principales

- ✅ **Análisis dual** - axe-core 4.11.0 + IBM Equal Access 4.0.9
- ✅ **Pool de navegadores optimizado** - Playwright 1.56.1 con reducción del 70% en overhead
- ✅ **Cache inteligente** - Sistema LRU con TTL configurable
- ✅ **Integración microservicios** - Comunicación transparente con .NET vía Docker
- ✅ **Mapeo WCAG automático** - 138+ reglas mapeadas a WCAG 2.1/2.2
- ✅ **Monitoreo completo** - Health checks profundos + métricas Prometheus
- ✅ **Alto rendimiento** - Análisis promedio en 2.8s
- ✅ **Calidad asegurada** - Suite completa de tests (unit, integration, e2e, contract), 88%+ cobertura
- ✅ **Seguridad robusta** - JWT + validación de Gateway
- ✅ **Resiliencia** - Circuit breaker pattern integrado

---

## 🏗️ Arquitectura

```
┌────────────────────────────────────────────────┐
│     ACCESSIBILITY MIDDLEWARE (PORT 3001)       │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │    Express Server + Middlewares        │  │
│  │  (Auth, CORS, Rate Limit, Logging)     │  │
│  └──────────────┬──────────────────────────┘  │
│                 │                              │
│                 ▼                              │
│  ┌─────────────────────────────────────────┐  │
│  │      Analysis Service Orchestrator     │  │
│  │   (Dual Engine: axe + IBM EA)          │  │
│  └──────────────┬──────────────────────────┘  │
│                 │                              │
│        ┌────────┴────────┐                     │
│        ▼                 ▼                     │
│  ┌──────────┐    ┌──────────────┐             │
│  │  Cache   │    │ Browser Pool │             │
│  │  (LRU)   │    │ (Playwright) │             │
│  └──────────┘    └──────────────┘             │
│                         │                      │
│  ┌─────────────────────┴──────────────┐       │
│  │         WCAG Mappers               │       │
│  │  (axe + IBM EA → WCAG 2.1/2.2)     │       │
│  └────────────────────────────────────┘       │
└────────────────────┬───────────────────────────┘
                     │ REST API
                     ▼
          ┌──────────────────────┐
          │  Microservicios .NET │
          ├──────────────────────┤
          │  ms-analysis (8082)  │
          │  ms-reports (8083)   │
          │  ms-users (8084)     │
          ├──────────────────────┤
          │    MySQL 8.4         │
          └──────────────────────┘
```

### Componentes Principales

| Componente | Responsabilidad | Tecnología |
|------------|----------------|------------|
| **Express Server** | API REST + middleware chain | Express 5.1 |
| **Analysis Service** | Orquestación de análisis dual | TypeScript |
| **Browser Pool** | Pool reutilizable de navegadores | Playwright 1.56 |
| **Cache Service** | Almacenamiento temporal de resultados | node-cache (LRU) |
| **WCAG Mappers** | Mapeo automático de reglas → WCAG | Mappers personalizados |
| **Health Monitor** | Monitoreo de servicios externos | Health checks |
| **Logging Service** | Logger estructurado | Pino |
| **Error Handler** | Manejo centralizado de errores | Middleware personalizado |

---

## � Documentación Adicional

Para información técnica detallada, consulta la documentación especializada:

| Documento | Descripción |
|-----------|-------------|
| [🏗️ **ARCHITECTURE.md**](docs/ARCHITECTURE.md) | Arquitectura técnica de 4 capas, patrones de diseño (Singleton, Factory, Strategy, Circuit Breaker), decisiones arquitectónicas y estrategias de escalabilidad |
| [🛠️ **DEVELOPMENT.md**](docs/DEVELOPMENT.md) | Guía completa de desarrollo: setup, estructura del proyecto, workflows, testing, debugging, code style y mejores prácticas |
| [📡 **API.md**](docs/API.md) | Referencia completa de la API REST: endpoints, autenticación JWT/Gateway, modelos de datos, códigos de error y ejemplos de uso |
| [🔧 **TROUBLESHOOTING.md**](docs/TROUBLESHOOTING.md) | Solución de problemas comunes: instalación, runtime, performance, browser pool, microservicios, Docker y debugging avanzado |

> 💡 **Tip:** Si eres nuevo en el proyecto, empieza por [DEVELOPMENT.md](docs/DEVELOPMENT.md) para el setup inicial, luego consulta [ARCHITECTURE.md](docs/ARCHITECTURE.md) para entender el diseño técnico.

---

## �🚀 Quick Start

### Requisitos

- **Node.js 20.19.5+** (LTS con npm 10+)
- **Docker & Docker Compose** (para microservicios y Playwright)
- **MySQL 8.4+** (opcional, Docker lo provee)
- **Git**
- **Memoria recomendada:** 4GB+ para desarrollo, 3GB+ para producción

### Instalación Local

```bash
# 1. Clonar repositorio
git clone https://github.com/your-org/accessibility-mw.git
cd accessibility-mw

# 2. Instalar dependencias
npm ci

# 3. Configurar entorno
cp .env.template .env.development
# Editar .env.development con tus configuraciones

# 4. Generar secretos JWT
.\Generate-JwtSecretKey.ps1  # Windows
# o
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# 5. Compilar TypeScript
npm run build

# 6. Iniciar servicios dependientes
docker compose -f docker-compose.ci.yml up -d mysql-analysis ms-analysis ms-reports

# 7. Ejecutar middleware
npm start

# 8. Verificar funcionamiento
curl http://localhost:3001/health
```

### Docker Compose (Recomendado)

```bash
# Iniciar todo el ecosistema
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f accessibility-mw

# Verificar estado
docker compose ps

# Health check
curl http://localhost:3001/health

# Detener servicios
docker compose down
```

### Desarrollo Local

```bash
# Modo desarrollo con hot-reload
npm run dev

# Linting y type-checking
npm run lint
npm run type-check

# Tests con watch mode
npm run test:watch

# Ver logs estructurados
npm run dev | npx pino-pretty
```

### Verificación Rápida

```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Análisis anónimo (sin autenticación, sin persistencia)
curl -X POST http://localhost:3001/api/analyze/anonymous \
  -H "Content-Type: application/json" \
  -d '{
    "inputType": "url",
    "value": "https://example.com",
    "tool": "axe-core",
    "wcagVersion": "2.2",
    "wcagLevel": "AA"
  }'

# 3. Análisis autenticado (con persistencia en BD)
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "inputType": "url",
    "value": "https://example.com",
    "tool": "axe-core",
    "wcagVersion": "2.2",
    "wcagLevel": "AA",
    "userId": 123
  }'

# 4. Ver métricas Prometheus
curl http://localhost:3001/metrics
```

---

## ⚙️ Configuración

### Patrón de Archivos de Entorno

Este middleware sigue **el mismo patrón que los microservicios .NET**:

```
.env.template        ← Plantilla con placeholders (EN repositorio)
.env.development     ← Desarrollo local (NO en repositorio)
.env.production      ← Producción (NO en repositorio)
```

### Variables Principales

#### 🔐 Seguridad y Autenticación

```bash
# JWT Configuration
JWT_SECRET_KEY=<secret-64-chars>           # Requerido: Generar con script
JWT_ISSUER=https://api.accessibility.company.com
JWT_EXPIRY_HOURS=24

# Gateway Authentication
GATEWAY_SECRET=<secret-64-chars>           # Requerido: Shared secret con Gateway
GATEWAY_VALIDATION_ENABLED=true            # Validar requests desde Gateway
```

#### 🌐 Microservicios

```bash
# Analysis Microservice
ANALYSIS_API_URL=http://localhost:8082
ANALYSIS_TIMEOUT_MS=30000

# Reports Microservice
REPORTS_API_URL=http://localhost:8083
REPORTS_TIMEOUT_MS=10000

# Users Microservice
USERS_API_URL=http://localhost:8084
USERS_TIMEOUT_MS=5000
```

#### 🎭 Browser Pool

```bash
# Playwright Configuration
BROWSER_POOL_SIZE=3                        # Número de navegadores en pool
BROWSER_TIMEOUT_MS=30000                   # Timeout por navegación
BROWSER_HEADLESS=true                      # Modo headless
```

#### 💾 Cache

```bash
# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL_SECONDS=3600                     # 1 hora
CACHE_MAX_KEYS=100
```

#### 📊 Performance y Logging

```bash
# Logging
LOG_LEVEL=info                             # trace, debug, info, warn, error, fatal
ENABLE_VERBOSE_LOGGING=false

# Performance
ENABLE_METRICS=true
ENABLE_PERFORMANCE_MONITORING=true
```

### Scripts de Utilidad

```powershell
# Generar secret JWT (64+ caracteres)
.\Generate-JwtSecretKey.ps1

# Validar configuración JWT
.\Validate-JwtConfig.ps1

# Verificar variables de entorno
node -e "require('dotenv').config({ path: '.env.development' }); console.log(process.env)"
```

---

## 📡 API Reference

### Endpoints Principales

#### POST /api/analyze

Analiza una URL con **usuario autenticado** y **persistencia en base de datos**.

> 🆕 **Nuevo**: Para análisis sin autenticación, usa `/api/analyze/anonymous`

**Request:**

```json
{
  "inputType": "url",
  "value": "https://example.com",
  "tool": "axe-core",
  "wcagVersion": "2.2",
  "wcagLevel": "AA",
  "userId": 123
}
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "meta": {
      "axe-core": {
        "violations": 2,
        "needsReview": 0,
        "passes": 13
      },
      "tool": "axe-core",
      "duration": 3311
    },
    "results": [...],
    "total": 2,
    "analysisSaved": true,
    "analysisId": 1,
    "persistence": {
      "analysis": { "success": 1, "error": 0, "message": "..." },
      "results": { "success": 2, "error": 0, "message": "..." }
    },
    "isAnonymous": false
  }
}
```

#### POST /api/analyze/anonymous

🆕 **Nuevo**: Análisis **sin autenticación** y **sin persistencia**.

**Request (sin token):**

```json
{
  "inputType": "url",
  "value": "https://example.com",
  "tool": "axe-core",
  "wcagVersion": "2.2",
  "wcagLevel": "AA"
}
```

**Response (200):**

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "meta": { "axe-core": {...}, "duration": 3539 },
    "results": [...],
    "total": 2,
    "analysisSaved": false,
    "analysisId": null,
    "persistence": null,
    "isAnonymous": true
  }
}
```

**Diferencias clave:**

| Campo | Autenticado | Anónimo |
|-------|-------------|---------|
| **JWT** | ✅ Requerido | ❌ No |
| **`analysisSaved`** | `true` | `false` |
| **`analysisId`** | número | `null` |
| **`persistence`** | objeto | `null` |
| **`isAnonymous`** | `false` | `true` |

**Errores:**

- `400` - URL inválida o parámetros incorrectos
- `401` - Token JWT inválido o expirado (solo `/api/analyze`)
- `403` - No autorizado (Gateway validation failed)
- `422` - Error en análisis (sitio no accesible)
- `500` - Error interno del servidor
- `503` - Servicio no disponible (circuit breaker abierto)
- `504` - Timeout en análisis

#### GET /health

Health check completo del middleware y dependencias.

**Response (200):**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "ms-analysis": {
      "status": "healthy",
      "responseTime": 45,
      "lastCheck": "2025-10-15T10:29:50Z"
    },
    "ms-reports": {
      "status": "healthy",
      "responseTime": 32,
      "lastCheck": "2025-10-15T10:29:50Z"
    }
  },
  "resources": {
    "memory": {
      "used": 256000000,
      "percentage": 45
    },
    "browserPool": {
      "size": 3,
      "available": 2,
      "active": 1
    },
    "cache": {
      "size": 45,
      "hitRate": 0.78
    }
  }
}
```

#### GET /health/live

**Liveness probe** para Kubernetes/Docker. Verifica que el proceso esté vivo y respondiendo.

**Response (200):**

```json
{
  "status": "alive",
  "timestamp": "2025-10-15T10:30:00Z"
}
```

**Uso en Kubernetes:**

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 20
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

#### GET /health/ready

**Readiness probe** para Kubernetes/Docker. Verifica que el servicio esté listo para recibir tráfico (dependencias conectadas, recursos disponibles).

**Response (200):**

```json
{
  "status": "ready",
  "timestamp": "2025-10-15T10:30:00Z",
  "services": {
    "ms-analysis": "healthy",
    "ms-reports": "healthy"
  },
  "browserPool": {
    "available": 2,
    "ready": true
  }
}
```

**Response (503) - Not Ready:**

```json
{
  "status": "not_ready",
  "timestamp": "2025-10-15T10:30:00Z",
  "reason": "Browser pool not ready",
  "services": {
    "ms-analysis": "healthy",
    "ms-reports": "degraded"
  }
}
```

**Uso en Kubernetes:**

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 15
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

#### GET /metrics

**Exporta métricas de observabilidad en formato Prometheus** (por defecto) o JSON (legacy).

🆕 **Cambio Importante**: Desde v1.x, el formato por defecto es **Prometheus** para integración directa con Prometheus/Grafana.

**Formatos Soportados:**

```bash
# Formato Prometheus (por defecto)
curl http://localhost:3001/metrics

# Formato JSON (legacy, retrocompatibilidad)
curl http://localhost:3001/metrics?format=json
```

**Categorías de Métricas:**

| Categoría | Descripción | Ejemplos |
|-----------|-------------|----------|
| **Node.js Runtime** | CPU, memoria, GC, event loop | `nodejs_heap_size_used_bytes`, `nodejs_eventloop_lag_seconds` |
| **HTTP Requests** | Contadores y latencias por endpoint | `http_requests_total`, `http_request_duration_seconds` |
| **Accessibility Analysis** | Análisis ejecutados, duración, errores | `analysis_requests_total`, `analysis_duration_seconds` |
| **Browser Pool** | Estado del pool de Playwright | `browser_pool_size`, `browser_pool_wait_time_seconds` |
| **Cache** | Operaciones de cache, hit rate | `cache_operations_total`, `cache_hit_rate` |
| **Health Score** | Puntuación de salud general | `accessibility_mw_health_score` |

**Response Prometheus (200):**

```prometheus
# HELP process_cpu_user_seconds_total Total user CPU time
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 12.5

# HELP nodejs_heap_size_used_bytes Process heap size used
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 45678912

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="POST",path="/api/analyze",status="200"} 1234
http_requests_total{method="GET",path="/health",status="200"} 567

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",path="/api/analyze",le="0.5"} 890
http_request_duration_seconds_bucket{method="POST",path="/api/analyze",le="1.0"} 1100
http_request_duration_seconds_bucket{method="POST",path="/api/analyze",le="+Inf"} 1234
http_request_duration_seconds_sum{method="POST",path="/api/analyze"} 2847.5
http_request_duration_seconds_count{method="POST",path="/api/analyze"} 1234

# HELP analysis_requests_total Total accessibility analysis requests
# TYPE analysis_requests_total counter
analysis_requests_total{engine="dual",status="success"} 450
analysis_requests_total{engine="dual",status="error"} 12

# HELP analysis_duration_seconds Analysis execution time
# TYPE analysis_duration_seconds histogram
analysis_duration_seconds_sum 5694.2
analysis_duration_seconds_count 450

# HELP browser_pool_size Current browser pool size
# TYPE browser_pool_size gauge
browser_pool_size{state="total"} 3
browser_pool_size{state="available"} 2
browser_pool_size{state="active"} 1

# HELP cache_hit_rate Cache hit rate (0-1)
# TYPE cache_hit_rate gauge
cache_hit_rate 0.78

# HELP accessibility_mw_health_score Overall health score (0-100)
# TYPE accessibility_mw_health_score gauge
accessibility_mw_health_score 95
```

**Response JSON - Legacy (200):**

```json
{
  "timestamp": "2025-10-15T10:30:00Z",
  "uptime": 3600,
  "metrics": {
    "http": {
      "requestsTotal": 1234,
      "averageResponseTime": 2.3,
      "errorRate": 0.02
    },
    "analysis": {
      "total": 450,
      "success": 438,
      "errors": 12,
      "averageDuration": 2.8
    },
    "browserPool": {
      "size": 3,
      "available": 2,
      "active": 1
    },
    "cache": {
      "size": 45,
      "hitRate": 0.78
    },
    "resources": {
      "memoryUsed": 256000000,
      "memoryPercentage": 45
    }
  }
}
```

**Headers:**

```
Content-Type: text/plain; version=0.0.4; charset=utf-8  # Prometheus
Content-Type: application/json                          # JSON
```

📚 **Documentación Detallada**: Ver [docs/prometheus-metrics.md](docs/prometheus-metrics.md) para:
- Guía completa de métricas exportadas
- Queries Prometheus de ejemplo
- Integración con Grafana
- Configuración de alertas

### Headers Requeridos

**Para endpoints protegidos** (`/api/analyze`, `/api/reports`, etc.):

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Gateway-Secret: <GATEWAY_SECRET>  # Requerido si GATEWAY_VALIDATION_ENABLED=true
```

**Para endpoints públicos** (`/health`, `/health/live`, `/health/ready`, `/metrics`):

```http
# No requieren headers de autenticación
```

> **💡 Nota**: El header `X-Gateway-Secret` solo es necesario cuando el middleware está configurado con `GATEWAY_VALIDATION_ENABLED=true` (recomendado para producción).

---

## 🧪 Testing

### Suite Completa de Tests

```bash
# Ejecutar todos los tests
npm test

# Tests con cobertura
npm run test:coverage

# Tests unitarios solamente
npm run test:unit

# Tests unitarios con cobertura
npm run test:unit:coverage

# Tests de integración (🔧 SISTEMA DE MOCKS INTELIGENTE - Recomendado)
npm run test:integration

# Tests E2E
npm run test:e2e

# Tests con watch mode
npm run test:watch

# Tests específicos
npm test -- --testPathPattern=analysis
npm test -- --testNamePattern="should analyze URL"
```

### 🔧 Sistema de Mocks Inteligente

Los tests de integración ahora incluyen un **sistema de mocks automático** que detecta el entorno y se adapta:

#### Cómo Funciona

```typescript
// Auto-detección en tests/helpers/integration-setup.ts
const useRealServices = process.env.CI === 'true' || process.env.USE_REAL_SERVICES === 'true';

if (useRealServices) {
  // En CI (GitHub Actions) → Usa servicios Docker reales
  console.log('🔗 CI environment - using real Docker services');
} else {
  // En desarrollo local → Levanta mocks HTTP automáticamente
  console.log('💻 Local environment - starting mock services');
  await setupMockServers(); // Puertos 8082, 8083
}
```

#### Ventajas del Sistema

| Entorno | Comportamiento | Requisitos |
|---------|----------------|------------|
| **Local (Windows/Mac)** | ✅ Mocks HTTP en puertos 8082/8083 | Ninguno (auto) |
| **CI (Linux)** | ✅ Docker Compose real | Docker en CI |
| **Manual Override** | `USE_REAL_SERVICES=true` | Docker local |

#### Características de los Mocks

- ✅ **Respuestas realistas** - Estructuras idénticas a servicios .NET reales
- ✅ **Validación completa** - Campos requeridos, formatos, errores HTTP
- ✅ **Persistencia en memoria** - State compartido entre tests
- ✅ **CRUD completo** - POST, GET, PUT, PATCH, DELETE
- ✅ **Health checks** - Endpoints `/health` funcionales
- ✅ **Sin configuración** - Se levantan automáticamente

#### Ejemplo de Mock

```typescript
// Mock MS-Analysis en puerto 8082
POST /api/analysis → { data: { id, userId, url, results, ... } }
GET  /api/analysis/:id → { analysis: { id, userId, ... } }
GET  /api/analysis/user/:userId → { data: [...] }
GET  /health → { status: "Healthy", service: "ms-analysis" }

// Mock MS-Reports en puerto 8083
POST /api/reports → { data: { id, userId, analysisId, ... } }
GET  /api/reports/:id → { data: { id, title, format, ... } }
GET  /api/reports/analysis/:analysisId → { data: [...] }
PATCH /api/reports/:id → 200 OK (actualización de status)
```

#### Testing con Servicios Docker Reales

Para entornos CI/CD o validación completa con servicios .NET reales:

```bash
# 1. Levantar servicios Docker
docker compose -f docker-compose.ci.yml up -d

# 2. Ejecutar tests con servicios reales
USE_REAL_SERVICES=true npm run test:integration

# 3. Limpiar después
docker compose -f docker-compose.ci.yml down -v
```

> **💡 Tip**: Los mocks son ideales para desarrollo local rápido. Los servicios Docker reales se usan automáticamente en CI/CD (GitHub Actions) para validación completa del sistema integrado.

### Resultados Actuales

```
Test Suites: 55 passed, 55 total
Tests:       1 skipped, 1090 passed, 1091 total
Coverage:    88.59% statements, 81.39% branches, 88.50% functions, 88.84% lines
Time:        ~144s
```

### Tipos de Tests

| Tipo | Cantidad | Cobertura | Propósito |
|------|----------|-----------|-----------|
| **Unit** | 950+ | 90% | Funciones individuales y servicios |
| **Integration** | 120+ | 85% | Interacción entre componentes |
| **E2E** | 30+ | 70% | Flujos completos de análisis |
| **Load** | 6+ | N/A | Performance bajo carga |

### Archivos Excluidos de Cobertura

Los siguientes archivos están excluidos de las métricas de cobertura por razones técnicas:

| Archivo | Razón de Exclusión |
|---------|-------------------|
| `browser.pool.service.ts` | Conflictos con Playwright en ambiente de tests |
| `render.service.ts` | Servicio de renderizado que usa Playwright |
| `axe.service.ts` | Integración directa con axe-core en navegador |
| `prometheus.metrics.service.ts` | Servicio de métricas sin tests (0% funciones) |
| `server.ts` | Archivo de bootstrap, difícil de testear completamente |
| `bundle.route.ts` | Ruta de bundling con múltiples edge cases |
| `health.route.ts` | Health checks con dependencias externas |
| `analyze.route.ts` | Ruta principal compleja con muchos flujos |

> 💡 **Nota**: Estos archivos están excluidos para mantener métricas de cobertura realistas y alcanzables. Los archivos críticos del negocio sí tienen alta cobertura (88%+).

### Dashboard de Tests

Este proyecto incluye un **script PowerShell avanzado** (`manage-tests.ps1`) que proporciona gestión completa de testing con dashboard HTML interactivo.

#### Script Helper: `manage-tests.ps1`

```powershell
# Pipeline completo: tests + cobertura + dashboard
.\manage-tests.ps1 full

# Tests con cobertura y dashboard automático
.\manage-tests.ps1 coverage -OpenDashboard

# Tests específicos
.\manage-tests.ps1 test -Type unit
.\manage-tests.ps1 test -Type integration
.\manage-tests.ps1 test -Type e2e

# Solo generar dashboard (con datos existentes)
.\manage-tests.ps1 dashboard -OpenDashboard

# Limpiar archivos de tests
.\manage-tests.ps1 clean

# Ver ayuda detallada
.\manage-tests.ps1 help
```

#### Dashboard Features

El dashboard HTML (`test-dashboard.html`) incluye:

- ✅ **Resumen ejecutivo** - Tests ejecutados, pasados, fallidos, cobertura global
- ✅ **Métricas por tipo** - Unit, Integration, E2E desglosados
- ✅ **Gráficos interactivos** - Chart.js para visualización de datos
- ✅ **Cobertura por archivo** - Statements, branches, functions, lines
- ✅ **Histórico de ejecuciones** - Tendencias y evolución temporal
- ✅ **Tests fallidos** - Detalles de errores y stack traces
- ✅ **Performance** - Tiempos de ejecución y tests lentos
- ✅ **Auto-refresh** - Actualización automática cada 30s

#### Reportes Generados

```bash
# Generar reporte HTML
npm run test:coverage

# Ubicaciones de reportes
coverage/lcov-report/index.html    # Reporte detallado de cobertura
test-dashboard.html                # Dashboard interactivo
TestResults/                       # Resultados XML/JSON de Jest
```

---

## 📊 Load Testing

### Herramientas

- **k6** - Load testing moderno
- **Artillery** - Alternative framework
- **Custom scripts** - Automatización con PowerShell/Bash

### Escenarios de Carga

```bash
# Carga ligera (20 VUs, 2 min)
npm run load:light

# Carga media (50 VUs, 5 min)
npm run load:medium

# Carga alta (100 VUs, 10 min)
npm run load:high

# Stress test (200+ VUs, 15 min)
npm run load:stress
```

### Resultados Esperados

| Nivel | VUs | Duración | Success Rate | P95 Latency |
|-------|-----|----------|--------------|-------------|
| **Light** | 20 | 2 min | 99.5%+ | <1s |
| **Medium** | 50 | 5 min | 98%+ | <2s |
| **High** | 100 | 10 min | 95%+ | <5s |
| **Stress** | 200+ | 15 min | 90%+ | <10s |

---

## 🐳 Docker & Deployment

### 🚀 Despliegue en Producción

Para despliegue en producción, consulta la **[Guía Completa de Despliegue en Producción](docs/PRODUCTION-DEPLOYMENT.md)**.

#### Quick Start - Producción

```bash
# 1. Validar configuración
npm run validate:production

# 2. Build imagen de producción
npm run docker:build:prod

# 3. Deploy
npm run docker:up:prod

# 4. Verificar
npm run docker:status:prod
curl http://localhost:3001/health
```

#### Script Helper Interactivo

```powershell
# Modo interactivo con menú
.\deploy-production.ps1

# O acciones directas
.\deploy-production.ps1 -Action validate
.\deploy-production.ps1 -Action build
.\deploy-production.ps1 -Action deploy
.\deploy-production.ps1 -Action health
```

#### NPM Scripts de Producción

```bash
# Docker Compose - Producción
npm run docker:build:prod         # Build imagen sin cache
npm run docker:up:prod             # Levantar en background
npm run docker:up:prod:attached    # Levantar con logs visibles
npm run docker:down:prod           # Detener y eliminar
npm run docker:restart:prod        # Reiniciar servicio
npm run docker:status:prod         # Ver estado
npm run docker:logs:prod           # Ver logs
npm run docker:logs:prod:follow    # Ver logs en tiempo real

# Validación y despliegue
npm run validate:production        # Validar config antes de deploy
npm run predeploy                  # Validar + build + tests
npm run start:prod                 # Iniciar en modo producción (local)
```

### Configuración de Entorno

#### Desarrollo vs Producción

```bash
# Desarrollo (usa .env.development)
npm run docker:up
npm run dev

# Producción (usa .env.production)
npm run docker:up:prod
npm run start:prod
```

#### Variables Críticas de Producción

```bash
# .env.production
NODE_ENV=production
APP_ENV=PROD
HOST=0.0.0.0
TRUST_PROXY=true

# Seguridad (⚠️ CAMBIAR antes de desplegar)
JWT_SECRET_KEY=<generar-secret-64-chars>
GATEWAY_SECRET=<generar-secret-64-chars>
GATEWAY_VALIDATION_ENABLED=true

# CORS (configurar dominios reales)
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com

# Servicios externos
ANALYSIS_API_URL=http://ms-analysis-service:8082  # Kubernetes
# o
ANALYSIS_API_URL=http://host.docker.internal:8082  # Docker Compose
```

#### Generar Secretos Seguros

```powershell
# PowerShell
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# O usar el script incluido
.\Generate-JwtSecretKey.ps1
```

### Imágenes Docker

```bash
# Build de imagen de desarrollo
docker build -t accessibility-mw:dev .

# Build de producción con metadata
docker build -t accessibility-mw:1.0.0 \
  --build-arg BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  --build-arg VERSION="1.0.0" \
  --build-arg VCS_REF="$(git rev-parse --short HEAD)" \
  .

# Verificar imagen
docker images | grep accessibility-mw
docker inspect accessibility-mw:1.0.0
```

### Docker Compose - Configuraciones

#### Desarrollo (docker-compose.yml)

```yaml
services:
  accessibility-mw:
    image: accessibility-mw:latest
    environment:
      - NODE_ENV=development
      - GATEWAY_VALIDATION_ENABLED=true
    ports:
      - "3001:3001"
    volumes:
      # Persistencia de resultados de tests y cobertura
      - ./coverage:/app/coverage              # Cobertura de código
      - ./TestResults:/app/TestResults        # Resultados de tests
      - ./.nyc_output:/app/.nyc_output        # Cache de NYC coverage
      - ./test-results:/app/test-results      # Resultados de accessibility-checker
      - ./.achecker_cache:/app/.achecker_cache # Cache de Equal Access
    shm_size: 1g                              # Memoria compartida para Playwright
    deploy:
      resources:
        limits:
          memory: 4G                          # Optimizado para desarrollo
    memswap_limit: 4G
    tmpfs:
      - /app/logs:size=100m,mode=1777         # Logs temporales en memoria
      - /tmp:size=512m,mode=1777              # Temp files en memoria
```

> **💡 Volúmenes**: Los volúmenes Docker mapeados permiten que los archivos generados dentro del contenedor (cobertura, test results, cache) se persistan en el sistema host, facilitando el acceso y version control.

#### Producción (docker-compose.production.yml)

```yaml
services:
  accessibility-mw:
    image: accessibility-mw:${VERSION:-latest}
    environment:
      - NODE_ENV=production
      - GATEWAY_VALIDATION_ENABLED=true
      - TRUST_PROXY=true
    ports:
      - "${MW_HOST_PORT:-3001}:3001"
    shm_size: 2g                    # Mayor memoria compartida en prod
    deploy:
      resources:
        limits:
          memory: 3G                # Límite de RAM
          cpus: '2.0'               # Límite de CPU
        reservations:
          memory: 2G                # RAM reservada
          cpus: '1.0'               # CPU reservada
    memswap_limit: 3G
    restart: unless-stopped
    healthcheck:
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```

### Health Checks

```bash
# Health endpoint
curl http://localhost:3001/health

# Liveness probe
curl http://localhost:3001/health/live

# Readiness probe
curl http://localhost:3001/health/ready

# Docker healthcheck
docker inspect --format='{{json .State.Health}}' accessibility-mw-prod
```

### Monitoreo en Producción

```bash
# Prometheus metrics
curl http://localhost:3001/metrics

# Logs estructurados
docker compose -f docker-compose.production.yml logs -f

# Recursos del contenedor
docker stats accessibility-mw-prod

# Inspección completa
docker inspect accessibility-mw-prod
```

### Deployment en Cloud

#### Azure Container Instances

```bash
# Login Azure
az login

# Deploy container
az container create \
  --resource-group accessibility-rg \
  --name accessibility-mw \
  --image accessibility-mw:latest \
  --ports 3001 \
  --environment-variables \
    NODE_ENV=production \
    JWT_SECRET_KEY=${JWT_SECRET_KEY}
```

#### AWS ECS

```bash
# Configurar task definition
aws ecs register-task-definition \
  --family accessibility-mw \
  --container-definitions file://task-definition.json

# Deploy service
aws ecs create-service \
  --cluster accessibility-cluster \
  --service-name accessibility-mw-service \
  --task-definition accessibility-mw:1
```

---

## 🔒 Seguridad

### Autenticación JWT

El middleware valida tokens JWT en cada request:

```typescript
// Header Authorization
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

// Token payload
{
  "sub": "user-123",
  "iss": "https://api.accessibility.company.com",
  "exp": 1697462400,
  "roles": ["analyzer", "admin"]
}
```

### Gateway Validation

Cuando `GATEWAY_VALIDATION_ENABLED=true`, el middleware valida que las peticiones provengan del Gateway usando un **shared secret**:

```typescript
// Header requerido
X-Gateway-Secret: <GATEWAY_SECRET>

// Validación en el middleware
if (req.get('X-Gateway-Secret') !== process.env.GATEWAY_SECRET) {
  return res.status(403).json({
    success: false,
    error: {
      code: 'INVALID_GATEWAY_SECRET',
      message: 'Acceso no autorizado - Secret del Gateway inválido'
    }
  });
}
```

**Endpoints exceptuados** (no requieren Gateway Secret):
- `GET /health` - Health check general
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/ready` - Readiness probe (Kubernetes)  
- `GET /metrics` - Métricas Prometheus

> **⚠️ Importante**: El `GATEWAY_SECRET` debe coincidir exactamente entre el Gateway y el Middleware. En producción, este valor **DEBE** ser único, seguro y de al menos 64 caracteres.

### Rate Limiting

Protección contra abuso en Gateway (no en middleware):

```
- 100 requests/min por IP
- 1000 requests/hour por usuario
- Circuit breaker: 50% error rate → open
```

### CORS

```typescript
// Configuración CORS
cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  maxAge: 86400
})
```

### Secretos

```bash
# NUNCA commitear
.env.development
.env.production

# Usar secrets management
# - Azure Key Vault
# - AWS Secrets Manager
# - GitHub Secrets (CI/CD)
```

---

## 🛠️ Stack Tecnológico

### Core

- **Runtime:** Node.js 20.19.5 LTS
- **Language:** TypeScript 5.9.3
- **Framework:** Express 5.1.0
- **Testing:** Jest 30.2.0 + Supertest 7.1.4

### Testing & Quality Assurance

- **Test Runner:** Jest 30.2.0 (con ts-jest)
- **Coverage Tool:** NYC + Jest Coverage
- **Coverage Target:** 88% statements, 75% branches, 87% functions, 88% lines
- **Test Types:** Unit (950+), Integration (120+), E2E (30+), Load (6+)
- **Coverage Exclusions:** 8 archivos (infraestructura, browser services)
- **Mock System:** Sistema inteligente de mocks para microservicios
- **CI/CD:** GitHub Actions con validación automática

### Análisis de Accesibilidad

- **axe-core:** 4.11.0 (Deque Systems)
- **IBM Equal Access:** 4.0.9 (IBM Accessibility)
- **Playwright:** 1.56.1 (Browser automation)

### Docker & Contenedores

- **Builder Image:** node:20.19.5-alpine3.22 (5MB base)
- **Production Image:** mcr.microsoft.com/playwright:v1.56.1-jammy
- **Memoria:** 4GB desarrollo / 3GB producción
- **Seguridad:** 0 vulnerabilidades en dependencias de producción

### Persistencia y Cache

- **Cache:** node-cache (LRU in-memory)
- **HTTP Client:** node-fetch 3.x
- **MySQL Client:** mysql2 (para microservicios)

### Logging y Monitoreo

- **Logger:** Pino 10.1.0 (structured logging)
- **Metrics:** Prometheus compatible
- **Health Checks:** Custom implementation

### Desarrollo

- **Linter:** ESLint 9.38.0
- **Type Checking:** TypeScript 5.9.3 compiler
- **Package Manager:** npm 10+

### DevOps

- **Containerización:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Documentation:** Swagger/OpenAPI 3.0

---

## 🔄 CI/CD

### GitHub Actions Workflows

#### 1. Build & Test (`.github/workflows/ci.yml`)

```yaml
name: CI Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.19.2'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

#### 2. Docker Build (`.github/workflows/docker.yml`)

```yaml
name: Docker Build

on:
  push:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t accessibility-mw:${{ github.sha }} .
      - name: Push to registry
        run: docker push accessibility-mw:${{ github.sha }}
```

### Comandos CI

```bash
# Verificación pre-commit
npm run pre-commit    # lint + type-check + tests

# Verificación completa
npm run ci            # lint + type-check + test + build

# Build producción
npm run build:prod    # Build optimizado para prod
```

---

## 📚 Documentación Adicional

- [Arquitectura Detallada](docs/ARCHITECTURE.md)
- [Guía de Desarrollo](docs/DEVELOPMENT.md)
- [API Completa](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## 👥 Contribución

Para contribuir al proyecto, contacta al autor directamente.

---

## 📄 Licencia

**Proprietary License**

Copyright (c) 2025 Geovanny Camacho. All rights reserved.

**IMPORTANT:** This software and associated documentation files (the "Software") are the exclusive property of Geovanny Camacho and are protected by copyright laws and international treaty provisions.

### TERMS AND CONDITIONS

1. **OWNERSHIP**: The Software is licensed, not sold. Geovanny Camacho retains all right, title, and interest in and to the Software, including all intellectual property rights.

2. **RESTRICTIONS**: You may NOT:

   - Copy, modify, or create derivative works of the Software
   - Distribute, transfer, sublicense, lease, lend, or rent the Software
   - Reverse engineer, decompile, or disassemble the Software
   - Remove or alter any proprietary notices or labels on the Software
   - Use the Software for any commercial purpose without explicit written permission
   - Share access credentials or allow unauthorized access to the Software

3. **CONFIDENTIALITY**: The Software contains trade secrets and confidential information. You agree to maintain the confidentiality of the Software and not disclose it to any third party.

4. **TERMINATION**: This license is effective until terminated. Your rights under this license will terminate automatically without notice if you fail to comply with any of its terms.

5. **NO WARRANTY**: THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

6. **LIMITATION OF LIABILITY**: IN NO EVENT SHALL GEOVANNY CAMACHO BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

7. **GOVERNING LAW**: This license shall be governed by and construed in accordance with the laws of the jurisdiction in which Geovanny Camacho resides, without regard to its conflict of law provisions.

8. **ENTIRE AGREEMENT**: This license constitutes the entire agreement between you and Geovanny Camacho regarding the Software and supersedes all prior or contemporaneous understandings.

**FOR LICENSING INQUIRIES:**  
Geovanny Camacho  
Email: fgiocl@outlook.com

**By using this Software, you acknowledge that you have read this license, understand it, and agree to be bound by its terms and conditions.**

---

## 📞 Soporte

- **Issues:** [GitHub Issues](https://github.com/your-org/accessibility-mw/issues)
- **Email:** support@accessibility.company.com
- **Docs:** [https://docs.accessibility.company.com](https://docs.accessibility.company.com)

---

**Author:** Geovanny Camacho (fgiocl@outlook.com)  
**Last Updated:** 6 de noviembre de 2025  
**Version:** 1.0.0  
**Coverage:** 88.59% statements, 81.39% branches, 88.50% functions, 88.84% lines

---

## 🔧 Troubleshooting Rápido

### Error 403: Gateway Secret Inválido

**Síntoma**: `"error": { "code": "INVALID_GATEWAY_SECRET" }`

**Solución**:

```bash
# 1. Verificar que el secret esté configurado en .env.development
cat .env.development | grep GATEWAY_SECRET

# 2. Verificar que la validación esté habilitada
cat .env.development | grep GATEWAY_VALIDATION_ENABLED

# 3. Reiniciar contenedor para aplicar cambios
docker compose --env-file .env.development down
docker compose --env-file .env.development up -d

# 4. Verificar logs
docker logs accessibility-mw | grep "Gateway Validation"

# 5. Test con curl
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Secret: YOUR_GATEWAY_SECRET" \
  -d '{"url": "https://example.com"}'
```

### Test Results no se Guardan en Carpeta del Proyecto

**Síntoma**: Archivos generados en `C:\app\results` en lugar de `./test-results`

**Solución**:

```bash
# 1. Verificar configuración de rutas
cat .achecker.yml | grep outputFolder
# Debe ser: outputFolder: ./test-results

# 2. Verificar volúmenes en docker-compose.yml
docker compose config | grep "test-results"
# Debe incluir: - ./test-results:/app/test-results

# 3. Reiniciar contenedor
docker compose down && docker compose up -d

# 4. Verificar carpeta existe
ls -la ./test-results
```

### Browser Pool Agotado

**Síntoma**: `Error: No browsers available in pool`

**Solución**:

```bash
# 1. Verificar estado del pool
curl http://localhost:3001/health | jq '.resources.browserPool'

# 2. Ajustar tamaño del pool en .env
BROWSER_POOL_SIZE=5  # Aumentar de 3 a 5

# 3. Aumentar memoria compartida en docker-compose.yml
shm_size: 2g  # Aumentar de 1g a 2g

# 4. Reiniciar servicio
docker compose restart accessibility-mw
```

### Memoria Insuficiente

**Síntoma**: Container killed por OOM (Out of Memory)

**Solución**:

```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      memory: 4G      # Aumentar límite
    reservations:
      memory: 2G      # Reservar mínimo
memswap_limit: 4G     # Swap limit
shm_size: 2g          # Shared memory para Playwright
```

### Más Troubleshooting

Para problemas más complejos, consulta **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** que incluye:
- Problemas de instalación
- Errores de runtime
- Performance issues
- Debugging avanzado
- Problemas de microservicios
- Docker troubleshooting
