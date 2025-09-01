#!/usr/bin/env pwsh
# SCRIPT MAESTRO UNIFICADO PARA ACCESSIBILITY-MW
# Gestiona todo: build, deploy, cleanup, logs, monitoreo, etc.
#
# FUNCIONALIDADES DISPONIBLES:
# - prerequisites : Verifica prerrequisitos del sistema (Docker, npm, Node.js, git)
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
# - test-gateway : Ejecuta tests del Gateway (unitarios e integración)
# - test-all     : Ejecuta todos los tests del sistema completo
# - validate     : Validación completa del proyecto (TypeScript, ESLint, build, tests, seguridad)
#
# EJEMPLOS DE USO:
# .\manage.ps1 build -VerboseOutput       # Build detallado con logs
# .\manage.ps1 logs -Follow             # Logs en tiempo real  
# .\manage.ps1 stats                    # Estadísticas del contenedor
# .\manage.ps1 health                   # Verificación completa de salud
# .\manage.ps1 monitor                  # Monitor continuo del sistema
# .\manage.ps1 test-gateway -Coverage     # Tests del Gateway con cobertura
# .\manage.ps1 test-all                  # Todos los tests del sistema

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("build", "start", "stop", "restart", "logs", "clean", "status", "test", "deploy-all", "stats", "health", "cleanup", "monitor", "test-gateway", "test-all", "validate", "prerequisites", "help")]
  [string]$Action,
    
  [Parameter(Mandatory = $false)]
  [switch]$Follow = $false,
    
  [Parameter(Mandatory = $false)]
  [switch]$VerboseOutput = $false,
    
  [Parameter(Mandatory = $false)]
  [switch]$Coverage = $false
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

function Test-Prerequisites {
  param(
    [string[]]$RequiredTools = @("docker", "npm", "node"),
    [switch]$Silent = $false
  )
  
  if (-not $Silent) {
    Write-Info "🔍 Verificando prerrequisitos del sistema..."
  }
  
  $allPrerequisitesMet = $true
  $results = @{}
  
  foreach ($tool in $RequiredTools) {
    $toolAvailable = $false
    $version = ""
    
    try {
      switch ($tool.ToLower()) {
        "docker" {
          $versionOutput = docker --version 2>$null
          if ($LASTEXITCODE -eq 0) {
            $toolAvailable = $true
            $version = $versionOutput
          }
        }
        "npm" {
          $versionOutput = npm --version 2>$null
          if ($LASTEXITCODE -eq 0) {
            $toolAvailable = $true
            $version = "v$versionOutput".Trim()
          }
        }
        "node" {
          $versionOutput = node --version 2>$null
          if ($LASTEXITCODE -eq 0) {
            $toolAvailable = $true
            $version = $versionOutput.Trim()
          }
        }
        "git" {
          $versionOutput = git --version 2>$null
          if ($LASTEXITCODE -eq 0) {
            $toolAvailable = $true
            $version = $versionOutput
          }
        }
      }
    }
    catch {
      $toolAvailable = $false
    }
    
    $results[$tool] = @{
      Available = $toolAvailable
      Version   = $version
    }
    
    if (-not $Silent) {
      if ($toolAvailable) {
        Write-Host "  🟢 $tool" -NoNewline -ForegroundColor Green
        Write-Host " ($version)" -ForegroundColor Gray
      }
      else {
        Write-Host "  🔴 $tool" -NoNewline -ForegroundColor Red
        Write-Host " (no disponible)" -ForegroundColor Red
        $allPrerequisitesMet = $false
      }
    }
    else {
      if (-not $toolAvailable) {
        $allPrerequisitesMet = $false
      }
    }
  }
  
  # Verificar si Docker está ejecutándose
  if ($RequiredTools -contains "docker" -and $results["docker"].Available) {
    try {
      docker ps 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) {
        if (-not $Silent) {
          Write-Host "  🟢 Docker daemon" -NoNewline -ForegroundColor Green
          Write-Host " (ejecutándose)" -ForegroundColor Gray
        }
        $results["docker-daemon"] = @{ Available = $true; Version = "running" }
      }
      else {
        if (-not $Silent) {
          Write-Host "  🟡 Docker daemon" -NoNewline -ForegroundColor Yellow
          Write-Host " (no ejecutándose)" -ForegroundColor Yellow
        }
        $results["docker-daemon"] = @{ Available = $false; Version = "stopped" }
        $allPrerequisitesMet = $false
      }
    }
    catch {
      if (-not $Silent) {
        Write-Host "  🔴 Docker daemon" -NoNewline -ForegroundColor Red
        Write-Host " (error de acceso)" -ForegroundColor Red
      }
      $results["docker-daemon"] = @{ Available = $false; Version = "error" }
      $allPrerequisitesMet = $false
    }
  }
  
  if (-not $Silent) {
    if ($allPrerequisitesMet) {
      Write-Success "Todos los prerrequisitos están disponibles"
    }
    else {
      Write-Error "Faltan prerrequisitos. Instala las herramientas faltantes antes de continuar."
    }
  }
  
  return @{
    AllMet  = $allPrerequisitesMet
    Results = $results
  }
}

