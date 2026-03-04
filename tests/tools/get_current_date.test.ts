import { describe, expect, it } from 'vitest';

import { getCurrentDate } from '../../src/mcp/tools/get_current_date';

describe('getCurrentDate', () => {
  it('returns current date fields in the expected format', () => {
    const result = getCurrentDate() as {
      iso: string;
      date: string;
      month: string;
      year: string;
      display: string;
    };

    expect(result.iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.month).toMatch(/^\d{4}-\d{2}$/);
    expect(result.year).toMatch(/^\d{4}$/);
    expect(result.display.length).toBeGreaterThan(0);

    expect(result.date).toBe(result.iso.slice(0, 10));
    expect(result.month).toBe(result.iso.slice(0, 7));
    expect(result.year).toBe(String(new Date(result.iso).getUTCFullYear()));
  });
});
