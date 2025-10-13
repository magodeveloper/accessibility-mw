#!/bin/bash
# Script para configurar directorios necesarios para tests
# Usado en .github/workflows/ci.yml

set -e

echo "📁 Setting up test directories..."

# Crear directorios necesarios con permisos correctos
mkdir -p .achecker_cache/engine
chmod 755 .achecker_cache
chmod 755 .achecker_cache/engine

# Crear directorio temporal para tests
mkdir -p tmp/test-data
chmod 755 tmp/test-data

echo "✅ Test directories ready"
