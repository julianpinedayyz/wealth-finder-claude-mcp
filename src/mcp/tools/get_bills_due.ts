/**
 * src/mcp/tools/get_bills_due.ts
 *
 * Purpose    : MCP tool — returns all recurring bills for a given month (YYYY-MM format).
 *              Highlights any bill where anomaly_flag is true. Sorted by due_date ascending.
 * Depends on : src/mcp/db.ts (Supabase client + USER_ID).
 * Consumed by: src/mcp/server.ts (registered as 'get_bills_due').
 */

import { supabase, USER_ID } from '../db';
import { log } from '../logger';

export const GET_BILLS_DUE_DESCRIPTION =
  'Returns all recurring bills for a given month (format: YYYY-MM, e.g. "2026-02"), including ' +
  'provider, amount, autopay status, and anomaly flags. A bill is flagged as an anomaly when its ' +
  'current_amount is significantly higher than the typical_amount. ' +
  'Use this tool when the user asks about upcoming bills, monthly expenses, or wants to know if ' +
  'anything looks unusual on their bill statements.';

interface BillsDueArgs {
  month: string;
}

export async function getBillsDue(args: BillsDueArgs): Promise<object> {
  const start = Date.now();
  const { month } = args;

  log.toolStart('get_bills_due', args);
  log.query(
    `SELECT * FROM bills\n` +
    `    WHERE user_id = '${USER_ID}' AND due_month = '${month}'\n` +
    `    ORDER BY due_date ASC`
  );

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('due_month', month)
    .order('due_date', { ascending: true });

  const ms = Date.now() - start;

  if (error) {
    log.error('get_bills_due', error.message, ms);
    throw new Error(`Failed to fetch bills: ${error.message}`);
  }

  const bills = data ?? [];
  const anomalies = bills.filter(b => b.anomaly_flag);
  const totalDue = bills.reduce((s, b) => s + Number(b.current_amount), 0);

  log.success('get_bills_due', 200, ms,
    `${bills.length} bills | total $${totalDue.toFixed(2)} | ${anomalies.length} anomaly${anomalies.length !== 1 ? 'ies' : ''}`
  );

  return {
    month,
    bills,
    total_due: Math.round(totalDue * 100) / 100,
    anomaly_count: anomalies.length,
    anomalies: anomalies.map(b => ({
      bill_id: b.bill_id,
      provider: b.provider,
      current_amount: b.current_amount,
      typical_amount: b.typical_amount,
      anomaly_reason: b.anomaly_reason,
    })),
  };
}
