# Docker Cleanup Script for accessibility-mw
# Cleans up Docker containers, images, volumes, and networks

Write-Host "🧹 Starting Docker cleanup for accessibility-mw..." -ForegroundColor Green

# Stop running containers
Write-Host "`n1️⃣ Stopping running containers..." -ForegroundColor Yellow
$containers = docker ps -q --filter "ancestor=accessibility-mw"
if ($containers) {
    docker stop $containers
    Write-Host "✅ Stopped containers: $containers" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No running accessibility-mw containers found" -ForegroundColor Blue
}

# Remove containers
Write-Host "`n2️⃣ Removing containers..." -ForegroundColor Yellow
$allContainers = docker ps -aq --filter "ancestor=accessibility-mw"
if ($allContainers) {
    docker rm $allContainers
    Write-Host "✅ Removed containers: $allContainers" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No accessibility-mw containers to remove" -ForegroundColor Blue
}

# Remove images
Write-Host "`n3️⃣ Removing images..." -ForegroundColor Yellow
$images = docker images accessibility-mw -q
if ($images) {
    docker rmi $images --force
    Write-Host "✅ Removed images: $images" -ForegroundColor Green
} else {
    Write-Host "ℹ️ No accessibility-mw images to remove" -ForegroundColor Blue
}

# Clean up dangling images and volumes
Write-Host "`n4️⃣ Cleaning up dangling resources..." -ForegroundColor Yellow
docker image prune -f
docker volume prune -f
Write-Host "✅ Cleaned up dangling images and volumes" -ForegroundColor Green

# Clean up build cache
Write-Host "`n5️⃣ Cleaning build cache..." -ForegroundColor Yellow
docker builder prune -f
Write-Host "✅ Cleaned build cache" -ForegroundColor Green

# Show disk usage
Write-Host "`n📊 Docker Disk Usage After Cleanup:" -ForegroundColor Cyan
docker system df

Write-Host "`n🎉 Docker cleanup completed!" -ForegroundColor Green
Write-Host "💡 To free up more space, run: docker system prune -a --volumes" -ForegroundColor Yellow
