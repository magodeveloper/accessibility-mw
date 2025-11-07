# Script para levantar MW limpiando el build cache automáticamente
Write-Host "`n🚀 Levantando accessibility-mw con limpieza automática..." -ForegroundColor Cyan

# Build
Write-Host "`n📦 Construyendo imagen..." -ForegroundColor Yellow
docker compose --env-file .env.development up --build -d --remove-orphans

# Limpiar build cache inmediatamente
Write-Host "`n🧹 Limpiando build cache..." -ForegroundColor Yellow
docker builder prune -af

Write-Host "`n✅ Completado. Espacio de Docker:" -ForegroundColor Green
docker system df
