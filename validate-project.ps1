# Complete Project Validation Script for accessibility-mw
# Runs all quality checks and validations

Write-Host "🔍 Starting complete project validation for accessibility-mw..." -ForegroundColor Green

$errors = 0
$warnings = 0

# 1. TypeScript Type Check
Write-Host "`n1️⃣ TypeScript Type Check:" -ForegroundColor Yellow
try {
    npm run type-check
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ TypeScript type check passed" -ForegroundColor Green
    } else {
        Write-Host "❌ TypeScript type check failed" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "❌ Failed to run TypeScript type check" -ForegroundColor Red
    $errors++
}

# 2. ESLint Check
Write-Host "`n2️⃣ ESLint Code Quality:" -ForegroundColor Yellow
try {
    npm run lint:check
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ ESLint check passed (no warnings/errors)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ ESLint found issues" -ForegroundColor Yellow
        $warnings++
    }
} catch {
    Write-Host "❌ Failed to run ESLint" -ForegroundColor Red
    $errors++
}

# 3. Build Check
Write-Host "`n3️⃣ Build Verification:" -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -eq 0 -and (Test-Path "dist")) {
        Write-Host "✅ Project builds successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Build failed or dist directory not created" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "❌ Failed to run build" -ForegroundColor Red
    $errors++
}

# 4. Unit Tests
Write-Host "`n4️⃣ Unit Tests:" -ForegroundColor Yellow
try {
    npm run test:unit
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All unit tests passed" -ForegroundColor Green
    } else {
        Write-Host "❌ Some unit tests failed" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "❌ Failed to run unit tests" -ForegroundColor Red
    $errors++
}

# 5. Security Audit
Write-Host "`n5️⃣ Security Audit:" -ForegroundColor Yellow
try {
    npm audit --audit-level=moderate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ No security vulnerabilities found" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Security vulnerabilities detected" -ForegroundColor Yellow
        $warnings++
    }
} catch {
    Write-Host "❌ Failed to run security audit" -ForegroundColor Red
    $errors++
}

# 6. File Structure Check
Write-Host "`n6️⃣ File Structure Validation:" -ForegroundColor Yellow
$duplicateJs = Get-ChildItem -Recurse tests -Filter "*.js" 2>$null
if ($duplicateJs.Count -eq 0) {
    Write-Host "✅ No duplicate JavaScript files in tests" -ForegroundColor Green
} else {
    Write-Host "⚠️ Found $($duplicateJs.Count) JavaScript files in tests (should be TypeScript only)" -ForegroundColor Yellow
    $warnings++
}

# 7. Bundle Size Analysis
Write-Host "`n7️⃣ Bundle Size Analysis:" -ForegroundColor Yellow
if (Test-Path "dist") {
    $distSize = Get-ChildItem -Recurse dist | Measure-Object -Property Length -Sum
    $distSizeMB = [math]::Round($distSize.Sum / 1MB, 2)
    if ($distSizeMB -lt 5) {
        Write-Host "✅ Bundle size is optimal: $distSizeMB MB" -ForegroundColor Green
    } elseif ($distSizeMB -lt 20) {
        Write-Host "⚠️ Bundle size is acceptable: $distSizeMB MB" -ForegroundColor Yellow
        $warnings++
    } else {
        Write-Host "❌ Bundle size is large: $distSizeMB MB" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "⚠️ dist directory not found, cannot analyze bundle size" -ForegroundColor Yellow
    $warnings++
}

# 8. Docker Build Test
Write-Host "`n8️⃣ Docker Build Test:" -ForegroundColor Yellow
try {
    Write-Host "Building Docker image (this may take a few minutes)..." -ForegroundColor Blue
    docker build -t accessibility-mw-validation:latest . -q
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker image builds successfully" -ForegroundColor Green
        # Clean up test image
        docker rmi accessibility-mw-validation:latest -f > $null 2>&1
    } else {
        Write-Host "❌ Docker build failed" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "❌ Failed to test Docker build" -ForegroundColor Red
    $errors++
}

# Final Report
Write-Host "`n📊 Validation Summary:" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "🎉 ALL CHECKS PASSED! Project is in excellent condition." -ForegroundColor Green
    $status = "EXCELLENT"
} elseif ($errors -eq 0) {
    Write-Host "✅ All critical checks passed. $warnings warning(s) detected." -ForegroundColor Yellow
    $status = "GOOD"
} else {
    Write-Host "❌ $errors error(s) and $warnings warning(s) detected. Action required." -ForegroundColor Red
    $status = "NEEDS ATTENTION"
}

Write-Host "Status: $status" -ForegroundColor $(if($status -eq "EXCELLENT"){"Green"}elseif($status -eq "GOOD"){"Yellow"}else{"Red"})
Write-Host "Errors: $errors" -ForegroundColor $(if($errors -eq 0){"Green"}else{"Red"})
Write-Host "Warnings: $warnings" -ForegroundColor $(if($warnings -eq 0){"Green"}else{"Yellow"})

if ($errors -gt 0) {
    exit 1
} else {
    exit 0
}
