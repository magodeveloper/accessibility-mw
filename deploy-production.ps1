#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Helper script para gestión de despliegues en producción

.DESCRIPTION
    Script interactivo que facilita las operaciones comunes de despliegue:
    - Build de imágenes
    - Deploy/Start/Stop de servicios
    - Verificación de health
    - Visualización de logs
    - Backup de configuración

.PARAMETER Action
    Acción a ejecutar: build, deploy, start, stop, restart, status, logs, health, backup, validate

.EXAMPLE
    .\deploy-production.ps1 -Action deploy
    .\deploy-production.ps1 -Action health
    .\deploy-production.ps1 -Action logs

.EXAMPLE
    # Modo interactivo
    .\deploy-production.ps1
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('build', 'deploy', 'start', 'stop', 'restart', 'status', 'logs', 'health', 'backup', 'validate', 'menu')]
    [string]$Action = 'menu'
)

$ErrorActionPreference = "Stop"

# Colores
$ColorReset = "`e[0m"
$ColorRed = "`e[31m"
$ColorGreen = "`e[32m"
$ColorYellow = "`e[33m"
$ColorBlue = "`e[34m"
$ColorMagenta = "`e[35m"
$ColorCyan = "`e[36m"

# Configuración
$ComposeFile = "docker-compose.production.yml"
$EnvFile = ".env.production"
$ServiceName = "accessibility-middleware"
$ContainerName = "$ServiceName-prod"

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "$ColorCyan╔═══════════════════════════════════════════════════════════╗$ColorReset" -ForegroundColor Cyan
    Write-Host "$ColorCyan║                                                           ║$ColorReset" -ForegroundColor Cyan
    Write-Host "$ColorCyan║       🚀 ACCESSIBILITY MIDDLEWARE - PRODUCTION 🚀        ║$ColorReset" -ForegroundColor Cyan
    Write-Host "$ColorCyan║                  Deployment Manager                       ║$ColorReset" -ForegroundColor Cyan
    Write-Host "$ColorCyan║                                                           ║$ColorReset" -ForegroundColor Cyan
    Write-Host "$ColorCyan╚═══════════════════════════════════════════════════════════╝$ColorReset" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ${ColorGreen}✅ $Message$ColorReset" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ${ColorRed}❌ ERROR: $Message$ColorReset" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ${ColorYellow}⚠️  $Message$ColorReset" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ${ColorBlue}ℹ️  $Message$ColorReset" -ForegroundColor Blue
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n$ColorMagenta▶ $Message$ColorReset" -ForegroundColor Magenta
}

function Confirm-Action {
    param([string]$Message)
    Write-Host "`n$ColorYellow⚠️  $Message$ColorReset" -ForegroundColor Yellow
    $response = Read-Host "¿Continuar? (y/N)"
    return ($response -eq 'y' -or $response -eq 'Y')
}

function Test-Prerequisites {
    Write-Step "Verificando prerequisitos..."
    
    # Docker
    try {
        $dockerVersion = docker --version
        Write-Success "Docker instalado: $dockerVersion"
    }
    catch {
        Write-Error "Docker no está instalado o no está en PATH"
        return $false
    }
    
    # Docker Compose
    try {
        $composeVersion = docker compose version
        Write-Success "Docker Compose instalado: $composeVersion"
    }
    catch {
        Write-Error "Docker Compose no está disponible"
        return $false
    }
    
    # Archivos necesarios
    if (!(Test-Path $EnvFile)) {
        Write-Error "Archivo $EnvFile no encontrado"
        return $false
    }
    Write-Success "Archivo $EnvFile encontrado"
    
    if (!(Test-Path $ComposeFile)) {
        Write-Error "Archivo $ComposeFile no encontrado"
        return $false
    }
    Write-Success "Archivo $ComposeFile encontrado"
    
    return $true
}

