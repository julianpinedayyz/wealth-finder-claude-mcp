# Prompt Guide (Capability Testing)

Use this guide to test Wealth Finder MCP behaviors in Claude Desktop after setup.

## How to use this guide

1. Start MCP server (`npm run dev:mcp`).
2. Open a new Claude Desktop chat.
3. Paste prompts one by one.
4. Confirm Claude calls the expected tool and returns structured, factual results.

## Baseline checks

Prompt:
```text
What tools do you have available?
```
Expected outcome:
- Claude lists tools from the MCP server.

Prompt:
```text
What is today's date?
```
Expected tool:
- `get_current_date`

## Account and spending insights

Prompt:
```text
What are my current account balances?
```
Expected tool:
- `get_account_summary`

Prompt:
```text
What were my top spending categories in February 2026?
```
Expected tool:
- `get_spending_by_category`

Prompt:
```text
How does that compare to January 2026?
```
Expected tool:
- `get_spending_by_category`

Prompt:
```text
Show me all my dining transactions in February 2026.
```
Expected tool:
- `get_transactions`

## Bills and complaints

Prompt:
```text
Pull up my bills for February 2026. Anything look unusual?
```
Expected tool:
- `get_bills_due`

Prompt:
```text
Show me the full Rogers phone bill.
```
Expected tool:
- `get_bill_detail`

Prompt:
```text
Draft a complaint to Rogers for the roaming charge on bill_rogers_phone_2026_02.
```
Expected tool:
- `file_service_complaint` with `confirm: false`

Prompt:
```text
That draft looks correct. Submit it.
```
Expected tool:
- `file_service_complaint` with `confirm: true`
Expected result:
- response includes confirmation number (`WF-...`)

## Spending alerts

Prompt:
```text
Set a $400 monthly dining alert and show me a preview first.
```
Expected tool:
- `set_spending_alert` with `confirm: false`

Prompt:
```text
Looks good. Save it.
```
Expected tool:
- `set_spending_alert` with `confirm: true`

## Subscriptions and debt costs

Prompt:
```text
Show me all my active subscriptions.
```
Expected tool:
- `get_subscriptions_audit`

Prompt:
```text
Which subscriptions look likely unused?
```
Expected tool:
- usually no extra call (uses prior context), or another `get_subscriptions_audit`

Prompt:
```text
How much interest did I pay on my line of credit in 2025?
```
Expected tool:
- `get_interest_paid_summary`

Prompt:
```text
When could I pay it off if I increased payments by $200 per month?
```
Expected tool:
- usually no extra call (uses prior context), or another `get_interest_paid_summary`

## Good test hygiene

- Validate that write actions (`set_spending_alert`, `file_service_complaint`) use draft-first confirmation.
- Validate that date-relative questions trigger `get_current_date` before month/year interpretation.
- Validate that tool-based answers cite concrete amounts, dates, and IDs.
- If seeded data changes, re-run `npm run seed:supabase` before re-testing.
