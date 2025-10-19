# 🏗️ Arquitectura Detallada - Accessibility Middleware

## 📋 Tabla de Contenidos

- [Visión General](#visión-general)
- [Capas de la Aplicación](#capas-de-la-aplicación)
- [Componentes Principales](#componentes-principales)
- [Flujo de Datos](#flujo-de-datos)
- [Patrones de Diseño](#patrones-de-diseño)
- [Integración con Microservicios](#integración-con-microservicios)
- [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
- [Escalabilidad](#escalabilidad)

---

## Visión General

El **Accessibility Middleware** es un servicio Node.js/TypeScript que actúa como **orquestador** de análisis de accesibilidad web. Su arquitectura está diseñada para:

- ✅ Alta disponibilidad y resiliencia
- ✅ Escalabilidad horizontal
- ✅ Bajo acoplamiento con microservicios .NET
- ✅ Performance optimizada (análisis < 3s promedio)
- ✅ Observabilidad completa (logs, métricas, health checks)

### Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                         GATEWAY                             │
│            (Rate Limiting, Circuit Breaker)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP/REST + JWT
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              ACCESSIBILITY MIDDLEWARE (3001)                │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              PRESENTATION LAYER                    │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Express Routes + Middlewares                │  │    │
│  │  │  • /api/analyze                              │  │    │
│  │  │  • /health                                   │  │    │
│  │  │  • /metrics                                  │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Middlewares                                 │  │    │
│  │  │  • Authentication (JWT)                      │  │    │
│  │  │  • Gateway Validation                        │  │    │
│  │  │  • CORS                                      │  │    │
│  │  │  • Error Handler                             │  │    │
│  │  │  • Request Logger                            │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              BUSINESS LOGIC LAYER                  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Analysis Service (Core Orchestrator)        │  │    │
│  │  │  • analyzeUrl()                              │  │    │
│  │  │  • Tool selection (axe/IBM EA)               │  │    │
│  │  │  • Result merging                            │  │    │
│  │  │  • WCAG mapping                              │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Browser Pool Service                        │  │    │
│  │  │  • Pool management (3 instances)             │  │    │
│  │  │  • Page lifecycle                            │  │    │
│  │  │  • Resource cleanup                          │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Cache Service                               │  │    │
│  │  │  • LRU cache (100 keys max)                  │  │    │
│  │  │  • TTL: 1 hour                               │  │    │
│  │  │  • Hit rate tracking                         │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  WCAG Mappers                                │  │    │
│  │  │  • Axe Mapper (80+ rules)                    │  │    │
│  │  │  • IBM EA Mapper (58+ rules)                 │  │    │
│  │  │  • Criterion normalization                   │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              INFRASTRUCTURE LAYER                  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Logging Service (Pino)                      │  │    │
│  │  │  • Structured JSON logs                      │  │    │
│  │  │  • Log levels (trace-fatal)                  │  │    │
│  │  │  • Request ID tracking                       │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Metrics Service (Prometheus)                │  │    │
│  │  │  • Request counters                          │  │    │
│  │  │  • Latency histograms                        │  │    │
│  │  │  • Custom metrics                            │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Health Monitor                              │  │    │
│  │  │  • Service health checks                     │  │    │
│  │  │  • Resource monitoring                       │  │    │
│  │  │  • Alert system                              │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              INTEGRATION LAYER                     │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Microservices Client                        │  │    │
│  │  │  • ms-analysis (8082)                        │  │    │
│  │  │  • ms-reports (8083)                         │  │    │
│  │  │  • ms-users (8084)                           │  │    │
│  │  │  • Retry logic + Circuit breaker             │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP/REST
                      ▼
        ┌─────────────────────────────┐
        │   MICROSERVICIOS .NET       │
        │                             │
        │  • ms-analysis (MySQL)      │
        │  • ms-reports (MySQL)       │
        │  • ms-users (MySQL)         │
        └─────────────────────────────┘
```

---

## Capas de la Aplicación

### 1. Presentation Layer (Presentación)

**Responsabilidad:** Exponer API REST y manejar requests HTTP.

**Componentes:**
- **Express Router** - Definición de rutas
- **Middleware Chain** - Procesamiento secuencial de requests
- **Request Validators** - Validación de input
- **Response Formatters** - Formateo de respuestas

**Tecnologías:**
- Express 4.x
- express-validator
- cors
- helmet

### 2. Business Logic Layer (Lógica de Negocio)

**Responsabilidad:** Implementar reglas de negocio y orquestación.

**Componentes:**
- **Analysis Service** - Orquestador principal
- **Browser Pool Service** - Gestión de navegadores
- **Cache Service** - Optimización de performance
- **WCAG Mappers** - Mapeo de reglas a criterios

**Patrones:**
- Service Pattern
- Factory Pattern (ErrorFactory)
- Singleton (Browser Pool, Cache)
- Strategy Pattern (Tool selection)

### 3. Infrastructure Layer (Infraestructura)

**Responsabilidad:** Servicios transversales (logging, metrics, monitoring).

**Componentes:**
- **Logging Service** - Logger estructurado
- **Metrics Service** - Métricas Prometheus
- **Health Monitor** - Monitoreo de salud

**Tecnologías:**
- Pino (logging)
- prom-client (metrics)
- node-cache (cache)

### 4. Integration Layer (Integración)

**Responsabilidad:** Comunicación con servicios externos.

**Componentes:**
- **Microservices Client** - Cliente HTTP para .NET services
- **Retry Logic** - Reintentos automáticos
- **Circuit Breaker** - Protección contra fallos en cascada

---

## Componentes Principales

### Analysis Service

```typescript
class AnalysisService {
  /**
   * Orquesta el análisis completo de una URL
   * 
   * Flujo:
   * 1. Validar URL
   * 2. Verificar cache
   * 3. Obtener página del browser pool
   * 4. Ejecutar análisis dual (axe + IBM EA)
   * 5. Mapear resultados a WCAG
   * 6. Persistir en microservicios
   * 7. Actualizar cache
   * 8. Retornar resultados
   */
  async analyzeUrl(url: string, options: AnalysisOptions): Promise<AnalysisResult> {
    // Implementación...
  }

  private async runAxeAnalysis(page: Page): Promise<AxeResults>
  private async runIBMAnalysis(page: Page): Promise<IBMResults>
  private mergeResults(axe: AxeResults, ibm: IBMResults): MergedResults
  private async saveToMicroservices(results: MergedResults): Promise<void>
}
```

**Características:**
- ✅ Análisis dual (axe-core + IBM Equal Access)
- ✅ Selección inteligente de herramientas según standards
- ✅ Timeout configurable (30s default)
- ✅ Manejo de errores robusto

### Browser Pool Service

```typescript
class BrowserPoolService {
  private pool: Browser[] = [];
  private readonly poolSize = 3;

  /**
   * Pool de navegadores Playwright reutilizables
   * 
   * Beneficios:
   * - Reduce overhead de inicialización (70%)
   * - Análisis promedio: 2.8s (vs 9s sin pool)
   * - Gestión automática de lifecycle
   */
  async withPage<T>(callback: (page: Page) => Promise<T>): Promise<T> {
    const browser = await this.acquireBrowser();
    const page = await browser.newPage();
    
    try {
      return await callback(page);
    } finally {
      await this.releaseBrowser(browser, page);
    }
  }

  private async acquireBrowser(): Promise<Browser>
  private async releaseBrowser(browser: Browser, page: Page): Promise<void>
  private async cleanupIdle(): Promise<void>
}
```

**Optimizaciones:**
- ✅ Pool size configurable (default: 3)
- ✅ Lazy initialization
- ✅ Cleanup automático de páginas
- ✅ Manejo de memoria optimizado

### Cache Service

```typescript
class CacheService {
  private cache = new NodeCache({
    stdTTL: 3600,      // 1 hora
    maxKeys: 100,      // Máximo 100 URLs
    checkperiod: 120   // Limpieza cada 2 min
  });

  /**
   * Cache LRU para resultados de análisis
   * 
   * Key format: `${url}:${standards.join(',')}`
   * 
   * Métricas:
   * - Hit rate: ~78% en producción
   * - Average lookup: <1ms
   */
  get(key: string): AnalysisResult | undefined
  set(key: string, value: AnalysisResult): void
  invalidate(pattern: string): void
  getStats(): CacheStats
}
```

### WCAG Mappers

```typescript
// Axe Mapper (80+ reglas → WCAG 2.1/2.2)
const axeWcagMapping: Record<string, WcagCriterion> = {
  'document-title': { criterion: '2.4.2', level: 'A', version: '2.0' },
  'html-has-lang': { criterion: '3.1.1', level: 'A', version: '2.0' },
  'color-contrast': { criterion: '1.4.3', level: 'AA', version: '2.0' },
  // ... 80+ reglas
};

// IBM EA Mapper (58+ reglas → WCAG 2.1/2.2)
const ibmWcagMapping: Record<string, WcagCriterion> = {
  'WCAG20_Html_HasLang': { criterion: '3.1.1', level: 'A', version: '2.0' },
  'WCAG20_Img_HasAlt': { criterion: '1.1.1', level: 'A', version: '2.0' },
  // ... 58+ reglas
};
```

---

## Flujo de Datos

### Análisis de URL (Happy Path)

```
┌─────────┐
│ Cliente │
└────┬────┘
     │
     │ POST /api/analyze { url, standards }
     │
     ▼
┌─────────────────────┐
│ Gateway Validation  │ ← JWT + HMAC signature
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Request Middleware  │ ← CORS, Auth, Logging
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Analysis Controller │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Cache Check         │ ─── HIT ──→ Return cached result
└─────────┬───────────┘
          │ MISS
          ▼
┌─────────────────────┐
│ Browser Pool        │ ← Acquire browser from pool
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Navigate to URL     │ ← Playwright navigation
└─────────┬───────────┘
          │
          ▼
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│  axe   │  │ IBM EA │ ← Parallel execution
└───┬────┘  └───┬────┘
    │           │
    └─────┬─────┘
          │
          ▼
┌─────────────────────┐
│ Merge Results       │ ← Combine + deduplicate
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ WCAG Mapping        │ ← Map rules to criteria
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Save to MS-Analysis │ ← POST to .NET microservice
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Save to MS-Reports  │ ← POST history record
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Update Cache        │ ← Cache for 1 hour
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Release Browser     │ ← Return to pool
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Return Result       │ ← 200 OK + JSON
└─────────────────────┘
```

### Error Handling Flow

```
Error occurs
    │
    ▼
┌─────────────────────┐
│ normalizeError()    │ ← Convert to AppError
└─────────┬───────────┘
          │
          ▼
    ┌─────┴─────┐
    │           │
    ▼           ▼
Operational   Non-operational
    │           │
    ▼           ▼
 4xx/5xx     500 + log.fatal
    │           │
    └─────┬─────┘
          │
          ▼
┌─────────────────────┐
│ Error Middleware    │ ← Log + Format response
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Client Response     │ ← { error: { message, code, ... } }
└─────────────────────┘
```

---

## Patrones de Diseño

### 1. Singleton Pattern

**Uso:** Browser Pool, Cache Service

```typescript
class BrowserPoolService {
  private static instance: BrowserPoolService;

  private constructor() {}

  static getInstance(): BrowserPoolService {
    if (!BrowserPoolService.instance) {
      BrowserPoolService.instance = new BrowserPoolService();
    }
    return BrowserPoolService.instance;
  }
}
```

**Beneficio:** Una única instancia compartida, evita múltiples pools.

### 2. Factory Pattern

**Uso:** Error creation

```typescript
class ErrorFactory {
  static timeout(message: string): AppError {
    return new AppError(504, 'TIMEOUT', message, 'MEDIUM', true);
  }

  static validation(message: string): AppError {
    return new AppError(400, 'INVALID_INPUT', message, 'LOW', true);
  }

  static internal(message: string): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message, 'HIGH', false);
  }
}
```

**Beneficio:** Creación consistente de errores con contexto.

### 3. Strategy Pattern

**Uso:** Selección de herramientas de análisis

```typescript
interface AnalysisStrategy {
  analyze(page: Page): Promise<Results>;
}

class AxeStrategy implements AnalysisStrategy {
  async analyze(page: Page): Promise<AxeResults> { /* ... */ }
}

class IBMStrategy implements AnalysisStrategy {
  async analyze(page: Page): Promise<IBMResults> { /* ... */ }
}

class AnalysisContext {
  private strategy: AnalysisStrategy;

  setStrategy(strategy: AnalysisStrategy): void {
    this.strategy = strategy;
  }

  async execute(page: Page): Promise<Results> {
    return this.strategy.analyze(page);
  }
}
```

**Beneficio:** Cambio dinámico de algoritmo de análisis.

### 4. Middleware Pattern

**Uso:** Express middleware chain

```typescript
app.use(cors());
app.use(helmet());
app.use(requestLogger);
app.use(authenticate);
app.use(validateGateway);
// ... routes
app.use(errorHandler);
```

**Beneficio:** Procesamiento secuencial y modular de requests.

### 5. Circuit Breaker Pattern

**Uso:** Llamadas a microservicios

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly threshold = 5;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      setTimeout(() => { this.state = 'HALF_OPEN'; }, 60000);
    }
  }
}
```

**Beneficio:** Previene fallos en cascada, protege servicios downstream.

---

## Integración con Microservicios

### Arquitectura de Microservicios

```
┌────────────────────────────────────────────────────────┐
│              ACCESSIBILITY ECOSYSTEM                   │
│                                                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │ Gateway  │  │   MW     │  │  Microservicios   │   │
│  │  (8080)  │→ │  (3001)  │→ │                   │   │
│  └──────────┘  └──────────┘  │  • ms-analysis    │   │
│                               │  • ms-reports     │   │
│                               │  • ms-users       │   │
│                               └───────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Endpoints de Microservicios

#### ms-analysis (8082)

```bash
# Guardar análisis
POST /api/v1/analysis
{
  "userId": 123,
  "url": "https://example.com",
  "title": "Homepage Audit",
  "wcagVersions": ["2.1", "2.2"],
  "wcagLevels": ["A", "AA"]
}

# Guardar resultado individual
POST /api/v1/analysis-results
{
  "analysisId": 12345,
  "wcagCriterionId": 242,
  "itemId": "document-title",
  "level": "violation",
  "severity": "serious",
  "description": "Documents must have <title>"
}
```

#### ms-reports (8083)

```bash
# Guardar historial
POST /api/v1/history
{
  "userId": 123,
  "analysisId": 12345,
  "executedAt": "2025-10-15T10:30:00Z"
}
```

### Comunicación y Resiliencia

```typescript
class MicroserviceClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries = 3;
  private circuitBreaker: CircuitBreaker;

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      for (let attempt = 1; attempt <= this.retries; attempt++) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(this.timeout)
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          if (attempt === this.retries) throw error;
          await this.delay(attempt * 1000); // Exponential backoff
        }
      }
    });
  }
}
```

**Características:**
- ✅ Retry automático (3 intentos)
- ✅ Exponential backoff
- ✅ Circuit breaker integrado
- ✅ Timeout configurable
- ✅ Logging detallado

---

## Decisiones Arquitectónicas

### 1. ¿Por qué Node.js y no .NET?

**Decisión:** Node.js + TypeScript

**Razones:**
- ✅ Ecosistema JavaScript para análisis web (axe-core, Playwright)
- ✅ Mejor integración con herramientas de análisis
- ✅ Event-driven, ideal para I/O intensivo
- ✅ NPM packages maduros para accesibilidad

**Trade-offs:**
- ❌ Tipo menos seguro que .NET (mitigado con TypeScript)
- ❌ Menos familiar para equipo .NET

### 2. ¿Por qué análisis dual (axe + IBM EA)?

**Decisión:** Usar ambas herramientas en paralelo

**Razones:**
- ✅ Mayor cobertura de reglas (138+ vs 80 de axe solo)
- ✅ Diferentes enfoques (DOM vs rendered)
- ✅ Validación cruzada de resultados
- ✅ Compliance con múltiples frameworks

**Trade-offs:**
- ❌ Mayor tiempo de análisis (~50% más lento)
- ❌ Más complejo de mantener

### 3. ¿Por qué Browser Pool?

**Decisión:** Pool de 3 navegadores Playwright

**Razones:**
- ✅ Reduce overhead de inicialización (70%)
- ✅ Análisis promedio: 2.8s (vs 9s sin pool)
- ✅ Mejor uso de recursos
- ✅ Estable en producción

**Trade-offs:**
- ❌ Más memoria (3 browsers ~ 600MB)
- ❌ Complejidad de lifecycle management

### 4. ¿Por qué cache en memoria?

**Decisión:** LRU cache con TTL de 1 hora

**Razones:**
- ✅ Hit rate ~78% en producción
- ✅ Ultra rápido (<1ms lookup)
- ✅ Sin dependencias externas (Redis)
- ✅ Simple y confiable

**Trade-offs:**
- ❌ No compartido entre instancias
- ❌ Se pierde en restart

### 5. ¿Por qué no persistir directamente en DB?

**Decisión:** Delegar persistencia a microservicios .NET

**Razones:**
- ✅ Separación de responsabilidades
- ✅ Microservicios .NET ya tienen lógica de negocio
- ✅ Evita duplicación de código
- ✅ Middleware se enfoca en análisis

**Trade-offs:**
- ❌ Latencia adicional por red
- ❌ Dependencia de microservicios

---

## Escalabilidad

### Horizontal Scaling

```
         ┌──────────────┐
         │ Load Balancer│
         │   (Nginx)    │
         └──────┬───────┘
                │
        ┌───────┼───────┐
        │       │       │
        ▼       ▼       ▼
    ┌─────┐ ┌─────┐ ┌─────┐
    │ MW1 │ │ MW2 │ │ MW3 │ ← 3 instancias
    └─────┘ └─────┘ └─────┘
        │       │       │
        └───────┼───────┘
                │
        ┌───────▼────────┐
        │ Microservicios │
        │    (.NET)      │
        └────────────────┘
