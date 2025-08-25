# Docker Build Script for accessibility-mw
# Usage: .\docker-build.ps1 [dev|prod|test]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "prod", "test")]
    [string]$Environment = "prod"
)

Write-Host "🐳 Building Docker image for environment: $Environment" -ForegroundColor Green

switch ($Environment) {
    "dev" {
        Write-Host "Building development image..." -ForegroundColor Yellow
        docker build -t accessibility-mw:dev -f Dockerfile .
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Development image built successfully: accessibility-mw:dev" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to build development image" -ForegroundColor Red
            exit 1
        }
    }
    "prod" {
        Write-Host "Building production image..." -ForegroundColor Yellow
        docker build -t accessibility-mw:prod -t accessibility-mw:latest -f Dockerfile .
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Production image built successfully: accessibility-mw:prod" -ForegroundColor Green
            Write-Host "✅ Latest tag updated: accessibility-mw:latest" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to build production image" -ForegroundColor Red
            exit 1
        }
    }
    "test" {
        Write-Host "Building test image..." -ForegroundColor Yellow
        docker build -t accessibility-mw:test -f Dockerfile .
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Test image built successfully: accessibility-mw:test" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to build test image" -ForegroundColor Red
            exit 1
        }
    }
}

# Show image info
Write-Host "`n📊 Image Information:" -ForegroundColor Cyan
docker images accessibility-mw --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

Write-Host "`n🎉 Docker build completed for environment: $Environment" -ForegroundColor Green
