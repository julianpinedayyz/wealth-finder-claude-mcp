# Wealth Finder MCP

Wealth Finder is a local Model Context Protocol (MCP) server that lets Claude Desktop query and act on a demo personal-finance dataset stored in Supabase.

![Flow 1 demo](docs/assets/flow1.gif)

The server exposes 10 tools:
- `get_current_date`
- `get_account_summary`
- `get_spending_by_category`
- `get_transactions`
- `get_bills_due`
- `get_bill_detail`
- `set_spending_alert`
- `file_service_complaint`
- `get_subscriptions_audit`
- `get_interest_paid_summary`

## Quick start

```bash
npm install
cp .env.example .env
# fill .env values
npm run seed:supabase
npm run dev:mcp
```

Then connect Claude Desktop using the config template in:
- [`docs/claude_desktop_config.json`](docs/claude_desktop_config.json)

## Feeling lazy?

Give this prompt to your favorite AI coding agent (Codex, Claude Code, etc.):

```text
You are helping me fully set up this repository end-to-end with minimal back-and-forth.

Repository: Wealth Finder MCP
Goal: local MCP server connected to a working Supabase backend and ready for Claude Desktop.

Constraints:
- Do as much as possible yourself.
- Only ask me for inputs that cannot be automated:
  1) Supabase project creation and credentials
  2) Filling `.env`
  3) Authorizing Supabase MCP access in my IDE/client
- After each major step, validate with a command or query and report pass/fail.

Execution plan:
1. Read these files first:
   - README.md
   - docs/INSTALL.md
   - docs/BACKEND_SETUP.md
   - docs/claude_desktop_config.json
2. Check prerequisites (`node`, `npm`) and install dependencies.
3. Ensure `.env` exists by copying `.env.example` if needed.
4. Ask me only for missing `.env` values:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - MCP_USER_ID (use default `usr_marco_reyes` unless I change it)
5. Set up Supabase backend:
   - Apply `supabase/schema.sql`
   - Apply all SQL files in `supabase/migrations/` in order
   - Apply `supabase/rls_policies.sql`
6. Seed data by running:
   - `npm run seed:supabase`
7. Verify backend with SQL counts for:
   - users, accounts, transactions, bills, subscriptions
   filtered by `MCP_USER_ID`.
8. Start MCP server (`npm run dev:mcp`) and confirm startup banner shows registered tools.
9. Help me configure Claude Desktop using `docs/claude_desktop_config.json`:
   - Detect my OS path for Claude config
   - Build the exact JSON block with absolute repo paths
10. Provide 5 smoke-test prompts from `docs/PROMPT_GUIDE.md` and confirm expected tool calls.
11. If anything fails, diagnose and fix before moving on.

Output format:
- Keep updates concise.
- Show commands you ran.
- Show what is pending manual action from me.
- End with a checklist of completed setup items.
```

## Full setup docs

- [`docs/INSTALL.md`](docs/INSTALL.md) — end-to-end local setup
- [`docs/BACKEND_SETUP.md`](docs/BACKEND_SETUP.md) — Supabase project creation, schema, migrations, seed, and verification
- [`docs/PROMPT_GUIDE.md`](docs/PROMPT_GUIDE.md) — practical prompts to validate each MCP capability
- [`tests/README.md`](tests/README.md) — tool-level test commands

## Project structure

- `src/mcp/` — MCP server, tool handlers, logger
- `supabase/schema.sql` — database schema
- `supabase/migrations/` — incremental schema updates
- `supabase/seed/` — seed datasets used by the seeding script
- `scripts/seed_supabase.mjs` — loads seed data into your Supabase project
- `tests/tools/` — tool-level tests

## Notes

- This repository is a local demo environment, not production financial infrastructure.
- Market/investment execution features are intentionally out of scope on this branch.
- Keep `MCP_USER_ID=usr_marco_reyes` unless you also update `supabase/rls_policies.sql` and reseed. Current default policies are scoped to that user id.