function Build-Image {
  # Verificar prerrequisitos
  $prereqCheck = Test-Prerequisites -RequiredTools @("docker") -Silent
  if (-not $prereqCheck.AllMet) {
    Write-Error "No se puede construir la imagen. Docker no está disponible o no está ejecutándose."
    exit 1
  }

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
  }
  else {
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
        
  }
  else {
    Write-Error "❌ Error construyendo imagen"
    if (Test-Path "build.log") {
      Write-Error "Ver detalles en build.log"
    }
    exit 1
  }
}

function Start-Container {
  # Verificar prerrequisitos
  $prereqCheck = Test-Prerequisites -RequiredTools @("docker") -Silent
  if (-not $prereqCheck.AllMet) {
    Write-Error "No se puede iniciar el contenedor. Docker no está disponible o no está ejecutándose."
    exit 1
  }

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
  }
  else {
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
  }
  else {
    Write-Info "📄 Mostrando últimas 100 líneas de logs..."
    docker logs --tail 100 --timestamps $CONTAINER_NAME
  }
}

function Clear-AllResources {
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
    }
    catch {}
        
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
  }
  else {
    Write-Warning "Contenedor no encontrado"
  }
    
  # Imagen
  $image = docker images $IMAGE_NAME --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
  if ($image) {
    Write-Host $image
  }
  else {
    Write-Warning "Imagen no encontrada"
  }
}

function Invoke-Tests {
  # Verificar prerrequisitos
  $prereqCheck = Test-Prerequisites -RequiredTools @("npm", "node") -Silent
  if (-not $prereqCheck.AllMet) {
    Write-Error "No se pueden ejecutar los tests. npm/node no están disponibles."
    exit 1
  }

  Write-Info "Ejecutando tests..."
  npm test
  if ($LASTEXITCODE -eq 0) {
    Write-Success "Tests completados"
  }
  else {
    Write-Error "Tests fallaron"
    exit 1
  }
}

function Initialize-SharedNetwork {
  Write-Info "⚙️ Configurando red Docker compartida..."
    
  # Verificar si la red ya existe
  $networkExists = docker network ls --filter "name=accessibility-shared" --format "{{.Name}}" | Select-String "accessibility-shared"
    
  if (-not $networkExists) {
    Write-Info "Creando red 'accessibility-shared'..."
    docker network create accessibility-shared
    if ($LASTEXITCODE -eq 0) {
      Write-Success "Red compartida creada exitosamente"
    }
    else {
      Write-Error "Error creando red compartida"
      exit 1
    }
  }
  else {
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
    }
    else {
      Write-Warning "⚠️ Middleware iniciado pero health check falló"
    }
  }
  else {
    Write-Error "❌ Error iniciando contenedor"
    exit 1
  }
}

function Test-GatewayConnectivity {
  Write-Info "🌐 Probando conectividad del Gateway..."
    
  try {
    $gatewayHealth = Invoke-RestMethod -Uri "http://localhost:8100/health" -Method Get -TimeoutSec 10 -ErrorAction Stop
    Write-Host "  📊 Gateway Health Check..." -NoNewline
    Write-Host " ✅" -ForegroundColor Green
    Write-Info "  Status: $($gatewayHealth.status)"
    if ($gatewayHealth.services) {
      Write-Info "  Servicios disponibles: $($gatewayHealth.services.Count)"
    }
        
    # Probar endpoint de información
    $gatewayInfo = Invoke-RestMethod -Uri "http://localhost:8100/info" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($gatewayInfo) {
      Write-Host "  🔍 Gateway Info..." -NoNewline
      Write-Host " ✅" -ForegroundColor Green
    }
        
    # Probar métricas
    $gatewayMetrics = Invoke-RestMethod -Uri "http://localhost:8100/metrics" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($gatewayMetrics) {
      Write-Host "  📈 Gateway Metrics..." -NoNewline
      Write-Host " ✅" -ForegroundColor Green
    }
        
    return $true
        
  }
  catch {
    Write-Host "  📊 Gateway Health Check..." -NoNewline
    Write-Host " ❌" -ForegroundColor Red
    Write-Warning "Gateway no está respondiendo en http://localhost:8100/health"
    return $false
  }
}

