#!/usr/bin/env node
/**
 * Apply drizzle SQL migrations to D1 in journal order.
 * Uses `d1 execute --file` because drizzle's journal layout is not always
 * picked up by `wrangler d1 migrations apply`.
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const wranglerBin = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const remote = !process.argv.includes('--local');
const journal = JSON.parse(readFileSync(path.join(root, 'drizzle/meta/_journal.json'), 'utf8'));

function run(args) {
  const result = spawnSync(process.execPath, [wranglerBin, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Applying ${journal.entries.length} D1 SQL files (${remote ? 'remote' : 'local'})…`);
const tempDir = mkdtempSync(path.join(tmpdir(), 'teamup-d1-'));
try {
  for (const entry of journal.entries) {
    const source = path.join(root, 'drizzle', `${entry.tag}.sql`);
    const cleaned = readFileSync(source, 'utf8')
      .split('\n')
      .filter((line) => !line.includes('--> statement-breakpoint'))
      .join('\n');
    const file = path.join(tempDir, `${entry.tag}.sql`);
    writeFileSync(file, cleaned);
    console.log('→', entry.tag);
    run([
      'd1',
      'execute',
      'teamup',
      ...(remote ? ['--remote'] : ['--local']),
      '--config',
      'wrangler.toml',
      '--file',
      file,
    ]);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
console.log('Migrations complete.');
