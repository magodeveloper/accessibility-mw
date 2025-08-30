#!/usr/bin/env pwsh
# SCRIPT MAESTRO UNIFICADO PARA ACCESSIBILITY-MW
# Gestiona todo: build, deploy, cleanup, logs, monitoreo, etc.
#
# FUNCIONALIDADES DISPONIBLES:
# - build     : Construye la imagen Docker optimizada (2GB memoria compartida)
# - start     : Inicia el contenedor con configuraciones de red
# - stop      : Detiene el contenedor
# - restart   : Reinicia el contenedor (stop + start)
# - logs      : Muestra logs (usa -Follow para tiempo real)
# - status    : Estado detallado del contenedor
# - test      : Ejecuta tests de salud y conectividad
# - clean     : Limpieza básica de contenedor e imagen
# - cleanup   : Limpieza completa del sistema Docker
# - stats     : Estadísticas en tiempo real del contenedor
# - health    : Verificación completa de salud de la aplicación
# - monitor   : Monitor continuo del sistema (Ctrl+C para salir)
# - deploy-all: Despliegue completo del sistema con microservicios
#
# EJEMPLOS DE USO:
# .\manage.ps1 build -VerboseOutput       # Build detallado con logs
# .\manage.ps1 logs -Follow             # Logs en tiempo real  
# .\manage.ps1 stats                    # Estadísticas del contenedor
# .\manage.ps1 health                   # Verificación completa de salud
# .\manage.ps1 monitor                  # Monitor continuo del sistema
# .\manage.ps1 cleanup                  # Limpieza completa del sistema

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("build", "start", "stop", "restart", "logs", "clean", "status", "test", "deploy-all", "stats", "health", "cleanup", "monitor")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [switch]$Follow = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$VerboseOutput = $false
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
    Write-Info "🏗️ Construyendo imagen Docker optimizada..."
    
    # Limpiar imágenes viejas
    $oldImages = docker images $IMAGE_NAME -q
    if ($oldImages) {
        Write-Warning "Eliminando imágenes viejas..."
        docker rmi $oldImages -f 2>$null
    }
    
    # Build nueva imagen con optimizaciones
    if ($VerboseOutput) {
        Write-Info "Construyendo con salida detallada..."
        docker build -t $IMAGE_NAME . --no-cache | Tee-Object -FilePath "build.log"
    } else {
        docker build -t $IMAGE_NAME . --no-cache
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Imagen construida exitosamente"
        
        # Mostrar información de la imagen
        $imageInfo = docker images $IMAGE_NAME --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        Write-Info "📊 Información de la imagen:"
        Write-Host $imageInfo -ForegroundColor Cyan
        
        # Verificar optimizaciones aplicadas
        Write-Info "🔍 Verificando optimizaciones aplicadas..."
        $config = docker inspect $IMAGE_NAME | ConvertFrom-Json
        $env = $config[0].Config.Env | Where-Object { $_ -like "*NODE_OPTIONS*" -or $_ -like "*UV_THREADPOOL*" }
        if ($env) {
            Write-Success "✅ Optimizaciones de memoria detectadas: $($env -join ', ')"
        }
        
    } else {
        Write-Error "❌ Error construyendo imagen"
        if (Test-Path "build.log") {
            Write-Error "Ver detalles en build.log"
        }
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
    Write-Info "📋 Mostrando logs del contenedor..."
    
    $containerId = docker ps -q --filter "name=$CONTAINER_NAME"
    if (-not $containerId) {
        Write-Warning "⚠️ Contenedor '$CONTAINER_NAME' no está ejecutándose"
        # Intentar mostrar logs de contenedor detenido
        Write-Info "Intentando mostrar logs del último contenedor..."
    }
    
    if ($Follow) {
        Write-Info "📡 Siguiendo logs en tiempo real (Ctrl+C para salir)..."
        docker logs -f --timestamps $CONTAINER_NAME
    } else {
        Write-Info "📄 Mostrando últimas 100 líneas de logs..."
        docker logs --tail 100 --timestamps $CONTAINER_NAME
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
    if ($testAnalysis -and ($testAnalysis.Contains("analyses") -or $testAnalysis.Contains("message"))) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
        if ($testAnalysis) {
            Write-Host "    Respuesta: $($testAnalysis.Substring(0, [Math]::Min(80, $testAnalysis.Length)))" -ForegroundColor Gray
        }
    }
    
    # Test 2: Middleware → Users
    Write-Host "  👤 Conectividad Middleware → Users..." -NoNewline
    $testUsers = docker exec $CONTAINER_NAME curl -s http://msusers-api:8081/api/v1/users 2>$null
    if ($testUsers -and ($testUsers.Contains("users") -or $testUsers.Contains("message"))) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
        if ($testUsers) {
            Write-Host "    Respuesta: $($testUsers.Substring(0, [Math]::Min(80, $testUsers.Length)))" -ForegroundColor Gray
        }
    }
    
    # Test 3: Middleware → Reports
    Write-Host "  📋 Conectividad Middleware → Reports..." -NoNewline
    $testReports = docker exec $CONTAINER_NAME curl -s http://msreports-api:8083/api/Report 2>$null
    if ($testReports -and ($testReports.Contains("message") -or $testReports.Contains("reports"))) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
        if ($testReports) {
            Write-Host "    Respuesta: $($testReports.Substring(0, [Math]::Min(80, $testReports.Length)))" -ForegroundColor Gray
        }
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