function Test-SystemConnectivity {
  Write-Info "🔍 Probando conectividad del sistema..."
    
  # Test 1: Middleware → Analysis
  Write-Host "  📊 Conectividad Middleware → Analysis..." -NoNewline
  $testAnalysis = docker exec $CONTAINER_NAME curl -s http://msanalysis-api:8082/api/Analysis 2>$null
  if ($testAnalysis -and ($testAnalysis.Contains("analyses") -or $testAnalysis.Contains("message"))) {
    Write-Host " ✅" -ForegroundColor Green
  }
  else {
    Write-Host " ❌" -ForegroundColor Red
    if ($testAnalysis) {
      Write-Host "    Respuesta: $($testAnalysis.Substring(0, [Math]::Min(80, $testAnalysis.Length)))" -ForegroundColor Gray
    }
  }
    
  # Test 2: Middleware → Users
  Write-Host "  👤 Conectividad Middleware → Users..." -NoNewline
  $testUsers = docker exec $CONTAINER_NAME curl -s -w "%{http_code}" http://msusers-api:8081/api/users 2>$null
  if ($testUsers -and ($testUsers.Contains("200") -or $testUsers.Contains("users"))) {
    Write-Host " ✅" -ForegroundColor Green
  }
  else {
    Write-Host " ❌" -ForegroundColor Red
    # Verificar si el contenedor está corriendo
    $usersContainer = docker ps --filter "name=msusers-api" --format "{{.Status}}"
    Write-Host "    Container status: $usersContainer" -ForegroundColor Gray
    if ($testUsers) {
      Write-Host "    Respuesta: $($testUsers.Substring(0, [Math]::Min(80, $testUsers.Length)))" -ForegroundColor Gray
    }
  }
    
  # Test 3: Middleware → Reports
  Write-Host "  📋 Conectividad Middleware → Reports..." -NoNewline
  $testReports = docker exec $CONTAINER_NAME curl -s http://msreports-api:8083/api/Report 2>$null
  if ($testReports -and ($testReports.Contains("message") -or $testReports.Contains("reports"))) {
    Write-Host " ✅" -ForegroundColor Green
  }
  else {
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
  }
  else {
    Write-Host " ❌" -ForegroundColor Red
  }
    
  # Test 5: Gateway Connectivity (nuevo)
  Test-GatewayConnectivity
    
  Write-Info "✅ Verificación de conectividad completada"
}

function Initialize-Environment {
  Write-Info "🛠️ Preparando entorno para despliegue automático..."
    
  # Verificar Docker
  Write-Host "  🐋 Docker disponible..." -NoNewline
  try {
    docker --version | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Host " ✅" -ForegroundColor Green
    }
    else {
      Write-Host " ❌" -ForegroundColor Red
      Write-Error "Docker no está disponible"
      exit 1
    }
  }
  catch {
    Write-Host " ❌" -ForegroundColor Red
    Write-Error "Docker no está instalado o no está en PATH"
    exit 1
  }
    
  # Verificar que los microservicios estén corriendo
  Write-Host "  📊 Microservicio Analysis..." -NoNewline
  $analysisRunning = docker ps --filter "name=msanalysis-api" --format "{{.Names}}" | Select-String "msanalysis-api"
  if ($analysisRunning) {
    Write-Host " ✅" -ForegroundColor Green
  }
  else {
    Write-Host " ⚠️" -ForegroundColor Yellow
    Write-Warning "Microservicio Analysis no está corriendo. Inicialo con docker-compose en accessibility-ms-analysis"
  }
    
  Write-Host "  👤 Microservicio Users..." -NoNewline
  $usersRunning = docker ps --filter "name=msusers-api" --format "{{.Names}}" | Select-String "msusers-api"
  if ($usersRunning) {
    Write-Host " ✅" -ForegroundColor Green
  }
  else {
    Write-Host " ⚠️" -ForegroundColor Yellow
    Write-Warning "Microservicio Users no está corriendo. Inicialo con docker-compose en accessibility-ms-users"
  }
    
  Write-Host "  📋 Microservicio Reports..." -NoNewline
  $reportsRunning = docker ps --filter "name=msreports-api" --format "{{.Names}}" | Select-String "msreports-api"
  if ($reportsRunning) {
    Write-Host " ✅" -ForegroundColor Green
  }
  else {
    Write-Host " ⚠️" -ForegroundColor Yellow
    Write-Warning "Microservicio Reports no está corriendo. Inicialo con docker-compose en accessibility-ms-reports"
  }
    
  Write-Info "✅ Verificación de entorno completada"
}

