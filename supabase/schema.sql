-- =============================================================================
-- Wealth Finder MCP — Supabase Schema
-- /supabase/schema.sql
--
-- Purpose : Defines all 8 tables for the Wealth Finder MCP demo database.
-- Consumed by : API server (src/api/db.ts), seed scripts, validation (issue #12)
-- Dependencies: Run this first, then load seed data via seed scripts.
--
-- Usage:
--   Paste into Supabase SQL Editor and run, OR
--   supabase db push (if using Supabase CLI with local dev)
--
-- Re-runnable: All CREATE TABLE statements use IF NOT EXISTS.
--   Run DROP TABLE statements at bottom first for a clean rebuild.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────
-- uuid_generate_v4() used for auto-generated IDs on complaints
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: users
-- One row per persona. All other tables reference user_id.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id               TEXT        PRIMARY KEY,                  -- e.g. 'usr_marco_reyes'
  full_name             TEXT        NOT NULL,
  email                 TEXT        NOT NULL,
  age                   INTEGER     NOT NULL,
  city                  TEXT        NOT NULL,
  province              TEXT        NOT NULL,                     -- 2-char, e.g. 'ON'
  occupation            TEXT        NOT NULL,
  employer              TEXT        NOT NULL,
  gross_annual_salary   NUMERIC(12,2) NOT NULL,
  net_biweekly          NUMERIC(10,2) NOT NULL,
  risk_profile          TEXT        NOT NULL DEFAULT 'moderate',  -- conservative | moderate | aggressive
  onboarded_date        DATE        NOT NULL,
  metadata              JSONB       NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE  users                    IS 'One fictional user persona. All MCP tools are scoped to a single user_id.';
COMMENT ON COLUMN users.metadata           IS 'Bag for neighbourhood, housing_status, partner_status, tfsa_contribution_room, tfsa_opened.';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: accounts
-- 7 financial accounts belonging to the user.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  account_id            TEXT        PRIMARY KEY,                  -- e.g. 'acc_chq_001'
  user_id               TEXT        NOT NULL REFERENCES users(user_id),
  account_type          TEXT        NOT NULL,                     -- chequing | savings | usd | line_of_credit | credit_card | mortgage
  display_name          TEXT        NOT NULL,
  currency              TEXT        NOT NULL DEFAULT 'CAD',       -- CAD | USD
  institution           TEXT        NOT NULL DEFAULT 'Wealthsimple',
  opened_date           DATE        NOT NULL,
  current_balance       NUMERIC(12,2) NOT NULL,                   -- negative for credit/debt accounts
  available_balance     NUMERIC(12,2),                            -- null for mortgage
  credit_limit          NUMERIC(12,2),                            -- null for debit/savings/mortgage
  interest_rate         NUMERIC(6,4),                             -- annual rate, e.g. 0.0920 = 9.20%; null for credit cards
  minimum_payment       NUMERIC(10,2),                            -- baseline monthly payment for revolving debt accounts
  metadata              JSONB       NOT NULL DEFAULT '{}'         -- rewards_type, points_balance, cashback_ytd, goal_id, amortization_years, etc.
);

COMMENT ON TABLE  accounts                 IS '7 accounts: chequing, savings/HYSA, USD, LOC, points CC, cashback CC, mortgage.';
COMMENT ON COLUMN accounts.current_balance IS 'Negative for accounts where user owes money (credit card, LOC, mortgage).';
COMMENT ON COLUMN accounts.interest_rate   IS 'Annual rate as decimal. LOC=0.0920, savings=0.0450, mortgage=0.0524. Credit cards null (handled at transaction level).';
COMMENT ON COLUMN accounts.minimum_payment IS 'Baseline monthly payment for debt payoff projections (e.g., LOC minimum payment).';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: transactions
-- All financial transactions across all 7 accounts, Mar 2025 – Feb 2026.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id        TEXT        PRIMARY KEY,                  -- e.g. 'txn_chq_2025_03_001'
  account_id            TEXT        NOT NULL REFERENCES accounts(account_id),
  user_id               TEXT        NOT NULL REFERENCES users(user_id),
  date                  DATE        NOT NULL,
  amount                NUMERIC(10,2) NOT NULL CHECK (amount >= 0),   -- always positive; direction indicates sign
  direction             TEXT        NOT NULL CHECK (direction IN ('debit','credit')),
  merchant              TEXT        NOT NULL,
  category              TEXT        NOT NULL,                     -- leaf category, e.g. 'dining'
  category_group        TEXT        NOT NULL,                     -- parent group, e.g. 'FOOD'
  description           TEXT        NOT NULL,
  balance_after         NUMERIC(12,2) NOT NULL                    -- running balance of the account after this transaction
);

