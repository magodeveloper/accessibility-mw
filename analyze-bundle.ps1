# Bundle Size Analysis Script for accessibility-mw
# Analyzes the compiled TypeScript bundle and dependencies

Write-Host "📦 Analyzing bundle size for accessibility-mw..." -ForegroundColor Green

# Check if dist directory exists
if (-not (Test-Path "dist")) {
    Write-Host "❌ dist/ directory not found. Building project first..." -ForegroundColor Red
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed. Cannot analyze bundle." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n📊 Bundle Size Analysis:" -ForegroundColor Cyan

# Overall dist size
Write-Host "`n1️⃣ Overall Bundle Size:" -ForegroundColor Yellow
$distSize = Get-ChildItem -Recurse dist | Measure-Object -Property Length -Sum
$distSizeMB = [math]::Round($distSize.Sum / 1MB, 2)
Write-Host "📁 Total dist/ size: $distSizeMB MB" -ForegroundColor White

# Top largest files
Write-Host "`n2️⃣ Largest Files in Bundle:" -ForegroundColor Yellow
Get-ChildItem -Recurse dist -File | 
    Sort-Object Length -Descending | 
    Select-Object -First 10 | 
    ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $relativePath = $_.FullName.Replace((Get-Location).Path, "").Replace("\", "/")
        Write-Host "  📄 $relativePath - $sizeMB MB" -ForegroundColor White
    }

# JavaScript files analysis
Write-Host "`n3️⃣ JavaScript Files Analysis:" -ForegroundColor Yellow
$jsFiles = Get-ChildItem -Recurse dist -Filter "*.js"
$jsTotalSize = ($jsFiles | Measure-Object -Property Length -Sum).Sum
$jsTotalSizeMB = [math]::Round($jsTotalSize / 1MB, 2)
Write-Host "  📈 Total JS size: $jsTotalSizeMB MB ($($jsFiles.Count) files)" -ForegroundColor White

# Source maps analysis
Write-Host "`n4️⃣ Source Maps Analysis:" -ForegroundColor Yellow
$mapFiles = Get-ChildItem -Recurse dist -Filter "*.map"
if ($mapFiles.Count -gt 0) {
    $mapTotalSize = ($mapFiles | Measure-Object -Property Length -Sum).Sum
    $mapTotalSizeMB = [math]::Round($mapTotalSize / 1MB, 2)
    Write-Host "  🗺️ Total source maps: $mapTotalSizeMB MB ($($mapFiles.Count) files)" -ForegroundColor White
} else {
    Write-Host "  ℹ️ No source maps found (production build)" -ForegroundColor Blue
}

# Node modules analysis
Write-Host "`n5️⃣ Dependencies Analysis:" -ForegroundColor Yellow
if (Test-Path "node_modules") {
    $nodeModulesSize = Get-ChildItem -Recurse node_modules | Measure-Object -Property Length -Sum
    $nodeModulesSizeMB = [math]::Round($nodeModulesSize.Sum / 1MB, 2)
    Write-Host "  📚 node_modules size: $nodeModulesSizeMB MB" -ForegroundColor White
    
    # Production only dependencies
    Write-Host "`n  📋 Production Dependencies:" -ForegroundColor Cyan
    $packageJson = Get-Content package.json | ConvertFrom-Json
    $prodDeps = $packageJson.dependencies.PSObject.Properties
    Write-Host "    Total production dependencies: $($prodDeps.Count)" -ForegroundColor White
    
    $heavyDeps = @("playwright", "accessibility-checker", "axe-core", "express", "pino")
    foreach ($dep in $heavyDeps) {
        if ($prodDeps.Name -contains $dep) {
            Write-Host "    🔧 $dep - $($prodDeps | Where-Object Name -eq $dep | ForEach-Object Value)" -ForegroundColor White
        }
    }
}

# Recommendations
Write-Host "`n💡 Optimization Recommendations:" -ForegroundColor Green
Write-Host "  • Consider enabling source maps only for development builds" -ForegroundColor Yellow
Write-Host "  • Review dependencies for unused packages" -ForegroundColor Yellow
Write-Host "  • Implement code splitting for larger modules" -ForegroundColor Yellow

if ($distSizeMB -gt 50) {
    Write-Host "  ⚠️ Bundle size is large (>50MB). Consider optimization." -ForegroundColor Red
} elseif ($distSizeMB -gt 20) {
    Write-Host "  ⚠️ Bundle size is moderate ($distSizeMB MB). Monitor growth." -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Bundle size is reasonable ($distSizeMB MB)." -ForegroundColor Green
}

Write-Host "`n🎉 Bundle analysis completed!" -ForegroundColor Green
