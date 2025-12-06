#!/bin/bash
# =============================================================================
# ChatOS Trading Platform - Mac Launch Script
# =============================================================================
# This script starts both the Python backend and Next.js UI for development.
#
# Prerequisites:
#   - Node.js 18+ (install via: brew install node)
#   - Python 3.9+ (install via: brew install python3)
#   - Ollama (optional, for AI features: brew install ollama)
#
# Usage:
#   ./run-mac.sh              # Start both backend and UI
#   ./run-mac.sh --ui-only    # Start only the Next.js UI
#   ./run-mac.sh --api-only   # Start only the Python backend
#   ./run-mac.sh --with-ollama # Start Ollama + backend + UI
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
BACKEND_PORT=8000
UI_PORT=3000
OLLAMA_URL="http://localhost:11434"

# Parse arguments
START_UI=true
START_API=true
START_OLLAMA=false

for arg in "$@"; do
    case $arg in
        --ui-only)
            START_API=false
            ;;
        --api-only)
            START_UI=false
            ;;
        --with-ollama)
            START_OLLAMA=true
            ;;
        --help)
            echo "Usage: ./run-mac.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --ui-only      Start only the Next.js UI"
            echo "  --api-only     Start only the Python backend"
            echo "  --with-ollama  Start Ollama before launching services"
            echo "  --help         Show this help message"
            exit 0
            ;;
    esac
done

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║           ChatOS Trading Platform - Mac Launcher                 ║"
    echo "║         Live Trading • Paper Trading • AI Analysis               ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}▶ Checking prerequisites...${NC}"
    
    local missing=false
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        echo -e "  ${GREEN}✓${NC} Node.js $NODE_VERSION"
    else
        echo -e "  ${RED}✗${NC} Node.js not found"
        echo -e "    Install with: ${CYAN}brew install node${NC}"
        missing=true
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        echo -e "  ${GREEN}✓${NC} npm $NPM_VERSION"
    else
        echo -e "  ${RED}✗${NC} npm not found"
        missing=true
    fi
    
    # Check Python
    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
        echo -e "  ${GREEN}✓${NC} Python $PYTHON_VERSION"
    else
        echo -e "  ${RED}✗${NC} Python 3 not found"
        echo -e "    Install with: ${CYAN}brew install python3${NC}"
        missing=true
    fi
    
    # Check Ollama (optional)
    if command_exists ollama; then
        echo -e "  ${GREEN}✓${NC} Ollama installed"
    else
        echo -e "  ${YELLOW}○${NC} Ollama not installed (optional for AI features)"
        echo -e "    Install with: ${CYAN}brew install ollama${NC}"
    fi
    
    if [ "$missing" = true ]; then
        echo -e "\n${RED}Please install missing prerequisites and try again.${NC}"
        exit 1
    fi
}

# Check if Ollama is running
check_ollama() {
    if curl -s "$OLLAMA_URL" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Ollama is running at $OLLAMA_URL"
        return 0
    else
        return 1
    fi
}

# Start Ollama if requested
start_ollama() {
    if [ "$START_OLLAMA" = true ]; then
        echo -e "\n${YELLOW}▶ Starting Ollama...${NC}"
        
        if check_ollama; then
            echo -e "  ${GREEN}✓${NC} Ollama already running"
        elif command_exists ollama; then
            echo -e "  Starting Ollama serve..."
            ollama serve &
            OLLAMA_PID=$!
            
            # Wait for Ollama to start
            sleep 3
            
            if check_ollama; then
                echo -e "  ${GREEN}✓${NC} Ollama started (PID: $OLLAMA_PID)"
            else
                echo -e "  ${YELLOW}!${NC} Ollama may still be starting..."
            fi
        else
            echo -e "  ${YELLOW}○${NC} Ollama not installed, skipping"
        fi
    fi
}

