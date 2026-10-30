#!/usr/bin/env node
/**
 * Apply drizzle SQL migrations to D1 in journal order, with a ledger so CI
 * re-runs are idempotent.
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
const location = remote ? ['--remote'] : ['--local'];

function run(args, { inherit = true, allowFail = false } = {}) {
  const result = spawnSync(process.execPath, [wranglerBin, ...args], {
    cwd: root,
    encoding: inherit ? undefined : 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
    env: process.env,
  });
  if (result.status !== 0 && !allowFail) {
    if (!inherit) {
      console.error(result.stdout || '');
      console.error(result.stderr || '');
    }
    process.exit(result.status ?? 1);
  }
  return result;
}

function executeSql(sql) {
  return run(
    [
      'd1',
      'execute',
      'teamup',
      ...location,
      '--config',
      'wrangler.toml',
      '--command',
      sql,
      '--json',
    ],
    { inherit: false, allowFail: true },
  );
}

function queryJson(sql) {
  const result = executeSql(sql);
  if (result.status !== 0) return null;
  try {
    const parsed = JSON.parse(`${result.stdout || ''}`);
    const rows = parsed?.[0]?.results || parsed?.results || [];
    return rows;
  } catch {
    return null;
  }
}

console.log(`Applying D1 migrations (${remote ? 'remote' : 'local'})…`);

executeSql(
  'CREATE TABLE IF NOT EXISTS _teamup_schema_migrations (id TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL)',
);

let applied = new Set(
  (queryJson('SELECT id FROM _teamup_schema_migrations') || []).map((row) => row.id),
);

// Bootstrap: schema already applied outside the ledger (first manual deploy).
if (applied.size === 0) {
  const users = queryJson("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  if (users?.length) {
    console.log('Existing schema detected; seeding migration ledger…');
    const now = new Date().toISOString();
    for (const entry of journal.entries) {
      executeSql(
        `INSERT OR IGNORE INTO _teamup_schema_migrations(id, applied_at) VALUES('${entry.tag}', '${now}')`,
      );
    }
    applied = new Set(journal.entries.map((entry) => entry.tag));
  }
}

const tempDir = mkdtempSync(path.join(tmpdir(), 'teamup-d1-'));
try {
  for (const entry of journal.entries) {
    if (applied.has(entry.tag)) {
      console.log('skip', entry.tag);
      continue;
    }
    const source = path.join(root, 'drizzle', `${entry.tag}.sql`);
    // Strip drizzle breakpoints in-place (they may share a line with SQL).
    // Do NOT drop whole lines — that would delete ALTER statements.
    const cleaned = readFileSync(source, 'utf8')
      .replace(/-->\s*statement-breakpoint/g, '')
      .replace(/CREATE TABLE `/g, 'CREATE TABLE IF NOT EXISTS `')
      .replace(/CREATE (UNIQUE )?INDEX `/g, 'CREATE $1INDEX IF NOT EXISTS `');

    // D1 can fail multi-statement files that mix ALTER + CREATE INDEX.
    // Run one statement at a time so each change is visible to the next.
    const statements = cleaned
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean);

    console.log('→', entry.tag);
    for (const [index, statement] of statements.entries()) {
      const file = path.join(tempDir, `${entry.tag}-${index}.sql`);
      writeFileSync(file, `${statement};`);
      const result = run(
        [
          'd1',
          'execute',
          'teamup',
          ...location,
          '--config',
          'wrangler.toml',
          '--file',
          file,
        ],
        { inherit: false, allowFail: true },
      );
      if (result.status !== 0) {
        const output = `${result.stdout || ''}\n${result.stderr || ''}`;
        // Idempotent retry: column/index already exists from a partial earlier run.
        if (
          /duplicate column name|already exists/i.test(output) ||
          /SQLITE_ERROR.*duplicate/i.test(output)
        ) {
          console.log('  (already applied)', statement.slice(0, 60));
          continue;
        }
        console.error(output);
        process.exit(result.status ?? 1);
      }
    }

    const now = new Date().toISOString();
    const mark = executeSql(
      `INSERT OR IGNORE INTO _teamup_schema_migrations(id, applied_at) VALUES('${entry.tag}', '${now}')`,
    );
    if (mark.status !== 0) process.exit(mark.status ?? 1);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
console.log('Migrations complete.');
