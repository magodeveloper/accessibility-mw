# Etapa 1: Compilación completa
FROM node:25.5.0-alpine3.22 AS builder

# Build arguments para metadata
ARG NODE_ENV=development
ARG BUILD_DATE
ARG VERSION=1.0.0
ARG VCS_REF

WORKDIR /app

# Instalar dependencias del sistema y actualizaciones de seguridad
RUN apk add --no-cache git && \
  apk upgrade --no-cache

# Copiar package files e instalar TODAS las dependencias (prod + dev)
COPY package*.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts && \
  npm cache clean --force

# Copiar código fuente y compilar
COPY tsconfig*.json ./
COPY config ./config
COPY scripts ./scripts
COPY src ./src
RUN npm run build

# Crear instalación limpia SOLO de producción
RUN rm -rf node_modules && \
  npm ci --omit=dev --no-audit --no-fund --ignore-scripts && \
  npm cache clean --force

# Etapa 2: Imagen de producción liviana (SIN reinstalar npm)
FROM mcr.microsoft.com/playwright:v1.56.1-jammy AS accessibility-mw

# Build arguments para metadata
ARG BUILD_DATE
ARG VERSION=1.0.0
ARG VCS_REF

# Labels estándar OCI
LABEL org.opencontainers.image.title="Accessibility Middleware" \
  org.opencontainers.image.description="Advanced web accessibility analysis middleware with dual engine support (axe-core + IBM Equal Access)" \
  org.opencontainers.image.version="${VERSION}" \
  org.opencontainers.image.created="${BUILD_DATE}" \
  org.opencontainers.image.revision="${VCS_REF}" \
  org.opencontainers.image.vendor="magodeveloper" \
  org.opencontainers.image.authors="magodeveloper" \
  org.opencontainers.image.licenses="Proprietary" \
  maintainer="magodeveloper"

WORKDIR /app

# Variables de entorno optimizadas para producción
ENV NODE_ENV=production \
  APP_ENV=PROD \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  PLAYWRIGHT_HEADLESS=true \
  NODE_OPTIONS="--max-old-space-size=2048 --enable-source-maps" \
  PORT=3001 \
  HOST=0.0.0.0 \
  UV_THREADPOOL_SIZE=16

# Copiar SOLO los archivos necesarios desde builder
COPY --from=builder /app/dist ./dist
COPY src/routes/analyze.openapi.yaml ./dist/routes/analyze.openapi.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY .achecker.yml ./

# Optimización del sistema y creación de directorios
RUN apt-get update && apt-get upgrade -y && \
  apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/cache/* && \
  mkdir -p /app/results /app/logs /app/.achecker_cache/engine /app/temp && \
  chown -R pwuser:pwuser /app && \
  chmod -R 755 /app && \
  # Crear directorio para archivos temporales de Playwright
  mkdir -p /tmp/playwright && chown pwuser:pwuser /tmp/playwright

USER pwuser
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get(\`http://localhost:\${process.env.PORT || 3001}/health\`, r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Punto de entrada
CMD ["node", "dist/server.js"]