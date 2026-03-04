/**
 * src/mcp/tools/set_spending_alert.ts
 *
 * Purpose    : MCP tool — two-stage spending alert creation. When confirm is false (default),
 *              returns a preview of the alert to be created without writing to the database.
 *              When confirm is true, upserts the alert into the spending_alerts table.
 * Depends on : src/mcp/db.ts (Supabase client + USER_ID).
 * Consumed by: src/mcp/server.ts (registered as 'set_spending_alert').
 */

import { supabase, USER_ID } from '../db';
import { log } from '../logger';

export const SET_SPENDING_ALERT_DESCRIPTION =
  'Creates or updates a monthly spending alert for a specific category. ' +
  'First call with confirm: false (or omit confirm) to preview the alert — no database write occurs. ' +
  'Then call again with confirm: true to save it. Required fields: category (e.g. "dining"), ' +
  'category_group (e.g. "FOOD"), and monthly_limit (number in CAD). ' +
  'Optional: alert_threshold_pct (default 80) — percentage of the limit that triggers the alert. ' +
  'Use this tool when the user wants to set a budget or spending cap for any category.';

interface SpendingAlertArgs {
  category: string;
  category_group: string;
  monthly_limit: number;
  alert_threshold_pct?: number;
  confirm?: boolean;
}

export async function setSpendingAlert(args: SpendingAlertArgs): Promise<object> {
  const start = Date.now();
  const { category, category_group, monthly_limit, alert_threshold_pct = 80, confirm = false } = args;

  log.toolStart('set_spending_alert', args);

  const draft = {
    user_id: USER_ID,
    category,
    category_group,
    monthly_limit,
    alert_threshold_pct,
    active: true,
  };

  if (!confirm) {
    const ms = Date.now() - start;
    log.success('set_spending_alert', 200, ms, `DRAFT — not saved | category: ${category} | limit: $${monthly_limit}`);
    return {
      status: 'draft',
      message: `Ready to set a $${monthly_limit}/month alert for ${category}. Call again with confirm: true to save.`,
      alert_preview: draft,
    };
  }

  log.query(
    `INSERT INTO spending_alerts (user_id, category, category_group, monthly_limit, alert_threshold_pct, active)\n` +
    `    VALUES ('${USER_ID}', '${category}', '${category_group}', ${monthly_limit}, ${alert_threshold_pct}, true)\n` +
    `    ON CONFLICT (user_id, category) DO UPDATE SET monthly_limit = ${monthly_limit},\n` +
    `      alert_threshold_pct = ${alert_threshold_pct}, active = true, updated_at = NOW()`
  );

  const { data, error } = await supabase
    .from('spending_alerts')
    .upsert(draft, { onConflict: 'user_id,category' })
    .select()
    .single();

  const ms = Date.now() - start;

  if (error) {
    log.error('set_spending_alert', error.message, ms);
    throw new Error(`Failed to save spending alert: ${error.message}`);
  }

  log.success('set_spending_alert', 200, ms, `SAVED | alert_id: ${data?.alert_id} | ${category} ≤ $${monthly_limit}/mo`);

  return {
    status: 'saved',
    message: `Spending alert set: you'll be notified when ${category} spending reaches ${alert_threshold_pct}% of your $${monthly_limit}/month limit.`,
    alert: data,
  };
}
