# Etapa 1: Compilación completa
FROM node:20.19.1-alpine3.20 AS builder
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
FROM mcr.microsoft.com/playwright:v1.55.0-jammy AS accessibility-mw
WORKDIR /app

# Variables de entorno
ENV NODE_ENV=production \
  APP_ENV=PROD \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  PLAYWRIGHT_HEADLESS=true \
  NODE_OPTIONS="--max-old-space-size=1024" \
  PORT=3001 \
  HOST=0.0.0.0

# Copiar SOLO los archivos necesarios desde builder
COPY --from=builder /app/dist ./dist
COPY src/routes/analyze.openapi.yaml ./dist/routes/analyze.openapi.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY .achecker.yml ./

# ¡NO MÁS npm install! Todo viene del builder
# Crear directorios, permisos, actualizaciones de seguridad y limpiar en un solo RUN
RUN apt-get update && apt-get upgrade -y && \
  mkdir -p /app/results /app/logs /app/.achecker_cache && \
  chown -R pwuser:pwuser /app && \
  chmod -R 755 /app/results /app/logs /app/.achecker_cache && \
  rm -rf /tmp/* /var/cache/* /var/lib/apt/lists/* /var/cache/apt/*

USER pwuser
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get(\`http://localhost:\${process.env.PORT || 3001}/health\`, r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Punto de entrada
CMD ["node", "dist/server.js"]