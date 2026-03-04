#!/usr/bin/env bash
# scripts/watch-logs.sh
#
# Wealth Finder MCP — Live Log Monitor
# Wraps tail -f with a polished welcome header for demo recordings.
# macOS only (uses tail -f).
#
# Usage: npm run logs
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/mcp-server.log"

clear

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            WEALTH FINDER MCP  —  Live Log Monitor           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  This terminal shows every tool call Claude makes in        ║"
echo "║  real time, including:                                      ║"
echo "║    • Which tool was invoked and with what parameters        ║"
echo "║    • The Supabase query that ran against the database       ║"
echo "║    • The response summary returned to Claude                ║"
echo "║    • Timing for each operation (ms)                         ║"
echo "║                                                             ║"
echo "║  Start the MCP server first:  npm run dev:mcp              ║"
echo "║  Then open a new chat in Claude Desktop to begin           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Watching: logs/mcp-server.log   (Ctrl+C to stop)          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ ! -f "$LOG_FILE" ]; then
  echo "  ⚠️  Log file not found at: $LOG_FILE"
  echo "  Start the MCP server first with: npm run dev:mcp"
  echo ""
  echo "  Waiting for log file to appear..."
  while [ ! -f "$LOG_FILE" ]; do
    sleep 1
  done
  echo "  ✅ Log file found. Starting stream..."
  echo ""
fi

echo "──────────────────────────── LOG STREAM ────────────────────────────"
echo ""
tail -n 0 -f "$LOG_FILE"
