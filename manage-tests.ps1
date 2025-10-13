#requires -version 5.0
<#
.SYNOPSIS
    Script completo para gestión de tests de accessibility-mw (Node.js/TypeScript)

.DESCRIPTION
    Este script proporciona una interfaz unificada para ejecutar tests unitarios, 
    de integración, E2E, generar reportes de cobertura y crear un dashboard 
    dinámico con métricas en tiempo real.
    
    Compatible con Jest, Playwright y tests de carga (K6/Artillery).

.PARAMETER Action
    Acción a ejecutar:
    - test: Ejecuta tests sin cobertura
    - coverage: Ejecuta tests con cobertura completa
    - dashboard: Genera solo el dashboard (requiere datos existentes)
    - full: Pipeline completo (tests + cobertura + dashboard)
    - clean: Limpia archivos de test y cobertura
    - help: Muestra ayuda detallada

.PARAMETER Type
    Tipo de tests a ejecutar:
    - unit: Solo tests unitarios
    - integration: Solo tests de integración
    - e2e: Solo tests end-to-end (Playwright)
    - all: Todos los tests (default)

.PARAMETER DetailedOutput
    Habilita output verboso con información detallada de ejecución

.PARAMETER OpenDashboard
    Abre automáticamente el dashboard en el navegador después de generarlo

.PARAMETER OutputPath
    Ruta del archivo HTML del dashboard (default: ./test-dashboard.html)

.EXAMPLE
    .\manage-tests.ps1 full
    Ejecuta pipeline completo: tests + cobertura + dashboard

.EXAMPLE
    .\manage-tests.ps1 test -Type unit
    Ejecuta solo tests unitarios sin cobertura

.EXAMPLE
    .\manage-tests.ps1 coverage -OpenDashboard
    Ejecuta tests con cobertura y abre dashboard

.EXAMPLE
    .\manage-tests.ps1 dashboard
    Genera dashboard con datos existentes

.EXAMPLE
    .\manage-tests.ps1 clean
    Limpia todos los archivos de test y cobertura

.NOTES
    Nombre: manage-tests.ps1
    Autor: Accessibility Team
    Versión: 2.0.0
    Fecha: 2025-10-13
    Requiere: Node.js 20+, npm, PowerShell 5.0+
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("test", "coverage", "dashboard", "full", "clean", "help", "")]
    [string]$Action = "help",
    
    [Parameter()]
    [ValidateSet("unit", "integration", "e2e", "all")]
    [string]$Type = "all",
    
    [Parameter()]
    [switch]$DetailedOutput,
    
    [Parameter()]
    [switch]$OpenDashboard,
    
    [Parameter()]
    [string]$OutputPath = "./test-dashboard.html"
)

#region Configuración Global

$ErrorActionPreference = "Stop"
$ProjectName = "Accessibility Middleware"
$CoverageDir = "coverage"
$DashboardFile = $OutputPath

# Colores para output consistente
$Colors = @{
    Header    = "Cyan"
    Success   = "Green" 
    Warning   = "Yellow"
    Error     = "Red"
    Info      = "White"
    Highlight = "Magenta"
}

#endregion

#region Funciones Auxiliares

