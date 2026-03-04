import { describe, expect, it } from 'vitest';

import { getAccountSummary } from '../../src/mcp/tools/get_account_summary';

const TEST_TIMEOUT_MS = 30_000;

describe('getAccountSummary', () => {
  it('returns account inventory and summary fields', async () => {
    const result = await getAccountSummary() as {
      accounts: Array<{
        account_id: string;
        account_type: string;
        metadata?: {
          rewards_type?: string;
          earn_rates?: Record<string, number>;
          points_to_cad?: number;
        };
      }>;
      summary: { total_accounts: number; net_worth_cad: number };
    };

    expect(result.accounts.length).toBeGreaterThan(0);
    expect(result.summary.total_accounts).toBe(result.accounts.length);
    expect(typeof result.summary.net_worth_cad).toBe('number');

    const chequing = result.accounts.find((a) => a.account_id === 'acc_chq_001');
    expect(chequing).toBeDefined();
    expect(chequing?.account_type).toBe('chequing');

    const pointsCard = result.accounts.find((a) => (
      a.account_id === 'acc_cc_points_001' || a.metadata?.rewards_type === 'points'
    ));
    expect(pointsCard).toBeDefined();
    expect(pointsCard?.metadata?.earn_rates).toBeDefined();
    expect(typeof pointsCard?.metadata?.earn_rates?.dining).toBe('number');
    expect(typeof pointsCard?.metadata?.earn_rates?.default).toBe('number');
    expect(pointsCard?.metadata?.points_to_cad).toBe(0.01);

    const cashbackCard = result.accounts.find((a) => (
      a.account_id === 'acc_cc_cash_001' || a.metadata?.rewards_type === 'cashback'
    ));
    expect(cashbackCard).toBeDefined();
    expect(cashbackCard?.metadata?.earn_rates).toBeDefined();
    expect(typeof cashbackCard?.metadata?.earn_rates?.groceries).toBe('number');
    expect(typeof cashbackCard?.metadata?.earn_rates?.dining).toBe('number');
    expect(typeof cashbackCard?.metadata?.earn_rates?.default).toBe('number');
  }, TEST_TIMEOUT_MS);
});
