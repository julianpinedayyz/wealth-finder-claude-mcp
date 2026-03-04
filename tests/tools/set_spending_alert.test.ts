import { describe, expect, it } from 'vitest';

import { setSpendingAlert } from '../../src/mcp/tools/set_spending_alert';

const TEST_TIMEOUT_MS = 30_000;

describe('setSpendingAlert', () => {
  it('returns draft when confirm is false', async () => {
    const result = await setSpendingAlert({
      category: 'dining',
      category_group: 'FOOD',
      monthly_limit: 400,
      confirm: false,
    }) as {
      status: string;
      alert_id?: string;
      alert_preview?: { category: string };
    };

    expect(result.status).toBe('draft');
    expect(result.alert_id).toBeUndefined();
    expect(result.alert_preview).toBeDefined();
  }, TEST_TIMEOUT_MS);

  it('saves alert when confirm is true', async () => {
    const result = await setSpendingAlert({
      category: 'dining_test_vitest',
      category_group: 'FOOD',
      monthly_limit: 999,
      confirm: true,
    }) as {
      status: string;
      alert?: { alert_id?: string };
    };

    expect(result.status).toBe('saved');
    expect(result.alert?.alert_id).toBeDefined();
  }, TEST_TIMEOUT_MS);

  it('supports idempotent upsert on repeated confirm=true calls', async () => {
    await expect(
      setSpendingAlert({
        category: 'dining_test_vitest',
        category_group: 'FOOD',
        monthly_limit: 999,
        confirm: true,
      })
    ).resolves.toBeDefined();
  }, TEST_TIMEOUT_MS);
});
