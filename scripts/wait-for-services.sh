#!/bin/bash
# Script para esperar a que los servicios estén listos en CI
# Usado en .github/workflows/ci.yml -> test-integration job

set -e

echo "⏳ Esperando a que los servicios estén listos..."

# Función para verificar salud del servicio
check_health() {
  local service_name=$1
  local url=$2
  local max_attempts=$3
  local attempt=1

  echo "Verificando $service_name en $url..."
  
  while [ $attempt -le $max_attempts ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo "✅ $service_name está listo (intento $attempt/$max_attempts)"
      return 0
    fi
    
    echo "⏳ Esperando $service_name... (intento $attempt/$max_attempts)"
    sleep 5
    attempt=$((attempt + 1))
  done
  
  echo "❌ ERROR: $service_name no respondió después de $max_attempts intentos"
  return 1
}

# Esperar a MySQL Analysis (puerto 3308)
echo "Verificando MySQL Analysis (puerto 3308)..."
for i in {1..30}; do
  if docker exec ci-mysql-analysis mysqladmin ping -h localhost -pCI_ROOT_PASSWORD_2025 --silent 2>/dev/null; then
    echo "✅ MySQL Analysis está listo"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ ERROR: MySQL Analysis no respondió"
    docker ps -a
    docker logs ci-mysql-analysis 2>&1 | tail -50
    exit 1
  fi
  echo "⏳ Esperando MySQL Analysis... ($i/30)"
  sleep 2
done

# Esperar a MySQL Reports (puerto 3309)
echo "Verificando MySQL Reports (puerto 3309)..."
for i in {1..30}; do
  if docker exec ci-mysql-reports mysqladmin ping -h localhost -pCI_ROOT_PASSWORD_2025 --silent 2>/dev/null; then
    echo "✅ MySQL Reports está listo"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ ERROR: MySQL Reports no respondió"
    docker ps -a
    docker logs ci-mysql-reports 2>&1 | tail -50
    exit 1
  fi
  echo "⏳ Esperando MySQL Reports... ($i/30)"
  sleep 2
done

# Esperar a MS Analysis API (puerto 8082)
check_health "MS Analysis API" "http://localhost:8082/health" 30 || {
  echo "Logs de MS Analysis:"
  docker logs ci-ms-analysis 2>&1 | tail -50
  exit 1
}

# Esperar a MS Reports API (puerto 8080)
check_health "MS Reports API" "http://localhost:8080/health" 30 || {
  echo "Logs de MS Reports:"
  docker logs ci-ms-reports 2>&1 | tail -50
  exit 1
}

echo ""
echo "✅ Todos los servicios están listos:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
