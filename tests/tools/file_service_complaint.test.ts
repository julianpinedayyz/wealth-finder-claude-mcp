import { describe, expect, it } from 'vitest';

import { fileServiceComplaint } from '../../src/mcp/tools/file_service_complaint';

const TEST_TIMEOUT_MS = 30_000;

describe('fileServiceComplaint', () => {
  it('returns draft preview when confirm is false', async () => {
    const result = await fileServiceComplaint({
      provider: 'Rogers',
      bill_id: 'bill_rogers_phone_2026_02',
      reason: 'Incorrect roaming charge',
      confirm: false,
    }) as {
      status: string;
      complaint_preview?: Record<string, unknown>;
      complaint_id?: string;
    };

    expect(result.status).toBe('draft');
    expect(result.complaint_preview).toBeDefined();
    expect(result.complaint_id).toBeUndefined();
  }, TEST_TIMEOUT_MS);

  it('submits complaint when confirm is true', async () => {
    const result = await fileServiceComplaint({
      provider: 'Rogers',
      bill_id: 'bill_rogers_phone_2026_02',
      reason: 'Incorrect roaming charge',
      confirm: true,
    }) as {
      status: string;
      confirmation_number?: string;
      complaint_id?: string;
    };

    expect(result.status).toBe('submitted');
    expect(result.confirmation_number).toMatch(/^WF-\d+-\d+$/);
    expect(result.complaint_id).toBeDefined();
  }, TEST_TIMEOUT_MS);
});