# ===== FUNCIONES AVANZADAS AGREGADAS =====

function Show-Stats {
    Write-Info "📊 Estadísticas del contenedor..."
    
    $containerId = docker ps -q --filter "name=$CONTAINER_NAME"
    if (-not $containerId) {
        Write-Warning "⚠️ Contenedor '$CONTAINER_NAME' no está ejecutándose"
        return
    }
    
    Write-Info "📈 Estadísticas en tiempo real (presiona Ctrl+C para salir):"
    docker stats $CONTAINER_NAME --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
}

function Show-Health {
    Write-Info "🏥 Verificando salud del contenedor..."
    
    $containerId = docker ps -q --filter "name=$CONTAINER_NAME"
    if (-not $containerId) {
        Write-Error "❌ Contenedor '$CONTAINER_NAME' no está ejecutándose"
        return
    }
    
    # Health check básico
    Write-Host "🔍 Estado del contenedor:" -ForegroundColor Yellow
    $containerStatus = docker inspect $CONTAINER_NAME --format "{{.State.Status}}"
    Write-Host "  Estado: $containerStatus" -ForegroundColor $(if ($containerStatus -eq "running") { "Green" } else { "Red" })
    
    # Health check de la aplicación
    Write-Host "🌐 Health check de la aplicación:" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$PORT/health" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✅ Aplicación respondiendo correctamente" -ForegroundColor Green
            $healthData = $response.Content | ConvertFrom-Json
            if ($healthData.status -eq "ok") {
                Write-Host "  ✅ Health check: OK" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "  ❌ Aplicación no responde al health check" -ForegroundColor Red
    }
    
    # Información adicional
    Write-Host "📊 Recursos del contenedor:" -ForegroundColor Yellow
    $stats = docker stats $CONTAINER_NAME --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    Write-Host "  CPU: $(($stats -split '\t')[0])" -ForegroundColor Cyan
    Write-Host "  Memoria: $(($stats -split '\t')[1]) ($(($stats -split '\t')[2]))" -ForegroundColor Cyan
}

function Start-Cleanup {
    Write-Info "🧹 Limpieza completa del sistema Docker..."
    
    # Detener contenedores relacionados
    Write-Info "Deteniendo contenedores..."
    docker stop $CONTAINER_NAME 2>$null
    docker rm $CONTAINER_NAME 2>$null
    
    # Limpiar imágenes no utilizadas
    Write-Info "Limpiando imágenes no utilizadas..."
    docker image prune -f
    
    # Limpiar contenedores detenidos
    Write-Info "Limpiando contenedores detenidos..."
    docker container prune -f
    
    # Limpiar volúmenes no utilizados
    Write-Info "Limpiando volúmenes no utilizados..."
    docker volume prune -f
    
    # Limpiar redes no utilizadas
    Write-Info "Limpiando redes no utilizadas..."
    docker network prune -f
    
    # Limpiar caché de build
    Write-Info "Limpiando caché de build..."
    docker builder prune -f
    
    Write-Success "✅ Limpieza completa finalizada"
    
    # Mostrar espacio liberado
    Write-Info "💾 Espacio disponible después de la limpieza:"
    docker system df
}

function Start-Monitor {
    Write-Info "🖥️ Monitor del sistema - Presiona Ctrl+C para salir"
    
    $containerId = docker ps -q --filter "name=$CONTAINER_NAME"
    if (-not $containerId) {
        Write-Error "❌ Contenedor '$CONTAINER_NAME' no está ejecutándose"
        return
    }
    
    while ($true) {
        Clear-Host
        Write-Host "🖥️ MONITOR DEL SISTEMA - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
        Write-Host "=================================================" -ForegroundColor Gray
        
        # Estado del contenedor
        $containerStatus = docker inspect $CONTAINER_NAME --format "{{.State.Status}}"
        Write-Host "📦 Estado del contenedor: $containerStatus" -ForegroundColor $(if ($containerStatus -eq "running") { "Green" } else { "Red" })
        
        # Estadísticas en tiempo real
        Write-Host "`n📊 Recursos:" -ForegroundColor Yellow
        $stats = docker stats $CONTAINER_NAME --no-stream --format "{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
        if ($stats) {
            $statsParts = $stats -split '\t'
            Write-Host "  CPU: $($statsParts[0])" -ForegroundColor Cyan
            Write-Host "  Memoria: $($statsParts[1]) ($($statsParts[2]))" -ForegroundColor Cyan
            Write-Host "  Red I/O: $($statsParts[3])" -ForegroundColor Cyan
            Write-Host "  Disco I/O: $($statsParts[4])" -ForegroundColor Cyan
        }
        
        # Health check
        Write-Host "`n🏥 Health Check:" -ForegroundColor Yellow
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$PORT/health" -TimeoutSec 2 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✅ Aplicación saludable" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ❌ Aplicación no responde" -ForegroundColor Red
        }
        
        Write-Host "`n⏰ Actualizando cada 3 segundos..." -ForegroundColor Gray
        Start-Sleep 3
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
    "stats" { Show-Stats }
    "health" { Show-Health }
    "cleanup" { Start-Cleanup }
    "monitor" { Start-Monitor }
}
