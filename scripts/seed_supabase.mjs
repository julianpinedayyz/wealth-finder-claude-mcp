import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

const PROJECT_ROOT = process.cwd();
const SEED_DIR = resolve(PROJECT_ROOT, 'supabase', 'seed');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set both in .env before running npm run seed:supabase.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEFAULT_USER_ID = 'usr_marco_reyes';
const TARGET_USER_ID = process.env.MCP_USER_ID || DEFAULT_USER_ID;

async function loadJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

function withUserId(rows) {
  return rows.map((row) => ({ ...row, user_id: TARGET_USER_ID }));
}

async function insertInBatches(table, rows, batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    if (batch.length === 0) continue;

    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      throw new Error(`Insert failed for ${table}: ${error.message}`);
    }
  }
}

async function deleteByUser(table) {
  const { error } = await supabase.from(table).delete().eq('user_id', TARGET_USER_ID);
  if (error) {
    throw new Error(`Delete failed for ${table}: ${error.message}`);
  }
}

async function main() {
  console.log(`Seeding Supabase for user_id=${TARGET_USER_ID}`);

  const users = await loadJson(resolve(SEED_DIR, 'users.json'));
  const accounts = await loadJson(resolve(SEED_DIR, 'accounts.json'));
  const bills = await loadJson(resolve(SEED_DIR, 'bills.json'));
  const billLineItems = await loadJson(resolve(SEED_DIR, 'bill_line_items.json'));
  const subscriptions = await loadJson(resolve(SEED_DIR, 'subscriptions.json'));
  const spendingAlerts = await loadJson(resolve(SEED_DIR, 'spending_alerts.json'));

  const txFiles = [
    'chequing.json',
    'credit_card_cashback.json',
    'credit_card_points.json',
    'line_of_credit.json',
    'mortgage.json',
    'savings.json',
    'usd.json',
  ];

  const txArrays = await Promise.all(
    txFiles.map((file) => loadJson(resolve(SEED_DIR, 'transactions', file)))
  );
  const transactions = txArrays.flat();

  const seedUsers = users.map((user) => ({
    ...user,
    user_id: TARGET_USER_ID,
    email: user.email?.includes('@')
      ? user.email.replace(/^[^@]+/, TARGET_USER_ID)
      : `${TARGET_USER_ID}@example.com`,
  }));

  const seedAccounts = withUserId(accounts);
  const seedBills = withUserId(bills);
  const seedSubscriptions = withUserId(subscriptions);
  const seedTransactions = withUserId(transactions);

  const billIds = seedBills.map((bill) => bill.bill_id);
  const seedBillLineItems = billLineItems.filter((item) => billIds.includes(item.bill_id));

  // Cleanup in FK-safe order
  if (billIds.length > 0) {
    const { error: billLineDeleteError } = await supabase
      .from('bill_line_items')
      .delete()
      .in('bill_id', billIds);

    if (billLineDeleteError) {
      throw new Error(`Delete failed for bill_line_items: ${billLineDeleteError.message}`);
    }
  }

  await deleteByUser('complaints');
  await deleteByUser('spending_alerts');
  await deleteByUser('subscriptions');
  await deleteByUser('bills');
  await deleteByUser('transactions');
  await deleteByUser('accounts');
  await deleteByUser('users');

  // Insert in dependency order
  await insertInBatches('users', seedUsers, 50);
  await insertInBatches('accounts', seedAccounts, 100);
  await insertInBatches('transactions', seedTransactions, 500);
  await insertInBatches('bills', seedBills, 200);
  await insertInBatches('bill_line_items', seedBillLineItems, 200);
  await insertInBatches('subscriptions', seedSubscriptions, 200);

  for (const alert of spendingAlerts) {
    const { error: alertError } = await supabase
      .from('spending_alerts')
      .upsert(
        {
          user_id: TARGET_USER_ID,
          category: alert.category,
          category_group: alert.category_group,
          monthly_limit: alert.monthly_limit,
          alert_threshold_pct: alert.alert_threshold_pct ?? 80,
          active: alert.active ?? true,
        },
        { onConflict: 'user_id,category' }
      );

    if (alertError) {
      throw new Error(`Upsert failed for spending_alerts: ${alertError.message}`);
    }
  }

  const summary = [
    ['users', seedUsers.length],
    ['accounts', seedAccounts.length],
    ['transactions', seedTransactions.length],
    ['bills', seedBills.length],
    ['bill_line_items', seedBillLineItems.length],
    ['subscriptions', seedSubscriptions.length],
    ['spending_alerts', spendingAlerts.length],
  ];

  console.log('Seed complete. Row counts inserted:');
  for (const [table, count] of summary) {
    console.log(`- ${table}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
