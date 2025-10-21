# 🛠️ Guía de Desarrollo - Accessibility Middleware

## 📋 Tabla de Contenidos

- [Setup Inicial](#setup-inicial)
- [Entorno de Desarrollo](#entorno-de-desarrollo)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Testing](#testing)
- [Debugging](#debugging)
- [Code Style](#code-style)
- [Git Workflow](#git-workflow)
- [Mejores Prácticas](#mejores-prácticas)

---

## Setup Inicial

### Requisitos Previos

```bash
# Verificar versiones
node --version  # v20.19.5 LTS o superior
npm --version   # v10.0.0 o superior
git --version   # v2.40 o superior
docker --version # v24.0 o superior
```

**Recursos recomendados:**
- **RAM:** 8GB+ (4GB para contenedor de desarrollo)
- **CPU:** 4 cores (2 cores para contenedor)
- **Disco:** 5GB+ libres

### Instalación Completa

```bash
# 1. Clonar repositorio
git clone https://github.com/your-org/accessibility-mw.git
cd accessibility-mw

# 2. Instalar dependencias
npm ci

# 3. Configurar entorno de desarrollo
cp .env.template .env.development

# 4. Generar secretos JWT
.\Generate-JwtSecretKey.ps1  # Windows
# o
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# 5. Editar .env.development con tus configuraciones
code .env.development

# 6. Compilar TypeScript
npm run build

# 7. Verificar instalación
npm run lint
npm run type-check
npm test
```

### Configuración de .env.development

```bash
# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# JWT
JWT_SECRET_KEY=<tu-secret-generado>
JWT_ISSUER=https://api.accessibility.local.com
JWT_EXPIRY_HOURS=24

# Gateway (opcional en dev)
GATEWAY_SECRET=<tu-gateway-secret>
GATEWAY_VALIDATION_ENABLED=false  # Desactivar en dev local

# Microservicios (usar Docker Compose)
ANALYSIS_API_URL=http://localhost:8082
REPORTS_API_URL=http://localhost:8083
USERS_API_URL=http://localhost:8084

# Browser Pool
BROWSER_POOL_SIZE=2  # Menos instancias en dev
BROWSER_TIMEOUT_MS=30000
BROWSER_HEADLESS=true  # false para ver el navegador

# Cache
CACHE_ENABLED=true
CACHE_TTL_SECONDS=600  # 10 min en dev (vs 1 hora en prod)

# Logging
LOG_LEVEL=debug  # Más verboso en dev
ENABLE_VERBOSE_LOGGING=true

# Performance
ENABLE_METRICS=true
ENABLE_PERFORMANCE_MONITORING=true
```

---

## Entorno de Desarrollo

### Opción 1: Desarrollo Local (Recomendado)

```bash
# Terminal 1: Microservicios .NET
cd accessibility-mw
docker compose -f docker-compose.ci.yml up -d mysql-analysis ms-analysis ms-reports

# Terminal 2: Middleware en modo desarrollo
npm run dev

# Terminal 3: Watch tests
npm run test:watch
```

**Beneficios:**
- ✅ Hot-reload automático
- ✅ Debugging en VS Code
- ✅ Logs en tiempo real
- ✅ Cambios instantáneos

### Opción 2: Todo en Docker

```bash
# Levantar todo el stack
docker compose up -d

# Ver logs del middleware
docker compose logs -f accessibility-mw

# Rebuild después de cambios
docker compose up -d --build accessibility-mw
```

**Cuándo usar:**
- ✅ Probar integración completa
- ✅ Simular ambiente de producción
- ✅ Debugging de issues específicos de Docker

### Hot Reload

El modo desarrollo usa `nodemon` para hot-reload:

```json
// nodemon.json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.test.ts"],
  "exec": "ts-node src/server.ts"
}
```

**Trigger reload manual:**
```bash
# Simplemente guarda cualquier archivo .ts
# O toca el server.ts
touch src/server.ts
```

---

## Estructura del Proyecto

```
accessibility-mw/
├── src/
│   ├── config/                # Configuraciones
│   │   ├── environment.ts     # Variables de entorno
│   │   ├── health.config.ts   # Config de health checks
│   │   └── swagger.config.ts  # OpenAPI spec
│   │
│   ├── middlewares/           # Express middlewares
│   │   ├── authenticate.ts    # JWT validation
│   │   ├── cors.ts            # CORS config
│   │   ├── errorHandler.ts    # Error handling
│   │   └── requestLogger.ts   # Request logging
│   │
│   ├── routes/                # Express routes
│   │   ├── analyze.routes.ts  # POST /api/analyze
│   │   ├── health.routes.ts   # GET /health
│   │   └── metrics.routes.ts  # GET /metrics
│   │
│   ├── services/              # Business logic
│   │   ├── analysis.service.ts         # Core orchestrator
│   │   ├── browser.pool.service.ts     # Browser pool
│   │   ├── cache.service.ts            # LRU cache
│   │   ├── health.monitor.service.ts   # Health checks
│   │   ├── logging.service.ts          # Pino logger
│   │   ├── metrics.service.ts          # Prometheus metrics
│   │   └── performance.service.ts      # Performance tracking
│   │
│   ├── utils/                 # Utilities
│   │   ├── error-handler.ts   # Error normalization
│   │   ├── validators.ts      # Input validation
│   │   └── wcag-mapping.ts    # WCAG mappers
│   │
│   ├── types/                 # TypeScript types
│   │   ├── analysis.types.ts  # Analysis interfaces
│   │   ├── error.types.ts     # Error interfaces
│   │   └── wcag.types.ts      # WCAG interfaces
│   │
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server entry point
│
├── tests/
│   ├── unit/                  # Unit tests
│   │   ├── services/
│   │   ├── utils/
│   │   └── middlewares/
│   │
│   ├── integration/           # Integration tests
│   │   ├── api/
│   │   └── services/
│   │
│   ├── e2e/                   # End-to-end tests
│   │   └── analyze.e2e.test.ts
│   │
│   └── load/                  # Load tests
│       └── k6-analysis.js
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEVELOPMENT.md         # Este archivo
│   └── TROUBLESHOOTING.md
│
├── scripts/                   # Utility scripts
│   ├── Generate-JwtSecretKey.ps1
│   └── Validate-JwtConfig.ps1
│
├── .env.template              # Environment template
├── .eslintrc.json             # ESLint config
├── .prettierrc                # Prettier config
├── docker-compose.yml         # Docker Compose
├── Dockerfile                 # Docker image
├── jest.config.js             # Jest config
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── README.md                  # Main documentation
```

### Convenciones de Nombres

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| **Archivos** | kebab-case | `analysis.service.ts` |
| **Clases** | PascalCase | `AnalysisService` |
| **Interfaces** | PascalCase | `AnalysisResult` |
| **Funciones** | camelCase | `analyzeUrl()` |
| **Constantes** | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| **Variables** | camelCase | `analysisResult` |
| **Tests** | *.test.ts | `analysis.service.test.ts` |

---

## Flujo de Trabajo

### 1. Crear Nueva Feature

```bash
# 1. Crear rama desde develop
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad

# 2. Implementar cambios
code src/services/nueva.service.ts

# 3. Escribir tests
code tests/unit/nueva.service.test.ts

# 4. Ejecutar tests
npm run test:watch

# 5. Verificar linting y types
npm run lint
npm run type-check

# 6. Commit con mensaje descriptivo
git add .
git commit -m "feat: agregar nueva funcionalidad"

# 7. Push y crear PR
git push origin feature/nueva-funcionalidad
# Crear Pull Request en GitHub
```

### 2. Agregar Nuevo Endpoint

**Ejemplo:** Agregar `GET /api/status`

```typescript
// 1. Crear route handler
// src/routes/status.routes.ts
import { Router, Request, Response } from 'express';

const router = Router();

router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await getSystemStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    throw error; // Manejado por errorHandler middleware
  }
});

export default router;

// 2. Registrar en app.ts
import statusRoutes from './routes/status.routes';
app.use('/api', statusRoutes);

// 3. Escribir tests
// tests/unit/status.routes.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('GET /api/status', () => {
  test('should return system status', async () => {
    const response = await request(app).get('/api/status');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// 4. Documentar en OpenAPI
// src/config/swagger.config.ts
paths: {
  '/api/status': {
    get: {
      summary: 'Get system status',
      responses: {
        200: {
          description: 'System status',
          content: { 'application/json': { schema: { ... } } }
        }
      }
    }
  }
}
```

### 3. Agregar Nuevo Service

```typescript
// 1. Crear interface
// src/types/nuevo.types.ts
export interface NuevoServiceConfig {
  timeout: number;
  retries: number;
}

export interface NuevoResult {
  success: boolean;
  data: any;
}

// 2. Implementar service
// src/services/nuevo.service.ts
import { NuevoServiceConfig, NuevoResult } from '../types/nuevo.types';
import { advancedLogger as logger } from './logging.service';

export class NuevoService {
  private config: NuevoServiceConfig;

  constructor(config: NuevoServiceConfig) {
    this.config = config;
  }

  async execute(): Promise<NuevoResult> {
    logger.info({ operation: 'nuevo.execute' }, 'Starting execution');
    
    try {
      // Implementación...
      return { success: true, data: {} };
    } catch (error) {
      logger.error({ error, operation: 'nuevo.execute' }, 'Execution failed');
      throw error;
    }
  }
}

// 3. Exportar instancia singleton
export const nuevoService = new NuevoService({
  timeout: 5000,
  retries: 3
});

// 4. Escribir tests completos
// tests/unit/nuevo.service.test.ts
import { NuevoService } from '../../src/services/nuevo.service';

describe('NuevoService', () => {
  let service: NuevoService;

  beforeEach(() => {
    service = new NuevoService({ timeout: 1000, retries: 1 });
  });

  describe('execute', () => {
    test('should execute successfully', async () => {
      const result = await service.execute();
      expect(result.success).toBe(true);
    });

    test('should handle errors', async () => {
      // Mock error scenario
      await expect(service.execute()).rejects.toThrow();
    });
  });
});
```

---

## Testing

### Estrategia de Testing

| Nivel | Cobertura | Velocidad | Cuándo ejecutar |
|-------|-----------|-----------|-----------------|
| **Unit** | 90%+ | <10s | Cada cambio |
| **Integration** | 85%+ | <30s | Pre-commit |
| **E2E** | 70%+ | <2min | Pre-push |
| **Load** | N/A | <5min | Pre-release |

### Unit Tests

```bash
# Ejecutar todos los tests unitarios
npm run test:unit

# Watch mode (recomendado durante desarrollo)
npm run test:watch

# Test específico
npm test -- --testPathPattern=analysis.service

# Con cobertura
npm run test:coverage
```

**Estructura de test unitario:**

```typescript
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AnalysisService } from '../../src/services/analysis.service';

describe('AnalysisService', () => {
  let service: AnalysisService;

  beforeEach(() => {
    // Setup: Crear instancia limpia antes de cada test
    service = new AnalysisService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Teardown: Limpiar recursos
    jest.restoreAllMocks();
  });

  describe('analyzeUrl', () => {
    test('should analyze valid URL successfully', async () => {
      // Arrange
      const url = 'https://example.com';
      const options = { standards: ['wcag2aa'] };

      // Act
      const result = await service.analyzeUrl(url, options);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should throw error for invalid URL', async () => {
      // Arrange
      const invalidUrl = 'not-a-url';

      // Act & Assert
      await expect(
        service.analyzeUrl(invalidUrl, {})
      ).rejects.toThrow('Invalid URL');
    });

    test('should use cache when available', async () => {
      // Arrange
      const url = 'https://example.com';
      const cacheSpy = jest.spyOn(service['cache'], 'get');

      // Act
      await service.analyzeUrl(url, {});
      await service.analyzeUrl(url, {}); // Segunda llamada

      // Assert
      expect(cacheSpy).toHaveBeenCalledTimes(2);
    });
  });
});
```

### Integration Tests

```bash
# Ejecutar tests de integración
npm run test:integration

# Con microservicios reales (Docker)
docker compose -f docker-compose.ci.yml up -d
npm run test:integration:real
```

**Ejemplo:**

```typescript
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/analyze - Integration', () => {
  test('should perform complete analysis flow', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        url: 'https://example.com',
        standards: ['wcag2aa'],
        userId: 123
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.analysisId).toBeDefined();
  });
});
```

### E2E Tests

```bash
# Tests end-to-end completos
npm run test:e2e
```

### Load Tests

```bash
# Carga ligera (20 VUs)
npm run load:light

# Carga media (50 VUs)
npm run load:medium

# Stress test
npm run load:stress
```

### Coverage Reports

```bash
# Generar reporte de cobertura
npm run test:coverage

# Ver reporte HTML
start coverage\lcov-report\index.html  # Windows
open coverage/lcov-report/index.html   # macOS/Linux
```

**Target de cobertura:**
- Statements: 85%+
- Branches: 82%+
- Functions: 88%+
- Lines: 85%+

---

## Debugging

### VS Code Debug Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/server.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "envFile": "${workspaceFolder}/.env.development"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${fileBasenameNoExtension}", "--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debugging Tips

#### 1. Debug con Breakpoints

```typescript
// Colocar breakpoint en VS Code (click en número de línea)
const result = await service.analyzeUrl(url); // ← breakpoint aquí

// F5: Iniciar debug
// F10: Step over
// F11: Step into
// F5: Continue
```

#### 2. Debug con Console Logs

```typescript
// Logs estructurados con Pino
logger.debug({ url, options }, 'Starting analysis');

// Console.log para debug rápido (remover después)
console.log('DEBUG:', { url, options });
```

#### 3. Debug de Tests

```bash
# Debug test específico
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/analysis.service.test.ts

# En Chrome: chrome://inspect
```

#### 4. Debug de HTTP Requests

```bash
# Ver logs detallados de requests
LOG_LEVEL=trace npm run dev

# O usar herramientas
curl -v http://localhost:3001/health
# Postman con console logging
```

#### 5. Debug de Browser Automation

```typescript
// Ver navegador en acción
const browser = await playwright.chromium.launch({
  headless: false,  // ← Ver navegador
  slowMo: 500       // ← Slow motion (500ms entre acciones)
});
```

### Troubleshooting Común

```bash
# 1. Puerto en uso
Error: listen EADDRINUSE: address already in use :::3001

# Solución:
netstat -ano | findstr :3001  # Windows
lsof -ti:3001 | xargs kill    # macOS/Linux

# 2. Module not found
Error: Cannot find module './dist/server.js'

# Solución:
npm run build

# 3. Tests failing después de cambios
# Solución:
npm run test -- --clearCache
rm -rf node_modules .npm
npm ci
```

---

## Code Style

### ESLint Configuration

`.eslintrc.json`:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Prettier Configuration

`.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

### Comandos de Linting

```bash
# Ejecutar linter
npm run lint

# Auto-fix
npm run lint:fix

# Type checking
npm run type-check

# Formatear código
npm run format
```

### Pre-commit Hooks

`.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run type-check
npm test
```

---

## Git Workflow

### Branching Strategy

```
main (production)
  ↑
  └── develop (staging)
        ├── feature/nueva-feature
        ├── fix/bug-fix
        └── hotfix/critical-fix
```

### Commit Message Convention

```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:     # Nueva feature
fix:      # Bug fix
docs:     # Cambios en documentación
style:    # Formato (sin cambios de código)
refactor: # Refactoring
test:     # Agregar/modificar tests
chore:    # Mantenimiento

# Ejemplos:
git commit -m "feat(analysis): agregar soporte para WCAG 2.2"
git commit -m "fix(cache): corregir memory leak en LRU cache"
git commit -m "docs: actualizar README con nuevos endpoints"
git commit -m "test(browser-pool): agregar tests de cleanup"
```

### Pull Request Template

```markdown
## Descripción
Breve descripción de los cambios.

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva feature
- [ ] Breaking change
- [ ] Documentación

## Checklist
- [ ] Tests pasando (`npm test`)
- [ ] Linting sin errores (`npm run lint`)
- [ ] Type checking sin errores (`npm run type-check`)
- [ ] Coverage mantenida o mejorada
- [ ] Documentación actualizada

## Screenshots (si aplica)

## Notas adicionales
```

---

## Mejores Prácticas

### 1. Error Handling

```typescript
// ✅ GOOD: Usar ErrorFactory
throw ErrorFactory.validation('Invalid URL format');

// ❌ BAD: throw new Error genérico
throw new Error('Invalid URL');

// ✅ GOOD: Normalizar errores
try {
  await someOperation();
} catch (error) {
  throw normalizeError(error, 'Operation failed', context);
}
```

### 2. Logging

```typescript
// ✅ GOOD: Structured logging con contexto
logger.info(
  { url, userId, duration: 2847 },
  'Analysis completed successfully'
);

// ❌ BAD: Console.log sin contexto
console.log('Analysis completed');

// ✅ GOOD: Log levels apropiados
logger.debug({ data }, 'Detailed debug info');
logger.info({ result }, 'Operation completed');
logger.error({ error }, 'Operation failed');
logger.fatal({ error }, 'Critical failure');
```

### 3. Async/Await

```typescript
// ✅ GOOD: Usar async/await
async function analyzeUrl(url: string): Promise<Result> {
  const result = await fetchData(url);
  return processResult(result);
}

// ❌ BAD: Promise chains anidados
function analyzeUrl(url: string): Promise<Result> {
  return fetchData(url).then(result => {
    return processResult(result).then(final => {
      return final;
    });
  });
}
```

### 4. Type Safety

```typescript
// ✅ GOOD: Tipos explícitos
interface AnalysisOptions {
  standards: string[];
  includeScreenshots: boolean;
}

async function analyze(url: string, options: AnalysisOptions): Promise<Result> {
  // ...
}

// ❌ BAD: any types
async function analyze(url: any, options: any): Promise<any> {
  // ...
}
```

### 5. Testing

```typescript
// ✅ GOOD: Tests descriptivos y completos
describe('AnalysisService', () => {
  describe('analyzeUrl', () => {
    test('should handle valid URL with wcag2aa standard', async () => {
      // Arrange, Act, Assert
    });

    test('should throw ValidationError for invalid URL format', async () => {
      // ...
    });

    test('should return cached result when available', async () => {
      // ...
    });
  });
});

// ❌ BAD: Tests genéricos
test('it works', () => {
  expect(true).toBe(true);
});
```

---

## 🔗 Referencias Útiles

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright API](https://playwright.dev/docs/api/class-playwright)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Última actualización:** 15 de Octubre de 2025
