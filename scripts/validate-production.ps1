#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Valida la configuración de producción antes del despliegue

.DESCRIPTION
    Este script verifica que todos los requisitos estén cumplidos antes de
    desplegar en producción, incluyendo:
    - Variables de entorno críticas
    - Archivos necesarios
    - Configuración de seguridad
    - Dependencias

.EXAMPLE
    .\scripts\validate-production.ps1
#>

$ErrorActionPreference = "Stop"

# Colores para output
$ColorReset = "`e[0m"
$ColorRed = "`e[31m"
$ColorGreen = "`e[32m"
$ColorYellow = "`e[33m"
$ColorBlue = "`e[34m"

# Contadores
$script:ErrorCount = 0
$script:WarningCount = 0
$script:CheckCount = 0

function Write-Header {
    param([string]$Message)
    Write-Host "`n$ColorBlue═══════════════════════════════════════════════════════$ColorReset" -ForegroundColor Blue
    Write-Host "$ColorBlue  $Message$ColorReset" -ForegroundColor Blue
    Write-Host "$ColorBlue═══════════════════════════════════════════════════════$ColorReset" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ${ColorGreen}✅ $Message$ColorReset" -ForegroundColor Green
    $script:CheckCount++
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ${ColorRed}❌ ERROR: $Message$ColorReset" -ForegroundColor Red
    $script:ErrorCount++
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ${ColorYellow}⚠️  WARNING: $Message$ColorReset" -ForegroundColor Yellow
    $script:WarningCount++
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ️  $Message"
}

# ═══════════════════════════════════════════════════════
# 1. VALIDAR ARCHIVOS NECESARIOS
# ═══════════════════════════════════════════════════════
Write-Header "1. Validando Archivos Necesarios"

$RequiredFiles = @(
    ".env.production",
    "Dockerfile",
    "docker-compose.production.yml",
    "package.json",
    "tsconfig.json",
    ".achecker.yml"
)

foreach ($file in $RequiredFiles) {
    if (Test-Path $file) {
        Write-Success "Archivo encontrado: $file"
    }
    else {
        Write-Error "Archivo faltante: $file"
    }
}

# ═══════════════════════════════════════════════════════
# 2. VALIDAR VARIABLES DE ENTORNO CRÍTICAS
# ═══════════════════════════════════════════════════════
Write-Header "2. Validando Variables de Entorno (.env.production)"

if (Test-Path ".env.production") {
    $envContent = Get-Content ".env.production" -Raw
    
    # Variables críticas que NO deben tener valores por defecto/placeholder
    $CriticalVars = @{
        "JWT_SECRET_KEY" = @("CHANGE_THIS", "YOUR_", "PLACEHOLDER", "EXAMPLE", "TEST")
        "GATEWAY_SECRET" = @("CHANGE_THIS", "YOUR_", "PLACEHOLDER", "EXAMPLE", "TEST")
    }
    
    foreach ($var in $CriticalVars.Keys) {
        if ($envContent -match "$var=(.+)") {
            $value = $Matches[1].Trim()
            $isPlaceholder = $false
            
            foreach ($placeholder in $CriticalVars[$var]) {
                if ($value -like "*$placeholder*") {
                    $isPlaceholder = $true
                    break
                }
            }
            
            if ($isPlaceholder) {
                Write-Error "$var contiene un valor placeholder. Debe configurarse con un valor seguro."
            }
            elseif ($value.Length -lt 32) {
                Write-Error "$var debe tener al menos 32 caracteres (actual: $($value.Length))"
            }
            else {
                Write-Success "$var configurado correctamente ($($value.Length) chars)"
            }
        }
        else {
            Write-Error "$var no encontrado en .env.production"
        }
    }
    
    # Variables que deben estar presentes
    $RequiredVars = @(
        "NODE_ENV",
        "PORT",
        "HOST",
        "CORS_ORIGINS",
        "ANALYSIS_API_URL",
        "GATEWAY_VALIDATION_ENABLED",
        "PLAYWRIGHT_HEADLESS"
    )
    
    foreach ($var in $RequiredVars) {
        if ($envContent -match "$var=") {
            Write-Success "$var encontrado"
        }
        else {
            Write-Error "$var faltante en .env.production"
        }
    }
    
    # Validar valores específicos de producción
    if ($envContent -match "NODE_ENV=production") {
        Write-Success "NODE_ENV=production configurado correctamente"
    }
    else {
        Write-Error "NODE_ENV debe ser 'production'"
    }
    
    if ($envContent -match "GATEWAY_VALIDATION_ENABLED=true") {
        Write-Success "GATEWAY_VALIDATION_ENABLED=true (seguridad habilitada)"
    }
    else {
        Write-Warning "GATEWAY_VALIDATION_ENABLED debería estar en 'true' para producción"
    }
    
    if ($envContent -match "HOST=0\.0\.0\.0") {
        Write-Success "HOST=0.0.0.0 configurado para Docker/Kubernetes"
    }
    else {
        Write-Warning "HOST debería ser '0.0.0.0' en producción para Docker"
    }
    
    if ($envContent -match "TRUST_PROXY=true") {
        Write-Success "TRUST_PROXY=true configurado para proxy inverso"
    }
    else {
        Write-Warning "TRUST_PROXY debería ser 'true' en producción con proxy/load balancer"
    }
    
    # Validar que NO estén habilitadas flags de desarrollo
    $DevFlags = @(
        "BYPASS_SSRF_VALIDATION_IN_DEV",
        "ALLOW_PRIVATE_IPS_IN_DEV",
        "ALLOW_LOOPBACK_IN_DEV",
        "RELAX_TLS_IN_DEV"
    )
    
    foreach ($flag in $DevFlags) {
        if ($envContent -match "$flag=true") {
            Write-Error "$flag está habilitado. DEBE estar en 'false' en producción."
        }
        else {
            Write-Success "$flag deshabilitado (seguro para producción)"
        }
    }
    
}
else {
    Write-Error "Archivo .env.production no encontrado"
}

