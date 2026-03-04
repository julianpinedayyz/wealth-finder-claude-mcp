/**
 * src/mcp/tools/get_spending_by_category.ts
 *
 * Purpose    : MCP tool — returns debit spending totals grouped by category_group and category
 *              for a given month (YYYY-MM). Optionally compares to the prior month.
 * Depends on : src/mcp/db.ts (Supabase client + USER_ID).
 * Consumed by: src/mcp/server.ts (registered as 'get_spending_by_category').
 */

import { supabase, USER_ID } from '../db';
import { log } from '../logger';

export const GET_SPENDING_BY_CATEGORY_DESCRIPTION =
  'Returns spending totals grouped by category for a given month (format: YYYY-MM, e.g. "2026-02"). ' +
  'Use compare_to_month (optional) to compare against a different month, or compare_previous_month for prior-month comparison. ' +
  'Set limit (optional, default 10) to control how many categories are returned. ' +
  'Only debit transactions are included. Use this tool when the user asks about their spending, ' +
  'top categories, or wants to understand where their money went in a specific period.';

interface SpendingArgs {
  month: string;
  compare_to_month?: string;
  compare_previous_month?: boolean;
  limit?: number;
}

interface CategoryRow {
  category_group: string;
  category: string;
  total: number;
  txn_count: number;
}

async function fetchSpending(dateFrom: string, dateTo: string, limit: number): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('category_group, category, amount')
    .eq('user_id', USER_ID)
    .eq('direction', 'debit')
    .gte('date', dateFrom)
    .lte('date', dateTo);

  if (error) throw new Error(error.message);

  const grouped: Record<string, CategoryRow> = {};
  for (const row of data ?? []) {
    const key = `${row.category_group}::${row.category}`;
    if (!grouped[key]) {
      grouped[key] = { category_group: row.category_group, category: row.category, total: 0, txn_count: 0 };
    }
    grouped[key].total = Math.round((grouped[key].total + Number(row.amount)) * 100) / 100;
    grouped[key].txn_count++;
  }

  return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, limit);
}

function monthBounds(ym: string): { from: string; to: string } {
  const [y, m] = ym.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: `${ym}-01`,
    to:   `${ym}-${String(lastDay).padStart(2, '0')}`,
  };
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export async function getSpendingByCategory(args: SpendingArgs): Promise<object> {
  const start = Date.now();
  const {
    month,
    compare_to_month,
    compare_previous_month = false,
    limit = 10,
  } = args;
  const safeLimit = Math.max(1, Math.min(limit, 200));

  log.toolStart('get_spending_by_category', args);
  const bounds = monthBounds(month);
  log.query(
    `SELECT category_group, category, SUM(amount) AS total, COUNT(*) AS txn_count\n` +
    `    FROM transactions\n` +
    `    WHERE user_id = '${USER_ID}' AND direction = 'debit'\n` +
    `      AND date >= '${bounds.from}' AND date <= '${bounds.to}'\n` +
    `    GROUP BY category_group, category ORDER BY total DESC\n` +
    `    LIMIT ${safeLimit}`
  );

  const current = await fetchSpending(bounds.from, bounds.to, safeLimit);
  const ms = Date.now() - start;

  const grandTotal = current.reduce((s, r) => s + r.total, 0);
  log.success('get_spending_by_category', 200, ms, `${current.length} categories | total $${grandTotal.toFixed(2)}`);

  const result: Record<string, unknown> = {
    month,
    limit: safeLimit,
    categories: current,
    total_spending: Math.round(grandTotal * 100) / 100,
  };

  if (compare_to_month || compare_previous_month) {
    const prev = compare_to_month ?? prevMonth(month);
    const prevBounds = monthBounds(prev);
    const previous = await fetchSpending(prevBounds.from, prevBounds.to, safeLimit);
    const prevTotal = previous.reduce((s, r) => s + r.total, 0);
    result.previous_month = prev;
    result.previous_categories = previous;
    result.previous_total_spending = Math.round(prevTotal * 100) / 100;
    result.month_over_month_change = Math.round((grandTotal - prevTotal) * 100) / 100;
  }

  return result;
}
