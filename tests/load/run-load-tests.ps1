#!/usr/bin/env pwsh#!/usr/bin/env pwsh#!/usr/bin/env pwsh#!/usr/bin/env pwsh

# Script para ejecutar tests de carga con K6

# Uso: .\run-load-tests.ps1 -TestType [load|stress|spike] -Target [url]# Script para ejecutar tests de carga con K6



param(# Uso: .\run-load-tests.ps1 -TestType [load|stress|spike] -Target [url]# Script para ejecutar tests de carga con K6# Script para ejecutar tests de carga con K6

    [Parameter(Mandatory = $true)]

    [ValidateSet("load", "stress", "spike")]

    [string]$TestType,

param(# Uso: .\run-load-tests.ps1 -TestType [load|stress|spike] -Target [url]# Uso: .\run-load-tests.ps1 -TestType [load|stress|spike] -Target [url]

    [Parameter(Mandatory = $false)]

    [string]$Target = "http://localhost:3001",    [Parameter(Mandatory = $true)]



    [Parameter(Mandatory = $false)]    [ValidateSet("load", "stress", "spike")]

    [switch]$InstallDeps,

    [string]$TestType,

    [Parameter(Mandatory = $false)]

    [switch]$GenerateReport,param(param(



    [Parameter(Mandatory = $false)]    [Parameter(Mandatory = $false)]

    [string]$OutputDir = "./test-reports/load"

)    [string]$Target = "http://localhost:3001",    [Parameter(Mandatory = $true)]    [Parameter(Mandatory = $true)]



$ErrorActionPreference = "Stop"



function Write-Info($message) { Write-Host "ℹ️  $message" -ForegroundColor Cyan }    [Parameter(Mandatory = $false)]    [ValidateSet("load", "stress", "spike")]    [ValidateSet("load", "stress", "spike")]

function Write-Success($message) { Write-Host "✅ $message" -ForegroundColor Green }

function Write-Warning($message) { Write-Host "⚠️  $message" -ForegroundColor Yellow }    [switch]$InstallDeps = $false,

function Write-Error($message) { Write-Host "❌ $message" -ForegroundColor Red }

    [string]$TestType,    [string]$TestType,

Write-Info "=== ACCESSIBILITY-MW K6 LOAD TESTING SUITE ==="

Write-Info "Test Type: $TestType | Target: $Target"    [Parameter(Mandatory = $false)]



# Crear directorio de reportes    [switch]$GenerateReport = $true,

if (-not (Test-Path $OutputDir)) {

    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

    Write-Info "Creado directorio de reportes: $OutputDir"

}    [Parameter(Mandatory = $false)]    [Parameter(Mandatory = $false)]    [Parameter(Mandatory = $true)]



# Verificar instalación de K6 si se solicita    [string]$OutputDir = "./test-reports/load"

if ($InstallDeps) {

    Write-Info "Verificando instalación de K6...")    [string]$Target = "http://localhost:3000",    [ValidateSet("load", "stress", "spike")]

    if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {

        Write-Warning "K6 no encontrado. Descarga desde: https://k6.io/docs/getting-started/installation/"

        Write-Warning "O instala con: winget install k6.k6"

        exit 1$ErrorActionPreference = "Stop"    [string]$TestType,

    } else {

        Write-Success "K6 ya está instalado"

    }

}# Colores para output    [Parameter(Mandatory = $false)]



# Verificar conectividad con el serviciofunction Write-ColorOutput($ForegroundColor) {

Write-Info "Verificando conectividad con $Target..."

try {    $fc = $host.UI.RawUI.ForegroundColor    [switch]$InstallDeps = $false,    [Parameter(Mandatory = $false)]

    $response = Invoke-WebRequest -Uri "$Target/health" -Method GET -TimeoutSec 10

    if ($response.StatusCode -eq 200) {    $host.UI.RawUI.ForegroundColor = $ForegroundColor

        Write-Success "Servicio disponible en $Target"

    } else {    if ($args) {    [string]$Target = "http://localhost:3000",

        Write-Warning "Servicio responde con código: $($response.StatusCode)"

    }        Write-Output $args

} catch {

    Write-Error "No se puede conectar a $Target. ¿Está el servicio ejecutándose?"    }    [Parameter(Mandatory = $false)]

    Write-Info "Intenta ejecutar: .\manage.ps1 start"

    exit 1    $host.UI.RawUI.ForegroundColor = $fc

}

}    [switch]$GenerateReport = $true,    [Parameter(Mandatory = $false)]

# Función para ejecutar K6

function Invoke-K6Test {

    param($TestType, $Target, $OutputDir)

    function Write-Info($message) { Write-ColorOutput Cyan "ℹ️  $message" }    [switch]$InstallDeps = $false,

    # Buscar script específico

    $scriptFile = "tests/load/k6/${TestType}-test.js"function Write-Success($message) { Write-ColorOutput Green "✅ $message" }

    if (-not (Test-Path $scriptFile)) {

        # Fallback a archivos existentesfunction Write-Warning($message) { Write-ColorOutput Yellow "⚠️  $message" }    [Parameter(Mandatory = $false)]

        switch ($TestType) {

            "load" { $scriptFile = "tests/load/light-load-k6.js" }function Write-Error($message) { Write-ColorOutput Red "❌ $message" }

            "stress" { $scriptFile = "tests/load/stress-load.js" }

            "spike" { $scriptFile = "tests/load/medium-load-k6.js" }    [string]$OutputDir = "./test-reports/load"    [Parameter(Mandatory = $false)]

            default { $scriptFile = "tests/load/light-load-k6.js" }

        }Write-Info "=== ACCESSIBILITY-MW K6 LOAD TESTING SUITE ==="

        

        if (-not (Test-Path $scriptFile)) {Write-Info "Test Type: $TestType | Target: $Target")    [switch]$GenerateReport = $true,

            Write-Error "No se encontró script K6 para: $TestType"

            Write-Info "Scripts disponibles:"

            Get-ChildItem "tests/load" -Filter "*.js" | ForEach-Object { Write-Info "  - $($_.Name)" }

            exit 1# Crear directorio de reportes

        }

        if (-not (Test-Path $OutputDir)) {

        Write-Warning "Usando script fallback: $scriptFile"

    }    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null$ErrorActionPreference = "Stop"    [Parameter(Mandatory = $false)]

    

    # Preparar archivos de salida    Write-Info "Creado directorio de reportes: $OutputDir"

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

    $reportFile = "$OutputDir/k6_${TestType}_${timestamp}.json"}    [string]$OutputDir = "./test-reports/load"

    

    Write-Info "Ejecutando K6 test: $TestType"

    Write-Info "Script: $scriptFile"

    # Verificar instalación de K6# Colores para output)

    # Variables de entorno para K6

    $env:BASE_URL = $Targetif ($InstallDeps) {

    $env:TEST_TYPE = $TestType

        Write-Info "Verificando instalación de K6..."function Write-ColorOutput($ForegroundColor) {

    # Comando K6

    $k6Cmd = "k6 run `"$scriptFile`""    if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {

    if ($GenerateReport) {

        $k6Cmd += " --out json=`"$reportFile`""        Write-Warning "K6 no encontrado. Descarga desde: https://k6.io/docs/getting-started/installation/"    $fc = $host.UI.RawUI.ForegroundColor$ErrorActionPreference = "Stop"

        Write-Info "Reporte: $reportFile"

    }        Write-Warning "O instala con: winget install k6.k6"

    

    Write-Info "Ejecutando: $k6Cmd"        exit 1    $host.UI.RawUI.ForegroundColor = $ForegroundColor

    Invoke-Expression $k6Cmd

        } else {

    if ($LASTEXITCODE -eq 0) {

        Write-Success "Test K6 completado exitosamente"        Write-Success "K6 ya está instalado"    if ($args) {# Colores para output

        if ($GenerateReport -and (Test-Path $reportFile)) {

            Write-Success "Reporte generado: $reportFile"    }

        }

    } else {}        Write-Output $argsfunction Write-ColorOutput($ForegroundColor) {

        Write-Error "Test K6 falló con código: $LASTEXITCODE"

        exit 1

    }

}# Verificar que el servicio objetivo está disponible    }    $fc = $host.UI.RawUI.ForegroundColor



# Ejecutar el testWrite-Info "Verificando conectividad con $Target..."

try {

    $startTime = Get-Datetry {    $host.UI.RawUI.ForegroundColor = $fc    $host.UI.RawUI.ForegroundColor = $ForegroundColor

    

    Write-Info "Iniciando test K6..."    $response = Invoke-WebRequest -Uri "$Target/health" -Method GET -TimeoutSec 10

    Invoke-K6Test -TestType $TestType -Target $Target -OutputDir $OutputDir

        if ($response.StatusCode -eq 200) {}    if ($args) {

    $endTime = Get-Date

    $duration = $endTime - $startTime        Write-Success "Servicio disponible en $Target"

    

    Write-Success "=== TEST COMPLETADO ==="    } else {        Write-Output $args

    Write-Info "Duración: $($duration.ToString('hh\:mm\:ss'))"

    Write-Info "Reportes en: $OutputDir"        Write-Warning "Servicio responde con código: $($response.StatusCode)"

    

    # Mostrar archivos generados    }function Write-Info($message) { Write-ColorOutput Cyan "ℹ️  $message" }    }

    $reports = Get-ChildItem $OutputDir -Filter "*$(Get-Date -Format 'yyyyMMdd')*" -ErrorAction SilentlyContinue

    if ($reports) {} catch {

        Write-Info "Archivos generados:"

        $reports | ForEach-Object { Write-Info "  - $($_.Name)" }    Write-Error "No se puede conectar a $Target. ¿Está el servicio ejecutándose?"function Write-Success($message) { Write-ColorOutput Green "✅ $message" }    $host.UI.RawUI.ForegroundColor = $fc

    }

        Write-Info "Intenta ejecutar: .\manage.ps1 start"

} catch {

    Write-Error "Error: $($_.Exception.Message)"    exit 1function Write-Warning($message) { Write-ColorOutput Yellow "⚠️  $message" }}

    exit 1

}}



Write-Success "Load testing K6 completado ✨"function Write-Error($message) { Write-ColorOutput Red "❌ $message" }

# Función para ejecutar K6

function Invoke-K6Test {function Write-Info($message) { Write-ColorOutput Cyan "ℹ️  $message" }

    param($TestType, $Target, $OutputDir)

    Write-Info "=== ACCESSIBILITY-MW K6 LOAD TESTING SUITE ==="function Write-Success($message) { Write-ColorOutput Green "✅ $message" }

    # Buscar script específico para el tipo de test

    $scriptFile = "tests/load/k6/${TestType}-test.js"Write-Info "Test Type: $TestType | Target: $Target"function Write-Warning($message) { Write-ColorOutput Yellow "⚠️  $message" }

    if (-not (Test-Path $scriptFile)) {

        # Usar archivos .js existentes como fallbackfunction Write-Error($message) { Write-ColorOutput Red "❌ $message" }

        switch ($TestType) {

            "load" { $scriptFile = "tests/load/light-load-k6.js" }# Crear directorio de reportes

            "stress" { $scriptFile = "tests/load/stress-load.js" }

            "spike" { $scriptFile = "tests/load/medium-load-k6.js" }if (-not (Test-Path $OutputDir)) {Write-Info "=== ACCESSIBILITY-MW LOAD TESTING SUITE ==="

            default { $scriptFile = "tests/load/light-load-k6.js" }

        }    New-Item -ItemType Directory -Path $OutputDir -Force | Out-NullWrite-Info "Tool: $Tool | Test Type: $TestType | Target: $Target"

        

        if (-not (Test-Path $scriptFile)) {    Write-Info "Creado directorio de reportes: $OutputDir"

            Write-Error "No se encontró script K6 para tipo: $TestType"

            Write-Info "Archivos disponibles:"}# Crear directorio de reportes

            Get-ChildItem "tests/load" -Filter "*.js" | ForEach-Object { Write-Info "  - $($_.Name)" }

            exit 1if (-not (Test-Path $OutputDir)) {

        }

        # Instalar dependencias si se solicita    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

        Write-Warning "Script específico no encontrado, usando: $scriptFile"

    }if ($InstallDeps) {    Write-Info "Creado directorio de reportes: $OutputDir"

    

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"    Write-Info "Verificando instalación de K6..."}

    $reportFile = "$OutputDir/k6_${TestType}_${timestamp}.json"

    $summaryFile = "$OutputDir/k6_${TestType}_${timestamp}_summary.html"    if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {

    

    Write-Info "Ejecutando K6 ${TestType} test..."        Write-Warning "K6 no encontrado. Descarga desde: https://k6.io/docs/getting-started/installation/"# Instalar dependencias si se solicita

    Write-Info "Script: $scriptFile"

    Write-Info "Reporte: $reportFile"        Write-Warning "O instala con: winget install k6.k6"if ($InstallDeps) {

    

    # Variables de entorno para K6        exit 1    Write-Info "Instalando dependencias..."

    $env:BASE_URL = $Target

    $env:TEST_TYPE = $TestType    } else {    

    

    # Comando K6 básico        Write-Success "K6 ya está instalado"    if ($Tool -eq "artillery" -or $Tool -eq "both") {

    $k6Cmd = "k6 run `"$scriptFile`""

        }        Write-Info "Instalando Artillery..."

    # Agregar salida JSON si se requiere reporte

    if ($GenerateReport) {}        npm install -g artillery

        $k6Cmd += " --out json=`"$reportFile`""

    }        if ($LASTEXITCODE -ne 0) {

    

    Write-Info "Comando: $k6Cmd"# Verificar que el servicio objetivo está disponible            Write-Error "Error instalando Artillery"

    Invoke-Expression $k6Cmd

    Write-Info "Verificando conectividad con $Target..."            exit 1

    if ($LASTEXITCODE -eq 0) {

        Write-Success "Test K6 completado exitosamente"try {        }

        if ($GenerateReport -and (Test-Path $reportFile)) {

            Write-Success "Reporte JSON generado: $reportFile"    $response = Invoke-WebRequest -Uri "$Target/health" -Method GET -TimeoutSec 10    }

        }

    } else {    if ($response.StatusCode -eq 200) {    

        Write-Error "Test K6 falló con código de salida: $LASTEXITCODE"

        exit 1        Write-Success "Servicio disponible en $Target"    if ($Tool -eq "k6" -or $Tool -eq "both") {

    }

}    } else {        Write-Info "Instalando K6..."



# Ejecutar test K6        Write-Warning "Servicio responde con código: $($response.StatusCode)"        # Para Windows - descargar K6

try {

    $startTime = Get-Date    }        if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {

    

    Write-Info "Iniciando test de carga con K6..."} catch {            Write-Warning "K6 no encontrado. Descarga desde: https://k6.io/docs/getting-started/installation/"

    Invoke-K6Test -TestType $TestType -Target $Target -OutputDir $OutputDir

        Write-Error "No se puede conectar a $Target. ¿Está el servicio ejecutándose?"            Write-Warning "O instala con: winget install k6.k6"

    $endTime = Get-Date

    $duration = $endTime - $startTime    Write-Info "Intenta ejecutar: .\manage.ps1 start"            if ($Tool -eq "k6") {

    

    Write-Success "=== TEST COMPLETADO ==="    exit 1                exit 1

    Write-Info "Duración total: $($duration.ToString('hh\:mm\:ss'))"

    Write-Info "Reportes guardados en: $OutputDir"}            }

    

    # Mostrar archivos generados        }

    $reports = Get-ChildItem $OutputDir -Filter "*$(Get-Date -Format 'yyyyMMdd')*" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

    if ($reports) {# Función para ejecutar K6    }

        Write-Info "Archivos generados hoy:"

        $reports | ForEach-Object { Write-Info "  - $($_.Name)" }function Run-K6Test {}

    }

        param($TestType, $Target, $OutputDir)

} catch {

    Write-Error "Error durante la ejecución: $($_.Exception.Message)"    # Verificar que el servicio objetivo está disponible

    exit 1

}    $scriptFile = "tests/load/k6/${TestType}-test.js"Write-Info "Verificando conectividad con $Target..."



Write-Success "Load testing K6 completado exitosamente ✨"    if (-not (Test-Path $scriptFile)) {try {

        # Usar archivos .js existentes como fallback    $response = Invoke-WebRequest -Uri "$Target/health" -Method GET -TimeoutSec 10

        switch ($TestType) {    if ($response.StatusCode -eq 200) {

            "load" { $scriptFile = "tests/load/light-load-k6.js" }        Write-Success "Servicio disponible en $Target"

            "stress" { $scriptFile = "tests/load/stress-load.js" }    } else {

            "spike" { $scriptFile = "tests/load/medium-load-k6.js" }        Write-Warning "Servicio responde con código: $($response.StatusCode)"

            default { $scriptFile = "tests/load/light-load-k6.js" }    }

        }} catch {

            Write-Error "No se puede conectar a $Target. ¿Está el servicio ejecutándose?"

        if (-not (Test-Path $scriptFile)) {    Write-Info "Intenta ejecutar: .\manage.ps1 start"

            Write-Error "No se encontró script K6 para tipo: $TestType"    exit 1

            Write-Info "Archivos disponibles:"}

            Get-ChildItem "tests/load" -Filter "*.js" | ForEach-Object { Write-Info "  - $($_.Name)" }

            exit 1# Función para ejecutar Artillery

        }function Run-ArtilleryTest {

            param($TestType, $Target, $OutputDir)

        Write-Warning "Script específico no encontrado, usando: $scriptFile"    

    }    $configFile = "tests/load/artillery/${TestType}-test.yml"

        if (-not (Test-Path $configFile)) {

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"        $configFile = "tests/load/artillery/load-test-basic.yml"

    $reportFile = "$OutputDir/k6_${TestType}_${timestamp}.json"        Write-Warning "Archivo de configuración no encontrado, usando básico"

    $summaryFile = "$OutputDir/k6_${TestType}_${timestamp}_summary.html"    }

        

    Write-Info "Ejecutando K6 ${TestType} test..."    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

    Write-Info "Script: $scriptFile"    $reportFile = "$OutputDir/artillery_${TestType}_${timestamp}.json"

    Write-Info "Reporte: $reportFile"    $htmlReport = "$OutputDir/artillery_${TestType}_${timestamp}.html"

        

    # Variables de entorno para K6    Write-Info "Ejecutando Artillery ${TestType} test..."

    $env:BASE_URL = $Target    Write-Info "Configuración: $configFile"

        Write-Info "Reporte: $reportFile"

    # Comando K6    

    $k6Cmd = "k6 run `"$scriptFile`" --out json=`"$reportFile`""    # Comando Artillery con target override

        $artilleryCmd = "artillery run `"$configFile`" --target `"$Target`" --output `"$reportFile`""

    if ($GenerateReport) {    

        $k6Cmd += " --summary-export=`"$summaryFile`""    Write-Info "Comando: $artilleryCmd"

    }    Invoke-Expression $artilleryCmd

        

    Write-Info "Comando: $k6Cmd"    if ($LASTEXITCODE -eq 0 -and $GenerateReport) {

    Invoke-Expression $k6Cmd        Write-Info "Generando reporte HTML..."

            artillery report "$reportFile" --output "$htmlReport"

    if ($LASTEXITCODE -eq 0) {        Write-Success "Reporte HTML generado: $htmlReport"

        Write-Success "Test K6 completado exitosamente"        

        if (Test-Path $summaryFile) {        # Abrir reporte automáticamente

            Write-Success "Resumen exportado: $summaryFile"        Start-Process $htmlReport

        }    }

    } else {}

        Write-Error "Test K6 falló con código de salida: $LASTEXITCODE"

    }# Función para ejecutar K6

}function Run-K6Test {

    param($TestType, $Target, $OutputDir)

# Ejecutar test K6    

try {    $scriptFile = "tests/load/k6/${TestType}-test.js"

    $startTime = Get-Date    if (-not (Test-Path $scriptFile)) {

            $scriptFile = "tests/load/k6/load-test-basic.js"

    Write-Info "Ejecutando test de carga con K6..."        Write-Warning "Script no encontrado, usando básico"

    Run-K6Test -TestType $TestType -Target $Target -OutputDir $OutputDir    }

        

    $endTime = Get-Date    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

    $duration = $endTime - $startTime    $reportFile = "$OutputDir/k6_${TestType}_${timestamp}.json"

        $summaryFile = "$OutputDir/k6_${TestType}_${timestamp}_summary.html"

    Write-Success "=== TEST COMPLETADO ==="    

    Write-Info "Duración total: $($duration.ToString('hh\:mm\:ss'))"    Write-Info "Ejecutando K6 ${TestType} test..."

    Write-Info "Reportes guardados en: $OutputDir"    Write-Info "Script: $scriptFile"

        Write-Info "Reporte: $reportFile"

    # Mostrar archivos generados    

    $reports = Get-ChildItem $OutputDir -Filter "*$(Get-Date -Format 'yyyyMMdd')*" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending    # Variables de entorno para K6

    if ($reports) {    $env:BASE_URL = $Target

        Write-Info "Archivos generados:"    

        $reports | ForEach-Object { Write-Info "  - $($_.Name)" }    # Comando K6

    }    $k6Cmd = "k6 run `"$scriptFile`" --out json=`"$reportFile`""

        

} catch {    if ($GenerateReport) {

    Write-Error "Error durante la ejecución: $($_.Exception.Message)"        $k6Cmd += " --summary-export=`"$summaryFile`""

    exit 1    }

}    

    Write-Info "Comando: $k6Cmd"

Write-Success "Load testing K6 completado ✨"    Invoke-Expression $k6Cmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Test K6 completado exitosamente"
        if (Test-Path $summaryFile) {
            Write-Success "Resumen exportado: $summaryFile"
        }
    }
}

# Ejecutar tests según la herramienta seleccionada
try {
    $startTime = Get-Date
    
    if ($Tool -eq "artillery") {
        Run-ArtilleryTest -TestType $TestType -Target $Target -OutputDir $OutputDir
    }
    elseif ($Tool -eq "k6") {
        Run-K6Test -TestType $TestType -Target $Target -OutputDir $OutputDir
    }
    elseif ($Tool -eq "both") {
        Write-Info "Ejecutando con ambas herramientas..."
        Run-ArtilleryTest -TestType $TestType -Target $Target -OutputDir $OutputDir
        Start-Sleep -Seconds 30  # Pausa entre tests
        Run-K6Test -TestType $TestType -Target $Target -OutputDir $OutputDir
    }
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Success "=== TESTS COMPLETADOS ==="
    Write-Info "Duración total: $($duration.ToString('hh\:mm\:ss'))"
    Write-Info "Reportes guardados en: $OutputDir"
    
    # Mostrar archivos generados
    $reports = Get-ChildItem $OutputDir -Filter "*$(Get-Date -Format 'yyyyMMdd')*" | Sort-Object LastWriteTime -Descending
    if ($reports) {
        Write-Info "Archivos generados:"
        $reports | ForEach-Object { Write-Info "  - $($_.Name)" }
    }
    
} catch {
    Write-Error "Error durante la ejecución: $($_.Exception.Message)"
    exit 1
}

Write-Success "Load testing completado ✨"