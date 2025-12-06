#!/bin/bash
# PersRM Data Scraper Startup Script
# This script starts and manages all data scrapers

SCRAPER_DIR="/home/kr/ChatOS-v2.0/scrapers"
VENV="/home/kr/text-generation-webui/venv/bin/activate"
LOG_DIR="$SCRAPER_DIR/logs"
PID_FILE="$SCRAPER_DIR/scraper.pid"

# Create log directory
mkdir -p "$LOG_DIR"

start_scrapers() {
    echo "Starting PersRM Data Scrapers..."
    
    # Check if already running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            echo "Scraper already running (PID: $OLD_PID)"
            return 0
        fi
    fi
    
    # Activate venv and start scraper
    cd "$SCRAPER_DIR"
    source "$VENV"
    
    nohup python market_scraper.py >> "$LOG_DIR/service.log" 2>&1 &
    NEW_PID=$!
    echo $NEW_PID > "$PID_FILE"
    
    echo "Started scraper with PID: $NEW_PID"
    sleep 2
    
    # Verify it started
    if ps -p "$NEW_PID" > /dev/null 2>&1; then
        echo "✓ Scraper started successfully"
        tail -5 "$LOG_DIR/service.log"
    else
        echo "✗ Scraper failed to start"
        tail -20 "$LOG_DIR/service.log"
        return 1
    fi
}

stop_scrapers() {
    echo "Stopping PersRM Data Scrapers..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            kill "$PID"
            echo "Stopped scraper (PID: $PID)"
        fi
        rm -f "$PID_FILE"
    fi
    
    # Also kill any remaining processes
    pkill -f "python market_scraper.py" 2>/dev/null || true
    echo "✓ All scrapers stopped"
}

status_scrapers() {
    echo "PersRM Data Scraper Status"
    echo "=========================="
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "Status: RUNNING (PID: $PID)"
            echo ""
            echo "Memory usage:"
            ps -p "$PID" -o pid,vsz,rss,%mem,etime --no-headers
            echo ""
            echo "Recent log entries:"
            tail -10 "$LOG_DIR/service.log"
        else
            echo "Status: STOPPED (stale PID file)"
        fi
    else
        # Check if running without PID file
        RUNNING_PID=$(pgrep -f "python market_scraper.py" | head -1)
        if [ -n "$RUNNING_PID" ]; then
            echo "Status: RUNNING (PID: $RUNNING_PID, no PID file)"
        else
            echo "Status: STOPPED"
        fi
    fi
    
    echo ""
    echo "Data directories:"
    echo "  Market: $(ls -la /home/kr/ChatOS-v2.0/sandbox-ui/data/market-history/$(date +%Y-%m-%d)/ 2>/dev/null | wc -l) symbols"
    echo "  News: $(cat /home/kr/ChatOS-v2.0/sandbox-ui/data/news/$(date +%Y-%m-%d).json 2>/dev/null | grep -o '"id"' | wc -l) articles"
    echo "  Sentiment: $(ls -la /home/kr/ChatOS-v2.0/sandbox-ui/data/sentiment/ 2>/dev/null | wc -l) files"
}

restart_scrapers() {
    stop_scrapers
    sleep 2
    start_scrapers
}

# Parse command
case "$1" in
    start)
        start_scrapers
        ;;
    stop)
        stop_scrapers
        ;;
    restart)
        restart_scrapers
        ;;
    status)
        status_scrapers
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

