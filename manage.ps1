#!/usr/bin/env pwsh
# SCRIPT MAESTRO UNIFICADO PARA ACCESSIBILITY-MW
# Gestiona todo: build, deploy, cleanup, logs, etc.

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("build", "start", "stop", "restart", "logs", "clean", "status", "test", "deploy-all")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [switch]$Follow = $false
)

$ErrorActionPreference = "Stop"

# Configuración
$IMAGE_NAME = "accessibility-mw"
$CONTAINER_NAME = "accessibility-mw-prod"
$PORT = 3001

function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Info { param($msg) Write-Host "ℹ️ $msg" -ForegroundColor Cyan }
function Write-Warning { param($msg) Write-Host "⚠️ $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }

function Build-Image {
    Write-Info "Construyendo imagen Docker..."
    
    # Limpiar imágenes viejas
    $oldImages = docker images $IMAGE_NAME -q
    if ($oldImages) {
        Write-Warning "Eliminando imágenes viejas..."
        docker rmi $oldImages -f 2>$null
    }
    
    # Build nueva imagen
    docker build -t $IMAGE_NAME . --no-cache
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Imagen construida exitosamente"
    } else {
        Write-Error "Error construyendo imagen"
        exit 1
    }
}

function Start-Container {
    Write-Info "Iniciando contenedor..."
    
    # Detener contenedor existente
    docker stop $CONTAINER_NAME 2>$null
    docker rm $CONTAINER_NAME 2>$null
    
    # Iniciar nuevo contenedor
    docker run -d --name $CONTAINER_NAME -p ${PORT}:${PORT} $IMAGE_NAME
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Contenedor iniciado en puerto $PORT"
        Start-Sleep 5
        Test-Health
    } else {
        Write-Error "Error iniciando contenedor"
        exit 1
    }
}

function Stop-Container {
    Write-Info "Deteniendo contenedor..."
    docker stop $CONTAINER_NAME 2>$null
    docker rm $CONTAINER_NAME 2>$null
    Write-Success "Contenedor detenido"
}

function Show-Logs {
    if ($Follow) {
        docker logs -f $CONTAINER_NAME
    } else {
        docker logs --tail 50 $CONTAINER_NAME
    }
}

function Clean-All {
    Write-Warning "Limpiando todo el sistema..."
    
    # Detener contenedor
    docker stop $CONTAINER_NAME 2>$null
    docker rm $CONTAINER_NAME 2>$null
    
    # Eliminar imágenes
    docker rmi $IMAGE_NAME -f 2>$null
    
    # Limpiar sistema Docker
    docker system prune -f
    
    Write-Success "Sistema limpiado"
}

function Test-Health {
    Write-Info "Verificando salud del servicio..."
    
    for ($i = 1; $i -le 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$PORT/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success "Servicio saludable en http://localhost:$PORT"
                Write-Info "Swagger UI: http://localhost:$PORT/api/docs"
                return
            }
        } catch {}
        
        Write-Host "." -NoNewline
        Start-Sleep 2
    }
    
    Write-Error "Servicio no responde después de 60 segundos"
}

function Show-Status {
    Write-Info "Estado del sistema:"
    
    # Contenedor
    $container = docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    if ($container) {
        Write-Host $container
    } else {
        Write-Warning "Contenedor no encontrado"
    }
    
    # Imagen
    $image = docker images $IMAGE_NAME --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    if ($image) {
        Write-Host $image
    } else {
        Write-Warning "Imagen no encontrada"
    }
}

function Run-Tests {
    Write-Info "Ejecutando tests..."
    npm test
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Tests completados"
    } else {
        Write-Error "Tests fallaron"
        exit 1
    }
}

function Setup-SharedNetwork {
    Write-Info "⚙️ Configurando red Docker compartida..."
    
    # Verificar si la red ya existe
    $networkExists = docker network ls --filter "name=accessibility-shared" --format "{{.Name}}" | Select-String "accessibility-shared"
    
    if (-not $networkExists) {
        Write-Info "Creando red 'accessibility-shared'..."
        docker network create accessibility-shared
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Red compartida creada exitosamente"
        } else {
            Write-Error "Error creando red compartida"
            exit 1
        }
    } else {
        Write-Info "Red 'accessibility-shared' ya existe ✅"
    }
}

