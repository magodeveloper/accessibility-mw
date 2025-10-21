# 🔧 Troubleshooting Guide - Accessibility Middleware

## 📋 Tabla de Contenidos

- [Problemas de Instalación](#problemas-de-instalación)
- [Errores de Runtime](#errores-de-runtime)
- [Problemas de Performance](#problemas-de-performance)
- [Errores del Browser Pool](#errores-del-browser-pool)
- [Problemas de Microservicios](#problemas-de-microservicios)
- [Errores de Autenticación](#errores-de-autenticación)
- [Problemas con Docker](#problemas-con-docker)
- [Debugging Avanzado](#debugging-avanzado)
- [FAQ](#faq)

---

## Problemas de Instalación

### ❌ Error: Node version incompatible

```bash
Error: The engine "node" is incompatible with this module.
Expected version ">=20.0.0". Got "18.17.0"
```

**Solución:**

```bash
# Instalar Node.js 20.19.5 LTS
# Windows (usando nvm-windows):
nvm install 20.19.5
nvm use 20.19.5

# macOS/Linux (usando nvm):
nvm install 20.19.5
nvm use 20.19.5

# Verificar
node --version  # Debe mostrar v20.19.5 o superior
```

---

### ❌ Error: npm install falla con Playwright

```bash
Error: Failed to install browsers
Could not find Chromium executable
```

**Solución:**

```bash
# Instalar browsers de Playwright manualmente
npx playwright install chromium

# Si necesitas todos los browsers
npx playwright install

# Con dependencias del sistema (Linux)
npx playwright install-deps chromium
```

---

### ❌ Error: EACCES permissions

```bash
Error: EACCES: permission denied, access '/usr/local/lib/node_modules'
```

**Solución:**

```bash
# No usar sudo, configurar npm prefix
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstalar
npm ci
```

---

## Errores de Runtime

### ❌ Error: PORT already in use

```bash
Error: listen EADDRINUSE: address already in use :::3001
```

**Solución:**

```bash
# Windows PowerShell
$processId = Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess
Stop-Process -Id $processId -Force

# macOS/Linux
lsof -ti:3001 | xargs kill -9

# O cambiar puerto en .env
PORT=3002
```

---

### ❌ Error: JWT_SECRET_KEY not found

```bash
Error: JWT_SECRET_KEY is required but not found in environment
```

**Solución:**

```bash
# Generar nuevo secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# O usar el script PowerShell
.\Generate-JwtSecretKey.ps1

# Agregar a .env
JWT_SECRET_KEY=<el-secret-generado>
JWT_ISSUER=https://api.accessibility.example.com
JWT_EXPIRY_HOURS=24
```

---

### ❌ Error: Module not found

```bash
Error: Cannot find module './dist/server.js'
```

**Solución:**

```bash
# Compilar TypeScript
npm run build

# Verificar que dist/ se creó
ls dist/

# Si persiste, limpiar y recompilar
rm -rf dist node_modules
npm ci
npm run build
```

---

### ❌ Error: Unhandled Promise Rejection

```bash
UnhandledPromiseRejectionWarning: Error: Analysis failed
    at AnalysisService.analyzeUrl
```

**Solución:**

1. **Agregar try-catch:**

```typescript
try {
  const result = await service.analyzeUrl(url);
} catch (error) {
  logger.error({ error }, 'Analysis failed');
  throw normalizeError(error, 'Analysis failed', { url });
}
```

2. **Verificar error handler middleware:**

```typescript
// En app.ts, debe ser el ÚLTIMO middleware
app.use(errorHandler);
```

3. **Habilitar logs detallados:**

```bash
LOG_LEVEL=debug npm run dev
```

---

## Problemas de Performance

### 🐌 Análisis muy lento (>10 segundos)

**Diagnóstico:**

```javascript
// Habilitar métricas de performance
ENABLE_PERFORMANCE_MONITORING=true

// Ver métricas
curl http://localhost:3001/metrics | grep analysis_duration
```

**Causas comunes:**

1. **Browser pool agotado:**

```bash
# Ver estado del pool
curl http://localhost:3001/health | jq '.checks.browserPool'

# Aumentar tamaño del pool
BROWSER_POOL_SIZE=5  # Default: 3
```

2. **URL tarda en cargar:**

```typescript
// Reducir timeout si la página es lenta
const result = await analyzeUrl(url, {
  waitForSelector: null,  // No esperar selectores
  timeout: 15000  // Reducir de 30s a 15s
});
```

3. **Demasiados estándares:**

```typescript
// Analizar solo lo necesario
standards: ['wcag2aa']  // En lugar de todos
```

**Optimizaciones:**

```bash
# 1. Habilitar cache
CACHE_ENABLED=true
CACHE_TTL_SECONDS=3600  # 1 hora

# 2. Aumentar browser pool
BROWSER_POOL_SIZE=5

# 3. Ajustar timeouts
BROWSER_TIMEOUT_MS=20000

# 4. Horizontal scaling (múltiples instancias)
# Ver ARCHITECTURE.md - Escalabilidad
```

---

### 🐌 Alta latencia en requests

**Diagnóstico:**

```bash
# Ver métricas de latencia
curl http://localhost:3001/metrics | grep http_request_duration

# Ver logs detallados
LOG_LEVEL=trace npm run dev
```

**Solución:**

1. **Check microservices health:**

```bash
curl http://localhost:3001/health | jq '.checks.microservices'
```

2. **Verificar cache hit rate:**

```bash
curl http://localhost:3001/metrics | grep cache_hits
```

3. **Profile con Chrome DevTools:**

```bash
node --inspect src/server.ts
# Chrome: chrome://inspect
```

---

### 💾 Memory leak

**Configuración actual optimizada:**
- **Desarrollo:** `MEMORY_LIMIT=4G`, `NODE_HEAP_SIZE=2048`, `SHM_SIZE=1g`
- **Producción:** `MEMORY_LIMIT=3G`, `NODE_HEAP_SIZE=2048`, `SHM_SIZE=2g`
- **Uso típico:** ~2.20% del límite (65.9MiB / 2.933GiB)

**Síntomas:**

```bash
# Memoria creciendo constantemente
docker stats accessibility-mw

# Warnings en logs
(node:1234) MaxListenersExceededWarning: Possible EventEmitter memory leak
```

**Diagnóstico:**

```javascript
// Agregar heap dump
const heapdump = require('heapdump');
heapdump.writeSnapshot('./heap-' + Date.now() + '.heapsnapshot');
```

**Causas comunes:**

1. **Browsers no cerrados:**

```typescript
// Asegurar cleanup en browser pool
afterEach(async () => {
  await browserPool.cleanup();
});
```

2. **Event listeners no removidos:**

```typescript
// Remover listeners
process.removeListener('SIGTERM', cleanup);
```

3. **Cache sin límite:**

```bash
CACHE_MAX_KEYS=100  # Limitar tamaño
```

---

## Errores del Browser Pool

### ❌ Error: Browser pool exhausted

```bash
Error: BROWSER_POOL_EXHAUSTED - No browsers available
```

**Diagnóstico:**

```bash
# Ver estado del pool
curl http://localhost:3001/health | jq '.checks.browserPool'

# Respuesta esperada:
{
  "status": "up",
  "available": 0,  # ← Problema aquí
  "total": 3
}
```

**Solución:**

1. **Aumentar pool size:**

```bash
BROWSER_POOL_SIZE=5  # De 3 a 5
```

2. **Reducir timeout de análisis:**

```bash
BROWSER_TIMEOUT_MS=20000  # De 30s a 20s
```

3. **Horizontal scaling:**

```bash
# Levantar múltiples instancias
docker-compose up -d --scale accessibility-mw=3
```

---

### ❌ Error: Chromium crashed

```bash
Error: Browser crashed!
Target crashed
```

**Solución:**

```bash
# Linux: Instalar dependencias
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libgbm1

# Docker: Usar imagen con dependencias
FROM mcr.microsoft.com/playwright:v1.48.2-focal

# Aumentar recursos
docker run -m 2g --cpus 2 accessibility-mw
```

---

### ❌ Error: Browser launch timeout

```bash
Error: Timeout 30000ms exceeded while waiting for browser to launch
```

**Solución:**

```bash
# Aumentar timeout de launch
BROWSER_LAUNCH_TIMEOUT_MS=60000

# O ejecutar headless
BROWSER_HEADLESS=true

# En dev, reducir pool size
BROWSER_POOL_SIZE=1  # Solo 1 browser en dev
```

---

## Problemas de Microservicios

### ❌ Error: Connection refused to ms-analysis

```bash
Error: connect ECONNREFUSED 127.0.0.1:8082
```

**Diagnóstico:**

```bash
# Verificar que el servicio está corriendo
docker ps | grep ms-analysis

# Ver logs del servicio
docker logs ms-analysis

# Test de conectividad
curl http://localhost:8082/health
```

**Solución:**

```bash
# Iniciar microservicios
docker-compose up -d mysql-analysis ms-analysis ms-reports

# Verificar health
curl http://localhost:8082/health
curl http://localhost:8083/health
curl http://localhost:8084/health

# En .env, verificar URLs
ANALYSIS_API_URL=http://localhost:8082  # O nombre de container
```

---

### ❌ Error: Circuit breaker opened

```bash
Error: Circuit breaker is open for service ms-analysis
```

**Explicación:** El circuit breaker se abre después de muchos errores consecutivos para proteger el sistema.

**Solución:**

1. **Verificar health del servicio:**

```bash
curl http://localhost:8082/health
```

2. **Ver logs del servicio:**

```bash
docker logs ms-analysis --tail 100
```

3. **Esperar a que se cierre (default: 60s):**

```bash
# El circuit breaker intentará recuperarse automáticamente
# Monitorear logs:
grep "Circuit breaker" logs/app.log
```

4. **Ajustar configuración:**

```typescript
// En microservices.client.ts
circuitBreaker: {
  threshold: 5,        // Errores antes de abrir (default: 3)
  timeout: 30000,      // Timeout antes de reintentar (default: 60s)
  resetTimeout: 30000  // Tiempo antes de cerrar (default: 60s)
}
```

---

### ❌ Error: 502 Bad Gateway

```bash
HTTP/1.1 502 Bad Gateway
{ "error": "Gateway received invalid response" }
```

**Solución:**

```bash
# 1. Verificar que todos los servicios están arriba
docker-compose ps

# 2. Reiniciar servicios problemáticos
docker-compose restart ms-analysis

# 3. Ver logs de middleware
docker logs accessibility-mw --tail 50

# 4. Verificar configuración de URLs
echo $ANALYSIS_API_URL
```

---

## Errores de Autenticación

### ❌ Error: JWT token invalid

```bash
HTTP/1.1 401 Unauthorized
{ "error": { "code": "AUTHENTICATION_ERROR", "message": "Invalid JWT token" } }
```

**Diagnóstico:**

```bash
# Decodificar token (sin verificar)
echo "eyJhbGciOiJIUzI1NiIs..." | cut -d. -f2 | base64 -d | jq

# Verificar emisor (iss)
# Verificar expiración (exp)
```

**Causas comunes:**

1. **Token expirado:**

```json
{
  "exp": 1698000000  // ← Comparar con Date.now()/1000
}
```

Solución: Generar nuevo token.

2. **Secret incorrecto:**

```bash
# Verificar que el secret es el mismo que se usó para firmar
.\Validate-JwtConfig.ps1
```

3. **Issuer incorrecto:**

```bash
# En .env
JWT_ISSUER=https://api.accessibility.example.com

# Debe coincidir con el token
```

---

### ❌ Error: Gateway signature validation failed

```bash
Error: GATEWAY_VALIDATION_FAILED - Invalid HMAC signature
```

**Solución:**

```bash
# En desarrollo, desactivar validación
GATEWAY_VALIDATION_ENABLED=false

# En producción, verificar secret
GATEWAY_SECRET=<mismo-secret-que-gateway>

# Verificar timestamp (no más de 5 min de diferencia)
date +%s
```

---

## Problemas con Docker

### ❌ Error: Cannot connect to Docker daemon

```bash
Error: Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solución:**

```bash
# Windows: Iniciar Docker Desktop
start docker

# Linux: Iniciar servicio
sudo systemctl start docker

# Verificar
docker ps
```

---

### ❌ Error: Port already allocated

```bash
Error: Bind for 0.0.0.0:3001 failed: port is already allocated
```

**Solución:**

```bash
# Detener contenedor que usa el puerto
docker ps | grep 3001
docker stop <container-id>

# O cambiar puerto en docker-compose.yml
ports:
  - "3002:3001"  # Host:Container
```

---

### ❌ Error: Build failed en Docker

```bash
Error: failed to solve with frontend dockerfile.v0
```

**Solución:**

```bash
# Limpiar cache de Docker
docker builder prune -a

# Rebuild sin cache
docker-compose build --no-cache accessibility-mw

# Verificar Dockerfile
cat Dockerfile
```

---

### ❌ Error: Container exits immediately

```bash
docker ps  # No muestra el container
docker ps -a  # Muestra: Exited (1) 2 seconds ago
```

**Diagnóstico:**

```bash
# Ver logs
docker logs accessibility-mw

# Ver error exacto
docker logs accessibility-mw --tail 50
```

**Causas comunes:**

1. **Variables de entorno faltantes:**

```yaml
# En docker-compose.yml
environment:
  - NODE_ENV=production
  - JWT_SECRET_KEY=${JWT_SECRET_KEY}  # ← Asegurar que está definida
```

2. **Comando incorrecto:**

```dockerfile
# En Dockerfile
CMD ["node", "dist/server.js"]  # Verificar path
```

---

## Debugging Avanzado

### 🔍 Debug con Chrome DevTools

```bash
# Iniciar con inspector
node --inspect src/server.ts

# O en modo break
node --inspect-brk src/server.ts

# Chrome: chrome://inspect
# Click en "inspect" en tu aplicación
```

---

### 🔍 Debug de requests HTTP

```bash
# 1. Habilitar logs de requests
LOG_LEVEL=trace npm run dev

# 2. Ver todos los headers
curl -v http://localhost:3001/api/analyze \
  -H "Authorization: Bearer ..."

# 3. Usar Postman con console
# View > Show Postman Console
```

---

### 🔍 Capturar heapdump

```bash
# Instalar heapdump
npm install --save-dev heapdump

# En código:
const heapdump = require('heapdump');
heapdump.writeSnapshot('./heap.heapsnapshot');

# Analizar en Chrome DevTools
# Memory > Load heap snapshot
```

---

### 🔍 Profile CPU

```bash
# Iniciar con profiler
node --prof src/server.ts

# Generar reporte
node --prof-process isolate-0x*.log > profile.txt

# Analizar bottlenecks
cat profile.txt | grep -A 10 "Bottom up"
```

---

### 🔍 Network tracing

```bash
# Ver todas las conexiones
netstat -ano | findstr :3001  # Windows
lsof -i :3001  # macOS/Linux

# Trace de DNS/TCP
tcpdump -i any port 3001  # Linux (requiere root)
```

---

## FAQ

### ❓ ¿Por qué el análisis está lento?

**R:** Posibles causas:
1. Browser pool agotado → Aumentar `BROWSER_POOL_SIZE`
2. URL tarda en cargar → Reducir timeout o optimizar página
3. Cache deshabilitada → Habilitar `CACHE_ENABLED=true`
4. Muchos análisis concurrentes → Horizontal scaling

---

### ❓ ¿Cómo escalar horizontalmente?

**R:**

```bash
# Docker Compose
docker-compose up -d --scale accessibility-mw=3

# Con load balancer (nginx)
# Ver ARCHITECTURE.md - Escalabilidad
```

---

### ❓ ¿Cómo hacer backup de la cache?

**R:** La cache es in-memory (node-cache), no persiste. Para cache persistente:

```typescript
// Opción 1: Redis
import Redis from 'ioredis';
const redis = new Redis();

// Opción 2: Exportar a JSON periódicamente
setInterval(() => {
  fs.writeFileSync('cache-backup.json', JSON.stringify(cache.keys()));
}, 3600000);  // Cada hora
```

---

### ❓ ¿Cómo monitorear en producción?

**R:**

```bash
# 1. Health checks
curl http://localhost:3001/health

# 2. Metrics (Prometheus)
curl http://localhost:3001/metrics

# 3. Logs estructurados (Pino)
tail -f logs/app.log | jq

# 4. Dashboards (Grafana)
# Importar dashboard desde prometheus.yml
```

---

### ❓ ¿Cómo rotar logs?

**R:**

```bash
# Linux: logrotate
# /etc/logrotate.d/accessibility-mw
/var/log/accessibility-mw/*.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
}

# Windows: Usar winston-daily-rotate-file
npm install winston-daily-rotate-file
```

---

### ❓ ¿Cómo actualizar axe-core o IBM Equal Access?

**R:**

```bash
# Ver versiones actuales
npm list axe-core @ibma/aci-checker

# Actualizar
npm update axe-core @ibma/aci-checker

# Verificar cambios en WCAG mappers
npm test -- tests/unit/wcag-mapping.test.ts
```

---

### ❓ ¿Qué hacer si Playwright no funciona en Docker?

**R:**

```dockerfile
# Usar imagen oficial de Playwright
FROM mcr.microsoft.com/playwright:v1.48.2-focal

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

# No ejecutar como root
USER pwuser
```

---

### ❓ ¿Cómo testear en producción sin afectar users?

**R:**

```typescript
// Feature flags
const ENABLE_NEW_FEATURE = process.env.ENABLE_NEW_FEATURE === 'true';

if (ENABLE_NEW_FEATURE && user.isTestUser) {
  // Nueva feature
} else {
  // Feature actual
}

// Canary deployment
// Ver CI/CD docs para deployment gradual
```

---

## 🆘 Contacto y Soporte

### Logs de Error

Cuando reportes un issue, incluye:

```bash
# 1. Versión
node --version
npm --version

# 2. Environment
cat .env | grep -v SECRET

# 3. Logs (últimas 50 líneas)
tail -50 logs/app.log

# 4. Health check
curl http://localhost:3001/health | jq

# 5. Metrics relevantes
curl http://localhost:3001/metrics | grep error
```

### Reportar Issue

Template para GitHub Issues:

```markdown
**Descripción del problema:**
[Descripción clara]

**Pasos para reproducir:**
1. ...
2. ...
3. ...

**Comportamiento esperado:**
[Lo que debería pasar]

**Comportamiento actual:**
[Lo que pasa actualmente]

**Environment:**
- OS: [Windows/macOS/Linux]
- Node: [version]
- Docker: [version]

**Logs:**
```
[Pegar logs relevantes]
```

**Screenshots (si aplica):**
[Capturas de pantalla]
```

---

## 🔗 Referencias

- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Playwright Troubleshooting](https://playwright.dev/docs/troubleshooting)
- [Docker Troubleshooting](https://docs.docker.com/config/daemon/troubleshoot/)
- [JWT Debugging](https://jwt.io/)

---

**Última actualización:** 15 de Octubre de 2025
