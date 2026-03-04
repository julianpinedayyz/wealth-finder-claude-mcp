/**
 * src/mcp/tools/get_interest_paid_summary.ts
 *
 * Purpose    : MCP tool — returns total interest paid on the line of credit (acc_loc_001) for
 *              a given year, with a simple payoff projection based on current balance and rate.
 * Depends on : src/mcp/db.ts (Supabase client + USER_ID).
 * Consumed by: src/mcp/server.ts (registered as 'get_interest_paid_summary').
 */

import { supabase, USER_ID } from '../db';
import { log } from '../logger';

export const GET_INTEREST_PAID_SUMMARY_DESCRIPTION =
  'Returns the total interest paid on the line of credit for a given year (format: YYYY, e.g. "2025" or "2026"). ' +
  'Year is optional and defaults to the current year. ' +
  'Also provides a payoff projection showing how long it would take to eliminate the LOC balance ' +
  'at different monthly payment levels. ' +
  'Use this tool when the user asks about interest costs, debt payoff timelines, or wants to understand ' +
  'the true cost of carrying their line of credit balance.';

interface InterestArgs {
  year?: string;
  account_id?: string;
}

export async function getInterestPaidSummary(args: InterestArgs): Promise<object> {
  const start = Date.now();
  const { year = String(new Date().getFullYear()), account_id = 'acc_loc_001' } = args;

  const dateFrom = `${year}-01-01`;
  const dateTo   = `${year}-12-31`;

  log.toolStart('get_interest_paid_summary', args);
  log.query(
    `SELECT SUM(amount) AS total_interest, COUNT(*) AS charge_count\n` +
    `    FROM transactions\n` +
    `    WHERE user_id = '${USER_ID}' AND account_id = '${account_id}'\n` +
    `      AND category IN ('loc_interest', 'cc_interest')\n` +
    `      AND direction = 'debit'\n` +
    `      AND date >= '${dateFrom}' AND date <= '${dateTo}'`
  );

  const [interestResult, accountResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, date, description')
      .eq('user_id', USER_ID)
      .eq('account_id', account_id)
      .in('category', ['loc_interest', 'cc_interest'])
      .eq('direction', 'debit')
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: true }),
    supabase
      .from('accounts')
      .select('current_balance, interest_rate, display_name, minimum_payment')
      .eq('account_id', account_id)
      .eq('user_id', USER_ID)
      .single(),
  ]);

  const ms = Date.now() - start;

  if (interestResult.error) {
    log.error('get_interest_paid_summary', interestResult.error.message, ms);
    throw new Error(`Failed to fetch interest data: ${interestResult.error.message}`);
  }
  if (accountResult.error) {
    log.error('get_interest_paid_summary', accountResult.error.message, ms);
    throw new Error(`Failed to fetch account data: ${accountResult.error.message}`);
  }

  const charges = interestResult.data ?? [];
  const account = accountResult.data;

  // Payoff projection — months to pay off at various payment levels
  const balance = account ? Math.abs(Number(account.current_balance)) : 0;
  const annualRate = account ? Number(account.interest_rate) : 0.092;
  const currentPayment =
    account?.minimum_payment != null ? Number(account.minimum_payment) : 250;
  const monthlyRate = annualRate / 12;
  const totalInterest = charges.reduce((s, t) => s + Number(t.amount), 0);

  function monthsToPayoff(monthlyPayment: number): number | null {
    if (balance <= 0) return 0;
    if (monthlyPayment <= 0) return null;
    if (monthlyRate === 0) return Math.ceil(balance / monthlyPayment);
    if (monthlyPayment <= balance * monthlyRate) return null; // never pays off
    return Math.ceil(
      Math.log(monthlyPayment / (monthlyPayment - balance * monthlyRate)) /
      Math.log(1 + monthlyRate)
    );
  }

  const payoffScenarios = [
    currentPayment,
    currentPayment + 200,
    currentPayment + 500,
    currentPayment + 750,
  ].map((pmt) => {
    const monthlyPayment = Math.round(pmt * 100) / 100;
    const months = monthsToPayoff(monthlyPayment);
    return {
      monthly_payment: monthlyPayment,
      months_to_payoff: months,
      total_interest_paid: months !== null
        ? Math.round((months * monthlyPayment - balance) * 100) / 100
        : null,
    };
  });

  log.success('get_interest_paid_summary', 200, ms,
    `${charges.length} interest charges | total $${totalInterest.toFixed(2)} in ${year}`
  );

  return {
    year,
    account_id,
    account_name: account?.display_name ?? 'Line of Credit',
    current_balance: account ? Number(account.current_balance) : null,
    interest_rate_annual: annualRate,
    interest_charges: charges,
    total_interest_paid: Math.round(totalInterest * 100) / 100,
    charge_count: charges.length,
    payoff_projection: {
      current_balance: balance,
      current_monthly_payment: currentPayment,
      scenarios: payoffScenarios,
    },
  };
}
