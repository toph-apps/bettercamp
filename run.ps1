# Run bettercamp dev servers on Windows
# Run with: powershell -ExecutionPolicy Bypass -File run.ps1

Write-Host "Starting bettercamp..." -ForegroundColor Green
Write-Host

# Check if we're in the right directory
if (-not (Test-Path "README.md") -or -not (Test-Path "api")) {
    Write-Host "Error: Please run from the bettercamp directory" -ForegroundColor Red
    exit 1
}

# Ensure dependencies are installed
if (-not (Test-Path ".venv")) {
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    uv sync --all-packages
}

if (-not (Test-Path "web\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location web
    npm install
    Set-Location ..
}

Write-Host
Write-Host "Starting development servers..." -ForegroundColor Green
Write-Host "  API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Web: http://localhost:5173" -ForegroundColor Cyan
Write-Host

# Start API server in background
Write-Host "Starting FastAPI backend..." -ForegroundColor Yellow
$apiProcess = Start-Process -NoNewWindow -PassThru -ArgumentList "-c", "uv run --package bettercamp-api python -m api.main" powershell

# Give API time to start
Start-Sleep -Seconds 3

# Start web dev server in background
Write-Host "Starting Vite dev server..." -ForegroundColor Yellow
Set-Location web
$webProcess = Start-Process -NoNewWindow -PassThru -ArgumentList "-c", "npm run dev" powershell
Set-Location ..

# Give web server time to start
Start-Sleep -Seconds 3

# Open browser
Write-Host "Opening http://localhost:5173..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host
Write-Host "Servers running. Press Ctrl+C to stop." -ForegroundColor Green
Write-Host "  API logs: check FastAPI window" -ForegroundColor Gray
Write-Host "  Web logs: check npm/Vite window" -ForegroundColor Gray
Write-Host

# Wait for processes
Wait-Process -Id $apiProcess.Id, $webProcess.Id