function Deploy-Gateway {
  Write-Info "🚀 Desplegando API Gateway..."
    
  $originalLocation = Get-Location
  try {
    Set-Location "../accessibility-gw"
        
    # Verificar si existe el directorio del gateway
    if (-not (Test-Path ".")) {
      Write-Warning "⚠️ Directorio del Gateway no encontrado en ../accessibility-gw"
      return $false
    }
        
    # Ejecutar tests del Gateway primero
    Write-Info "Ejecutando tests del Gateway..."
    $testResult = & ".\manage-gateway.ps1" test -TestType All
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "⚠️ Tests del Gateway fallaron (Exit Code: $LASTEXITCODE), continuando con despliegue..."
    }
    else {
      Write-Success "✅ Tests del Gateway exitosos"
      Write-Info "  Test result summary: $($testResult | Out-String)"
    }
        
    # Build y deploy del gateway usando el script unificado
    Write-Info "Construyendo Gateway..."
    & ".\manage-gateway.ps1" build -Configuration Release -BuildType docker
    if ($LASTEXITCODE -ne 0) {
      Write-Error "❌ Error construyendo Gateway"
      return $false
    }
        
    Write-Info "Desplegando Gateway con Docker..."
    & ".\manage-gateway.ps1" docker up -Environment prod
    if ($LASTEXITCODE -ne 0) {
      Write-Error "❌ Error desplegando Gateway"
      return $false
    }
        
    Start-Sleep 8
        
    # El nombre correcto del contenedor es accessibility-gateway (según docker-compose.yml)
    Write-Info "Conectando Gateway a red compartida..."
    docker network connect accessibility-shared accessibility-gateway 2>$null
        
    # Verificar que el gateway esté corriendo
    $gatewayStatus = docker ps --filter "name=accessibility-gateway" --format "{{.Status}}"
    if ($gatewayStatus -match "Up") {
      Write-Success "✅ Gateway desplegado correctamente"
            
      # Verificar health del Gateway
      Write-Info "Verificando salud del Gateway..."
      & ".\manage-gateway.ps1" verify -Full
            
      return $true
    }
    else {
      Write-Warning "⚠️ Gateway no se pudo iniciar correctamente"
      return $false
    }
        
  }
  catch {
    Write-Error "❌ Error desplegando Gateway: $($_.Exception.Message)"
    return $false
  }
  finally {
    Set-Location $originalLocation
  }
}

