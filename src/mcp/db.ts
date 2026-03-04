/**
 * src/mcp/db.ts
 *
 * Purpose    : Initialises and exports the Supabase client for the MCP server.
 * Depends on : SUPABASE_URL and SUPABASE_ANON_KEY environment variables (loaded via dotenv).
 * Consumed by: All tool files in src/mcp/tools/ and src/mcp/server.ts.
 */

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.SUPABASE_URL;
const supabaseKey  = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment. Copy .env.example to .env and fill in values.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export const USER_ID = process.env.MCP_USER_ID ?? 'usr_marco_reyes';
