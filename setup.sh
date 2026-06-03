#!/bin/bash
set -e

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║        Life OS — Setup Script         ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Determine script dir (works even if called from elsewhere)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- Python check ---
echo "🐍 Checking Python..."
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 is required. Install from https://python.org"
  exit 1
fi
PYTHON=$(command -v python3)
echo "   Found: $($PYTHON --version)"

# --- Node check ---
echo "📦 Checking Node.js..."
if ! command -v node &>/dev/null; then
  echo "❌ Node.js is required. Install from https://nodejs.org"
  exit 1
fi
echo "   Found: $(node --version)"

# --- Python venv ---
echo ""
echo "🔧 Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
  $PYTHON -m venv .venv
  echo "   Created .venv"
else
  echo "   .venv already exists"
fi

source .venv/bin/activate
echo "   Activated .venv"

# --- Python deps ---
echo ""
echo "📥 Installing Python dependencies..."
pip install -q -r requirements.txt
echo "   ✅ Python deps installed"

# --- Node deps ---
echo ""
echo "📥 Installing Node dependencies..."
cd frontend
npm install --silent 2>&1 | tail -5
echo "   ✅ Node deps installed"

# --- Build frontend ---
echo ""
echo "🏗️  Building React frontend..."
npm run build
echo "   ✅ Frontend built"

cd ..

# --- Launch ---
echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   🚀  Life OS launching at            ║"
echo "║       http://localhost:3000            ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "   Press Ctrl+C to stop."
echo ""

source .venv/bin/activate
python main.py
