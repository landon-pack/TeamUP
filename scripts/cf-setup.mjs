#!/usr/bin/env node
/**
 * One-time Cloudflare setup: create D1 + R2 and write IDs into wrangler.toml / .env.local hints.
 *
 * Requires: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment
 * (or `npx wrangler login` already completed).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const wranglerBin = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
const wranglerToml = path.join(root, 'wrangler.toml');
const DB_NAME = 'teamup';
const BUCKET_NAME = 'teamup-files';

function run(args, { allowFail = false } = {}) {
  const result = spawnSync(process.execPath, [wranglerBin, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  });
  if (result.status !== 0 && !allowFail) {
    console.error(result.stdout || '');
    console.error(result.stderr || '');
    throw new Error(`wrangler ${args.join(' ')} failed`);
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function extractDatabaseId(text) {
  const match =
    text.match(/database_id[=:\s]+["']?([0-9a-f-]{36})/i) ||
    text.match(/\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  return match?.[1] || null;
}

function patchToml(databaseId) {
  let toml = readFileSync(wranglerToml, 'utf8');
  toml = toml.replace(
    /database_name\s*=\s*"[^"]+"/,
    `database_name = "${DB_NAME}"`,
  );
  toml = toml.replace(
    /database_id\s*=\s*"[^"]+"/,
    `database_id = "${databaseId}"`,
  );
  toml = toml.replace(
    /bucket_name\s*=\s*"[^"]+"/,
    `bucket_name = "${BUCKET_NAME}"`,
  );
  writeFileSync(wranglerToml, toml);
}

console.log('Creating D1 database:', DB_NAME);
let createOut = run(['d1', 'create', DB_NAME], { allowFail: true });
let databaseId = extractDatabaseId(createOut);
if (!databaseId) {
  console.log('Create may have already existed; listing D1 databases…');
  const listOut = run(['d1', 'list', '--json'], { allowFail: true });
  try {
    const rows = JSON.parse(listOut.replace(/^[^[]*/, '').match(/\[[\s\S]*\]/)?.[0] || '[]');
    const found = rows.find((row) => row.name === DB_NAME);
    databaseId = found?.uuid || found?.id || null;
  } catch {
    databaseId = extractDatabaseId(listOut);
  }
}
if (!databaseId) {
  console.error(createOut);
  throw new Error('Could not determine D1 database id. Run `npx wrangler d1 list` and set database_id in wrangler.toml.');
}

console.log('Ensuring R2 bucket:', BUCKET_NAME);
run(['r2', 'bucket', 'create', BUCKET_NAME], { allowFail: true });

patchToml(databaseId);
console.log(`Updated wrangler.toml with database_id=${databaseId}`);

const envExample = path.join(root, '.env.example');
if (existsSync(envExample)) {
  // no-op; documented in README
}

console.log(`
Next steps:
  1. Commit the updated wrangler.toml (database id is safe to commit).
  2. Set secrets (local):
       npx wrangler secret put AUTH_SECRET
       npx wrangler secret put SITE_OWNER_EMAIL
       # optional AI:
       npx wrangler secret put GEMINI_API_KEY
       npx wrangler secret put AI_CONFIG_ENCRYPTION_KEY
  3. Apply migrations + deploy:
       npm run cf:deploy
  4. Add the same values as GitHub Actions secrets (see README).
`);
