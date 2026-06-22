#!/bin/bash
# Simple runner for macOS/Linux

set -e

echo "🏕️  Starting bettercamp..."
echo

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -f "Makefile" ]; then
    echo "Error: Please run from the bettercamp directory"
    exit 1
fi

# Ensure dependencies are installed
if [ ! -d ".venv" ]; then
    echo "Installing Python dependencies..."
    uv sync --all-packages
fi

if [ ! -d "web/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd web && npm install && cd ..
fi

echo
echo "Starting development servers..."
echo "  API: http://localhost:8000"
echo "  Web: http://localhost:5173"
echo
make dev
