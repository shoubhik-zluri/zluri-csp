#!/bin/bash
set -e

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}✓${RESET} $1"; }
info() { echo -e "${BLUE}→${RESET} $1"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $1"; }
die()  { echo -e "${RED}✗  ERROR: $1${RESET}"; exit 1; }
hr()   { echo -e "${BLUE}──────────────────────────────────────────${RESET}"; }

echo ""
echo -e "${BOLD}Zluri MCP — Setup${RESET}"
hr

# ─── 1. Find this script's directory ──────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="$SCRIPT_DIR"

# ─── 2. Check Node.js ─────────────────────────────────────────────────────────
info "Checking Node.js…"
if ! command -v node &>/dev/null; then
  die "Node.js is not installed. Install it from https://nodejs.org (LTS version) and re-run this script."
fi

NODE_VER=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  die "Node.js v$NODE_VER is too old. Install v18 or later from https://nodejs.org"
fi
ok "Node.js v$NODE_VER"

# ─── 3. Install dependencies ──────────────────────────────────────────────────
info "Installing dependencies…"
cd "$MCP_DIR"
npm install --silent
ok "Dependencies installed"

# ─── 4. Build TypeScript ──────────────────────────────────────────────────────
info "Building…"
npm run build
ok "Build complete → $MCP_DIR/dist/index.js"

# ─── 5. Ask for API key ───────────────────────────────────────────────────────
hr
echo ""
echo -e "${BOLD}Step 1 of 2 — Get your API key${RESET}"
echo ""
echo "  1. Open the Zluri CSM app in your browser"
echo "  2. Go to Settings → API Keys"
echo "  3. Click 'Generate', name it something like 'My MacBook'"
echo "  4. Copy the key that appears (starts with zsk_)"
echo ""
read -rp "$(echo -e "${YELLOW}Paste your API key here:${RESET} ")" API_KEY

if [ -z "$API_KEY" ]; then
  die "No API key entered. Re-run this script once you have a key."
fi

if [[ "$API_KEY" != zsk_* ]]; then
  warn "Key doesn't start with 'zsk_' — double-check you copied the right value."
fi

# ─── 6. Determine Claude Desktop config path ──────────────────────────────────
if [[ "$OSTYPE" == "darwin"* ]]; then
  CLAUDE_CONFIG="$HOME/.claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "linux"* ]]; then
  CLAUDE_CONFIG="$HOME/.config/claude/claude_desktop_config.json"
else
  CLAUDE_CONFIG="$APPDATA/Claude/claude_desktop_config.json"
fi

INDEX_PATH="$MCP_DIR/dist/index.js"
BASE_URL="https://zluri-csm.vercel.app"

# ─── 7. Show config snippet ───────────────────────────────────────────────────
hr
echo ""
echo -e "${BOLD}Step 2 of 2 — Add to Claude Desktop${RESET}"
echo ""
echo -e "Open this file (create it if it doesn't exist):"
echo -e "  ${YELLOW}$CLAUDE_CONFIG${RESET}"
echo ""
echo -e "If the file is ${BOLD}empty or doesn't exist${RESET}, paste this as the entire contents:"
echo ""
cat <<JSON
{
  "mcpServers": {
    "zluri": {
      "command": "node",
      "args": ["$INDEX_PATH"],
      "env": {
        "ZLURI_API_KEY": "$API_KEY",
        "ZLURI_BASE_URL": "$BASE_URL"
      }
    }
  }
}
JSON

echo ""
echo -e "If the file ${BOLD}already has other MCP servers${RESET}, add only the ${YELLOW}\"zluri\"${RESET} block inside ${YELLOW}\"mcpServers\"${RESET}."
echo ""
hr
echo ""
ok "Setup complete!"
echo ""
echo "  Restart Claude Desktop, then type:  list my accounts"
echo "  You should see your Zluri accounts."
echo ""
