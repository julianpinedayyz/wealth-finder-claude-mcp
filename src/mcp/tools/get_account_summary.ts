/**
 * src/mcp/tools/get_account_summary.ts
 *
 * Purpose    : MCP tool — returns all 7 financial accounts for usr_marco_reyes with balances,
 *              types, currency, credit limits, and metadata. No parameters required.
 * Depends on : src/mcp/db.ts (Supabase client + USER_ID).
 * Consumed by: src/mcp/server.ts (registered as 'get_account_summary').
 */

import { supabase, USER_ID } from '../db';
import { log } from '../logger';

export const GET_ACCOUNT_SUMMARY_DESCRIPTION =
  'Returns all financial accounts for the current user, including balances, account types, ' +
  'currency, credit limits, interest rates, and metadata. Call this tool first to orient the ' +
  'conversation — it gives a complete snapshot of the user\'s financial position across all 7 accounts.';

export async function getAccountSummary(): Promise<object> {
  const start = Date.now();

  log.toolStart('get_account_summary', {});
  log.query(`SELECT * FROM accounts WHERE user_id = '${USER_ID}' ORDER BY account_type`);

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', USER_ID)
    .order('account_type');

  const ms = Date.now() - start;

  if (error) {
    log.error('get_account_summary', error.message, ms);
    throw new Error(`Failed to fetch accounts: ${error.message}`);
  }

  const totalAssets = (data ?? [])
    .filter(a => (a.current_balance ?? 0) > 0)
    .reduce((s: number, a) => s + Number(a.current_balance), 0);

  const totalLiabilities = (data ?? [])
    .filter(a => (a.current_balance ?? 0) < 0)
    .reduce((s: number, a) => s + Math.abs(Number(a.current_balance)), 0);

  log.success('get_account_summary', 200, ms, `${data?.length ?? 0} accounts | assets $${totalAssets.toFixed(2)} | liabilities $${totalLiabilities.toFixed(2)}`);

  return {
    accounts: data ?? [],
    summary: {
      total_accounts: data?.length ?? 0,
      total_assets_cad: totalAssets,
      total_liabilities_cad: totalLiabilities,
      net_worth_cad: totalAssets - totalLiabilities,
    },
  };
}
