# Backend Setup (Supabase)

This project expects a Supabase Postgres database with the schema and seed data in this repository.

## Overview

You will:

1. Create a Supabase project
2. Set environment variables
3. Apply schema + migrations + RLS policies
4. Seed demo data
5. Verify data integrity

## 1. Create Supabase project

- Go to [https://supabase.com](https://supabase.com)
- Create a new project
- Copy these values from **Project Settings -> API**:
  - `Project URL` -> `SUPABASE_URL`
  - `anon public` key -> `SUPABASE_ANON_KEY`
  - `service_role` key -> `SUPABASE_SERVICE_ROLE_KEY`

## 2. Configure `.env`

```bash
cp .env.example .env
```

Set values:

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
MCP_USER_ID=usr_marco_reyes
```

Important:
- Keep `MCP_USER_ID=usr_marco_reyes` for the default setup.
- `supabase/rls_policies.sql` is currently scoped to `usr_marco_reyes`.
- If you change `MCP_USER_ID`, update the hardcoded user id in `supabase/rls_policies.sql`, re-apply policies, and re-run `npm run seed:supabase`.

## 3. Apply schema and policies

### Option A: Supabase SQL Editor (recommended for hosted projects)

Run these files in order:

1. `supabase/schema.sql`
2. `supabase/migrations/20260301_issue_66_card_earn_rates.sql`
3. `supabase/migrations/20260301_issue_67_traceable_subscriptions.sql`
4. `supabase/migrations/20260303_issue_68_loc_minimum_payment.sql`
5. `supabase/rls_policies.sql`

### Option B: Supabase CLI (local workflow)

If you use Supabase CLI/local DB, apply equivalent SQL via your normal migration flow.

## 4. Seed data

Run:

```bash
npm run seed:supabase
```

What this does:

- Loads users, accounts, transactions, bills, line items, subscriptions
- Creates/updates a default `dining` spending alert
- Replaces rows for the selected `MCP_USER_ID` idempotently

## 5. Verify backend state

Use Supabase SQL Editor and run:

```sql
select count(*) from users where user_id = 'usr_marco_reyes';
select count(*) from accounts where user_id = 'usr_marco_reyes';
select count(*) from transactions where user_id = 'usr_marco_reyes';
select count(*) from bills where user_id = 'usr_marco_reyes';
select count(*) from subscriptions where user_id = 'usr_marco_reyes';
```

Expected:

- each query should return count > 0

Quick anomaly check for Flow 2:

```sql
select bill_id, provider, current_amount, typical_amount, anomaly_flag
from bills
where user_id = 'usr_marco_reyes' and due_month = '2026-02'
order by due_date;
```

Expected:

- `bill_rogers_phone_2026_02` exists
- `anomaly_flag = true`

## 6. Optional: query from your IDE using Supabase MCP

If your IDE supports MCP servers, you can add a Supabase MCP connection and run SQL directly without leaving your editor.

Typical setup pattern:

- add Supabase MCP server to your MCP client config
- authenticate with your Supabase account/project
- run verification queries from the IDE tool panel

Note: exact MCP config differs by client (Codex, Claude Desktop integrations, VS Code extensions, etc.).