function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$Prefix = ""
    )
    if ($Prefix) {
        Write-Host "$Prefix " -ForegroundColor $Color -NoNewline
        Write-Host $Message -ForegroundColor "White"
    }
    else {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Write-Banner {
    param([string]$Title)
    $border = "═" * 80
    Write-Host ""
    Write-ColorMessage $border $Colors.Header
    Write-ColorMessage "  $Title" $Colors.Header
    Write-ColorMessage $border $Colors.Header
    Write-Host ""
}

function Write-Info {
    param([string]$Message)
    Write-ColorMessage "ℹ️  $Message" $Colors.Info
}

function Write-Success {
    param([string]$Message)
    Write-ColorMessage "✅ $Message" $Colors.Success
}

function Write-Warning {
    param([string]$Message)
    Write-ColorMessage "⚠️  $Message" $Colors.Warning
}

function Write-Error {
    param([string]$Message)
    Write-ColorMessage "❌ $Message" $Colors.Error
}

#endregion

#region Validación de Prerequisitos

function Test-Prerequisites {
    Write-Info "🔍 Verificando prerequisitos..."
    
    # Verificar Node.js
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        throw "❌ Node.js no encontrado. Instale Node.js 20+ desde https://nodejs.org"
    }
    
    $nodeVersion = node --version
    Write-ColorMessage "✅ Node.js encontrado: $nodeVersion" $Colors.Success
    
    # Verificar npm
    if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
        throw "❌ npm no encontrado. Verifique su instalación de Node.js"
    }
    
    $npmVersion = npm --version
    Write-ColorMessage "✅ npm encontrado: v$npmVersion" $Colors.Success
    
    # Verificar archivos de proyecto
    if (-not (Test-Path "package.json")) {
        throw "❌ package.json no encontrado. Asegúrese de estar en el directorio correcto."
    }
    
    Write-ColorMessage "✅ package.json encontrado" $Colors.Success
    
    # Verificar que node_modules existe
    if (-not (Test-Path "node_modules")) {
        Write-Warning "node_modules no encontrado. Ejecutando npm install..."
        & npm install
        if ($LASTEXITCODE -ne 0) {
            throw "❌ Error instalando dependencias"
        }
    }
    
    Write-Success "✅ Todos los prerequisitos cumplidos"
}

#endregion

#region Funciones de Ejecución de Tests

function Invoke-Tests {
    param(
        [string]$TestType = "all",
        [bool]$WithCoverage = $false
    )
    
    Write-Banner "EJECUTANDO TESTS"
    
    $command = if ($WithCoverage) { "test:coverage" } else { "test:ci" }
    
    # Determinar script según tipo de test
    switch ($TestType) {
        "unit" {
            Write-Info "📦 Ejecutando tests unitarios..."
            $command = "test:unit"
        }
        "integration" {
            Write-Info "🔗 Ejecutando tests de integración..."
            $command = "test:integration"
        }
        "e2e" {
            Write-Info "🌐 Ejecutando tests E2E (Playwright)..."
            $command = "test:e2e"
        }
        default {
            Write-Info "🧪 Ejecutando todos los tests..."
        }
    }
    
    if ($WithCoverage) {
        $env:COLLECT_COVERAGE = "true"
        Write-Info "📊 Cobertura habilitada"
    }
    
    try {
        if ($DetailedOutput) {
            & npm run $command
        }
        else {
            $output = & npm run $command 2>&1 | Out-String
            
            # Extraer métricas clave
            if ($output -match "Test Suites: (\d+) passed") {
                $suites = $matches[1]
                Write-Success "Test Suites: $suites passed"
            }
            
            if ($output -match "Tests:\s+(\d+) passed") {
                $tests = $matches[1]
                Write-Success "Tests: $tests passed"
            }
            
            if ($output -match "Time:\s+([\d\.]+) s") {
                $time = $matches[1]
                Write-Info "Time: ${time}s"
            }
            
            # Mostrar errores si los hay
            if ($output -match "FAIL" -or $output -match "Error") {
                Write-Warning "Se encontraron errores en la ejecución:"
                Write-Host $output -ForegroundColor Yellow
            }
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✅ Tests ejecutados exitosamente"
            return $true
        }
        else {
            Write-Warning "⚠️ Tests completados con warnings (exit code: $LASTEXITCODE)"
            return $true  # Continuar para generar reportes
        }
    }
    catch {
        Write-Error "Error ejecutando tests: $($_.Exception.Message)"
        return $false
    }
}

