import { describe, expect, it } from 'vitest';

import { getSpendingByCategory } from '../../src/mcp/tools/get_spending_by_category';

const TEST_TIMEOUT_MS = 30_000;

describe('getSpendingByCategory', () => {
  it('returns categories and positive total for 2026-02', async () => {
    const result = await getSpendingByCategory({ month: '2026-02' }) as {
      categories: Array<{ category: string; category_group: string }>;
      total_spending: number;
    };

    expect(Array.isArray(result.categories)).toBe(true);
    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.total_spending).toBeGreaterThan(0);

    const hasFood = result.categories.some(
      (c) => c.category === 'dining' || c.category_group === 'FOOD'
    );
    expect(hasFood).toBe(true);
  }, TEST_TIMEOUT_MS);

  it('respects limit argument', async () => {
    const result = await getSpendingByCategory({ month: '2026-02', limit: 3 }) as {
      categories: unknown[];
    };

    expect(result.categories.length).toBeLessThanOrEqual(3);
  }, TEST_TIMEOUT_MS);

  it('returns comparison fields when compare_to_month is provided', async () => {
    const result = await getSpendingByCategory({
      month: '2026-02',
      compare_to_month: '2026-01',
    }) as {
      previous_categories: unknown[];
      month_over_month_change: number;
    };

    expect(Array.isArray(result.previous_categories)).toBe(true);
    expect(typeof result.month_over_month_change).toBe('number');
  }, TEST_TIMEOUT_MS);
});
