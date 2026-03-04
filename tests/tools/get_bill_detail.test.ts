import { describe, expect, it } from 'vitest';

import { getBillDetail } from '../../src/mcp/tools/get_bill_detail';

const TEST_TIMEOUT_MS = 30_000;

describe('getBillDetail', () => {
  it('returns bill and line item details for the Rogers February bill', async () => {
    const result = await getBillDetail({ bill_id: 'bill_rogers_phone_2026_02' }) as {
      bill: Record<string, unknown>;
      line_items: Array<{ amount: number; description?: string }>;
      line_items_sum: number;
    };

    expect(result.bill).toBeDefined();
    expect(Array.isArray(result.line_items)).toBe(true);
    expect(result.line_items.length).toBeGreaterThan(0);

    const hasApproxRoamingCharge = result.line_items.some(
      (li) => Math.abs(Number(li.amount) - 98.43) <= 1.0
    );
    const hasSplitRoamingCharge = Math.abs(
      result.line_items.reduce((sum, li) => (
        /roaming/i.test(String(li.description ?? ''))
          ? sum + Number(li.amount)
          : sum
      ), 0) - 98.43
    ) <= 1.0;
    expect(hasApproxRoamingCharge || hasSplitRoamingCharge).toBe(true);

    expect(typeof result.line_items_sum).toBe('number');
    expect(result.line_items_sum).toBeGreaterThan(0);
  }, TEST_TIMEOUT_MS);

  it('throws for invalid bill_id', async () => {
    await expect(getBillDetail({ bill_id: 'bill_invalid_vitest_404' })).rejects.toThrow();
  }, TEST_TIMEOUT_MS);
});
