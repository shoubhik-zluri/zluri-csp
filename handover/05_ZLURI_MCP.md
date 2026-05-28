# Zluri MCP — Setup and Usage

The Zluri MCP (Model Context Protocol) server lets CSMs use Claude Desktop to read and write platform data using natural language — without opening the web app.

**Location in repo:** `zluri-mcp/` folder

---

## What it enables (examples)

- "List my accounts" → shows all accounts assigned to the CSM
- "What tasks are overdue for Acme Corp?" → queries tasks filtered by account
- "Create a follow-up task for Acme due next Friday" → writes to the platform
- "Show me the last call notes for Globex" → pulls call logs

---

## Architecture

```
CSM's Claude Desktop
    ↓ [MCP protocol over stdio]
zluri-mcp/dist/index.js  (runs locally on CSM's machine)
    ↓ [HTTPS + Authorization: Bearer <api_key>]
https://zluri-csm.vercel.app/api/...
    ↓
Supabase DB
```

The MCP server is a Node.js process that runs locally. It authenticates to the platform using a personal API key (generated in the app's Settings page).

---

## Setup for a New CSM

### Step 1 — Install and build

```bash
# Clone the repo (or get the zluri-mcp folder separately)
cd zluri-mcp
bash setup.sh
```

The setup script:
1. Checks Node.js ≥ 18
2. Installs dependencies
3. Builds the TypeScript
4. Asks you for your API key
5. Prints the exact config block to add to Claude Desktop

### Step 2 — Generate an API key

1. Log in to https://zluri-csm.vercel.app
2. Go to **Settings → API Keys**
3. Click **Generate**, give it a name (e.g. "My MacBook")
4. Copy the key — it starts with `zsk_`

> Keys are shown only once. If you lose it, delete it and generate a new one.

### Step 3 — Configure Claude Desktop

Add the output from `setup.sh` to:
- **Mac:** `~/.claude/claude_desktop_config.json`
- **Linux:** `~/.config/claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Example config:
```json
{
  "mcpServers": {
    "zluri": {
      "command": "node",
      "args": ["/path/to/zluri-mcp/dist/index.js"],
      "env": {
        "ZLURI_API_KEY": "zsk_your_key_here",
        "ZLURI_BASE_URL": "https://zluri-csm.vercel.app"
      }
    }
  }
}
```

### Step 4 — Restart Claude Desktop

After editing the config, fully quit and reopen Claude Desktop.  
Type "list my accounts" — you should see your accounts.

---

## Updating the MCP (when the server code changes)

```bash
cd zluri-mcp
npm run build
# Restart Claude Desktop
```

No re-setup needed — the config path and API key stay the same.

---

## MCP OAuth (Remote connector)

The platform also supports an OAuth-based remote MCP connector for Claude.ai (web). This allows Claude.ai to connect to the platform without a local install.

**How it works:**
- OAuth endpoints: `/.well-known/oauth-authorization-server`, `/oauth/authorize`, `/api/oauth/`
- Requires `OAUTH_SIGNING_SECRET` to be set in Vercel
- Users authenticate via the web app's normal Google login

This is set up but lightly tested. For CSM daily use, the local MCP (above) is the primary path.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "ZLURI_API_KEY environment variable is required" | API key missing in config — re-run `setup.sh` |
| "Zluri API error 401" | Key expired or revoked — generate a new one in Settings |
| "Zluri API error 403" | Your account doesn't have the right role |
| Claude Desktop doesn't show Zluri tools | Check config file path, restart Claude Desktop |
| `Cannot find module` errors | Run `npm run build` in the `zluri-mcp` folder |