function Deploy-All {
  Write-Info "🚀 DESPLEGANDO SISTEMA COMPLETO CON CONFIGURACIÓN AUTOMÁTICA..."
    
  # 0. Preparar y verificar entorno
  Initialize-Environment
    
  # 1. Configurar red Docker compartida
  Initialize-SharedNetwork
    
  # 2. Build middleware
  Build-Image
    
  # 3. Deploy microservicios (desde el workspace root)
  $originalLocation = Get-Location
    
  try {
    # Deploy cada microservicio
    $services = @(
      @{name = "accessibility-ms-analysis"; container = "msanalysis-api" },
      @{name = "accessibility-ms-users"; container = "msusers-api" },
      @{name = "accessibility-ms-reports"; container = "msreports-api" }
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
        
    # 4. Deploy Gateway (nuevo)
    Set-Location $originalLocation
    $gatewayDeployed = Deploy-Gateway
        
    # 5. Iniciar middleware con configuración automática
    Start-Container-WithNetworking
        
    # 6. Verificar conectividad
    Write-Info "Verificando conectividad del sistema..."
    Test-SystemConnectivity
        
    Write-Success "🎉 SISTEMA COMPLETO DESPLEGADO Y CONFIGURADO!"
    Write-Info ""
    Write-Host "📋 SERVICIOS DISPONIBLES:" -ForegroundColor Cyan
    Write-Host "  🔍 Middleware:    http://localhost:3001/api/docs" -ForegroundColor Green
    Write-Host "  👤 Users:         http://localhost:8081/swagger" -ForegroundColor Green
    Write-Host "  📊 Analysis:      http://localhost:8082/swagger" -ForegroundColor Green
    Write-Host "  📋 Reports:       http://localhost:8083/swagger" -ForegroundColor Green
    if ($gatewayDeployed) {
      Write-Host "  🌐 Gateway:       http://localhost:8100/swagger" -ForegroundColor Green
      Write-Host "  🌐 Gateway API:   http://localhost:8100/api/v1/users" -ForegroundColor Green
      Write-Host "  🏥 Gateway Health: http://localhost:8100/health" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "🧪 PRUEBA RÁPIDA:" -ForegroundColor Yellow
    Write-Host "  curl -X POST http://localhost:3001/api/analyze -H 'Content-Type: application/json' -d '{""userId"":1,""inputType"":""html"",""value"":""<html><body><h1>Test</h1></body></html>"",""tool"":""both""}'" -ForegroundColor Gray
    if ($gatewayDeployed) {
      Write-Host ""
      Write-Host "🌐 PRUEBA A TRAVÉS DEL GATEWAY:" -ForegroundColor Yellow
      Write-Host "  curl -X POST http://localhost:8100/api/v1/translate -H 'Content-Type: application/json' -d '{""service"":""middleware"",""method"":""POST"",""path"":""/api/analyze"",""body"":{""userId"":1,""inputType"":""html"",""value"":""<html><body><h1>Test Gateway</h1></body></html>"",""tool"":""both""}}'" -ForegroundColor Gray
    }
        
  }
  finally {
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
  }
  catch {
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
    }
    catch {
      Write-Host "  ❌ Aplicación no responde" -ForegroundColor Red
    }
        
    Write-Host "`n⏰ Actualizando cada 3 segundos..." -ForegroundColor Gray
    Start-Sleep 3
  }
}

function Test-Gateway {
  Write-Info "🧪 Ejecutando tests del Gateway..."
  Write-Info "📍 Delegando al script especializado del Gateway..."
    
  $originalLocation = Get-Location
    
  try {
    Set-Location "../accessibility-gw"
        
    if (-not (Test-Path "manage-gateway.ps1")) {
      Write-Error "❌ Script de gestión del Gateway no encontrado"
      return
    }

    Write-Info "Ejecutando: .\manage-gateway.ps1 test"
    if ($Coverage) {
      & ".\manage-gateway.ps1" "test" "-GenerateCoverage"
    }
    else {
      & ".\manage-gateway.ps1" "test"
    }

    if ($LASTEXITCODE -eq 0) {
      Write-Success "✅ Tests del Gateway completados exitosamente"
    }
    else {
      Write-Error "❌ Tests del Gateway fallaron (Exit Code: $LASTEXITCODE)"
    }
  }
  catch {
    Write-Error "❌ Error ejecutando tests del Gateway: $($_.Exception.Message)"
  }
  finally {
    Set-Location $originalLocation
  }
}

function Test-AllSystem {
  Write-Info "🧪 Ejecutando tests completos del sistema..."
    
  # 1. Tests del Gateway
  Write-Info "📍 1/3: Tests del Gateway..."
  Test-Gateway
    
  # 2. Tests del Middleware
  Write-Info "📍 2/3: Tests del Middleware..."
  Invoke-Tests
    
  # 3. Tests de integración del sistema completo
  Write-Info "📍 3/3: Tests de integración del sistema..."
  Test-SystemIntegration
    
  Write-Success "🎉 Tests completos del sistema finalizados"
}

function Test-SystemIntegration {
  Write-Info "🔗 Ejecutando tests de integración del sistema completo..."
    
  # Verificar que todos los servicios están ejecutándose
  $requiredServices = @("accessibility-mw-prod", "msusers-api", "msanalysis-api", "msreports-api")
  $runningServices = docker ps --format "{{.Names}}" | Where-Object { $_ -in $requiredServices }
    
  if ($runningServices.Count -ne $requiredServices.Count) {
    Write-Warning "⚠️ No todos los servicios están ejecutándose. Desplegando sistema..."
    Deploy-All
    Start-Sleep 10
  }
    
  Write-Info "Verificando conectividad entre servicios..."
    
  # Test 1: Gateway puede alcanzar todos los servicios
  $gatewayRunning = docker ps --filter "name=accessibility-gw" --format "{{.Names}}"
  if ($gatewayRunning) {
    Write-Info "Testing Gateway -> Microservices connectivity..."
        
    $endpoints = @(
      @{Service = "Users"; Url = "http://localhost:8100/api/v1/users" },
      @{Service = "Analysis"; Url = "http://localhost:8100/api/Analysis" }, 
      @{Service = "Reports"; Url = "http://localhost:8100/api/Report" },
      @{Service = "Middleware"; Url = "http://localhost:8100/api/middleware" }
    )
        
    foreach ($endpoint in $endpoints) {
      try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -Method HEAD -TimeoutSec 5 -UseBasicParsing
        Write-Success "  ✅ $($endpoint.Service): Gateway proxy working (Status: $($response.StatusCode))"
      }
      catch {
        Write-Warning "  ⚠️ $($endpoint.Service): Gateway proxy may have issues - $($_.Exception.Message)"
      }
    }
  }
    
  # Test 2: Direct connectivity between services
  Write-Info "Testing direct service connectivity..."
  Test-SystemConnectivity
    
  # Test 3: End-to-end workflow
  Write-Info "Testing end-to-end workflow..."
  Test-EndToEndWorkflow
}

