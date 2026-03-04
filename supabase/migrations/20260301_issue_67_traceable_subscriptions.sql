-- Issue #67
-- Replace static/non-traceable subscription usage with transaction-traceable services.

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS usage_category TEXT;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS usage_merchant_keyword TEXT;

-- Remove prior subscription set (streaming/gym/non-traceable usage semantics).
DELETE FROM subscriptions
WHERE user_id = 'usr_marco_reyes';

-- Ensure no Instacart activity exists in transaction history.
DELETE FROM transactions
WHERE user_id = 'usr_marco_reyes'
  AND merchant ILIKE '%instacart%';

-- Insert traceable subscriptions only.
INSERT INTO subscriptions (
  subscription_id,
  user_id,
  merchant,
  category,
  category_group,
  monthly_amount,
  billing_account,
  billing_day,
  active_since,
  last_activity_date,
  usage_flag,
  usage_category,
  usage_merchant_keyword,
  notes
) VALUES
  (
    'sub_uber_eats',
    'usr_marco_reyes',
    'Uber Eats',
    'food_delivery',
    'SUBSCRIPTIONS',
    14.99,
    'acc_cc_points_001',
    6,
    '2024-05-01',
    NULL,
    'active',
    'food_delivery',
    'Uber Eats',
    NULL
  ),
  (
    'sub_uber_one',
    'usr_marco_reyes',
    'Uber One',
    'rideshare',
    'SUBSCRIPTIONS',
    9.99,
    'acc_cc_points_001',
    12,
    '2024-05-01',
    NULL,
    'active',
    'rideshare',
    'Uber',
    NULL
  ),
  (
    'sub_instacart',
    'usr_marco_reyes',
    'Instacart+',
    'groceries',
    'SUBSCRIPTIONS',
    9.99,
    'acc_cc_cash_001',
    18,
    '2024-06-01',
    NULL,
    'active',
    'groceries',
    'Instacart',
    NULL
  ),
  (
    'sub_amazon_prime',
    'usr_marco_reyes',
    'Amazon Prime',
    'shopping',
    'SUBSCRIPTIONS',
    9.99,
    'acc_cc_cash_001',
    24,
    '2024-04-01',
    NULL,
    'active',
    'shopping',
    'Amazon',
    NULL
  );
