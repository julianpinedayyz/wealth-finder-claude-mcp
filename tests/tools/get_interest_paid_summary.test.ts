import { describe, expect, it } from 'vitest';

import { getInterestPaidSummary } from '../../src/mcp/tools/get_interest_paid_summary';

const TEST_TIMEOUT_MS = 30_000;

describe('getInterestPaidSummary', () => {
  it('returns positive interest totals for 2025', async () => {
    const result = await getInterestPaidSummary({ year: '2025' }) as {
      total_interest_paid: number;
      charge_count: number;
      payoff_projection: {
        current_monthly_payment: number;
        scenarios: Array<{
          monthly_payment: number;
          months_to_payoff: number | null;
          total_interest_paid: number | null;
        }>;
      };
    };

    expect(result.total_interest_paid).toBeGreaterThan(0);
    expect(result.charge_count).toBeGreaterThan(0);
    expect(result.payoff_projection.current_monthly_payment).toBeGreaterThan(0);
    expect(result.payoff_projection.scenarios).toHaveLength(4);

    for (const scenario of result.payoff_projection.scenarios) {
      expect(scenario).toHaveProperty('monthly_payment');
      expect(scenario).toHaveProperty('months_to_payoff');
      expect(scenario).toHaveProperty('total_interest_paid');
    }

    const plus200 = result.payoff_projection.current_monthly_payment + 200;
    const hasPlus200Scenario = result.payoff_projection.scenarios.some(
      (scenario) => scenario.monthly_payment === plus200
    );
    expect(hasPlus200Scenario).toBe(true);
  }, TEST_TIMEOUT_MS);

  it('runs with no year argument and defaults to current year', async () => {
    const result = await getInterestPaidSummary({}) as { year: string };

    expect(result.year).toBe(String(new Date().getFullYear()));
  }, TEST_TIMEOUT_MS);

  it('runs with explicit year and account_id', async () => {
    await expect(
      getInterestPaidSummary({ year: '2026', account_id: 'acc_loc_001' })
    ).resolves.toBeDefined();
  }, TEST_TIMEOUT_MS);
});
