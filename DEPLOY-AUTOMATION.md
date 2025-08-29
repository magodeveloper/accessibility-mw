# 🚀 Automatización de Despliegue - Sistema de Análisis de Accesibilidad

## 📋 Resumen
Este documento describe la solución automática implementada en `manage.ps1` para desplegar todo el sistema de análisis de accesibilidad web con configuración transparente de red Docker.

## 🎯 Problema Resuelto
- **Conectividad entre contenedores**: Resuelto automáticamente usando red Docker compartida `accessibility-shared`
- **Configuración manual**: Eliminada - todo se configura automáticamente
- **URLs localhost**: Reemplazadas por nombres de contenedor (ej: `msanalysis-api:8082`)
- **Persistencia en base de datos**: Funcional con conectividad correcta entre servicios

## 🔧 Funcionalidades Implementadas

### 1. **Preparación Automática del Entorno** (`Prepare-Environment`)
- Verifica disponibilidad de Docker
- Detecta microservicios corriendo
- Valida requisitos antes del despliegue

### 2. **Configuración de Red** (`Setup-SharedNetwork`)
- Crea automáticamente la red `accessibility-shared`
- Evita duplicados (verifica existencia)
- Configura comunicación entre contenedores

### 3. **Despliegue con Networking** (`Start-Container-WithNetworking`)
- Inicia middleware con URLs corregidas:
  - `ANALYSIS_API_URL=http://msanalysis-api:8082`
  - `USERS_API_URL=http://msusers-api:8081` 
  - `REPORTS_API_URL=http://msreports-api:8083`
- Conecta automáticamente a red compartida
- Incluye health check inicial

### 4. **Verificación de Conectividad** (`Test-SystemConnectivity`)
- Prueba comunicación middleware → análisis
- Prueba comunicación middleware → usuarios  
- Prueba comunicación middleware → reportes
- Valida health check general

### 5. **Despliegue Completo** (`Deploy-All`)
- Ejecuta todo el proceso de forma transparente
- Despliega microservicios automáticamente
- Configura networking automáticamente
- Verifica conectividad completa

## 🚀 Uso

### Comando Principal
```powershell
.\manage.ps1 deploy-all
```

### Lo que hace automáticamente:
1. ✅ Verifica Docker y microservicios
2. ✅ Crea red compartida `accessibility-shared`
3. ✅ Construye imagen del middleware
4. ✅ Despliega microservicios con docker-compose
5. ✅ Conecta todos los contenedores a la red compartida
6. ✅ Inicia middleware con configuración correcta
7. ✅ Verifica conectividad completa del sistema
8. ✅ Muestra URLs de servicios y comandos de prueba

### Salida Esperada:
```
🚀 DESPLEGANDO SISTEMA COMPLETO CON CONFIGURACIÓN AUTOMÁTICA...
🛠️ Preparando entorno para despliegue automático...
⚙️ Configurando red Docker compartida...
🔨 Construyendo imagen Docker...
🚀 Iniciando middleware con configuración de red...
🔍 Probando conectividad del sistema...
🎉 SISTEMA COMPLETO DESPLEGADO Y CONFIGURADO!

📋 SERVICIOS DISPONIBLES:
  🔍 Middleware:    http://localhost:3001/api/docs
  👤 Users:         http://localhost:8081/swagger
  📊 Analysis:      http://localhost:8082/swagger
  📋 Reports:       http://localhost:8083/swagger
```

## 🏗️ Arquitectura de Red

```
accessibility-shared (Docker Network)
├── msanalysis-api:8082 (Analysis Microservice)
├── msusers-api:8081 (Users Microservice) 
├── msreports-api:8083 (Reports Microservice)
└── accessibility-mw:3001 (Middleware)
```

## 🧪 Pruebas de Conectividad

### Health Check
```bash
curl http://localhost:3001/health
```

### Análisis Completo
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"inputType":"html","value":"<html><body><h1>Test</h1></body></html>","tool":"both"}'
```

## ✅ Validación del Sistema

El sistema verifica automáticamente:
- 🐋 Docker disponible
- 📊 Microservicios corriendo
- 🌐 Red compartida configurada
- 🔗 Conectividad entre servicios
- 💾 Persistencia en base de datos

## 🔄 Comandos Adicionales

```powershell
# Construcción
.\manage.ps1 build

# Estado del sistema
.\manage.ps1 status

# Logs del middleware
.\manage.ps1 logs

# Limpieza completa
.\manage.ps1 clean

# Parar contenedor
.\manage.ps1 stop
```

## 🎯 Beneficios

1. **Transparente**: Un solo comando despliega todo
2. **Automático**: No requiere configuración manual
3. **Robusto**: Incluye verificaciones y validaciones
4. **Completo**: Desde preparación hasta validación final
5. **Informativo**: Muestra estado detallado de cada paso

## 🔧 Solución Técnica Detallada

### Antes (Problema):
```javascript
// middleware usaba localhost - NO funciona en contenedores
const ANALYSIS_API_URL = 'http://localhost:8082';
```

### Después (Solución):
```javascript
// middleware usa nombre del contenedor - funciona en red Docker
const ANALYSIS_API_URL = 'http://msanalysis-api:8082';
```

### Red Docker:
```bash
docker network create accessibility-shared
docker network connect accessibility-shared msanalysis-api
docker network connect accessibility-shared accessibility-mw
```

## 📊 Estado de Implementación
- ✅ **COMPLETADO**: Solución de networking automática
- ✅ **COMPLETADO**: Persistencia en base de datos funcional
- ✅ **COMPLETADO**: Automatización completa en manage.ps1
- ✅ **VALIDADO**: Sistema funcionando con analysisId=1 y 8 issues guardados

---

**🎉 ¡El sistema está completamente automatizado y listo para usar!**
