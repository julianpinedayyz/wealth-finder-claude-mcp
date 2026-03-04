/**
 * src/mcp/server.ts
 *
 * Purpose    : Entry point for the Wealth Finder MCP server. Registers all 10 financial tools
 *              and connects to Claude Desktop via stdio transport.
 * Depends on : src/mcp/db.ts, src/mcp/system_prompt.ts, src/mcp/tools/*, src/mcp/logger.ts
 * Consumed by: Claude Desktop (via npx ts-node src/mcp/server.ts), npm run dev:mcp
 *
 * Usage:
 *   npm run dev:mcp
 *   npx ts-node src/mcp/server.ts
 */

import 'dotenv/config';
import { appendFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { initInteractionLog, logInteraction } from './interaction_log';
import { LOG_FILE } from './logger';
import { SYSTEM_PROMPT } from './system_prompt';

import { getAccountSummary,       GET_ACCOUNT_SUMMARY_DESCRIPTION       } from './tools/get_account_summary';
import { getSpendingByCategory,   GET_SPENDING_BY_CATEGORY_DESCRIPTION   } from './tools/get_spending_by_category';
import { getTransactions,         GET_TRANSACTIONS_DESCRIPTION           } from './tools/get_transactions';
import { getBillsDue,             GET_BILLS_DUE_DESCRIPTION              } from './tools/get_bills_due';
import { getBillDetail,           GET_BILL_DETAIL_DESCRIPTION            } from './tools/get_bill_detail';
import { setSpendingAlert,        SET_SPENDING_ALERT_DESCRIPTION         } from './tools/set_spending_alert';
import { fileServiceComplaint,    FILE_SERVICE_COMPLAINT_DESCRIPTION     } from './tools/file_service_complaint';
import { getSubscriptionsAudit,   GET_SUBSCRIPTIONS_AUDIT_DESCRIPTION    } from './tools/get_subscriptions_audit';
import { getInterestPaidSummary,  GET_INTEREST_PAID_SUMMARY_DESCRIPTION  } from './tools/get_interest_paid_summary';
import { getCurrentDate,          GET_CURRENT_DATE_DESCRIPTION            } from './tools/get_current_date';

initInteractionLog();

// ── Helper ────────────────────────────────────────────────────────────────────

function toolResult(data: object) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  };
}

// ── Server initialisation ─────────────────────────────────────────────────────

const server = new McpServer(
  { name: 'wealth-finder-mcp', version: '0.1.0' },
  {
    capabilities: { tools: {} },
    instructions: SYSTEM_PROMPT,
  }
);

const REGISTERED_TOOL_NAMES: string[] = [];

function recordRegisteredTool(name: string): void {
  REGISTERED_TOOL_NAMES.push(name);
}

// ── Tool 1: get_account_summary ───────────────────────────────────────────────