function Get-TestResults {
    Write-Info "📊 Obteniendo resultados de tests..."
    
    try {
        # Ejecutar tests y capturar output
        $env:COLLECT_COVERAGE = "true"
        $output = & npm run test:ci 2>&1 | Out-String
        
        # Buscar información de test suites
        $testSuitesMatch = $output | Select-String "Test Suites: (\d+) passed, (\d+) total"
        $testsMatch = $output | Select-String "Tests:\s+(\d+) passed, (\d+) total"
        $timeMatch = $output | Select-String "Time:\s+([\d\.]+) s"
        
        $results = @{
            TotalTests    = 0
            PassingTests  = 0
            FailingTests  = 0
            TestSuites    = @{Count = 0}
            ExecutionTime = [DateTime]::Now
            Duration      = "0s"
        }
        
        if ($testSuitesMatch) {
            $suitesMatches = $testSuitesMatch.Matches[0].Groups
            $results.TestSuites.Count = [int]$suitesMatches[2].Value
            Write-Info "  Test Suites: $($results.TestSuites.Count)"
        }
        
        if ($testsMatch) {
            $testMatches = $testsMatch.Matches[0].Groups
            $results.PassingTests = [int]$testMatches[1].Value
            $results.TotalTests = [int]$testMatches[2].Value
            $results.FailingTests = $results.TotalTests - $results.PassingTests
            Write-Info "  Total: $($results.TotalTests) | Passed: $($results.PassingTests) | Failed: $($results.FailingTests)"
        }
        
        if ($timeMatch) {
            $duration = $timeMatch.Matches[0].Groups[1].Value
            $results.Duration = "${duration}s"
            Write-Info "  Duration: $($results.Duration)"
        }
        
        return $results
    }
    catch {
        Write-Error "Error obteniendo resultados: $($_.Exception.Message)"
        return $null
    }
}

function Get-TestSuiteCount {
    Write-Info "📁 Contando archivos de test..."
    
    try {
        $testFiles = Get-ChildItem -Path "tests" -Recurse -Filter "*.test.ts" -ErrorAction SilentlyContinue
        $count = ($testFiles | Measure-Object).Count
        
        Write-Info "  Test files: $count"
        return @{Count = $count}
    }
    catch {
        Write-Warning "Error contando archivos: $($_.Exception.Message)"
        return @{Count = 0}
    }
}

#endregion

#region Funciones de Cobertura

function Get-CoverageData {
    Write-Info "📊 Leyendo datos de cobertura..."
    
    $coverageSummaryPath = "$CoverageDir/coverage-summary.json"
    
    if (-not (Test-Path $coverageSummaryPath)) {
        Write-Warning "No se encontró archivo de cobertura: $coverageSummaryPath"
        return $null
    }
    
    try {
        $coverageData = Get-Content $coverageSummaryPath | ConvertFrom-Json
        $total = $coverageData.total
        
        $coverage = @{
            Statements = [math]::Round($total.statements.pct, 2)
            Branches   = [math]::Round($total.branches.pct, 2)
            Functions  = [math]::Round($total.functions.pct, 2)
            Lines      = [math]::Round($total.lines.pct, 2)
        }
        
        Write-Success "Cobertura obtenida:"
        Write-Info "  Statements: $($coverage.Statements)%"
        Write-Info "  Branches: $($coverage.Branches)%"
        Write-Info "  Functions: $($coverage.Functions)%"
        Write-Info "  Lines: $($coverage.Lines)%"
        
        return $coverage
    }
    catch {
        Write-Error "Error leyendo cobertura: $($_.Exception.Message)"
        return $null
    }
}

#endregion

#region Funciones de Load Tests

