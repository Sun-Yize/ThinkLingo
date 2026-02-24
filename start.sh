#!/usr/bin/env bash
# start.sh — one-command local startup for ThinkLingo
# Usage: ./start.sh
# Starts backend (port 8000) and frontend (port 3000) in the background,
# then tails their logs. Press Ctrl+C to stop both.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

BACKEND_LOG="$SCRIPT_DIR/.backend.log"
FRONTEND_LOG="$SCRIPT_DIR/.frontend.log"
BACKEND_PID=""
FRONTEND_PID=""

# ── Helpers ─────────────────────────────────────────────────────────────────

red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
bold()  { printf '\033[1m%s\033[0m\n'  "$*"; }
info()  { printf '  \033[36m→\033[0m %s\n' "$*"; }

cleanup() {
    echo ""
    bold "Shutting down..."
    [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null && info "Backend stopped"
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && info "Frontend stopped"
    # Kill any child processes that were spawned (e.g. npm's node child)
    kill 0 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# ── 1. Check .env ────────────────────────────────────────────────────────────

if [ ! -f ".env" ]; then
    red "Error: .env not found."
    info "Run: cp .env.template .env  then add your API keys"
    exit 1
fi

if grep -q "your_deepseek_api_key\|your_openai_api_key" .env 2>/dev/null; then
    red "Warning: .env still contains placeholder API keys."
    info "Open .env and set DEEPSEEK_API_KEY and/or OPENAI_API_KEY before continuing."
    read -rp "  Continue anyway? [y/N] " ans
    [[ "$ans" =~ ^[Yy]$ ]] || exit 1
fi

# ── 2. Python dependencies ───────────────────────────────────────────────────

bold "Checking Python dependencies..."
if ! python3 -c "import fastapi, uvicorn" 2>/dev/null; then
    info "Installing Python packages..."
    pip install -r requirements.txt
else
    info "Python packages already installed"
fi

# ── 3. Node dependencies ─────────────────────────────────────────────────────

bold "Checking Node dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    info "Running npm install..."
    npm install --prefix frontend
else
    info "node_modules already present"
fi

# ── 4. Start backend ─────────────────────────────────────────────────────────

bold "Starting backend on http://localhost:8000 ..."
> "$BACKEND_LOG"
uvicorn backend.app:app --host 0.0.0.0 --port 8000 > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# Wait for the backend to be ready (up to 15 s)
for i in $(seq 1 15); do
    sleep 1
    if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
        green "  Backend ready (pid $BACKEND_PID)"
        break
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        red "Backend failed to start. Log:"
        cat "$BACKEND_LOG"
        exit 1
    fi
    printf "  waiting%s\r" "$(printf '.%.0s' $(seq 1 $i))"
done

# ── 5. Start frontend ────────────────────────────────────────────────────────

bold "Starting frontend on http://localhost:3000 ..."
> "$FRONTEND_LOG"
BROWSER=none npm start --prefix frontend > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

green "  Frontend starting (pid $FRONTEND_PID)"

# ── 6. Tail logs ─────────────────────────────────────────────────────────────

echo ""
bold "Both services running. Press Ctrl+C to stop."
echo "  Backend log : $BACKEND_LOG"
echo "  Frontend log: $FRONTEND_LOG"
echo ""

tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