recordRegisteredTool('get_account_summary');
server.registerTool(
  'get_account_summary',
  {
    title: 'Get Account Summary',
    description: GET_ACCOUNT_SUMMARY_DESCRIPTION,
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const data = await getAccountSummary();
    logInteraction('get_account_summary', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Tool 2: get_spending_by_category ─────────────────────────────────────────

recordRegisteredTool('get_spending_by_category');
server.registerTool(
  'get_spending_by_category',
  {
    title: 'Get Spending by Category',
    description: GET_SPENDING_BY_CATEGORY_DESCRIPTION,
    inputSchema: {
      month:                  z.string().describe('Month in YYYY-MM format (e.g. "2026-02")'),
      compare_to_month:       z.string().optional().describe('Optional compare month in YYYY-MM format'),
      compare_previous_month: z.boolean().optional().describe('Include prior month totals for comparison'),
      limit:                  z.number().optional().describe('Max categories to return (default 10, max 200)'),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const data = await getSpendingByCategory(args);
    logInteraction('get_spending_by_category', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Tool 3: get_transactions ──────────────────────────────────────────────────

recordRegisteredTool('get_transactions');
server.registerTool(
  'get_transactions',
  {
    title: 'Get Transactions',
    description: GET_TRANSACTIONS_DESCRIPTION,
    inputSchema: {
      account_id:     z.string().optional().describe('Filter by account ID (e.g. "acc_chq_001")'),
      category:       z.string().optional().describe('Filter by leaf category (e.g. "dining")'),
      category_group: z.string().optional().describe('Filter by category group (e.g. "FOOD")'),
      merchant:       z.string().optional().describe('Partial merchant name match'),
      date_from:      z.string().optional().describe('Start date YYYY-MM-DD (inclusive)'),
      date_to:        z.string().optional().describe('End date YYYY-MM-DD (inclusive)'),
      direction:      z.enum(['debit', 'credit']).optional().describe('"debit" or "credit"'),
      limit:          z.number().optional().describe('Max rows (default 50, max 200)'),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const data = await getTransactions(args);
    logInteraction('get_transactions', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Tool 4: get_bills_due ─────────────────────────────────────────────────────

recordRegisteredTool('get_bills_due');
server.registerTool(
  'get_bills_due',
  {
    title: 'Get Bills Due',
    description: GET_BILLS_DUE_DESCRIPTION,
    inputSchema: {
      month: z.string().describe('Month in YYYY-MM format (e.g. "2026-02")'),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const data = await getBillsDue(args);
    logInteraction('get_bills_due', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Tool 5: get_bill_detail ───────────────────────────────────────────────────

recordRegisteredTool('get_bill_detail');
server.registerTool(
  'get_bill_detail',
  {
    title: 'Get Bill Detail',
    description: GET_BILL_DETAIL_DESCRIPTION,
    inputSchema: {
      bill_id: z.string().describe('Bill ID (e.g. "bill_rogers_phone_2026_02")'),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const data = await getBillDetail(args);
    logInteraction('get_bill_detail', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Tool 6: set_spending_alert ────────────────────────────────────────────────

recordRegisteredTool('set_spending_alert');
server.registerTool(
  'set_spending_alert',
  {
    title: 'Set Spending Alert',
    description: SET_SPENDING_ALERT_DESCRIPTION,
    inputSchema: {
      category:            z.string().describe('Leaf category (e.g. "dining")'),
      category_group:      z.string().describe('Parent group (e.g. "FOOD")'),
      monthly_limit:       z.number().describe('Monthly spending limit in CAD'),
      alert_threshold_pct: z.number().optional().describe('Alert at this % of limit (default 80)'),
      confirm:             z.boolean().optional().describe('false = preview only; true = save to database'),
    },
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  async (args) => {
    const data = await setSpendingAlert(args);
    logInteraction('set_spending_alert', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Tool 7: file_service_complaint ────────────────────────────────────────────

recordRegisteredTool('file_service_complaint');
server.registerTool(
  'file_service_complaint',
  {
    title: 'File Service Complaint',
    description: FILE_SERVICE_COMPLAINT_DESCRIPTION,
    inputSchema: {
      provider:        z.string().describe('Provider name (e.g. "Rogers Communications")'),
      bill_id:         z.string().describe('Linked bill ID (e.g. "bill_rogers_phone_2026_02")'),
      reason:          z.string().describe('Short reason for the complaint'),
      disputed_line_items: z.array(z.object({
        description: z.string(),
        amount: z.number(),
      })).optional().describe('Optional disputed line items and amounts'),
      requested_resolution: z.string().optional().describe('Optional requested resolution text'),
      subject:         z.string().optional().describe('Optional custom complaint subject'),
      description:     z.string().optional().describe('Optional custom full complaint details'),
      amount_disputed: z.number().optional().describe('Optional total amount disputed in CAD'),
      confirm:         z.boolean().optional().describe('false = draft only; true = submit to database'),
    },
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  async (args) => {
    const data = await fileServiceComplaint(args);
    logInteraction('file_service_complaint', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Tool 8: get_subscriptions_audit ──────────────────────────────────────────

recordRegisteredTool('get_subscriptions_audit');
server.registerTool(
  'get_subscriptions_audit',
  {
    title: 'Get Subscriptions Audit',
    description: GET_SUBSCRIPTIONS_AUDIT_DESCRIPTION,
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const data = await getSubscriptionsAudit();
    logInteraction('get_subscriptions_audit', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Tool 9: get_interest_paid_summary ─────────────────────────────────────────

recordRegisteredTool('get_interest_paid_summary');
server.registerTool(
  'get_interest_paid_summary',
  {
    title: 'Get Interest Paid Summary',
    description: GET_INTEREST_PAID_SUMMARY_DESCRIPTION,
    inputSchema: {
      year:       z.string().optional().describe('Year in YYYY format (defaults to current year)'),
      account_id: z.string().optional().describe('Account ID (defaults to "acc_loc_001" — line of credit)'),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const data = await getInterestPaidSummary(args);
    logInteraction('get_interest_paid_summary', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Tool 10: get_current_date ──────────────────────────────────────────────────

recordRegisteredTool('get_current_date');
server.registerTool(
  'get_current_date',
  {
    title: 'Get Current Date',
    description: GET_CURRENT_DATE_DESCRIPTION,
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const data = getCurrentDate();
    logInteraction('get_current_date', args ?? {}, data);
    return toolResult(data);
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

function boxLine(content: string): string {
  return `║${content.slice(0, 62).padEnd(62, ' ')}║`;
}

function printStartupBanner(): void {
  const ts = new Date().toISOString();
  const logPathLabel = process.env.MCP_LOG_FILE?.trim() || 'logs/mcp-server.log';
  const toolLines = REGISTERED_TOOL_NAMES.map((name, index) => (
    boxLine(`  ${String(index + 1).padStart(2, '0')}  ${name}`)
  ));

  const banner = [
    '',
    '╔══════════════════════════════════════════════════════════════╗',
    boxLine('        WEALTH FINDER MCP  -  AI Financial Assistant'),
    boxLine('               Wealthsimple AI Builders 2026'),
    '╠══════════════════════════════════════════════════════════════╣',
    boxLine('  Status   : Running on stdio'),
    boxLine(`  Started  : ${ts}`),
    boxLine(`  Log file : ${logPathLabel}`),
    '╠══════════════════════════════════════════════════════════════╣',
    boxLine(`  REGISTERED TOOLS (${REGISTERED_TOOL_NAMES.length})`),
    boxLine(''),
    ...toolLines,
    boxLine(''),
    '╠══════════════════════════════════════════════════════════════╣',
    boxLine('  READY - Claude Desktop can now send requests'),
    '╚══════════════════════════════════════════════════════════════╝',
    '',
  ].join('\n') + '\n';

  process.stderr.write(banner);
  appendFileSync(LOG_FILE, banner);
}

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  printStartupBanner();
}

main().catch((err: Error) => {
  process.stderr.write(`❌ MCP server failed to start: ${err.message}\n`);
  process.exit(1);
});