-- Index for the most frequent query pattern: user + date range + direction
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions (user_id, date DESC);

-- Index for category-level spend queries (Flow 1, Flow 3)
CREATE INDEX IF NOT EXISTS idx_transactions_user_category
  ON transactions (user_id, category_group, category);

-- Index for per-account queries (balance reconciliation, Flow 5)
CREATE INDEX IF NOT EXISTS idx_transactions_account_date
  ON transactions (account_id, date DESC);

COMMENT ON TABLE  transactions             IS '12 months of transactions (Mar 2025 – Feb 2026) across all 7 accounts.';
COMMENT ON COLUMN transactions.direction   IS 'debit = money leaving account or charge on card. credit = money arriving or payment made to card.';
COMMENT ON COLUMN transactions.balance_after IS 'Snapshot balance after this transaction; used for reconciliation checks in issue #12.';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: bills
-- One row per recurring bill per month. Drives Flow 2 (anomaly detection).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  bill_id               TEXT        PRIMARY KEY,                  -- e.g. 'bill_rogers_phone_2026_02'
  user_id               TEXT        NOT NULL REFERENCES users(user_id),
  provider              TEXT        NOT NULL,                     -- e.g. 'Rogers Communications'
  category              TEXT        NOT NULL,                     -- leaf category from taxonomy
  category_group        TEXT        NOT NULL,
  due_month             TEXT        NOT NULL,                     -- 'YYYY-MM'
  due_date              DATE        NOT NULL,
  current_amount        NUMERIC(10,2) NOT NULL,                   -- actual charge this month
  typical_amount        NUMERIC(10,2) NOT NULL,                   -- REQ-DATA-13: baseline for anomaly detection
  autopay               BOOLEAN     NOT NULL DEFAULT TRUE,
  autopay_account       TEXT        REFERENCES accounts(account_id),
  anomaly_flag          BOOLEAN     NOT NULL DEFAULT FALSE,       -- true when current_amount > typical_amount * 1.5
  anomaly_reason        TEXT                                      -- human-readable explanation
);

CREATE INDEX IF NOT EXISTS idx_bills_user_month
  ON bills (user_id, due_month DESC);

COMMENT ON TABLE  bills                    IS 'Recurring bill instances (one row per bill per month). typical_amount enables API anomaly detection without hardcoding thresholds.';
COMMENT ON COLUMN bills.typical_amount     IS 'REQ-DATA-13: Normal monthly amount. API flags anomaly when current_amount > typical_amount * 1.5.';
COMMENT ON COLUMN bills.anomaly_flag       IS 'Pre-computed flag. Rogers phone Feb 2026 ($187.43 vs $89.00 typical) is the only flagged row in seed data.';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: bill_line_items
-- Line-item breakdown per bill. Only populated for the Feb 2026 Rogers anomaly.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_line_items (
  line_item_id          TEXT        PRIMARY KEY,                  -- e.g. 'li_rogers_phone_2026_02_001'
  bill_id               TEXT        NOT NULL REFERENCES bills(bill_id),
  description           TEXT        NOT NULL,
  amount                NUMERIC(10,2) NOT NULL,
  date_from             DATE,
  date_to               DATE
);

COMMENT ON TABLE  bill_line_items          IS 'Line items for individual bills. Only the Feb 2026 Rogers phone bill ($187.43) has line items in seed data — base $89.00 + roaming $76.43 + day pass $22.00.';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: spending_alerts
-- User-defined spending limits per category. Drives Flow 1.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spending_alerts (
  alert_id              TEXT        PRIMARY KEY DEFAULT ('alert_' || replace(gen_random_uuid()::text, '-', '')),
  user_id               TEXT        NOT NULL REFERENCES users(user_id),
  category              TEXT        NOT NULL,
  category_group        TEXT        NOT NULL,
  monthly_limit         NUMERIC(10,2) NOT NULL,
  alert_threshold_pct   INTEGER     NOT NULL DEFAULT 80,          -- notify when spend reaches this % of limit
  active                BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category)                                      -- one alert per category per user
);

