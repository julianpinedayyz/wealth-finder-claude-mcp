/**
 * src/mcp/tools/get_subscriptions_audit.ts
 *
 * Purpose    : MCP tool — returns recurring subscriptions with usage_flag computed dynamically
 *              from transaction history, plus rationale and savings summary.
 * Depends on : src/mcp/db.ts (Supabase client + USER_ID).
 * Consumed by: src/mcp/server.ts (registered as 'get_subscriptions_audit').
 */

import { supabase, USER_ID } from '../db';
import { log } from '../logger';

export const GET_SUBSCRIPTIONS_AUDIT_DESCRIPTION =
  'Returns recurring subscriptions with dynamic usage activity flags computed from transaction history: ' +
  '"active" (matching transaction within 30 days), "possibly_unused" (31–90 days), or "likely_unused" ' +
  '(90+ days or no matches). Each subscription includes a usage_rationale describing the evidence. ' +
  'Also returns total monthly subscription cost and a breakdown by usage status.';

type UsageFlag = 'active' | 'possibly_unused' | 'likely_unused';

interface SubscriptionRow {
  subscription_id: string;
  merchant: string;
  monthly_amount: number;
  usage_flag: UsageFlag;
  last_activity_date: string | null;
  usage_category?: string | null;
  usage_merchant_keyword?: string | null;
  usage_rationale?: string;
  notes?: string | null;
  [key: string]: unknown;
}

interface TransactionRow {
  date: string;
  merchant: string;
  category: string;
  category_group?: string | null;
}

const USAGE_CATEGORY_ALIASES: Record<string, string[]> = {
  food_delivery: ['food_delivery', 'delivery'],
  rideshare: ['rideshare'],
  groceries: ['groceries'],
  shopping: ['shopping', 'amazon_general'],
};

function normalizeText(input: string | null | undefined): string {
  return String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function categoryCandidates(usageCategory: string | null | undefined): string[] {
  const raw = String(usageCategory ?? '').toLowerCase().trim();
  if (!raw) return [];
  return USAGE_CATEGORY_ALIASES[raw] ?? [raw];
}

export async function getSubscriptionsAudit(): Promise<object> {
  const start = Date.now();

  log.toolStart('get_subscriptions_audit', {});
  log.query(
    `SELECT * FROM subscriptions\n` +
    `    WHERE user_id = '${USER_ID}'\n` +
    `    ORDER BY monthly_amount DESC`
  );

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', USER_ID)
    .order('monthly_amount', { ascending: false });

  if (error) {
    log.error('get_subscriptions_audit', error.message, Date.now() - start);
    throw new Error(`Failed to fetch subscriptions: ${error.message}`);
  }

  log.query(
    `SELECT date, merchant, category, category_group FROM transactions\n` +
    `    WHERE user_id = '${USER_ID}' AND direction = 'debit'\n` +
    `    ORDER BY date DESC`
  );

  const { data: txData, error: txError } = await supabase
    .from('transactions')
    .select('date,merchant,category,category_group')
    .eq('user_id', USER_ID)
    .eq('direction', 'debit')
    .order('date', { ascending: false });

  if (txError) {
    log.error('get_subscriptions_audit', txError.message, Date.now() - start);
    throw new Error(`Failed to fetch transactions for subscription audit: ${txError.message}`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const txns = (txData ?? []) as TransactionRow[];
  const subs = (data ?? []) as SubscriptionRow[];

  const enrichedSubs = subs.map((sub) => {
    const candidates = categoryCandidates(sub.usage_category);
    const keywordNormalized = normalizeText(sub.usage_merchant_keyword);

    const latestMatch = txns.find((tx) => {
      const txCategory = String(tx.category ?? '').toLowerCase();
      const txCategoryGroup = String(tx.category_group ?? '').toLowerCase();
      const categoryMatch =
        candidates.length === 0 ||
        candidates.includes(txCategory) ||
        candidates.includes(txCategoryGroup);
      const merchantMatch =
        keywordNormalized.length === 0 ||
        normalizeText(tx.merchant).includes(keywordNormalized);

      return categoryMatch && merchantMatch;
    });

    const lastDateString = latestMatch?.date ?? null;

    if (!lastDateString) {
      return {
        ...sub,
        usage_flag: 'likely_unused' as UsageFlag,
        last_activity_date: null,
        usage_rationale: `No ${sub.usage_category ?? 'matching'} transactions found in the last 90 days`,
      };
    }

    const lastDate = new Date(`${lastDateString}T00:00:00.000Z`);
    let usageFlag: UsageFlag = 'likely_unused';

    if (lastDate >= thirtyDaysAgo) {
      usageFlag = 'active';
    } else if (lastDate >= ninetyDaysAgo) {
      usageFlag = 'possibly_unused';
    }

    return {
      ...sub,
      usage_flag: usageFlag,
      last_activity_date: lastDateString,
      usage_rationale: `Last ${sub.usage_category ?? 'matching'} transaction: ${lastDateString}`,
    };
  });

  const totalMonthly = enrichedSubs.reduce((s, sub) => s + Number(sub.monthly_amount), 0);
  const likelyUnused = enrichedSubs.filter(s => s.usage_flag === 'likely_unused');
  const possiblyUnused = enrichedSubs.filter(s => s.usage_flag === 'possibly_unused');
  const potentialSavings = likelyUnused.reduce((s, sub) => s + Number(sub.monthly_amount), 0);
  const ms = Date.now() - start;

  log.success('get_subscriptions_audit', 200, ms,
    `${enrichedSubs.length} subscriptions | $${totalMonthly.toFixed(2)}/mo | ${likelyUnused.length} likely unused`
  );

  return {
    subscriptions: enrichedSubs,
    summary: {
      total_subscriptions: enrichedSubs.length,
      total_monthly_cost: Math.round(totalMonthly * 100) / 100,
      total_annual_cost: Math.round(totalMonthly * 12 * 100) / 100,
      active_count: enrichedSubs.filter(s => s.usage_flag === 'active').length,
      possibly_unused_count: possiblyUnused.length,
      likely_unused_count: likelyUnused.length,
      potential_monthly_savings: Math.round(potentialSavings * 100) / 100,
    },
    likely_unused: likelyUnused.map(s => ({
      subscription_id: s.subscription_id,
      merchant: s.merchant,
      monthly_amount: s.monthly_amount,
      last_activity_date: s.last_activity_date,
      usage_rationale: s.usage_rationale,
      notes: s.notes,
    })),
  };
}