# Setup Python virtual environment
setup_python_env() {
    echo -e "\n${YELLOW}▶ Setting up Python environment...${NC}"
    
    cd "$SCRIPT_DIR"
    
    # Create venv if it doesn't exist
    if [ ! -d ".venv" ]; then
        echo -e "  Creating virtual environment..."
        python3 -m venv .venv
    fi
    
    # Activate venv
    source .venv/bin/activate
    echo -e "  ${GREEN}✓${NC} Virtual environment activated"
    
    # Install dependencies if needed
    if [ ! -f ".venv/.deps_installed" ]; then
        echo -e "  Installing Python dependencies..."
        pip install --upgrade pip --quiet
        pip install -r ChatOS/requirements.txt --quiet 2>/dev/null || true
        touch .venv/.deps_installed
    fi
    echo -e "  ${GREEN}✓${NC} Python dependencies ready"
}

# Setup Node.js environment
setup_node_env() {
    echo -e "\n${YELLOW}▶ Setting up Node.js environment...${NC}"
    
    cd "$SCRIPT_DIR/sandbox-ui"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "  Installing npm dependencies (this may take a minute)..."
        npm install --silent
    fi
    echo -e "  ${GREEN}✓${NC} Node.js dependencies ready"
}

# Start the Python backend
start_backend() {
    if [ "$START_API" = true ]; then
        echo -e "\n${YELLOW}▶ Starting Python backend...${NC}"
        
        cd "$SCRIPT_DIR"
        source .venv/bin/activate
        
        # Start uvicorn in background
        echo -e "  Starting FastAPI server on port $BACKEND_PORT..."
        python3 -m uvicorn ChatOS.app:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
        BACKEND_PID=$!
        
        # Wait a moment for startup
        sleep 2
        
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} Backend running at http://localhost:$BACKEND_PORT (PID: $BACKEND_PID)"
        else
            echo -e "  ${YELLOW}!${NC} Backend may have failed to start - check logs"
        fi
    fi
}

# Start the Next.js UI
start_ui() {
    if [ "$START_UI" = true ]; then
        echo -e "\n${YELLOW}▶ Starting Next.js UI...${NC}"
        
        cd "$SCRIPT_DIR/sandbox-ui"
        
        echo -e "  Starting Next.js dev server on port $UI_PORT..."
        npm run dev &
        UI_PID=$!
        
        # Wait for startup
        sleep 3
        
        if kill -0 $UI_PID 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} UI running at http://localhost:$UI_PORT (PID: $UI_PID)"
        else
            echo -e "  ${YELLOW}!${NC} UI may have failed to start - check logs"
        fi
    fi
}

# Print success message
print_success() {
    echo -e "\n${GREEN}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ ChatOS Trading Platform is running!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    if [ "$START_UI" = true ]; then
        echo -e "${CYAN}Trading UI:${NC}        http://localhost:$UI_PORT/trading"
    fi
    
    if [ "$START_API" = true ]; then
        echo -e "${CYAN}API Docs:${NC}          http://localhost:$BACKEND_PORT/docs"
    fi
    
    if command_exists ollama; then
        if check_ollama 2>/dev/null; then
            echo -e "${CYAN}Ollama:${NC}            $OLLAMA_URL"
        fi
    fi
    
    echo ""
    echo -e "${YELLOW}Quick Start:${NC}"
    echo -e "  1. Open http://localhost:$UI_PORT/trading in your browser"
    echo -e "  2. Click 'Connect' to connect your Hyperliquid wallet"
    echo -e "  3. Start paper trading or connect for live trading"
    echo ""
    echo -e "${YELLOW}Key Features:${NC}"
    echo -e "  • Live market data from CCXT (Binance)"
    echo -e "  • Hyperliquid integration for trading"
    echo -e "  • AI Trading Assistant (requires Ollama)"
    echo -e "  • Backtesting with historical data"
    echo -e "  • Training data collection for PersRM"
    echo ""
    echo -e "${YELLOW}To stop:${NC} Press Ctrl+C"
    echo ""
}

# Cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    
    # Kill background processes
    if [ -n "$UI_PID" ]; then
        kill $UI_PID 2>/dev/null || true
    fi
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$OLLAMA_PID" ]; then
        kill $OLLAMA_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}Goodbye!${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main function
main() {
    print_banner
    check_prerequisites
    
    start_ollama
    
    if [ "$START_API" = true ]; then
        setup_python_env
    fi
    
    if [ "$START_UI" = true ]; then
        setup_node_env
    fi
    
    start_backend
    start_ui
    
    print_success
    
    # Keep script running
    echo -e "Press Ctrl+C to stop all services...\n"
    wait
}

# Run
main