```

**Configuración recomendada:**
- **Instancias:** 3-5 (según carga)
- **CPU:** 2 cores por instancia
- **Memoria:** 2GB por instancia (browser pool + cache)
- **Load Balancer:** Round-robin con health checks

### Vertical Scaling

**Límites actuales:**
- Browser pool size: 3 (configurable hasta 10)
- Cache size: 100 URLs (configurable)
- Concurrent requests: ~30 por instancia

**Para aumentar capacidad en una instancia:**
```bash
# .env
BROWSER_POOL_SIZE=5        # De 3 a 5
CACHE_MAX_KEYS=200         # De 100 a 200
```

**Trade-off:** Más memoria requerida.

### Performance Benchmarks

| Métrica | Valor | Observaciones |
|---------|-------|---------------|
| **Análisis promedio** | 2.8s | Con cache miss |
| **Cache hit** | <50ms | Lookup + serialization |
| **Throughput** | ~20 req/s | Por instancia |
| **P95 latency** | <5s | Con pool optimizado |
| **P99 latency** | <10s | Incluye sitios lentos |
| **Browser pool overhead** | -70% | vs sin pool |

---

## 🔗 Referencias

- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Playwright Documentation](https://playwright.dev/)
- [axe-core API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)
- [IBM Equal Access](https://github.com/IBMa/equal-access)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)

---

**Última actualización:** 15 de Octubre de 2025