function Invoke-Build {
    Write-Banner
    Write-Step "🔨 BUILDING PRODUCTION IMAGE"
    
    if (!(Test-Prerequisites)) {
        return
    }
    
    if (Confirm-Action "Se construirá la imagen de producción. Esto puede tomar varios minutos.") {
        Write-Info "Ejecutando build..."
        
        # Metadata
        $BuildDate = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        $Version = "1.0.0"
        try {
            $VcsRef = git rev-parse --short HEAD
        }
        catch {
            $VcsRef = "unknown"
        }
        
        Write-Info "Build Date: $BuildDate"
        Write-Info "Version: $Version"
        Write-Info "VCS Ref: $VcsRef"
        
        docker compose --env-file $EnvFile -f $ComposeFile build `
            --no-cache `
            --progress=plain `
            --build-arg BUILD_DATE="$BuildDate" `
            --build-arg VERSION="$Version" `
            --build-arg VCS_REF="$VcsRef"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Build completado exitosamente"
        }
        else {
            Write-Error "Build falló con código de salida $LASTEXITCODE"
        }
    }
}

function Invoke-Deploy {
    Write-Banner
    Write-Step "🚀 DEPLOYING TO PRODUCTION"
    
    if (!(Test-Prerequisites)) {
        return
    }
    
    # Validar configuración
    Write-Step "Validando configuración de producción..."
    npm run validate:production
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Validación falló. No se puede desplegar."
        return
    }
    
    if (Confirm-Action "Se desplegará el servicio en PRODUCCIÓN. ¿Confirmar?") {
        Write-Info "Levantando servicio..."
        docker compose --env-file $EnvFile -f $ComposeFile up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Servicio desplegado"
            Start-Sleep -Seconds 3
            Invoke-Status
            Invoke-Health
        }
        else {
            Write-Error "Deploy falló"
        }
    }
}

function Invoke-Start {
    Write-Banner
    Write-Step "▶️  STARTING SERVICE"
    
    docker compose --env-file $EnvFile -f $ComposeFile start
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Servicio iniciado"
        Start-Sleep -Seconds 2
        Invoke-Status
    }
}

function Invoke-Stop {
    Write-Banner
    Write-Step "⏹️  STOPPING SERVICE"
    
    if (Confirm-Action "Se detendrá el servicio en producción.") {
        docker compose --env-file $EnvFile -f $ComposeFile stop
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Servicio detenido"
        }
    }
}

function Invoke-Restart {
    Write-Banner
    Write-Step "🔄 RESTARTING SERVICE"
    
    if (Confirm-Action "Se reiniciará el servicio.") {
        docker compose --env-file $EnvFile -f $ComposeFile restart
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Servicio reiniciado"
            Start-Sleep -Seconds 3
            Invoke-Health
        }
    }
}

function Invoke-Status {
    Write-Step "📊 SERVICE STATUS"
    
    docker compose --env-file $EnvFile -f $ComposeFile ps
    Write-Info "`nRecursos del contenedor:"
    docker stats --no-stream "$ContainerName" 2>$null
    docker stats --no-stream "$ServiceName-prod" 2>$null
}

function Invoke-Logs {
    Write-Banner
    Write-Step "📜 SERVICE LOGS"
    
    Write-Info "Mostrando logs en tiempo real (Ctrl+C para salir)..."
    Write-Host ""
    
    docker compose --env-file $EnvFile -f $ComposeFile logs -f --tail=50
}

function Invoke-Health {
    Write-Step "🏥 HEALTH CHECK"
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
        
        if ($response.status -eq "healthy") {
            Write-Success "Servicio HEALTHY"
            Write-Info "Uptime: $($response.uptime) segundos"
            Write-Info "Timestamp: $($response.timestamp)"
            
            if ($response.services) {
                Write-Info "`nEstado de servicios internos:"
                $response.services.PSObject.Properties | ForEach-Object {
                    $statusIcon = if ($_.Value.status -eq "healthy") { "✅" } else { "❌" }
                    Write-Host "    $statusIcon $($_.Name): $($_.Value.status)"
                }
            }
        }
        else {
            Write-Warning "Servicio reporta estado: $($response.status)"
        }
    }
    catch {
        Write-Error "No se pudo conectar al servicio de health"
        Write-Info "Detalles: $($_.Exception.Message)"
    }
}