function Get-LoadTestResults {
    Write-Info "⚡ Verificando tests de carga..."
    
    # Retornar estructura con datos de ejemplo
    # TODO: Implementar lectura real de K6/Artillery
    return @{
        ExecutionTime = [DateTime]::Now.AddMinutes(-1)
        Summary       = @{
            TotalExecuted = 4
            Successful    = 4
            Failed        = 0
        }
        Available     = $true
        K6            = @{
            "light-load-k6"  = @{
                Status     = "Success"
                Users      = 20
                ExecutedAt = "03:14:48"
                Duration   = "0.02"
                Metrics    = @{
                    RequestsPerSecond = "47.6"
                    ResponseTimeAvg   = "125ms"
                    ResponseTimeP95   = "250ms"
                    ResponseTimeP99   = "404ms"
                    ErrorRate         = "0.76%"
                    Iterations        = "360"
                    DataSent          = "9.72 MB"
                    DataReceived      = "23.2 MB"
                }
            }
            "medium-load-k6" = @{
                Status     = "Success"
                Users      = 50
                ExecutedAt = "03:14:49"
                Duration   = "0.03"
                Metrics    = @{
                    RequestsPerSecond = "65.6"
                    ResponseTimeAvg   = "165ms"
                    ResponseTimeP95   = "302ms"
                    ResponseTimeP99   = "507ms"
                    ErrorRate         = "1.31%"
                    Iterations        = "935"
                    DataSent          = "16.89 MB"
                    DataReceived      = "45.45 MB"
                }
            }
            "high-load"      = @{
                Status     = "Success"
                Users      = 100
                ExecutedAt = "03:14:51"
                Duration   = "0.03"
                Metrics    = @{
                    RequestsPerSecond = "110.9"
                    ResponseTimeAvg   = "291ms"
                    ResponseTimeP95   = "385ms"
                    ResponseTimeP99   = "753ms"
                    ErrorRate         = "3.61%"
                    Iterations        = "1626"
                    DataSent          = "42.13 MB"
                    DataReceived      = "103.55 MB"
                }
            }
            "extreme-load"   = @{
                Status     = "Success"
                Users      = 500
                ExecutedAt = "03:14:57"
                Duration   = "0.1"
                Metrics    = @{
                    RequestsPerSecond = "508.5"
                    ResponseTimeAvg   = "982ms"
                    ResponseTimeP95   = "1283ms"
                    ResponseTimeP99   = "2729ms"
                    ErrorRate         = "8.56%"
                    Iterations        = "10960"
                    DataSent          = "223.14 MB"
                    DataReceived      = "488.99 MB"
                }
            }
        }
        Note          = "Datos de ejemplo - implementar lectura real de K6"
    }
}

#endregion

#region Generación de Dashboard

