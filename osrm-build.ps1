# Build OSRM routing graph for Windows
# Requires Docker to be installed and running
# Run with: powershell -ExecutionPolicy Bypass -File osrm-build.ps1

Write-Host "🏕️  Building OSRM routing graph..." -ForegroundColor Green
Write-Host

# Check if docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
} catch {
    Write-Host "Error: Docker is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Docker is running" -ForegroundColor Green
Write-Host

# Check if extract directory exists
if (-not (Test-Path "osrm\extract")) {
    New-Item -ItemType Directory -Path "osrm\extract" -Force | Out-Null
}

Write-Host "This will download ~700 MB of data and take 10-15 minutes..." -ForegroundColor Cyan
Write-Host

# Run the build
Write-Host "Downloading Quebec OSM extract..." -ForegroundColor Yellow
docker run --rm -v "$PWD\osrm\extract:/data" ghcr.io/project-osrm/osrm-backend:v5.27.1 osrm-extract -p /usr/local/etc/osrm/profiles/car.lua /data/quebec-latest.osm.pbf

Write-Host
Write-Host "Building OSRM graph..." -ForegroundColor Yellow
docker run --rm -v "$PWD\osrm\extract:/data" ghcr.io/project-osrm/osrm-backend:v5.27.1 osrm-partition /data/quebec-latest.osrm

docker run --rm -v "$PWD\osrm\extract:/data" ghcr.io/project-osrm/osrm-backend:v5.27.1 osrm-customize /data/quebec-latest.osrm

Write-Host
Write-Host "✓ OSRM graph ready!" -ForegroundColor Green
Write-Host
Write-Host "Next: Start OSRM service with"
Write-Host "  docker compose up -d osrm" -ForegroundColor Cyan
Write-Host
Write-Host "Then run the app:"
Write-Host "  .\run.ps1" -ForegroundColor Cyan
