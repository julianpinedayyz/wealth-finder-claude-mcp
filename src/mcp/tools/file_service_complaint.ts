/**
 * src/mcp/tools/file_service_complaint.ts
 *
 * Purpose    : MCP tool — two-stage complaint filing. When confirm is false (default), returns
 *              a draft complaint for user review without any database write. When confirm is true,
 *              inserts the complaint into the complaints table and returns a confirmation_number.
 * Depends on : src/mcp/db.ts (Supabase client + USER_ID).
 * Consumed by: src/mcp/server.ts (registered as 'file_service_complaint').
 */

import { supabase, USER_ID } from '../db';
import { log } from '../logger';

export const FILE_SERVICE_COMPLAINT_DESCRIPTION =
  'Files a service complaint with a provider (e.g. Rogers Communications) about a billing issue. ' +
  'Two-stage flow: first call with confirm: false (or omit confirm) to see a draft of the complaint — ' +
  'nothing is submitted yet. Then call again with confirm: true to submit, which inserts a row into ' +
  'the complaints table and returns a confirmation_number (e.g. "WF-1740000000-4821"). ' +
  'Required: provider (e.g. "Rogers Communications"), bill_id, and reason. ' +
  'Optional: disputed_line_items and requested_resolution.';

interface ComplaintArgs {
  provider: string;
  bill_id: string;
  reason: string;
  disputed_line_items?: Array<{
    description: string;
    amount: number;
  }>;
  requested_resolution?: string;
  subject?: string;
  description?: string;
  amount_disputed?: number;
  confirm?: boolean;
}

function generateConfirmationNumber(): string {
  const ts     = Math.floor(Date.now() / 1000);
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `WF-${ts}-${random}`;
}

function generateProviderReference(provider: string): string {
  const slug   = provider.replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `${slug}-${random}`;
}

export async function fileServiceComplaint(args: ComplaintArgs): Promise<object> {
  const start = Date.now();
  const {
    provider,
    bill_id,
    reason,
    disputed_line_items = [],
    requested_resolution = 'Full credit of disputed amount',
    subject,
    description,
    amount_disputed,
    confirm = false,
  } = args;

  log.toolStart('file_service_complaint', args);
  const computedDisputedAmount = amount_disputed ?? disputed_line_items.reduce((sum, item) => (
    sum + Number(item.amount || 0)
  ), 0);

  const complaintSubject = subject ?? `Billing dispute for ${bill_id}`;
  const lineItemsText = disputed_line_items.length > 0
    ? `Disputed line items:\n${disputed_line_items.map((item) => (
      `- ${item.description}: $${Number(item.amount).toFixed(2)}`
    )).join('\n')}`
    : 'Disputed line items: (not provided)';
  const complaintDescription = description ?? (
    `Reason: ${reason}\n${lineItemsText}\nRequested resolution: ${requested_resolution}`
  );

  const draft = {
    user_id:               USER_ID,
    provider,
    subject:               complaintSubject,
    description:           complaintDescription,
    bill_id,
    amount_disputed:       computedDisputedAmount > 0 ? computedDisputedAmount : null,
    status:                'submitted',
    confirmation_number:   generateConfirmationNumber(),
    provider_reference:    generateProviderReference(provider),
    estimated_response_days: 5,
  };

  if (!confirm) {
    const ms = Date.now() - start;
    log.success('file_service_complaint', 200, ms, `DRAFT — not submitted | provider: ${provider}`);
    return {
      status: 'draft',
      message: `Review your complaint below. Call again with confirm: true to submit it to ${provider}.`,
      requested_resolution,
      disputed_line_items,
      complaint_preview: draft,
    };
  }

  log.query(
    `INSERT INTO complaints (user_id, provider, subject, description, bill_id, amount_disputed,\n` +
    `      status, confirmation_number, provider_reference, estimated_response_days)\n` +
    `    VALUES ('${USER_ID}', '${provider}', '${complaintSubject}', ..., '${bill_id}', ${computedDisputedAmount || 'NULL'},\n` +
    `      'submitted', '${draft.confirmation_number}', '${draft.provider_reference}', 5)`
  );

  const { data, error } = await supabase
    .from('complaints')
    .insert(draft)
    .select()
    .single();

  const ms = Date.now() - start;

  if (error) {
    log.error('file_service_complaint', error.message, ms);
    throw new Error(`Failed to file complaint: ${error.message}`);
  }

  log.success('file_service_complaint', 200, ms,
    `SUBMITTED | complaint_id: ${data?.complaint_id} | ref: ${data?.confirmation_number}`
  );

  return {
    status: 'submitted',
    message: `Complaint filed successfully with ${provider}. Keep your confirmation number for reference.`,
    complaint_id:           data?.complaint_id,
    confirmation_number:    data?.confirmation_number,
    provider_reference:     data?.provider_reference,
    estimated_response_days: data?.estimated_response_days,
    submitted_at:           data?.submitted_at,
  };
}
