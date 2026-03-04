import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const LOG_DIR = resolve(process.cwd(), 'logs/mcp-sessions');
let enabled = false;
let sessionFile = '';

export function initInteractionLog(): void {
  enabled = process.env.MCP_LOG_INTERACTIONS === 'true';
  if (!enabled) return;
  mkdirSync(LOG_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  sessionFile = resolve(LOG_DIR, `${date}.jsonl`);
  process.stderr.write(`[interaction-log] writing to ${sessionFile}\n`);
}

export function logInteraction(tool: string, args: unknown, result: unknown): void {
  if (!enabled) return;
  appendFileSync(
    sessionFile,
    JSON.stringify({ ts: new Date().toISOString(), tool, args, result }) + '\n'
  );
}
