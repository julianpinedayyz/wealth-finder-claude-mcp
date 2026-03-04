/**
 * src/mcp/logger.ts
 *
 * Purpose    : Provides structured terminal logging for the MCP server.
 *              Outputs visually distinct blocks with emoji indicators, timestamps, SQL queries,
 *              and response summaries — designed to be readable at 1080p during demo recording.
 * Depends on : Nothing (pure Node.js).
 * Consumed by: All tool files in src/mcp/tools/ and src/mcp/server.ts.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SEP = '━'.repeat(60);

// Use __dirname (location of this file) to anchor the project root, not process.cwd().
// Claude Desktop spawns the server with cwd='/', which breaks relative path resolution.
// __dirname is always /Users/.../wealth-finder-mcp/src/mcp — two levels up is the project root.
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const logFileEnv = process.env.MCP_LOG_FILE?.trim();
export const LOG_FILE = logFileEnv
  ? resolve(PROJECT_ROOT, logFileEnv)
  : resolve(PROJECT_ROOT, 'logs/mcp-server.log');

mkdirSync(dirname(LOG_FILE), { recursive: true });
appendFileSync(LOG_FILE, '');

function writeToFile(line: string): void {
  appendFileSync(LOG_FILE, line);
}

function timestamp(): string {
  return new Date().toISOString();
}

function toolStart(toolName: string, params: object): void {
  const sessionId = process.env.MCP_USER_ID ?? 'usr_marco_reyes';
  const line =
    `\n${SEP}\n` +
    `🔧  TOOL INVOKED » ${toolName}\n` +
    `${SEP}\n` +
    `  Timestamp  : ${timestamp()}\n` +
    `  Session    : ${sessionId}\n` +
    `  Parameters : ${JSON.stringify(params, null, 2).replace(/\n/g, '\n               ')}\n\n`;
  process.stderr.write(line);
  writeToFile(line);
}

function query(sql: string): void {
  const line =
    `📡  Supabase Query:\n` +
    `    ${sql.replace(/\n/g, '\n    ')}\n\n`;
  process.stderr.write(line);
  writeToFile(line);
}

function success(toolName: string, status: number, ms: number, summary: string): void {
  const line =
    `✅  RESPONSE  : ${status} OK  (${ms}ms)\n` +
    `    Tool     : ${toolName}\n` +
    `    Returned : ${summary}\n` +
    `${SEP}\n`;
  process.stderr.write(line);
  writeToFile(line);
}

function error(toolName: string, message: string, ms: number): void {
  const line =
    `❌  ERROR     : ${toolName}  (${ms}ms)\n` +
    `    Message  : ${message}\n` +
    `${SEP}\n`;
  process.stderr.write(line);
  writeToFile(line);
}

export const log = { toolStart, query, success, error };
