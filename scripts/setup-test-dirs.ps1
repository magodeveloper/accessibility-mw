# Script para configurar directorios necesarios para tests
# Usado en desarrollo local y CI/CD
# PowerShell version

Write-Host "📁 Setting up test directories..." -ForegroundColor Cyan

# Crear directorios necesarios
$directories = @(
    ".achecker_cache",
    ".achecker_cache/engine",
    "tmp/test-data"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Exists: $dir" -ForegroundColor Gray
    }
}

Write-Host "✅ Test directories ready" -ForegroundColor Green
