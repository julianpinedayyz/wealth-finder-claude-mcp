-- supabase/rls_policies.sql
-- POC RLS policies for MCP access using anon/authenticated roles and a fixed demo user.

BEGIN;

-- Clean up existing policies so this script is idempotent.
DROP POLICY IF EXISTS accounts_select_mcp_user ON public.accounts;
DROP POLICY IF EXISTS transactions_select_mcp_user ON public.transactions;
DROP POLICY IF EXISTS bills_select_mcp_user ON public.bills;
DROP POLICY IF EXISTS bill_line_items_select_mcp_user ON public.bill_line_items;
DROP POLICY IF EXISTS subscriptions_select_mcp_user ON public.subscriptions;
DROP POLICY IF EXISTS spending_alerts_select_mcp_user ON public.spending_alerts;
DROP POLICY IF EXISTS spending_alerts_insert_mcp_user ON public.spending_alerts;
DROP POLICY IF EXISTS spending_alerts_update_mcp_user ON public.spending_alerts;
DROP POLICY IF EXISTS complaints_select_mcp_user ON public.complaints;
DROP POLICY IF EXISTS complaints_insert_mcp_user ON public.complaints;

-- Read policies
CREATE POLICY accounts_select_mcp_user
  ON public.accounts FOR SELECT
  TO anon, authenticated
  USING (user_id = 'usr_marco_reyes');

CREATE POLICY transactions_select_mcp_user
  ON public.transactions FOR SELECT
  TO anon, authenticated
  USING (user_id = 'usr_marco_reyes');

CREATE POLICY bills_select_mcp_user
  ON public.bills FOR SELECT
  TO anon, authenticated
  USING (user_id = 'usr_marco_reyes');

CREATE POLICY bill_line_items_select_mcp_user
  ON public.bill_line_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bills b
      WHERE b.bill_id = bill_line_items.bill_id
        AND b.user_id = 'usr_marco_reyes'
    )
  );

CREATE POLICY subscriptions_select_mcp_user
  ON public.subscriptions FOR SELECT
  TO anon, authenticated
  USING (user_id = 'usr_marco_reyes');

CREATE POLICY spending_alerts_select_mcp_user
  ON public.spending_alerts FOR SELECT
  TO anon, authenticated
  USING (user_id = 'usr_marco_reyes');

CREATE POLICY complaints_select_mcp_user
  ON public.complaints FOR SELECT
  TO anon, authenticated
  USING (user_id = 'usr_marco_reyes');

-- Write policies needed by MCP tools
CREATE POLICY spending_alerts_insert_mcp_user
  ON public.spending_alerts FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id = 'usr_marco_reyes');

CREATE POLICY spending_alerts_update_mcp_user
  ON public.spending_alerts FOR UPDATE
  TO anon, authenticated
  USING (user_id = 'usr_marco_reyes')
  WITH CHECK (user_id = 'usr_marco_reyes');

CREATE POLICY complaints_insert_mcp_user
  ON public.complaints FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id = 'usr_marco_reyes');

COMMIT;