function Invoke-Backup {
    Write-Banner
    Write-Step "💾 BACKUP CONFIGURATION"
    
    $BackupDir = "backup"
    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }
    
    # Backup .env.production
    if (Test-Path $EnvFile) {
        $BackupFile = "$BackupDir/$EnvFile.$Timestamp.backup"
        Copy-Item $EnvFile $BackupFile
        Write-Success "Backup creado: $BackupFile"
    }
    
    # Backup docker-compose.production.yml
    if (Test-Path $ComposeFile) {
        $BackupFile = "$BackupDir/$ComposeFile.$Timestamp.backup"
        Copy-Item $ComposeFile $BackupFile
        Write-Success "Backup creado: $BackupFile"
    }
    
    Write-Info "`nBackups guardados en: $BackupDir"
}

function Invoke-Validate {
    Write-Banner
    Write-Step "✔️  VALIDATING PRODUCTION CONFIGURATION"
    
    npm run validate:production
}

function Show-Menu {
    Write-Banner
    
    Write-Host "  ${ColorCyan}Selecciona una acción:$ColorReset`n" -ForegroundColor Cyan
    Write-Host "  ${ColorGreen}1.$ColorReset Validar configuración (validate)" -ForegroundColor Green
    Write-Host "  ${ColorGreen}2.$ColorReset Build imagen (build)" -ForegroundColor Green
    Write-Host "  ${ColorGreen}3.$ColorReset Deploy servicio (deploy)" -ForegroundColor Green
    Write-Host "  ${ColorYellow}4.$ColorReset Start servicio (start)" -ForegroundColor Yellow
    Write-Host "  ${ColorYellow}5.$ColorReset Stop servicio (stop)" -ForegroundColor Yellow
    Write-Host "  ${ColorYellow}6.$ColorReset Restart servicio (restart)" -ForegroundColor Yellow
    Write-Host "  ${ColorBlue}7.$ColorReset Ver status (status)" -ForegroundColor Blue
    Write-Host "  ${ColorBlue}8.$ColorReset Ver logs (logs)" -ForegroundColor Blue
    Write-Host "  ${ColorBlue}9.$ColorReset Health check (health)" -ForegroundColor Blue
    Write-Host "  ${ColorMagenta}10.$ColorReset Backup configuración (backup)" -ForegroundColor Magenta
    Write-Host "  ${ColorRed}0.$ColorReset Salir`n" -ForegroundColor Red
    
    $choice = Read-Host "Opción"
    
    switch ($choice) {
        "1" { Invoke-Validate; Read-Host "`nPresiona Enter para continuar"; Show-Menu }
        "2" { Invoke-Build; Read-Host "`nPresiona Enter para continuar"; Show-Menu }
        "3" { Invoke-Deploy; Read-Host "`nPresiona Enter para continuar"; Show-Menu }
        "4" { Invoke-Start; Read-Host "`nPresiona Enter para continuar"; Show-Menu }
        "5" { Invoke-Stop; Read-Host "`nPresiona Enter para continuar"; Show-Menu }
        "6" { Invoke-Restart; Read-Host "`nPresiona Enter para continuar"; Show-Menu }
        "7" { Invoke-Status; Read-Host "`nPresiona Enter para continuar"; Show-Menu }
        "8" { Invoke-Logs }
        "9" { Invoke-Health; Read-Host "`nPresiona Enter para continuar"; Show-Menu }
        "10" { Invoke-Backup; Read-Host "`nPresiona Enter para continuar"; Show-Menu }
        "0" { Write-Host "`n${ColorGreen}¡Hasta luego!$ColorReset`n" -ForegroundColor Green; exit 0 }
        default { Write-Warning "Opción inválida"; Start-Sleep -Seconds 1; Show-Menu }
    }
}

# Main execution
try {
    switch ($Action) {
        'build' { Invoke-Build }
        'deploy' { Invoke-Deploy }
        'start' { Invoke-Start }
        'stop' { Invoke-Stop }
        'restart' { Invoke-Restart }
        'status' { Invoke-Status }
        'logs' { Invoke-Logs }
        'health' { Invoke-Health }
        'backup' { Invoke-Backup }
        'validate' { Invoke-Validate }
        'menu' { Show-Menu }
    }
}
catch {
    Write-Error "Error inesperado: $($_.Exception.Message)"
    exit 1
}
