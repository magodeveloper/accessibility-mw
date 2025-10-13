# 🚀 Accessibility Middleware

[![Node.js](https://img.shields.io/badge/Node.js-20.19.2-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-205%2B-brightgreen)](test-dashboard.html)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)

> **Middleware avanzado de análisis de accesibilidad web desarrollado en Node.js 20 con TypeScript. Orquestador central del ecosistema de accesibilidad digital con integración dual de herramientas (axe-core e IBM Equal Access) y persistencia automática en microservicios .NET.**

> ⚡ **Nota:** Este middleware forma parte de un ecosistema donde el **Gateway** gestiona rate limiting, circuit breaker y load balancing. El middleware se enfoca en análisis de accesibilidad y orquestación de herramientas.

---

## 📋 Descripción

Middleware empresarial para:

- **Análisis dual de accesibilidad** con axe-core 4.10.3 e IBM Equal Access 4.0.8
- **Pool de navegadores optimizado** con Playwright y Chromium reutilizable
- **Sistema de cache inteligente** LRU con TTL configurable y límites de memoria
- **Integración con microservicios** .NET (Analysis, Reports, Users) vía Docker network
- **Persistencia automática** en MySQL a través de APIs especializadas

---

## ✨ Características

### 🔍 Análisis de Accesibilidad

- **Análisis dual integrado** con dos motores (axe-core + IBM Equal Access)
- **Mapeo automático WCAG 2.1/2.2** con criterios A, AA, AAA
- **Procesamiento multi-formato** (URLs, HTML directo, archivos)
- **Análisis promedio en 2.8 segundos** con browser pool optimizado
- **Detección automática** de 138+ reglas de accesibilidad WCAG

### 🏗️ Arquitectura y Rendimiento

- **Pool de navegadores reutilizable** (reduce overhead 70% vs creación on-demand)
- **Sistema de cache LRU** con TTL configurable (300s default)
- **Integración transparente** con microservicios .NET via Docker network
- **Multi-stage Docker** con imágenes optimizadas (builder + runtime)
- **Health checks profundos** de sistema, memoria, dependencias y servicios

### 🛡️ Seguridad y Robustez

- **Rate limiting inteligente** por endpoint (20 req/min análisis, 100 req/min health)
- **Validación exhaustiva** con esquemas Zod para requests/responses
- **Protección SSRF** con lista blanca de dominios permitidos
- **Headers de seguridad** con Helmet.js (CSP, HSTS, X-Frame-Options)
- **Sanitización de URLs** y prevención de ataques de inyección

### 📊 Monitoreo y Observabilidad

- **Métricas Prometheus** en tiempo real (/metrics)
- **Logging estructurado** con Pino (JSON logs, niveles configurables)
- **Health checks** detallados (/health, /health/live, /health/ready)
- **Dashboard de métricas** con estadísticas de uso y performance
- **Bundle monitoring** con alertas de tamaño

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🚀 ACCESSIBILITY MIDDLEWARE                      │
│                          (Port 3001)                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Express    │  │  Middleware  │  │   Routes     │            │
│  │   Server     │  │   Pipeline   │  │   (REST)     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│         │                 │                  │                     │
│         └─────────────────┴──────────────────┘                     │
│                           │                                        │
│              ┌────────────▼────────────┐                           │
│              │   ANALYSIS SERVICE      │                           │
│              │  (Orchestrator)         │                           │
│              └────────────┬────────────┘                           │
│                           │                                        │
│         ┌─────────────────┼─────────────────┐                     │
│         │                 │                 │                     │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐               │
│  │  Browser    │  │   Cache     │  │  Mappers    │               │
│  │   Pool      │  │  Service    │  │  (WCAG)     │               │
│  │ (Playwright)│  │   (LRU)     │  │             │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│         │                                │                         │
│         ▼                                ▼                         │
│  ┌─────────────┐              ┌─────────────────┐                 │
│  │  axe-core   │              │ IBM Equal Access│                 │
│  │   4.10.3    │              │     4.0.8       │                 │
│  └─────────────┘              └─────────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │     MICROSERVICIOS .NET (Docker)     │
        │                                      │
        │  ┌────────────┐  ┌────────────┐     │
        │  │ MS-ANALYSIS│  │ MS-REPORTS │     │
        │  │  (8082)    │  │   (8080)   │     │
        │  └─────┬──────┘  └─────┬──────┘     │
        │        │                │            │
        │        └────────┬───────┘            │
        │                 ▼                    │
        │         ┌──────────────┐             │
        │         │  MySQL DB    │             │
        │         │ (analysis_db)│             │
        │         └──────────────┘             │
        └──────────────────────────────────────┘
```

**Capas principales:**

- **API Layer:** Express server, middlewares (auth, rate-limit, error handling)
- **Service Layer:** Analysis orchestration, browser pool, cache management
- **Integration Layer:** Mappers (axe, equal-access), WCAG transformers
- **Tools Layer:** axe-core, IBM Equal Access, Playwright
- **Persistence:** Microservicios .NET (Analysis API, Reports API)

---

## 🚀 Quick Start

### Requisitos

- **Node.js 20.19.2+** (con npm 10+)
- **Docker & Docker Compose** (para microservicios y Playwright)
- **MySQL 8.4+** (para microservicios .NET)
- **Git** para clonar repositorio

### Instalación Local

```bash
# 1. Clonar repositorio
git clone https://github.com/your-org/accessibility-mw.git
cd accessibility-mw

# 2. Instalar dependencias
npm ci

# 3. Configurar variables de entorno
cp .env.template .env
# Editar .env con tus configuraciones

# 4. Compilar TypeScript
npm run build

# 5. Iniciar servicios dependientes (microservicios .NET)
docker compose -f docker-compose.ci.yml up -d mysql-analysis ms-analysis ms-reports

# 6. Ejecutar middleware
npm start

# 7. Verificar funcionamiento
curl http://localhost:3001/health
```

### Uso con Docker Compose (Recomendado)

```bash
# Levantar todos los servicios (middleware + microservicios)
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f accessibility-mw

# Verificar estado de servicios
docker compose ps

# Health check completo
curl http://localhost:3001/health

# Detener servicios
docker compose down
```

### Desarrollo Local

```bash
# Modo desarrollo con hot-reload
npm run dev

# Linting y type-check
npm run lint
npm run type-check

# Tests con watch mode
npm run test:watch
```

### Verificación Rápida

```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Análisis de prueba
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "standards": ["wcag2a", "wcag2aa"],
    "includeScreenshots": false
  }'

# 3. Ver métricas
curl http://localhost:3001/metrics
```

---

## 📡 API Endpoints

### 🔍 Análisis (/api/analyze)

| Método | Endpoint       | Descripción                                 | Rate Limit    |
| ------ | -------------- | ------------------------------------------- | ------------- |
| POST   | `/api/analyze` | Análisis completo de accesibilidad          | 20 req/min    |
| GET    | `/api/analyze` | Documentación Swagger de análisis           | 100 req/min   |

**Request Body (POST /api/analyze):**

```json
{
  "url": "https://example.com",
  "standards": ["wcag2a", "wcag2aa", "wcag2aaa"],
  "includeScreenshots": false,
  "waitForTimeout": 5000,
  "viewportWidth": 1920,
  "viewportHeight": 1080,
  "userAgent": "Mozilla/5.0 (custom)",
  "saveToDatabase": true
}
```

**Response Body (200 OK):**

```json
{
  "success": true,
  "data": {
    "summary": {
      "violations": 12,
      "warnings": 5,
      "passed": 45,
      "incomplete": 2
    },
    "violations": [
      {
        "id": "color-contrast",
        "impact": "serious",
        "description": "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds",
        "help": "Elements must have sufficient color contrast",
        "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
        "wcagLevel": "AA",
        "wcagCriteria": ["1.4.3"],
        "nodes": [
          {
            "html": "<button class=\"btn\">Submit</button>",
            "target": ["button.btn"],
            "message": "Element has insufficient color contrast of 2.59:1 (foreground color: #777777, background color: #ffffff)"
          }
        ]
      }
    ],
    "metadata": {
      "url": "https://example.com",
      "timestamp": "2025-10-13T10:30:45.123Z",
      "duration": 2847,
      "engine": "dual",
      "standards": ["wcag2a", "wcag2aa"]
    }
  }
}
```

### 🏥 Health Checks (/health)

| Método | Endpoint        | Descripción                             | Rate Limit    |
| ------ | --------------- | --------------------------------------- | ------------- |
| GET    | `/health`       | Health check general con detalles       | 100 req/min   |
| GET    | `/health/live`  | Liveness probe (aplicación viva)        | Sin límite    |
| GET    | `/health/ready` | Readiness probe (listo para requests)   | Sin límite    |

**Response Health Check Completo:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-13T10:30:45.123Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "checks": {
    "memory": {
      "status": "healthy",
      "used": 245.67,
      "limit": 2048,
      "percentage": 12.0
    },
    "browserPool": {
      "status": "healthy",
      "available": 1,
      "total": 1
    },
    "cache": {
      "status": "healthy",
      "size": 45,
      "maxSize": 1000
    },
    "dependencies": {
      "analysisApi": {
        "status": "healthy",
        "url": "http://localhost:8082",
        "responseTime": 23
      },
      "reportsApi": {
        "status": "healthy",
        "url": "http://localhost:8080",
        "responseTime": 18
      }
    }
  }
}
```

### 📊 Métricas (/metrics)

| Método | Endpoint   | Descripción                        | Rate Limit    |
| ------ | ---------- | ---------------------------------- | ------------- |
| GET    | `/metrics` | Métricas Prometheus (texto plano)  | 100 req/min   |

**Métricas disponibles:**

- `http_requests_total` - Total de requests HTTP
- `http_request_duration_seconds` - Duración de requests
- `analysis_duration_seconds` - Duración de análisis
- `cache_hit_rate` - Tasa de aciertos de cache
- `browser_pool_utilization` - Utilización del pool de navegadores

### 🎛️ Dashboard (/dashboard)

| Método | Endpoint     | Descripción                        | Rate Limit    |
| ------ | ------------ | ---------------------------------- | ------------- |
| GET    | `/dashboard` | Dashboard HTML con estadísticas    | 100 req/min   |

---

## 🧪 Testing

### Estado de Cobertura

**Estado General:** ✅ 205+ tests exitosos  
**Cobertura Total:** ~85% (líneas cubiertas)

| Categoría              | Tests | Cobertura | Estado |
| ---------------------- | ----- | --------- | ------ |
| **Unit Tests**         | 85+   | 90%       | ✅     |
| **Integration Tests**  | 50+   | 80%       | ✅     |
| **E2E Real Tests**     | 70+   | N/A       | ✅ NEW |

**Métricas detalladas:**

- **Tests unitarios:** Services, middlewares, validators, mappers (con mocks)
- **Tests de integración:** API endpoints, mocks de microservicios
- **Tests E2E reales:** Microservicios .NET reales, MySQL real, flujos completos
- **Tiempo de ejecución:** ~60s para suite completa (con servicios Docker)

### 🔬 Diferencia: Tests con Mocks vs Tests Reales

Este proyecto implementa **DOS estrategias de testing complementarias**:

#### 1️⃣ **Tests con Mocks** (Unit + Integration tradicional)

**Ubicación:** `tests/unit/`, `tests/integration/*.test.ts` (sin prefijo `real-`)

**Características:**
- ✅ **Rápidos**: ~30s para ejecutar todos
- ✅ **No requieren servicios externos**: Corren en cualquier ambiente
- ✅ **Enfocados en lógica**: Validan algoritmos, validaciones, transformaciones
- ✅ **Usan fetch mocks**: `fetchMockManager` intercepta llamadas HTTP

**Ejemplo:**
```typescript
// tests/integration/microservices.integration.test.ts
import { fetchMockManager } from '../mocks/fetchMock';

fetchMockManager.mockEndpoint('/api/analysis', {
  status: 201,
  json: () => Promise.resolve({ data: { id: 456 } })
});

// ❌ NO hace llamada HTTP real - Usa mock
```

**Cuándo usar:**
- Desarrollo local sin Docker
- Tests de lógica de negocio
- CI/CD donde no hay tiempo para levantar servicios
- Validación de manejo de errores

#### 2️⃣ **Tests E2E Reales** (Real Integration Tests) ✨ NUEVO

**Ubicación:** `tests/integration/real-*.test.ts`

**Características:**
- 🔧 **Requieren Docker**: `docker compose -f docker-compose.ci.yml up -d`
- 🗄️ **Base de datos real**: MySQL con datos persistentes
- 🌐 **HTTP real**: Llamadas fetch SIN mocks a microservicios .NET
- ⏱️ **Más lentos**: ~60s (incluye tiempo de conexión y DB)
- ✅ **Validación completa**: Detectan problemas de integración real

**Archivos creados:**
```
tests/integration/
├── real-analysis-api.test.ts       # Tests reales MS-Analysis
├── real-reports-api.test.ts        # Tests reales MS-Reports
└── real-complete-flow.test.ts      # Flujo completo E2E
```

**Ejemplo:**
```typescript
// tests/integration/real-analysis-api.test.ts
const response = await fetch('http://localhost:8082/api/analysis', {
  method: 'POST',
  body: JSON.stringify(analysisPayload)
});

// ✅ Hace llamada HTTP REAL al microservicio
// ✅ Guarda en MySQL REAL
// ✅ Verifica persistencia en DB
```

**Cuándo usar:**
- CI/CD con docker-compose.ci.yml
- Validación antes de deploy a producción
- Tests de integración completa
- Detección de problemas de networking/DB

**Cómo ejecutar tests E2E reales:**

```bash
# 1. Levantar microservicios (primera vez tarda ~40s)
docker compose -f docker-compose.ci.yml up -d

# 2. Esperar a que servicios estén healthy
docker compose -f docker-compose.ci.yml ps

# 3. Correr tests reales
npm test -- tests/integration/real-*.test.ts

# 4. O correr test específico
npm test -- tests/integration/real-analysis-api.test.ts
npm test -- tests/integration/real-reports-api.test.ts
npm test -- tests/integration/real-complete-flow.test.ts

# 5. Ver logs de servicios (si hay errores)
docker compose -f docker-compose.ci.yml logs ms-analysis
docker compose -f docker-compose.ci.yml logs ms-reports

# 6. Limpiar al terminar
docker compose -f docker-compose.ci.yml down -v
```

**Output esperado:**
```
✅ MS-Analysis API is healthy and ready
✅ Analysis created with ID: 123
✅ Data persisted correctly for analysis ID 123
✅ MS-Reports API is healthy and ready
✅ Report created with ID: 456

PASS tests/integration/real-analysis-api.test.ts (25.4s)
  Real E2E - MS Analysis API Integration
    ✓ should create a new analysis record in real MySQL database (1234ms)
    ✓ should retrieve existing analysis by ID (567ms)
    ✓ should maintain data consistency (2345ms)
```

**Comparativa:**

| Aspecto | Tests con Mocks | Tests Reales E2E |
|---------|-----------------|------------------|
| **Velocidad** | ⚡ Rápidos (~30s) | 🐢 Lentos (~60s) |
| **Requisitos** | Node.js | Docker + Microservicios |
| **HTTP calls** | ❌ Mockeadas | ✅ Reales |
| **Base de datos** | ❌ No requiere | ✅ MySQL real |
| **Detecta** | Errores de lógica | Errores de integración |
| **CI/CD** | Siempre corre | Solo con docker-compose.ci.yml |
| **Desarrollo local** | ✅ Sí | ⚠️ Requiere Docker |

**Estrategia recomendada:**
1. **Desarrollo diario**: Correr tests con mocks (`npm test`)
2. **Pre-commit**: Tests con mocks + lint
3. **CI/CD completo**: Tests con mocks + tests reales E2E
4. **Pre-deploy**: Solo tests reales E2E para validar integración

### Comandos de Testing

```bash
# Todos los tests
npm test

# Tests con cobertura completa
npm run test:coverage

# Solo tests unitarios
npm run test -- tests/unit

# Solo tests de integración
npm run test:integration

# Tests en modo watch
npm run test:watch

# Tests en CI (optimizados)
npm run test:ci

# Ver dashboard de tests
.\manage-tests.ps1 full -OpenDashboard
```

### Script PowerShell de Testing

```powershell
# Pipeline completo: tests + cobertura + dashboard
.\manage-tests.ps1 full

# Solo tests unitarios
.\manage-tests.ps1 test -Type unit

# Tests con cobertura y abrir navegador
.\manage-tests.ps1 coverage -OpenDashboard

# Limpiar archivos de test
.\manage-tests.ps1 clean

# Ver ayuda detallada
.\manage-tests.ps1 help
```

### Categorías de Tests

**Unit Tests (tests/unit/):**

- ✅ Analysis service con mocks
- ✅ Browser pool lifecycle
- ✅ Cache service (LRU, TTL, limits)
- ✅ Middlewares (auth, rate-limit, error handling)
- ✅ Validators y schemas Zod
- ✅ WCAG mappers (axe-core, equal-access)

**Integration Tests (tests/integration/):**

- ✅ API endpoints con servicios reales
- ✅ Microservicios .NET (Analysis, Reports)
- ✅ Health checks completos
- ✅ Playwright browser automation
- ✅ Cache con datos reales
- ✅ Error handling end-to-end

**E2E Tests (tests/e2e/):**

- 🔄 Flujos completos de análisis
- 🔄 Persistencia en microservicios
- 🔄 Screenshots y reportes

---

## 🐳 Docker & Deployment

### Dockerfile Multi-Stage

El proyecto utiliza un **Dockerfile multi-stage** optimizado:

**Stage 1 (builder):** Compila TypeScript con todas las dependencias  
**Stage 2 (runtime):** Imagen ligera con solo dependencias de producción + Playwright

```dockerfile
# Compilación completa
FROM node:20.19.2-alpine3.20 AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY package*.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts
COPY . .
RUN npm run build
RUN rm -rf node_modules && npm ci --omit=dev

# Runtime optimizado
FROM mcr.microsoft.com/playwright:v1.55.0-jammy
WORKDIR /app
ENV NODE_ENV=production NODE_OPTIONS="--max-old-space-size=2048"
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health/live'...)"
CMD ["node", "dist/server.js"]
```

### Docker Compose

**Archivo principal: docker-compose.yml**

```yaml
services:
  accessibility-mw:
    build:
      context: .
      dockerfile: Dockerfile
    image: accessibility-mw:production
    container_name: accessibility-mw-prod
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - ANALYSIS_API_URL=http://host.docker.internal:8082
      - NODE_OPTIONS=--max-old-space-size=2048
    restart: unless-stopped
    shm_size: "2g"
    deploy:
      resources:
        limits:
          memory: 3G
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get(...)"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "prometheus.scrape=true"
      - "prometheus.port=3001"
      - "service.name=accessibility-middleware"
```

### Docker Commands

```bash
# Build image
docker build -t accessibility-mw:latest .

# Run standalone
docker run -d \
  --name accessibility-mw \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e ANALYSIS_API_URL=http://host.docker.internal:8082 \
  --shm-size=2g \
  accessibility-mw:latest

# Ver logs
docker logs -f accessibility-mw

# Exec shell
docker exec -it accessibility-mw /bin/bash

# Stats en tiempo real
docker stats accessibility-mw
```

### Compose Files Disponibles

| Archivo                     | Propósito                            | Servicios                           |
| --------------------------- | ------------------------------------ | ----------------------------------- |
| `docker-compose.yml`        | Único archivo (dev/prod con .env)   | accessibility-mw                    |
| `docker-compose.ci.yml`     | CI/CD con microservicios             | mw + ms-analysis + ms-reports + dbs |

```bash
# Desarrollo (usa .env.development)
docker compose --env-file .env.development up

# Producción (usa .env.production)
docker compose --env-file .env.production up -d

# CI/CD (tests de integración)
docker compose -f docker-compose.ci.yml up -d
```

#### ✨ Ventajas del Archivo Unificado

Siguiendo el patrón de los microservicios .NET, consolidamos en un solo `docker-compose.yml`:

- ✅ **Prometheus en todos los entornos**: Las métricas siempre están disponibles
- ✅ **Variables configurables**: Usa `.env.development` o `.env.production`
- ✅ **Menos mantenimiento**: Un solo archivo, sin duplicación
- ✅ **Consistencia garantizada**: Misma configuración base para dev/prod
- ✅ **Alineación con .NET**: Mismo patrón que ms-users, ms-analysis, ms-reports

---

## ⚙️ Configuración

### Variables de Entorno

**Archivo: .env (copiar de .env.template)**

```bash
# ============================================================================
# CONFIGURACIÓN PRINCIPAL
# ============================================================================
NODE_ENV=production                          # development | production | test
PORT=3001                                    # Puerto del servidor
LOG_LEVEL=info                               # trace | debug | info | warn | error

# ============================================================================
# MICROSERVICIOS .NET
# ============================================================================
ANALYSIS_API_URL=http://localhost:8082       # Local: localhost:8082, Docker: host.docker.internal:8082
REPORTS_API_URL=http://localhost:8080        # Microservicio de reportes
USERS_API_URL=http://localhost:8081          # Microservicio de usuarios

# ============================================================================
# BROWSER POOL CONFIGURATION
# ============================================================================
BROWSER_POOL_MIN=1                           # Mínimo de navegadores en pool
BROWSER_POOL_MAX=3                           # Máximo de navegadores en pool
BROWSER_TIMEOUT=30000                        # Timeout de navegador (ms)
BROWSER_HEADLESS=true                        # Modo headless (true | false)

# ============================================================================
# CACHE CONFIGURATION
# ============================================================================
CACHE_ENABLED=true                           # Habilitar cache LRU
CACHE_TTL=300                                # TTL en segundos (5 min default)
CACHE_MAX_SIZE=1000                          # Máximo de entradas en cache
CACHE_CHECK_PERIOD=60                        # Frecuencia de limpieza (segundos)

# ============================================================================
# RATE LIMITING
# ============================================================================
RATE_LIMIT_WINDOW_MS=60000                   # Ventana de rate limit (1 min)
RATE_LIMIT_MAX_REQUESTS=20                   # Máximo de requests por ventana (análisis)
RATE_LIMIT_HEALTH_MAX=100                    # Máximo requests health checks

# ============================================================================
# ANÁLISIS CONFIGURATION
# ============================================================================
ANALYSIS_DEFAULT_TIMEOUT=30000               # Timeout default análisis (ms)
ANALYSIS_MAX_CONCURRENT=3                    # Máximo análisis concurrentes
ANALYSIS_SCREENSHOT_ENABLED=false            # Capturar screenshots por default
ANALYSIS_VIEWPORT_WIDTH=1920                 # Ancho viewport default
ANALYSIS_VIEWPORT_HEIGHT=1080                # Alto viewport default

# ============================================================================
# SECURITY
# ============================================================================
ALLOWED_DOMAINS=example.com,test.com         # Dominios permitidos (SSRF protection)
JWT_SECRET=your-super-secret-key-here        # Secret para JWT (si aplica)
HELMET_CSP_ENABLED=true                      # Content Security Policy

# ============================================================================
# MONITORING & METRICS
# ============================================================================
METRICS_ENABLED=true                         # Habilitar métricas Prometheus
METRICS_PORT=3001                            # Puerto de métricas (mismo que app)
HEALTH_CHECK_INTERVAL=30000                  # Intervalo health checks (ms)

# ============================================================================
# LOGGING
# ============================================================================
LOG_PRETTY_PRINT=false                       # Pretty print logs (dev only)
LOG_FILE_ENABLED=false                       # Guardar logs en archivo
LOG_FILE_PATH=./logs/app.log                 # Path de archivo de logs
```

### Configuración Avanzada

**Archivo: src/config/app.config.ts**

```typescript
export const config = {
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
  },
  browserPool: {
    min: parseInt(process.env.BROWSER_POOL_MIN || '1'),
    max: parseInt(process.env.BROWSER_POOL_MAX || '3'),
    timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000'),
    headless: process.env.BROWSER_HEADLESS === 'true',
  },
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '300'),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
  },
  analysis: {
    timeout: parseInt(process.env.ANALYSIS_DEFAULT_TIMEOUT || '30000'),
    maxConcurrent: parseInt(process.env.ANALYSIS_MAX_CONCURRENT || '3'),
  },
};
```

---

## 🛠️ Stack Tecnológico

### Runtime & Core

- **Node.js:** 20.19.2 LTS (runtime JavaScript)
- **TypeScript:** 5.x (lenguaje tipado)
- **Express:** 5.1.0 (framework web)
- **Playwright:** 1.55.0 (automatización de navegadores)

### Análisis de Accesibilidad

- **axe-core:** 4.10.3 (motor de análisis primario)
- **IBM Equal Access:** 4.0.8 (motor complementario)
- **WCAG Mapping:** Implementación custom 2.1/2.2

### Base de Datos & Persistencia

- **MySQL:** 8.4 (vía microservicios .NET)
- **Integration:** APIs REST (Analysis, Reports, Users)

### Testing & Quality

- **Jest:** 29.x (framework de testing)
- **Supertest:** 7.x (testing HTTP)
- **Coverlet:** Reporte de cobertura
- **ESLint:** 9.x (linting)
- **Prettier:** 3.x (formatting)

### Seguridad & Middleware

- **Helmet:** 8.1.0 (security headers)
- **express-rate-limit:** 8.1.0 (rate limiting)
- **Zod:** 3.x (validación de schemas)
- **jsonwebtoken:** 9.x (JWT authentication)

### Logging & Monitoring

- **Pino:** 10.x (logging estructurado)
- **Prometheus:** Client para métricas
- **Custom Dashboard:** HTML + JavaScript

### DevOps & Containerization

- **Docker:** Multi-stage builds
- **Docker Compose:** Orquestación de servicios
- **GitHub Actions:** CI/CD pipelines

---

## 📂 Estructura del Proyecto

```
accessibility-mw/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # CI/CD pipeline (255 líneas, 5 jobs)
│   │   └── security-audit.yml        # Security scanning (116 líneas, 4 jobs)
│   └── dependabot.yml                # Dependabot configuration
├── src/
│   ├── config/                       # Configuración
│   │   ├── app.config.ts             # Config principal
│   │   ├── security.config.ts        # Config de seguridad
│   │   └── monitoring.config.ts      # Config de métricas
│   ├── middlewares/                  # Express middlewares
│   │   ├── auth.middleware.ts        # Autenticación JWT
│   │   ├── rate-limit.middleware.ts  # Rate limiting
│   │   ├── error.middleware.ts       # Error handling
│   │   └── request-id.middleware.ts  # Request tracking
│   ├── routes/                       # API routes
│   │   ├── analyze.route.ts          # Endpoint de análisis
│   │   ├── health.route.ts           # Health checks
│   │   └── metrics.route.ts          # Prometheus metrics
│   ├── services/                     # Business logic
│   │   ├── analysis.service.ts       # Orquestador de análisis
│   │   ├── browser-pool.service.ts   # Pool de navegadores
│   │   ├── cache.service.ts          # Sistema de cache LRU
│   │   └── logging.service.ts        # Logging estructurado
│   ├── schemas/                      # Validaciones Zod
│   │   ├── analysis.schema.ts        # Schemas análisis
│   │   └── config.schema.ts          # Schemas config
│   ├── utils/                        # Utilidades
│   │   ├── wcag-mapping.ts           # Mapeo WCAG automático
│   │   ├── validators.ts             # Validadores custom
│   │   └── transformers.ts           # Transformadores de datos
│   ├── mappers/                      # Data mappers
│   │   ├── axe-mapper.ts             # Mapeo axe-core
│   │   └── equal-access-mapper.ts    # Mapeo IBM Equal Access
│   └── server.ts                     # Entry point
├── tests/
│   ├── unit/                         # Tests unitarios (85+)
│   ├── integration/                  # Tests integración (120+)
│   ├── helpers/                      # Test utilities
│   └── setup.ts                      # Config global tests
├── scripts/
│   ├── setup-test-dirs.sh            # Setup directorios de test
│   ├── wait-for-services.sh          # Espera servicios Docker
│   └── bundle-monitor.js             # Monitoreo de bundle
├── config/                           # Configuraciones externas
├── docker-compose.yml                # Compose único (dev/prod con .env)
├── docker-compose.ci.yml             # Compose CI/CD
├── Dockerfile                        # Multi-stage Docker build
├── .env.development                  # Variables desarrollo
├── .env.production                   # Variables producción
├── .env.template                     # Template de variables
├── jest.config.js                    # Config Jest principal
├── jest.ci.config.js                 # Config Jest CI
├── jest.coverage.config.js           # Config cobertura
├── tsconfig.json                     # Config TypeScript
├── eslint.config.js                  # Config ESLint
├── manage-tests.ps1                  # Script PowerShell testing (1240 líneas)
├── manage.ps1                        # Script gestión general
└── README.md                         # Este archivo
```

---

## 🔧 Scripts de Gestión

### manage-tests.ps1

Script PowerShell completo para gestión de tests y dashboards:

```powershell
# Pipeline completo
.\manage-tests.ps1 full

# Solo tests (sin cobertura)
.\manage-tests.ps1 test

# Tests unitarios
.\manage-tests.ps1 test -Type unit

# Tests de integración
.\manage-tests.ps1 test -Type integration

# Cobertura completa
.\manage-tests.ps1 coverage

# Abrir dashboard automáticamente
.\manage-tests.ps1 coverage -OpenDashboard

# Limpiar archivos de test
.\manage-tests.ps1 clean

# Ayuda detallada
.\manage-tests.ps1 help
```

**Características:**

- ✅ Tests unitarios, integración y E2E
- ✅ Generación de cobertura con reportes HTML
- ✅ Dashboard dinámico con métricas en tiempo real
- ✅ Output con colores y emojis
- ✅ Detección automática de errores
- ✅ Limpieza de archivos temporales

### NPM Scripts

```bash
# Build & Development
npm run build              # Compilar TypeScript
npm run dev                # Desarrollo con ts-node
npm start                  # Producción (requiere build previo)
npm run clean              # Limpiar dist/

# Code Quality
npm run lint               # Linting con ESLint
npm run lint:fix           # Fix automático de lint
npm run type-check         # Type checking sin build

# Testing
npm test                   # Tests completos
npm run test:ci            # Tests optimizados para CI
npm run test:coverage      # Tests con cobertura
npm run test:integration   # Solo integración
npm run test:watch         # Watch mode

# Docker
npm run docker:build       # Build imagen Docker
npm run docker:run         # Run contenedor

# Monitoring
npm run bundle:monitor     # Monitoreo de bundle size
npm run bundle:check       # Check límites de bundle
```

---

## 🚦 CI/CD Pipeline

### GitHub Actions Workflows

#### ci.yml - Pipeline Principal (255 líneas, 5 jobs)

**Triggers:**
- Push a `master`/`main`
- Pull requests
- Schedule semanal (lunes 06:00 UTC)
- Manual dispatch

**Jobs:**

1. **build-and-quality** (15 min)
   - Setup Node.js 20 con npm cache
   - Install dependencies (`npm ci`)
   - Build TypeScript
   - Lint code
   - Type check

2. **test-unit** (15 min)
   - Tests unitarios con Jest
   - Cobertura de código
   - Upload a Codecov
   - Configuración optimizada (2 workers, heap usage)

3. **test-integration** (20 min)
   - Login a GHCR para imágenes privadas
   - Levantar microservicios .NET (MySQL + Analysis + Reports)
   - Cache Playwright browsers
   - Tests de integración con servicios reales
   - Cleanup automático

4. **docker-build-test** (15 min)
   - Build imagen Docker multi-stage
   - Health check del contenedor
   - Smoke tests básicos
   - Upload logs si falla

5. **ci-summary** (siempre ejecuta)
   - Resumen de todos los jobs
   - Estado de pipeline

**Optimizaciones:**
- ✅ Sin artifacts (no usados)
- ✅ Sin build cache (nunca hits)
- ✅ Setup directories con script reutilizable
- ✅ Summary simple (6 líneas vs 47 antes)

#### security-audit.yml - Security Scanning (116 líneas, 4 jobs)

**Triggers:**
- Push a `master`/`main`
- Pull requests
- Schedule diario (02:00 UTC)
- Manual dispatch

**Jobs:**

1. **npm-audit** - Auditoría NPM
2. **trivy-image-scan** - Escaneo de imagen Docker
3. **dependency-review** - Revisión de dependencias (solo PRs)
4. **security-summary** - Resumen de seguridad

---

## 🔒 Seguridad

### Protecciones Implementadas

#### Rate Limiting

```typescript
// Límites por endpoint
const analyzeRateLimit = rateLimit({
  windowMs: 60000,        // 1 minuto
  max: 20,                // 20 requests por minuto
  message: 'Too many analysis requests'
});

const healthRateLimit = rateLimit({
  windowMs: 60000,
  max: 100,               // 100 requests por minuto
  standardHeaders: true
});
```

#### Security Headers (Helmet.js)

- ✅ Content-Security-Policy (CSP)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Strict-Transport-Security (HSTS)
- ✅ X-XSS-Protection

#### SSRF Protection

```typescript
// Whitelist de dominios permitidos
const allowedDomains = [
  'example.com',
  'test.com',
  'localhost'
];

// Validación de URLs
function validateUrl(url: string): boolean {
  const parsed = new URL(url);
  return allowedDomains.some(domain => 
    parsed.hostname.endsWith(domain)
  );
}
```

#### Input Validation (Zod)

```typescript
const AnalysisRequestSchema = z.object({
  url: z.string().url(),
  standards: z.array(z.enum(['wcag2a', 'wcag2aa', 'wcag2aaa'])),
  includeScreenshots: z.boolean().optional(),
  waitForTimeout: z.number().min(0).max(60000).optional()
});
```

### Auditorías de Seguridad

```bash
# Auditoría NPM (vulnerabilidades conocidas)
npm audit

# Auditoría con fix automático
npm audit fix

# Escaneo Docker con Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image accessibility-mw:latest

# Workflow automatizado
# Ejecuta diariamente en .github/workflows/security-audit.yml
```

---

## 📈 Monitoreo y Métricas

### Métricas Prometheus

**Endpoint:** `GET /metrics`

```prometheus
# Request metrics
http_requests_total{method="POST",route="/api/analyze",status="200"} 1543
http_request_duration_seconds{route="/api/analyze"} 2.847

# Analysis metrics
analysis_total{engine="dual",status="success"} 1234
analysis_duration_seconds{engine="axe-core"} 1.432
analysis_duration_seconds{engine="equal-access"} 1.415

# Cache metrics
cache_hit_total 456
cache_miss_total 123
cache_hit_rate 0.787

# Browser pool metrics
browser_pool_size 1
browser_pool_active 0
browser_pool_utilization 0.0

# System metrics
process_cpu_user_seconds_total 45.32
process_resident_memory_bytes 256000000
nodejs_heap_size_used_bytes 123456789
```

### Health Checks

**Liveness Probe:** `/health/live`
- Verifica que la aplicación está viva
- Responde 200 si el proceso Node.js está ejecutando

**Readiness Probe:** `/health/ready`
- Verifica que la aplicación puede recibir tráfico
- Chequea browser pool, cache, conexiones a microservicios

**Health Check Completo:** `/health`
- Métricas detalladas de sistema
- Estado de dependencias (Analysis API, Reports API)
- Uso de memoria, CPU, cache
- Estado del browser pool

### Dashboard de Métricas

Acceso: `http://localhost:3001/dashboard`

**Incluye:**
- 📊 Gráficos de uso en tiempo real
- 🔄 Estadísticas de análisis (total, exitosos, fallidos)
- 💾 Estado de cache (hit rate, tamaño)
- 🌐 Estado de browser pool
- ⏱️ Tiempos de respuesta promedio
- 📈 Métricas de últimas 24 horas

---

## 🤝 Contribución y Desarrollo

### Flujo de Trabajo

1. **Fork** del repositorio
2. **Crear branch** de feature (`git checkout -b feature/amazing-feature`)
3. **Commit cambios** (`git commit -m 'feat: add amazing feature'`)
4. **Push** a branch (`git push origin feature/amazing-feature`)
5. **Abrir Pull Request**

### Convenciones de Código

**Commits (Conventional Commits):**

```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formato, punto y coma, etc
refactor: refactorización de código
test: añadir tests
chore: mantenimiento, dependencias
```

**Código:**

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Mínimo 80% cobertura para nuevas features
- ✅ Tests para todas las funciones públicas
- ✅ Documentación JSDoc para APIs públicas

### Pre-commit Checks

```bash
# Antes de commit, ejecutar:
npm run lint          # Verificar linting
npm run type-check    # Verificar tipos
npm test              # Ejecutar tests
```

---

## 📚 Referencias y Enlaces

### Documentación

- [Node.js Documentation](https://nodejs.org/docs/latest-v20.x/api/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [IBM Equal Access](https://github.com/IBMa/equal-access)

### Estándares WCAG

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Understanding WCAG](https://www.w3.org/WAI/WCAG21/Understanding/)

### Herramientas

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Zod Documentation](https://zod.dev/)
- [Prometheus Node.js Client](https://github.com/siimon/prom-client)

---

## 📞 Soporte y Contacto

### Mantenedor

**Geovanny Camacho**  
📧 Email: fgiocl@outlook.com  
🐙 GitHub: [@magodeveloper](https://github.com/magodeveloper)

### Reporte de Issues

Para reportar bugs o solicitar features:

1. Verificar que no exista un issue similar
2. Crear nuevo issue con template correspondiente
3. Incluir logs, screenshots y pasos para reproducir
4. Etiquetar apropiadamente (bug, enhancement, question)

### FAQ

**Q: ¿Por qué el análisis tarda más de 10 segundos?**  
A: Posible causa: timeout de red, página compleja, microservicios lentos. Verificar logs y health checks.

**Q: ¿Cómo aumentar el pool de navegadores?**  
A: Configurar `BROWSER_POOL_MAX` en `.env`. Considerar recursos disponibles (memoria).

**Q: ¿Puedo usar el middleware sin Docker?**  
A: Sí, pero requiere instalar Playwright y tener microservicios .NET corriendo localmente.

**Q: ¿Cómo desactivar el cache?**  
A: Configurar `CACHE_ENABLED=false` en `.env`.

**Q: ¿El middleware guarda datos personales?**  
A: No. Solo analiza contenido público y guarda resultados de accesibilidad (sin datos personales).

---

## 📜 License

**Proprietary Software License v1.0**

Copyright © 2025 Geovanny Camacho. All rights reserved.

**IMPORTANT:** This software and associated documentation files (the "Software") are the exclusive property of Geovanny Camacho and are protected by copyright laws and international treaty provisions.

### TERMS AND CONDITIONS

1. **OWNERSHIP**: The Software is licensed, not sold. Geovanny Camacho retains all right, title, and interest in and to the Software.

2. **RESTRICTIONS**: You may NOT copy, modify, distribute, sublicense, or reverse engineer the Software without explicit written permission.

3. **CONFIDENTIALITY**: The Software contains trade secrets. You agree to maintain confidentiality and not disclose to third parties.

4. **TERMINATION**: This license terminates automatically if you fail to comply with any terms.

5. **NO WARRANTY**: THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

6. **LIMITATION OF LIABILITY**: IN NO EVENT SHALL GEOVANNY CAMACHO BE LIABLE FOR ANY DAMAGES ARISING FROM THE SOFTWARE.

**FOR LICENSING INQUIRIES:** fgiocl@outlook.com

---

**Last Update:** 13/10/2025  
**Version:** 1.0.0  
**Author:** Geovanny Camacho
