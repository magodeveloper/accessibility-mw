FROM node:20-bookworm AS builder
WORKDIR /app

# Instala deps de prod+dev para compilar TS
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copia fuentes y compila a /app/dist
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# Etapa 2: runtime con Playwright (trae Chromium y deps)
FROM mcr.microsoft.com/playwright:v1.54.2-jammy

WORKDIR /app

# Valores por defecto; pueden sobrescribirse con -e o --env-file
ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_HEADLESS=true \
    NODE_OPTIONS=--enable-source-maps \
    PORT=3001 \
    HOST=0.0.0.0

# Instala solo deps de prod
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copia el build desde la etapa builder (no desde el host)
COPY --from=builder /app/dist ./dist

# Config de Equal Access (asegúrate de NO ignorarla en .dockerignore)
COPY .achecker.yml ./

# Crear y dar permisos (en /app)
RUN mkdir -p /app/results /app/.achecker_cache \
    && chown -R pwuser:pwuser /app

# Usuario no root (la imagen de Playwright trae 'pwuser')
USER pwuser

# Expone el puerto (literal, no soporta variables aquí)
EXPOSE 3001

# Healthcheck interno al contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get(`http://localhost:${process.env.PORT || 3001}/health`, r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Entrada
CMD ["node", "dist/server.js"]