# 🚀 Guía de Despliegue en Producción - Accessibility Middleware

Esta guía proporciona instrucciones paso a paso para desplegar el Accessibility Middleware en producción.

---

## 📋 Tabla de Contenidos

- [Prerequisitos](#prerequisitos)
- [Configuración Inicial](#configuración-inicial)
- [Preparación del Entorno](#preparación-del-entorno)
- [Despliegue con Docker Compose](#despliegue-con-docker-compose)
- [Verificación Post-Despliegue](#verificación-post-despliegue)
- [Monitoreo](#monitoreo)
- [Troubleshooting](#troubleshooting)
- [Rollback](#rollback)
- [Mantenimiento](#mantenimiento)

---

## ✅ Prerequisitos

### Requisitos del Sistema

- **Docker**: >= 24.0.0
- **Docker Compose**: >= 2.20.0
- **Node.js**: >= 20.19.5 LTS (para build local)
- **Memoria RAM**: Mínimo 4GB disponibles para el contenedor (8GB recomendado)
- **Disco**: Mínimo 2GB disponibles

**Notas de Versión:**
- Imagen base builder: `node:20.19.5-alpine3.22` (vulnerabilidades reducidas 50%)
- Imagen runtime: `mcr.microsoft.com/playwright:v1.56.1-jammy`
- Configuración de memoria optimizada para Playwright

### Requisitos de Red

- Puerto 3001 disponible
- Acceso a microservicio de Analysis (puerto 8082)
- Red Docker `accessibility-shared` creada

### Requisitos de Seguridad

- Certificados SSL/TLS (si se usa HTTPS)
- Secretos JWT y Gateway configurados
- Firewall configurado para permitir tráfico necesario

---

## 🔧 Configuración Inicial

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd accessibility-mw
```

### 2. Configurar Variables de Entorno

```bash
# Copiar template de producción
cp .env.production .env.production.local

# Editar configuración
nano .env.production.local  # o usar tu editor preferido
```

### 3. Generar Secretos Seguros

```powershell
# PowerShell - Generar JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# PowerShell - Generar Gateway Secret
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

Copiar los secretos generados a `.env.production`:

```bash
JWT_SECRET_KEY=<secret-generado-1>
GATEWAY_SECRET=<secret-generado-2>
```

### 4. Configurar CORS y URLs

Editar `.env.production`:

```bash
# CORS - Agregar dominios de producción
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com

# URL del microservicio de análisis
ANALYSIS_API_URL=http://ms-analysis-service:8082  # Kubernetes
# o
ANALYSIS_API_URL=http://host.docker.internal:8082  # Docker Compose
```

---

## 🏗️ Preparación del Entorno

### 1. Crear Red Docker Compartida

```bash
# Crear red para comunicación con otros microservicios
docker network create accessibility-shared
```

### 2. Instalar Dependencias

```bash
npm ci --omit=dev
```

### 3. Compilar TypeScript

```bash
npm run build
```

### 4. Validar Configuración

```bash
# Ejecutar validación de producción
npm run validate:production
```

**Resultado esperado:**
```
✅ VALIDATION SUCCESSFUL - READY FOR PRODUCTION
```

---

## 🚀 Despliegue con Docker Compose

### Opción 1: Usando NPM Scripts (Recomendado)

```bash
# 1. Build de la imagen
npm run docker:build:prod

# 2. Levantar servicio
npm run docker:up:prod

# 3. Verificar estado
npm run docker:status:prod
```

### Opción 2: Usando Docker Compose Directamente

```bash
# Build
docker compose --env-file .env.production -f docker-compose.production.yml build --no-cache

# Up
docker compose --env-file .env.production -f docker-compose.production.yml up -d

# Status
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

### Variables de Build (Opcional)

Para incluir metadata de build:

```bash
# Configurar variables
export BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export VERSION="1.0.0"
export VCS_REF=$(git rev-parse --short HEAD)

# Build con metadata
docker compose --env-file .env.production -f docker-compose.production.yml build \
  --build-arg BUILD_DATE="$BUILD_DATE" \
  --build-arg VERSION="$VERSION" \
  --build-arg VCS_REF="$VCS_REF"
```

---

## ✅ Verificación Post-Despliegue

### 1. Verificar Estado del Contenedor

```bash
docker ps | grep accessibility-mw-prod
```

**Resultado esperado:**
```
CONTAINER ID   IMAGE                    STATUS                   PORTS
abc123def456   accessibility-mw:latest  Up 2 minutes (healthy)   0.0.0.0:3001->3001/tcp
```

### 2. Verificar Health Checks

```bash
# Health check endpoint
curl http://localhost:3001/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-20T...",
#   "uptime": 120,
#   "services": { ... }
# }
```

### 3. Verificar Logs

```bash
# Ver logs en tiempo real
npm run docker:logs:prod:follow

# o
docker compose -f docker-compose.production.yml logs -f
```

### 4. Probar Endpoint de Análisis

```bash
# Test básico de análisis
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Secret: YOUR_GATEWAY_SECRET" \
  -d '{
    "url": "https://www.example.com",
    "userId": 1,
    "sessionId": "test-session"
  }'
```

### 5. Verificar Métricas

```bash
# Prometheus metrics
curl http://localhost:3001/metrics
```

---

## 📊 Monitoreo

### Health Checks

```bash
# Liveness probe
curl http://localhost:3001/health/live

# Readiness probe
curl http://localhost:3001/health/ready

# Full health check
curl http://localhost:3001/health
```

### Logs

```bash
# Logs en tiempo real
docker compose -f docker-compose.production.yml logs -f accessibility-mw

# Últimas 100 líneas
docker compose -f docker-compose.production.yml logs --tail=100 accessibility-mw

# Logs desde una fecha específica
docker compose -f docker-compose.production.yml logs --since="2025-10-20T10:00:00"
```

### Métricas de Recursos

```bash
# Uso de recursos del contenedor
docker stats accessibility-mw-prod

# Inspeccionar contenedor
docker inspect accessibility-mw-prod
```

### Prometheus Metrics

El middleware expone métricas en `http://localhost:3001/metrics`:

- `http_requests_total` - Total de requests HTTP
- `http_request_duration_seconds` - Duración de requests
- `browser_pool_size` - Tamaño del pool de navegadores
- `cache_hit_rate` - Tasa de aciertos del cache
- `analysis_duration_seconds` - Duración de análisis

---

## 🔧 Troubleshooting

### Contenedor No Inicia

```bash
# Ver logs de error
docker compose -f docker-compose.production.yml logs accessibility-mw

# Verificar configuración
docker compose -f docker-compose.production.yml config

# Verificar variables de entorno
docker compose -f docker-compose.production.yml exec accessibility-mw env
```

### Health Check Fallando

```bash
# Verificar conectividad
docker compose -f docker-compose.production.yml exec accessibility-mw curl http://localhost:3001/health

# Verificar procesos dentro del contenedor
docker compose -f docker-compose.production.yml exec accessibility-mw ps aux

# Verificar logs de la aplicación
docker compose -f docker-compose.production.yml logs --tail=50 accessibility-mw
```

### Problemas de Memoria

**Configuración Optimizada:**

```bash
# Desarrollo (.env.development)
MEMORY_LIMIT=4G
NODE_HEAP_SIZE=2048
SHM_SIZE=1g

# Producción (.env.production) - Configuración actual
MEMORY_LIMIT=3G
NODE_HEAP_SIZE=2048
SHM_SIZE=2g

# Si necesitas más recursos, aumenta límites:
MEMORY_LIMIT=4G
NODE_HEAP_SIZE=3072
SHM_SIZE=3g

# Rebuild y restart
npm run docker:down:prod
npm run docker:up:prod
```

**Nota:** La configuración actual está optimizada y validada. El uso de memoria es ~2.20% del límite (65.9MiB / 2.933GiB).

### Problemas de Red

```bash
# Verificar redes
docker network ls
docker network inspect accessibility-shared

# Verificar conectividad con Analysis API
docker compose -f docker-compose.production.yml exec accessibility-mw \
  curl http://host.docker.internal:8082/health
```

---

## ⏮️ Rollback

### Rollback a Versión Anterior

```bash
# 1. Detener contenedor actual
npm run docker:down:prod

# 2. Usar imagen anterior
docker tag accessibility-mw:1.0.0-backup accessibility-mw:latest

# 3. Reiniciar
npm run docker:up:prod
```

### Rollback con Git

```bash
# 1. Checkout a commit anterior
git checkout <commit-hash>

# 2. Rebuild
npm run docker:build:prod

# 3. Deploy
npm run docker:up:prod
```

---

## 🔄 Mantenimiento

### Actualización de Versión

```bash
# 1. Pull latest changes
git pull origin main

# 2. Validar
npm run validate:production

# 3. Build nueva versión
VERSION=1.1.0 npm run docker:build:prod

# 4. Deploy con downtime mínimo
npm run docker:restart:prod
```

### Limpieza de Recursos

```bash
# Limpiar imágenes antiguas
docker image prune -a

# Limpiar volúmenes no usados
docker volume prune

# Limpiar todo (CUIDADO)
docker system prune -a
```

### Backup

```bash
# Backup de configuración
cp .env.production .env.production.backup.$(date +%Y%m%d)

# Backup de logs (si se usan volúmenes)
docker run --rm -v accessibility-mw-logs:/logs -v $(pwd):/backup \
  alpine tar czf /backup/logs-backup-$(date +%Y%m%d).tar.gz /logs
```

---

## 📝 Checklist de Despliegue

- [ ] Variables de entorno configuradas en `.env.production`
- [ ] Secretos JWT y Gateway generados y configurados
- [ ] CORS_ORIGINS configurado con dominios de producción
- [ ] ANALYSIS_API_URL apuntando al servicio correcto
- [ ] Red `accessibility-shared` creada
- [ ] Validación ejecutada: `npm run validate:production`
- [ ] Build exitoso: `npm run docker:build:prod`
- [ ] Contenedor levantado: `npm run docker:up:prod`
- [ ] Health check OK: `curl http://localhost:3001/health`
- [ ] Endpoint de análisis funcional
- [ ] Métricas accesibles: `curl http://localhost:3001/metrics`
- [ ] Logs monitoreados y sin errores críticos
- [ ] Documentación de configuración guardada de forma segura

---

## 🆘 Soporte

Para problemas o preguntas:

1. Revisar logs: `npm run docker:logs:prod`
2. Verificar health: `curl http://localhost:3001/health`
3. Consultar documentación en `/docs`
4. Contactar al equipo de desarrollo

---

## 📚 Referencias

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Playwright in Docker](https://playwright.dev/docs/docker)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [README Principal](../README.md)
