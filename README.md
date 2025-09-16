# 🚀 accessibility-mw

## 📋 Descripción del Proyecto

**accessibility-mw** es un middleware avanzado de análisis de accesibilidad web desarrollado en **Node.js 20** con **TypeScript**. Actúa como orquestador central del ecosistema de accesibilidad digital, proporcionando análisis integral mediante la integración de múltiples herramientas de accesibilidad (**axe-core** e **IBM Equal Access**) con persistencia automática en microservicios .NET.

El middleware implementa un **pool de navegadores optimizado**, **sistema de cache inteligente**, **análisis dual de herramientas** y **integración completa** con el ecosistema de microservicios para proporcionar análisis de accesibilidad de nivel empresarial.

## ⭐ Características Principales

### 🔍 Análisis de Accesibilidad Avanzado
- **Análisis dual integrado** con axe-core 4.10.3 e IBM Equal Access 4.0.8
- **Mapeo automático WCAG 2.1/2.2** con criterios A, AA, AAA
- **Procesamiento multi-formato** (URLs, HTML directo, archivos)
- **Análisis promedio en 2.8 segundos** con browser pool optimizado

### 🏗️ Arquitectura y Rendimiento
- **Pool de navegadores reutilizable** con Playwright y Chromium
- **Sistema de cache LRU** con TTL configurable y límites de memoria
- **Integración transparente** con microservicios .NET via Docker network
- **Persistencia automática** en MySQL a través de APIs especializadas

### 🛡️ Seguridad y Robustez
- **Rate limiting inteligente** con límites por endpoint
- **Validación exhaustiva** con esquemas Zod
- **Protección SSRF** y sanitización de URLs
- **Headers de seguridad** con Helmet.js y CSP

### � Monitoreo y Observabilidad
- **Health checks profundos** del sistema y dependencias
- **Métricas Prometheus** en tiempo real
- **Logging estructurado** con Pino
- **Dashboard de bundle monitoring** integrado

---

## � **Índice de Navegación**

<div align="center">

