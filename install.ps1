# bettercamp installer for Windows
# Run with: powershell -ExecutionPolicy Bypass -File install.ps1

Write-Host "bettercamp installer (Windows)" -ForegroundColor Green
Write-Host

function Test-Command {
    param([string]$Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            Write-Host "[OK] $Command found" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "[MISSING] $Command not found" -ForegroundColor Yellow
        return $false
    }
}

function Install-UV {
    Write-Host "Installing uv..."
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri https://astral.sh/uv/install.ps1 -OutFile $env:TEMP\uv-install.ps1
    & $env:TEMP\uv-install.ps1
    $env:Path += ";$env:APPDATA\Python\Scripts"
}

function Install-Node {
    Write-Host "Installing Node.js via winget..."
    try {
        winget install -e --id OpenJS.NodeJS
    } catch {
        Write-Host "Please install Node.js from https://nodejs.org/ (v18+)" -ForegroundColor Yellow
        exit 1
    }
}

# Check Python
Write-Host "Checking Python..."
if (Test-Command python) {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "Python 3.12+ not found" -ForegroundColor Red
    Write-Host "Please install from https://www.python.org/" -ForegroundColor Yellow
    exit 1
}

# Check uv
Write-Host
Write-Host "Checking uv (Python package manager)..."
if (-not (Test-Command uv)) {
    $response = Read-Host "Install uv? (y/n)"
    if ($response -eq 'y') {
        Install-UV
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Host "uv is required. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Check Node
Write-Host
Write-Host "Checking Node.js..."
if (-not (Test-Command node)) {
    $response = Read-Host "Install Node.js? (y/n)"
    if ($response -eq 'y') {
        Install-Node
        # Refresh PATH after winget install
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Host "Node.js is required. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Check npm
Write-Host "Checking npm..."
Test-Command npm | Out-Null

# Check Docker (optional)
Write-Host
Write-Host "Checking Docker (optional, needed for driving distance)..."
if (-not (Test-Command docker)) {
    Write-Host "Docker not found" -ForegroundColor Yellow
    $response = Read-Host "Install Docker? (y/n)"
    if ($response -eq 'y') {
        Write-Host "Please install Docker Desktop from https://www.docker.com/" -ForegroundColor Yellow
    }
}

# Clone repo if needed
Write-Host
if (-not (Test-Path "README.md") -or -not (Test-Path "api")) {
    Write-Host "Cloning bettercamp..."
    git clone https://github.com/toph-apps/bettercamp.git
    Set-Location bettercamp
}

# Install dependencies
Write-Host
Write-Host "Installing Python dependencies..."
uv sync --all-packages

Write-Host
Write-Host "Installing frontend dependencies..."
Set-Location web
npm install
Set-Location ..

Write-Host
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host
Write-Host "Next steps:"
Write-Host "  1. Start the app:"
Write-Host "     .\run.ps1"
Write-Host
Write-Host "  2. (Optional) Enable driving distance:"
Write-Host "     docker compose up -d osrm"
Write-Host "     .\osrm-build.ps1    # one-time, ~15 min"
Write-Host
Write-Host "App will open at http://localhost:5173"
