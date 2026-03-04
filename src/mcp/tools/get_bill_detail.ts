/**
 * src/mcp/tools/get_bill_detail.ts
 *
 * Purpose    : MCP tool — returns the full bill record for a given bill_id, including all
 *              line items from bill_line_items. This is the drill-down view after get_bills_due.
 * Depends on : src/mcp/db.ts (Supabase client + USER_ID).
 * Consumed by: src/mcp/server.ts (registered as 'get_bill_detail').
 */

import { supabase, USER_ID } from '../db';
import { log } from '../logger';

export const GET_BILL_DETAIL_DESCRIPTION =
  'Returns the full details of a specific bill, including all line items that make up the total charge. ' +
  'Requires a bill_id (e.g. "bill_rogers_phone_2026_02"). ' +
  'Call get_bills_due first to find the bill_id, then call this tool to see the breakdown. ' +
  'Use this tool when the user wants to know exactly what is on a specific bill — especially useful ' +
  'for investigating anomalous charges. ' +
  'Only call this tool when the user explicitly asks for bill line items or a full breakdown. ' +
  'Do not call it proactively when summarising bills — wait for the user to request the detail.';

interface BillDetailArgs {
  bill_id: string;
}

export async function getBillDetail(args: BillDetailArgs): Promise<object> {
  const start = Date.now();
  const { bill_id } = args;

  log.toolStart('get_bill_detail', args);
  log.query(
    `SELECT b.*, bli.line_item_id, bli.description, bli.amount AS line_amount,\n` +
    `           bli.date_from, bli.date_to\n` +
    `    FROM bills b\n` +
    `    LEFT JOIN bill_line_items bli ON bli.bill_id = b.bill_id\n` +
    `    WHERE b.bill_id = '${bill_id}' AND b.user_id = '${USER_ID}'`
  );

  const [billResult, lineItemsResult] = await Promise.all([
    supabase
      .from('bills')
      .select('*')
      .eq('bill_id', bill_id)
      .eq('user_id', USER_ID)
      .single(),
    supabase
      .from('bill_line_items')
      .select('*')
      .eq('bill_id', bill_id)
      .order('date_from', { ascending: true }),
  ]);

  const ms = Date.now() - start;

  if (billResult.error) {
    log.error('get_bill_detail', billResult.error.message, ms);
    throw new Error(`Bill not found: ${billResult.error.message}`);
  }
  if (lineItemsResult.error) {
    log.error('get_bill_detail', lineItemsResult.error.message, ms);
    throw new Error(`Failed to fetch bill line items: ${lineItemsResult.error.message}`);
  }

  const bill = billResult.data;
  const lineItems = lineItemsResult.data ?? [];

  log.success('get_bill_detail', 200, ms,
    `bill ${bill_id} | $${bill.current_amount} | ${lineItems.length} line item(s)`
  );

  return {
    bill,
    line_items: lineItems,
    line_items_count: lineItems.length,
    line_items_sum: Math.round(lineItems.reduce((s, li) => s + Number(li.amount), 0) * 100) / 100,
  };
}
