-- Issue #68
-- Add minimum_payment baseline for LOC payoff projection logic.

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS minimum_payment NUMERIC(10,2);

UPDATE accounts
SET minimum_payment = 250.00
WHERE account_id = 'acc_loc_001'
  AND user_id = 'usr_marco_reyes';