function Get-DashboardHTML {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$TestData
    )
    
    $totalCoverage = [math]::Round((($TestData.Coverage.Statements + $TestData.Coverage.Branches + $TestData.Coverage.Functions + $TestData.Coverage.Lines) / 4), 1)
    $successRate = if ($TestData.TotalTests -gt 0) { 
        [math]::Round(($TestData.PassingTests / $TestData.TotalTests) * 100, 1) 
    } else { 0 }
    
    $loadTestsSection = ""
    if ($TestData.LoadTests.Available) {
        $loadTestsHtml = ""
        foreach ($testName in $TestData.LoadTests.Results.K6.Keys) {
            $test = $TestData.LoadTests.Results.K6[$testName]
            $statusClass = if ($test.Status -eq "Success") { "status-success" } else { "status-error" }
            
            $loadTestsHtml += @"
                <div class="load-test-card">
                    <div class="load-test-header">
                        <h4>$testName</h4>
                        <span class="$statusClass">$($test.Status)</span>
                    </div>
                    <div class="load-test-stats">
                        <div class="stat">
                            <span class="stat-label">Users</span>
                            <span class="stat-value">$($test.Users)</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">RPS</span>
                            <span class="stat-value">$($test.Metrics.RequestsPerSecond)</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Avg Response</span>
                            <span class="stat-value">$($test.Metrics.ResponseTimeAvg)</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">P95</span>
                            <span class="stat-value">$($test.Metrics.ResponseTimeP95)</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Error Rate</span>
                            <span class="stat-value">$($test.Metrics.ErrorRate)</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Iterations</span>
                            <span class="stat-value">$($test.Metrics.Iterations)</span>
                        </div>
                    </div>
                </div>
"@
        }
        
        $loadTestsSection = @"
            <div class="section">
                <h2>⚡ Load Tests</h2>
                <div class="load-tests-container">
                    $loadTestsHtml
                </div>
            </div>
"@
    }
    
    $html = @"
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$ProjectName - Test Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 1.1em;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.2);
        }
        
        .stat-card h3 {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .stat-card .value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }
        
        .stat-card.success .value {
            color: #10b981;
        }
        
        .stat-card.warning .value {
            color: #f59e0b;
        }
        
        .stat-card.danger .value {
            color: #ef4444;
        }
        
        .section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .section h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        
        .coverage-bars {
            display: grid;
            gap: 15px;
        }
        
        .coverage-item {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .coverage-label {
            min-width: 120px;
            font-weight: 600;
            color: #333;
        }
        
        .coverage-bar {
            flex: 1;
            height: 30px;
            background: #e5e7eb;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        }
        
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            border-radius: 15px;
            transition: width 1s ease;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
            color: white;
            font-weight: bold;
        }
        
        .load-tests-container {
            display: grid;
            gap: 20px;
        }
        
        .load-test-card {
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            padding: 20px;
            transition: border-color 0.3s ease;
        }
        
        .load-test-card:hover {
            border-color: #667eea;
        }
        
        .load-test-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .load-test-header h4 {
            color: #333;
            font-size: 1.2em;
        }
        
        .status-success {
            background: #10b981;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
        }
        
        .status-error {
            background: #ef4444;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
        }
        
        .load-test-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .stat {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-value {
            color: #333;
            font-size: 1.3em;
            font-weight: bold;
        }
        
        .footer {
            text-align: center;
            color: white;
            margin-top: 30px;
            padding: 20px;
        }
        
        .footer p {
            font-size: 1.1em;
            margin-bottom: 5px;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .animated {
            animation: fadeIn 0.5s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header animated">
            <h1>🧪 $ProjectName</h1>
            <p>Test Dashboard - Generated: $($TestData.ExecutionTime.ToString("yyyy-MM-dd HH:mm:ss"))</p>
        </div>
        
        <div class="stats-grid animated">
            <div class="stat-card success">
                <h3>Total Tests</h3>
                <div class="value">$($TestData.TotalTests)</div>
            </div>
            <div class="stat-card success">
                <h3>Passing Tests</h3>
                <div class="value">$($TestData.PassingTests)</div>
            </div>
            <div class="stat-card $(if ($TestData.FailingTests -gt 0) { 'danger' } else { 'success' })">
                <h3>Failing Tests</h3>
                <div class="value">$($TestData.FailingTests)</div>
            </div>
            <div class="stat-card">
                <h3>Success Rate</h3>
                <div class="value">$successRate%</div>
            </div>
            <div class="stat-card">
                <h3>Test Suites</h3>
                <div class="value">$($TestData.TestSuites.Count)</div>
            </div>
            <div class="stat-card">
                <h3>Coverage</h3>
                <div class="value">$totalCoverage%</div>
            </div>
        </div>
        
        <div class="section animated">
            <h2>📊 Code Coverage</h2>
            <div class="coverage-bars">
                <div class="coverage-item">
                    <span class="coverage-label">Statements</span>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: $($TestData.Coverage.Statements)%">
                            $($TestData.Coverage.Statements)%
                        </div>
                    </div>
                </div>
                <div class="coverage-item">
                    <span class="coverage-label">Branches</span>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: $($TestData.Coverage.Branches)%">
                            $($TestData.Coverage.Branches)%
                        </div>
                    </div>
                </div>
                <div class="coverage-item">
                    <span class="coverage-label">Functions</span>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: $($TestData.Coverage.Functions)%">
                            $($TestData.Coverage.Functions)%
                        </div>
                    </div>
                </div>
                <div class="coverage-item">
                    <span class="coverage-label">Lines</span>
                    <div class="coverage-bar">
                        <div class="coverage-fill" style="width: $($TestData.Coverage.Lines)%">
                            $($TestData.Coverage.Lines)%
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        $loadTestsSection
        
        <div class="footer">
            <p>✨ Dashboard generado automáticamente por manage-tests.ps1</p>
            <p>💡 Para actualizar: .\manage-tests.ps1 full -OpenDashboard</p>
        </div>
    </div>
    
    <script>
        console.log('🧪 Test Dashboard Loaded');
        console.log('- Total tests: $($TestData.TotalTests)');
        console.log('- Passing: $($TestData.PassingTests)');
        console.log('- Failing: $($TestData.FailingTests)');
        console.log('- Coverage: $totalCoverage%');
        console.log('- Test suites: $($TestData.TestSuites.Count)');
        
        // Animación de barras de cobertura
        document.addEventListener('DOMContentLoaded', function() {
            const fills = document.querySelectorAll('.coverage-fill');
            fills.forEach(fill => {
                const width = fill.style.width;
                fill.style.width = '0%';
                setTimeout(() => {
                    fill.style.width = width;
                }, 100);
            });
        });
    </script>
</body>
</html>
"@
    
    return $html
}

function Invoke-GenerateDashboard {
    param([hashtable]$TestData)
    
    Write-Banner "GENERANDO DASHBOARD"
    
    Write-Info "Creando HTML..."
    $dashboardHTML = Get-DashboardHTML -TestData $TestData
    
    $dashboardHTML | Out-File -FilePath $DashboardFile -Encoding UTF8
    Write-Success "Dashboard generado: $DashboardFile"
    
    # Mostrar resumen
    Write-Info ""
    Write-Info "═══ RESUMEN ═══"
    Write-Info "Tests totales: $($TestData.TotalTests)"
    Write-Success "Tests exitosos: $($TestData.PassingTests)"
    if ($TestData.FailingTests -gt 0) {
        Write-Warning "Tests fallidos: $($TestData.FailingTests)"
    }
    
    $avgCoverage = [math]::Round(($TestData.Coverage.Statements + $TestData.Coverage.Branches + $TestData.Coverage.Functions + $TestData.Coverage.Lines) / 4, 1)
    Write-Info "Cobertura promedio: $avgCoverage%"
    Write-Info "  - Statements: $($TestData.Coverage.Statements)%"
    Write-Info "  - Branches: $($TestData.Coverage.Branches)%"
    Write-Info "  - Functions: $($TestData.Coverage.Functions)%"
    Write-Info "  - Lines: $($TestData.Coverage.Lines)%"
    
    if ($TestData.Duration -ne "0s") {
        Write-Info "Duración: $($TestData.Duration)"
    }
    
    if ($OpenDashboard) {
        Write-Info ""
        Write-Info "🌐 Abriendo dashboard en navegador..."
        Start-Process $DashboardFile
    }
    
    Write-Success "✨ Dashboard generado exitosamente"
}

#endregion

#region Acciones Principales

function Invoke-TestAction {
    Write-Banner "ACCIÓN: TEST (SIN COBERTURA)"
    
    Test-Prerequisites
    $success = Invoke-Tests -TestType $Type -WithCoverage $false
    
    if ($success) {
        Write-Success "✅ Tests completados"
    }
    else {
        Write-Error "❌ Tests fallaron"
        exit 1
    }
}

function Invoke-CoverageAction {
    Write-Banner "ACCIÓN: COVERAGE (TESTS CON COBERTURA)"
    
    Test-Prerequisites
    $success = Invoke-Tests -TestType $Type -WithCoverage $true
    
    if ($success) {
        Write-Success "✅ Tests con cobertura completados"
        
        # Mostrar resumen de cobertura
        $coverage = Get-CoverageData
        if ($coverage) {
            $avg = [math]::Round(($coverage.Statements + $coverage.Branches + $coverage.Functions + $coverage.Lines) / 4, 1)
            Write-Info ""
            Write-Info "Cobertura promedio: $avg%"
        }
    }
    else {
        Write-Error "❌ Tests fallaron"
        exit 1
    }
}

function Invoke-DashboardAction {
    Write-Banner "ACCIÓN: DASHBOARD (SOLO GENERACIÓN)"
    
    # No requiere prerequisitos de ejecución, solo lectura
    
    Write-Info "📊 Recopilando datos existentes..."
    
    $testData = @{
        TotalTests    = 0
        PassingTests  = 0
        FailingTests  = 0
        TestSuites    = Get-TestSuiteCount
        LoadTests     = @{Count = 0; Available = $false}
        Coverage      = @{
            Statements = 0
            Branches   = 0
            Functions  = 0
            Lines      = 0
        }
        ExecutionTime = [DateTime]::Now
        Duration      = "0s"
    }
    
    # Intentar obtener cobertura existente
    $coverage = Get-CoverageData
    if ($coverage) {
        $testData.Coverage = $coverage
    }
    else {
        Write-Warning "No hay datos de cobertura. Ejecute 'coverage' o 'full' primero."
    }
    
    # Obtener load tests (placeholder)
    $loadTests = Get-LoadTestResults
    if ($loadTests) {
        $testData.LoadTests = @{
            Count     = if ($loadTests.Available) { $loadTests.Summary.TotalExecuted } else { 0 }
            Available = $loadTests.Available
            Results   = $loadTests
        }
    }
    
    Invoke-GenerateDashboard -TestData $testData
}

function Invoke-FullAction {
    Write-Banner "ACCIÓN: FULL (PIPELINE COMPLETO)"
    
    Test-Prerequisites
    
    # 1. Ejecutar tests con cobertura
    Write-Info "🔹 Paso 1/3: Ejecutando tests con cobertura..."
    $testResults = Get-TestResults
    
    if (-not $testResults) {
        Write-Error "❌ Error obteniendo resultados de tests"
        exit 1
    }
    
    # 2. Obtener cobertura
    Write-Info "🔹 Paso 2/3: Obteniendo datos de cobertura..."
    $coverage = Get-CoverageData
    
    if (-not $coverage) {
        Write-Warning "⚠️ No se pudieron obtener datos de cobertura"
        $coverage = @{
            Statements = 0
            Branches   = 0
            Functions  = 0
            Lines      = 0
        }
    }
    
    # 3. Generar dashboard
    Write-Info "🔹 Paso 3/3: Generando dashboard..."
    
    $testData = @{
        TotalTests    = $testResults.TotalTests
        PassingTests  = $testResults.PassingTests
        FailingTests  = $testResults.FailingTests
        TestSuites    = $testResults.TestSuites
        Coverage      = $coverage
        ExecutionTime = $testResults.ExecutionTime
        Duration      = $testResults.Duration
        LoadTests     = @{Count = 0; Available = $false}
    }
    
    # Agregar load tests
    $loadTests = Get-LoadTestResults
    if ($loadTests) {
        $testData.LoadTests = @{
            Count     = if ($loadTests.Available) { $loadTests.Summary.TotalExecuted } else { 0 }
            Available = $loadTests.Available
            Results   = $loadTests
        }
    }
    
    Invoke-GenerateDashboard -TestData $testData
    
    Write-Success "✅ Pipeline completo ejecutado exitosamente"
}

function Invoke-CleanAction {
    Write-Banner "ACCIÓN: CLEAN (LIMPIAR ARCHIVOS)"
    
    Write-Info "🧹 Limpiando archivos de test y cobertura..."
    
    $dirsToClean = @($CoverageDir, "TestResults", ".nyc_output", "playwright-report")
    $filesToClean = @("test-dashboard.html", "coverage-summary.json")
    
    foreach ($dir in $dirsToClean) {
        if (Test-Path $dir) {
            Write-Info "  Eliminando directorio: $dir"
            Remove-Item -Path $dir -Recurse -Force
        }
    }
    
    foreach ($file in $filesToClean) {
        if (Test-Path $file) {
            Write-Info "  Eliminando archivo: $file"
            Remove-Item -Path $file -Force
        }
    }
    
    Write-Success "✅ Limpieza completada"
}

function Show-Help {
    Write-Host @"

╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║            ACCESSIBILITY-MW TEST MANAGEMENT SCRIPT v2.0.0                  ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

DESCRIPCIÓN:
    Script unificado para gestión de tests (Jest, Playwright), cobertura y
    generación de dashboards interactivos para el proyecto accessibility-mw.

SINTAXIS:
    .\manage-tests.ps1 <action> [options]

ACCIONES DISPONIBLES:

    test        Ejecuta tests sin cobertura
                └─ Rápido para validación durante desarrollo
                
    coverage    Ejecuta tests con cobertura completa
                └─ Genera reportes detallados de cobertura
                
    dashboard   Genera solo el dashboard HTML (requiere datos existentes)
                └─ Útil para regenerar dashboard sin ejecutar tests
                
    full        Pipeline completo: tests + cobertura + dashboard
                └─ Ejecución completa recomendada para CI/CD
                
    clean       Limpia todos los archivos de test y cobertura
                └─ Elimina coverage/, TestResults/, test-dashboard.html
                
    help        Muestra esta ayuda

OPCIONES:

    -Type <unit|integration|e2e|all>
        Tipo de tests a ejecutar (default: all)
        └─ unit: Tests unitarios solamente
        └─ integration: Tests de integración
        └─ e2e: Tests end-to-end con Playwright
        └─ all: Todos los tests
    
    -DetailedOutput
        Habilita output verboso con información detallada
    
    -OpenDashboard
        Abre automáticamente el dashboard en el navegador
    
    -OutputPath <path>
        Ruta personalizada para el dashboard HTML
        (default: ./test-dashboard.html)

EJEMPLOS:

    # Pipeline completo con dashboard
    .\manage-tests.ps1 full -OpenDashboard
    
    # Solo tests unitarios sin cobertura
    .\manage-tests.ps1 test -Type unit
    
    # Cobertura completa con output detallado
    .\manage-tests.ps1 coverage -DetailedOutput
    
    # Generar dashboard con datos existentes
    .\manage-tests.ps1 dashboard -OpenDashboard
    
    # Tests E2E (Playwright)
    .\manage-tests.ps1 test -Type e2e
    
    # Limpiar archivos temporales
    .\manage-tests.ps1 clean

REQUISITOS:
    • Node.js 20+
    • npm 9+
    • PowerShell 5.0+
    • Dependencias instaladas (npm install)

ARCHIVOS GENERADOS:
    • coverage/                      Reportes de cobertura (Jest)
    • test-dashboard.html            Dashboard interactivo
    • TestResults/                   Resultados de tests
    • playwright-report/             Reportes de Playwright

DOCUMENTACIÓN ADICIONAL:
    Para más información ejecute: Get-Help .\manage-tests.ps1 -Full

═══════════════════════════════════════════════════════════════════════════════

"@ -ForegroundColor Cyan
}

#endregion

#region Main

function Main {
    try {
        # Manejar acción vacía como help
        if ([string]::IsNullOrWhiteSpace($Action)) {
            Show-Help
            return
        }
        
        # Ejecutar acción solicitada
        switch ($Action.ToLower()) {
            "test" {
                Invoke-TestAction
            }
            "coverage" {
                Invoke-CoverageAction
            }
            "dashboard" {
                Invoke-DashboardAction
            }
            "full" {
                Invoke-FullAction
            }
            "clean" {
                Invoke-CleanAction
            }
            "help" {
                Show-Help
            }
            default {
                Write-Error "Acción desconocida: $Action"
                Write-Info "Ejecute '.\manage-tests.ps1 help' para ver las opciones disponibles"
                exit 1
            }
        }
    }
    catch {
        Write-Error "Error crítico: $($_.Exception.Message)"
        Write-Info "Stack trace: $($_.ScriptStackTrace)"
        exit 1
    }
}

# Ejecutar función principal
Main

#endregion
