/**
 * src/mcp/tools/get_transactions.ts
 *
 * Purpose    : MCP tool — returns a filtered list of transactions. Supports filtering by
 *              account_id, category, category_group, merchant (partial match), date_from,
 *              date_to, direction (debit/credit), and a row limit (default 50, max 200).
 * Depends on : src/mcp/db.ts (Supabase client + USER_ID).
 * Consumed by: src/mcp/server.ts (registered as 'get_transactions').
 */

import { supabase, USER_ID } from '../db';
import { log } from '../logger';

export const GET_TRANSACTIONS_DESCRIPTION =
  'Returns a filtered list of transactions across all accounts. All filters are optional. ' +
  'Filter by account_id (e.g. "acc_chq_001"), category (e.g. "dining"), category_group (e.g. "FOOD"), ' +
  'merchant (partial text match), date_from and date_to (YYYY-MM-DD), direction ("debit" or "credit"), ' +
  'and limit (default 50, max 200). Results are ordered by date descending. ' +
  'Use this tool when the user asks to see specific transactions, search for a merchant, or verify a charge.';

interface TransactionArgs {
  account_id?: string;
  category?: string;
  category_group?: string;
  merchant?: string;
  date_from?: string;
  date_to?: string;
  direction?: 'debit' | 'credit';
  limit?: number;
}

export async function getTransactions(args: TransactionArgs): Promise<object> {
  const start = Date.now();
  const { account_id, category, category_group, merchant, date_from, date_to, direction, limit = 50 } = args;
  const safeLimit = Math.min(limit, 200);

  log.toolStart('get_transactions', args);

  const filters: string[] = [`user_id = '${USER_ID}'`];
  if (account_id)      filters.push(`account_id = '${account_id}'`);
  if (category)        filters.push(`category = '${category}'`);
  if (category_group)  filters.push(`category_group = '${category_group}'`);
  if (merchant)        filters.push(`merchant ILIKE '%${merchant}%'`);
  if (date_from)       filters.push(`date >= '${date_from}'`);
  if (date_to)         filters.push(`date <= '${date_to}'`);
  if (direction)       filters.push(`direction = '${direction}'`);

  log.query(
    `SELECT * FROM transactions\n` +
    `    WHERE ${filters.join('\n      AND ')}\n` +
    `    ORDER BY date DESC\n` +
    `    LIMIT ${safeLimit}`
  );

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', USER_ID)
    .order('date', { ascending: false })
    .limit(safeLimit);

  if (account_id)     query = query.eq('account_id', account_id);
  if (category)       query = query.eq('category', category);
  if (category_group) query = query.eq('category_group', category_group);
  if (merchant)       query = query.ilike('merchant', `%${merchant}%`);
  if (date_from)      query = query.gte('date', date_from);
  if (date_to)        query = query.lte('date', date_to);
  if (direction)      query = query.eq('direction', direction);

  const { data, error } = await query;
  const ms = Date.now() - start;

  if (error) {
    log.error('get_transactions', error.message, ms);
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  log.success('get_transactions', 200, ms, `${data?.length ?? 0} transactions returned`);

  return {
    transactions: data ?? [],
    count: data?.length ?? 0,
    filters_applied: args,
  };
}