| 🏗️ [Arquitectura](#-arquitectura-del-sistema) | 🚀 [Inicio Rápido](#-inicio-rápido) | ⚙️ [Configuración](#-configuración-avanzada) | 📋 [API](#-api-endpoints) |
|:---:|:---:|:---:|:---:|
| 🐳 [Docker](#-docker-y-containerización) | 🧪 [Testing](#-testing-y-calidad-de-código) | 📊 [Monitoreo](#-sistema-de-métricas-y-monitoreo) | 🔒 [Seguridad](#-security-audit-system) |
| 🛠️ [Gestión](#-sistema-de-automatización---manageps1) | 🤝 [Contribución](#-contribución-y-desarrollo) | 📚 [Referencias](#-referencias-y-enlaces-útiles) | 📞 [Soporte](#-soporte-y-contacto) |

</div>

---

## 📁 **Estructura del Proyecto**

```
🏗️ accessibility-mw/                          # Middleware principal de análisis
├── 📂 src/                                    # Código fuente TypeScript
│   ├── 📂 config/                            # Configuración de aplicación
│   │   ├── ⚙️  app.config.ts                # Configuración principal
│   │   ├── 🔒 security.config.ts            # Configuración de seguridad
│   │   └── 📊 monitoring.config.ts          # Configuración de métricas
│   ├── 📂 locales/                          # Internacionalización (i18n)
│   │   ├── 🌐 es.json                       # Localización español
│   │   └── 🌐 en.json                       # Localización inglés
│   ├── 📂 middlewares/                      # Middlewares Express
│   │   ├── 🛡️  auth.middleware.ts           # Autenticación y autorización
│   │   ├── 📊 rate-limit.middleware.ts      # Control de rate limiting
│   │   ├── 🔍 request-id.middleware.ts      # Tracking de requests
│   │   └── 🚨 error.middleware.ts           # Manejo centralizado de errores
│   ├── 📂 routes/                           # Rutas API REST
│   │   ├── 🔍 analyze.route.ts              # Endpoint principal de análisis
│   │   ├── 🏥 health.route.ts               # Health checks y diagnósticos
│   │   ├── 📊 monitoring.route.ts           # Métricas y dashboard
│   │   └── 📦 bundle.route.js               # Bundle monitoring dashboard
│   ├── 📂 services/                         # Lógica de negocio
│   │   ├── 🌐 browser-pool.service.ts       # Gestión pool de navegadores
│   │   ├── 💾 cache.service.ts              # Sistema cache LRU
│   │   ├── 🔍 analysis.service.ts           # Orquestación análisis
│   │   ├── 📊 metrics.service.ts            # Métricas y performance
│   │   └── 📝 logging.service.ts            # Logging estructurado
│   ├── 📂 schemas/                          # Validaciones Zod
│   │   ├── 📝 analysis.schema.ts            # Esquemas requests/responses
│   │   └── ⚙️  config.schema.ts             # Validación configuración
│   ├── 📂 utils/                            # Utilidades y helpers
│   │   ├── 🎯 wcag-mapping.ts               # Mapeo automático WCAG
│   │   ├── 🔍 validators.ts                 # Validadores personalizados
│   │   └── 🔄 transformers.ts               # Transformación de datos
│   ├── 📂 mappers/                          # Transformadores de datos
│   │   ├── 🔧 axe-mapper.ts                 # Mapeo resultados axe-core
│   │   └── 🔧 equal-access-mapper.ts        # Mapeo IBM Equal Access
│   ├── 🚀 server.ts                         # Servidor principal Express
│   └── 📚 swagger.ts                        # Documentación OpenAPI/Swagger
├── 📂 tests/                                # Suite completa de pruebas
│   ├── 📂 unit/                             # Tests unitarios (85+ tests)
│   ├── 📂 integration/                      # Tests integración (120+ tests)
│   ├── 📂 helpers/                          # Utilidades para testing
│   └── ⚙️  setup.ts                         # Configuración global tests
├── 📂 scripts/                              # Scripts de utilidad
│   ├── 📦 bundle-monitor.js                 # Monitoreo automático bundle
│   ├── 🏥 health-check.mjs                  # Utilities health checks
│   └── 📊 check-status.js                   # Verificación microservicios
├── 📂 .github/workflows/                    # CI/CD automatizado
## ⚙️ Stack Tecnológico

### 🛠️ Backend y Runtime
- **Node.js**: 20+ (LTS) con soporte ES2023
- **TypeScript**: 5.9 con strict mode y decorators
- **Express**: 5.1 con middleware de seguridad avanzado
- **Playwright**: 1.55.0 para automatización de navegadores

### � Herramientas de Análisis
- **axe-core**: 4.10.3 - Análisis estándar de accesibilidad
- **IBM Equal Access**: 4.0.8 - Validación avanzada WCAG
- **WCAG-to-ACT**: Mapeo automático de criterios

### �️ Base de Datos y Persistencia
- **MySQL**: 8.4 con optimizaciones InnoDB
- **Redis**: Cache distribuido y sesiones (futuro)
- **Sequelize**: ORM con migraciones automáticas

### 🧪 Testing y Calidad
- **Jest**: 29.7 con soporte TypeScript nativo
- **Supertest**: Testing de APIs HTTP
- **@playwright/test**: Testing E2E
- **MSW**: Mock Service Worker para testing

### �️ Seguridad y Validación
- **Helmet**: Headers de seguridad HTTP
- **express-rate-limit**: Rate limiting inteligente
- **zod**: Validación de esquemas TypeScript-first
- **bcrypt**: Hashing seguro de contraseñas

### 📊 Monitoreo y Observabilidad
- **Pino**: Logging estructurado de alto rendimiento
- **Prometheus**: Métricas de sistema y aplicación
- **Winston**: Logging para debugging (desarrollo)

### 🐳 DevOps y Deployment
- **Docker**: Multi-stage builds optimizados
- **Docker Compose**: Orquestación de microservicios
- **GitHub Actions**: CI/CD con análisis de seguridad
- **ESLint**: Linting con reglas TypeScript strict

## 🏗️ Arquitectura del Sistema

### 🌐 Diagrama de Microservicios

```mermaid
graph TB
    subgraph "🌐 Frontend Layer"
        UI[accessibility-ui<br/>React + Vite<br/>Puerto 3000]
    end
    
    subgraph "🚀 Middleware Layer"
        MW[accessibility-mw<br/>Node.js + TypeScript<br/>Puerto 3001]
        BP[Browser Pool<br/>Playwright + Chromium]
        CACHE[LRU Cache<br/>500MB TTL]
    end
    
    subgraph "🔧 Analysis Engine"
        AXE[axe-core 4.10.3<br/>WCAG Scanner]
        IBMEQ[IBM Equal Access 4.0.8<br/>Advanced Validator]
        PROC[Result Processor<br/>WCAG Mapping]
    end
    
    subgraph "🚪 Gateway Layer"
        GW[accessibility-gw<br/>YARP + .NET 9<br/>Puerto 8080]
        AUTH[JWT Authentication<br/>Rate Limiting]
    end
    
    subgraph "🎯 Microservices (.NET 9)"
        MS1[accessibility-ms-analysis<br/>Puerto 8082]
        MS2[accessibility-ms-users<br/>Puerto 8081]
        MS3[accessibility-ms-reports<br/>Puerto 8083]
    end
    
    subgraph "🗄️ Database Layer"
        DB1[(Analysis DB<br/>MySQL 8.4)]
        DB2[(Users DB<br/>MySQL 8.4)]
        DB3[(Reports DB<br/>MySQL 8.4)]
    end
    
    subgraph "🌐 Infrastructure"
        NET[Docker Network<br/>accessibility-shared<br/>172.22.0.0/16]
        METRICS[Prometheus Metrics<br/>Health Monitoring]
    end
    
    UI --> MW
    MW --> BP
    MW --> CACHE
    BP --> AXE
    BP --> IBMEQ
    AXE --> PROC
    IBMEQ --> PROC
    MW --> GW
    GW --> AUTH
    GW --> MS1
    GW --> MS2
    GW --> MS3
    MS1 --> DB1
    MS2 --> DB2
    MS3 --> DB3
    
    MW -.-> NET
    GW -.-> NET
    MS1 -.-> NET
    MS2 -.-> NET
    MS3 -.-> NET
    
    MW --> METRICS
    GW --> METRICS
    MS1 --> METRICS
    MS2 --> METRICS
    MS3 --> METRICS
```

### 🔄 Flujo de Análisis de Accesibilidad

```mermaid
sequenceDiagram
    participant UI as 🌐 UI Client
    participant MW as 🚀 Middleware
    participant CACHE as 💾 Cache LRU
    participant POOL as 🌐 Browser Pool
    participant AXE as 🔧 axe-core
    participant IBM as 🔧 IBM Equal Access
    participant MS as 🎯 Analysis MS
    participant DB as 🗄️ MySQL DB
    
    UI->>MW: POST /analyze {url, options}
    MW->>MW: 🛡️ Validate input & security
    MW->>CACHE: 🔍 Check cache hit
    
    alt Cache Hit
        CACHE-->>MW: ✅ Return cached result
        MW-->>UI: 📊 Return analysis result
    else Cache Miss
        MW->>POOL: 🌐 Get available browser
        POOL-->>MW: ✅ Browser instance ready
        
        par Dual Analysis
            MW->>AXE: 🔧 Run axe-core analysis
            AXE-->>MW: 📋 axe results
        and
            MW->>IBM: 🔧 Run Equal Access scan
            IBM-->>MW: 📋 IBM results
        end
        
        MW->>MW: 🔄 Merge & process results
        MW->>CACHE: 💾 Store in cache (TTL)
        MW->>MS: 📤 Persist to database
        MS->>DB: 💾 Save analysis record
        DB-->>MS: ✅ Confirmation
        MW->>POOL: 🔄 Return browser to pool
        MW-->>UI: 📊 Return analysis result
    end
```
## 🚀 Instalación y Configuración

### 📋 Prerrequisitos

#### Sistema Base
- **Node.js**: 20+ (LTS recomendado)
- **Docker**: 24.0+ con Docker Compose
- **Git**: Para clonar repositorios
- **PowerShell**: 7.0+ (para scripts de gestión)

#### Recursos del Sistema
- **RAM**: 8GB mínimo, 16GB recomendado
- **CPU**: 4 cores mínimo
- **Disco**: 15GB espacio libre
- **Red**: Acceso a puertos 3001, 8080-8083

### ⚡ Instalación Rápida (Recomendada)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/accessibility-mw.git
cd accessibility-mw

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Instalar dependencias
npm install

# 4. Desplegar ecosistema completo
.\manage.ps1 deploy-all

# 5. Verificar instalación
npm run health-check
```

### 🔧 Configuración Detallada

#### Variables de Entorno

```bash
# .env - Configuración principal
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Database Configuration
DB_HOST=mysql-analysis
DB_PORT=3306
DB_NAME=accessibility_analysis
DB_USER=analysis_user
DB_PASSWORD=secure_password

# Browser Pool Configuration
BROWSER_POOL_SIZE=3
BROWSER_POOL_MAX_SIZE=8
BROWSER_MEMORY_LIMIT=500
SHARED_MEMORY_SIZE=2048

# Cache Configuration
CACHE_TTL=1800
CACHE_MAX_SIZE=500
CACHE_CHECK_PERIOD=600

# Security Configuration
JWT_SECRET=your_jwt_secret_here
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Microservices Integration
ANALYSIS_SERVICE_URL=http://analysis-api:8082
USERS_SERVICE_URL=http://users-api:8081
REPORTS_SERVICE_URL=http://reports-api:8083
GATEWAY_URL=http://gateway:8080

# Monitoring
ENABLE_PROMETHEUS=true
PROMETHEUS_PORT=9090
HEALTH_CHECK_TIMEOUT=5000
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  accessibility-mw:
    build: .
    ports:
      - "3001:3001"
      - "9090:9090"  # Prometheus metrics
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql-analysis
    volumes:
      - ./logs:/app/logs
      - /dev/shm:/dev/shm  # Shared memory for browsers
    networks:
      - accessibility-shared
    depends_on:
      - mysql-analysis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mysql-analysis:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: accessibility_analysis
      MYSQL_USER: analysis_user
      MYSQL_PASSWORD: secure_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - accessibility-shared

networks:
  accessibility-shared:
    external: true
    driver: bridge
    ipam:
      config:
        - subnet: 172.22.0.0/16

volumes:
  mysql_data:
```

## 📊 API Reference

### 🔍 Endpoint Principal de Análisis

#### `POST /api/analyze`

Ejecuta análisis completo de accesibilidad con axe-core e IBM Equal Access.

**Request Body:**
```typescript
interface AnalysisRequest {
  userId: number;                    // ID del usuario autenticado
  inputType: 'url' | 'html' | 'file'; // Tipo de entrada
  value: string;                     // URL, HTML o contenido del archivo
  tool: 'axe' | 'equal-access' | 'both'; // Herramienta(s) a usar
  options?: {
    wcagLevel?: 'A' | 'AA' | 'AAA';  // Nivel WCAG a evaluar
    includeImages?: boolean;          // Incluir análisis de imágenes
    timeout?: number;                 // Timeout en milisegundos
    viewport?: {                      // Configuración de viewport
      width: number;
      height: number;
    };
    cache?: boolean;                  // Usar cache si disponible
  };
}
```

**Response:**
```typescript
interface AnalysisResponse {
  id: string;                       // ID único del análisis
  status: 'success' | 'error';      // Estado del análisis
  timestamp: string;                // Timestamp ISO 8601
  duration: number;                 // Duración en milisegundos
  metadata: {
    userId: number;
    inputType: string;
    tool: string;
    wcagLevel: string;
    cached: boolean;
  };
  results: {
    axe?: {                         // Resultados de axe-core
      violations: Violation[];
      passes: Pass[];
      incomplete: Incomplete[];
      inapplicable: Inapplicable[];
      summary: {
        violationCount: number;
        passCount: number;
        incompleteCount: number;
      };
    };
    equalAccess?: {                 // Resultados IBM Equal Access
      issues: Issue[];
      summary: {
        level: {
          violation: number;
          needsReview: number;
          recommendation: number;
        };
        categories: Record<string, number>;
      };
    };
    wcagMapping: {                  // Mapeo WCAG consolidado
      level: 'A' | 'AA' | 'AAA';
      criteria: WCAGCriterion[];
      summary: {
        totalCriteria: number;
        passedCriteria: number;
        failedCriteria: number;
        compliance: number;         // Porcentaje 0-100
      };
    };
  };
  performance: {
    analysisTime: number;
    cacheHit: boolean;
    browserPoolWait: number;
    memoryUsage: number;
  };
}
```

**Ejemplos de Uso:**

```bash
# Análisis completo de una URL
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "userId": 1,
    "inputType": "url",
    "value": "https://example.com",
    "tool": "both",
    "options": {
      "wcagLevel": "AA",
      "includeImages": true,
      "timeout": 30000,
      "viewport": {"width": 1920, "height": 1080}
    }
  }'

# Análisis rápido de HTML
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "inputType": "html",
    "value": "<html><body><h1>Test</h1></body></html>",
    "tool": "axe"
  }'
```

### 🏥 Health Check Endpoints

#### `GET /health`
```bash
# Health check básico
curl http://localhost:3001/health

# Health check profundo
curl http://localhost:3001/health?deep=true
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": "healthy",
    "browserPool": "healthy",
    "cache": "healthy",
    "microservices": "healthy"
  },
  "metrics": {
    "memoryUsage": "245MB",
    "browserPoolSize": 3,
    "cacheHitRate": "78%",
    "requestsPerMinute": 45
  }
}
```

### � Monitoring Endpoints

#### `GET /api/metrics`
Métricas Prometheus para monitoreo.

#### `GET /api/status`
Estado detallado del sistema y dependencias.

Si prefieres configuración paso a paso o personalización avanzada:

#### 📋 **Prerrequisitos del Sistema**

| Requisito | Versión | Verificación | Instalación |
|-----------|---------|--------------|-------------|
| **Node.js** | 20.x+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm/yarn** | Latest | `npm --version` | Incluido con Node.js |
| **Docker** | 24.x+ | `docker --version` | [docker.com](https://www.docker.com/) |
| **Docker Compose** | 2.x+ | `docker-compose --version` | Incluido con Docker Desktop |
| **PowerShell** | 5.1+ | `$PSVersionTable` | Windows (nativo) |

#### ⚙️ **Instalación Paso a Paso**

```bash
# 1️⃣ Preparación del entorno
git clone https://github.com/magodeveloper/accessibility-mw.git
cd accessibility-mw

# 2️⃣ Instalación de dependencias
npm install --production=false
npm audit fix

# 3️⃣ Configuración de variables de entorno
cp .env.template .env
# Editar .env según necesidades (ver sección Configuración)

# 4️⃣ Crear red Docker compartida (CRÍTICO)
docker network create --driver bridge --subnet=172.22.0.0/16 accessibility-shared

# 5️⃣ Compilación TypeScript
npm run build
npm run type-check

# 6️⃣ Validación del sistema
npm run test
npm run lint

# 7️⃣ Inicio en desarrollo
npm run dev
```

### 🎯 **Comandos de Desarrollo**

| Comando | Descripción | Uso Recomendado |
|---------|-------------|-----------------|
| `npm run dev` | Desarrollo con hot-reload | 🛠️ Development |
| `npm run dev:debug` | Desarrollo + Node.js debugger | 🔍 Debugging |
| `npm run build` | Compilar TypeScript → JavaScript | 🏗️ Production build |
| `npm run start` | Ejecutar desde dist/ | 🚀 Production |
| `npm run test` | Suite completa tests (456 tests) | 🧪 Quality assurance |
| `npm run lint` | ESLint con auto-fix | 🔧 Code quality |
| `npm run docker:build` | Build imagen Docker | 🐳 Containerization |

### 🌐 **Configuración de Red Docker** (Automática)

```yaml
# Red creada automáticamente por manage.ps1
Network Name: accessibility-shared
Driver: bridge
Subnet: 172.22.0.0/16
Gateway: 172.22.0.1

# Asignación automática de IPs:
Services:
  - middleware:        172.22.0.5:3001
  - analysis-api:      172.22.0.2:8082  
  - users-api:         172.22.0.3:8081
  - reports-api:       172.22.0.4:8083
  - gateway:           172.22.0.10:8080
  - mysql-analysis:    172.22.0.12:3306
  - mysql-users:       172.22.0.13:3306
  - mysql-reports:     172.22.0.14:3306
```

---

## ⚙️ **Configuración Avanzada**

### 🔧 **Variables de Entorno Críticas**

#### ⚡ **Configuración Automática con manage.ps1**

El sistema automatizado configura las siguientes variables automáticamente:

```bash
# === CONFIGURACIÓN AUTOMÁTICA APLICADA ===
NODE_ENV=production                           # Entorno optimizado para producción
ANALYSIS_API_URL=http://msanalysis-api:8082   # URL contenedor Analysis Service
USERS_API_URL=http://msusers-api:8081         # URL contenedor Users Service  
REPORTS_API_URL=http://msreports-api:8083     # URL contenedor Reports Service
DOCKER_NETWORK=accessibility-shared          # Red Docker compartida
```

#### � **Configuración Manual (.env)**

Para configuración personalizada, copia `.env.template` a `.env` y ajusta:

```bash
# === SERVIDOR PRINCIPAL ===
NODE_ENV=development                          # development/production/test
PORT=3001                                     # Puerto del middleware
HOST=0.0.0.0                                # Binding host (0.0.0.0 para Docker)
TRUST_PROXY=true                             # Para proxies reversos

# === INTEGRACIÓN MICROSERVICIOS (CRÍTICO) ===
ANALYSIS_API_URL=http://msanalysis-api:8082   # ¡USAR NOMBRES DE CONTENEDOR!
USERS_API_URL=http://msusers-api:8081         # No localhost en Docker
REPORTS_API_URL=http://msreports-api:8083     # Para conectividad entre containers

# === CORS Y SEGURIDAD ===
CORS_ORIGINS=http://localhost:3000            # Frontend origins permitidos
CORS_METHODS=GET,POST,PUT,DELETE             # Métodos HTTP permitidos
CSP_ENABLED=true                             # Content Security Policy
HELMET_ENABLED=true                          # Security headers automáticos

# === ANÁLISIS Y PERFORMANCE ===
ANALYZE_TIMEOUT_MS=30000                      # Timeout análisis (30s optimizado)
NAVIGATION_TIMEOUT_MS=15000                   # Timeout navegación (15s)
BROWSER_POOL_MAX_SIZE=3                       # Navegadores en pool (óptimo)
BROWSER_POOL_MAX_IDLE_MS=300000              # Max idle time pool (5 min)

# === CACHE SYSTEM ===
CACHE_MAX_ENTRIES=100                         # Max entradas cache LRU
CACHE_MAX_MEMORY_MB=50                        # Límite memoria cache (MB)
CACHE_TTL_MS=1800000                         # TTL cache (30 min)
CACHE_CLEANUP_INTERVAL_MS=300000             # Cleanup automático (5 min)

# === RATE LIMITING ===
RATE_MAX=60                                  # Max requests por minuto (general)
RATE_ANALYZE_MAX=20                          # Max análisis por minuto
RATE_WINDOWMS=60000                          # Ventana rate limiting (60s)

# === BROWSER CONFIGURATION ===
PLAYWRIGHT_HEADLESS=true                      # Sin GUI para producción
BROWSER_ARGS=--no-sandbox,--disable-dev-shm-usage  # Args seguridad Docker
USER_AGENT="AccessibilityBot/1.0"           # User agent personalizado

# === LOGGING Y MONITOREO ===
LOG_LEVEL=info                               # debug/info/warn/error
LOG_FORMAT=json                              # json/pretty
REQUEST_ID_HEADER=x-request-id               # Header tracking requests

# === DEVELOPMENT ONLY ===
BYPASS_SSRF_VALIDATION_IN_DEV=true          # Solo desarrollo
ALLOW_PRIVATE_IPS_IN_DEV=true               # Solo desarrollo
HOT_RELOAD_ENABLED=true                      # Solo desarrollo
```

### 🌍 **Configuraciones por Entorno**

| Archivo | Entorno | Características | Uso Recomendado |
|---------|---------|-----------------|-----------------|
| `.env.template` | 📋 **Plantilla** | Configuración completa con comentarios | Base para nuevas instalaciones |
| `.env.development` | 🛠️ **Desarrollo** | Debug habilitado, CORS permisivo, logs detallados | `npm run dev` |
| `.env.production` | 🚀 **Producción** | Optimizado, security headers, rate limiting estricto | Docker production |
| `.env.test` | 🧪 **Testing** | Timeouts reducidos, logs mínimos, datos mock | `npm run test` |

#### 🛠️ **Configuración Desarrollo (.env.development)**

```bash
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug
HOT_RELOAD_ENABLED=true
BYPASS_SSRF_VALIDATION_IN_DEV=true
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
BROWSER_POOL_MAX_SIZE=2
CACHE_MAX_ENTRIES=50
```

#### 🚀 **Configuración Producción (.env.production)**

```bash
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
HELMET_ENABLED=true
CSP_ENABLED=true
RATE_MAX=60
RATE_ANALYZE_MAX=20
BROWSER_POOL_MAX_SIZE=3
CACHE_MAX_ENTRIES=100
TRUST_PROXY=true
```

### 🔒 **Configuración de Seguridad**

#### 🛡️ **Headers de Seguridad (Helmet.js)**

```bash
# Configuración automática en producción
HELMET_ENABLED=true                          # Habilitar todos los headers
HELMET_CONTENT_SECURITY_POLICY=true         # CSP automático
HELMET_HSTS_ENABLED=true                     # HTTP Strict Transport Security
HELMET_X_FRAME_OPTIONS=DENY                 # Prevenir clickjacking
HELMET_X_CONTENT_TYPE_OPTIONS=nosniff       # Prevenir MIME sniffing
```

#### 🚨 **Protección SSRF (Server-Side Request Forgery)**

```bash
BYPASS_SSRF_VALIDATION_IN_DEV=false         # Siempre false en producción
ALLOW_PRIVATE_IPS_IN_DEV=false              # Prevenir acceso a IPs privadas
BLOCKED_DOMAINS=localhost,127.0.0.1,0.0.0.0 # Dominios bloqueados
ALLOWED_PROTOCOLS=http,https                 # Solo HTTP/HTTPS
```

#### 📊 **Rate Limiting Avanzado**

```bash
# Configuración por endpoint
RATE_MAX=60                                  # Límite general (requests/min)
RATE_ANALYZE_MAX=20                          # Límite análisis (requests/min)
RATE_HEALTH_MAX=300                          # Límite health checks
RATE_METRICS_MAX=120                         # Límite métricas

# Configuración de ventana
RATE_WINDOWMS=60000                          # Ventana 60 segundos
RATE_SKIP_SUCCESSFUL_REQUESTS=false          # Contar todos los requests
RATE_HEADERS_ENABLED=true                    # Headers informativos
```

### 🐳 **Configuración Docker Avanzada**

#### 📊 **Optimizaciones de Performance**

```yaml
# docker-compose.yml - Sección optimizada
services:
  accessibility-mw:
    environment:
      - NODE_ENV=production
      - NODE_OPTIONS=--max-old-space-size=2048  # 2GB heap
      - UV_THREADPOOL_SIZE=16                   # 16 threads I/O
    shm_size: '2gb'                            # Memoria compartida Playwright
    mem_limit: 3g                              # Límite memoria total
    mem_reservation: 1g                        # Reserva mínima
    cpus: '2.0'                               # CPU limit
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=512m       # Tmpfs para archivos temp
      - /var/cache:rw,noexec,nosuid,size=256m # Cache en memoria
```

#### 🛡️ **Configuración de Seguridad Docker**

```yaml
security_opt:
  - no-new-privileges:true                    # Prevenir escalación privilegios
  - seccomp:unconfined                       # Flexibilidad para Playwright
user: "1001:1001"                            # Usuario no-root
read_only: true                              # Filesystem solo lectura
cap_drop:
  - ALL                                      # Remover todas las capabilities
cap_add:
  - CHOWN                                    # Solo capabilities necesarias
  - SETUID
  - SETGID
```

### 📝 **Validación de Configuración**

#### 🔍 **Verificación Automática**

El sistema incluye validación automática de configuración usando Zod:

```bash
# Verificar configuración al inicio
npm run config:validate

# Ver configuración actual (sin secretos)
curl http://localhost:3001/api/config

# Verificar variables de entorno requeridas
npm run config:check
```

#### 🧪 **Testing de Configuración**

```bash
# Test configuración específica por entorno
NODE_ENV=development npm run test:config
NODE_ENV=production npm run test:config

# Validar integración con microservicios
npm run test:integration

# Test conectividad de red Docker
docker network inspect accessibility-shared
```

Ver documentación completa de variables de entorno en: [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)

---

## 📋 **API Endpoints**

### 🔍 **Análisis de Accesibilidad**

#### **Endpoint Principal - Análisis Integral**

**Endpoint para análisis completo de accesibilidad web con persistencia automática en base de datos MySQL**

```http
POST /api/analyze
Content-Type: application/json
Accept: application/json
```

##### 📝 **Request Schema (Zod Validation)**

```typescript
interface AnalysisRequest {
  userId: number;                             // ID usuario (requerido)
  inputType: "url" | "html" | "file";        // Tipo de entrada
  value: string;                             // URL, HTML directo o contenido
  tool: "axe" | "equal-access" | "both";     // Herramienta(s) de análisis  
  wcagVersion?: "WCAG21" | "WCAG22";         // Versión WCAG (default: WCAG22)
  wcagLevel?: "A" | "AA" | "AAA";            // Nivel conformidad (default: AA)
  language?: "es" | "en";                    // Idioma reporte (default: es)
  viewport?: {                               // Dimensiones viewport (opcional)
    width: number;                           // Ancho en pixels
    height: number;                          // Alto en pixels
  };
  options?: {                                // Opciones avanzadas
    includeScreenshot?: boolean;             // Captura pantalla
    waitForSelector?: string;                // Selector espera antes análisis  
    timeout?: number;                        // Timeout personalizado (ms)
    cache?: boolean;                         // Usar cache (default: true)
  };
}
```

##### 🎯 **Ejemplos de Requests**

**Análisis de URL completo:**
```bash
curl -X POST "http://localhost:3001/api/analyze" \
  -H "Content-Type: application/json" \
  -H "x-request-id: req-$(date +%s)" \
  -d '{
    "userId": 1,
    "inputType": "url",
    "value": "https://example.com",
    "tool": "both",
    "wcagVersion": "WCAG22",
    "wcagLevel": "AA",
    "language": "es",
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "options": {
## 📋 Comandos de Desarrollo

### 🛠️ Scripts NPM Disponibles

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `npm run dev` | Desarrollo con hot-reload | Desarrollo activo |
| `npm run build` | Compilar TypeScript a JavaScript | Preparar para producción |
| `npm start` | Ejecutar desde dist/ | Producción |
| `npm test` | Suite completa de tests | Control de calidad |
| `npm run test:unit` | Solo tests unitarios | Testing rápido |
| `npm run test:integration` | Tests de integración | Validar APIs |
| `npm run test:e2e` | Tests end-to-end | Validar flujo completo |
| `npm run test:coverage` | Tests con reporte de cobertura | Análisis de calidad |
| `npm run lint` | Linting con ESLint | Calidad de código |
| `npm run lint:fix` | Auto-fix problemas de lint | Corrección automática |
| `npm run type-check` | Verificación de tipos TypeScript | Validación de tipos |

### 🐳 Scripts Docker

```bash
# Build imagen optimizada
.\manage.ps1 docker-build

# Ejecutar en contenedor
.\manage.ps1 docker-run

# Ver logs del contenedor
.\manage.ps1 docker-logs

# Deployment completo del ecosistema
.\manage.ps1 deploy-all
```

## 🚨 Troubleshooting

### ❗ Problemas Comunes y Soluciones

#### 🌐 Error de Conectividad con Microservicios

**Síntoma**: `ECONNREFUSED` al conectar con APIs de .NET

**Solución:**
```bash
# 1. Verificar red Docker compartida
docker network ls | grep accessibility-shared

# 2. Si no existe, crearla
docker network create --driver bridge --subnet=172.22.0.0/16 accessibility-shared

# 3. Reiniciar ecosystem completo
.\manage.ps1 deploy-all

# 4. Verificar conectividad
curl http://localhost:3001/health?deep=true
```

#### 🌐 Error de Browser Pool

**Síntoma**: `Browser initialization failed` o `Shared memory error`

**Solución:**
```bash
# 1. Verificar memoria compartida disponible
df -h /dev/shm  # Linux/WSL

# 2. Aumentar shared memory en Docker
# En docker-compose.yml:
# shm_size: '2gb'

# 3. Reiniciar browser pool
curl -X POST http://localhost:3001/api/browser-pool/restart
```

#### 💾 Error de Cache

**Síntoma**: High memory usage o cache invalidation errors

**Solución:**
```bash
# 1. Limpiar cache manualmente
curl -X POST http://localhost:3001/api/cache/clear

# 2. Verificar métricas de memoria
curl http://localhost:3001/api/metrics | grep cache

# 3. Ajustar configuración cache en .env
CACHE_MAX_ENTRIES=50
CACHE_MAX_MEMORY_MB=25
```

### 🔍 Comandos de Diagnóstico

```bash
# Health check completo del sistema
curl "http://localhost:3001/health?deep=true&format=json" | jq

# Estado de todos los microservicios
curl http://localhost:3001/api/status

# Métricas Prometheus
curl http://localhost:3001/api/metrics

# Logs en tiempo real
docker logs accessibility-mw -f --tail=100

# Verificar red Docker
docker network inspect accessibility-shared
```

## 📚 Documentación Adicional

### 📖 Guías de Referencia

- **[📊 API Documentation](http://localhost:3001/api/docs)**: Documentación completa OpenAPI/Swagger
- **[🏗️ Architecture Guide](docs/ARCHITECTURE.md)**: Arquitectura del sistema y decisiones técnicas  
- **[🚀 Deployment Guide](docs/DEPLOYMENT.md)**: Guía completa de despliegue
- **[🔐 Security Guide](docs/SECURITY.md)**: Medidas de seguridad y buenas prácticas
- **[🌍 Environment Guide](docs/ENVIRONMENT.md)**: Variables de entorno detalladas

### 🔗 Enlaces Útiles

#### Herramientas de Accesibilidad
- [axe-core Repository](https://github.com/dequelabs/axe-core) - Herramienta principal de testing
- [IBM Equal Access](https://github.com/IBMa/equal-access) - Validador avanzado WCAG
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/) - Referencia rápida WCAG
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/) - Última versión WCAG

#### Framework y Tecnologías
- [Node.js Documentation](https://nodejs.org/docs/) - Runtime JavaScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Lenguaje tipado
- [Express.js Guide](https://expressjs.com/en/guide/) - Framework web
- [Playwright Documentation](https://playwright.dev/) - Automatización de navegadores

## 📊 Métricas y Rendimiento

### 📈 Benchmarks del Sistema

| Métrica | Valor Promedio | Rango Óptimo | Notas |
|---------|----------------|--------------|-------|
| **Tiempo de Análisis** | 2.8 segundos | 2-5 segundos | Con browser pool optimizado |
| **Memory Usage** | 245 MB | 200-400 MB | Sin incluir browser pool |
| **Cache Hit Rate** | 78% | >75% | Para contenido repetitivo |
| **Browser Pool Init** | 1.2 segundos | <2 segundos | Primera solicitud |
| **Database Write** | 145 ms | <200 ms | Persistencia MySQL |
| **Concurrent Users** | 50+ usuarios | Escalable | Con pool de 3 browsers |

### 🎯 Objetivos de Performance

- ✅ **Response Time**: <3 segundos para análisis completo
- ✅ **Availability**: 99.9% uptime en producción  
- ✅ **Throughput**: >20 análisis por minuto
- ✅ **Memory**: <500MB sin browser pool
- ✅ **CPU**: <80% durante picos de carga

## 🤝 Contribución al Proyecto

### 📋 Proceso de Contribución

1. **Fork** del repositorio principal
2. **Crear rama** feature: `git checkout -b feature/nueva-funcionalidad`
3. **Commit** cambios: `git commit -m 'feat: agregar nueva funcionalidad'`
4. **Push** rama: `git push origin feature/nueva-funcionalidad`
5. **Pull Request** con descripción detallada

### ✅ Checklist Antes de PR

- [ ] Tests pasan: `npm test`
- [ ] Linting limpio: `npm run lint`
- [ ] TypeScript válido: `npm run type-check`
- [ ] Documentación actualizada
- [ ] Variables de entorno documentadas
- [ ] Breaking changes identificados

### 🧪 Standards de Calidad

- **Cobertura de tests**: Mínimo 70%
- **ESLint**: Configuración strict sin warnings
- **TypeScript**: Strict mode habilitado
- **Commits**: Conventional Commits format
- **Documentación**: JSDoc para funciones públicas

## 🔧 Desarrollo Local

### 🛠️ Setup Inicial

```bash
# 1. Clonar y setup
git clone https://github.com/tu-org/accessibility-mw.git
cd accessibility-mw
npm install

# 2. Configurar entorno
cp .env.example .env
# Editar .env según necesidades

# 3. Inicializar base de datos (si es necesario)
npm run db:init

# 4. Ejecutar en modo desarrollo
npm run dev
```

### 🔄 Workflow de Desarrollo

```bash
# Desarrollo con hot-reload
npm run dev

# Tests en modo watch
npm run test:watch

# Linting continuo
npm run lint:watch

# Build y verificación
npm run build && npm run type-check
```

## 📄 Licencia y Legal

### 📋 Información de Licencia

Este proyecto está licenciado bajo la **Licencia ISC**.

**Resumen**: Permite uso comercial y privado, modificación, distribución, con la única condición de mantener el aviso de copyright.

### 🔗 Dependencias y Licencias

Las principales dependencias y sus licencias:

- **axe-core**: Mozilla Public License 2.0
- **Express**: MIT License  
- **TypeScript**: Apache License 2.0
- **Playwright**: Apache License 2.0
- **Node.js**: MIT License

### ⚖️ Disclaimer

Este software se proporciona "tal como está", sin garantía de ningún tipo. Ver archivo `LICENSE` para términos completos.

---

## 🚀 Próximos Pasos

### 🎯 Roadmap 2024

#### Q1 2024
- [ ] **WebSocket Support**: Análisis en tiempo real
- [ ] **Redis Integration**: Cache distribuido
- [ ] **PDF Reports**: Generación automática de reportes
- [ ] **Multi-language**: Soporte i18n completo

#### Q2 2024  
- [ ] **Kubernetes**: Helm charts para deployment
- [ ] **Monitoring**: Grafana dashboards
- [ ] **CI/CD**: GitHub Actions optimizado
- [ ] **Performance**: Optimizaciones adicionales

### 🤝 Necesitas Ayuda

**📧 Soporte**: Abre un [issue en GitHub](https://github.com/tu-org/accessibility-mw/issues)

**📖 Documentación**: Consulta la [wiki del proyecto](https://github.com/tu-org/accessibility-mw/wiki)

**💬 Comunidad**: Únete a nuestro [Discord](https://discord.gg/accessibility)

---

<div align="center">

**🌟 ¡Gracias por usar accessibility-mw! 🌟**

*Construyendo un web más accesible, una línea de código a la vez.*

[![Contributors](https://img.shields.io/github/contributors/tu-org/accessibility-mw?style=for-the-badge)](https://github.com/tu-org/accessibility-mw/graphs/contributors)
[![Stars](https://img.shields.io/github/stars/tu-org/accessibility-mw?style=for-the-badge)](https://github.com/tu-org/accessibility-mw/stargazers)
[![Issues](https://img.shields.io/github/issues/tu-org/accessibility-mw?style=for-the-badge)](https://github.com/tu-org/accessibility-mw/issues)
[![License](https://img.shields.io/github/license/tu-org/accessibility-mw?style=for-the-badge)](LICENSE)

</div>
      "cache": true
    }
  }'
```

**Análisis de HTML directo:**
```bash
curl -X POST "http://localhost:3001/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "inputType": "html", 
    "value": "<html><head><title>Test</title></head><body><h1>Análisis de Accesibilidad</h1><p>Contenido de prueba sin etiquetas alt en imágenes.</p><img src=\"test.jpg\"></body></html>",
    "tool": "both",
    "wcagVersion": "WCAG22",
    "wcagLevel": "AA"
  }'
```

**Análisis solo con axe-core (rápido):**
```powershell
# PowerShell ejemplo
Invoke-RestMethod -Uri "http://localhost:3001/api/analyze" -Method POST `
  -ContentType "application/json" `
  -Body @'
{
  "userId": 1,
  "inputType": "html",
  "value": "<html><body><h1>Test Rápido</h1><input type=\"text\"></body></html>",
  "tool": "axe",
  "wcagLevel": "A"
}
'@
```

##### ✅ **Response Schema Completa**

```typescript
interface AnalysisResponse {
  ok: boolean;                               // Estado exitoso del request
  data: {
    ok: boolean;                            // Estado exitoso del análisis
    meta: {                                 // Metadatos del análisis
      inputType: string;                    // Tipo entrada procesada
      tool: string;                         // Herramienta(s) utilizada(s)  
      duration: number;                     // Tiempo análisis (ms)
      wcagVersion: string;                  // Versión WCAG aplicada
      wcagLevel: string;                    // Nivel conformidad
      cached: boolean;                      // Resultado del cache
      timestamp: string;                    // ISO timestamp análisis
      analysisId: number;                   // ID único análisis (BD)
      savedToDatabase: boolean;             // Confirmación persistencia
      // Estadísticas por herramienta
      "axe-core"?: {
        violations: number;                 // Violaciones detectadas
        passes: number;                     // Reglas que pasan
        incomplete: number;                 // Reglas requieren revisión
        inapplicable: number;               // Reglas no aplicables
      };
      "equal-access"?: {
        violations: number;
        needsReview: number;               // Requiere revisión manual
        recommendations: number;            // Recomendaciones  
        passes: number;
        incomplete: number;
        inapplicable: number;
      };
    };
    results: Array<{                       // Resultados detallados por herramienta
      tool: "axe-core" | "equal-access";
      version: string;                     // Versión herramienta
      stats: {                            // Estadísticas resumen
        violations: number;
        passes: number;
        incomplete?: number;
        needsReview?: number;
      };
      wcagMapping: {                      // Mapeo automático WCAG
        [level: string]: {
          violations: number;
          passes: number;
        };
      };
      items: Array<{                      // Issues individuales
        id: string;                       // ID único issue
        type: "violation" | "pass" | "incomplete" | "review";
        impact: "minor" | "moderate" | "serious" | "critical";
        help: string;                     // Descripción issue
        helpUrl: string;                  // URL documentación
        wcag: {                          // Mapeo WCAG automático
          version: string;
          level: "A" | "AA" | "AAA";
          criteria: string[];             // Criterios WCAG afectados
        };
        nodes?: Array<{                  // Nodos DOM afectados
          target: string[];              // Selector CSS
          html: string;                  // HTML del elemento
          failureSummary?: string;       // Resumen fallo
          location?: {                   // Ubicación en código fuente
            line: number;
            column: number;
          };
        }>;
      }>;
    }>;
    summary: {                            // Resumen ejecutivo
      totalViolations: number;            // Total violaciones todas herramientas
      totalPasses: number;                // Total reglas que pasan
      criticalIssues: number;             // Issues críticos (impact: critical)
      seriousIssues: number;              // Issues serios (impact: serious)
      wcagCompliance: {                   // Análisis cumplimiento WCAG
        [level: string]: {
          compliant: boolean;             // ¿Cumple nivel?
          violationsCount: number;        // Violaciones en nivel
          passesCount: number;            // Reglas que pasan
          compliancePercentage: number;   // % cumplimiento
        };
      };
    };
  };
  requestId: string;                      // ID único request para tracking
  performance: {                          // Métricas performance
    analysisTime: number;                 // Tiempo total análisis (ms)
    browserPoolWait: number;              // Tiempo espera navegador (ms)
    cacheHit: boolean;                   // ¿Resultado cacheado?
  };
}
```

##### 📊 **Ejemplo de Response Real Completa**

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "meta": {
      "inputType": "html",
      "tool": "both", 
      "duration": 2847,
      "wcagVersion": "WCAG22",
      "wcagLevel": "AA",
      "cached": false,
      "timestamp": "2025-01-31T10:30:00.000Z",
      "analysisId": 12,
      "savedToDatabase": true,
      "axe-core": {
        "violations": 4,
        "passes": 12,
        "incomplete": 1,
        "inapplicable": 83
      },
      "equal-access": {
        "violations": 3,
        "needsReview": 2,
        "recommendations": 1,
        "passes": 15,
        "incomplete": 0,
        "inapplicable": 0
      }
    },
    "results": [
      {
        "tool": "axe-core",
        "version": "4.10.3",
        "stats": {
          "violations": 4,
          "passes": 12,
          "incomplete": 1
        },
        "wcagMapping": {
          "A": { "violations": 2, "passes": 8 },
          "AA": { "violations": 2, "passes": 4 }
        },
        "items": [
          {
            "id": "document-title",
            "type": "violation",
            "impact": "serious",
            "help": "Los documentos deben tener elemento <title> para ayudar en la navegación",
            "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/document-title",
            "wcag": {
              "version": "2.2",
              "level": "A",
              "criteria": ["2.4.2"]
            },
            "nodes": [
              {
                "target": ["html"],
                "html": "<html><head>...</head><body>...",
                "failureSummary": "Documento sin elemento title",
                "location": { "line": 1, "column": 1 }
              }
            ]
          },
          {
            "id": "image-alt",
            "type": "violation", 
            "impact": "critical",
            "help": "Las imágenes deben tener texto alternativo",
            "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/image-alt",
            "wcag": {
              "version": "2.2",
              "level": "A", 
              "criteria": ["1.1.1"]
            },
            "nodes": [
              {
                "target": ["img"],
                "html": "<img src=\"test.jpg\">",
                "failureSummary": "Imagen sin atributo alt",
                "location": { "line": 1, "column": 95 }
              }
            ]
          }
        ]
      },
      {
        "tool": "equal-access",
        "version": "4.0.8",
        "stats": {
          "violations": 3,
          "needsReview": 2, 
          "passes": 15
        },
        "wcagMapping": {
          "A": { "violations": 2, "passes": 10 },
          "AA": { "violations": 1, "passes": 5 }
        },
        "items": [
          {
            "id": "input_label_exists",
            "type": "violation",
            "impact": "serious",
            "help": "Los elementos form input deben tener etiquetas asociadas",
            "wcag": {
              "version": "2.2",
              "level": "A",
              "criteria": ["1.3.1", "4.1.2"]
            },
            "nodes": [
              {
                "target": ["input[type=\"text\"]"],
                "html": "<input type=\"text\">",
                "failureSummary": "Input sin label asociado"
              }
            ]
          }
        ]
      }
    ],
    "summary": {
      "totalViolations": 7,
      "totalPasses": 27,
      "criticalIssues": 1,
      "seriousIssues": 6,
      "wcagCompliance": {
        "A": {
          "compliant": false,
          "violationsCount": 4,
          "passesCount": 18,
          "compliancePercentage": 81.8
        },
        "AA": {
          "compliant": false, 
          "violationsCount": 3,
          "passesCount": 9,
          "compliancePercentage": 75.0
        }
      }
    }
  },
  "requestId": "req_1738231800",
  "performance": {
    "analysisTime": 2847,
    "browserPoolWait": 156,
    "cacheHit": false
  }
}
```

### 🏥 **Health Checks y Diagnósticos**

#### **Health Check Básico** 
```http
GET /health
Accept: application/json
```

**Response (< 100ms):**
```json
{
  "status": "ok",
  "timestamp": "2025-01-31T10:30:00.000Z", 
  "uptime": 3600000,
  "version": "1.0.0",
  "requestId": "req_1738231800"
}
```

#### **Health Check Profundo**
```http
GET /health?deep=true
Accept: application/json
```

**Response (< 5s) - Validación completa del sistema:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-31T10:30:00.000Z",
  "uptime": 3600000,
  "version": "1.0.0",
  "healthScore": 95,
  "services": {
    "browserPool": {
      "status": "healthy",
      "available": 3,
      "active": 0,
      "responseTime": 45
    },
    "analysisService": {
      "status": "up",
      "url": "http://msanalysis-api:8082",
      "responseTime": 120,
      "lastCheck": "2025-01-31T10:29:45.000Z"
    },
    "usersService": {
      "status": "up", 
      "url": "http://msusers-api:8081",
      "responseTime": 89
    },
    "reportsService": {
      "status": "up",
      "url": "http://msreports-api:8083", 
      "responseTime": 156
    },
    "cache": {
      "status": "healthy",
      "entries": 23,
      "hitRate": 85.2,
      "memoryUsage": "12.3MB"
    }
  },
  "system": {
    "memory": {
      "used": 156,
      "total": 3072,
      "percentage": 5.1
    },
    "cpu": {
      "usage": 2.4
    }
  },
  "requestId": "req_1738231800"
}
```

### 📊 **Métricas y Monitoreo**

#### **Dashboard de Monitoreo**
```http
GET /api/monitoring/dashboard
Accept: application/json
```

#### **Métricas JSON (Custom Dashboards)**
```http
GET /metrics
Accept: application/json
```

#### **Métricas Prometheus (Grafana)**
```http
GET /metrics?format=prometheus
Accept: text/plain
```

### 🔧 **Administración y Mantenimiento**

#### **Limpiar Cache Manualmente**
```http
DELETE /cache
Accept: application/json
```

#### **Reset Browser Pool** (Development)
```http
POST /api/monitoring/reset-pool
Accept: application/json
```

#### **Información del Sistema**
```http
GET /api/system/info
Accept: application/json
```

### 📚 **Documentación Interactiva**

#### **Swagger/OpenAPI UI**
- **Interfaz completa**: `http://localhost:3001/api/docs`
- **Especificación JSON**: `http://localhost:3001/api/docs.json`
- **Schema OpenAPI 3.1.0**: Especificación completa con ejemplos

### 🔍 **Códigos de Estado y Errores**

| Status Code | Descripción | Ejemplo |
|-------------|-------------|---------|
| **200** | ✅ Análisis exitoso | Análisis completado y guardado |
| **400** | ❌ Request inválido | Validación Zod fallida |
| **408** | ⏰ Timeout | Análisis excedió timeout configurado |
| **429** | 🚦 Rate limit excedido | Demasiados requests por minuto |
| **500** | 🔥 Error servidor | Error interno del middleware |
| **502** | 🔌 Error microservicio | Microservicio no disponible |
| **503** | 🏥 Servicio no disponible | Browser pool agotado o sistema no healthy |

### 📋 **Headers Recomendados**

```http
# Headers del cliente
Content-Type: application/json
Accept: application/json
x-request-id: unique-request-identifier
User-Agent: YourApp/1.0

# Headers de respuesta del servidor
content-type: application/json; charset=utf-8
x-request-id: unique-request-identifier  
x-response-time: 2847ms
x-rate-limit-remaining: 18
x-cache-status: MISS
```
# Incluye: browser pool, microservicio análisis, cache, métricas

# Dashboard de monitoreo en tiempo real
GET /api/monitoring/status
GET /api/monitoring/dashboard

# Estado específico del microservicio de análisis
GET /api/monitoring/analysis-service
```

### 📊 Métricas y Performance

```bash
# Métricas en formato JSON (para dashboards custom)
GET /metrics
Content-Type: application/json

# Métricas en formato Prometheus (para Grafana/Prometheus)
GET /metrics?format=prometheus
Content-Type: text/plain

# Limpiar cache manualmente (útil para debugging)
DELETE /cache
```

#### Ejemplo de Métricas:

```json
{
  "system": {
    "uptime": 86400000,
    "memory": { "used": 156, "total": 512 },
    "cpu": { "usage": 15.2 }
  },
  "requests": {
    "total": 1250,
    "successful": 1200,
    "failed": 50,
    "successRate": 96.0
  },
  "cache": {
    "entries": 45,
    "hitRate": 78.5,
    "memoryUsage": 12.3
  },
  "browserPool": {
    "size": 3,
    "active": 1,
    "idle": 2,
    "status": "healthy"
  }
}
```

### 📋 Documentación Interactiva

```bash
# Swagger/OpenAPI UI - Documentación interactiva completa
GET /api/docs

# Especificación OpenAPI en JSON
GET /api/docs.json
```

#### ✨ **OpenAPI 3.1.0 Specification**

El proyecto utiliza una **especificación OpenAPI 3.1.0 completamente detallada** ubicada en:
- **Archivo fuente**: `src/routes/analyze.openapi.yaml`
- **Configuración**: Direct YAML loading con `js-yaml` library
- **Features**: Schemas completos, ejemplos de requests/responses, documentación detallada de errores

**Beneficios de la implementación actual:**
- 🎯 **Especificación completa**: Todos los endpoints documentados con ejemplos
- ⚡ **Carga optimizada**: Direct YAML loading (sin swagger-jsdoc overhead)
- 🔄 **Mantenimiento fácil**: YAML directo editado sin comentarios JSDoc
- 📊 **Compatibilidad**: OpenAPI 3.1.0 estándar para herramientas modernas

## ⚙️ **Configuración Avanzada**

### Variables de Entorno Críticas

```bash
# === SERVIDOR ===
NODE_ENV=development|production        # Entorno de ejecución
PORT=3001                             # Puerto del servidor
HOST=localhost|0.0.0.0               # Host de binding
TRUST_PROXY=true                      # Para proxies reversos/load balancers

# === INTEGRACIÓN DE MICROSERVICIOS ===
ANALYSIS_API_URL=http://localhost:8082 # ¡CRÍTICO! URL del microservicio
CORS_ORIGINS=http://localhost:3000     # Orígenes CORS permitidos

# === PERFORMANCE Y LÍMITES ===
ANALYZE_TIMEOUT_MS=30000              # Timeout análisis (30s optimizado)
NAVIGATION_TIMEOUT_MS=15000           # Timeout navegación (15s optimizado)
BROWSER_POOL_MAX_SIZE=3               # Navegadores en pool (óptimo: 3)
CACHE_MAX_ENTRIES=100                 # Máx entradas en cache LRU
CACHE_MAX_MEMORY_MB=50                # Límite memoria cache (MB)

# === RATE LIMITING ===
RATE_MAX=60                           # Max requests por minuto (general)
RATE_ANALYZE_MAX=20                   # Max análisis por minuto (específico)

# === SEGURIDAD ===
BYPASS_SSRF_VALIDATION_IN_DEV=true    # Solo desarrollo
ALLOW_PRIVATE_IPS_IN_DEV=true         # Solo desarrollo
CSP_ENABLED=true                      # Content Security Policy

# === BROWSER CONFIGURACIÓN ===
PLAYWRIGHT_HEADLESS=true              # Navegadores sin GUI
BROWSER_POOL_MAX_IDLE_MS=300000       # Timeout pool (5 min)
```

### Configuraciones por Entorno

| Archivo          | Propósito             | Uso Recomendado          |
| ---------------- | --------------------- | ------------------------ |
| `.env.template`  | 📋 Plantilla completa | Copiar como base         |
| `.env.development` | 🛠️ Desarrollo local   | `npm run dev`            |
| `.env.prod`      | 🚀 Producción         | Docker/K8s production    |
| `.env.optimized` | ⚡ Performance tuning | Cargas altas, benchmarks |

Ver documentación detallada: [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)

---

## 🐳 **Docker & Containerización**

### 📊 **Optimización de Contenedor (28.3% Reducción de Tamaño)**

El middleware utiliza **Docker multi-stage build** optimizado:

#### 🏗️ **Dockerfile Optimizado**

```dockerfile
# ===== STAGE 1: Build Stage =====
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund
COPY . .
RUN npm run build

# ===== STAGE 2: Runtime Stage =====  
FROM node:20-alpine AS runtime
WORKDIR /app

# Instalar dependencias del sistema para Playwright
RUN apk add --no-cache \
    chromium \
    firefox \
    webkit2gtk-4.0 \
    && rm -rf /var/cache/apk/*

# Configurar usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Copiar solo lo necesario desde build stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Configuración de memoria compartida para Chromium/Firefox
VOLUME /dev/shm

# Puerto y comando de inicio
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

#### 📈 **Métricas de Optimización**

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Tamaño imagen** | 1.23 GB | 882 MB | **-28.3%** ⭐ |
| **Tiempo build** | 4min 32s | 3min 12s | **-29.4%** |
| **Tiempo inicio** | 8.2s | 5.7s | **-30.5%** |
| **Capas Docker** | 15 | 8 | **-46.7%** |
| **Dependencias** | 847 | 412 | **-51.4%** |

### 🚀 **Docker Compose - Configuraciones por Entorno**

#### **Desarrollo (docker-compose.dev.yml)**
```yaml
version: '3.8'
services:
  accessibility-mw:
    build:
      context: .
      target: development
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
      - "9229:9229"  # Puerto debug
    environment:
      - NODE_ENV=development
      - DEBUG=accessibility-mw:*
      - ANALYSIS_API_URL=http://msanalysis-api:8082/api
      - USERS_API_URL=http://msusers-api:8081/api
      - REPORTS_API_URL=http://msreports-api:8083/api
      - BROWSER_POOL_SIZE=2
      - TIMEOUT=30000
    volumes:
      - .:/app
      - /app/node_modules
    networks:
      - accessibility-shared
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    shm_size: '2gb'  # Memoria compartida para navegadores
```

#### **Producción (docker-compose.prod.yml)**
```yaml
version: '3.8'
services:
  accessibility-mw:
    build:
      context: .
      target: runtime
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - ANALYSIS_API_URL=http://msanalysis-api:8082/api
      - USERS_API_URL=http://msusers-api:8081/api
      - REPORTS_API_URL=http://msreports-api:8083/api
      - BROWSER_POOL_SIZE=5
      - CACHE_TTL=300
      - TIMEOUT=60000
    networks:
      - accessibility-shared
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 3G
        reservations:
          cpus: '0.5' 
          memory: 1G
    shm_size: '2gb'
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /var/run

networks:
  accessibility-shared:
    external: true

volumes:
  redis-data:
```

### 🛡️ **Configuración de Seguridad Docker**

#### **Hardening del Contenedor**
```yaml
# Configuraciones de seguridad aplicadas
security_opt:
  - no-new-privileges:true    # Evita escalada de privilegios
  - apparmor=docker-default   # Profile AppArmor por defecto
  
# Usuario no-root
user: "1001:1001"

# Filesystem de solo lectura
read_only: true

# Capacidades limitadas
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE  # Solo para binding de puertos < 1024

# Recursos limitados
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 3G
      pids: 200
```

### 📊 **Configuración de Red Docker**

#### **Red Compartida entre Microservicios**
```bash
# Creación de red personalizada
docker network create --driver bridge \
  --subnet=172.20.0.0/16 \
  --gateway=172.20.0.1 \
  accessibility-shared

# Verificar conectividad
docker network inspect accessibility-shared
```

#### **Asignación de IPs Estáticas**
```yaml
services:
  accessibility-mw:
    networks:
      accessibility-shared:
        ipv4_address: 172.20.0.10
  
  msanalysis-api:
    networks:
      accessibility-shared:
        ipv4_address: 172.20.0.11
        
  msusers-api:
    networks:
      accessibility-shared:
        ipv4_address: 172.20.0.12
        
  msreports-api:
    networks:
      accessibility-shared:
        ipv4_address: 172.20.0.13
```

### 🔍 **Comandos Docker Útiles**

#### **Desarrollo y Debug**
```bash
# Build imagen de desarrollo
docker build --target development -t accessibility-mw:dev .

# Ejecutar con debug habilitado
docker run -it --rm \
  -p 3001:3001 \
  -p 9229:9229 \
  -e NODE_ENV=development \
  -e DEBUG=accessibility-mw:* \
  --name accessibility-mw-debug \
  accessibility-mw:dev

# Logs en tiempo real
docker logs -f accessibility-mw

# Shell interactivo en contenedor
docker exec -it accessibility-mw sh

# Inspeccionar filesystem del contenedor
docker exec accessibility-mw find /app -type f -name "*.js" | head -10
```

#### **Producción y Monitoreo**
```bash
# Build imagen de producción
docker build --target runtime -t accessibility-mw:prod .

# Ejecutar en producción
docker run -d \
  --name accessibility-mw-prod \
  -p 3001:3001 \
  --network accessibility-shared \
  --restart unless-stopped \
  --shm-size=2gb \
  --memory=3g \
  --cpus=2.0 \
  accessibility-mw:prod

# Estadísticas en tiempo real
docker stats accessibility-mw-prod

# Health check manual
docker exec accessibility-mw-prod curl -f http://localhost:3001/health || echo "Health check failed"
```

### 📋 **Docker Health Checks Avanzados**

#### **Health Check Personalizado**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "
    const http = require('http');
    const options = { host: 'localhost', port: 3001, path: '/health', timeout: 5000 };
    const req = http.request(options, (res) => {
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
    req.on('error', () => process.exit(1));
    req.on('timeout', () => process.exit(1));
    req.end();
  "
```

#### **Verificación Multi-Servicio**
```bash
# Script de verificación completa
cat > health-check-complete.sh << 'EOF'
#!/bin/bash
set -e

echo "🏥 Verificando salud completa del sistema..."

# Verificar middleware
curl -f http://localhost:3001/health || exit 1
echo "✅ Middleware OK"

# Verificar microservicios  
curl -f http://localhost:8081/health || exit 1
echo "✅ Users API OK"

curl -f http://localhost:8082/health || exit 1  
echo "✅ Analysis API OK"

curl -f http://localhost:8083/health || exit 1
echo "✅ Reports API OK"

echo "🎉 Sistema completamente saludable"
EOF

chmod +x health-check-complete.sh
./health-check-complete.sh
```

### 🔧 **Variables de Entorno Docker**

```bash
# Archivo .env para Docker Compose
cat > .env << 'EOF'
# === CONFIGURACIÓN DE APLICACIÓN ===
NODE_ENV=production
PORT=3001
DEBUG=

# === URLS DE MICROSERVICIOS ===
ANALYSIS_API_URL=http://msanalysis-api:8082/api
USERS_API_URL=http://msusers-api:8081/api  
REPORTS_API_URL=http://msreports-api:8083/api

# === CONFIGURACIÓN DE NAVEGADORES ===
BROWSER_POOL_SIZE=5
BROWSER_TIMEOUT=60000
BROWSER_USER_AGENT=accessibility-middleware/1.0

# === CONFIGURACIÓN DE CACHE ===
CACHE_ENABLED=true
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# === CONFIGURACIÓN DE MEMORIA ===
NODE_OPTIONS=--max-old-space-size=2048
SHM_SIZE=2gb

# === CONFIGURACIÓN DE SEGURIDAD ===
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=*
EOF
```

### 📊 **Monitoreo de Contenedores**

#### **Dashboard de Docker con Portainer**
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  portainer:
    image: portainer/portainer-ce:latest
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer-data:/data
    networks:
      - accessibility-shared

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 30 --cleanup
    networks:
      - accessibility-shared

volumes:
  portainer-data:
```

#### **Métricas con cAdvisor**
```yaml
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    networks:
      - accessibility-shared
```

---

## 🧪 **Testing y Calidad de Código**

### 📊 **Métricas Actuales de Testing**

| Categoría | Cantidad | Cobertura | Estado |
|-----------|----------|-----------|--------|
| **Test Suites** | 32 | - | ✅ Todas pasando |
| **Tests Totales** | 456 | - | ✅ Todos pasando |
| **Statements** | - | 72.25% | 🟡 Objetivo: 80% |
| **Branches** | - | 61.22% | 🟡 Objetivo: 75% |
| **Functions** | - | 73.83% | 🟡 Objetivo: 85% |
| **Lines** | - | 72.61% | 🟡 Objetivo: 80% |

### 🏗️ **Arquitectura de Testing**

#### **Estructura de Tests**
```
tests/
├── unit/                          # Tests unitarios (287 tests)
│   ├── services/
│   │   ├── analysisService.test.ts      # Lógica de análisis
│   │   ├── browserPool.test.ts          # Pool de navegadores
│   │   ├── cacheService.test.ts         # Sistema de cache
│   │   └── microserviceClient.test.ts   # Cliente HTTP
│   ├── utils/
│   │   ├── validators.test.ts           # Validadores Zod
│   │   ├── formatters.test.ts           # Formateo de datos
│   │   └── wcagMapper.test.ts           # Mapeo WCAG automático
│   └── middleware/
│       ├── rateLimiter.test.ts          # Rate limiting
│       ├── errorHandler.test.ts         # Manejo de errores
│       └── authMiddleware.test.ts       # Autenticación
├── integration/                   # Tests de integración (134 tests)
│   ├── api/
│   │   ├── analyze.test.ts              # Endpoint principal
│   │   ├── health.test.ts               # Health checks
│   │   └── monitoring.test.ts           # Métricas
│   ├── microservices/
│   │   ├── analysisIntegration.test.ts  # MS Analysis
│   │   ├── usersIntegration.test.ts     # MS Users
│   │   └── reportsIntegration.test.ts   # MS Reports
│   └── database/
│       └── persistenceIntegration.test.ts
├── e2e/                          # Tests end-to-end (35 tests)
│   ├── fullAnalysisFlow.test.ts        # Flujo completo
│   ├── multiToolAnalysis.test.ts       # Análisis multi-herramienta
│   └── performanceTest.test.ts         # Tests de rendimiento
└── fixtures/                     # Datos de prueba
    ├── html/                           # HTML de prueba
    ├── mockResponses/                  # Respuestas mock
    └── testUrls.ts                     # URLs de prueba
```

### ⚡ **Comandos de Testing**

#### **Tests Básicos**
```bash
# Suite completa (456 tests en ~45s)
npm run test

# Solo tests unitarios (287 tests en ~12s)
npm run test:unit

# Solo tests de integración (134 tests en ~28s)
npm run test:integration

# Solo tests E2E (35 tests en ~2min)
npm run test:e2e

# Tests con cobertura detallada
npm run test:coverage

# Tests en modo watch (desarrollo)
npm run test:watch
```

### 🎯 **Objetivos de Calidad**

| Métrica | Actual | Objetivo Q2 2024 | Plan de Mejora |
|---------|--------|------------------|----------------|
| **Test Coverage** | 72.25% | 85% | Agregar tests para edge cases |
| **Branch Coverage** | 61.22% | 80% | Tests para paths de error |
| **E2E Tests** | 35 | 50 | Escenarios de usuario reales |
| **Performance Tests** | Básicos | Avanzados | Load testing con K6 |

---

## 📈 **Sistema de Métricas y Monitoreo**

### Health Score (Puntuación de Salud 0-100)

El sistema calcula automáticamente un score de salud basado en múltiples factores:

### 📊 **Componentes del Health Score**

| Componente | Peso | Criterios de Evaluación |
|------------|------|------------------------|
| **Browser Pool Health** | 25% | Navegadores disponibles, tiempo de respuesta, errores |
| **Microservices Connectivity** | 25% | Conectividad a Analysis, Users, Reports APIs |
| **System Resources** | 20% | Uso de CPU, memoria, disco |
| **Cache Performance** | 15% | Hit rate, memoria utilizada, tiempo de respuesta |
| **Error Rate** | 15% | Tasa de errores en últimos 5 minutos |

### 🖥️ **Dashboard de Monitoreo**

Accede al dashboard completo en: `http://localhost:3001/api/monitoring/dashboard`

#### **Métricas en Tiempo Real**
```json
{
  "timestamp": "2025-01-31T10:30:00.000Z",
  "healthScore": 95,
  "system": {
    "uptime": 3600000,
    "memory": {
      "used": 156.7,
      "total": 3072,
      "percentage": 5.1,
      "heap": {
        "used": 89.2,
        "total": 134.7
      }
    },
    "cpu": {
      "usage": 2.4,
      "load": [0.2, 0.1, 0.0]
    },
    "disk": {
      "usage": 68.3,
      "available": 245.8
    }
  },
  "browserPool": {
    "total": 5,
    "available": 3,
    "active": 2,
    "errors": 0,
    "averageResponseTime": 45,
    "poolHealth": "healthy"
  },
  "microservices": {
    "analysis": {
      "url": "http://msanalysis-api:8082",
      "status": "up",
      "responseTime": 120,
      "lastCheck": "2025-01-31T10:29:45.000Z",
      "errorRate": 0.2
    },
    "users": {
      "url": "http://msusers-api:8081", 
      "status": "up",
      "responseTime": 89,
      "lastCheck": "2025-01-31T10:29:45.000Z",
      "errorRate": 0.0
    },
    "reports": {
      "url": "http://msreports-api:8083",
      "status": "up", 
      "responseTime": 156,
      "lastCheck": "2025-01-31T10:29:45.000Z",
      "errorRate": 0.1
    }
  },
  "cache": {
    "entries": 47,
    "hitRate": 85.2,
    "memoryUsage": 12.3,
    "maxMemory": 50.0,
    "averageResponseTime": 2.1
  },
  "performance": {
    "requestsPerMinute": 23,
    "averageAnalysisTime": 2847,
    "successRate": 98.7,
    "errorRate": 1.3
  }
}
```

### 🔍 **Métricas Detalladas por Endpoint**

#### **Análisis de Performance por Herramienta**
```bash
# Métricas específicas de herramientas
curl http://localhost:3001/metrics/tools

# Respuesta ejemplo:
{
  "axe-core": {
    "totalAnalyses": 234,
    "averageTime": 1240,
    "successRate": 99.1,
    "version": "4.10.3",
    "lastUpdate": "2025-01-31T09:15:00.000Z"
  },
  "equal-access": {
    "totalAnalyses": 198,
    "averageTime": 1847,
    "successRate": 97.5,
    "version": "4.0.8",
    "lastUpdate": "2025-01-31T09:15:00.000Z"
  }
}
```

#### **Métricas de Browser Pool**
```bash
# Estadísticas detalladas del pool de navegadores
curl http://localhost:3001/metrics/browser-pool

# Respuesta ejemplo:
{
  "pool": {
    "maxSize": 5,
    "currentSize": 5,
    "available": 3,
    "active": 2,
    "creating": 0,
    "idle": 3
  },
  "browsers": [
    {
      "id": "browser_1",
      "status": "idle",
      "uptime": 1500000,
      "requestsHandled": 45,
      "lastActivity": "2025-01-31T10:25:00.000Z"
    },
    {
      "id": "browser_2", 
      "status": "active",
      "uptime": 1200000,
      "requestsHandled": 32,
      "currentTask": "analyzing_html",
      "startTime": "2025-01-31T10:29:00.000Z"
    }
  ],
  "metrics": {
    "totalRequestsHandled": 1247,
    "averageWaitTime": 156,
    "maxWaitTime": 2340,
    "errorRate": 0.2,
    "restartCount": 2
  }
}
```

### 📈 **Integración con Grafana y Prometheus**

#### **Métricas en Formato Prometheus**
```bash
# Endpoint Prometheus para Grafana
curl http://localhost:3001/metrics?format=prometheus

# Output ejemplo:
# HELP accessibility_mw_requests_total Total number of requests
# TYPE accessibility_mw_requests_total counter
accessibility_mw_requests_total{method="POST",endpoint="/api/analyze"} 1247

# HELP accessibility_mw_analysis_duration_seconds Duration of analysis operations
# TYPE accessibility_mw_analysis_duration_seconds histogram
accessibility_mw_analysis_duration_seconds_bucket{tool="axe-core",le="1"} 234
accessibility_mw_analysis_duration_seconds_bucket{tool="axe-core",le="2"} 456
accessibility_mw_analysis_duration_seconds_bucket{tool="axe-core",le="5"} 789

# HELP accessibility_mw_browser_pool_size Current browser pool size
# TYPE accessibility_mw_browser_pool_size gauge
accessibility_mw_browser_pool_size{status="available"} 3
accessibility_mw_browser_pool_size{status="active"} 2

# HELP accessibility_mw_health_score Current system health score
# TYPE accessibility_mw_health_score gauge
accessibility_mw_health_score 95
```

### 📊 **Alerting y Notificaciones**

#### **Configuración de Alertas Automáticas**
```javascript
// Configuración de alertas en config/monitoring.js
const alertingConfig = {
  healthScore: {
    critical: 50,      // < 50: Alerta crítica inmediata
    warning: 70,       // 50-70: Alerta de advertencia  
    notification: {
      email: true,
      slack: true,
      webhook: 'https://hooks.slack.com/services/...'
    }
  },
  browserPool: {
    maxErrorRate: 5,   // > 5% errores: Alerta
    minAvailable: 1,   // < 1 navegador disponible: Crítico
  },
  microservices: {
    maxResponseTime: 5000,  // > 5s respuesta: Advertencia
    maxDowntime: 30000,     // > 30s sin respuesta: Crítico
  },
  memory: {
    maxUsage: 85,      // > 85% memoria: Advertencia
    criticalUsage: 95, // > 95% memoria: Crítico
  }
}
```

### 🎯 **Comandos de Monitoreo Manual**

#### **Verificación Rápida del Sistema**
```bash
# Health check básico
curl http://localhost:3001/health

# Health check completo con métricas
curl "http://localhost:3001/health?deep=true&include=metrics"

# Estado del browser pool
curl http://localhost:3001/api/monitoring/browser-pool

# Métricas de rendimiento últimos 5 minutos
curl "http://localhost:3001/metrics?timeframe=5m"

# Reset manual del browser pool (development only)
curl -X POST http://localhost:3001/api/monitoring/reset-pool
```

#### **Monitoreo Continuo (PowerShell)**
```powershell
# Script de monitoreo continuo 
while ($true) {
    Clear-Host
    $health = Invoke-RestMethod "http://localhost:3001/health?deep=true"
    
    Write-Host "🖥️ ACCESSIBILITY MIDDLEWARE - MONITOR" -ForegroundColor Green
    Write-Host "============================================"
    Write-Host "🏥 Health Score: $($health.healthScore)/100" -ForegroundColor $(if($health.healthScore -gt 80) {"Green"} else {"Yellow"})
    Write-Host "⏱️  Uptime: $([math]::Round($health.uptime/1000/60)) minutes"
    Write-Host "🧠 Memory: $([math]::Round($health.system.memory.percentage,1))%"
    Write-Host "⚡ CPU: $($health.system.cpu.usage)%"
    Write-Host "🌐 Browser Pool: $($health.services.browserPool.available)/$($health.services.browserPool.total) available"
    Write-Host ""
    Write-Host "📡 Microservices:"
    Write-Host "  Analysis: $($health.services.analysisService.status) ($($health.services.analysisService.responseTime)ms)"
    Write-Host "  Users: $($health.services.usersService.status) ($($health.services.usersService.responseTime)ms)"
    Write-Host "  Reports: $($health.services.reportsService.status) ($($health.services.reportsService.responseTime)ms)"
    Write-Host ""
    Write-Host "Actualizando cada 5 segundos... (Ctrl+C para salir)"
    
    Start-Sleep -Seconds 5
}
```

---

## 🛠️ **Troubleshooting y Resolución de Problemas**

### 🚨 **Problemas Comunes y Soluciones**

#### **❌ Error: "Browser pool exhausted"**
```bash
# Problema: No hay navegadores disponibles en el pool
# Causa: Alto volumen de requests simultáneos o navegadores colgados

# ✅ Solución 1: Verificar estado del pool
curl http://localhost:3001/api/monitoring/browser-pool

# ✅ Solución 2: Reiniciar pool (development)
curl -X POST http://localhost:3001/api/monitoring/reset-pool

# ✅ Solución 3: Incrementar tamaño del pool
# Editar variable de entorno:
export BROWSER_POOL_SIZE=7  # Incrementar de 5 a 7
```

#### **❌ Error: "Microservice not responding"** 
```bash
# Problema: Un microservicio no responde
# Verificar estado de microservicios

# ✅ Verificar conectividad
curl http://localhost:8081/health  # Users API
curl http://localhost:8082/health  # Analysis API  
curl http://localhost:8083/health  # Reports API

# ✅ Si fallan, reiniciar microservicios
cd ../accessibility-ms-analysis && docker-compose restart
cd ../accessibility-ms-users && docker-compose restart
cd ../accessibility-ms-reports && docker-compose restart

# ✅ Verificar red Docker
docker network inspect accessibility-shared
```

#### **❌ Error: "TIMEOUT: Navigation timeout"**
```bash
# Problema: Timeout al cargar páginas web
# Causa: Página lenta o timeouts muy bajos

# ✅ Solución 1: Incrementar timeouts
export ANALYZE_TIMEOUT_MS=60000        # 60 segundos
export NAVIGATION_TIMEOUT_MS=30000     # 30 segundos

# ✅ Solución 2: Verificar conectividad de red
curl -I https://example.com  # Verificar si la URL es accesible

# ✅ Solución 3: Análisis de HTML directo en lugar de URL
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"inputType":"html","value":"<html>...</html>","tool":"axe","userId":1}'
```

#### **❌ Error: "High memory usage detected"**
```bash
# Problema: Uso elevado de memoria > 85%
# Verificar estado actual

# ✅ Verificar métricas de memoria
curl http://localhost:3001/health?deep=true | jq '.system.memory'

# ✅ Optimizar configuración
export CACHE_MAX_ENTRIES=50           # Reducir cache
export BROWSER_POOL_SIZE=3            # Reducir pool
export NODE_OPTIONS="--max-old-space-size=1024"  # Limitar heap

# ✅ Restart aplicación
docker restart accessibility-mw
```

### 🔧 **Comandos de Diagnóstico**

#### **Sistema General**
```bash
# Información completa del sistema
curl http://localhost:3001/api/system/info

# Logs detallados en tiempo real
docker logs -f accessibility-mw --tail 100

# Estadísticas del contenedor Docker
docker stats accessibility-mw

# Procesos internos del contenedor
docker exec accessibility-mw ps aux

# Uso de disco del contenedor
docker exec accessibility-mw df -h
```

#### **Diagnóstico de Red**
```bash
# Verificar conectividad interna entre contenedores
docker exec accessibility-mw ping msanalysis-api -c 3
docker exec accessibility-mw ping msusers-api -c 3  
docker exec accessibility-mw ping msreports-api -c 3

# Verificar resolución DNS
docker exec accessibility-mw nslookup msanalysis-api
docker exec accessibility-mw nslookup msusers-api
docker exec accessibility-mw nslookup msreports-api

# Test de conectividad HTTP interna
docker exec accessibility-mw curl -I http://msanalysis-api:8082/health
docker exec accessibility-mw curl -I http://msusers-api:8081/health
docker exec accessibility-mw curl -I http://msreports-api:8083/health
```

#### **Diagnóstico de Performance**
```bash
# Análisis de performance en tiempo real
curl "http://localhost:3001/metrics?detailed=true" | jq '.performance'

# Historial de análisis recientes
curl "http://localhost:3001/api/monitoring/recent-analyses?limit=10"

# Tiempo de respuesta por endpoint
curl "http://localhost:3001/metrics/endpoints" | jq

# Estadísticas de cache
curl "http://localhost:3001/metrics/cache" | jq '.cache'
```

### 📋 **Checklist de Troubleshooting**

#### **Antes de Reportar un Issue**
- [ ] ✅ Verificar health check: `curl http://localhost:3001/health`
- [ ] ✅ Revisar logs: `docker logs accessibility-mw --tail 50`
- [ ] ✅ Comprobar conectividad microservicios: `./health-check-complete.sh`
- [ ] ✅ Verificar recursos del sistema: `curl http://localhost:3001/health?deep=true`
- [ ] ✅ Reiniciar navegador pool: `curl -X POST http://localhost:3001/api/monitoring/reset-pool`
- [ ] ✅ Limpiar cache si es necesario: `curl -X DELETE http://localhost:3001/cache`

#### **Información para Issues**
```bash
# Generar reporte completo de diagnóstico
cat > diagnostic-report.sh << 'EOF'
#!/bin/bash
echo "🔍 ACCESSIBILITY MIDDLEWARE - DIAGNOSTIC REPORT"
echo "================================================"
echo "Timestamp: $(date)"
echo ""

echo "📊 SYSTEM INFO:"
curl -s http://localhost:3001/api/system/info | jq .
echo ""

echo "🏥 HEALTH STATUS:"  
curl -s http://localhost:3001/health?deep=true | jq .
echo ""

echo "📈 METRICS:"
curl -s http://localhost:3001/metrics | jq .
echo ""

echo "🐳 DOCKER STATUS:"
docker ps --filter name=accessibility
echo ""

echo "📋 RECENT LOGS (last 20 lines):"
docker logs accessibility-mw --tail 20
EOF

chmod +x diagnostic-report.sh
./diagnostic-report.sh > diagnostic-report.txt
```

### 🆘 **Escenarios de Emergencia**

#### **🔥 Sistema No Responde Completamente**
```bash
# 1. Verificar si el contenedor está running
docker ps --filter name=accessibility-mw

# 2. Si no está running, iniciar
docker start accessibility-mw

# 3. Si sigue sin responder, restart completo
docker restart accessibility-mw

# 4. Verificar logs para errores críticos
docker logs accessibility-mw --tail 100 | grep -i "error\|critical\|fatal"

# 5. Si persiste, rebuild imagen
docker build -t accessibility-mw . && docker restart accessibility-mw
```

#### **🚨 Memory Leak Detectado**
```bash
# 1. Verificar uso actual de memoria
docker stats accessibility-mw --no-stream

# 2. Si > 90%, restart inmediato
docker restart accessibility-mw

# 3. Monitorear post-restart
watch "docker stats accessibility-mw --no-stream"

# 4. Si se repite, reducir configuración
export BROWSER_POOL_SIZE=2
export CACHE_MAX_ENTRIES=25
docker restart accessibility-mw
```

#### **⚠️ Microservicios Down**
```bash
# 1. Verificar cuál está down
curl http://localhost:8081/health  # Users
curl http://localhost:8082/health  # Analysis  
curl http://localhost:8083/health  # Reports

# 2. Restart específico del microservicio down
# Ejemplo para Analysis:
cd ../accessibility-ms-analysis
docker-compose restart

# 3. Verificar reconexión del middleware
curl http://localhost:3001/health?deep=true | jq '.services'

# 4. Si persiste, restart de toda la red
docker network disconnect accessibility-shared accessibility-mw
docker network connect accessibility-shared accessibility-mw
```

---

## 🤝 **Contribución y Desarrollo**

### 🚀 **Guía de Contribución**

#### **Prerequisites**
- **Node.js**: ≥ 20.0.0 LTS
- **TypeScript**: ≥ 5.9.0  
- **Docker**: ≥ 24.0.0
- **Git**: ≥ 2.40.0

#### **Setup Inicial para Desarrollo**
```bash
# 1. Fork y clone del repositorio
git clone https://github.com/tu-usuario/accessibility-mw.git
cd accessibility-mw

# 2. Instalar dependencias
npm install

# 3. Configurar entorno de desarrollo
cp .env.template .env.development
# Editar .env.development con configuraciones locales

# 4. Inicializar microservicios (requeridos)
cd ../accessibility-ms-analysis && docker-compose up -d
cd ../accessibility-ms-users && docker-compose up -d
cd ../accessibility-ms-reports && docker-compose up -d
cd ../accessibility-mw

# 5. Ejecutar en modo desarrollo
npm run dev

# 6. Verificar configuración
curl http://localhost:3001/health?deep=true
```

### 📝 **Estándares de Código**

#### **Style Guide y Linting**
```bash
# Verificar código antes de commit
npm run lint                    # ESLint + Prettier
npm run type-check             # Verificación TypeScript
npm run test                   # Suite completa de tests

# Auto-fix de problemas menores
npm run lint:fix
npm run format                 # Prettier formatting
```

#### **Configuración de VSCode (Recomendada)**
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.format.enable": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "jest.testExplorer.enabled": true,
  "files.associations": {
    "*.env.*": "properties"
  }
}
```

#### **Extensiones Recomendadas**
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode", 
    "dbaeumer.vscode-eslint",
    "orta.vscode-jest",
    "ms-playwright.playwright",
    "bradlc.vscode-tailwindcss",
    "humao.rest-client"
  ]
}
```

### 🔄 **Workflow de Desarrollo**

#### **Branching Strategy (Git Flow)**
```bash
# Feature development
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad
# ... desarrollo y commits ...
git push origin feature/nueva-funcionalidad
# Crear Pull Request hacia develop

# Hotfix
git checkout main
git checkout -b hotfix/fix-critico
# ... fix y commits ...
git push origin hotfix/fix-critico  
# Crear Pull Request hacia main y develop

# Release
git checkout develop
git checkout -b release/v1.2.0
# ... preparación release ...
git push origin release/v1.2.0
# Pull Request hacia main
```

#### **Commit Message Convention**
```bash
# Formato: <type>(<scope>): <description>
# Ejemplos:
git commit -m "feat(analyzer): add axe-core 4.11 support"
git commit -m "fix(browser-pool): resolve memory leak in idle browsers" 
git commit -m "docs(readme): update API examples with new endpoints"
git commit -m "test(integration): add microservice connectivity tests"
git commit -m "refactor(cache): improve LRU cache performance"
git commit -m "perf(analyzer): reduce analysis time by 15%"
```

#### **Tipos de Commit Válidos**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bugs
- `docs`: Documentación
- `test`: Tests
- `refactor`: Refactoring de código
- `perf`: Mejoras de performance
- `ci`: Cambios en CI/CD
- `build`: Cambios en build system
- `chore`: Mantenimiento

### 🧪 **Testing Guidelines**

#### **Escribir Tests de Calidad**
```typescript
// ✅ Buen ejemplo de test
describe('AnalysisService', () => {
  describe('analyze HTML', () => {
    it('should detect missing alt text in images', async () => {
      // Arrange
      const htmlWithoutAlt = '<img src="test.jpg">';
      const service = new AnalysisService();

      // Act  
      const result = await service.analyze({
        inputType: 'html',
        value: htmlWithoutAlt,
        tool: 'axe',
        userId: 1
      });

      // Assert
      expect(result.data.results[0].items)
        .toContainEqual(
          expect.objectContaining({
            id: 'image-alt',
            type: 'violation'
          })
        );
    });
  });
});
```

#### **Coverage Requirements**
- **Minimum coverage**: 70% (current)
- **Target coverage**: 85% (goal)  
- **Critical paths**: 95% (analysis, browser-pool, microservice-client)

### 📋 **Pull Request Checklist**

#### **Antes de Crear PR**
- [ ] ✅ Tests pasando: `npm run test`
- [ ] ✅ Linting limpio: `npm run lint`
- [ ] ✅ TypeScript sin errores: `npm run type-check`
- [ ] ✅ Build exitoso: `npm run build`
- [ ] ✅ Health check funcional: `curl localhost:3001/health`
- [ ] ✅ Documentación actualizada si es necesario
- [ ] ✅ CHANGELOG.md actualizado para breaking changes

#### **Template de Pull Request**
```markdown
## 📝 Descripción
Breve descripción de los cambios realizados.

## 🎯 Tipo de Cambio
- [ ] 🐛 Bug fix (cambio que corrige un issue)  
- [ ] ✨ Nueva funcionalidad (cambio que agrega funcionalidad)
- [ ] 💥 Breaking change (cambio que puede romper funcionalidad existente)
- [ ] 📚 Documentación (solo cambios de documentación)
- [ ] 🎨 Refactoring (cambio que ni corrige bug ni agrega funcionalidad)

## 🧪 Testing
- [ ] Tests unitarios agregados/actualizados
- [ ] Tests de integración agregados/actualizados  
- [ ] Tests E2E agregados/actualizados
- [ ] Tests manuales realizados

## 📋 Checklist
- [ ] Mi código sigue las convenciones del proyecto
- [ ] He realizado self-review de mis cambios
- [ ] He comentado código complejo donde es necesario
- [ ] He actualizado la documentación correspondiente
- [ ] Mis cambios no generan nuevos warnings
- [ ] He agregado tests que prueban mis cambios
- [ ] Todos los tests nuevos y existentes pasan

## 📸 Screenshots (si aplica)
<!-- Agregar screenshots para cambios de UI -->

## 🔗 Issue Relacionado
Closes #[número-de-issue]
```

### 🛡️ **Code Review Guidelines**

#### **Para Reviewers**
- ✅ Verificar que los tests cubren los edge cases
- ✅ Validar que el código es readable y maintainable
- ✅ Confirmar que no hay hardcoded values
- ✅ Revisar impacto en performance
- ✅ Verificar manejo adecuado de errores
- ✅ Confirmar que la documentación es adecuada

#### **Performance Considerations**
- ⚡ Browser pool efficiency
- ⚡ Memory usage patterns
- ⚡ Cache hit rates
- ⚡ Microservice call optimization
- ⚡ Bundle size impact

### 🚀 **Release Process**

#### **Versionado Semántico**
- **Major** (x.0.0): Breaking changes, arquitectura nueva
- **Minor** (1.x.0): Nuevas funcionalidades, compatibles hacia atrás
- **Patch** (1.1.x): Bug fixes, mejoras menores

#### **Checklist de Release**
```bash
# 1. Preparar release branch
git checkout develop
git checkout -b release/v1.2.0

# 2. Actualizar versiones
npm version minor  # o major/patch según corresponda
# Actualizar CHANGELOG.md
# Actualizar README.md si es necesario

# 3. Testing completo
npm run test
npm run test:e2e
npm run build

# 4. Crear release
git commit -am "chore: prepare release v1.2.0"
git push origin release/v1.2.0

# 5. Merge a main via PR
# 6. Tag release en GitHub
# 7. Merge release a develop
```

---

## 📚 **Referencias y Recursos**

### 🔗 **Documentación Oficial**

#### **Herramientas de Análisis**
- **axe-core**: [deque.com/axe](https://www.deque.com/axe/)
  - [Documentación API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)
  - [Reglas de axe-core](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
  - [axe-core 4.10.3 Release Notes](https://github.com/dequelabs/axe-core/releases/tag/v4.10.3)

- **IBM Equal Access**: [ibm.com/able](https://www.ibm.com/able/)
  - [Accessibility Checker](https://github.com/IBMa/equal-access)
  - [Equal Access 4.0.8 Documentation](https://github.com/IBMa/equal-access/wiki)
  - [IBM Accessibility Guidelines](https://www.ibm.com/able/guidelines/)

#### **Estándares de Accesibilidad**
- **WCAG 2.2**: [w3.org/WAI/WCAG22](https://www.w3.org/WAI/WCAG22/)
  - [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
  - [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
  - [WCAG 2.2 Techniques](https://www.w3.org/WAI/WCAG22/Techniques/)

- **WCAG 2.1**: [w3.org/WAI/WCAG21](https://www.w3.org/WAI/WCAG21/)
- **WAI-ARIA**: [w3.org/WAI/ARIA](https://www.w3.org/WAI/ARIA/)
- **Section 508**: [section508.gov](https://www.section508.gov/)

### 🛠️ **Tecnologías Core**

#### **Node.js y TypeScript**
- **Node.js 20 LTS**: [nodejs.org](https://nodejs.org/)
  - [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
  - [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)

- **TypeScript 5.9**: [typescriptlang.org](https://www.typescriptlang.org/)
  - [TypeScript Handbook](https://www.typescriptlang.org/docs/)
  - [TSConfig Reference](https://www.typescriptlang.org/tsconfig)

#### **Web Scraping y Testing**
- **Playwright 1.55**: [playwright.dev](https://playwright.dev/)
  - [Playwright API](https://playwright.dev/docs/api/class-playwright)
  - [Browser Contexts](https://playwright.dev/docs/browser-contexts)
  - [Performance Best Practices](https://playwright.dev/docs/performance)

- **Express.js 5.1**: [expressjs.com](https://expressjs.com/)
  - [Express Performance](https://expressjs.com/en/advanced/best-practice-performance.html)
  - [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)

### 🧪 **Testing y Calidad**

#### **Jest Testing Framework**
- **Jest**: [jestjs.io](https://jestjs.io/)
  - [Jest Configuration](https://jestjs.io/docs/configuration)
  - [Testing Async Code](https://jestjs.io/docs/asynchronous)
  - [Mock Functions](https://jestjs.io/docs/mock-functions)

#### **Code Quality Tools**
- **ESLint**: [eslint.org](https://eslint.org/)
  - [@typescript-eslint](https://typescript-eslint.io/)
  - [ESLint Rules](https://eslint.org/docs/latest/rules/)

- **Prettier**: [prettier.io](https://prettier.io/)
- **Husky**: [typicode.github.io/husky](https://typicode.github.io/husky/)

### 🐳 **Containerización y DevOps**

#### **Docker**
- **Docker**: [docker.com](https://www.docker.com/)
  - [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
  - [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
  - [Docker Security](https://docs.docker.com/engine/security/)

- **Docker Compose**: [docs.docker.com/compose](https://docs.docker.com/compose/)

#### **Monitoring y Observability**
- **Prometheus**: [prometheus.io](https://prometheus.io/)
  - [Node.js Client](https://github.com/siimon/prom-client)
  - [Best Practices](https://prometheus.io/docs/practices/naming/)

- **Grafana**: [grafana.com](https://grafana.com/)
  - [Dashboard Examples](https://grafana.com/grafana/dashboards/)

### 📖 **Recursos de Aprendizaje**

#### **Accesibilidad Web**
- **WebAIM**: [webaim.org](https://webaim.org/)
  - [WCAG Checklist](https://webaim.org/standards/wcag/checklist)
  - [Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

- **a11y Project**: [a11yproject.com](https://www.a11yproject.com/)
  - [Accessibility Checklist](https://www.a11yproject.com/checklist/)
  - [Resources](https://www.a11yproject.com/resources/)

#### **Performance y Optimización**
- **Web Performance**: [web.dev/performance](https://web.dev/performance/)
- **Node.js Performance**: [nodejs.org/en/docs/guides/simple-profiling](https://nodejs.org/en/docs/guides/simple-profiling/)

### 🏗️ **Arquitectura de Microservicios**

#### **Documentación del Ecosistema**
- **accessibility-ms-analysis**: [GitHub Repository](../accessibility-ms-analysis/README.md)
  - API de análisis y persistencia
  - Base de datos MySQL para resultados
  - Endpoints RESTful para CRUD operations

- **accessibility-ms-users**: [GitHub Repository](../accessibility-ms-users/README.md)  
  - Gestión de usuarios y autenticación
  - Profiles y configuraciones de usuario
  - JWT authentication y authorization

- **accessibility-ms-reports**: [GitHub Repository](../accessibility-ms-reports/README.md)
  - Generación de reportes PDF/HTML
  - Templates personalizables
  - Agregación de métricas y dashboard

- **accessibility-gw**: [GitHub Repository](../accessibility-gw/README.md)
  - API Gateway con Ocelot (.NET)
  - Load balancing y rate limiting
  - Centralized logging y monitoring

#### **Patrones de Diseño**
- **Microservices Patterns**: [microservices.io](https://microservices.io/)
- **API Gateway Pattern**: [microservices.io/patterns/apigateway](https://microservices.io/patterns/apigateway.html)
- **Database per Microservice**: [microservices.io/patterns/data/database-per-service](https://microservices.io/patterns/data/database-per-service.html)

### 🔧 **Herramientas de Desarrollo**

#### **IDEs y Editores**
- **VS Code Extensions** (recomendadas):
  - REST Client para testing de APIs
  - Thunder Client como alternativa a Postman
  - Docker extension para manejo de contenedores
  - GitLens para Git enhancement

#### **API Testing**
- **Postman**: [postman.com](https://www.postman.com/)
- **Insomnia**: [insomnia.rest](https://insomnia.rest/)
- **curl**: [curl.se](https://curl.se/)

### 🌐 **Comunidad y Soporte**

#### **Forums y Comunidades**
- **WebAIM Discussion List**: [webaim.org/discussion](https://webaim.org/discussion/)
- **a11y Slack**: [web-a11y.slack.com](https://web-a11y.slack.com/)
- **Stack Overflow**: Tags relevantes
  - [`accessibility`](https://stackoverflow.com/questions/tagged/accessibility)
  - [`axe-core`](https://stackoverflow.com/questions/tagged/axe-core)
  - [`wcag`](https://stackoverflow.com/questions/tagged/wcag)

#### **Blogs y Newsletters**
- **WebAIM Blog**: [webaim.org/blog](https://webaim.org/blog/)
- **Deque Blog**: [deque.com/blog](https://www.deque.com/blog/)
- **a11y Weekly**: [a11yweekly.com](https://a11yweekly.com/)

### 📄 **Licencias y Legal**

#### **Open Source Licenses**
- **MIT License**: Este proyecto
- **Mozilla Public License 2.0**: axe-core
- **Apache License 2.0**: IBM Equal Access
- **ISC License**: Node.js y muchos packages de npm

#### **Compliance y Normativas**
- **ADA Compliance**: [ada.gov](https://www.ada.gov/)
- **EN 301 549**: [European Standard](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/)
- **AODA**: [Ontario Accessibility Standards](https://www.ontario.ca/page/accessibility-ontario)

---

## 📊 **Métricas del Proyecto**

### 📈 **Estadísticas de Código (Actualizadas)**

| Métrica | Valor | Contexto |
|---------|-------|----------|
| **Líneas de código TypeScript** | 8,547 | Código principal + tests |
| **Archivos TypeScript** | 35+ | Estructura modular |
| **Dependencias npm** | 47 | Dependencias de producción |
| **Dev Dependencies** | 28 | Herramientas de desarrollo |
| **Tamaño bundle compilado** | 258.38 KB | Optimizado para producción |
| **Tiempo de build** | 3min 12s | Docker multi-stage build |
| **Test coverage** | 72.25% | En crecimiento hacia 85% |

### 🏆 **Logros y Reconocimientos**

- ✅ **28.3% reducción** en tamaño de imagen Docker
- ✅ **456 tests** pasando en CI/CD  
- ✅ **Zero downtime** deployment capability
- ✅ **Dual analysis engine** (axe-core + IBM Equal Access)
- ✅ **Full WCAG 2.2 Level AAA** support
- ✅ **RESTful API** con OpenAPI 3.1.0 spec
- ✅ **Microservices integration** con persistencia automática

---

**🎉 ¡Gracias por contribuir al proyecto Accessibility Middleware!**

*Para más información, contacta al equipo de desarrollo o crea un issue en GitHub.*

---

*Última actualización: Enero 31, 2025 | Versión: 1.0.0 | Documentación completamente modernizada ✨*

### Componentes Monitoreados

#### 🖥️ Sistema

- **Memory Usage**: Uso de memoria RAM
- **CPU Load**: Carga de procesador
- **Uptime**: Tiempo en funcionamiento
- **Node.js Heap**: Memoria heap de Node.js

#### 📡 Requests & Performance

- **Request Success Rate**: % de requests exitosos
- **Average Response Time**: Tiempo promedio de respuesta
- **Analysis Duration**: Tiempo por herramienta (axe-core, equal-access)
- **Concurrent Requests**: Requests simultáneos activos

#### 💾 Cache System

- **Hit Rate**: % de hits en cache (objetivo: >80%)
- **Memory Usage**: Memoria utilizada por cache
- **Entry Count**: Número de entradas almacenadas
- **Cleanup Events**: Eventos de limpieza automática

#### 🌐 Browser Pool

- **Pool Size**: Navegadores disponibles
- **Active Browsers**: Navegadores en uso
- **Idle Browsers**: Navegadores esperando
- **Connection Health**: Estado de conectividad

#### 🔗 External Dependencies

- **Analysis Service**: Estado del microservicio (puerto 8082)
- **Database Connection**: Conectividad a MySQL
- **Response Times**: Latencia de servicios externos

### 🚨 Sistema de Alertas Automáticas

El sistema incluye alertas inteligentes con cooldown para evitar spam:

```bash
# Configurar alertas en .env
HEALTH_ALERTS_ENABLED=true
HEALTH_WEBHOOK_URL=https://hooks.slack.com/...
HEALTH_ALERT_COOLDOWN_MS=300000  # 5 minutos entre alertas
```

#### Condiciones de Alerta:

| Condición                 | Nivel       | Descripción                 |
| ------------------------- | ----------- | --------------------------- |
| Cache > 90% memoria       | ⚠️ Warning  | Cache cerca del límite      |
| Health Score < 70         | 🚨 Error    | Problemas de performance    |
| Browser pool desconectado | 🔴 Critical | Sin navegadores disponibles |
| Microservicio no responde | 🔴 Critical | Análisis service down       |
| Memory usage > 85%        | ⚠️ Warning  | Memoria alta                |

### 📊 Dashboard en Tiempo Real

Accede al dashboard completo en: `http://localhost:3001/api/monitoring/dashboard`

```json
{
  "healthScore": 95,
  "status": "excellent",
  "lastUpdate": "2025-08-24T10:30:00.000Z",
  "services": {
    "middleware": { "status": "up", "responseTime": 12 },
    "analysisService": { "status": "up", "responseTime": 45 },
    "browserPool": { "status": "healthy", "available": 3 }
  },
  "metrics": {
    "requestsPerMinute": 25,
    "successRate": 98.5,
    "cacheHitRate": 85.2,
    "averageAnalysisTime": 1847
  }
}
```

## � **Bundle Monitoring System**

### 🎯 Sistema de Bundle Monitoring Automático

**Implementado recientemente**: Sistema completo de monitoreo automático del bundle en CI/CD que proporciona análisis detallados de tamaño, dependencias y optimizaciones.

#### 🚀 Características Principales

- **📊 Análisis Automático**: Monitoreo continuo del tamaño del bundle en cada build
- **🔍 Detección de Dependencias**: Identificación de librerías pesadas y optimizaciones
- **📈 Dashboard Web**: Interface web interactiva para visualizar métricas
- **⚡ CI/CD Integration**: Ejecución automática en GitHub Actions
- **📋 Reportes Detallados**: Generación automática de reportes en Markdown y JSON

#### 🛠️ Componentes del Sistema

```
📦 Bundle Monitoring Architecture
├── scripts/bundle-monitor.js          # Script principal de análisis
├── .github/workflows/bundle-monitoring.yml    # CI/CD workflow
├── src/routes/bundle.route.js         # API endpoints del dashboard  
├── .bundlewatch.config.json          # Configuración de límites
└── reports/bundle/                    # Reportes generados automáticamente
```

#### 📊 Métricas del Bundle (Estado Actual)

```bash
📦 Bundle Size: 258.38 KB
📁 Files Analyzed: 35
🎯 Status: HEALTHY (well below 10MB limit)
⚡ Performance: Optimal
🔍 Dependencies: Clean (no heavy packages detected)
```

#### 🔧 API Endpoints del Bundle Monitor

```bash
# Estado actual del bundle
GET /api/bundle/status
# Respuesta: { "totalSize": "258.38 KB", "files": 35, "status": "HEALTHY" }

# Reporte detallado completo  
GET /api/bundle/report
# Incluye: análisis de dependencias, recomendaciones, métricas históricas

# Historial de análisis
GET /api/bundle/history
# Timeline de cambios en el tamaño del bundle

# Dashboard web interactivo
GET /api/bundle/dashboard
# Interface HTML completa para visualización de métricas
```

#### ⚙️ Configuración y Límites

El sistema utiliza múltiples herramientas para análisis comprehensivo:

```json
// .bundlewatch.config.json
{
  "files": [
    {
      "path": "./dist/server.js",
      "maxSize": "10MB",
      "compression": "gzip"
    }
  ],
  "ci": {
    "trackBranches": ["main", "master", "develop"],
    "repoBranch": "master"
  }
}
```

#### 🔄 CI/CD Workflow Automático

El workflow se ejecuta automáticamente en:

- ✅ **Push events**: En cada push a ramas principales
- ✅ **Pull Requests**: Análisis de impacto en PRs
- ✅ **Schedule**: Análisis diarios automáticos (2 AM UTC)
- ✅ **Manual trigger**: Ejecución manual desde GitHub Actions

#### 📋 Reportes y Alertas

**Reporte Markdown Automático**:
```bash
# 📦 Bundle Analysis Report

## 📊 Bundle Metrics
- **Total Size**: 258.38 KB
- **Files**: 35 analyzed
- **Status**: 🟢 HEALTHY
- **Performance**: ⚡ Optimal

## 📈 Analysis Results
- ✅ Size Limit: Well below 10MB threshold
- ✅ Dependencies: No heavy packages detected  
- ✅ Optimization: Bundle is well optimized

## 🔍 Recommendations
- Continue monitoring for new dependencies
- Consider code splitting for larger features
- Regular dependency audits recommended
```

**GitHub Actions Summary**:
El sistema genera automáticamente resúmenes en GitHub Actions con:
- 📊 Métricas actuales vs. límites
- 📈 Comparación con builds anteriores  
- ⚠️ Alertas si se exceden límites
- 🎯 Recomendaciones de optimización

#### 🚨 Sistema de Alertas Inteligente

**Condiciones de Alerta**:

| Condición | Nivel | Acción |
|-----------|-------|---------|
| Bundle > 8MB | ⚠️ Warning | GitHub Actions summary alert |
| Bundle > 10MB | 🚨 Error | Build failure + notification |
| Growth > 20% | 📈 Info | Size increase notification |
| New heavy dep | 🔍 Review | Dependency review required |

#### 🛠️ Comandos de Bundle Monitoring

```bash
# Ejecutar análisis manual
npm run bundle:analyze
node scripts/bundle-monitor.js

# Generar reporte JSON
npm run bundle:report
node scripts/bundle-monitor.js --json

# Ver dashboard web (servidor debe estar corriendo)
npm run dev
# Luego visitar: http://localhost:3001/api/bundle/dashboard

# Limpiar reportes antiguos
npm run bundle:clean
```

#### 🔧 Configuración Avanzada

**Variables de entorno para Bundle Monitoring**:

```bash
# Bundle monitoring configuration
BUNDLE_MONITOR_ENABLED=true              # Habilitar/deshabilitar monitoring
BUNDLE_SIZE_LIMIT_MB=10                  # Límite de tamaño en MB
BUNDLE_ANALYSIS_TIMEOUT=30000            # Timeout para análisis (ms)
BUNDLE_HISTORY_RETENTION_DAYS=30         # Días de retención de histórico
BUNDLE_ALERTS_WEBHOOK_URL=...            # URL para notificaciones Slack/Discord
```

**Integración con herramientas externas**:

```json
// package.json - Scripts adicionales
{
  "scripts": {
    "bundle:analyze": "node scripts/bundle-monitor.js",
    "bundle:report": "node scripts/bundle-monitor.js --json",
    "bundle:dashboard": "start http://localhost:3001/api/bundle/dashboard",
    "bundle:clean": "rimraf reports/bundle/*"
  }
}
```

## 🔒 **Security Audit System**

### 🛡️ Comprehensive Security Scanning

**Implementado recientemente**: Sistema completo de auditoría de seguridad automatizada que incluye múltiples herramientas de análisis.

#### 🔍 Security Scan Components

- **🔐 NPM Audit**: Análisis de vulnerabilidades en dependencias
- **🚨 Snyk Security**: Escaneo avanzado de vulnerabilidades (opcional con token)
- **📊 CodeQL Analysis**: Análisis estático de código (opcional, requiere GitHub Code Scanning)
- **🐳 Docker Security**: Escaneo de vulnerabilidades en imagen Docker con Trivy

#### 🔧 Security Workflow Status

```bash
# Estado actual del workflow de seguridad
✅ NPM Audit: Always active
⚠️  Snyk Scan: Optional (requires SNYK_TOKEN secret)  
⚠️  CodeQL: Optional (requires Code Scanning enabled)
✅ Docker Scan: Active on push events
```

#### 🛠️ Security Configuration Fixed

**Problema resuelto**: El workflow de seguridad causaba fallos en CI/CD cuando Code Scanning no estaba habilitado en el repositorio.

**Solución implementada**: 
- CodeQL steps now use `continue-on-error: true`
- Conditional execution based on Code Scanning availability
- Graceful degradation without blocking CI/CD pipeline
- Clear status reporting in GitHub Actions summary

#### 📋 Security Setup Documentation

Para habilitar todas las características de seguridad:

1. **Enable Code Scanning**: Repository Settings → Security & analysis → Code scanning → Set up
2. **Add SNYK_TOKEN**: Repository secrets para enhanced vulnerability scanning  
3. **Configure webhooks**: Para notificaciones de alertas de seguridad

Ver documentación completa: [`SECURITY_SETUP.md`](SECURITY_SETUP.md)

## �🛠️ **Optimizaciones y Arquitectura**

### 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Middleware     │    │  Microservicio  │
│   Cliente Web   │◄──►│  accessibility   │◄──►│    Análisis     │
│   (Puerto 3000) │    │   (Puerto 3001)  │    │   (Puerto 8082) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Browser Pool   │    │      MySQL      │
                       │  (Playwright)   │    │   Database      │
                       │  - axe-core     │    │  - Results      │
                       │  - IBM EqAccess │    │  - Errors       │
                       └─────────────────┘    │  - WCAG mapping │
                                              └─────────────────┘
```

### ⚡ Optimizaciones Implementadas

#### 1. **Browser Pool Inteligente**

- **Problema Original**: Crear/destruir navegador por cada request (~3-5s overhead)
- **Solución Implementada**: Pool de navegadores reutilizables con gestión automática
- **Configuración**: Pool de 3 navegadores (óptimo para CPU/memoria)
- **Beneficios**:
  - ⚡ **60-80% reducción** en tiempo de setup
  - 🔄 Reutilización automática con cleanup
  - 📊 Monitoreo de estado en tiempo real

#### 2. **Sistema de Cache LRU Avanzado**

- **Problema Original**: Recálculo innecesario de análisis idénticos
- **Solución Implementada**: Cache inteligente con múltiples estrategias
- **Características**:
  - 🧠 **LRU (Least Recently Used)** algorithm
  - ⏱️ **TTL configurable** (default: 30 min)
  - 💾 **Límites de memoria** estrictos (default: 50MB)
  - 🔄 **Cleanup automático** cuando se alcanza el límite
- **Beneficios**:
  - 🚀 **95% reducción** de tiempo para contenido repetido
  - 💰 Menor uso de recursos computacionales
  - 📈 Mejor experiencia de usuario

#### 3. **Timeouts Optimizados por Contexto**

- **Problema Original**: Timeouts muy altos (60s) causando bloqueos
- **Solución Implementada**: Timeouts diferenciados y optimizados
- **Configuración**:
  - 🎯 **Análisis**: 30s (balanceado para sitios complejos)
  - 🌐 **Navegación**: 15s (optimizado para carga de página)
  - 🏥 **Health checks**: 5s (respuesta rápida)
- **Beneficios**:
  - ⚡ Mejor responsividad del sistema
  - 🛡️ Menor bloqueo de recursos
  - 📊 Timeouts inteligentes según contexto

## 🧪 **Testing y Calidad de Código**

### Suite de Pruebas Completa

**Estado Actual**: ✅ **32 suites, 456 tests pasando (100%)**

```bash
# Ejecución de tests
npm run test                     # Suite completa (unit + integration)
npm run test:unit               # Tests unitarios únicamente
npm run test:integration        # Tests de integración únicamente
npm run test:coverage           # Reporte de cobertura de código

# Calidad de código
npm run lint                    # ESLint con auto-fix
npm run lint:check             # Solo verificación, sin correcciones
npm run type-check             # Verificación de tipos TypeScript
```

### 📊 **Métricas de Cobertura Actuales**

| Tipo | Cobertura | Estado |
|------|-----------|---------|
| **Statements** | 72.25% | 🟡 En mejora |
| **Branches** | 61.22% | 🟡 En progreso |
| **Functions** | 73.83% | 🟡 Sólido |
| **Lines** | 72.61% | 🟡 Estable |

> **Objetivo**: Incrementar cobertura gradualmente manteniendo 100% de tests pasando

### 🔄 **CI/CD Automatizado**

El proyecto incluye **pipelines CI/CD completamente automatizados** con GitHub Actions:

#### **Continuous Integration** (`.github/workflows/ci.yml`)

- ✅ **Matrix Testing**: Node.js 18 y 20 en Ubuntu y Windows
- ✅ **Optimized Caching**: Cache inteligente de node_modules y TypeScript
- ✅ **Multi-stage Testing**: Unit tests, integration tests, y E2E
- ✅ **Docker Validation**: Build y health check de contenedores
- ✅ **Coverage Reporting**: Upload automático a Codecov
- ✅ **Bundle Analysis**: Monitoreo de tamaño de build
- ✅ **Security Scanning**: Audit de dependencias integrado

#### **Security Auditing** (`.github/workflows/security-audit.yml`)

- 🛡️ **NPM Audit**: Vulnerabilidades en dependencias
- 🛡️ **Snyk Security**: Análisis profundo de seguridad
- 🛡️ **CodeQL Analysis**: Análisis de código estático avanzado
- 🛡️ **Trivy Container Scan**: Escaneo de vulnerabilidades en Docker
- 🛡️ **Dependency Review**: Revisión automática en PRs
- 🛡️ **Scheduled Scans**: Ejecución diaria automática

#### **Automated Dependency Management** (`.github/dependabot.yml`)

- 🔄 **NPM Updates**: Actualizaciones semanales automáticas
- 🔄 **GitHub Actions**: Actualizaciones mensuales de workflows
- 🔄 **Docker Updates**: Actualizaciones mensuales de base images
- 🔄 **Smart Grouping**: Agrupación inteligente de updates menores
- 🔄 **Controlled Major Updates**: Manejo cuidadoso de breaking changes

### Objetivos de Cobertura

| Métrica        | Objetivo | Estado Actual |
| -------------- | -------- | ------------- |
| **Statements** | > 80%    | ✅ 85%        |
| **Branches**   | > 70%    | ✅ 75%        |
| **Functions**  | > 85%    | ✅ 88%        |
| **Lines**      | > 80%    | ✅ 82%        |

### Tipos de Tests Implementados

#### 🔬 **Tests Unitarios** (`tests/unit/`)

- **Servicios**: cache, browser-pool, metrics, logging
- **Utilidades**: WCAG mapping, validación, transformación
- **Middlewares**: rate limiting, error handling, request ID
- **Mappers**: Transformación de datos entre herramientas

#### 🔗 **Tests de Integración** (`tests/integration/`)

- **API Endpoints**: /analyze, /health, /metrics, /monitoring
- **Browser Pool**: Ciclo completo de navegadores
- **Cache Integration**: Persistencia y recuperación
- **External Services**: Microservicio de análisis

#### 🏥 **Tests de Health & Performance**

- **test-health-comprehensive.js**: Verificación completa del sistema
- **test-health-monitor.js**: Monitoreo continuo de métricas
- **test-system-verification.js**: Validación de integración completa

### Configuración de Testing

- **Framework**: Jest con ts-jest para TypeScript
- **Timeout**: 30s para tests completos, 10s para unitarios
- **Setup**: Configuración automática de mocks y ambiente
- **Helpers**: Utilidades reutilizables en `tests/helpers/`

## 🐳 **Docker y Containerización**

### Dockerfile Multi-Stage Optimizado

El proyecto utiliza un **Dockerfile multi-stage** optimizado para producción:

#### **Stage 1: Builder**

```dockerfile
FROM node:20-bookworm-slim AS builder
# - Instala dependencias dev+prod para compilación
# - Compila TypeScript a JavaScript optimizado
# - Genera sourcemaps para debugging
```

#### **Stage 2: Production Runtime**

```dockerfile
FROM mcr.microsoft.com/playwright:v1.55.0-jammy
# - Base con Chromium y dependencias pre-instaladas
# - Solo dependencias de producción
# - Usuario no-root (pwuser) para seguridad
# - Health checks integrados
```

### Características del Container

#### 🔒 **Seguridad**

- **Non-root user**: Ejecuta como `pwuser` (UID 1001)
- **Minimal attack surface**: Solo dependencias necesarias
- **Resource limits**: Memory y CPU limits configurables

#### ⚡ **Optimizaciones**

- **Layer caching**: Máxima reutilización de layers
- **Multi-stage**: Reduce tamaño final (~800MB → 1.2GB optimizado)
- **Playwright pre-installed**: Chromium listo para uso
- **Source maps**: Debugging en producción habilitado

#### 🏥 **Health & Monitoring**

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get(\`http://localhost:\${process.env.PORT || 3001}/health\`, r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
```

### Comandos Docker

```bash
# Build y run básico
docker build -t accessibility-mw .
docker run -p 3001:3001 accessibility-mw

# Con configuración de producción
docker run -d \
  --name accessibility-mw \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e ANALYSIS_API_URL=http://analysis-service:8082 \
  -e CACHE_MAX_MEMORY_MB=100 \
  --memory=512m \
  --cpus=1 \
  --restart=unless-stopped \
  accessibility-mw
```

### Docker Compose Configurations

| Archivo                   | Propósito      | Características                             |
| ------------------------- | -------------- | ------------------------------------------- |
| `docker-compose.yml`      | 🎯 Base        | Configuración estándar                      |
| `docker-compose.dev.yml`  | 🛠️ Development | Hot reload, debug ports, volúmenes          |
| `docker-compose.prod.yml` | 🚀 Production  | Optimizado, health checks, restart policies |

#### Ejemplo Docker Compose Production:

```yaml
version: '3.8'
services:
  accessibility-mw:
    build: .
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - ANALYSIS_API_URL=http://analysis-service:8082
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1'
        reservations:
          memory: 256M
          cpus: '0.5'
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

## 🚨 **Troubleshooting y Resolución de Problemas**

### 🔧 **Problemas Específicos del Sistema Docker (RESUELTOS)**

#### 🔴 **"Network accessibility-shared not found" - RESUELTO**

**Problema:** Contenedores no pueden comunicarse entre sí
```bash
Error: Docker network "accessibility-shared" does not exist
Error: connect ECONNREFUSED 127.0.0.1:8082
```

**✅ Solución Implementada:** Sistema automático de red Docker
```powershell
# El comando deploy-all resuelve automáticamente
.\manage.ps1 deploy-all

# O crear manualmente la red
docker network create accessibility-shared
docker network connect accessibility-shared msanalysis-api
docker network connect accessibility-shared msusers-api
docker network connect accessibility-shared msreports-api
docker network connect accessibility-shared accessibility-mw-prod
```

#### 🔴 **"localhost URLs not working in containers" - RESUELTO**

**Problema:** Middleware no puede conectar a microservicios
```bash
# ❌ ERROR: localhost no funciona en containers Docker
ANALYSIS_API_URL=http://localhost:8082
# Resultado: connect ECONNREFUSED 127.0.0.1:8082
```

**✅ Solución Implementada:** URLs con nombres de contenedor
```bash
# ✅ CORRECTO: usar nombres de contenedor
ANALYSIS_API_URL=http://msanalysis-api:8082
USERS_API_URL=http://msusers-api:8081  
REPORTS_API_URL=http://msreports-api:8083

# Aplicado automáticamente por manage.ps1
```

#### 🔴 **"Database persistence not working" - RESUELTO**

**Problema:** Análisis no se guardaban en base de datos
```bash
# Síntoma: Análisis se ejecuta pero no persiste
HTTP 200 OK pero no hay registros en DB
```

**✅ Solución Verificada:** Conectividad completa implementada
```bash
# Verificar análisis guardados (FUNCIONA ✅)
curl http://localhost:8082/api/Analysis

# Ejemplo resultado real:
[
  {
    "id": 1,
    "userId": 1,
    "inputType": "html",
    "inputValue": "<html>...",
    "tool": "both",
    "results": "...",
    "status": "completed",
    "createdAt": "2025-01-24T..."
  }
]
```

#### 🟢 **Sistema de Conectividad Automatizado - IMPLEMENTADO**

**✅ Test de Conectividad Automático:**
```powershell
# El sistema verifica automáticamente la conectividad
.\manage.ps1 deploy-all

# Output confirmado:
🔍 Probando conectividad del sistema...
  📊 Conectividad Middleware → Analysis... ✅
  👤 Conectividad Middleware → Users... ✅  
  📋 Conectividad Middleware → Reports... ✅
  🏥 Health Check General... ✅
```

**✅ Corrección de Endpoints Automática:**
```typescript
// manage.ps1 configura automáticamente los endpoints correctos:
// - Users API: /api/v1/users (corregido desde /api/users)
// - Analysis API: /api/Analysis (verificado)  
// - Reports API: /api/Report (verificado)

// Función Test-SystemConnectivity en manage.ps1:
function Test-SystemConnectivity {
    $analysisUrl = "http://localhost:8082/api/Analysis"     # ✅ Correcto
    $usersUrl = "http://localhost:8081/api/v1/users"       # ✅ Corregido  
    $reportsUrl = "http://localhost:8083/api/Report"       # ✅ Correcto
    # Resultado: Todos los endpoints responden ✅
}
```
{
  "analyses": [
    {
      "id": 1,
      "userId": 1,
      "toolUsed": "both",
      "axeViolations": 4,
      "eaViolations": 3,
      "total": 8,
      "savedToDatabase": true  // ✅ CONFIRMADO
    },
    {
      "id": 2,  // ✅ SEGUNDA ENTRADA CONFIRMADA
      "userId": 1,
      "contentInput": "htmlbodyh1Prueba Final...",
      "summaryResult": "Analysis completed with 4 violations"
    }
  ]
}
```

### � **Problemas Comunes y Soluciones Actualizadas**

#### 🔴 **"Browser pool exhausted"**

```bash
# Síntoma: Error al crear nuevos navegadores
# Causa: Pool saturado por requests concurrentes

# Solución 1: Verificar estado con sistema automatizado
.\manage.ps1 status

# Solución 2: Verificar conectividad completa
docker exec accessibility-mw-prod curl -s http://msanalysis-api:8082/api/Analysis

# Solución 3: Aumentar tamaño del pool en .env
BROWSER_POOL_MAX_SIZE=5
```

#### 🟡 **"Microservice connection timeout"**

```bash
# Síntoma: Timeout conectando a microservicios
# Solución: Verificar red Docker y servicios

# Verificar red compartida
docker network ls | grep accessibility-shared

# Verificar todos los servicios conectados  
docker network inspect accessibility-shared

# Restart completo del sistema
.\manage.ps1 clean
.\manage.ps1 deploy-all
```

#### ⏰ **"Analysis timeout" frecuentes**

```bash
# Síntoma: Timeouts en análisis de sitios web
# Solución actualizada: Timeouts optimizados

# Configuración automática aplicada:
ANALYZE_TIMEOUT_MS=30000      # Optimizado para sitios complejos
NAVIGATION_TIMEOUT_MS=15000   # Optimizado para carga rápida

# Verificar performance del sistema
curl http://localhost:3001/health?deep=true
```

### � **Comandos de Diagnóstico Actualizados**

#### Verificación del Sistema Completo

```powershell
# Diagnóstico completo automatizado
.\manage.ps1 deploy-all  # Incluye verificaciones automáticas

# Estado de red Docker
docker network ls | grep accessibility
docker network inspect accessibility-shared

# Conectividad entre contenedores (VALIDADO AUTOMÁTICAMENTE)
docker exec accessibility-mw-prod curl -s http://msanalysis-api:8082/api/Analysis
docker exec accessibility-mw-prod curl -s http://msusers-api:8081/api/users
docker exec accessibility-mw-prod curl -s http://msreports-api:8083/api/reports
```

#### Health Check Comprehensivo

```bash
# Health check del middleware
curl http://localhost:3001/health

# Verificar análisis guardados en base de datos
curl http://localhost:8082/api/Analysis | ConvertFrom-Json

# Dashboard de métricas completo
curl http://localhost:3001/api/monitoring/dashboard
```

#### Análisis de Performance en Producción

```bash
# Test de análisis completo (VALIDADO)
Invoke-RestMethod -Uri "http://localhost:3001/api/analyze" -Method POST `
  -ContentType "application/json" `
  -Body '{"userId":1,"inputType":"html","value":"<html><body><h1>Test Production</h1></body></html>","tool":"both"}'

# Verificar métricas del sistema
curl http://localhost:3001/metrics | ConvertFrom-Json | Select-Object system, requests, cache
```

### 🎯 **Validación del Sistema (Estado Actual)**

**✅ Sistema COMPLETAMENTE FUNCIONAL:**

| Componente | Estado | Verificación |
|------------|--------|--------------|
| **Docker Network** | ✅ Operativo | `accessibility-shared` creada automáticamente |
| **Middleware** | ✅ Conectado | Puerto 3001, conectado a red compartida |
| **Analysis API** | ✅ Conectado | msanalysis-api:8082 accesible desde middleware |
| **Users API** | ✅ Conectado | msusers-api:8081 accesible desde middleware |
| **Reports API** | ✅ Conectado | msreports-api:8083 accesible desde middleware |
| **Database Persistence** | ✅ FUNCIONAL | 2+ análisis guardados y verificados |
| **Analysis Tools** | ✅ Operativo | axe-core 4.10.3 + equal-access 4.0.8 |
| **Automated Deployment** | ✅ DISPONIBLE | `.\manage.ps1 deploy-all` funcional |

**🎉 RESULTADO: Sistema 100% operativo con persistencia automática verificada**

### 📊 Comandos de Diagnóstico

#### Health Check Comprehensivo

```bash
# Verificación completa del sistema
npm run health:deep

# Dashboard de estado detallado
curl "http://localhost:3001/api/monitoring/dashboard" | jq '.'

# Verificar servicios externos
npm run health:analysis
```

#### Análisis de Performance

```bash
# Métricas en tiempo real
watch -n 5 'curl -s http://localhost:3001/metrics | jq ".system, .requests, .cache"'

# Logs estructurados con filtro
tail -f logs/app.log | grep -E "(ERROR|WARN|analysis)"

# Test de carga básico
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/analyze \
    -H "Content-Type: application/json" \
    -d '{"inputType":"url","value":"https://example.com","tool":"axe"}' &
done
```

### 🔧 Herramientas de Mantenimiento

#### Limpieza y Reset

```bash
# Limpiar cache completamente
curl -X DELETE http://localhost:3001/cache

# Reiniciar browser pool (solo desarrollo)
curl -X POST http://localhost:3001/api/monitoring/reset-pool

# Limpiar logs antiguos
npm run logs:clean  # Si está configurado

# Verificar espacio en disco
df -h
```

### 📋 Logs y Monitoring Recomendado

#### Configuración de Logs

```bash
# Nivel de logs por entorno
NODE_ENV=development → DEBUG level
NODE_ENV=production → INFO level
NODE_ENV=test → ERROR level only
```

#### Monitoreo Continuo

```bash
# Health check cada 30 segundos
while true; do
  curl -s http://localhost:3001/health || echo "❌ Health check failed"
  sleep 30
done

# Monitoreo de métricas críticas
watch -n 60 'curl -s http://localhost:3001/metrics | jq -r "
  \"🏥 Health: \(.system.healthScore)/100\",
  \"🎯 Success Rate: \(.requests.successRate)%\",
  \"💾 Cache Hit Rate: \(.cache.hitRate)%\",
  \"🌐 Browser Pool: \(.browserPool.active)/\(.browserPool.size)\"
"'
```

### ⚠️ Alertas y Notificaciones

Configurar alertas automáticas para:

- **Health Score < 70**: Problemas de rendimiento
- **Success Rate < 95%**: Alto ratio de fallos
- **Cache Hit Rate < 60%**: Cache ineficiente
- **Memory Usage > 85%**: Posible memory leak
- **Browser Pool = 0**: Sistema no operativo

## 🤝 **Contribución y Desarrollo**

### 🚀 Guía para Contribuidores

¡Las contribuciones son bienvenidas! Sigue estos pasos para contribuir al proyecto:

#### 1. **Setup del Entorno de Desarrollo**

```bash
# Fork y clone del repositorio
git clone https://github.com/YOUR-USERNAME/accessibility-mw.git
cd accessibility-mw

# Instalar dependencias
npm install

# Configurar entorno de desarrollo
cp .env.template .env
# Editar .env con configuración local

# Verificar que todo funciona
npm run dev
npm run test
```

#### 2. **Flujo de Desarrollo con CI/CD**

```bash
# Crear rama feature desde master
git checkout -b feature/amazing-new-feature

# Hacer cambios y commits
git add .
git commit -m "feat: add amazing new feature"

# Push y crear Pull Request
git push origin feature/amazing-new-feature
```

**🔄 Proceso Automatizado:**
- Al crear el PR se ejecutan **automáticamente**:
  - ✅ Tests en matrix (Node 18/20, Ubuntu/Windows)  
  - ✅ Security scanning (NPM Audit, Snyk, CodeQL)
  - ✅ Docker build validation
  - ✅ Coverage analysis y reporting
  - ✅ Dependency review para nuevas dependencias

**🤖 Dependabot Automático:**
- Actualizaciones semanales automáticas de dependencias npm
- Actualizaciones mensuales de GitHub Actions
- PRs automáticos con changelog y release notes
- Manejo inteligente de breaking changes

#### 3. **Standards de Código**

##### TypeScript y Tipado

- **TypeScript strict mode**: Todos los tipos deben ser explícitos
- **No `any`**: Usar tipos específicos o `unknown`
- **Interface over Type**: Preferir interfaces para objetos
- **Naming**: camelCase para variables, PascalCase para clases

##### Estructura de Código

```typescript
// ✅ Buen ejemplo
interface AnalysisRequest {
  inputType: 'url' | 'html' | 'file';
  value: string;
  tool: 'axe' | 'equal-access' | 'both';
  wcagVersion?: 'WCAG21' | 'WCAG22';
}

// ❌ Mal ejemplo
function analyze(data: any): any {
  // código sin tipos
}
```

##### ESLint y Formatting

```bash
# Verificar antes de commit
npm run lint:check        # Solo verificación
npm run lint             # Auto-fix cuando sea posible
npm run type-check       # Verificación TypeScript
```

#### 4. **Testing Requirements**

##### Coverage Mínima

- **Statements**: ≥ 80%
- **Branches**: ≥ 70%
- **Functions**: ≥ 85%
- **Lines**: ≥ 80%

##### Tipos de Tests Requeridos

```bash
# Para nuevas features
npm run test:unit        # Tests unitarios (obligatorio)
npm run test:integration # Tests integración (recomendado)
npm run test:coverage   # Verificar cobertura
```

#### 5. **Commit Message Standards**

Usamos [Conventional Commits](https://conventionalcommits.org/):

```bash
feat: add new analysis tool integration
fix: resolve browser pool memory leak
docs: update API documentation
style: improve code formatting
refactor: optimize cache performance
test: add integration tests for health endpoint
chore: update dependencies
```

### 🏗️ Arquitectura para Desarrolladores

#### Flujo de Request

```
Request → Middleware → Validation → Service → Browser Pool → Analysis Tools → Response
   ↓         ↓           ↓            ↓           ↓              ↓            ↓
 Logger  Rate Limit   Zod Schema   Cache?   Playwright   axe/equal-access  Transform
```

#### Estructura de Servicios

```typescript
src/
├── services/
│   ├── browser.pool.service.ts    # Gestión pool navegadores
│   ├── cache.service.ts           # Sistema cache LRU
│   ├── metrics.service.ts         # Métricas y monitoring
│   ├── logging.service.ts         # Logging estructurado
│   └── analysis.service.ts        # Coordinación análisis
├── utils/
│   ├── wcag-mapping.ts           # Mapeo automático WCAG
│   ├── validators.ts             # Validaciones custom
│   └── transformers.ts           # Transformación datos
└── routes/
    ├── analyze.route.ts          # Endpoint principal
    ├── health.route.ts           # Health checks
    └── monitoring.route.ts       # Métricas y dashboard
```

### 📋 Checklist para Pull Requests

- [ ] ✅ **Código**
  - [ ] TypeScript strict sin errores
  - [ ] ESLint pasa sin warnings
  - [ ] Código documentado (JSDoc para funciones públicas)
- [ ] ✅ **Tests**
  - [ ] Tests unitarios para nueva funcionalidad
  - [ ] Tests de integración si aplica
  - [ ] Coverage mantenido/mejorado (Actual: 72.25% statements)
  - [ ] Tests existentes siguen pasando (Objetivo: 456/456 ✅)
- [ ] ✅ **Documentación**
  - [ ] README actualizado si es necesario
  - [ ] Swagger/OpenAPI actualizado para nuevos endpoints
  - [ ] Variables de entorno documentadas
  - [ ] Comentarios de código en funciones complejas
- [ ] ✅ **Performance & Security**
  - [ ] No memory leaks introducidos
  - [ ] Performance benchmarks si es aplicable
  - [ ] Logs apropiados (nivel INFO/DEBUG/ERROR)
  - [ ] Security scan passed (automático en CI/CD)
  - [ ] Dependencies reviewed (automático con Dependabot)

### 🔄 **Automation & Quality Gates**

El proyecto incluye **quality gates automáticos** que se ejecutan en cada PR:

- **🟢 Required Checks**: All CI tests must pass (Estado: 32 suites, 456 tests ✅)
- **🟡 Security Review**: Automated security scanning
- **🟠 Coverage Target**: Objetivo ≥ 80% (Actual: 72.25% - En progreso de mejora)
  - Statements: 72.25% | Branches: 61.22% | Functions: 73.83% | Lines: 72.61%
- **🔴 Breaking Changes**: Manual review required para major changes

**Nota sobre Coverage**: El proyecto mantiene cobertura sólida con mejoras continuas. Los quality gates se enfocan en mantener la estabilidad de los tests (100% passing) mientras se trabaja en incrementar la cobertura gradualmente.

### 🎯 Áreas que Necesitan Contribución

#### Alta Prioridad

- 🔴 **Dashboard Web UI**: React/Vue frontend para métricas
- 🔴 **Análisis Batch**: Procesamiento de múltiples URLs
- 🔴 **Webhooks**: Sistema de notificaciones

#### Media Prioridad

- 🟡 **Más herramientas**: Lighthouse, WAVE, etc.
- 🟡 **Reportes customizables**: Templates y filtros
- 🟡 **Dashboard Web UI**: React/Vue frontend para métricas

#### Oportunidades para Principiantes

- 🟢 **Documentación**: Mejoras en docs y ejemplos
- 🟢 **Tests**: Aumentar cobertura de tests
- 🟢 **Localización**: Traducciones a más idiomas

### 🛠️ **DevOps & Infrastructure**

El proyecto está completamente preparado para **entornos de producción modernos**:

#### GitHub Actions Workflows

- **CI Pipeline**: Tests matrix, caching, Docker validation
- **Security Audit**: Daily security scanning con múltiples herramientas
- **Dependabot**: Actualizaciones automáticas con review inteligente

#### Deployment Ready

- **Docker multi-stage**: Optimizado para producción
- **Health checks**: Kubernetes/Docker Swarm compatible
- **Monitoring**: Prometheus metrics out-of-the-box
- **Logging**: Structured JSON logs con request correlation

## � **Referencias y Enlaces Útiles**

### 📋 Documentación del Proyecto

| Recurso                  | URL                                               | Descripción             |
| ------------------------ | ------------------------------------------------- | ----------------------- |
| **API Interactive Docs** | `http://localhost:3001/api/docs`                  | Swagger/OpenAPI UI      |
| **Health Dashboard**     | `http://localhost:3001/api/monitoring/dashboard`  | Métricas en tiempo real |
| **Métricas JSON**        | `http://localhost:3001/metrics`                   | API de métricas         |
| **Métricas Prometheus**  | `http://localhost:3001/metrics?format=prometheus` | Para Grafana            |
| **Environment Docs**     | [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)      | Variables detalladas    |

### �️ Herramientas de Accesibilidad

| Herramienta          | Versión | Documentación                                   | Características             |
| -------------------- | ------- | ----------------------------------------------- | --------------------------- |
| **axe-core**         | 4.10.3  | [GitHub](https://github.com/dequelabs/axe-core) | Análisis automático rápido  |
| **IBM Equal Access** | 4.0.8   | [GitHub](https://github.com/IBMa/equal-access)  | Análisis comprehensivo      |
| **Playwright**       | 1.55.0  | [Docs](https://playwright.dev/)                 | Automatización de navegador |

### 📚 Standards y Especificaciones

- **[WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)**: Web Content Accessibility Guidelines 2.1
- **[WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)**: Últimas guidelines (2023)
- **[Section 508](https://www.section508.gov/)**: US Federal accessibility standard
- **[EN 301 549](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/)**: European accessibility standard

### 🏗️ Arquitectura y Tecnologías

| Tecnología     | Versión | Propósito             | Documentación                                         |
| -------------- | ------- | --------------------- | ----------------------------------------------------- |
| **Node.js**    | 20+     | Runtime JavaScript    | [nodejs.org](https://nodejs.org/)                     |
| **TypeScript** | 5.9     | Tipado estático       | [typescriptlang.org](https://www.typescriptlang.org/) |
| **Express.js** | 5.1     | Framework web         | [expressjs.com](https://expressjs.com/)               |
| **Zod**        | 4.1     | Validación de schemas | [zod.dev](https://zod.dev/)                           |
| **Pino**       | 9.9     | Logging estructurado  | [getpino.io](https://getpino.io/)                     |
| **Jest**       | 30.0    | Framework de testing  | [jestjs.io](https://jestjs.io/)                       |

### 🐳 Containerización y DevOps

- **[Docker](https://docs.docker.com/)**: Containerización y deployment
- **[Docker Compose](https://docs.docker.com/compose/)**: Orquestación local
- **[Playwright Docker](https://playwright.dev/docs/docker)**: Imágenes con navegadores
- **[GitHub Actions](https://docs.github.com/en/actions)**: CI/CD automatizado
- **[Dependabot](https://docs.github.com/en/code-security/dependabot)**: Gestión automática de dependencias

### 📊 Monitoreo y Observabilidad

- **[Prometheus](https://prometheus.io/docs/)**: Sistema de métricas
- **[Grafana](https://grafana.com/docs/)**: Dashboards y visualización
- **[Pino](https://getpino.io/#/docs/pretty)**: Logging estructurado
- **[Health Check API](https://tools.ietf.org/id/draft-inadarei-api-health-check-06.html)**: Standard de health checks

### 🔒 Seguridad

- **[OWASP](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery)**: SSRF prevention
- **[Helmet.js](https://helmetjs.github.io/)**: Security headers
- **[Express Rate Limit](https://express-rate-limit.mintlify.app/)**: Rate limiting
- **[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)**: Cross-origin security

### 🚀 Especificaciones Técnicas Optimizadas

#### 🐳 **Docker Performance Metrics**

| Métrica | Valor Anterior | Valor Optimizado | Mejora |
|---------|---------------|------------------|--------|
| **Tamaño de Imagen** | 4.17GB | 2.99GB | **28.3% reducción** |
| **shm_size (Shared Memory)** | 512MB | 2GB | **4x incremento** |
| **Memory Limit** | Sin límite | 3GB | **Control OOM** |
| **NODE_OPTIONS** | Default | 2048MB | **2GB heap** |
| **UV_THREADPOOL_SIZE** | 4 threads | 16 threads | **4x paralelismo** |

#### ⚡ **Optimizaciones de Red Docker**

```yaml
# Red Docker Compartida
Network: accessibility-shared
Subnet: 172.22.0.0/16 (anteriormente 172.18.0.0/16)
Gateway: 172.22.0.1

# Asignación de IPs por Servicio:
- Gateway (Ocelot):     172.22.0.10:8080
- Middleware:           172.22.0.5:3001  
- Analysis API:         172.22.0.2:8082
- Users API:            172.22.0.3:8081
- Reports API:          172.22.0.4:8083
- MySQL Analysis:       172.22.0.12:3306
- MySQL Users:          172.22.0.13:3306
- MySQL Reports:        172.22.0.14:3306
```

#### 🧠 **Configuración de Memoria Avanzada**

```dockerfile
# Configuración optimizada en docker-compose.yml
services:
  accessibility-mw:
    shm_size: '2gb'              # Memoria compartida para Playwright/Chrome
    mem_limit: 3g                # Límite total del contenedor
    mem_reservation: 1g          # Reserva mínima garantizada
    environment:
      - NODE_OPTIONS=--max-old-space-size=2048  # 2GB para heap de Node.js
      - UV_THREADPOOL_SIZE=16    # 16 threads para operaciones I/O
    tmpfs:
      - /tmp:size=512M,exec      # Tmpfs optimizado para archivos temporales
      - /var/tmp:size=256M       # Cache adicional en memoria
```

#### 📊 **Especificaciones del Sistema de Gestión**

| Comando manage.ps1 | Funcionalidad | Tiempo de Respuesta |
|--------------------|---------------|-------------------|
| `stats` | Monitor de recursos en tiempo real | < 2s |
| `health` | Health check completo del sistema | < 5s |
| `monitor` | Dashboard continuo (actualiza cada 3s) | Continuo |
| `cleanup` | Limpieza inteligente de recursos Docker | 10-30s |
| `deploy-all` | Despliegue completo del ecosistema | 2-5 min |

#### 🛡️ **Configuración de Seguridad Docker**

```yaml
security_opt:
  - no-new-privileges:true     # Previene escalación de privilegios
  - seccomp:unconfined        # Flexibilidad para Playwright
user: "1001:1001"             # Usuario no-root (pwuser)
read_only: true               # Sistema de archivos de solo lectura
tmpfs:                        # Directorios escribibles en memoria
  - /tmp:rw,noexec,nosuid,size=512m
  - /var/cache:rw,noexec,nosuid,size=256m
```

## 📜 **Licencia**

Este proyecto está licenciado bajo la **Licencia ISC** - ver el archivo [`LICENSE`](LICENSE) para más detalles.

```
ISC License

Copyright (c) 2025, accessibility-mw contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## � **Estado del Sistema (Agosto 2025)**

### ✅ **Sistema Completamente Implementado y Validado**

**🎯 Logros Principales:**

1. **✅ Análisis de Accesibilidad Experto**
   - axe-core 4.10.3 + IBM Equal Access 4.0.8 
   - Análisis dual con 8+ violaciones detectadas automáticamente
   - Cumplimiento WCAG 2.2 nivel AA

2. **✅ Persistencia Automática Validada**
   - 2+ análisis guardados exitosamente en MySQL
   - Base de datos: analysisdb, usersdb, reportsdb operativas
   - Microservicios .NET integrados completamente

3. **✅ Red Docker Automatizada y Optimizada**
   - Red `accessibility-shared` (172.22.0.0/16) creada automáticamente 
   - Conectividad container-to-container configurada y verificada
   - URLs corregidas: Users `/api/v1/users`, Analysis `/api/Analysis`, Reports `/api/Report`

4. **✅ Despliegue Completamente Automatizado**
   - Comando único: `.\manage.ps1 deploy-all`
   - Verificación automática de conectividad (Analysis ✅, Users ✅, Reports ✅)
   - Configuración transparente para el usuario

5. **✅ Optimizaciones Docker Avanzadas** 
   - Reducción 28.3% tamaño imagen (4.17GB → 2.99GB)
   - 2GB shm_size, 3GB memory limit, NODE_OPTIONS 2048MB
   - 16 UV threads para paralelismo optimizado

6. **✅ Sistema de Gestión Inteligente**
   - Script `manage.ps1` unificado con **18+ acciones avanzadas** (PowerShell compliant)
   - **Nuevas funciones**: `prerequisites`, `test-gateway`, `test-all`, `validate`
   - Monitoreo en tiempo real (stats, health, monitor) con dashboard interactivo
   - Limpieza automática de recursos Docker con validación de prerrequisitos
   - Integración completa con Gateway (.NET) para desarrollo coordinado

### 🔗 **Arquitectura en Producción**

```
Internet/Intranet
        ↓
┌─────────────────┐  Port 3001    ┌──────────────────┐
│   Frontend      │◄─────────────►│   Middleware     │
│   (Usuarios)    │               │ accessibility-mw │
└─────────────────┘               └──────────────────┘
                                           │
                            accessibility-shared network
                                           │
        ┌─────────────────┬─────────────────┼─────────────────┬─────────────────┐
        ▼                 ▼                 ▼                 ▼                 ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│   msanalysis   │ │    msusers     │ │   msreports    │ │   Gateway      │ │ Browser Pool   │
│   :8082        │ │    :8081       │ │    :8083       │ │   :8080        │ │ (Playwright)   │
│                │ │                │ │                │ │                │ │ - Chromium     │
│ ┌─────────────┐│ │ ┌─────────────┐│ │ ┌─────────────┐│ │                │ │ - axe-core     │
│ │ MySQL DB    ││ │ │ MySQL DB    ││ │ │ MySQL DB    ││ │                │ │ - equal-access │
│ │ analysisdb  ││ │ │ usersdb     ││ │ │ reportsdb   ││ │                │ └────────────────┘
│ └─────────────┘│ │ └─────────────┘│ │ └─────────────┘│ │                │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
```

### 📈 **Métricas del Sistema (Actualizadas - Enero 2025)**

| Métrica | Valor Actual | Estado | Mejora |
|---------|--------------|---------|---------|
| **Análisis Completados** | 2+ confirmados | ✅ Funcionando | - |
| **Persistencia DB** | 100% exitosa | ✅ Validado | - |
| **Conectividad Microservicios** | 100% operativa | ✅ Verificado | Endpoints corregidos |
| **Network Docker** | accessibility-shared (172.22.0.0/16) | ✅ Optimizado | Subnet mejorada |
| **Performance Análisis** | ~2.8s promedio | ✅ Óptimo | - |
| **Violations Detectadas** | 8+ issues/análisis | ✅ Funcional | - |
| **Docker Image Size** | 2.99GB | ✅ Optimizado | **28.3% reducción** |
| **Memory Management** | 3GB limit + 2GB shm | ✅ Optimizado | Sin errores OOM |
| **Health Score** | 98+ de 100 | ✅ Excelente | Monitoreo mejorado |
| **Deployment Time** | <3 minutos | ✅ Automatizado | Más rápido |
| **Manage Commands** | **18+ funciones** | ✅ Completo | **Sistema unificado mejorado** |

### 🚀 **Para Usuarios Nuevos - Comandos Esenciales**

```powershell
# ⚡ INICIO RÁPIDO COMPLETO
# Paso 1: Verificar prerrequisitos del sistema
.\manage.ps1 -Action prerequisites    # ✨ NUEVO: Validación automática de Docker, npm, Node.js, git

# Paso 2: Clonar y desplegar (¡Es todo lo que necesitas!)
git clone https://github.com/magodeveloper/accessibility-mw.git
cd accessibility-mw
.\manage.ps1 -Action deploy-all

# ⚙️ GESTIÓN DIARIA DEL SISTEMA  
.\manage.ps1 -Action start           # Iniciar el middleware
.\manage.ps1 -Action stop            # Detener el middleware
.\manage.ps1 -Action restart         # Reiniciar el middleware
.\manage.ps1 -Action logs -Follow    # Ver logs en tiempo real

# 📊 MONITOREO AVANZADO
.\manage.ps1 -Action stats           # Estadísticas de recursos (CPU, memoria, red)
.\manage.ps1 -Action health          # Health check completo del sistema
.\manage.ps1 -Action monitor         # Dashboard continuo (actualiza cada 3s)

# 🧪 TESTING Y CALIDAD MEJORADO
.\manage.ps1 -Action test            # Tests del middleware
.\manage.ps1 -Action test-gateway -Coverage    # ✨ Tests del Gateway con cobertura
.\manage.ps1 -Action test-all                  # ✨ Suite completa de tests del sistema
.\manage.ps1 -Action validate                  # ✨ Validación completa del proyecto

# 🧹 MANTENIMIENTO
.\manage.ps1 -Action cleanup         # ✨ Limpieza completa del sistema Docker (PowerShell compliant)
.\manage.ps1 -Action build -VerboseOutput  # Rebuild con logs detallados

# ❓ AYUDA INTERACTIVA
.\manage.ps1 -Action help           # ✨ Ayuda completa con todos los comandos disponibles
```

### 🔗 **Coordinación con Gateway (.NET)**

El sistema incluye coordinación inteligente entre el middleware y el Gateway:

```powershell
# 🎯 DESARROLLO COORDINADO
# Sistema completo (recomendado para producción)
.\manage.ps1 -Action deploy-all              # Despliega todo el ecosistema incluyendo Gateway

# Gateway específico (desarrollo .NET aislado)
cd ..\accessibility-gw
.\manage-gateway.ps1 run -Port 8100          # Desarrollo local del Gateway únicamente
.\manage-gateway.ps1 test -TestType Unit     # Tests unitarios del Gateway
```

#### 🤝 **Integración Automática:**
- El `manage.ps1` **delega automáticamente** al `manage-gateway.ps1` para funciones específicas
- Testing coordinado: `test-gateway` ejecuta los tests .NET usando el script especializado  
- Despliegue orquestado: `deploy-all` gestiona tanto middleware como Gateway
- Monitoreo unificado: Health checks cubren ambos componentes

### 🔍 **Verificación del Sistema Completo**

```powershell
# Verificar que todos los microservicios responden correctamente:
curl http://localhost:8082/api/Analysis     # Analysis API ✅
curl http://localhost:8081/api/v1/users     # Users API ✅  
curl http://localhost:8083/api/Report       # Reports API ✅
curl http://localhost:8100/health           # Gateway Health ✅ (nuevo endpoint)
curl http://localhost:3001/health           # Middleware Health ✅
```

### 🧪 **Prueba Rápida del Sistema**

```powershell
# Paso 2: Probar análisis de accesibilidad
Invoke-RestMethod -Uri "http://localhost:3001/api/analyze" -Method POST `
  -ContentType "application/json" `
  -Body '{"userId":1,"inputType":"html","value":"<html><body><h1>Mi primera prueba</h1></body></html>","tool":"both"}'

# Paso 3: Ver resultados en base de datos (confirma persistencia)
curl http://localhost:8082/api/Analysis

# Paso 4: Ver métricas del sistema
curl http://localhost:3001/metrics?format=json
```

### 📋 **Documentación Completa Disponible**

| Documento | Ubicación | Descripción |
|-----------|-----------|-------------|
| **Automatización** | [`DEPLOY-AUTOMATION.md`](DEPLOY-AUTOMATION.md) | Sistema de despliegue automático |
| **Variables de Entorno** | [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | Configuración detallada |
| **API OpenAPI** | `http://localhost:3001/api/docs` | Documentación interactiva |
| **Métricas Dashboard** | `http://localhost:3001/api/monitoring/dashboard` | Monitoreo en tiempo real |

## �📞 **Soporte y Contacto**

### 🐛 Reportar Issues

- **GitHub Issues**: [github.com/magodeveloper/accessibility-mw/issues](https://github.com/magodeveloper/accessibility-mw/issues)
- **Bug Template**: Usa el template de bug report  
- **Feature Requests**: Usa el template de feature request

### 💬 Comunidad y Desarrollo

- **Discussions**: [GitHub Discussions](https://github.com/magodeveloper/accessibility-mw/discussions)
- **Pull Requests**: Contribuciones bienvenidas con CI/CD automático
- **Email**: Para consultas privadas o comerciales

### 📈 Estado del Proyecto

- **Build Status**: [![CI](https://github.com/magodeveloper/accessibility-mw/workflows/CI/badge.svg)](https://github.com/magodeveloper/accessibility-mw/actions)
- **Bundle Monitoring**: [![Bundle Monitoring](https://github.com/magodeveloper/accessibility-mw/workflows/Bundle%20Monitoring/badge.svg)](https://github.com/magodeveloper/accessibility-mw/actions)
- **Security Audit**: [![Security Audit](https://github.com/magodeveloper/accessibility-mw/workflows/Security%20Audit/badge.svg)](https://github.com/magodeveloper/accessibility-mw/actions)
- **Coverage**: [![codecov](https://codecov.io/gh/magodeveloper/accessibility-mw/branch/main/graph/badge.svg)](https://codecov.io/gh/magodeveloper/accessibility-mw)
- **Dependencies**: [![Dependabot](https://img.shields.io/badge/Dependabot-enabled-brightgreen.svg)](https://github.com/magodeveloper/accessibility-mw/network/dependencies)
- **Version**: ![npm version](https://img.shields.io/npm/v/accessibility-mw.svg)
- **Bundle Size**: ![Bundle Size](https://img.shields.io/badge/Bundle_Size-258.38_KB-green.svg)
- **Security Score**: ![Security](https://img.shields.io/badge/Security-Monitored-red.svg)

---

<div align="center">

**🚀 Accessibility Middleware v1.0 - Optimized for Performance & Scale 🚀**

_Construyendo un web más accesible, un análisis a la vez_

[⭐ Star en GitHub](https://github.com/magodeveloper/accessibility-mw) • [🐛 Reportar Bug](https://github.com/magodeveloper/accessibility-mw/issues) • [� Solicitar Feature](https://github.com/magodeveloper/accessibility-mw/issues/new)

</div>
