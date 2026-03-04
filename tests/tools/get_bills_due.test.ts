import { describe, expect, it } from 'vitest';

import { getBillsDue } from '../../src/mcp/tools/get_bills_due';

const TEST_TIMEOUT_MS = 30_000;

describe('getBillsDue', () => {
  it('returns expected bill set and anomaly signals for 2026-02', async () => {
    const result = await getBillsDue({ month: '2026-02' }) as {
      bills: Array<{ bill_id: string; anomaly_flag: boolean }>;
      total_due: number;
      anomaly_count: number;
    };

    expect(Array.isArray(result.bills)).toBe(true);
    expect(result.bills.length).toBeGreaterThan(0);
    expect(result.total_due).toBeGreaterThan(0);
    expect(result.anomaly_count).toBeGreaterThanOrEqual(1);

    const rogersBill = result.bills.find((b) => b.bill_id === 'bill_rogers_phone_2026_02');
    expect(rogersBill).toBeDefined();
    expect(rogersBill?.anomaly_flag).toBe(true);
  }, TEST_TIMEOUT_MS);
});
