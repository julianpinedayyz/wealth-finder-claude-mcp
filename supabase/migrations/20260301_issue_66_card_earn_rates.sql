-- Issue #66
-- Add/seed credit-card reward metadata so Flow 3 can compute card value
-- without asking the user for earn rates.

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Cashback card: strong grocery + dining earn profile.
UPDATE accounts
SET metadata = jsonb_strip_nulls(
  COALESCE(metadata, '{}'::jsonb) ||
  '{
    "card_type": "cashback",
    "rewards_type": "cashback",
    "earn_rates": {
      "groceries": 0.02,
      "dining": 0.02,
      "food_delivery": 0.02,
      "default": 0.01
    }
  }'::jsonb
)
WHERE user_id = 'usr_marco_reyes'
  AND (
    account_id IN ('acc_cc_cash_001', 'acc_cc_001')
    OR display_name = 'Wealthsimple Cashback Card'
  );

-- Points card: strong travel profile, dining bonus, plus CAD conversion.
UPDATE accounts
SET metadata = jsonb_strip_nulls(
  COALESCE(metadata, '{}'::jsonb) ||
  '{
    "card_type": "points",
    "rewards_type": "points",
    "earn_rates": {
      "travel": 0.03,
      "dining": 0.02,
      "default": 0.01
    },
    "points_per_dollar": 1.0,
    "points_to_cad": 0.01
  }'::jsonb
)
WHERE user_id = 'usr_marco_reyes'
  AND (
    account_id IN ('acc_cc_points_001', 'acc_cc_002')
    OR display_name = 'Wealthsimple Points Card'
  );