function Start-Container-WithNetworking {
    Write-Info "🚀 Iniciando middleware con configuración de red..."
    
    # Detener contenedor existente si está corriendo
    Stop-Container
    
    # Iniciar con configuración correcta
    Write-Info "Iniciando contenedor con URLs correctas de microservicios..."
    docker run -d --name $CONTAINER_NAME `
        --network accessibility-shared `
        -p 3001:3001 `
        -e ANALYSIS_API_URL=http://msanalysis-api:8082 `
        -e USERS_API_URL=http://msusers-api:8081 `
        -e REPORTS_API_URL=http://msreports-api:8083 `
        -e NODE_ENV=production `
        $IMAGE_NAME
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Contenedor iniciado con configuración de red"
        
        # Esperar que el servicio esté listo
        Write-Info "Esperando que el servicio se inicialice..."
        Start-Sleep 10
        
        # Verificar salud del servicio
        $healthCheck = curl -s http://localhost:3001/health 2>$null
        if ($healthCheck) {
            Write-Success "🏥 Middleware saludable y listo"
        } else {
            Write-Warning "⚠️ Middleware iniciado pero health check falló"
        }
    } else {
        Write-Error "❌ Error iniciando contenedor"
        exit 1
    }
}

function Test-SystemConnectivity {
    Write-Info "🔍 Probando conectividad del sistema..."
    
    # Test 1: Middleware → Analysis
    Write-Host "  📊 Conectividad Middleware → Analysis..." -NoNewline
    $testAnalysis = docker exec $CONTAINER_NAME curl -s http://msanalysis-api:8082/api/Analysis 2>$null
    if ($testAnalysis -and $testAnalysis.Contains("analyses")) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
    
    # Test 2: Middleware → Users
    Write-Host "  👤 Conectividad Middleware → Users..." -NoNewline
    $testUsers = docker exec $CONTAINER_NAME curl -s http://msusers-api:8081/api/users 2>$null
    if ($testUsers) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
    
    # Test 3: Middleware → Reports
    Write-Host "  📋 Conectividad Middleware → Reports..." -NoNewline
    $testReports = docker exec $CONTAINER_NAME curl -s http://msreports-api:8083/api/reports 2>$null
    if ($testReports) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
    
    # Test 4: Health general
    Write-Host "  🏥 Health Check General..." -NoNewline
    $healthCheck = curl -s http://localhost:3001/health 2>$null
    if ($healthCheck -and $healthCheck.Contains('"ok":true')) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
    
    Write-Info "✅ Verificación de conectividad completada"
}

function Prepare-Environment {
    Write-Info "🛠️ Preparando entorno para despliegue automático..."
    
    # Verificar Docker
    Write-Host "  🐋 Docker disponible..." -NoNewline
    try {
        docker --version | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✅" -ForegroundColor Green
        } else {
            Write-Host " ❌" -ForegroundColor Red
            Write-Error "Docker no está disponible"
            exit 1
        }
    } catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Error "Docker no está instalado o no está en PATH"
        exit 1
    }
    
    # Verificar que los microservicios estén corriendo
    Write-Host "  📊 Microservicio Analysis..." -NoNewline
    $analysisRunning = docker ps --filter "name=msanalysis-api" --format "{{.Names}}" | Select-String "msanalysis-api"
    if ($analysisRunning) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ⚠️" -ForegroundColor Yellow
        Write-Warning "Microservicio Analysis no está corriendo. Inicialo con docker-compose en accessibility-ms-analysis"
    }
    
    Write-Host "  👤 Microservicio Users..." -NoNewline
    $usersRunning = docker ps --filter "name=msusers-api" --format "{{.Names}}" | Select-String "msusers-api"
    if ($usersRunning) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ⚠️" -ForegroundColor Yellow
        Write-Warning "Microservicio Users no está corriendo. Inicialo con docker-compose en accessibility-ms-users"
    }
    
    Write-Host "  📋 Microservicio Reports..." -NoNewline
    $reportsRunning = docker ps --filter "name=msreports-api" --format "{{.Names}}" | Select-String "msreports-api"
    if ($reportsRunning) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ⚠️" -ForegroundColor Yellow
        Write-Warning "Microservicio Reports no está corriendo. Inicialo con docker-compose en accessibility-ms-reports"
    }
    
    Write-Info "✅ Verificación de entorno completada"
}

function Deploy-All {
    Write-Info "🚀 DESPLEGANDO SISTEMA COMPLETO CON CONFIGURACIÓN AUTOMÁTICA..."
    
    # 0. Preparar y verificar entorno
    Prepare-Environment
    
    # 1. Configurar red Docker compartida
    Setup-SharedNetwork
    
    # 2. Build middleware
    Build-Image
    
    # 3. Deploy microservicios (desde el workspace root)
    $originalLocation = Get-Location
    
    try {
        # Deploy cada microservicio
        $services = @(
            @{name="accessibility-ms-analysis"; container="msanalysis-api"},
            @{name="accessibility-ms-users"; container="msusers-api"},
            @{name="accessibility-ms-reports"; container="msreports-api"}
        )
        
        foreach ($service in $services) {
            Write-Info "Desplegando $($service.name)..."
            Set-Location "../$($service.name)"
            docker-compose up -d --build
            Start-Sleep 5
            
            # Conectar a red compartida automáticamente
            Write-Info "Conectando $($service.container) a red compartida..."
            docker network connect accessibility-shared $($service.container) 2>$null
        }
        
        # 4. Iniciar middleware con configuración automática
        Set-Location $originalLocation
        Start-Container-WithNetworking
        
        # 5. Verificar conectividad
        Write-Info "Verificando conectividad del sistema..."
        Test-SystemConnectivity
        
        Write-Success "🎉 SISTEMA COMPLETO DESPLEGADO Y CONFIGURADO!"
        Write-Info ""
        Write-Host "📋 SERVICIOS DISPONIBLES:" -ForegroundColor Cyan
        Write-Host "  🔍 Middleware:    http://localhost:3001/api/docs" -ForegroundColor Green
        Write-Host "  👤 Users:         http://localhost:8081/swagger" -ForegroundColor Green
        Write-Host "  📊 Analysis:      http://localhost:8082/swagger" -ForegroundColor Green
        Write-Host "  📋 Reports:       http://localhost:8083/swagger" -ForegroundColor Green
        Write-Host "  🌐 Gateway:       http://localhost:8080" -ForegroundColor Green
        Write-Host ""
        Write-Host "🧪 PRUEBA RÁPIDA:" -ForegroundColor Yellow
        Write-Host "  curl -X POST http://localhost:3001/api/analyze -H 'Content-Type: application/json' -d '{""userId"":1,""inputType"":""html"",""value"":""<html><body><h1>Test</h1></body></html>"",""tool"":""both""}'" -ForegroundColor Gray
        
    } finally {
        Set-Location $originalLocation
    }
}

# Ejecutar acción
switch ($Action) {
    "build" { Build-Image }
    "start" { Start-Container }
    "stop" { Stop-Container }
    "restart" { Stop-Container; Start-Container }
    "logs" { Show-Logs }
    "clean" { Clean-All }
    "status" { Show-Status }
    "test" { Run-Tests }
    "deploy-all" { Deploy-All }
}
