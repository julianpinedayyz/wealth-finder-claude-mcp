# Installation Guide

This guide gets you from zero to a working local MCP server connected to Claude Desktop.

## 1. Prerequisites

- Node.js 20+
- npm 9+
- A Supabase account
- Claude Desktop (latest)

Check versions:

```bash
node --version
npm --version
```

## 2. Clone and install

```bash
git clone https://github.com/<your-org-or-user>/wealth-finder-mcp.git
cd wealth-finder-mcp
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required only for seeding)
- `MCP_USER_ID` (default `usr_marco_reyes`)

## 4. Setup backend data

Follow [`docs/BACKEND_SETUP.md`](./BACKEND_SETUP.md) to:

1. Create the schema
2. Apply migrations
3. Apply RLS policies
4. Seed demo data
5. Verify table counts

## 5. Run the MCP server

```bash
npm run dev:mcp
```

Expected startup output includes:

- `REGISTERED TOOLS (10)`
- `READY - Claude Desktop can now send requests`

## 6. Configure Claude Desktop

Use the template in:

- [`docs/claude_desktop_config.json`](./claude_desktop_config.json)

Config file locations:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

After saving config, fully quit and reopen Claude Desktop.

## 7. Smoke test prompts

Run these in a new Claude Desktop chat:

1. `What tools do you have available?`
2. `Show me my account balances`
3. `Show me my bills for February 2026`
4. `Set a $400 monthly dining alert and show preview only`

For a full prompt suite by capability, use:

- [`docs/PROMPT_GUIDE.md`](./PROMPT_GUIDE.md)

## 8. Optional: tail logs while testing

```bash
npm run logs
```

This watches the log file configured by `MCP_LOG_FILE` (default `logs/mcp-server.log`).
