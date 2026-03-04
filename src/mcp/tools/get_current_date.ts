/**
 * src/mcp/tools/get_current_date.ts
 *
 * Purpose    : MCP tool — returns the current date/time from the server clock.
 * Depends on : Nothing (system clock only).
 * Consumed by: src/mcp/server.ts (registered as 'get_current_date').
 */

export const GET_CURRENT_DATE_DESCRIPTION =
  'Returns the current date from the server clock. Call this at the start of any ' +
  'conversation before referencing months, years, or relative time periods like ' +
  '"this month", "last month", or "recently".';

export function getCurrentDate(): object {
  const now = new Date();
  return {
    iso: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    month: now.toISOString().slice(0, 7),
    year: String(now.getFullYear()),
    display: now.toLocaleDateString('en-CA', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }),
  };
}