# ═══════════════════════════════════════════════════════
# 3. VALIDAR DEPENDENCIAS
# ═══════════════════════════════════════════════════════
Write-Header "3. Validando Dependencias"

if (Test-Path "node_modules") {
    Write-Success "node_modules instalado"
    
    # Verificar que package-lock.json existe
    if (Test-Path "package-lock.json") {
        Write-Success "package-lock.json presente (builds reproducibles)"
    }
    else {
        Write-Warning "package-lock.json faltante (recomendado para producción)"
    }
}
else {
    Write-Warning "node_modules no encontrado. Ejecuta 'npm ci' antes de desplegar."
}

# ═══════════════════════════════════════════════════════
# 4. VALIDAR DOCKERFILE
# ═══════════════════════════════════════════════════════
Write-Header "4. Validando Dockerfile"

if (Test-Path "Dockerfile") {
    $dockerContent = Get-Content "Dockerfile" -Raw
    
    if ($dockerContent -match "FROM.*AS builder") {
        Write-Success "Multi-stage build configurado"
    }
    else {
        Write-Warning "No se detectó multi-stage build"
    }
    
    if ($dockerContent -match "NODE_ENV=production") {
        Write-Success "NODE_ENV=production en Dockerfile"
    }
    else {
        Write-Warning "NODE_ENV no configurado en Dockerfile"
    }
    
    if ($dockerContent -match "HEALTHCHECK") {
        Write-Success "Healthcheck configurado"
    }
    else {
        Write-Warning "Healthcheck no configurado en Dockerfile"
    }
    
    if ($dockerContent -match "USER.*pwuser") {
        Write-Success "Usuario no-root configurado (pwuser)"
    }
    else {
        Write-Warning "No se detectó usuario no-root"
    }
}

# ═══════════════════════════════════════════════════════
# 5. VALIDAR BUILD
# ═══════════════════════════════════════════════════════
Write-Header "5. Validando Build de TypeScript"

if (Test-Path "dist") {
    Write-Success "Directorio dist/ existe"
    
    if (Test-Path "dist/server.js") {
        Write-Success "dist/server.js compilado"
    }
    else {
        Write-Warning "dist/server.js no encontrado. Ejecuta 'npm run build'"
    }
}
else {
    Write-Warning "Directorio dist/ no encontrado. Ejecuta 'npm run build' antes de desplegar."
}

# ═══════════════════════════════════════════════════════
# 6. VALIDAR DOCKER COMPOSE
# ═══════════════════════════════════════════════════════
Write-Header "6. Validando Docker Compose Production"

if (Test-Path "docker-compose.production.yml") {
    Write-Success "docker-compose.production.yml encontrado"
    
    $composeContent = Get-Content "docker-compose.production.yml" -Raw
    
    if ($composeContent -match "restart:.*unless-stopped") {
        Write-Success "Restart policy configurada"
    }
    else {
        Write-Warning "Restart policy no detectada"
    }
    
    if ($composeContent -match "healthcheck:") {
        Write-Success "Healthcheck configurado en compose"
    }
    
    if ($composeContent -match "resources:") {
        Write-Success "Límites de recursos configurados"
    }
}
else {
    Write-Error "docker-compose.production.yml no encontrado"
}

# ═══════════════════════════════════════════════════════
# RESUMEN
# ═══════════════════════════════════════════════════════
Write-Header "Resumen de Validación"

Write-Host ""
Write-Host "  Total de checks: $ColorBlue$script:CheckCount$ColorReset"
Write-Host "  Errores: $(if ($script:ErrorCount -gt 0) { $ColorRed } else { $ColorGreen })$script:ErrorCount$ColorReset"
Write-Host "  Warnings: $(if ($script:WarningCount -gt 0) { $ColorYellow } else { $ColorGreen })$script:WarningCount$ColorReset"
Write-Host ""

if ($script:ErrorCount -gt 0) {
    Write-Host "${ColorRed}╔═══════════════════════════════════════════════════════╗$ColorReset" -ForegroundColor Red
    Write-Host "${ColorRed}║  ❌ VALIDACIÓN FALLIDA - NO DESPLEGAR EN PRODUCCIÓN  ║$ColorReset" -ForegroundColor Red
    Write-Host "${ColorRed}╚═══════════════════════════════════════════════════════╝$ColorReset" -ForegroundColor Red
    exit 1
}
elseif ($script:WarningCount -gt 0) {
    Write-Host "${ColorYellow}╔═══════════════════════════════════════════════════════╗$ColorReset" -ForegroundColor Yellow
    Write-Host "${ColorYellow}║  ⚠️  VALIDACIÓN CON WARNINGS - REVISAR ANTES DE      ║$ColorReset" -ForegroundColor Yellow
    Write-Host "${ColorYellow}║     DESPLEGAR EN PRODUCCIÓN                           ║$ColorReset" -ForegroundColor Yellow
    Write-Host "${ColorYellow}╚═══════════════════════════════════════════════════════╝$ColorReset" -ForegroundColor Yellow
    exit 0
}
else {
    Write-Host "${ColorGreen}╔═══════════════════════════════════════════════════════╗$ColorReset" -ForegroundColor Green
    Write-Host "${ColorGreen}║  ✅ VALIDACIÓN EXITOSA - LISTO PARA PRODUCCIÓN       ║$ColorReset" -ForegroundColor Green
    Write-Host "${ColorGreen}╚═══════════════════════════════════════════════════════╝$ColorReset" -ForegroundColor Green
    exit 0
}
