#!/usr/bin/env pwsh
# Script para ejecutar tests de carga con K6
# Uso: .\run-k6-tests.ps1 -TestType [load|stress|spike] -Target [url]

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("load", "stress", "spike")]
  [string]$TestType,

  [Parameter(Mandatory = $false)]
  [string]$Target = "http://localhost:3001",

  [Parameter(Mandatory = $false)]
  [switch]$InstallDeps,

  [Parameter(Mandatory = $false)]
  [switch]$GenerateReport,

  [Parameter(Mandatory = $false)]
  [string]$OutputDir = "./test-reports/load"
)

$ErrorActionPreference = "Stop"

function Write-Info($message) { Write-Host "ℹ️  $message" -ForegroundColor Cyan }
function Write-Success($message) { Write-Host "✅ $message" -ForegroundColor Green }
function Write-Warning($message) { Write-Host "⚠️  $message" -ForegroundColor Yellow }
function Write-Error($message) { Write-Host "❌ $message" -ForegroundColor Red }

Write-Info "=== ACCESSIBILITY-MW K6 LOAD TESTING ==="
Write-Info "Test Type: $TestType | Target: $Target"

# Crear directorio de reportes
if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
  Write-Info "Creado directorio de reportes: $OutputDir"
}

# Verificar K6
if ($InstallDeps) {
  if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
    Write-Warning "K6 no encontrado. Instalar desde: https://k6.io/docs/getting-started/installation/"
    exit 1
  }
  else {
    Write-Success "K6 disponible"
  }
}

# Verificar servicio
Write-Info "Verificando $Target..."
try {
  $response = Invoke-WebRequest -Uri "$Target/health" -Method GET -TimeoutSec 10
  if ($response.StatusCode -eq 200) {
    Write-Success "Servicio disponible"
  }
}
catch {
  Write-Error "Servicio no disponible en $Target"
  exit 1
}

# Seleccionar script
$scriptFile = switch ($TestType) {
  "load" { "tests/load/light-load-k6.js" }
  "stress" { "tests/load/stress-load.js" }
  "spike" { "tests/load/medium-load-k6.js" }
  default { "tests/load/light-load-k6.js" }
}

if (-not (Test-Path $scriptFile)) {
  Write-Error "Script no encontrado: $scriptFile"
  exit 1
}

# Ejecutar K6
$env:BASE_URL = $Target
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportFile = "$OutputDir/k6_${TestType}_${timestamp}.json"

Write-Info "Ejecutando K6 test: $scriptFile"

if ($GenerateReport) {
  k6 run "$scriptFile" --out "json=$reportFile"
}
else {
  k6 run "$scriptFile"
}

if ($LASTEXITCODE -eq 0) {
  Write-Success "Test completado exitosamente"
  if ($GenerateReport) {
    Write-Info "Reporte: $reportFile"
  }
}
else {
  Write-Error "Test falló"
  exit 1
}