function Test-EndToEndWorkflow {
  Write-Info "🚀 Testing end-to-end workflow..."
    
  try {
    # Test a complete accessibility analysis workflow
    $testUrl = "https://example.com"
    $middlewareEndpoint = "http://localhost:3001/api/analyze"
        
    $body = @{
      url               = $testUrl
      includeScreenshot = $false
      waitTime          = 1
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri $middlewareEndpoint -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
        
    if ($response.StatusCode -eq 200) {
      $result = $response.Content | ConvertFrom-Json
      Write-Success "  ✅ E2E workflow: Analysis completed successfully"
      Write-Info "  📊 Found $($result.results.violations.Length) violations"
    }
    else {
      Write-Warning "  ⚠️ E2E workflow: Unexpected response code $($response.StatusCode)"
    }
  }
  catch {
    Write-Warning "  ⚠️ E2E workflow test failed: $($_.Exception.Message)"
  }
}

function Test-ProjectValidation {
  Write-Info "🔍 Iniciando validación completa del proyecto..."
  
  $global:ErrorCount = 0
  $global:WarningCount = 0
  
  function Write-ValidationError($message) {
    Write-Host "❌ $message" -ForegroundColor Red
    $global:ErrorCount++
  }
  
  function Write-ValidationWarning($message) {
    Write-Host "⚠️ $message" -ForegroundColor Yellow
    $global:WarningCount++
  }
  
  function Write-ValidationSuccess($message) {
    Write-Host "✅ $message" -ForegroundColor Green
  }
  
  # 1. Verificar TypeScript
  Write-Info "📍 1/8: Verificando configuración de TypeScript..."
  if (Test-Path "tsconfig.json") {
    try {
      npx tsc --noEmit --skipLibCheck 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Write-ValidationSuccess "TypeScript: Sin errores de tipo"
      }
      else {
        Write-ValidationError "TypeScript: Errores de tipo detectados"
      }
    }
    catch {
      Write-ValidationError "TypeScript: Error al ejecutar verificación"
    }
  }
  else {
    Write-ValidationWarning "TypeScript: tsconfig.json no encontrado"
  }
  
  # 2. Verificar ESLint
  Write-Info "📍 2/8: Verificando ESLint..."
  $eslintConfigExists = (Test-Path ".eslintrc.*") -or (Test-Path "eslint.config.js") -or (Test-Path "config/eslint.config.js")
  if ($eslintConfigExists) {
    try {
      # Usar el comando de lint definido en package.json
      npm run lint:check 2>&1 | Out-Null
      if ($LASTEXITCODE -eq 0) {
        Write-ValidationSuccess "ESLint: Sin errores ni advertencias"
      }
      else {
        Write-ValidationError "ESLint: Errores o advertencias detectados"
      }
    }
    catch {
      Write-ValidationError "ESLint: Error al ejecutar verificación"
    }
  }
  else {
    Write-ValidationWarning "ESLint: Configuración no encontrada"
  }
  
  # 3. Verificar build
  Write-Info "📍 3/8: Verificando build del proyecto..."
  try {
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-ValidationSuccess "Build: Compilación exitosa"
    }
    else {
      Write-ValidationError "Build: Falló la compilación"
    }
  }
  catch {
    Write-ValidationError "Build: Error al ejecutar build"
  }
  
  # 4. Verificar tests
  Write-Info "📍 4/8: Verificando tests unitarios..."
  try {
    npm test 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-ValidationSuccess "Tests: Todos los tests pasaron"
    }
    else {
      Write-ValidationError "Tests: Algunos tests fallaron"
    }
  }
  catch {
    Write-ValidationError "Tests: Error al ejecutar tests"
  }
  
  # 5. Verificar npm audit
  Write-Info "📍 5/8: Verificando seguridad (npm audit)..."
  try {
    $auditResult = npm audit --audit-level high --json 2>&1 | ConvertFrom-Json
    if ($auditResult.metadata.vulnerabilities.high -eq 0 -and $auditResult.metadata.vulnerabilities.critical -eq 0) {
      Write-ValidationSuccess "Seguridad: Sin vulnerabilidades críticas o altas"
    }
    else {
      Write-ValidationError "Seguridad: Vulnerabilidades críticas/altas detectadas"
    }
  }
  catch {
    Write-ValidationWarning "Seguridad: Error al ejecutar npm audit"
  }
  
  # 6. Verificar estructura de archivos
  Write-Info "📍 6/8: Verificando estructura de archivos..."
  $requiredFiles = @("package.json", "README.md", "Dockerfile", "docker-compose.yml")
  $missingFiles = @()
  
  foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
      $missingFiles += $file
    }
  }
  
  if ($missingFiles.Count -eq 0) {
    Write-ValidationSuccess "Estructura: Todos los archivos requeridos presentes"
  }
  else {
    Write-ValidationError "Estructura: Archivos faltantes: $($missingFiles -join ', ')"
  }
  
  # 7. Verificar tamaño del bundle
  Write-Info "📍 7/8: Verificando tamaño del bundle..."
  if (Test-Path "dist") {
    try {
      $distSize = (Get-ChildItem "dist" -Recurse | Measure-Object -Property Length -Sum).Sum
      $distSizeMB = [Math]::Round($distSize / 1MB, 2)
      
      if ($distSizeMB -lt 50) {
        Write-ValidationSuccess "Bundle: Tamaño apropiado ($distSizeMB MB)"
      }
      elseif ($distSizeMB -lt 100) {
        Write-ValidationWarning "Bundle: Tamaño grande ($distSizeMB MB)"
      }
      else {
        Write-ValidationError "Bundle: Tamaño excesivo ($distSizeMB MB)"
      }
    }
    catch {
      Write-ValidationWarning "Bundle: Error al calcular tamaño"
    }
  }
  else {
    Write-ValidationWarning "Bundle: Directorio dist no encontrado (¿build ejecutado?)"
  }
  
  # 8. Verificar Docker build
  Write-Info "📍 8/8: Verificando Docker build..."
  try {
    docker build -t accessibility-mw-validate-test . 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-ValidationSuccess "Docker: Build exitoso"
      # Limpiar imagen de prueba
      docker rmi accessibility-mw-validate-test 2>&1 | Out-Null
    }
    else {
      Write-ValidationError "Docker: Falló el build"
    }
  }
  catch {
    Write-ValidationError "Docker: Error al ejecutar build"
  }
  
  # Resumen final
  Write-Host ""
  Write-Host "🏁 RESUMEN DE VALIDACIÓN" -ForegroundColor Cyan
  Write-Host "========================" -ForegroundColor Cyan
  Write-Host "✅ Verificaciones exitosas: $((8 - $global:ErrorCount - $global:WarningCount))" -ForegroundColor Green
  Write-Host "⚠️ Advertencias: $global:WarningCount" -ForegroundColor Yellow
  Write-Host "❌ Errores: $global:ErrorCount" -ForegroundColor Red
  
  if ($global:ErrorCount -eq 0) {
    Write-Host ""
    Write-Success "🎉 Proyecto validado exitosamente"
    exit 0
  }
  else {
    Write-Host ""
    Write-Host "❌ Proyecto tiene errores que deben corregirse" -ForegroundColor Red
    exit 1
  }
}

