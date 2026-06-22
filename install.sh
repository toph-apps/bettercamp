#!/bin/bash
set -e

echo "🏕️  bettercamp installer"
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 found"
        return 0
    else
        echo -e "${YELLOW}✗${NC} $1 not found"
        return 1
    fi
}

install_uv() {
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source $HOME/.cargo/env 2>/dev/null || true
}

install_node() {
    echo "Installing Node.js..."
    if command -v brew &> /dev/null; then
        brew install node
    else
        echo "Please install Node.js from https://nodejs.org/ (v18+)"
        exit 1
    fi
}

install_docker() {
    echo "Docker not found. Please install from https://www.docker.com/"
    echo "Docker is optional but needed for driving distance calculations."
}

# Check Python 3.12+
echo "Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}✗${NC} Python 3 not found"
    echo "Please install Python 3.12+ from https://www.python.org/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | awk '{print $2}')
echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION"

# Check uv
echo
echo "Checking uv (Python package manager)..."
if ! check_command uv; then
    read -p "Install uv? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_uv
    else
        echo "uv is required. Exiting."
        exit 1
    fi
fi

# Check Node
echo
echo "Checking Node.js..."
if ! check_command node; then
    read -p "Install Node.js? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_node
    else
        echo "Node.js is required. Exiting."
        exit 1
    fi
fi

# Check npm
echo "Checking npm..."
check_command npm

# Check Docker (optional)
echo
echo "Checking Docker (optional, needed for driving distance)..."
if ! check_command docker; then
    echo -e "${YELLOW}ℹ${NC} Docker not found"
    read -p "Install Docker? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_docker
    fi
fi

# Clone repo if not already in it
echo
if [ ! -f "README.md" ] || [ ! -d "api" ]; then
    echo "Cloning bettercamp..."
    git clone https://github.com/toph-apps/bettercamp.git
    cd bettercamp
fi

# Install dependencies
echo
echo "Installing Python dependencies..."
uv sync --all-packages

echo
echo "Installing frontend dependencies..."
cd web && npm install && cd ..

echo
echo -e "${GREEN}✓ Installation complete!${NC}"
echo
echo "Next steps:"
echo "  1. Start the app:"
echo "     make dev"
echo
echo "  2. (Optional) Enable driving distance:"
echo "     make osrm-build    # one-time, ~15 min"
echo "     make osrm-up       # start OSRM service"
echo
echo "Then run 'make dev' again in another terminal."
echo
echo "App will open at http://localhost:5173"