COMMENT ON TABLE  spending_alerts          IS 'User-configured spending limits. POST /alerts creates/upserts a row here. Flow 1 demo: set dining limit, AI confirms it is stored.';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: complaints
-- Filed service complaints. Populated when file_service_complaint MCP tool runs.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id          TEXT        PRIMARY KEY DEFAULT ('complaint_' || replace(gen_random_uuid()::text, '-', '')),
  user_id               TEXT        NOT NULL REFERENCES users(user_id),
  provider              TEXT        NOT NULL,                     -- e.g. 'Rogers Communications'
  subject               TEXT        NOT NULL,
  description           TEXT        NOT NULL,
  bill_id               TEXT        REFERENCES bills(bill_id),    -- linked bill if complaint is bill-related
  amount_disputed       NUMERIC(10,2),
  status                TEXT        NOT NULL DEFAULT 'submitted', -- submitted | under_review | resolved | closed
  confirmation_number   TEXT        NOT NULL,                     -- mock reference, e.g. 'WF-2026-029341'
  provider_reference    TEXT,                                     -- mock provider case number
  estimated_response_days INTEGER   NOT NULL DEFAULT 5,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ
);

COMMENT ON TABLE  complaints               IS 'Each row = one complaint submitted via file_service_complaint MCP tool. Flow 2 demo: Rogers roaming charge complaint inserts here and returns confirmation_number.';


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: subscriptions
-- Recurring subscriptions with last-activity tracking. Drives Flow 4.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id       TEXT        PRIMARY KEY,                  -- e.g. 'sub_goodlife_001'
  user_id               TEXT        NOT NULL REFERENCES users(user_id),
  merchant              TEXT        NOT NULL,
  category              TEXT        NOT NULL,
  category_group        TEXT        NOT NULL,
  monthly_amount        NUMERIC(10,2) NOT NULL,
  billing_account       TEXT        NOT NULL REFERENCES accounts(account_id),
  billing_day           INTEGER     NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
  active_since          DATE        NOT NULL,
  last_activity_date    DATE,                                     -- last transaction suggesting active use; null = never used
  usage_flag            TEXT        NOT NULL DEFAULT 'active'     -- active | possibly_unused | likely_unused
    CHECK (usage_flag IN ('active','possibly_unused','likely_unused')),
  usage_category        TEXT,                                     -- category to correlate usage evidence in transactions
  usage_merchant_keyword TEXT,                                    -- merchant keyword to correlate usage evidence in transactions
  notes                 TEXT                                      -- e.g. 'No gym activity since Nov 2025'
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user
  ON subscriptions (user_id);

COMMENT ON TABLE  subscriptions            IS 'Traceable recurring subscriptions where usage can be corroborated with transaction history (e.g., Uber Eats/Uber/Amazon).';
COMMENT ON COLUMN subscriptions.usage_flag IS 'Computed dynamically by get_subscriptions_audit using transaction history recency windows (active/possibly_unused/likely_unused).';
COMMENT ON COLUMN subscriptions.usage_category IS 'Expected usage category signal used for correlation against transactions (e.g., rideshare, food_delivery, groceries, shopping).';
COMMENT ON COLUMN subscriptions.usage_merchant_keyword IS 'Merchant keyword used to correlate likely service usage in transactions (normalized match, e.g., Uber, Uber Eats, Amazon).';


-- =============================================================================
-- CLEAN REBUILD HELPER
-- Run these first if you need a full teardown before re-seeding.
-- Uncomment and run as a separate statement in Supabase SQL Editor.
-- =============================================================================
/*
DROP TABLE IF EXISTS bill_line_items  CASCADE;
DROP TABLE IF EXISTS complaints       CASCADE;
DROP TABLE IF EXISTS spending_alerts  CASCADE;
DROP TABLE IF EXISTS subscriptions    CASCADE;
DROP TABLE IF EXISTS bills            CASCADE;
DROP TABLE IF EXISTS transactions     CASCADE;
DROP TABLE IF EXISTS accounts         CASCADE;
DROP TABLE IF EXISTS users            CASCADE;
*/
