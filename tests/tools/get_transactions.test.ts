import { describe, expect, it } from 'vitest';

import { getTransactions } from '../../src/mcp/tools/get_transactions';

const TEST_TIMEOUT_MS = 30_000;

describe('getTransactions', () => {
  it('returns up to 50 transactions by default', async () => {
    const result = await getTransactions({}) as {
      transactions: unknown[];
      count: number;
    };

    expect(result.count).toBeLessThanOrEqual(50);
    expect(result.transactions.length).toBeLessThanOrEqual(50);
  }, TEST_TIMEOUT_MS);

  it('filters by category', async () => {
    const result = await getTransactions({ category: 'dining' }) as {
      transactions: Array<{ category: string }>;
    };

    expect(result.transactions.every((t) => t.category === 'dining')).toBe(true);
  }, TEST_TIMEOUT_MS);

  it('filters by date range inclusively', async () => {
    const from = '2026-02-01';
    const to = '2026-02-28';

    const result = await getTransactions({ date_from: from, date_to: to }) as {
      transactions: Array<{ date: string }>;
    };

    expect(
      result.transactions.every((t) => t.date >= from && t.date <= to)
    ).toBe(true);
  }, TEST_TIMEOUT_MS);

  it('respects row limit', async () => {
    const result = await getTransactions({ limit: 5 }) as {
      transactions: unknown[];
    };

    expect(result.transactions.length).toBeLessThanOrEqual(5);
  }, TEST_TIMEOUT_MS);

  it('filters by direction', async () => {
    const result = await getTransactions({ direction: 'debit' }) as {
      transactions: Array<{ direction: string }>;
    };

    expect(result.transactions.every((t) => t.direction === 'debit')).toBe(true);
  }, TEST_TIMEOUT_MS);
});