# Ejecutar acción
switch ($Action) {
  "prerequisites" { Test-Prerequisites -RequiredTools @("docker", "npm", "node", "git") }
  "build" { Build-Image }
  "start" { Start-Container }
  "stop" { Stop-Container }
  "restart" { Stop-Container; Start-Container }
  "logs" { Show-Logs }
  "clean" { Clear-AllResources }
  "status" { Show-Status }
  "test" { Invoke-Tests }
  "test-gateway" { Test-Gateway }
  "test-all" { Test-AllSystem }
  "validate" { Test-ProjectValidation }
  "deploy-all" { Deploy-All }
  "stats" { Show-Stats }
  "health" { Show-Health }
  "cleanup" { Start-Cleanup }
  "monitor" { Start-Monitor }
  "help" { 
    Write-Host ""
    Write-Host "🔧 Gestor de Accessibility Middleware" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\manage.ps1 -Action <accion> [opciones]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "ACCIONES DISPONIBLES:" -ForegroundColor Green
    Write-Host "  prerequisites  - Verificar prerrequisitos del sistema (Docker, npm, Node.js, etc.)" -ForegroundColor White
    Write-Host "  build          - Construir imagen Docker" -ForegroundColor White
    Write-Host "  start          - Iniciar contenedor" -ForegroundColor White
    Write-Host "  stop           - Detener contenedor" -ForegroundColor White
    Write-Host "  restart        - Reiniciar contenedor" -ForegroundColor White
    Write-Host "  logs           - Mostrar logs (-Follow para seguimiento)" -ForegroundColor White
    Write-Host "  clean          - Limpiar imágenes y contenedores" -ForegroundColor White
    Write-Host "  status         - Mostrar estado del sistema" -ForegroundColor White
    Write-Host "  stats          - Mostrar estadísticas de contenedores" -ForegroundColor White
    Write-Host "  health         - Verificar salud del sistema" -ForegroundColor White
    Write-Host "  monitor        - Monitorear logs en tiempo real" -ForegroundColor White
    Write-Host ""
    Write-Host "GESTIÓN DEL SISTEMA COMPLETO:" -ForegroundColor Green
    Write-Host "  deploy-all     - Desplegar todo el sistema" -ForegroundColor White
    Write-Host "  cleanup-all    - Limpiar todo el sistema" -ForegroundColor White
    Write-Host "  logs-all       - Mostrar logs de todos los servicios" -ForegroundColor White
    Write-Host "  restart-all    - Reiniciar todo el sistema" -ForegroundColor White
    Write-Host "  stop-all       - Detener todos los servicios" -ForegroundColor White
    Write-Host "  build-all      - Construir todas las imágenes" -ForegroundColor White
    Write-Host ""
    Write-Host "TESTING Y CALIDAD:" -ForegroundColor Green
    Write-Host "  test           - Ejecutar tests del middleware (-Coverage para reportes)" -ForegroundColor White
    Write-Host "  test-gateway   - Ejecutar tests del Gateway (-Coverage para reportes)" -ForegroundColor White
    Write-Host "  test-all       - Ejecutar tests completos del sistema" -ForegroundColor White
    Write-Host "  validate       - Validación completa del proyecto (TypeScript, ESLint, build, tests, etc.)" -ForegroundColor White
    Write-Host ""
    Write-Host "OPCIONES:" -ForegroundColor Green
    Write-Host "  -Follow        - Seguir logs en tiempo real" -ForegroundColor White
    Write-Host "  -VerboseOutput - Mostrar salida detallada" -ForegroundColor White
    Write-Host "  -Coverage      - Generar reportes de cobertura de código" -ForegroundColor White
    Write-Host ""
    Write-Host "EJEMPLOS:" -ForegroundColor Yellow
    Write-Host "  .\manage.ps1 -Action deploy-all" -ForegroundColor Gray
    Write-Host "  .\manage.ps1 -Action test -Coverage" -ForegroundColor Gray
    Write-Host "  .\manage.ps1 -Action test-gateway -Coverage" -ForegroundColor Gray
    Write-Host "  .\manage.ps1 -Action test-all" -ForegroundColor Gray
    Write-Host "  .\manage.ps1 -Action logs-all -Follow" -ForegroundColor Gray
    Write-Host ""
  }
}
