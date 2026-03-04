import { describe, expect, it } from 'vitest';

import { getSubscriptionsAudit } from '../../src/mcp/tools/get_subscriptions_audit';

const TEST_TIMEOUT_MS = 30_000;

describe('getSubscriptionsAudit', () => {
  it('computes usage flags dynamically and marks Instacart+ as likely unused', async () => {
    const result = await getSubscriptionsAudit() as {
      subscriptions: Array<{
        subscription_id: string;
        merchant: string;
        usage_flag: string;
        usage_rationale?: string;
      }>;
      summary: {
        total_subscriptions: number;
        total_monthly_cost: number;
        potential_monthly_savings: number;
      };
    };

    expect(result.subscriptions.length).toBeGreaterThan(0);
    expect(result.summary.total_subscriptions).toBeGreaterThan(0);
    expect(result.summary.total_monthly_cost).toBeGreaterThan(0);

    const instacart = result.subscriptions.find((s) => s.subscription_id === 'sub_instacart');
    expect(instacart).toBeDefined();
    expect(instacart?.merchant).toMatch(/instacart/i);
    expect(instacart?.usage_flag).toBe('likely_unused');
    expect(instacart?.usage_rationale).toBeDefined();
    expect(instacart?.usage_rationale).toMatch(/no .*transactions found in the last 90 days/i);

    const hasLikelyUnused = result.subscriptions.some((s) => s.usage_flag === 'likely_unused');
    expect(hasLikelyUnused).toBe(true);
    expect(result.summary.potential_monthly_savings).toBeGreaterThan(0);
  }, TEST_TIMEOUT_MS);
});
